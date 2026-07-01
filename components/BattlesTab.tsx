'use client';

import React, { useEffect, useRef } from 'react';
import SegmentedControl from './SegmentedControl';
import EmptyActiveBattles from './EmptyActiveBattles';
import BattleWaitingTicket from './BattleWaitingTicket';
import BattleCompletedTicket from './BattleCompletedTicket';
import BattleActiveList from './BattleActiveList';
import { Contest, LeaderboardEntry, Participation } from '../lib/game-types';
import type { TradeLimitInfo } from '../lib/trade-limits';

export type BattlesSegment = 'active' | 'upcoming' | 'completed';

type BattlesTabProps = {
  battlesSegment: BattlesSegment;
  onBattlesSegmentChange: (segment: BattlesSegment) => void;
  highlightDoneContestId?: number | null;
  onClearDoneHighlight?: () => void;
  activeBattles: Participation[];
  activeBattlesOrdered: Participation[];
  scheduledBattles: Participation[];
  sortedCompletedBattles: Participation[];
  completedBattlesCount: number;
  contests: Contest[];
  dailyPitContest?: Contest;
  bellTick: number;
  prices: Record<string, number>;
  tradeLimitByContest: Record<number, TradeLimitInfo | null | undefined>;
  getPortfolioValue: (p: Participation) => number;
  rankInContest: (contestId: number) => number | null;
  getContestBoard: (contestId: number) => LeaderboardEntry[];
  onJoinPit: () => void;
  onGoArena: () => void;
  onTrade: (contestId: number) => void;
  onLeaderboard: (contestId: number) => void;
  onInfo: (contestId: number) => void;
  onRecap: (contestId: number) => void;
};

export default function BattlesTab({
  battlesSegment,
  onBattlesSegmentChange,
  highlightDoneContestId,
  onClearDoneHighlight,
  activeBattles,
  activeBattlesOrdered,
  scheduledBattles,
  sortedCompletedBattles,
  completedBattlesCount,
  contests,
  dailyPitContest,
  bellTick,
  prices,
  tradeLimitByContest,
  getPortfolioValue,
  rankInContest,
  getContestBoard,
  onJoinPit,
  onGoArena,
  onTrade,
  onLeaderboard,
  onInfo,
  onRecap,
}: BattlesTabProps) {
  const highlightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (battlesSegment !== 'completed' || highlightDoneContestId == null) return;
    const el = highlightRef.current;
    if (!el) return;
    const t = window.setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    const clear = window.setTimeout(() => onClearDoneHighlight?.(), 8000);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(clear);
    };
  }, [battlesSegment, highlightDoneContestId, onClearDoneHighlight]);

  const highlightedBattle = highlightDoneContestId
    ? sortedCompletedBattles.find((p) => p.contestId === highlightDoneContestId)
    : null;
  const highlightedContest = highlightedBattle
    ? contests.find((c) => c.id === highlightedBattle.contestId)
    : null;

  return (
    <div className="bt-shell tab-content-enter">
      <div data-tour="tabs">
        <SegmentedControl
          className="mb-5"
          value={battlesSegment}
          onChange={onBattlesSegmentChange}
          options={[
            { id: 'active', label: 'ACTIVE', count: activeBattles.length },
            { id: 'upcoming', label: 'UPCOMING', count: scheduledBattles.length },
            { id: 'completed', label: 'DONE', count: completedBattlesCount },
          ]}
        />
      </div>

      {battlesSegment === 'completed' && highlightDoneContestId != null && highlightedContest && (
        <div className="bt-done-fresh-banner" role="status">
          <span className="bt-done-fresh-kicker">Bell rung</span>
          <span className="bt-done-fresh-title">{highlightedContest.title} — result saved</span>
        </div>
      )}

      {battlesSegment === 'active' && activeBattles.length === 0 && (
        <EmptyActiveBattles
          dailyPit={dailyPitContest}
          onJoinPit={onJoinPit}
          onBrowseUpcoming={onGoArena}
        />
      )}

      {battlesSegment === 'upcoming' && scheduledBattles.length === 0 && (
        <div className="bt-upcoming-empty">
          <p className="bt-upcoming-empty-title">Nothing on deck</p>
          <p className="bt-upcoming-empty-copy">
            Rang-in tickets show here before the bell. Head to Arena to join more pits.
          </p>
        </div>
      )}

      {battlesSegment === 'upcoming' && scheduledBattles.length > 0 && (
        <div className="bt-list">
          {scheduledBattles.map((p) => {
            const c = contests.find((cc) => cc.id === p.contestId)!;
            return (
              <BattleWaitingTicket
                key={p.contestId}
                contest={c}
                participation={p}
                bellTick={bellTick}
              />
            );
          })}
        </div>
      )}

      {battlesSegment === 'upcoming' && (
        <button type="button" className="bt-arena-link" onClick={onGoArena}>
          <span>Join more contests in Arena</span>
          <span className="bt-arena-link-arrow" aria-hidden>
            →
          </span>
        </button>
      )}

      {battlesSegment === 'completed' && sortedCompletedBattles.length === 0 && (
        <div className="bt-upcoming-empty">
          <p className="bt-upcoming-empty-title">No settled battles</p>
          <p className="bt-upcoming-empty-copy">
            Finish a pit and your rank, payout, and tape recap land here.
          </p>
        </div>
      )}

      {battlesSegment === 'completed' && sortedCompletedBattles.length > 0 && (
        <div className="bt-list">
          {sortedCompletedBattles.map((p) => {
            const c = contests.find((cc) => cc.id === p.contestId)!;
            const highlighted = p.contestId === highlightDoneContestId;
            return (
              <div
                key={p.contestId}
                ref={highlighted ? highlightRef : undefined}
                className={highlighted ? 'bt-done-highlight-wrap' : undefined}
              >
                <BattleCompletedTicket
                  contest={c}
                  participation={p}
                  finalValue={p.finalValue || getPortfolioValue(p)}
                  highlighted={highlighted}
                  onRecap={() => onRecap(p.contestId)}
                />
              </div>
            );
          })}
        </div>
      )}

      {battlesSegment === 'active' && activeBattles.length > 0 && (
        <BattleActiveList
          battles={activeBattlesOrdered}
          contests={contests}
          bellTick={bellTick}
          prices={prices}
          tradeLimitByContest={tradeLimitByContest}
          getPortfolioValue={getPortfolioValue}
          rankInContest={rankInContest}
          getContestBoard={getContestBoard}
          onTrade={onTrade}
          onLeaderboard={onLeaderboard}
          onInfo={onInfo}
        />
      )}
    </div>
  );
}