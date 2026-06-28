'use client';

import React from 'react';
import { CalendarClock } from 'lucide-react';
import { Contest } from '../lib/game-types';
import { formatOpensAtLabel } from '../lib/pit-schedule';
import { useHydrated } from '../lib/use-hydrated';

export default function ScheduledPitChip({ contest, tick = 0 }: { contest: Contest; tick?: number }) {
  void tick;
  const hydrated = useHydrated();
  const label = hydrated ? formatOpensAtLabel(contest.startsAt) : null;

  if (!label) return null;

  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg border border-accent/30 bg-accent/5 text-accent font-mono">
      <CalendarClock size={10} />
      {label}
    </span>
  );
}