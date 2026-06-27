import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { fetchMarketPrices } from '@/lib/market-prices';
import { getPortfolioValue, normalizePositions } from '@/lib/portfolio';
import { getUserFromRequest } from '@/lib/auth';
import { LeaderboardEntry } from '@/lib/game-types';

export async function GET(request: NextRequest) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const contestId = Number(request.nextUrl.searchParams.get('contestId'));
  if (!contestId) {
    return Response.json({ error: 'contestId is required' }, { status: 400 });
  }

  const viewer = await getUserFromRequest(request);

  const [{ data: contest }, { data: parts }, { data: profiles }] = await Promise.all([
    admin.from('contests').select('assets, status').eq('id', contestId).single(),
    admin.from('participations').select('*').eq('contest_id', contestId),
    admin.from('profiles').select('id, username'),
  ]);

  if (!contest) {
    return Response.json({ error: 'Contest not found' }, { status: 404 });
  }

  const assets: string[] = contest.assets || [];
  const symbols = new Set<string>(assets);
  for (const p of parts || []) {
    for (const pos of normalizePositions(p.positions)) {
      symbols.add(pos.symbol);
    }
  }

  const prices = await fetchMarketPrices([...symbols]);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p.username || 'trader']));

  const ranked = (parts || [])
    .map((p) => ({
      userId: p.user_id as string,
      username: `@${profileMap.get(p.user_id) || 'trader'}`,
      portfolioValue: getPortfolioValue(
        { cash: Number(p.cash), positions: normalizePositions(p.positions) },
        prices
      ),
    }))
    .sort((a, b) => b.portfolioValue - a.portfolioValue);

  const entries: LeaderboardEntry[] = ranked.map((row, idx) => ({
    ...row,
    rank: idx + 1,
    isYou: viewer?.id === row.userId,
  }));

  return Response.json({ entries, prices, contestStatus: contest.status });
}