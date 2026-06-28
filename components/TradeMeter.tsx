'use client';

import React from 'react';
import type { TradeLimitInfo } from '../lib/trade-limits';

export default function TradeMeter({ info, compact = false }: { info: TradeLimitInfo; compact?: boolean }) {
  if (info.unlimited) {
    return (
      <span className={`px-2 py-1 rounded-lg bg-surface border border-card font-mono ${compact ? 'text-[10px]' : 'text-xs'}`}>
        ∞ trades
      </span>
    );
  }

  const pct = info.max ? Math.min(100, Math.round((info.used / info.max) * 100)) : 0;
  const low = info.remaining != null && info.remaining <= 3;
  const empty = info.remaining === 0;

  return (
    <div className={`trade-meter ${compact ? 'text-[10px]' : 'text-xs'}`}>
      <div className="flex justify-between items-center mb-1 gap-2">
        <span className={`font-mono ${empty ? 'text-red-400' : low ? 'text-accent' : 'text-muted'}`}>
          {info.used}/{info.max} trades
        </span>
        <span className={`text-[10px] ${empty ? 'text-red-400 font-bold' : 'text-muted'}`}>
          {empty ? 'LIMIT HIT' : `${info.remaining} left`}
        </span>
      </div>
      <div className="progress h-1">
        <div
          className={`progress-fill transition-all ${empty ? 'bg-red-500' : low ? 'bg-accent' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}