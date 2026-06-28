'use client';

import React from 'react';
import { DollarSign, TrendingUp, AlertCircle, Crown } from 'lucide-react';
import { LeaderboardEntry } from '../lib/game-types';
import { analyzeMoneyZone } from '../lib/money-zone';

export default function MoneyZoneBar({
  entries,
  yourValue,
  firstPrize,
  compact = false,
  hero = false,
}: {
  entries: LeaderboardEntry[];
  yourValue: number;
  firstPrize: number;
  compact?: boolean;
  /** Full-width emphasis — primary widget on battle card / trade ticket */
  hero?: boolean;
}) {
  const insight = analyzeMoneyZone(entries, yourValue, firstPrize, true);

  const icon =
    insight.status === 'in-the-money' || insight.status === 'solo' ? (
      <Crown size={compact ? 14 : 16} className="text-accent" />
    ) : insight.status === 'bubble' ? (
      <AlertCircle size={compact ? 14 : 16} className="text-yellow-400" />
    ) : (
      <TrendingUp size={compact ? 14 : 16} className="text-muted" />
    );

  const barColor =
    insight.status === 'in-the-money' || insight.status === 'solo'
      ? 'bg-accent'
      : insight.status === 'bubble'
        ? 'bg-yellow-500'
        : 'bg-muted';

  const borderClass =
    insight.status === 'in-the-money' || insight.status === 'solo'
      ? 'border-accent/40 bg-accent/5'
      : insight.status === 'bubble'
        ? 'border-yellow-500/30 bg-yellow-500/5'
        : 'border-card bg-surface';

  const showCutoff =
    insight.cutoffValue != null && insight.status !== 'in-the-money' && insight.status !== 'solo';

  return (
    <div
      className={`money-zone-bar rounded-xl border p-3 mb-3 ${borderClass} ${hero ? 'money-zone-bar--hero' : ''} ${compact && !hero ? 'money-zone-bar--compact p-2.5' : ''}`}
    >
      {hero && (
        <div className="money-zone-kicker text-[9px] font-bold tracking-[0.14em] uppercase text-muted mb-2">
          Money zone
        </div>
      )}
      <div className="flex items-start gap-2 mb-2">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="money-zone-headline-row flex items-center gap-2">
            <span
              className={`font-bold tracking-wide truncate ${hero ? 'text-sm' : 'text-xs'} ${insight.status === 'in-the-money' || insight.status === 'solo' ? 'text-accent' : insight.status === 'bubble' ? 'text-yellow-300' : ''}`}
            >
              {insight.headline}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-mono flex items-center gap-1 shrink-0 ${insight.projectedPayout > 0 ? '' : 'invisible'}`}
              aria-hidden={insight.projectedPayout <= 0}
            >
              <DollarSign size={10} />
              ${insight.projectedPayout > 0 ? insight.projectedPayout : 0}
            </span>
          </div>
          <p className={`money-zone-detail text-muted mt-0.5 leading-snug ${hero ? 'text-xs' : compact ? 'text-[10px]' : 'text-[11px]'}`}>
            {insight.detail}
          </p>
        </div>
      </div>
      <div className={`money-zone-progress bg-black/40 rounded-full overflow-hidden ${hero ? 'h-2' : 'h-1.5'}`}>
        <div
          className={`h-full rounded-full ${compact ? '' : 'transition-all duration-500'} ${barColor}`}
          style={{ width: `${insight.progressPct}%` }}
        />
      </div>
      {insight.paidRanks > 0 && (
        <div className="money-zone-footer flex justify-between text-[9px] text-muted mt-1 font-mono">
          <span>Cash zone: top {insight.paidRanks}</span>
          <span className={showCutoff ? '' : 'invisible'} aria-hidden={!showCutoff}>
            #{insight.paidRanks} at ${insight.cutoffValue?.toLocaleString() ?? '—'}
          </span>
        </div>
      )}
    </div>
  );
}