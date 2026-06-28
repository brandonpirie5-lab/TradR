/** Weekly tape score — rewards payouts + podium finishes + showing up. */
export function computeTapeScore(payout: number, finalRank: number | null): number {
  const pay = Math.max(0, Number(payout || 0));
  let podium = 0;
  if (finalRank === 1) podium = 25;
  else if (finalRank === 2) podium = 15;
  else if (finalRank === 3) podium = 10;
  const showed = finalRank != null ? 2 : 0;
  return Math.round(pay + podium + showed);
}

export function getTapeWeekStart(now = new Date()): Date {
  const etParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).formatToParts(now);

  const get = (type: string) => etParts.find((p) => p.type === type)?.value ?? '0';
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = dayMap[get('weekday').slice(0, 3)] ?? 0;
  const daysFromMonday = dow === 0 ? 6 : dow - 1;

  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = Number(get('day'));

  const mondayUtc = new Date(Date.UTC(year, month - 1, day - daysFromMonday, 5, 0, 0));
  return mondayUtc;
}