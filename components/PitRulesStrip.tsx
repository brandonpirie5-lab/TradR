'use client';

import React from 'react';
import { Contest } from '../lib/game-types';
import { bellMsRemaining, isContestBellOpen } from '../lib/contest-bell';
import { useHydrated } from '../lib/use-hydrated';
import { BellCountdown } from './BellCountdown';

export default function PitRulesStrip({
  contest,
  bellTick,
}: {
  contest: Contest;
  bellTick?: number;
}) {
  const hydrated = useHydrated();
  void bellTick;

  const ms = hydrated ? bellMsRemaining(contest) : null;
  const open = hydrated ? isContestBellOpen(contest) : contest.status !== 'closed';

  return (
    <div className="pit-rules-strip flex flex-wrap gap-2 text-[10px] mb-3">
      <span className="px-2 py-1 rounded-lg bg-surface border border-card font-mono">
        $100k start
      </span>
      <span className="px-2 py-1 rounded-lg bg-surface border border-card">
        {contest.entryFee === 0 ? 'FREE' : `$${contest.entryFee}`} entry
      </span>
      <span className="px-2 py-1 rounded-lg bg-surface border border-card font-mono">
        {contest.assets.length} assets
      </span>
      <span
        className={`px-2 py-1 rounded-lg border font-mono font-bold ${
          !open ? 'border-red-500/50 text-red-400' : ms != null && ms < 300000 ? 'border-accent/50 text-accent' : 'border-card text-muted'
        }`}
      >
        <BellCountdown contest={contest} tick={bellTick} />
      </span>
    </div>
  );
}