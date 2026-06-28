import { OPENING_BELL_SLUG } from './pit-contests';
import { getContestDurationHours } from './contest-rules';

const ET = 'America/New_York';

/** Stagger daily pit opens so the Arena isn't 8 bells at once. */
export const DAILY_STAGGER_HOURS: Record<string, number> = {
  'the-liquidation': 0,
  'full-send': 2,
  'triple-stack': 4,
  'tradfi-vs-degen': 6,
  'meme-mayhem': 8,
  'gold-rush': 10,
};

function toEtParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ET,
    weekday: 'short',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
  const weekday = get('weekday');
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    dayOfWeek: dayMap[weekday.slice(0, 3)] ?? 0,
  };
}

/** Build a Date for a specific ET wall-clock (handles DST via formatter round-trip). */
function etWallTime(
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
      (hour - p.hour) * 60 +
      (minute - p.minute) +
      (day - p.day) * 24 * 60;
    if (deltaMin === 0) return guess;
    guess.setTime(guess.getTime() + deltaMin * 60 * 1000);
  }
  return guess;
}

function nextWeekdayAt(hour: number, minute: number, from: Date, staggerHours = 0): Date {
  const p = toEtParts(from);
  let candidate = etWallTime(p.year, p.month, p.day, hour, minute);
  candidate = new Date(candidate.getTime() + staggerHours * 60 * 60 * 1000);

  if (candidate.getTime() <= from.getTime()) {
    candidate = new Date(candidate.getTime() + 24 * 60 * 60 * 1000);
  }

  for (let guard = 0; guard < 8; guard++) {
    const cp = toEtParts(candidate);
    if (cp.dayOfWeek >= 1 && cp.dayOfWeek <= 5) return candidate;
    candidate = new Date(candidate.getTime() + 24 * 60 * 60 * 1000);
  }
  return candidate;
}

function nextSaturdayAt(hour: number, minute: number, from: Date): Date {
  const p = toEtParts(from);
  let daysUntil = (6 - p.dayOfWeek + 7) % 7;
  let candidate = etWallTime(p.year, p.month, p.day, hour, minute);
  if (daysUntil === 0 && candidate.getTime() <= from.getTime()) daysUntil = 7;
  if (daysUntil > 0) {
    candidate = new Date(candidate.getTime() + daysUntil * 24 * 60 * 60 * 1000);
  }
  return candidate;
}

const PIT_OPEN_SORT: Record<string, number> = {
  'opening-bell': 0,
  'the-liquidation': 1,
  'full-send': 2,
  'triple-stack': 3,
  'tradfi-vs-degen': 4,
  'meme-mayhem': 5,
  'gold-rush': 6,
  'weekend-carnage': 7,
};

function formatEtTime12(hour24: number, minute: number): string {
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const h = hour24 % 12 || 12;
  if (minute === 0) return `${h} ${period}`;
  return `${h}:${String(minute).padStart(2, '0')} ${period}`;
}

/** Canonical daily open label (ET) for Arena schedule rows. */
export function getCanonicalPitOpenLabel(slug: string | undefined | null): string {
  if (!slug || slug === OPENING_BELL_SLUG) return 'Always on';
  if (slug === 'weekend-carnage') return 'Sat 8 AM';

  const stagger = DAILY_STAGGER_HOURS[slug] ?? 0;
  const totalMinutes = 9 * 60 + 30 + stagger * 60;
  const hour24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${formatEtTime12(hour24, minute)} ET`;
}

export function getPitOpenSort(slug: string | undefined | null): number {
  if (!slug) return 99;
  return PIT_OPEN_SORT[slug] ?? 50;
}

export function formatPitStartTime(
  contest: { slug?: string | null; startsAt?: string | null },
  scheduled: boolean,
  hydrated: boolean
): string {
  if (contest.slug === OPENING_BELL_SLUG) return 'Always on';

  if (scheduled && contest.startsAt && hydrated) {
    const d = new Date(contest.startsAt);
    if (!Number.isNaN(d.getTime())) {
      return (
        d.toLocaleTimeString('en-US', {
          timeZone: ET,
          hour: 'numeric',
          minute: '2-digit',
        }) + ' ET'
      );
    }
  }

  if (!scheduled) return 'Live';

  return getCanonicalPitOpenLabel(contest.slug);
}

/** When the next instance of this pit should open (ET). Opening Bell = now. */
export function getNextPitStart(slug: string, from = new Date()): Date {
  if (slug === OPENING_BELL_SLUG) return from;

  if (slug === 'weekend-carnage') {
    return nextSaturdayAt(8, 0, from);
  }

  const stagger = DAILY_STAGGER_HOURS[slug] ?? 0;
  return nextWeekdayAt(9, 30, from, stagger);
}

export function buildPitWindow(
  slug: string,
  from = new Date()
): { startsAt: Date; endsAt: Date; status: 'open' | 'active' } {
  const startsAt = getNextPitStart(slug, from);
  const hours = getContestDurationHours(slug);
  const endsAt = new Date(startsAt.getTime() + hours * 60 * 60 * 1000);
  const status = startsAt.getTime() <= from.getTime() ? 'active' : 'open';
  return { startsAt, endsAt, status };
}

/** Demo: mix of live pits + near-future scheduled for testing. */
export function buildDemoPitWindow(
  slug: string,
  catalogIndex: number,
  from = new Date()
): { startsAt: Date; endsAt: Date; status: 'open' | 'active' } {
  const hours = getContestDurationHours(slug);

  if (slug === OPENING_BELL_SLUG || catalogIndex < 2) {
    const startsAt = from;
    return {
      startsAt,
      endsAt: new Date(startsAt.getTime() + hours * 60 * 60 * 1000),
      status: 'active',
    };
  }

  if (catalogIndex < 4) {
    const startsAt = new Date(from.getTime() + (catalogIndex - 1) * 45 * 60 * 1000);
    return {
      startsAt,
      endsAt: new Date(startsAt.getTime() + hours * 60 * 60 * 1000),
      status: startsAt.getTime() <= from.getTime() ? 'active' : 'open',
    };
  }

  return buildPitWindow(slug, from);
}

export function formatOpensAtLabel(startsAt: string | null | undefined, now = Date.now()): string | null {
  if (!startsAt) return null;
  const ms = new Date(startsAt).getTime() - now;
  if (ms <= 0) return null;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `Opens in ${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `Opens in ${hours}h ${mins}m`;
  if (mins > 0) return `Opens in ${mins}m`;
  return 'Opens soon';
}