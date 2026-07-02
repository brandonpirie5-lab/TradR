import type { SupabaseClient } from '@supabase/supabase-js';
import { DAILY_MIN_ENTRIES, DAILY_PIT_SLUG } from './daily-pit-config';
import { seedBotsIntoContest, type ContestRow } from './pit-bots';

/** Soft-launch: ensure daily pit has enough traders so pool isn't empty on Arena. */
export async function ensurePitLiquidity(
  admin: SupabaseClient,
  contestId: number,
  minTraders = DAILY_MIN_ENTRIES
): Promise<{ added: number; total: number }> {
  const { count, error: countErr } = await admin
    .from('participations')
    .select('*', { count: 'exact', head: true })
    .eq('contest_id', contestId);

  if (countErr) {
    console.warn('ensurePitLiquidity count', countErr.message);
    return { added: 0, total: 0 };
  }

  const current = count ?? 0;
  if (current >= minTraders) return { added: 0, total: current };

  const { data: contest, error } = await admin
    .from('contests')
    .select('id, title, slug, status, ends_at, starts_at, assets, entry_fee')
    .eq('id', contestId)
    .single();

  if (error || !contest) return { added: 0, total: current };

  const slug = contest.slug ?? '';
  if (slug !== DAILY_PIT_SLUG && contest.title !== 'Daily Pit') {
    return { added: 0, total: current };
  }

  const needed = minTraders - current;
  const results = await seedBotsIntoContest(admin, contest as ContestRow, undefined, {
    limit: needed,
  });
  const added = results.filter((r) => !r.status.startsWith('error')).length;

  const { count: after } = await admin
    .from('participations')
    .select('*', { count: 'exact', head: true })
    .eq('contest_id', contestId);

  return { added, total: after ?? current + added };
}