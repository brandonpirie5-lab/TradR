'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { Contest } from '../lib/game-types';
import { getPitFillStatus } from '../lib/contest-fill';

export default function PitFillBadge({
  contest,
  participantCount,
}: {
  contest: Contest;
  participantCount?: number;
}) {
  const fill = getPitFillStatus(contest, participantCount);

  if (fill.isConfirmed) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-accent/90 mb-2">
        <Users size={11} />
        <span>{fill.label}</span>
      </div>
    );
  }

  const color =
    fill.urgency === 'critical'
      ? 'border-red-500/40 bg-red-950/30 text-red-300'
      : fill.urgency === 'warming'
        ? 'border-accent/40 bg-accent/5 text-accent'
        : 'border-card bg-surface text-muted';

  return (
    <div className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg border mb-2 ${color}`}>
      <Users size={11} className="shrink-0" />
      <span>{fill.label}</span>
    </div>
  );
}