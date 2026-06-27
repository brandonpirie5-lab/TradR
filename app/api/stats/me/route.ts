import { NextRequest } from 'next/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/auth';
import { getSupabaseUserClient } from '@/lib/supabase-admin';
import type { UserPerformanceStats } from '@/lib/game-types';

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  const token = request.headers.get('authorization')!.slice(7);
  const db = getSupabaseUserClient(token);
  if (!db) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const [{ data: parts }, { data: txs }] = await Promise.all([
    db.from('participations').select('final_rank, payout, contest_id, created_at').eq('user_id', user.id),
    db.from('transactions').select('type, amount').eq('user_id', user.id),
  ]);

  const participations = parts || [];
  const completed = participations.filter((p) => p.final_rank != null);
  const wins = completed.filter((p) => p.final_rank === 1).length;
  const placements = completed.filter((p) => p.final_rank != null && p.final_rank <= 3).length;
  const cashed = completed.filter((p) => Number(p.payout) > 0).length;
  const totalWinnings = completed.reduce((s, p) => s + Number(p.payout || 0), 0);

  const entryFees = (txs || [])
    .filter((t) => t.type === 'entry_fee')
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

  const ranks = completed.map((p) => p.final_rank as number);
  const avgFinishRank = ranks.length
    ? Math.round((ranks.reduce((a, b) => a + b, 0) / ranks.length) * 10) / 10
    : null;
  const bestFinishRank = ranks.length ? Math.min(...ranks) : null;

  const sortedCompleted = [...completed].sort(
    (a, b) => new Date((b as { created_at?: string }).created_at || 0).getTime() -
      new Date((a as { created_at?: string }).created_at || 0).getTime()
  );
  let pitStreak = 0;
  for (const p of sortedCompleted) {
    if (p.final_rank != null && p.final_rank <= 3) pitStreak++;
    else break;
  }

  const stats: UserPerformanceStats = {
    contestsEntered: participations.length,
    contestsCompleted: completed.length,
    wins,
    placements,
    cashed,
    winRate: completed.length ? Math.round((wins / completed.length) * 1000) / 10 : 0,
    totalWinnings,
    totalEntryFees: entryFees,
    netProfit: totalWinnings - entryFees,
    avgFinishRank,
    bestFinishRank,
    pitStreak,
  };

  return Response.json(stats);
}