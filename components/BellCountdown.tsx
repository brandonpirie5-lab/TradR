'use client';

import React from 'react';
import { Contest } from '../lib/game-types';
import { bellMsRemaining, formatBellCountdown, isContestBellOpen } from '../lib/contest-bell';
import { useHydrated } from '../lib/use-hydrated';

type ContestClock = Pick<Contest, 'status' | 'endsAt'>;

export function BellCountdown({
  contest,
  tick = 0,
  prefix = 'BELL ',
  placeholder = 'BELL —',
  closedText = 'CLOSED',
  rungText = 'BELL RUNG',
  openText = 'OPEN',
}: {
  contest: ContestClock;
  tick?: number;
  prefix?: string;
  placeholder?: string;
  closedText?: string;
  rungText?: string;
  openText?: string;
}) {
  void tick;
  const hydrated = useHydrated();
  if (!hydrated) return <>{placeholder}</>;

  const open = isContestBellOpen(contest);
  if (!open) return <>{contest.status === 'closed' ? closedText : rungText}</>;

  const ms = bellMsRemaining(contest);
  if (ms == null) return <>{openText}</>;
  return <>{prefix}{formatBellCountdown(ms)}</>;
}

export function TimeLeftLabel({
  endsAt,
  status,
  fallback = '—',
  tick = 0,
}: {
  endsAt: string | null;
  status: string;
  fallback?: string;
  tick?: number;
}) {
  void tick;
  const hydrated = useHydrated();
  if (!hydrated) return <>{fallback}</>;

  if (status === 'closed') return <>ENDED</>;
  if (!endsAt) return <>OPEN</>;
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return <>CLOSING SOON</>;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return <>{hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}</>;
}