import { Contest } from './game-types';
import { isContestTradingOpen, isJoinAllowed } from './contest-bell';
import { OPENING_BELL_SLUG } from './pit-contests';

/** Next open arena the user hasn't joined — prefer free pit, then same slug family. */
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
      isContestTradingOpen(c)
  );

  if (!candidates.length) return null;

  if (closed?.slug) {
    const sameSlug = candidates.find((c) => c.slug === closed.slug);
    if (sameSlug) return sameSlug;
  }

  const free = candidates.find((c) => c.slug === OPENING_BELL_SLUG || c.entryFee === 0);
  if (free) return free;

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
      !isContestTradingOpen(c)
  );
  if (!scheduled.length) return null;

  if (closed?.slug) {
    const same = scheduled.find((c) => c.slug === closed.slug);
    if (same) return same;
  }

  const free = scheduled.find((c) => c.slug === OPENING_BELL_SLUG || c.entryFee === 0);
  return free ?? scheduled.sort((a, b) => {
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
  const url = params.appUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://tradr-green.vercel.app');

  if (params.voided) {
    const refundLine = params.refund ? ` +$${params.refund} refunded` : '';
    return `TradR Pit — ${params.contestTitle} didn't fill${refundLine}. Ring in free: ${url}`;
  }

  const rank = params.rank ?? '—';
  let perf = '';
  if (params.portfolioValue != null && params.startingValue != null && params.startingValue > 0) {
    const pnl = params.portfolioValue - params.startingValue;
    const pct = ((pnl / params.startingValue) * 100).toFixed(1);
    const sign = pnl >= 0 ? '+' : '';
    perf = ` · $${params.portfolioValue.toLocaleString()} (${sign}${pct}%)`;
  }

  const prize = params.payout && params.payout > 0 ? ` · +$${params.payout} won` : '';
  return `TradR Pit — #${rank} in ${params.contestTitle}${perf}${prize}\nRing in free today: ${url}`;
}