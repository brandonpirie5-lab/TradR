/** Client-side daily pit streak — cosmetic habit loop, no free money. */

const STORAGE_KEY = 'tradr_daily_pit_streak';

export type DailyStreakInfo = {
  count: number;
  lastDayEt: string | null;
  playedToday: boolean;
};

function getEtDayKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(date);
}

function previousEtDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d - 1, 12, 0, 0));
  return getEtDayKey(dt);
}

function read(): DailyStreakInfo {
  if (typeof window === 'undefined') {
    return { count: 0, lastDayEt: null, playedToday: false };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, lastDayEt: null, playedToday: false };
    const parsed = JSON.parse(raw) as { count?: number; lastDayEt?: string | null };
    const today = getEtDayKey();
    const count = Number(parsed.count || 0);
    const lastDayEt = parsed.lastDayEt ?? null;
    return { count, lastDayEt, playedToday: lastDayEt === today };
  } catch {
    return { count: 0, lastDayEt: null, playedToday: false };
  }
}

export function getDailyStreak(): DailyStreakInfo {
  return read();
}

/** Call when user rings in to today's pit. */
export function recordDailyPitPlay(now = new Date()): DailyStreakInfo & { extended: boolean } {
  const today = getEtDayKey(now);
  const prev = read();
  if (prev.lastDayEt === today) {
    return { ...prev, playedToday: true, extended: false };
  }
  const yesterday = previousEtDayKey(today);
  const extended = prev.lastDayEt === yesterday;
  const count = extended ? prev.count + 1 : 1;
  const next = { count, lastDayEt: today, playedToday: true };
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count, lastDayEt: today }));
  }
  return { ...next, extended };
}

export function streakLabel(count: number): string {
  if (count < 2) return 'Day 1 on the tape';
  return `${count}-day streak`;
}