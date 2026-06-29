import { Contest } from './game-types';
import { isJoinAllowed, isContestTradingOpen } from './contest-bell';
import { getCanonicalPitOpenLabel } from './pit-schedule';
import {
  buildSlatePitWindow,
  contestMatchesSlug,
  contestOnWeekday,
  findSlateContestInPool,
  getWeekdayPitStart,
} from './week-slate';

export {
  getWeekdayPitStart,
  contestMatchesSlug,
  contestOnWeekday,
  findSlateContestInPool as findContestForWeekPit,
} from './week-slate';

function isContestFull(contest: Pick<Contest, 'entries' | 'maxEntries'>): boolean {
  return contest.entries >= contest.maxEntries;
}

function openContestsForSlug(
  contests: Contest[],
  slug: string,
  joinedIds: number[]
): Contest[] {
  return contests.filter(
    (c) =>
      contestMatchesSlug(c, slug) &&
      (c.status === 'open' || c.status === 'active') &&
      !joinedIds.includes(c.id) &&
      !isContestFull(c)
  );
}

/** Best joinable contest for a week-row slug + weekday. */
export function findJoinableContestForWeekDay(
  contests: Contest[],
  slug: string,
  dayIndex: number,
  joinedIds: number[],
  now = new Date()
): Contest | null {
  const joinable = openContestsForSlug(contests, slug, joinedIds).filter((c) =>
    isJoinAllowed(c)
  );
  if (!joinable.length) return null;

  const exact = joinable.find((c) => contestOnWeekday(c, dayIndex, now));
  if (exact) return exact;

  const targetMs = getWeekdayPitStart(slug, dayIndex, now).getTime();
  return [...joinable].sort((a, b) => {
    const aDay = contestOnWeekday(a, dayIndex, now) ? 0 : 1;
    const bDay = contestOnWeekday(b, dayIndex, now) ? 0 : 1;
    if (aDay !== bDay) return aDay - bDay;
    const aMs = a.startsAt ? new Date(a.startsAt).getTime() : targetMs;
    const bMs = b.startsAt ? new Date(b.startsAt).getTime() : targetMs;
    return Math.abs(aMs - targetMs) - Math.abs(bMs - targetMs);
  })[0];
}

export function hasJoinedWeekDayPit(
  contests: Contest[],
  joinedIds: number[],
  slug: string,
  dayIndex: number,
  now = new Date()
): boolean {
  return contests.some(
    (c) =>
      contestMatchesSlug(c, slug) &&
      joinedIds.includes(c.id) &&
      contestOnWeekday(c, dayIndex, now)
  );
}

export function formatWeekOpensLabel(slug: string, dayIndex: number, now = new Date()): string {
  const start = getWeekdayPitStart(slug, dayIndex, now);
  const day = start.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/New_York' });
  const time = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  });
  if (slug === 'opening-bell') {
    return dayIndex === now.getDay() ? 'Today · free tape' : `${day} · free tape`;
  }
  return `${day} ${time} ET`;
}

export type WeekJoinState = {
  joined: boolean;
  canJoin: boolean;
  label: string;
  opensLabel: string;
  isLive: boolean;
  isFull: boolean;
  contest: Contest | null;
};

export function getWeekJoinState(
  contests: Contest[],
  slug: string,
  dayIndex: number,
  joinedIds: number[],
  now = new Date()
): WeekJoinState {
  const joined = hasJoinedWeekDayPit(contests, joinedIds, slug, dayIndex, now);
  const contest = findSlateContestInPool(contests, slug, dayIndex, now);
  const joinable = findJoinableContestForWeekDay(contests, slug, dayIndex, joinedIds, now);
  const opensLabel = formatWeekOpensLabel(slug, dayIndex, now);
  const isLive = contest ? isContestTradingOpen(contest) : false;
  const isFull = contest ? isContestFull(contest) : false;

  if (joined) {
    return {
      joined: true,
      canJoin: true,
      label: isLive ? 'Trade' : 'Rang in',
      opensLabel,
      isLive,
      isFull,
      contest: contest ?? joinable,
    };
  }

  if (isFull) {
    return {
      joined: false,
      canJoin: false,
      label: 'Full',
      opensLabel,
      isLive,
      isFull: true,
      contest,
    };
  }

  if (joinable) {
    return {
      joined: false,
      canJoin: true,
      label: isContestTradingOpen(joinable) ? 'Join' : 'Ring in',
      opensLabel,
      isLive: isContestTradingOpen(joinable),
      isFull: false,
      contest: joinable,
    };
  }

  const window = buildSlatePitWindow(slug, dayIndex, now);
  const stillUpcoming = window.endsAt.getTime() > now.getTime();

  if (stillUpcoming && !isFull) {
    return {
      joined: false,
      canJoin: true,
      label: 'Ring in',
      opensLabel,
      isLive: false,
      isFull: false,
      contest,
    };
  }

  return {
    joined: false,
    canJoin: false,
    label: 'Ended',
    opensLabel,
    isLive: false,
    isFull,
    contest,
  };
}