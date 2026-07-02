'use client';

import React from 'react';
import { Flame } from 'lucide-react';
import { getDailyStreak, streakLabel } from '../lib/daily-streak';

export default function DailyStreakBadge({ className = '' }: { className?: string }) {
  const streak = getDailyStreak();
  if (streak.count < 1) return null;

  return (
    <div className={`dp-streak-badge ${className}`.trim()} title="Consecutive days on the daily pit">
      <Flame size={14} className="text-orange-400 shrink-0" aria-hidden />
      <span>{streakLabel(streak.count)}</span>
    </div>
  );
}