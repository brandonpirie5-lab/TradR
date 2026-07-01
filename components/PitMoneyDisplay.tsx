'use client';

import React from 'react';
import {
  computeEffectivePool,
  computeMaxPaidRank,
  payoutForContestRankLive,
  PLATFORM_RAKE_PCT,
} from '../lib/pit-pool-math';
import { getPayoutStructure } from '../lib/pit-payouts';

export function PitPayoutChip({
  slug,
  className = '',
}: {
  slug?: string | null;
  className?: string;
}) {
  const label = getPayoutStructure(slug).label;
  return <span className={`at-money-payout-label ${className}`.trim()}>{label}</span>;
}

export function PitProjectedPayout({
  slug,
  rank,
  entryFee = 5,
  participantCount,
  className = '',
}: {
  slug?: string | null;
  rank: number;
  entryFee?: number;
  participantCount?: number;
  className?: string;
}) {
  const s = getPayoutStructure(slug);
  const count = Math.max(participantCount ?? s.minEntries, s.minEntries);
  const amount = payoutForContestRankLive(rank, slug, { entryFee, participantCount: count });
  if (amount <= 0) {
    return <span className={className}>Outside the money</span>;
  }
  return <span className={className}>~${amount.toLocaleString()} at this fill</span>;
}

/** Prominent live pool strip for Arena hero. */
export function PitLivePoolStrip({
  slug,
  entryFee = 5,
  participantCount = 0,
  className = '',
}: {
  slug?: string | null;
  entryFee?: number;
  participantCount?: number;
  className?: string;
}) {
  const structure = getPayoutStructure(slug);
  const count = Math.max(participantCount, 0);
  const displayCount = count > 0 ? count : structure.minEntries;
  const livePool = computeEffectivePool(slug, { entryFee, participantCount: displayCount });
  const paid = computeMaxPaidRank(slug, displayCount);
  const poolLabel = count >= structure.minEntries ? `$${livePool.toLocaleString()}` : count > 0 ? `$${livePool.toLocaleString()}*` : '—';

  return (
    <div className={`at-pool-strip ${className}`.trim()} role="status">
      <div className="at-pool-strip-stat">
        <span className="at-pool-strip-val">{poolLabel}</span>
        <span className="at-pool-strip-lbl">prize pool{count > 0 && count < structure.minEntries ? ' at fill' : ''}</span>
      </div>
      <span className="at-pool-strip-sep" aria-hidden />
      <div className="at-pool-strip-stat">
        <span className="at-pool-strip-val">{count > 0 ? count : '—'}</span>
        <span className="at-pool-strip-lbl">traders</span>
      </div>
      <span className="at-pool-strip-sep" aria-hidden />
      <div className="at-pool-strip-stat">
        <span className="at-pool-strip-val">{paid > 0 ? paid : '—'}</span>
        <span className="at-pool-strip-lbl">get paid</span>
      </div>
    </div>
  );
}

export function PitPoolSummary({
  slug,
  entryFee = 5,
  participantCount,
}: {
  slug?: string | null;
  entryFee?: number;
  participantCount?: number;
}) {
  const s = getPayoutStructure(slug);
  const count = Math.max(participantCount ?? 0, s.minEntries);
  const pool = computeEffectivePool(slug, { entryFee, participantCount: count });
  const paid = computeMaxPaidRank(slug, count);
  return (
    <span className="pit-pool-summary text-[10px] text-muted font-mono">
      ${pool.toLocaleString()} pool · top {paid} paid · min {s.minEntries} to run
    </span>
  );
}

type PitMoneyDisplayProps = {
  slug?: string | null;
  totalPrizes: number;
  firstPrize?: number;
  entryFee: number;
  participantCount?: number;
  variant?: 'inline' | 'compact' | 'stacked' | 'hero';
  showChip?: boolean;
  showHook?: boolean;
  showSuffix?: boolean;
};

export default function PitMoneyDisplay({
  slug,
  entryFee,
  participantCount = 0,
  variant = 'inline',
  showChip = true,
  showHook = false,
  showSuffix = true,
}: PitMoneyDisplayProps) {
  const structure = getPayoutStructure(slug);
  const count = Math.max(participantCount, structure.minEntries);
  const livePool = computeEffectivePool(slug, { entryFee, participantCount: count });
  const paid = computeMaxPaidRank(slug, count);
  const eachPayout =
    paid > 0 ? Math.floor((livePool / paid) * 100) / 100 : 0;
  const displayCount = participantCount > 0 ? participantCount : structure.minEntries;

  const rootClass = [
    'at-pit-money',
    variant === 'compact' ? 'at-pit-money-compact' : '',
    variant === 'hero' ? 'at-pit-money-hero' : '',
    variant === 'stacked' ? 'at-pit-money-stacked' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const entry = <span className="at-money-entry">${entryFee}</span>;

  if (variant === 'stacked') {
    return (
      <div className={rootClass}>
        {showChip && <PitPayoutChip slug={slug} className="mb-1" />}
        <div className="at-pit-money-stacked-pool font-mono text-accent font-bold tabular-nums">
          ${livePool.toLocaleString()}
        </div>
        <div className="text-[10px] text-muted tracking-wide uppercase">Live prize pool</div>
        <div className="at-pit-money-stacked-entry mt-1">
          {entry}
          {showSuffix && <span className="at-money-lbl"> entry</span>}
        </div>
        {showHook && <p className="text-[10px] text-secondary mt-1 leading-snug">{structure.hook}</p>}
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div className={rootClass}>
        <div className="at-pit-money-hero-amount">${livePool.toLocaleString()}</div>
        <div className="at-pit-money-hero-sublabel">
          live pool
          <span className="at-pit-money-hero-sep">·</span>
          {displayCount} traders
          <span className="at-pit-money-hero-sep">·</span>
          top {paid} get ${eachPayout.toLocaleString()} each
          <span className="at-pit-money-hero-sep">·</span>
          ${entryFee} entry
        </div>
        <div className="text-[10px] text-muted mt-1">
          {PLATFORM_RAKE_PCT}% platform fee · pool grows with entries
        </div>
      </div>
    );
  }

  return (
    <span className={rootClass}>
      {showChip && <PitPayoutChip slug={slug} />}
      <span className="at-money-prize">${livePool.toLocaleString()}</span>
      <span className="at-money-lbl">pool</span>
      <span className="at-money-sep">·</span>
      {entry}
      {showSuffix && <span className="at-money-suffix"> to enter</span>}
      {showHook && <span className="at-pit-money-hook text-[10px] text-secondary ml-1">{structure.hook}</span>}
    </span>
  );
}