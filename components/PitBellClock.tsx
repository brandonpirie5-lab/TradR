'use client';

import React from 'react';
import {
  formatBellCountdown,
  bellMsRemaining,
  startsMsRemaining,
  isContestBellOpen,
} from '../lib/contest-bell';
import { Contest } from '../lib/game-types';
import { useHydrated } from '../lib/use-hydrated';
import { msUntilDailyPitOpen } from '../lib/daily-pit-schedule';

type PitBellClockProps = {
  contest: Contest;
  scheduled: boolean;
  phase: 'pre_open' | 'live' | 'between';
  tick: number;
  urgent?: boolean;
};

function sessionTotalMs(contest: Contest): number {
  if (!contest.endsAt) return 6.5 * 60 * 60 * 1000;
  const end = new Date(contest.endsAt).getTime();
  const start = contest.startsAt ? new Date(contest.startsAt).getTime() : end - 6.5 * 60 * 60 * 1000;
  return Math.max(60_000, end - start);
}

export default function PitBellClock({ contest, scheduled, phase, tick, urgent }: PitBellClockProps) {
  void tick;
  const hydrated = useHydrated();
  const isBetween = phase === 'between';

  let label = 'Bell';
  let time = '—';
  let progress = 0.35;
  let tone: 'live' | 'open' | 'closed' = 'open';

  if (hydrated) {
    if (isBetween) {
      label = 'Next pit opens';
      const ms = msUntilDailyPitOpen();
      time = ms > 0 ? formatBellCountdown(ms) : 'SOON';
      progress = ms > 0 ? Math.max(0.06, 1 - ms / (14 * 60 * 60 * 1000)) : 0.2;
      tone = 'closed';
    } else if (scheduled) {
      label = 'Opens in';
      const opensIn = startsMsRemaining(contest);
      time = opensIn != null ? formatBellCountdown(opensIn) : 'SOON';
      const total = sessionTotalMs(contest);
      progress = opensIn != null ? Math.max(0.06, 1 - opensIn / total) : 0.25;
      tone = 'open';
    } else if (!isContestBellOpen(contest)) {
      label = 'Session';
      time = 'CLOSED';
      progress = 1;
      tone = 'closed';
    } else {
      label = 'Closes in';
      const ms = bellMsRemaining(contest);
      const total = sessionTotalMs(contest);
      if (ms == null) {
        time = 'OPEN';
        progress = 0.5;
      } else {
        time = formatBellCountdown(ms);
        progress = Math.max(0.04, ms / total);
      }
      tone = urgent ? 'live' : 'open';
    }
  }

  return (
    <div className={`pit-bell-clock pit-bell-clock-${tone}`} role="timer" aria-live="polite">
      <div className="pit-bell-clock-row">
        <span className="pit-bell-clock-label">{label}</span>
        <span className="pit-bell-clock-time">{time}</span>
      </div>
      <div className="pit-bell-clock-track" aria-hidden>
        <div className="pit-bell-clock-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
    </div>
  );
}