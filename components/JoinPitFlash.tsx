'use client';

import React, { useEffect } from 'react';
import { Zap } from 'lucide-react';
import { formatDailyPitScheduleLabel } from '../lib/daily-pit-schedule';

export default function JoinPitFlash({
  title,
  onDone,
}: {
  title: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 1400);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center pointer-events-none join-pit-flash">
      <div className="join-pit-flash-card text-center px-8 py-6 rounded-3xl border border-accent/50 bg-card/95">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-accent flex items-center justify-center join-pit-flash-icon">
          <Zap size={24} className="text-black" />
        </div>
        <div className="text-[10px] tracking-[4px] text-muted uppercase mb-1">You&apos;re on the tape</div>
        <div className="font-black text-xl tracking-tight text-accent">{title}</div>
        <div className="text-xs text-muted mt-2">$100,000 loaded — send it</div>
        <div className="text-[10px] text-muted/80 mt-3">{formatDailyPitScheduleLabel()}</div>
      </div>
    </div>
  );
}