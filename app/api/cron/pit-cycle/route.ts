import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { settleExpiredContests } from '@/lib/settle-contest';
import { rotatePitContests } from '@/lib/contest-rotation';

/** Vercel Cron + manual ops: settle expired pits, then spawn fresh ones. */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  const provided = authHeader?.replace('Bearer ', '');

  if (cronSecret && provided !== cronSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const settled = await settleExpiredContests(admin);
  const rotated = await rotatePitContests(admin);

  return Response.json({
    ok: true,
    timestamp: new Date().toISOString(),
    settled: settled.length,
    settledContests: settled.map((s) => ({ id: s.contestId, title: s.contestTitle, participants: s.totalParticipants })),
    rotation: rotated,
    spawned: rotated.filter((r) => r.action === 'created').length,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}