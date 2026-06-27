import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { settleExpiredContests } from '@/lib/settle-contest';
import { rotatePitContests } from '@/lib/contest-rotation';

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  const cronOk = cronSecret && authHeader === `Bearer ${cronSecret}`;

  // Logged-in users can trigger idempotent auto-settle (keeps pits closing on time)
  const user = await getUserFromRequest(request);
  if (!cronOk && !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const results = await settleExpiredContests(admin);
  const rotation = await rotatePitContests(admin);

  return Response.json({
    settled: results.length,
    spawned: rotation.filter((r) => r.action === 'created').length,
    contests: results.map((r) => ({
      id: r.contestId,
      title: r.contestTitle,
      participants: r.totalParticipants,
      empty: r.empty,
      yourRank: user ? r.userRank : undefined,
      yourPayout: user ? r.userPayout : undefined,
    })),
  });
}