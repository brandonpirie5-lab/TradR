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
    <div className="empty-battles text-center py-10 px-5 border border-dashed border-accent/25 rounded-2xl bg-surface/40 mb-4">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center">
        <Trophy size={26} className="text-accent" />
      </div>
      <div className="font-bold text-lg mb-1">No active battles</div>
      <p className="text-sm text-muted mb-5 leading-relaxed max-w-[280px] mx-auto">
        The tape is empty until you send a ticket. Jump in free or scout what&apos;s open.
      </p>
      {freePit && (
        <button onClick={onJoinFree} className="btn btn-primary w-full py-3.5 text-sm mb-2 flex items-center justify-center gap-2">
          <Zap size={16} />
          RING IN — {freePit.title}
        </button>
      )}
      <button onClick={onBrowseUpcoming} className="w-full py-2.5 text-sm text-accent border border-card rounded-xl">
        Browse upcoming arenas →
      </button>
    </div>
  );
}