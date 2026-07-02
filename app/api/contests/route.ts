import { dedupeContestRows } from '@/lib/contest-pool-cleanup';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { DbContest } from '@/lib/game-types';
import { schedulePitCycle } from '@/lib/pit-cycle-lock';
import { ensureDailyPitContest } from '@/lib/ensure-daily-pit';
import { ensurePitLiquidity } from '@/lib/ensure-pit-liquidity';
import { activateScheduledContests } from '@/lib/activate-contests';
import { settleExpiredContests } from '@/lib/settle-contest';

export async function GET() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  let pitId: number | null = null;
  try {
    pitId = await ensureDailyPitContest(admin);
    try {
      await activateScheduledContests(admin);
      await settleExpiredContests(admin);
    } catch (e) {
      console.warn('inline pit settle', e);
    }
    if (pitId) {
      try {
        await ensurePitLiquidity(admin, pitId);
      } catch (e) {
        console.warn('ensurePitLiquidity', e);
      }
    }
  } catch (e) {
    console.warn('ensureDailyPitContest', e);
  }

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

  const contestIds = (contests || []).map((c) => c.id);
  let entryCounts: Record<number, number> = {};

  if (contestIds.length > 0) {
    const { data: counts, error: countError } = await admin
      .from('participations')
      .select('contest_id')
      .in('contest_id', contestIds);

    if (countError) {
      return Response.json({ error: countError.message }, { status: 500 });
    }

    for (const row of counts || []) {
      entryCounts[row.contest_id] = (entryCounts[row.contest_id] || 0) + 1;
    }
  }

  const deduped = dedupeContestRows(contests || [], new Date(), entryCounts);
  const payload: DbContest[] = deduped.map((c) => ({
    ...c,
    assets: c.assets || [],
    entry_count: entryCounts[c.id] || 0,
  }));

  return Response.json(payload);
}