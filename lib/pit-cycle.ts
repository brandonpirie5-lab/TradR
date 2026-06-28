import { SupabaseClient } from '@supabase/supabase-js';
import { activateScheduledContests } from './activate-contests';
import { rotatePitContests } from './contest-rotation';
import { settleExpiredContests, type SettleResult } from './settle-contest';

export type PitCycleResult = {
  activated: number;
  settled: SettleResult[];
  spawned: number;
  rotation: Awaited<ReturnType<typeof rotatePitContests>>;
};

/** Activate scheduled pits, settle expired bells, spawn fresh instances when needed. */
export async function runPitCycle(
  admin: SupabaseClient,
  actingUserId?: string
): Promise<PitCycleResult> {
  const activated = await activateScheduledContests(admin);
  const settled = await settleExpiredContests(admin, actingUserId);
  const rotation = settled.length > 0 ? await rotatePitContests(admin) : [];
  const spawned = rotation.filter((r) => r.action === 'created').length;
  return { activated, settled, spawned, rotation };
}