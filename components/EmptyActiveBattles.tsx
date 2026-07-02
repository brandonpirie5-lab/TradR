'use client';

import React from 'react';
import { Zap, Trophy } from 'lucide-react';
import { Contest } from '../lib/game-types';
import { DAILY_ENTRY_FEE } from '../lib/daily-pit-config';

export default function EmptyActiveBattles({
  dailyPit,
  onJoinPit,
  onBrowseUpcoming,
}: {
  dailyPit?: Contest;
  onJoinPit: () => void;
  onBrowseUpcoming: () => void;
}) {
  return (
    <div className="bt-upcoming-empty mb-1">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center">
        <Trophy size={26} className="text-accent" />
      </div>
      <p className="bt-upcoming-empty-title">No active battles</p>
      <p className="bt-upcoming-empty-copy">
        Ring in on Arena to join today&apos;s ${DAILY_ENTRY_FEE} pit — your ticket shows here when the bell opens.
      </p>
      {dailyPit && (
        <button
          onClick={onJoinPit}
          className="btn btn-primary w-full py-3.5 text-sm mt-5 mb-2 flex items-center justify-center gap-2"
        >
          <Zap size={16} />
          RING IN — ${DAILY_ENTRY_FEE} · {dailyPit.title}
        </button>
      )}
      <button
        onClick={onBrowseUpcoming}
        className={`bt-arena-link ${dailyPit ? '' : 'bt-arena-link-spaced'}`}
      >
        <span>View today&apos;s pit on Arena</span>
        <span className="bt-arena-link-arrow" aria-hidden>→</span>
      </button>
    </div>
  );
}