'use client';

import React from 'react';
import {
  countPaidRanks,
  getPayoutStructure,
  payoutForContestRank,
} from '../lib/pit-payouts';

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

export function PitPoolSummary({ slug }: { slug?: string | null }) {
  const s = getPayoutStructure(slug);
  const paid = countPaidRanks(s);
  return (
    <span className="pit-pool-summary text-[10px] text-muted font-mono">
      Top {paid} paid · min {s.minEntries} to run · cap {s.maxEntries}
    </span>
  );
}

export function PitProjectedPayout({
  slug,
  rank,
  className = '',
}: {
  slug?: string | null;
  rank: number;
  className?: string;
}) {
  const amount = payoutForContestRank(rank, slug);
  if (amount <= 0) {
    const paid = countPaidRanks(getPayoutStructure(slug));
    return (
      <span className={`pit-projected-out text-[10px] text-muted font-mono ${className}`.trim()}>
        Outside top {paid}
      </span>
    );
  }
  return (
    <span className={`pit-projected-in text-[10px] text-accent font-mono font-bold ${className}`.trim()}>
      +${amount} projected
    </span>
  );
}

type PitMoneyDisplayProps = {
  slug?: string | null;
  totalPrizes: number;
  entryFee: number;
  variant?: 'inline' | 'compact' | 'stacked' | 'hero';
  showChip?: boolean;
  showHook?: boolean;
  showSuffix?: boolean;
};

export default function PitMoneyDisplay({
  slug,
  totalPrizes,
  entryFee,
  variant = 'inline',
  showChip = true,
  showHook = false,
  showSuffix = true,
}: PitMoneyDisplayProps) {
  const structure = getPayoutStructure(slug);
  const rootClass = [
    'at-pit-money',
    variant === 'compact' ? 'at-pit-money-compact' : '',
    variant === 'hero' ? 'at-pit-money-hero' : '',
    variant === 'stacked' ? 'at-pit-money-stacked' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const entry =
    entryFee === 0 ? (
      <span className="at-money-free">Free</span>
    ) : (
      <span className="at-money-entry">${entryFee}</span>
    );

  if (variant === 'stacked') {
    return (
      <div className={rootClass}>
        {showChip && <PitPayoutChip slug={slug} className="mb-1" />}
        <div className="at-pit-money-stacked-pool font-mono text-accent font-bold tabular-nums">
          ${totalPrizes.toLocaleString()}
        </div>
        <div className="text-[10px] text-muted tracking-wide uppercase">Prize pool</div>
        <div className="at-pit-money-stacked-entry mt-1">
          {entry}
          {showSuffix && <span className="at-money-lbl"> entry</span>}
        </div>
        {showHook && <p className="text-[10px] text-secondary mt-1 leading-snug">{structure.hook}</p>}
      </div>
    );
  }

  return (
    <span className={rootClass}>
      {showChip && <PitPayoutChip slug={slug} />}
      <span className="at-money-prize">${totalPrizes.toLocaleString()}</span>
      <span className="at-money-lbl">pool</span>
      <span className="at-money-sep">·</span>
      {entry}
      {showSuffix && variant !== 'hero' && <span className="at-money-suffix"> to enter</span>}
      {showSuffix && variant === 'hero' && <span className="at-money-lbl"> entry</span>}
      {showHook && <span className="at-pit-money-hook text-[10px] text-secondary ml-1">{structure.hook}</span>}
    </span>
  );
}