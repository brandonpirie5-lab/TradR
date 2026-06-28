'use client';

import React from 'react';
import { formatBellCountdown, bellMsRemaining, startsMsRemaining, isContestBellOpen } from '../lib/contest-bell';
import { Contest } from '../lib/game-types';
import { useHydrated } from '../lib/use-hydrated';

type ArenaCountdownRingProps = {
  contest: Contest;
  scheduled: boolean;
  tick: number;
  urgent?: boolean;
  size?: 'md' | 'lg';
  variant?: 'pit' | 'af';
};

function ringTotalMs(contest: Contest): number {
  if (!contest.endsAt) return 4 * 60 * 60 * 1000;
  const end = new Date(contest.endsAt).getTime();
  const start = contest.startsAt ? new Date(contest.startsAt).getTime() : end - 4 * 60 * 60 * 1000;
  return Math.max(60_000, end - start);
}

export default function ArenaCountdownRing({
  contest,
  scheduled,
  tick,
  urgent,
  size = 'md',
  variant = 'pit',
}: ArenaCountdownRingProps) {
  void tick;
  const hydrated = useHydrated();
  const large = size === 'lg';
  const r = large ? 44 : 36;
  const dim = large ? 108 : 88;
  const cx = dim / 2;
  const c = 2 * Math.PI * r;
  const rootClass = variant === 'af' ? 'af-ring' : `pit-ring ${large ? 'pit-ring-lg' : ''}`;

  let center = '—';
  let progress = 0.72;
  let trackClass = variant === 'af' ? 'af-ring-track' : 'pit-ring-track';

  if (hydrated) {
    if (scheduled) {
      const opensIn = startsMsRemaining(contest);
      center = opensIn != null ? formatBellCountdown(opensIn) : 'SOON';
      progress = opensIn != null ? Math.max(0.08, 1 - opensIn / ringTotalMs(contest)) : 0.3;
      trackClass += variant === 'af' ? ' af-ring-scheduled' : ' pit-ring-scheduled';
    } else if (!isContestBellOpen(contest)) {
      center = 'DONE';
      progress = 0;
      trackClass += variant === 'af' ? ' af-ring-closed' : ' pit-ring-closed';
    } else {
      const ms = bellMsRemaining(contest);
      if (ms == null) {
        center = 'OPEN';
        progress = 0.85;
      } else {
        const total = ringTotalMs(contest);
        progress = Math.max(0.05, ms / total);
        center = formatBellCountdown(ms);
        if (urgent) trackClass += variant === 'af' ? ' af-ring-urgent' : ' pit-ring-urgent';
        else trackClass += variant === 'af' ? ' af-ring-live' : ' pit-ring-live';
      }
    }
  }

  const dash = c * progress;
  const bgClass = variant === 'af' ? 'af-ring-bg' : 'pit-ring-bg';

  return (
    <div className={rootClass} aria-hidden={!hydrated}>
      <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} className={variant === 'af' ? 'af-ring-svg' : 'pit-ring-svg'}>
        <circle cx={cx} cy={cx} r={r} className={bgClass} />
        <circle
          cx={cx}
          cy={cx}
          r={r}
          className={trackClass}
          strokeDasharray={`${dash} ${c}`}
          strokeDashoffset={c * 0.25}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
      </svg>
      <div className={variant === 'af' ? 'af-ring-center' : 'pit-ring-center'}>
        <span className={variant === 'af' ? 'af-ring-time' : 'pit-ring-time'}>{center}</span>
        <span className={variant === 'af' ? 'af-ring-label' : 'pit-ring-label'}>
          {scheduled ? 'opens' : 'remaining'}
        </span>
      </div>
    </div>
  );
}