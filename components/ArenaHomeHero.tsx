'use client';

import React from 'react';
import { Clock, Info } from 'lucide-react';
import { Contest } from '../lib/game-types';
import { BellCountdown } from './BellCountdown';
import AssetChip from './AssetChip';

type ArenaHomeHeroProps = {
  contest: Contest;
  isJoined: boolean;
  rank?: number | null;
  liveValue?: number;
  pnlPct?: number;
  participantCount: number;
  bellTick: number;
  hydrated: boolean;
  isBellOpen: boolean;
  isTradingOpen: boolean;
  onInfo: () => void;
  onPrimary: () => void;
};

export default function ArenaHomeHero({
  contest,
  isJoined,
  rank,
  liveValue,
  pnlPct,
  participantCount,
  bellTick,
  hydrated,
  isBellOpen,
  isTradingOpen,
  onInfo,
  onPrimary,
}: ArenaHomeHeroProps) {
  void bellTick;

  const primaryLabel = !isJoined
    ? contest.entryFee === 0
      ? 'Ring in free'
      : `Enter · $${contest.entryFee}`
    : isTradingOpen
      ? 'Open ticket'
      : 'Rang in — opens soon';

  return (
    <section className="arena-hero-compact mb-6" data-tour="arena-hero">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="arena-live-pill">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A] live-dot" />
              Live
            </span>
            {contest.badge && (
              <span className="text-[9px] px-1.5 py-0.5 bg-pill rounded font-bold text-accent tracking-wide">
                {contest.badge}
              </span>
            )}
            {isJoined && rank && (
              <span className="text-[10px] font-mono text-accent ml-auto">#{rank}</span>
            )}
          </div>
          <h1 className="text-[22px] font-bold tracking-[-0.5px] leading-tight text-white truncate">
            {contest.title}
          </h1>
          {contest.tagline && (
            <p className="text-[12px] text-secondary mt-0.5 line-clamp-2 leading-snug">{contest.tagline}</p>
          )}
        </div>
        <button
          type="button"
          data-tour="contest-info"
          onClick={onInfo}
          className="w-8 h-8 shrink-0 rounded-full border border-card bg-surface flex items-center justify-center text-muted hover:text-accent"
          aria-label="Contest info"
        >
          <Info size={14} />
        </button>
      </div>

      <div className="flex items-baseline justify-between gap-4 mb-3">
        <div>
          <div className="font-mono text-3xl font-semibold tracking-tight text-accent tabular-nums">
            ${contest.firstPrize}
          </div>
          <div className="text-[10px] text-muted tracking-wide">1st prize · ${contest.totalPrizes} pool</div>
        </div>
        <div className="text-right text-[11px] text-muted space-y-0.5">
          <div className="font-mono text-sm text-[var(--text)]">{participantCount} traders</div>
          <div className="flex items-center justify-end gap-1">
            <Clock size={11} />
            {hydrated ? (
              isBellOpen ? (
                <BellCountdown contest={contest} tick={bellTick} prefix="" placeholder="—" openText="Open" />
              ) : (
                <span className="text-red-400/90">Bell rung</span>
              )
            ) : (
              '—'
            )}
          </div>
        </div>
      </div>

      {isJoined && liveValue != null && (
        <div className="arena-hero-position mb-3 flex items-center justify-between rounded-xl border border-card bg-surface px-3 py-2.5">
          <div>
            <div className="text-[9px] uppercase tracking-widest text-muted">Your tape</div>
            <div className="font-mono text-lg text-accent tabular-nums">${liveValue.toLocaleString()}</div>
          </div>
          {pnlPct != null && (
            <div className={`font-mono text-sm ${pnlPct >= 0 ? 'text-accent' : 'text-red'}`}>
              {pnlPct >= 0 ? '+' : ''}
              {pnlPct.toFixed(1)}%
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1 mb-3">
        {contest.assets.slice(0, 5).map((asset) => (
          <AssetChip key={asset} symbol={asset} size="sm" />
        ))}
      </div>

      <button type="button" onClick={onPrimary} className="btn btn-primary w-full py-3.5 text-sm tracking-wide">
        {primaryLabel}
      </button>
    </section>
  );
}