'use client';

import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Contest, LeaderboardEntry } from '../lib/game-types';
import { analyzeMoneyZone } from '../lib/money-zone';
import { useCalmLiveStats } from '../lib/use-calm-live-stats';

type BattleActiveStripProps = {
  contest: Contest;
  liveValue: number;
  pnlPct: number;
  rank: number | null;
  board: LeaderboardEntry[];
  expanded: boolean;
  onToggle: () => void;
  onTrade: () => void;
};

export default function BattleActiveStrip({
  contest,
  liveValue,
  pnlPct,
  rank,
  board,
  expanded,
  onToggle,
  onTrade,
}: BattleActiveStripProps) {
  const calm = useCalmLiveStats({ liveValue, pnlPct, rank });
  const zone = analyzeMoneyZone(board, calm.displayValue, contest.slug, true);
  const zoneTone =
    zone.status === 'in-the-money' || zone.status === 'solo'
      ? 'bt-strip-zone-in'
      : zone.status === 'bubble'
        ? 'bt-strip-zone-bubble'
        : '';

  return (
    <div className={`bt-strip-wrap ${expanded ? 'bt-strip-wrap-open' : ''}`}>
      <div className={`bt-strip ${zoneTone} ${expanded ? 'bt-strip-open' : ''}`}>
        <div className="bt-strip-accent" aria-hidden />
        <button type="button" className="bt-strip-main-btn" onClick={onToggle} aria-expanded={expanded}>
          <div className="bt-strip-rank">
            {calm.displayRank != null ? `#${calm.displayRank}` : '—'}
          </div>
          <div className="bt-strip-copy">
            <span className="bt-strip-name">{contest.title}</span>
            <span className="bt-strip-zone-line">{zone.headline}</span>
          </div>
          <div className="bt-strip-stats">
            <span className="bt-strip-value">${calm.displayValue.toLocaleString()}</span>
            <span
              className={`bt-strip-pnl ${calm.displayPnl >= 0 ? 'bt-strip-pnl-up' : 'bt-strip-pnl-down'}`}
            >
              {calm.displayPnl >= 0 ? '+' : ''}
              {calm.displayPnl.toFixed(1)}%
            </span>
          </div>
          <span className="bt-strip-chevron" aria-hidden>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </button>
        {!expanded && (
          <button type="button" className="bt-strip-trade" onClick={onTrade}>
            Trade
          </button>
        )}
      </div>
    </div>
  );
}