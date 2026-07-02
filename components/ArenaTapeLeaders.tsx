'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Contest, LeaderboardEntry } from '../lib/game-types';
import { getPaidRankCount } from '../lib/money-zone';

type ArenaTapeLeadersProps = {
  contest: Contest;
  entries: LeaderboardEntry[];
  onViewAll: () => void;
  bare?: boolean;
};

export default function ArenaTapeLeaders({ contest, entries, onViewAll, bare = false }: ArenaTapeLeadersProps) {
  if (entries.length < 1) return null;

  const cutRank = getPaidRankCount(contest.slug);
  const top = entries.slice(0, 3);
  const you = entries.find((e) => e.isYou);
  const showYou = you && !top.some((e) => e.isYou);

  return (
    <section className={`arena-tape-leaders ${bare ? 'arena-tape-leaders-bare' : 'mb-5'}`} data-tour="tape-leaders">
      {!bare && (
        <div className="flex items-center justify-between mb-2.5">
          <div className="text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">Tape leaders</div>
          <button
            type="button"
            onClick={onViewAll}
            className="flex items-center gap-0.5 text-[10px] font-medium text-accent"
          >
            Full board
            <ChevronRight size={12} />
          </button>
        </div>
      )}

      <div className="arena-tape-leaders-panel rounded-xl border border-card overflow-hidden">
        {top.map((entry, i) => {
          const inMoney = entry.rank <= cutRank;
          const isLast = i === top.length - 1 && !showYou;
          return (
            <div
              key={entry.userId}
              className={`arena-tape-leader-row ${entry.isYou ? 'arena-tape-leader-you' : ''} ${isLast ? '' : 'border-b border-card'}`}
            >
              <span className={`font-mono text-xs w-5 ${entry.rank <= 3 ? 'text-accent' : 'text-muted'}`}>
                {entry.rank}
              </span>
              <span className="text-[13px] truncate flex-1 min-w-0">
                {entry.username}
                {entry.isYou && <span className="text-accent text-[10px] ml-1">you</span>}
              </span>
              <span className="font-mono text-[13px] text-[var(--text)] tabular-nums shrink-0">
                ${entry.portfolioValue.toLocaleString()}
              </span>
              {inMoney && <span className="arena-in-money-dot" title="In the money" />}
            </div>
          );
        })}

        {showYou && you && (
          <>
            <div className="arena-money-cut">
              <span>In the money</span>
            </div>
            <div className={`arena-tape-leader-row arena-tape-leader-you ${you.rank <= cutRank ? '' : 'opacity-80'}`}>
              <span className="font-mono text-xs w-5 text-accent">{you.rank}</span>
              <span className="text-[13px] truncate flex-1 min-w-0">
                {you.username}
                <span className="text-accent text-[10px] ml-1">you</span>
              </span>
              <span className="font-mono text-[13px] text-accent tabular-nums shrink-0">
                ${you.portfolioValue.toLocaleString()}
              </span>
              {you.rank <= cutRank && <span className="arena-in-money-dot" />}
            </div>
          </>
        )}

        {top.length > 0 && cutRank > 0 && top[top.length - 1].rank === cutRank && !showYou && (
          <div className="arena-money-cut">
            <span>In the money</span>
          </div>
        )}
      </div>
    </section>
  );
}