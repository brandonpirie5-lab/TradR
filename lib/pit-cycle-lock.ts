import type { SupabaseClient } from '@supabase/supabase-js';
import { runPitCycle, type PitCycleResult } from './pit-cycle';

let cyclePromise: Promise<PitCycleResult> | null = null;

/** Run at most one pit cycle at a time per server instance. */
export function schedulePitCycle(admin: SupabaseClient, actingUserId?: string): void {
  if (cyclePromise) return;
  cyclePromise = runPitCycle(admin, actingUserId)
    .catch((e) => {
      console.warn('Pit cycle failed', e);
      return {
        activated: 0,
        settled: [],
        spawned: 0,
        rotation: [],
      } satisfies PitCycleResult;
    })
    .finally(() => {
      cyclePromise = null;
    });
}