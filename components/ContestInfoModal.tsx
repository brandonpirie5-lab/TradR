'use client';

import React, { useState } from 'react';
import { X, Clock, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Contest } from '../lib/game-types';
import {
  formatContestWindow,
  getContestRules,
  getPrizeBreakdown,
} from '../lib/contest-rules';
import { BellCountdown } from './BellCountdown';
import { useHydrated } from '../lib/use-hydrated';
import AssetChip from './AssetChip';

export default function ContestInfoModal({
  contest,
  bellTick,
  onClose,
}: {
  contest: Contest;
  bellTick?: number;
  onClose: () => void;
}) {
  const hydrated = useHydrated();
  const [showPrizes, setShowPrizes] = useState(false);
  const rules = getContestRules(contest);
  const prizes = getPrizeBreakdown(contest);
  const window = formatContestWindow(contest);
  void bellTick;

  const fmt = (d: Date | null) =>
    d
      ? d.toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : 'TBD';

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-5" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-card border border-card rounded-t-3xl sm:rounded-3xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Info size={16} className="text-accent" />
              <span className="text-[10px] tracking-[3px] text-muted uppercase">Contest Intel</span>
            </div>
            <h2 className="font-black text-2xl tracking-tight">{contest.title}</h2>
            {contest.tagline && <p className="text-sm text-secondary mt-1">{contest.tagline}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl border border-card hover:border-accent/40">
            <X size={18} />
          </button>
        </div>

        {/* Timing */}
        <div className="bg-surface border border-card rounded-2xl p-4 mb-4">
          <div className="text-[10px] tracking-widest text-muted uppercase mb-3">Schedule</div>
          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
            <div>
              <div className="text-[10px] text-muted">STARTS</div>
              <div className="font-mono text-xs">{fmt(window.startsAt)}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted">ENDS</div>
              <div className="font-mono text-xs">{fmt(window.endsAt)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/30 border border-accent/20">
            <Clock size={14} className="text-accent" />
            <span className="text-xs text-muted">Bell rings in</span>
            <span className="font-mono text-accent font-bold text-sm ml-auto">
              {hydrated ? <BellCountdown contest={contest} tick={bellTick} /> : '—'}
            </span>
          </div>
          <p className="text-[10px] text-muted mt-2">
            Join anytime — cutoff is {rules.joinCutoffMinutes} min before the bell.
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          {[
            { label: 'Starting balance', value: `$${rules.startingBalance.toLocaleString()}` },
            { label: 'Max trades', value: rules.maxTrades === 'unlimited' ? 'Unlimited' : String(rules.maxTrades) },
            { label: 'Trading hours', value: rules.tradingHours === '24/7' ? '24/7' : 'Market hours' },
            { label: 'Your entries', value: `${rules.maxEntriesPerUser} per user` },
            { label: 'Min to run', value: `${rules.minEntries} traders` },
            { label: 'Capacity', value: `${contest.entries} / ${contest.maxEntries}` },
          ].map((row) => (
            <div key={row.label} className="bg-surface border border-card rounded-xl p-3">
              <div className="text-[10px] text-muted">{row.label}</div>
              <div className="font-mono font-semibold text-accent mt-0.5">{row.value}</div>
            </div>
          ))}
        </div>

        {/* Prize pool */}
        <button
          type="button"
          onClick={() => setShowPrizes((v) => !v)}
          className="w-full flex items-center justify-between bg-surface border border-card rounded-2xl p-4 mb-2 text-left"
        >
          <div>
            <div className="text-[10px] text-muted tracking-widest">PRIZE POOL</div>
            <div className="font-mono text-2xl font-bold text-accent">${contest.totalPrizes}</div>
          </div>
          {showPrizes ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
        </button>
        {showPrizes && (
          <div className="bg-surface border border-card rounded-2xl p-3 mb-4 space-y-2">
            {prizes.map((tier) => (
              <div key={tier.rank} className="flex justify-between items-center text-sm py-1 border-b border-card/50 last:border-0">
                <span className="text-muted">{tier.label}</span>
                <span className="font-mono text-accent font-bold">
                  ${tier.amount} <span className="text-[10px] text-muted font-normal">({tier.pctOfPool}%)</span>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Assets */}
        <div className="mb-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-[10px] tracking-widest text-muted uppercase">
              Today&apos;s tape
            </div>
            <span className="text-[10px] font-mono font-bold text-accent px-2 py-0.5 rounded bg-accent/10">
              {contest.assets.length} tradable
            </span>
          </div>
          {contest.assetTheme && (
            <div className="text-[11px] text-secondary font-mono mb-2 leading-snug">{contest.assetTheme}</div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {contest.assets.map((sym) => (
              <AssetChip key={sym} symbol={sym} size="sm" />
            ))}
          </div>
        </div>

        {/* Rules */}
        <div className="bg-surface border border-card rounded-2xl p-4">
          <div className="text-[10px] tracking-widest text-muted uppercase mb-2">Rules</div>
          <ul className="space-y-2 text-xs text-secondary leading-relaxed">
            {rules.rules.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-accent shrink-0">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}