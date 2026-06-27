import { NextRequest } from 'next/server';
import { getUserFromRequest, unauthorizedResponse, badRequestResponse } from '@/lib/auth';
import { getSupabaseAdmin, getSupabaseUserClient } from '@/lib/supabase-admin';
import { fetchMarketPrices } from '@/lib/market-prices';
import { executeTradeServer, isMissingRpcError } from '@/lib/game-server';
import { getPortfolioValue, normalizePositions } from '@/lib/portfolio';
import { isContestBellOpen, isSlippageExceeded } from '@/lib/contest-bell';

async function computeUserRank(
  admin: ReturnType<typeof getSupabaseAdmin>,
  contestId: number,
  userId: string,
  prices: Record<string, number>
) {
  if (!admin) return { rank: 0, portfolioValue: 0, tradersBehind: 0 };

  const { data: parts } = await admin.from('participations').select('*').eq('contest_id', contestId);
  if (!parts?.length) return { rank: 1, portfolioValue: 0, tradersBehind: 0 };

  const ranked = parts
    .map((p) => ({
      userId: p.user_id,
      value: getPortfolioValue(
        { cash: Number(p.cash), positions: normalizePositions(p.positions) },
        prices
      ),
    }))
    .sort((a, b) => b.value - a.value);

  const idx = ranked.findIndex((r) => r.userId === userId);
  const rank = idx >= 0 ? idx + 1 : ranked.length + 1;
  const portfolioValue = idx >= 0 ? ranked[idx].value : 0;
  const tradersBehind = Math.max(0, ranked.length - rank);

  return { rank, portfolioValue, tradersBehind };
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  const authHeader = request.headers.get('authorization')!;
  const token = authHeader.slice(7);
  const db = getSupabaseUserClient(token);
  const admin = getSupabaseAdmin();
  if (!db || !admin) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  let body: { contestId?: number; symbol?: string; side?: string; shares?: number; lockedPrice?: number };
  try {
    body = await request.json();
  } catch {
    return badRequestResponse('Invalid JSON body');
  }

  const contestId = Number(body.contestId);
  const symbol = String(body.symbol || '').toUpperCase();
  const side = body.side;
  const shares = Number(body.shares);
  const lockedPrice = body.lockedPrice != null ? Number(body.lockedPrice) : undefined;

  if (!contestId || !symbol || !side || !shares || shares <= 0) {
    return badRequestResponse('contestId, symbol, side, and positive shares are required');
  }
  if (side !== 'buy' && side !== 'sell') {
    return badRequestResponse('side must be buy or sell');
  }

  const { data: contest, error: contestError } = await admin
    .from('contests')
    .select('assets, starting_portfolio, status, ends_at')
    .eq('id', contestId)
    .single();

  if (contestError || !contest) {
    return Response.json({ error: 'Contest not found' }, { status: 404 });
  }
  if (contest.status === 'closed') {
    return badRequestResponse('Contest is closed');
  }
  if (!isContestBellOpen({ status: contest.status, endsAt: contest.ends_at })) {
    return badRequestResponse('Bell has rung — trading is closed for this pit');
  }
  if (contest.assets?.length && !contest.assets.includes(symbol)) {
    return badRequestResponse('Symbol not allowed in this contest');
  }

  const prices = await fetchMarketPrices([symbol]);
  const price = prices[symbol];
  if (!price) {
    return Response.json({ error: 'Could not fetch live price for symbol' }, { status: 502 });
  }

  if (lockedPrice != null && isSlippageExceeded(lockedPrice, price)) {
    return badRequestResponse(
      `Price moved (${lockedPrice.toFixed(2)} → ${price.toFixed(2)}). Refresh and retry.`
    );
  }

  const rankBefore = await computeUserRank(admin, contestId, user.id, prices);

  const { data, error } = await db.rpc('execute_trade', {
    p_contest_id: contestId,
    p_symbol: symbol,
    p_side: side,
    p_shares: shares,
    p_price: price,
  });

  let cash: number;
  let positions: unknown;

  if (!error) {
    cash = Number(data?.cash);
    positions = data?.positions;
  } else if (isMissingRpcError(error.message)) {
    try {
      const result = await executeTradeServer(admin, user.id, contestId, symbol, side as 'buy' | 'sell', shares, price);
      cash = result.cash;
      positions = result.positions;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Trade failed';
      const status = msg.includes('Insufficient') || msg.includes('Bell') ? 400 : 500;
      return Response.json({ error: msg }, { status });
    }
  } else {
    const msg = error.message || 'Trade failed';
    const status = msg.includes('Insufficient') || msg.includes('Bell') ? 400 : 500;
    return Response.json({ error: msg }, { status });
  }

  const allSymbols = new Set<string>(contest.assets || [symbol]);
  for (const pos of normalizePositions(positions)) {
    allSymbols.add(pos.symbol);
  }
  const allPrices = await fetchMarketPrices([...allSymbols]);
  const rankAfter = await computeUserRank(admin, contestId, user.id, { ...allPrices, ...prices });

  return Response.json({
    cash,
    positions,
    executedPrice: price,
    lockedPrice: lockedPrice ?? price,
    startingValue: contest.starting_portfolio,
    portfolioValue: rankAfter.portfolioValue,
    rank: rankAfter.rank,
    rankBefore: rankBefore.rank,
    rankDelta: rankBefore.rank - rankAfter.rank,
    tradersBehind: rankAfter.tradersBehind,
    priceTimestamp: new Date().toISOString(),
  });
}