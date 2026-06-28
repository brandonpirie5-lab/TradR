import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { computeTapeScore, getTapeWeekStart } from '@/lib/tape-leaderboard';
import { DAY_THEMES } from '@/lib/tape-week';

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  const admin = getSupabaseAdmin();
  if (!admin) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const weekStart = getTapeWeekStart();
  const weekStartIso = weekStart.toISOString();

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
    const c = contestMap.get(row.contest_id);
    const endsAt = c?.ends_at;
    if (!endsAt) return false;
    return new Date(endsAt).getTime() >= weekStart.getTime();
  });

  type Agg = { tapeScore: number; winnings: number; battles: number; wins: number };
  const byUser = new Map<string, Agg>();

  for (const row of filtered) {
    const uid = row.user_id as string;
    const cur = byUser.get(uid) || { tapeScore: 0, winnings: 0, battles: 0, wins: 0 };
    const payout = Number(row.payout || 0);
    const rank = row.final_rank as number | null;
    cur.tapeScore += computeTapeScore(payout, rank);
    cur.winnings += payout;
    cur.battles += 1;
    if (rank === 1) cur.wins += 1;
    byUser.set(uid, cur);
  }

  const userIds = [...byUser.keys()];
  const { data: profiles } = userIds.length
    ? await admin.from('profiles').select('id, username').in('id', userIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map((p) => [p.id, p.username || 'trader']));

  let entries = [...byUser.entries()].map(([userId, agg]) => ({
    userId,
    username: `@${profileMap.get(userId) || 'trader'}`,
    tapeScore: agg.tapeScore,
    winnings: agg.winnings,
    battles: agg.battles,
    wins: agg.wins,
    isYou: user?.id === userId,
  }));

  entries.sort((a, b) => b.tapeScore - a.tapeScore || b.winnings - a.winnings);
  entries = entries.slice(0, 30).map((e, i) => ({ ...e, rank: i + 1 }));

  const now = new Date();
  const dayIndex = now.getDay();
  const themeWords = DAY_THEMES.map((t) => t.word).join(' · ');

  return Response.json({
    weekStart: weekStartIso,
    themeLine: themeWords,
    entries,
  });
}