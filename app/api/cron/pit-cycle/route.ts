import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { runPitCycle } from '@/lib/pit-cycle';

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

  const cycle = await runPitCycle(admin);

  return Response.json({
    ok: true,
    timestamp: new Date().toISOString(),
    activated: cycle.activated,
    settled: cycle.settled.length,
    settledContests: cycle.settled.map((s) => ({
      id: s.contestId,
      title: s.contestTitle,
      participants: s.totalParticipants,
    })),
    rotation: cycle.rotation,
    spawned: cycle.spawned,
    weekSlate: cycle.weekSlate,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}