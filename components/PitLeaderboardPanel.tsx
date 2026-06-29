'use client';

import React from 'react';
import { Scissors } from 'lucide-react';
import { Contest, LeaderboardEntry } from '../lib/game-types';
import { getPaidRankCount } from '../lib/money-zone';
import { payoutForContestRank } from '../lib/pit-payouts';
import MoneyZoneBar from './MoneyZoneBar';

export default function PitLeaderboardPanel({
  entries,
  contest,
  yourValue,
  compact = false,
}: {
  entries: LeaderboardEntry[];
  contest: Contest;
  yourValue: number;
  compact?: boolean;
}) {
  const paidRanks = getPaidRankCount(contest.slug);
  const cutoff = paidRanks > 0 ? entries[paidRanks - 1] : null;

  if (!entries.length) {
    return (
      <div className="text-center py-10 text-muted text-sm border border-dashed border-card rounded-2xl">
        No traders on the tape yet.
      </div>
    );
  }

  return (
    <div className="pit-leaderboard-panel">
      <MoneyZoneBar
        entries={entries}
        yourValue={yourValue}
        slug={contest.slug}
        compact={compact}
      />

      {paidRanks > 0 && cutoff && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <Scissors size={12} className="text-accent shrink-0" />
          <div className="flex-1 h-px bg-gradient-to-r from-accent/60 via-accent/20 to-transparent" />
          <span className="text-[10px] font-mono text-accent tracking-wide shrink-0">
            MONEY LINE — #{paidRanks} @ ${cutoff.portfolioValue.toLocaleString()}
          </span>
          <div className="flex-1 h-px bg-gradient-to-l from-accent/60 via-accent/20 to-transparent" />
        </div>
      )}

      <div className="divide-y divide-[#222] text-sm">
        {entries.map((entry) => {
          const inMoney = entry.rank <= paidRanks;
          const isCutoff = entry.rank === paidRanks;
          const payout = inMoney ? payoutForContestRank(entry.rank, contest.slug) : 0;

          return (
            <div
              key={entry.userId}
              className={`vault-row flex items-center justify-between py-3.5 px-1 ${
                entry.isYou ? 'bg-user-card -mx-1 px-2 rounded ring-1 ring-accent/25' : ''
              } ${isCutoff ? 'border-b-2 border-accent/50' : ''}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`font-mono text-lg w-8 text-right tabular-nums shrink-0 ${
                    entry.rank === 1 ? 'text-accent' : inMoney ? 'text-accent/80' : 'text-muted'
                  }`}
                >
                  #{entry.rank}
                </div>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    entry.isYou ? 'bg-accent text-black' : inMoney ? 'bg-accent/20 text-accent' : 'bg-zinc-800'
                  }`}
                >
                  {entry.username.replace('@', '').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {entry.username}
                    {entry.isYou && <span className="text-accent text-xs ml-1">(YOU)</span>}
                  </div>
                  {inMoney && payout > 0 && (
                    <div className="text-[10px] text-accent font-mono">+${payout} projected</div>
                  )}
                  {!inMoney && paidRanks > 0 && cutoff && (
                    <div className="text-[10px] text-muted font-mono">
                      −${Math.max(0, cutoff.portfolioValue - entry.portfolioValue + 1).toLocaleString()} to money
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0 pl-2">
                <div className="font-mono text-base text-accent tabular-nums tracking-tighter">
                  ${entry.portfolioValue.toLocaleString()}
                </div>
                {isCutoff && (
                  <div className="text-[9px] text-accent font-bold tracking-widest">CUT LINE</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}