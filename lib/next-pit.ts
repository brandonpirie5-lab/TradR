import { Contest } from './game-types';
import { isContestTradingOpen, isJoinAllowed } from './contest-bell';
import { DAILY_PIT_SLUG } from './daily-pit-config';

/** Next open daily pit the user hasn't joined. */
export function findNextOpenPit(
  contests: Contest[],
  joinedIds: number[],
  closedContestId?: number
): Contest | null {
  const closed = closedContestId
    ? contests.find((c) => c.id === closedContestId)
    : undefined;

  const candidates = contests.filter(
    (c) =>
      (c.status === 'open' || c.status === 'active') &&
      !joinedIds.includes(c.id) &&
      isJoinAllowed(c) &&
      isContestTradingOpen(c) &&
      c.entryFee > 0
  );

  if (!candidates.length) return null;

  const daily = candidates.find((c) => c.slug === DAILY_PIT_SLUG);
  if (daily) return daily;

  if (closed?.slug) {
    const sameSlug = candidates.find((c) => c.slug === closed.slug);
    if (sameSlug) return sameSlug;
  }

  return candidates.sort((a, b) => a.entryFee - b.entryFee)[0];
}

/** Next pit to join — live first, then scheduled (ring in early). */
export function findNextJoinablePit(
  contests: Contest[],
  joinedIds: number[],
  closedContestId?: number
): Contest | null {
  const live = findNextOpenPit(contests, joinedIds, closedContestId);
  if (live) return live;

  const closed = closedContestId ? contests.find((c) => c.id === closedContestId) : undefined;
  const scheduled = contests.filter(
    (c) =>
      (c.status === 'open' || c.status === 'active') &&
      !joinedIds.includes(c.id) &&
      isJoinAllowed(c) &&
      !isContestTradingOpen(c) &&
      c.entryFee > 0
  );
  if (!scheduled.length) return null;

  const daily = scheduled.find((c) => c.slug === DAILY_PIT_SLUG);
  if (daily) return daily;

  if (closed?.slug) {
    const same = scheduled.find((c) => c.slug === closed.slug);
    if (same) return same;
  }

  return scheduled.sort((a, b) => {
    const aStart = a.startsAt ? new Date(a.startsAt).getTime() : 0;
    const bStart = b.startsAt ? new Date(b.startsAt).getTime() : 0;
    return aStart - bStart;
  })[0];
}

export function buildPitShareText(params: {
  contestTitle: string;
  rank?: number;
  payout?: number;
  voided?: boolean;
  refund?: number;
  portfolioValue?: number;
  startingValue?: number;
  appUrl?: string;
}): string {
  const url =
    params.appUrl ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://tradr-green.vercel.app');

  if (params.voided) {
    const refundLine = params.refund ? ` +$${params.refund} refunded` : '';
    return `TradR Pit — ${params.contestTitle} didn't fill${refundLine}. Join the next $5 pit: ${url}`;
  }

  const rank = params.rank ?? '—';
  let perf = '';
  if (params.portfolioValue != null && params.startingValue != null && params.startingValue > 0) {
    const pnl = params.portfolioValue - params.startingValue;
    const pct = ((pnl / params.startingValue) * 100).toFixed(1);
    const sign = pnl >= 0 ? '+' : '';
    perf = ` · $${params.portfolioValue.toLocaleString()} (${sign}${pct}%)`;
  }

  const prize = params.payout && params.payout > 0 ? ` · WON $${params.payout}` : '';
  const emoji = params.payout && params.payout > 0 ? '🏆 ' : params.rank === 1 ? '🥇 ' : '';
  return `${emoji}TradR Pit — #${rank} today${perf}${prize}\nOne pit. $5 in. Top half cash.\n${url}`;
}