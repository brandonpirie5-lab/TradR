import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { DbContest } from '@/lib/game-types';
import { runPitCycle } from '@/lib/pit-cycle';

export async function GET() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  // Don't block the contest list — cycle can take 30s+ with settle + week spawn.
  void runPitCycle(admin).catch((e) => {
    console.warn('Pit cycle on contest load failed', e);
  });

  const { data: contests, error } = await admin
    .from('contests')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const { data: counts, error: countError } = await admin
    .from('participations')
    .select('contest_id');

  if (countError) {
    return Response.json({ error: countError.message }, { status: 500 });
  }

  const entryCounts: Record<number, number> = {};
  for (const row of counts || []) {
    entryCounts[row.contest_id] = (entryCounts[row.contest_id] || 0) + 1;
  }

  const payload: DbContest[] = (contests || []).map((c) => ({
    ...c,
    assets: c.assets || [],
    entry_count: entryCounts[c.id] || 0,
  }));

  return Response.json(payload);
}