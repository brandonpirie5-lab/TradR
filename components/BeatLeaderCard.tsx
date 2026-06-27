'use client';

import React from 'react';
import { Target } from 'lucide-react';
import type { LeaderboardEntry } from '../lib/game-types';

export default function BeatLeaderCard({
  entries,
  yourValue,
}: {
  entries: LeaderboardEntry[];
  yourValue: number;
}) {
  if (!entries.length) return null;

  const leader = entries[0];
  const you = entries.find((e) => e.isYou);
  if (!you) return null;

  if (you.rank === 1) {
    return (
      <div className="beat-leader-card mb-3 p-3 rounded-xl border border-accent/40 bg-user-card flex items-center gap-3">
        <Target size={18} className="text-accent shrink-0" />
        <div>
          <div className="text-[10px] tracking-widest text-accent font-bold">TOP OF THE TAPE</div>
          <div className="text-sm font-mono text-accent">${yourValue.toLocaleString()}</div>
        </div>
      </div>
    );
  }

  const gap = leader.portfolioValue - yourValue;
  const behind = you.rank - 1;

  return (
    <div className="beat-leader-card mb-3 p-3 rounded-xl border border-card bg-surface flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <Target size={16} className="text-accent shrink-0" />
        <div className="min-w-0">
          <div className="text-[10px] text-muted tracking-wide">GAP TO #{leader.rank}</div>
          <div className="text-sm font-semibold truncate">{leader.username}</div>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono text-accent font-bold">+${gap.toLocaleString()}</div>
        <div className="text-[10px] text-muted">{behind} traders blocking you</div>
      </div>
    </div>
  );
}