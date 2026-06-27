import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { dbContestToContest } from '@/lib/game-types';
import { normalizePositions } from '@/lib/portfolio';

export async function GET(request: NextRequest) {
  const contestId = Number(request.nextUrl.searchParams.get('contestId'));
  if (!contestId) {
    return Response.json({ error: 'contestId is required' }, { status: 400 });
  }

  const user = await getUserFromRequest(request);
  const admin = getSupabaseAdmin();
  if (!admin) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { data: contestRow, error: contestError } = await admin
    .from('contests')
    .select('*')
    .eq('id', contestId)
    .single();

  if (contestError || !contestRow) {
    return Response.json({ error: 'Contest not found' }, { status: 404 });
  }

  if (contestRow.status !== 'closed') {
    return Response.json({ error: 'Contest recap available after settlement' }, { status: 400 });
  }

  const [{ data: parts }, { data: trades }, { data: profiles }] = await Promise.all([
    admin
      .from('participations')
      .select('*')
      .eq('contest_id', contestId)
      .order('final_rank', { ascending: true }),
    admin
      .from('trade_log')
      .select('*')
      .eq('contest_id', contestId)
      .order('created_at', { ascending: true }),
    admin.from('profiles').select('id, username'),
  ]);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p.username || 'trader']));

  const settlementPrices = (contestRow.settlement_prices as Record<string, number> | null) || undefined;

  const standings = (parts || []).map((p) => ({
    userId: p.user_id,
    username: `@${profileMap.get(p.user_id) || 'trader'}`,
    finalRank: p.final_rank || 0,
    finalValue: Number(p.final_value || 0),
    payout: Number(p.payout || 0),
    cash: Number(p.cash || 0),
    positions: normalizePositions(p.positions),
    isYou: user?.id === p.user_id,
  }));

  const tradeEntries = (trades || []).map((t) => ({
    id: t.id,
    userId: t.user_id,
    username: `@${profileMap.get(t.user_id) || 'trader'}`,
    symbol: t.symbol,
    side: t.side as 'buy' | 'sell',
    shares: Number(t.shares),
    price: Number(t.price),
    total: Number(t.total),
    createdAt: t.created_at,
  }));

  return Response.json({
    contest: dbContestToContest({ ...contestRow, entry_count: parts?.length || 0 }),
    standings,
    trades: tradeEntries,
    settlementPrices,
  });
}