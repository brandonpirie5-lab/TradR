import { dedupeContestRows } from '@/lib/contest-pool-cleanup';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { DbContest } from '@/lib/game-types';
import { schedulePitCycle } from '@/lib/pit-cycle-lock';

export async function GET() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  // Don't block the contest list — cycle can take 30s+ with settle + week spawn.
  schedulePitCycle(admin);

  const nowIso = new Date().toISOString();
  const { data: contests, error } = await admin
    .from('contests')
    .select('*')
    .neq('status', 'closed')
    .gte('ends_at', nowIso)
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

  const deduped = dedupeContestRows(contests || []);
  const payload: DbContest[] = deduped.map((c) => ({
    ...c,
    assets: c.assets || [],
    entry_count: entryCounts[c.id] || 0,
  }));

  return Response.json(payload);
}