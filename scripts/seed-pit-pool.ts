/**
 * Seed 10 test traders into one live pit (default: Opening Bell).
 * Run: npx tsx scripts/seed-pit-pool.ts
 * Optional: npx tsx scripts/seed-pit-pool.ts --slug=the-liquidation
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { rotatePitContests } from '../lib/contest-rotation';
import { joinContestServer, executeTradeServer } from '../lib/game-server';
import { fetchMarketPrices } from '../lib/market-prices';
import { OPENING_BELL_SLUG, PIT_CONTEST_CATALOG } from '../lib/pit-contests';
import { isContestTradingOpen } from '../lib/contest-bell';

const PASSWORD = 'PitTest123!';
const SEED_BALANCE = 500;

const TRADER_NAMES = [
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

/** Default share counts by asset class — scaled per trader for variety. */
function defaultShares(symbol: string, scale: number): number {
  const crypto = ['BTC', 'ETH', 'SOL', 'DOGE', 'PEPE', 'XRP', 'ADA'];
  const penny = ['DOGE', 'PEPE'];
  if (penny.includes(symbol)) return Math.round(5000 * scale);
  if (crypto.includes(symbol)) return +(1.2 * scale).toFixed(2);
  return Math.round(120 * scale);
}

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) {
    console.error('Missing .env.local');
    process.exit(1);
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

function getSlugArg(): string {
  const hit = process.argv.find((a) => a.startsWith('--slug='));
  return hit?.split('=')[1] || OPENING_BELL_SLUG;
}

async function findUserIdByEmail(
  admin: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> {
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

async function ensureUser(
  admin: ReturnType<typeof createClient>,
  email: string,
  username: string
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
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

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const slug = getSlugArg();

  const catalog = PIT_CONTEST_CATALOG.find((c) => c.slug === slug);
  const title = catalog?.title;

  async function fetchOpenContest(): Promise<{ data: Record<string, unknown> | null; error: Error | null }> {
    const bySlug = await admin
      .from('contests')
      .select('*')
      .eq('slug', slug)
      .neq('status', 'closed')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!bySlug.error && bySlug.data) return { data: bySlug.data, error: null };
    if (title) {
      const byTitle = await admin
        .from('contests')
        .select('*')
        .eq('title', title)
        .neq('status', 'closed')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!byTitle.error && byTitle.data) return { data: byTitle.data, error: null };
    }
    const any = await admin
      .from('contests')
      .select('*')
      .neq('status', 'closed')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
    return { data: any.data, error: any.error };
  }

  let { data: contest, error: contestErr } = await fetchOpenContest();

  if (!contest) {
    console.log('No open pit found — spawning contest lineup…');
    await rotatePitContests(admin);
    const retry = await fetchOpenContest();
    contest = retry.data;
    contestErr = retry.error;
  }

  if (contestErr || !contest) {
    console.error(`No open contest for slug "${slug}". Check Supabase contests table.`);
    process.exit(1);
  }

  const contestClock = {
    status: contest.status as 'open' | 'active' | 'closed',
    endsAt: contest.ends_at as string | null,
    startsAt: (contest.starts_at as string | null) ?? null,
    slug: (contest.slug as string | undefined) ?? slug,
  };

  if (!isContestTradingOpen(contestClock)) {
    console.warn(`"${contest.title}" not trading yet — trying another live pit…`);
    const { data: liveList } = await admin
      .from('contests')
      .select('*')
      .neq('status', 'closed')
      .order('id', { ascending: false })
      .limit(12);
    const live = (liveList || []).find((c) =>
      isContestTradingOpen({
        status: c.status,
        endsAt: c.ends_at,
        startsAt: c.starts_at,
        slug: c.slug ?? slug,
      })
    );
    if (!live) {
      console.error('No live trading pit found. Wait for a scheduled pit to open.');
      process.exit(1);
    }
    contest = live;
  }

  const assets: string[] = (contest.assets as string[]) || [];
  console.log(`\n🎯 Pit: ${contest.title} (id=${contest.id})`);
  console.log(`   Assets on tape: ${assets.join(', ')}\n`);

  const prices = await fetchMarketPrices(assets);

  const results: Array<{ username: string; email: string; status: string }> = [];

  for (let i = 0; i < TRADER_NAMES.length; i++) {
    const trader = TRADER_NAMES[i];
    const symbol = assets[i % assets.length];
    const shares = defaultShares(symbol, trader.shareScale);
    try {
      const userId = await ensureUser(admin, trader.email, trader.username);

      await admin
        .from('profiles')
        .update({ username: trader.username.replace(/^@/, ''), balance: SEED_BALANCE })
        .eq('id', userId);

      const { data: existingPart } = await admin
        .from('participations')
        .select('id')
        .eq('user_id', userId)
        .eq('contest_id', contest.id as number)
        .maybeSingle();

      if (!existingPart) {
        await joinContestServer(admin, userId, contest.id as number);
      }

      if (!symbol) {
        results.push({ username: trader.username, email: trader.email, status: 'no assets on contest' });
        continue;
      }

      let price = prices[symbol];
      if (!price) {
        const fresh = await fetchMarketPrices([symbol]);
        price = fresh[symbol];
      }
      if (!price) {
        results.push({ username: trader.username, email: trader.email, status: `no price for ${symbol}` });
        continue;
      }

      const { data: part } = await admin
        .from('participations')
        .select('positions')
        .eq('user_id', userId)
        .eq('contest_id', contest.id as number)
        .single();

      const positions = Array.isArray(part?.positions) ? part.positions : [];
      const alreadyHas = positions.some((p: { symbol?: string }) => p.symbol === symbol);

      if (!alreadyHas) {
        await executeTradeServer(admin, userId, contest.id as number, symbol, 'buy', shares, price);
        results.push({
          username: trader.username,
          email: trader.email,
          status: `joined + BUY ${shares} ${symbol} @ $${price.toFixed(2)}`,
        });
      } else {
        results.push({ username: trader.username, email: trader.email, status: `already in pit (${symbol})` });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ username: trader.username, email: trader.email, status: `error: ${msg}` });
    }
  }

  const { count } = await admin
    .from('participations')
    .select('*', { count: 'exact', head: true })
    .eq('contest_id', contest.id);

  console.log('── Results ──');
  for (const r of results) {
    console.log(`  ${r.username.padEnd(8)} ${r.email.padEnd(22)} ${r.status}`);
  }

  console.log(`\n✅ ${count ?? '?'} traders now in contest #${contest.id}`);
  console.log('\nLogin any bot (password for all):');
  console.log(`   Password: ${PASSWORD}`);
  console.log('   Emails: pitbot1@tradr.test … pitbot10@tradr.test\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});