import { DAILY_PIT_SLUG } from './daily-pit-config';
import {
  formatDailyPitScheduleLabel,
  getCurrentDailyPitWindow,
  getNextDailyPitWindow,
  isDailyPitSlug,
  msUntilDailyPitOpen,
} from './daily-pit-schedule';
import { getContestDurationHours } from './contest-rules';

const ET = 'America/New_York';

/** @deprecated Single pit — no stagger */
export const DAILY_STAGGER_HOURS: Record<string, number> = {};

export function getCanonicalPitOpenLabel(slug: string | undefined | null): string {
  if (isDailyPitSlug(slug)) return '9:30 AM ET';
  return '9:30 AM ET';
}

export function getPitOpenSort(_slug: string | undefined | null): number {
  return 0;
}

export function formatPitStartTime(
  contest: { slug?: string | null; startsAt?: string | null },
  scheduled: boolean,
  hydrated: boolean
): string {
  if (!scheduled) return 'Live';

  if (contest.startsAt && hydrated) {
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

  return getCanonicalPitOpenLabel(contest.slug);
}

export function getNextPitStart(slug: string, from = new Date()): Date {
  if (isDailyPitSlug(slug)) {
    return getCurrentDailyPitWindow(from).startsAt;
  }
  return getNextDailyPitWindow(from).startsAt;
}

export function buildPitWindow(
  slug: string,
  from = new Date()
): { startsAt: Date; endsAt: Date; status: 'open' | 'active' } {
  if (isDailyPitSlug(slug)) {
    const w = getCurrentDailyPitWindow(from);
    return { startsAt: w.startsAt, endsAt: w.endsAt, status: w.status };
  }
  const hours = getContestDurationHours(slug);
  const startsAt = from;
  return {
    startsAt,
    endsAt: new Date(startsAt.getTime() + hours * 60 * 60 * 1000),
    status: 'active',
  };
}

export function buildDemoPitWindow(
  slug: string,
  _catalogIndex: number,
  from = new Date()
): { startsAt: Date; endsAt: Date; status: 'open' | 'active' } {
  return buildPitWindow(slug, from);
}

export function formatOpensAtLabel(startsAt: string | null | undefined, now = Date.now()): string | null {
  if (!startsAt) {
    const ms = msUntilDailyPitOpen(new Date(now));
    if (ms <= 0) return null;
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `Opens in ${hours}h ${mins}m`;
    if (mins > 0) return `Opens in ${mins}m`;
    return 'Opens soon';
  }
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

export { formatDailyPitScheduleLabel };