import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { runBotCycle } from '@/lib/pit-bots';

/** Vercel Cron: seed pit bots into open contests and place trades when bells are open. */
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

  const tick = Math.floor(Date.now() / 1000);
  await runBotCycle(admin, tick);

  return Response.json({
    ok: true,
    timestamp: new Date().toISOString(),
    tick,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}