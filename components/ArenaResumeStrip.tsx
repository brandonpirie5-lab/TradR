'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Contest } from '../lib/game-types';

type ArenaResumeStripProps = {
  contest: Contest;
  rank: number;
  portfolioValue: number;
  onResume: () => void;
};

export default function ArenaResumeStrip({
  contest,
  rank,
  portfolioValue,
  onResume,
}: ArenaResumeStripProps) {
  return (
    <button
      type="button"
      onClick={onResume}
      className="arena-resume-strip w-full text-left mb-4"
      data-tour="arena-resume"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="arena-live-pill">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A] live-dot" />
              Your pit
            </span>
            <span className="text-[10px] font-mono text-accent">#{rank}</span>
          </div>
          <div className="font-semibold text-[14px] truncate">{contest.title}</div>
          <div className="font-mono text-sm text-accent tabular-nums mt-0.5">
            ${portfolioValue.toLocaleString()}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-1 text-xs font-semibold text-accent">
          Trade
          <ChevronRight size={14} />
        </div>
      </div>
    </button>
  );
}