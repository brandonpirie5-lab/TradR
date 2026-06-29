import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { ensureWeekSlateContests } from '@/lib/week-slate';

/** Spawn open instances for the full week fight card (2 pits × 7 days). */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  const provided = authHeader?.replace('Bearer ', '');

  if (cronSecret && provided !== cronSecret) {
    const userHeader = request.headers.get('x-tradr-client');
    if (userHeader !== 'arena') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const slate = await ensureWeekSlateContests(admin);

  return Response.json({
    ok: true,
    created: slate.filter((s) => s.action === 'created').length,
    existing: slate.filter((s) => s.action === 'exists').length,
    slate,
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}