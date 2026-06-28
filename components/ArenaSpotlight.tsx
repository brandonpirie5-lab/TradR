'use client';

import React from 'react';
import { Clock, Info } from 'lucide-react';
import { Contest } from '../lib/game-types';
import { BellCountdown } from './BellCountdown';
import AssetChip from './AssetChip';
import PitFillBadge from './PitFillBadge';

type ArenaSpotlightProps = {
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
  scheduled?: boolean;
  onInfo: () => void;
  onPrimary: () => void;
};

export default function ArenaSpotlight({
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
  scheduled = false,
  onInfo,
  onPrimary,
}: ArenaSpotlightProps) {
  const primaryLabel = scheduled
    ? contest.entryFee === 0
      ? 'Ring in free'
      : `Ring in · $${contest.entryFee}`
    : !isJoined
      ? contest.entryFee === 0
        ? 'Enter free'
        : `Enter · $${contest.entryFee}`
      : isTradingOpen
        ? 'Trade now'
        : 'Rang in';

  return (
    <section className="arena-spotlight mb-5" data-tour="arena-hero">
      <div className="arena-spotlight-glow" aria-hidden />

      <div className="relative z-[1]">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            {scheduled ? (
              <span className="arena-scheduled-pill">Opens soon</span>
            ) : (
              <span className="arena-live-pill">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A] live-dot" />
                Live
              </span>
            )}
            {contest.badge && (
              <span className="text-[9px] px-1.5 py-0.5 bg-pill rounded font-bold text-accent tracking-wide truncate">
                {contest.badge}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 text-[10px] text-muted font-mono">
              <Clock size={11} />
              {hydrated ? (
                scheduled ? (
                  <span>Scheduled</span>
                ) : isBellOpen ? (
                  <BellCountdown contest={contest} tick={bellTick} prefix="" placeholder="—" openText="Open" />
                ) : (
                  <span className="text-red-400/90">Closed</span>
                )
              ) : (
                '—'
              )}
            </div>
            <button
              type="button"
              data-tour="contest-info"
              onClick={onInfo}
              className="w-7 h-7 rounded-full border border-card/80 bg-black/30 flex items-center justify-center text-muted hover:text-accent"
              aria-label="Contest info"
            >
              <Info size={13} />
            </button>
          </div>
        </div>

        <h2 className="text-[19px] font-bold tracking-[-0.4px] leading-snug text-white mb-3">
          {contest.title}
        </h2>

        <div className="arena-spotlight-stats mb-3">
          <div>
            <div className="font-mono text-xl font-semibold text-accent tabular-nums">${contest.firstPrize}</div>
            <div className="text-[9px] text-muted uppercase tracking-wider mt-0.5">1st prize</div>
          </div>
          <div className="arena-spotlight-stat-divider" />
          <div>
            <div className="font-mono text-sm text-[var(--text)] tabular-nums">
              {contest.entryFee === 0 ? 'Free' : `$${contest.entryFee}`}
            </div>
            <div className="text-[9px] text-muted uppercase tracking-wider mt-0.5">Entry</div>
          </div>
          <div className="arena-spotlight-stat-divider" />
          <div>
            <div className="font-mono text-sm text-[var(--text)] tabular-nums">{participantCount}</div>
            <div className="text-[9px] text-muted uppercase tracking-wider mt-0.5">Traders</div>
          </div>
        </div>

        <PitFillBadge contest={contest} participantCount={participantCount} />

        <div className="arena-asset-scroll mb-3 -mx-1 px-1">
          {contest.assets.slice(0, 8).map((asset) => (
            <AssetChip key={asset} symbol={asset} size="sm" />
          ))}
        </div>

        {isJoined && liveValue != null && (
          <div className="arena-spotlight-position mb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {rank && <span className="font-mono text-xs text-accent">#{rank}</span>}
                <span className="font-mono text-base text-white tabular-nums">${liveValue.toLocaleString()}</span>
              </div>
              {pnlPct != null && (
                <span className={`font-mono text-xs shrink-0 ${pnlPct >= 0 ? 'text-accent' : 'text-red'}`}>
                  {pnlPct >= 0 ? '+' : ''}
                  {pnlPct.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        )}

        <button type="button" onClick={onPrimary} className="btn btn-primary w-full py-3 text-[13px] tracking-wide">
          {primaryLabel}
        </button>
      </div>
    </section>
  );
}