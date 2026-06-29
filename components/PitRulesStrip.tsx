'use client';

import React from 'react';
import { Contest } from '../lib/game-types';
import { bellMsRemaining, isContestBellOpen } from '../lib/contest-bell';
import { getContestRules } from '../lib/contest-rules';
import { useHydrated } from '../lib/use-hydrated';
import { BellCountdown } from './BellCountdown';
import TradeMeter from './TradeMeter';
import type { TradeLimitInfo } from '../lib/trade-limits';
import PitMoneyDisplay, { PitPoolSummary } from './PitMoneyDisplay';

function pitHook(contest: Contest, rules: ReturnType<typeof getContestRules>): string | null {
  const generic = rules.rules.find(
    (r) =>
      !r.includes('$100,000') &&
      !r.includes('Rankings update') &&
      !r.includes('Top 3 share') &&
      !r.includes('Join anytime')
  );
  return generic ?? contest.tagline ?? null;
}

export default function PitRulesStrip({
  contest,
  bellTick,
  tradeLimit,
}: {
  contest: Contest;
  bellTick?: number;
  tradeLimit?: TradeLimitInfo | null;
}) {
  const hydrated = useHydrated();
  void bellTick;

  const rules = getContestRules(contest);
  const hook = pitHook(contest, rules);
  const ms = hydrated ? bellMsRemaining(contest) : null;
  const open = hydrated ? isContestBellOpen(contest) : contest.status !== 'closed';

  return (
    <div className="pit-rules-strip mb-3">
      <div className="pit-rules-money-row mb-2">
        <PitMoneyDisplay
          slug={contest.slug}
          totalPrizes={contest.totalPrizes}
          entryFee={contest.entryFee}
          variant="compact"
          showHook={false}
          showSuffix={false}
        />
        <div className="mt-1">
          <PitPoolSummary slug={contest.slug} />
        </div>
      </div>
      {hook && (
        <p className="pit-rules-hook text-[11px] text-accent/90 font-semibold leading-snug mb-2">
          {hook}
        </p>
      )}
      <div className="flex flex-wrap gap-2 text-[10px]">
        <span className="px-2 py-1 rounded-lg bg-surface border border-card font-mono">
          $100k start
        </span>
        <span className="px-2 py-1 rounded-lg bg-surface border border-card">
          {contest.entryFee === 0 ? 'FREE' : `$${contest.entryFee}`} entry
        </span>
        <span className="px-2 py-1 rounded-lg bg-surface border border-card font-mono">
          {contest.assets.length} assets
        </span>
        {rules.maxTrades !== 'unlimited' && (
          <span className="px-2 py-1 rounded-lg bg-accent/10 border border-accent/25 font-mono font-bold text-accent">
            {rules.maxTrades} trades max
          </span>
        )}
        {rules.tradingHours === 'market-hours' && (
          <span className="px-2 py-1 rounded-lg bg-surface border border-card">
            Market hours
          </span>
        )}
        {contest.badge && (
          <span className="px-2 py-1 rounded-lg bg-pill border border-card font-bold uppercase tracking-wide">
            {contest.badge}
          </span>
        )}
        <span
          className={`px-2 py-1 rounded-lg border font-mono font-bold ${
            !open
              ? 'border-red-500/50 text-red-400'
              : ms != null && ms < 300000
                ? 'border-accent/50 text-accent bell-urgent'
                : 'border-card text-muted'
          }`}
        >
          <BellCountdown contest={contest} tick={bellTick} />
        </span>
        {tradeLimit && (
          <div className="w-full min-w-[120px] max-w-[160px]">
            <TradeMeter info={tradeLimit} compact />
          </div>
        )}
      </div>
    </div>
  );
}