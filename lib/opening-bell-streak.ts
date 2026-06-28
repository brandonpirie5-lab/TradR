import {
  buildStreakInfo,
  computeStreakAfterPlay,
  STREAK_MILESTONES,
  type OpeningBellStreakInfo,
} from './opening-bell-streak-shared';

export { STREAK_MILESTONES, type OpeningBellStreakInfo };

const STORAGE_KEY = 'tradr_opening_bell_streak';

type StreakState = {
  streak: number;
  lastDayEt: string;
};

function readState(): StreakState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StreakState;
    if (typeof parsed.streak === 'number' && typeof parsed.lastDayEt === 'string') {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeState(state: StreakState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function dispatchStreakUpdate(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tradr-streak-update'));
  }
}

/** Local-only streak (demo / offline). */
export function recordOpeningBellDay(now = new Date()): OpeningBellStreakInfo {
  const prev = readState();
  const { streak, lastDayEt, incremented } = computeStreakAfterPlay(
    prev?.lastDayEt,
    prev?.streak ?? 0,
    now
  );

  if (!incremented && prev) {
    return getOpeningBellStreak(now);
  }

  writeState({ streak, lastDayEt });
  dispatchStreakUpdate();
  return getOpeningBellStreak(now);
}

export function getOpeningBellStreak(now = new Date()): OpeningBellStreakInfo {
  const state = readState();
  return buildStreakInfo(state?.streak ?? 0, state?.lastDayEt, now);
}

export function applyServerStreakSnapshot(
  streak: number,
  lastDayEt: string | null | undefined,
  now = new Date()
): OpeningBellStreakInfo {
  if (typeof window !== 'undefined' && lastDayEt) {
    writeState({ streak, lastDayEt });
    dispatchStreakUpdate();
  }
  return buildStreakInfo(streak, lastDayEt, now);
}