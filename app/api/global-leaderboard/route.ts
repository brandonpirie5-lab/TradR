import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import type { GlobalLeaderboardMetric, GlobalLeaderboardPeriod } from '@/lib/game-types';

export async function GET(request: NextRequest) {
  const period = (request.nextUrl.searchParams.get('period') || 'all') as GlobalLeaderboardPeriod;
  const metric = (request.nextUrl.searchParams.get('metric') || 'winnings') as GlobalLeaderboardMetric;
  const user = await getUserFromRequest(request);

  const admin = getSupabaseAdmin();
  if (!admin) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: rows, error }, { data: contestRows }] = await Promise.all([
    admin
      .from('participations')
      .select('user_id, final_rank, payout, contest_id')
      .not('final_rank', 'is', null),
    admin.from('contests').select('id, ends_at, status'),
  ]);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const contestMap = new Map((contestRows || []).map((c) => [c.id, c]));

  const filtered = (rows || []).filter((row) => {
    if (period !== 'week') return true;
    const c = contestMap.get(row.contest_id);
    const endsAt = c?.ends_at;
    if (!endsAt) return true;
    return new Date(endsAt).getTime() >= new Date(weekAgo).getTime();
  });

  type Agg = { winnings: number; wins: number; completed: number };
  const byUser = new Map<string, Agg>();

  for (const row of filtered) {
    const uid = row.user_id as string;
    const cur = byUser.get(uid) || { winnings: 0, wins: 0, completed: 0 };
    cur.winnings += Number(row.payout || 0);
    if (row.final_rank === 1) cur.wins += 1;
    cur.completed += 1;
    byUser.set(uid, cur);
  }

  const userIds = [...byUser.keys()];
  const { data: profiles } = userIds.length
    ? await admin.from('profiles').select('id, username').in('id', userIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map((p) => [p.id, p.username || 'trader']));

  let entries = [...byUser.entries()].map(([userId, agg]) => {
    const winRate = agg.completed ? (agg.wins / agg.completed) * 100 : 0;
    let value = agg.winnings;
    if (metric === 'wins') value = agg.wins;
    if (metric === 'win_rate') value = winRate;

    return {
      userId,
      username: `@${profileMap.get(userId) || 'trader'}`,
      value: metric === 'win_rate' ? Math.round(value * 10) / 10 : value,
      wins: agg.wins,
      contests: agg.completed,
      isYou: user?.id === userId,
    };
  });

  entries.sort((a, b) => b.value - a.value);
  entries = entries.slice(0, 50).map((e, i) => ({ ...e, rank: i + 1 }));

  return Response.json({ period, metric, entries });
}