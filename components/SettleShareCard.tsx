'use client';

import React from 'react';
import { Trophy } from 'lucide-react';
import {
  countPaidRanks,
  getPayoutStructure,
  payoutForContestRank,
} from '../lib/pit-payouts';
import { DAILY_ENTRY_FEE } from '../lib/daily-pit-config';
import { computeEffectivePool } from '../lib/pit-pool-math';
import { PitPayoutChip } from './PitMoneyDisplay';

export type SettleShareCardProps = {
  contestTitle: string;
  contestSlug?: string | null;
  rank: number;
  portfolioValue: number;
  startingValue: number;
  payout: number;
  voided?: boolean;
  refund?: number;
};

export default function SettleShareCard({
  contestTitle,
  contestSlug,
  rank,
  portfolioValue,
  startingValue,
  payout,
  voided,
  refund,
}: SettleShareCardProps) {
  const pnl = portfolioValue - startingValue;
  const pnlPct = startingValue > 0 ? (pnl / startingValue) * 100 : 0;
  const structure = getPayoutStructure(contestSlug);
  const paidRanks = countPaidRanks(structure);
  const poolAtMin = computeEffectivePool(contestSlug, {
    entryFee: DAILY_ENTRY_FEE,
    participantCount: structure.minEntries,
  });
  const tierPayout = rank > 0 ? payoutForContestRank(rank, contestSlug) : 0;
  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="settle-share-card mb-5 text-left" aria-hidden={false}>
      <div className="settle-share-inner rounded-2xl border border-accent/35 overflow-hidden">
        <div className="settle-share-head px-4 py-3 bg-gradient-to-br from-accent/15 to-transparent border-b border-accent/20">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="text-[9px] font-bold tracking-[0.2em] text-accent/80 uppercase">TradR Pit</div>
            {contestSlug && <PitPayoutChip slug={contestSlug} />}
          </div>
          <div className="font-black text-lg tracking-tight text-[var(--text)] mt-0.5 leading-tight">
            {contestTitle}
          </div>
          <div className="text-[10px] text-muted mt-1">
            {dateLabel} · ${poolAtMin.toLocaleString()}+ pool · top {paidRanks} paid at min fill
          </div>
        </div>

        <div className="settle-share-body px-4 py-4 bg-[#0a0a0a]">
          {voided ? (
            <div className="text-center py-2">
              <div className="text-sm font-bold text-red-300">Pit didn&apos;t fill</div>
              <p className="text-[11px] text-muted mt-2">
                Needed at least {structure.minEntries} traders to run this pit.
              </p>
              {refund != null && refund > 0 && (
                <div className="font-mono text-2xl font-bold text-accent mt-2">+${refund} refunded</div>
              )}
              <p className="text-[11px] text-muted mt-2">No rankings this bell — run it back.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 mb-3">
                <Trophy size={18} className="text-accent shrink-0" />
                <span className="font-mono text-5xl font-black text-accent leading-none">#{rank}</span>
              </div>
              <div className="text-center text-[11px] text-muted mb-3">
                {rank <= paidRanks
                  ? `In the money — top ${paidRanks} paid on this pit`
                  : `Outside the money — top ${paidRanks} paid (you were #${rank})`}
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-surface border border-card px-2 py-2">
                  <div className="text-[9px] text-muted uppercase tracking-wide">Portfolio</div>
                  <div className="font-mono text-sm font-bold text-[var(--text)]">
                    ${portfolioValue.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-xl bg-surface border border-card px-2 py-2">
                  <div className="text-[9px] text-muted uppercase tracking-wide">P&amp;L</div>
                  <div className={`font-mono text-sm font-bold ${pnl >= 0 ? 'text-accent' : 'text-red-400'}`}>
                    {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toLocaleString()}
                    <span className="text-[10px] ml-0.5">
                      ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
              {payout > 0 ? (
                <div className="mt-3 text-center py-2 rounded-xl bg-accent/10 border border-accent/30">
                  <div className="text-[9px] text-muted tracking-widest uppercase">Prize won</div>
                  <div className="font-mono text-2xl font-black text-accent">+${payout}</div>
                  {tierPayout > 0 && tierPayout !== payout && (
                    <div className="text-[10px] text-muted mt-0.5">Tier payout: ${tierPayout}</div>
                  )}
                </div>
              ) : (
                <div className="mt-3 text-center text-[11px] text-muted py-2 rounded-xl border border-card/60">
                  No cash this bell — rank #{rank} was outside top {paidRanks}.
                </div>
              )}
            </>
          )}
        </div>

        <div className="settle-share-foot px-4 py-2 border-t border-white/5 text-[9px] text-muted text-center font-mono">
          {structure.hook}
        </div>
      </div>
      <p className="text-[10px] text-muted text-center mt-2">
        Screenshot or tap Share for your result card link · one pit every day
      </p>
    </div>
  );
}