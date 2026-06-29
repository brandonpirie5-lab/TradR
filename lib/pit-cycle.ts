import { SupabaseClient } from '@supabase/supabase-js';
import { activateScheduledContests } from './activate-contests';
import { closeDuplicateAndExpiredContests } from './contest-pool-cleanup';
import { rotatePitContests } from './contest-rotation';
import { settleExpiredContests, type SettleResult } from './settle-contest';
import { ensureWeekSlateContests } from './week-slate';

export type PitCycleResult = {
  activated: number;
  settled: SettleResult[];
  spawned: number;
  weekSlate: number;
  rotation: Awaited<ReturnType<typeof rotatePitContests>>;
};

/** Activate scheduled pits, settle expired bells, spawn fresh instances when needed. */
export async function runPitCycle(
  admin: SupabaseClient,
  actingUserId?: string
): Promise<PitCycleResult> {
  try {
    const cleaned = await closeDuplicateAndExpiredContests(admin);
    if (cleaned.closedDuplicates + cleaned.closedExpired > 0) {
      console.info('Pit pool cleanup', cleaned);
    }
  } catch (e) {
    console.warn('Pit pool cleanup failed', e);
  }

  const activated = await activateScheduledContests(admin);
  const settled = await settleExpiredContests(admin, actingUserId);
  const weekSlateRows = await ensureWeekSlateContests(admin);
  const rotation = settled.length > 0 ? await rotatePitContests(admin) : [];
  const spawned =
    rotation.filter((r) => r.action === 'created').length +
    weekSlateRows.filter((r) => r.action === 'created').length;
  return {
    activated,
    settled,
    spawned,
    weekSlate: weekSlateRows.filter((r) => r.action === 'created').length,
    rotation,
  };
}