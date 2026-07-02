import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isContestTradingOpen, isJoinAllowed } from './contest-bell';
import { joinContestServer, executeTradeServer } from './game-server';
import { fetchMarketPrices } from './market-prices';
import { normalizePositions, getPortfolioValue } from './portfolio';
import { canPlaceTrade } from './trade-limits';

export const PIT_BOT_PASSWORD = 'PitTest123!';
export const PIT_BOT_SEED_BALANCE = 500;

export type PitBotProfile = {
  email: string;
  username: string;
  shareScale: number;
};

export const PIT_BOTS: PitBotProfile[] = [
  { email: 'pitbot1@tradr.test', username: '@jeff', shareScale: 1.0 },
  { email: 'pitbot2@tradr.test', username: '@guru', shareScale: 1.15 },
  { email: 'pitbot3@tradr.test', username: '@cip', shareScale: 0.9 },
  { email: 'pitbot4@tradr.test', username: '@nova', shareScale: 1.3 },
  { email: 'pitbot5@tradr.test', username: '@tape', shareScale: 0.75 },
  { email: 'pitbot6@tradr.test', username: '@wolf', shareScale: 1.1 },
  { email: 'pitbot7@tradr.test', username: '@apex', shareScale: 0.95 },
  { email: 'pitbot8@tradr.test', username: '@rekt', shareScale: 1.25 },
  { email: 'pitbot9@tradr.test', username: '@moon', shareScale: 0.8 },
  { email: 'pitbot10@tradr.test', username: '@bell', shareScale: 1.05 },
];

export type ContestRow = {
  id: number;
  title: string;
  slug?: string | null;
  status: string;
  ends_at: string | null;
  starts_at?: string | null;
  assets?: string[] | null;
  entry_fee?: number | null;
};

export type BotActionResult = {
  bot: string;
  email: string;
  status: string;
};

export function loadEnvLocal() {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) {
    throw new Error('Missing .env.local');
  }
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

export function createPitBotAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function contestClock(row: ContestRow) {
  return {
    status: row.status as 'open' | 'active' | 'closed',
    endsAt: row.ends_at,
    startsAt: row.starts_at ?? null,
    slug: row.slug ?? undefined,
  };
}

export function defaultBotShares(symbol: string, scale: number): number {
  const crypto = ['BTC', 'ETH', 'SOL', 'DOGE', 'PEPE', 'XRP', 'ADA'];
  const penny = ['DOGE', 'PEPE'];
  if (penny.includes(symbol)) return Math.round(5000 * scale);
  if (crypto.includes(symbol)) return +(1.2 * scale).toFixed(2);
  return Math.round(120 * scale);
}

async function findUserIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  let page = 1;
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match.id;
    if (data.users.length < 200) break;
    page++;
  }
  return null;
}

export async function ensureBotUser(
  admin: SupabaseClient,
  email: string,
  username: string
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PIT_BOT_PASSWORD,
    email_confirm: true,
    user_metadata: { username },
  });

  if (!error && data.user) return data.user.id;

  const exists =
    error?.message?.toLowerCase().includes('already') ||
    error?.message?.toLowerCase().includes('registered');

  if (exists) {
    const id = await findUserIdByEmail(admin, email);
    if (id) return id;
  }

  throw new Error(`Could not create user ${email}: ${error?.message || 'unknown'}`);
}

export async function fetchJoinableContests(admin: SupabaseClient): Promise<ContestRow[]> {
  const { data, error } = await admin
    .from('contests')
    .select('id, title, slug, status, ends_at, starts_at, assets, entry_fee')
    .neq('status', 'closed')
    .order('id', { ascending: false });

  if (error) throw error;

  return (data || []).filter((c) =>
    isJoinAllowed({ status: c.status, endsAt: c.ends_at })
  ) as ContestRow[];
}

/** Join bots into a contest; initial buy when bell is open. */
export async function seedBotsIntoContest(
  admin: SupabaseClient,
  contest: ContestRow,
  prices?: Record<string, number>,
  opts?: { limit?: number }
): Promise<BotActionResult[]> {
  const botLimit = Math.min(PIT_BOTS.length, Math.max(1, opts?.limit ?? PIT_BOTS.length));
  const assets = (contest.assets as string[]) || [];
  const tradingOpen = isContestTradingOpen(contestClock(contest));
  const priceMap = prices ?? (assets.length ? await fetchMarketPrices(assets) : {});
  const results: BotActionResult[] = [];

  for (let i = 0; i < botLimit; i++) {
    const trader = PIT_BOTS[i];
    const symbol = assets[i % Math.max(assets.length, 1)];

    try {
      const userId = await ensureBotUser(admin, trader.email, trader.username);

      await admin
        .from('profiles')
        .update({ username: trader.username.replace(/^@/, ''), balance: PIT_BOT_SEED_BALANCE })
        .eq('id', userId);

      const { data: existingPart } = await admin
        .from('participations')
        .select('id')
        .eq('user_id', userId)
        .eq('contest_id', contest.id)
        .maybeSingle();

      if (!existingPart) {
        await joinContestServer(admin, userId, contest.id);
      }

      if (!tradingOpen || !symbol) {
        results.push({
          bot: trader.username,
          email: trader.email,
          status: existingPart ? 'already rang in' : 'rang in (waiting for bell)',
        });
        continue;
      }

      const price = priceMap[symbol];
      if (!price) {
        results.push({ bot: trader.username, email: trader.email, status: `no price for ${symbol}` });
        continue;
      }

      const { data: part } = await admin
        .from('participations')
        .select('positions')
        .eq('user_id', userId)
        .eq('contest_id', contest.id)
        .single();

      const positions = normalizePositions(part?.positions);
      const alreadyHas = positions.some((p) => p.symbol === symbol);

      if (!alreadyHas) {
        const shares = defaultBotShares(symbol, trader.shareScale);
        await executeTradeServer(admin, userId, contest.id, symbol, 'buy', shares, price);
        results.push({
          bot: trader.username,
          email: trader.email,
          status: `BUY ${shares} ${symbol} @ $${price.toFixed(2)}`,
        });
      } else {
        results.push({ bot: trader.username, email: trader.email, status: `in pit (${symbol})` });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ bot: trader.username, email: trader.email, status: `error: ${msg}` });
    }
  }

  return results;
}

function pickSymbol(assets: string[], botIndex: number, tick: number): string {
  if (!assets.length) return '';
  const hash = (botIndex * 17 + tick * 31) % assets.length;
  return assets[hash];
}

/** One autonomous trade attempt for a bot already in the pit. */
export async function botTradeTick(
  admin: SupabaseClient,
  contest: ContestRow,
  botIndex: number,
  userId: string,
  tick: number,
  prices: Record<string, number>
): Promise<string | null> {
  if (!isContestTradingOpen(contestClock(contest))) return null;

  const assets = (contest.assets as string[]) || [];
  if (!assets.length) return null;

  const { count: tradeCount } = await admin
    .from('trade_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('contest_id', contest.id);

  const limit = canPlaceTrade(tradeCount ?? 0, contest.slug ?? undefined);
  if (!limit.ok) return 'trade cap hit';

  const { data: part, error } = await admin
    .from('participations')
    .select('cash, positions')
    .eq('user_id', userId)
    .eq('contest_id', contest.id)
    .single();

  if (error || !part) return 'no participation';

  const positions = normalizePositions(part.positions);
  const cash = Number(part.cash) || 0;
  const portfolio = getPortfolioValue({ cash, positions }, prices);

  const sellBias = (botIndex + tick) % 5 === 0;
  const held = positions.filter((p) => assets.includes(p.symbol));

  if (sellBias && held.length > 0) {
    const pos = held[botIndex % held.length];
    const price = prices[pos.symbol];
    if (!price) return null;
    const shares = Math.max(0.01, +(pos.shares * (0.15 + (botIndex % 3) * 0.1)).toFixed(4));
    if (shares >= pos.shares * 0.05) {
      await executeTradeServer(admin, userId, contest.id, pos.symbol, 'sell', shares, price);
      return `SELL ${shares} ${pos.symbol}`;
    }
  }

  const symbol = pickSymbol(assets, botIndex, tick);
  const price = prices[symbol];
  if (!price) return null;

  const spendPct = 0.08 + (botIndex % 4) * 0.04;
  const budget = Math.min(cash * spendPct, portfolio * 0.12, cash - 500);
  if (budget < 50) return 'low cash';

  let shares = defaultBotShares(symbol, PIT_BOTS[botIndex].shareScale * 0.35);
  const cost = shares * price;
  if (cost > budget) {
    shares = +(budget / price).toFixed(cryptoLike(symbol) ? 4 : 0);
  }
  if (shares <= 0) return null;

  await executeTradeServer(admin, userId, contest.id, symbol, 'buy', shares, price);
  return `BUY ${shares} ${symbol}`;
}

function cryptoLike(symbol: string): boolean {
  return ['BTC', 'ETH', 'SOL', 'DOGE', 'PEPE', 'XRP', 'ADA'].includes(symbol);
}

export async function runBotCycle(admin: SupabaseClient, tick: number): Promise<void> {
  const contests = await fetchJoinableContests(admin);
  if (!contests.length) {
    console.log(`[bots tick ${tick}] no open contests`);
    return;
  }

  const allAssets = [...new Set(contests.flatMap((c) => (c.assets as string[]) || []))];
  const prices = allAssets.length ? await fetchMarketPrices(allAssets) : {};

  for (const contest of contests) {
    const seedResults = await seedBotsIntoContest(admin, contest, prices);
    const joined = seedResults.filter((r) => !r.status.startsWith('error')).length;
    const trading = isContestTradingOpen(contestClock(contest));

    if (!trading) {
      console.log(`  #${contest.id} ${contest.title} — ${joined}/10 bots rang in (bell closed)`);
      continue;
    }

    const trades: string[] = [];
    for (let i = 0; i < PIT_BOTS.length; i++) {
      const bot = PIT_BOTS[i];
      try {
        const userId = await ensureBotUser(admin, bot.email, bot.username);
        const action = await botTradeTick(admin, contest, i, userId, tick, prices);
        if (action) trades.push(`${bot.username}: ${action}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes('Market closed') && !msg.includes('Trade limit')) {
          trades.push(`${bot.username}: err ${msg}`);
        }
      }
    }

    console.log(`  #${contest.id} ${contest.title} — ${trades.length} trades`);
    for (const t of trades.slice(0, 4)) console.log(`    ${t}`);
    if (trades.length > 4) console.log(`    … +${trades.length - 4} more`);
  }
}