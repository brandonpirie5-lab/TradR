'use client';

import React from 'react';
import { Zap, Trophy } from 'lucide-react';
import { Contest } from '../lib/game-types';

export default function EmptyActiveBattles({
  freePit,
  onJoinFree,
  onBrowseUpcoming,
}: {
  freePit?: Contest;
  onJoinFree: () => void;
  onBrowseUpcoming: () => void;
}) {
  return (
    <div className="bt-upcoming-empty mb-1">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center">
        <Trophy size={26} className="text-accent" />
      </div>
      <p className="bt-upcoming-empty-title">No active battles</p>
      <p className="bt-upcoming-empty-copy">
        The tape is empty until you send a ticket. Jump in free or scout pits in Arena.
      </p>
      {freePit && (
        <button
          onClick={onJoinFree}
          className="btn btn-primary w-full py-3.5 text-sm mt-5 mb-2 flex items-center justify-center gap-2"
        >
          <Zap size={16} />
          RING IN — {freePit.title}
        </button>
      )}
      <button
        onClick={onBrowseUpcoming}
        className={`bt-arena-link ${freePit ? '' : 'bt-arena-link-spaced'}`}
      >
        <span>Browse pits in Arena</span>
        <span className="bt-arena-link-arrow" aria-hidden>→</span>
      </button>
    </div>
  );
}