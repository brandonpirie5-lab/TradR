/**
 * Daily Pit — one event, same clock every day (Eastern Time).
 * 9:30 AM open · 4:00 PM bell — aligns with US cash session + daily habit.
 */

import { DAILY_PIT_SLUG } from './daily-pit-config';

const ET = 'America/New_York';

export const DAILY_OPEN_HOUR_ET = 9;
export const DAILY_OPEN_MINUTE_ET = 30;
export const DAILY_CLOSE_HOUR_ET = 16;
export const DAILY_CLOSE_MINUTE_ET = 0;

export type DailyPitPhase = 'pre_open' | 'live' | 'between';

export type DailyPitWindow = {
  startsAt: Date;
  endsAt: Date;
  status: 'open' | 'active';
  phase: DailyPitPhase;
};

function toEtParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ET,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
  };
}

/** Build a Date for a specific ET wall-clock (handles DST). */
export function etWallTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour + 5, minute));
  for (let i = 0; i < 3; i++) {
    const p = toEtParts(guess);
    const deltaMin =
      (hour - p.hour) * 60 + (minute - p.minute) + (day - p.day) * 24 * 60;
    if (deltaMin === 0) return guess;
    guess.setTime(guess.getTime() + deltaMin * 60 * 1000);
  }
  return guess;
}

export function getEtDayKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ET }).format(date);
}

export function windowForEtDay(
  year: number,
  month: number,
  day: number
): Omit<DailyPitWindow, 'phase'> & { phase?: DailyPitPhase } {
  const startsAt = etWallTime(year, month, day, DAILY_OPEN_HOUR_ET, DAILY_OPEN_MINUTE_ET);
  const endsAt = etWallTime(year, month, day, DAILY_CLOSE_HOUR_ET, DAILY_CLOSE_MINUTE_ET);
  return { startsAt, endsAt, status: 'open' as const };
}

/** Current or next daily pit window relative to now. */
export function getCurrentDailyPitWindow(from = new Date()): DailyPitWindow {
  const p = toEtParts(from);
  const today = windowForEtDay(p.year, p.month, p.day);
  const now = from.getTime();

  if (now < today.startsAt.getTime()) {
    return { ...today, status: 'open', phase: 'pre_open' };
  }
  if (now < today.endsAt.getTime()) {
    return { ...today, status: 'active', phase: 'live' };
  }

  const tomorrow = new Date(today.startsAt.getTime() + 24 * 60 * 60 * 1000);
  const tp = toEtParts(tomorrow);
  const next = windowForEtDay(tp.year, tp.month, tp.day);
  return { ...next, status: 'open', phase: 'between' };
}

/** Next pit that hasn't started trading yet (after today's bell or before today's open). */
export function getNextDailyPitWindow(from = new Date()): DailyPitWindow {
  const current = getCurrentDailyPitWindow(from);
  if (current.phase === 'pre_open') return current;

  const p = toEtParts(from);
  const today = windowForEtDay(p.year, p.month, p.day);
  const base =
    from.getTime() >= today.endsAt.getTime()
      ? new Date(today.startsAt.getTime() + 24 * 60 * 60 * 1000)
      : new Date(today.endsAt.getTime() + 60 * 1000);
  const np = toEtParts(base);
  const next = windowForEtDay(np.year, np.month, np.day);
  return { ...next, status: 'open', phase: 'pre_open' };
}

export function msUntilDailyPitOpen(from = new Date()): number {
  const w = getCurrentDailyPitWindow(from);
  if (w.phase === 'live') return 0;
  if (w.phase === 'pre_open') return Math.max(0, w.startsAt.getTime() - from.getTime());
  return Math.max(0, w.startsAt.getTime() - from.getTime());
}

export function msUntilDailyPitBell(contest: { endsAt?: string | null }, from = new Date()): number | null {
  if (!contest.endsAt) return null;
  return Math.max(0, new Date(contest.endsAt).getTime() - from.getTime());
}

export function formatDailyPitScheduleLabel(): string {
  return 'Every day · 9:30 AM – 4:00 PM ET';
}

export function formatDailyPitPhaseLabel(phase: DailyPitPhase, from = new Date()): string {
  const w = getCurrentDailyPitWindow(from);
  if (phase === 'live') return 'LIVE NOW';
  if (phase === 'pre_open') {
    const ms = Math.max(0, w.startsAt.getTime() - from.getTime());
    const mins = Math.ceil(ms / 60_000);
    if (mins < 60) return `Opens in ${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `Opens in ${hrs}h ${mins % 60}m`;
  }
  return 'Bell rung — next pit tomorrow';
}

export function isDailyPitSlug(slug?: string | null): boolean {
  return slug === DAILY_PIT_SLUG || slug === 'daily-pit' || slug === 'opening-bell';
}