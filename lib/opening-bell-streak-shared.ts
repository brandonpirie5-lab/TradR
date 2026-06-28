export const ET = 'America/New_York';

export const STREAK_MILESTONES = [
  { days: 3, label: '3-day grinder', rewardLabel: '$2 pit credit', rewardAmount: 2 },
  { days: 7, label: 'Week on the tape', rewardLabel: '$5 pit credit', rewardAmount: 5 },
] as const;

export type OpeningBellStreakInfo = {
  streak: number;
  playedToday: boolean;
  nextMilestone: (typeof STREAK_MILESTONES)[number] | null;
  daysToNext: number;
  rewardLabel: string | null;
};

export function etDayKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ET,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function previousEtDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d - 1));
  return utc.toISOString().slice(0, 10);
}

export function computeStreakAfterPlay(
  lastDayEt: string | null | undefined,
  currentStreak: number,
  now = new Date()
): { streak: number; lastDayEt: string; incremented: boolean } {
  const today = etDayKey(now);
  const last = lastDayEt || null;
  const streakNum = Math.max(0, currentStreak);

  if (last === today) {
    return { streak: streakNum || 1, lastDayEt: today, incremented: false };
  }

  const yesterday = previousEtDayKey(today);
  const streak = last === yesterday ? streakNum + 1 : 1;
  return { streak, lastDayEt: today, incremented: true };
}

export function buildStreakInfo(
  streak: number,
  lastDayEt: string | null | undefined,
  now = new Date()
): OpeningBellStreakInfo {
  const today = etDayKey(now);
  const playedToday = lastDayEt === today;
  const nextMilestone = STREAK_MILESTONES.find((m) => streak < m.days) ?? null;
  const daysToNext = nextMilestone ? Math.max(0, nextMilestone.days - streak) : 0;

  return {
    streak,
    playedToday,
    nextMilestone,
    daysToNext,
    rewardLabel: nextMilestone?.rewardLabel ?? null,
  };
}

export function milestonesToClaim(
  streak: number,
  claimed: number[]
): typeof STREAK_MILESTONES[number][] {
  return STREAK_MILESTONES.filter(
    (m) => streak >= m.days && !claimed.includes(m.days)
  );
}