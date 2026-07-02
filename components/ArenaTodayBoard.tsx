'use client';

import React from 'react';
import { Contest, LeaderboardEntry } from '../lib/game-types';
import { getCurrentDailyPitWindow, formatDailyPitScheduleLabel, msUntilDailyPitOpen } from '../lib/daily-pit-schedule';
import { formatBellCountdown } from '../lib/contest-bell';
import type { ArenaPitItem } from './ArenaHome';
import DailyPitEventHero from './DailyPitEventHero';
import LowBalanceNudge from './LowBalanceNudge';

type ArenaTodayBoardProps = {
  pits: ArenaPitItem[];
  joinedContestIds: number[];
  getParticipantCount: (contestId: number) => number;
  getRank: (contestId: number) => number | null | undefined;
  bellTick: number;
  hydrated: boolean;
  isTradingOpen: (contest: Contest) => boolean;
  onInfo: (contestId: number) => void;
  onEnter: (contest: Contest) => void;
  getPitLiveStats?: (contestId: number) => { liveValue: number; pnlPct: number; rank: number | null } | null;
  getContestBoard?: (contestId: number) => LeaderboardEntry[];
  onViewLeaderboard?: (contestId: number) => void;
  onShowHowItWorks?: () => void;
  balance?: number;
  stripeEnabled?: boolean;
  onDeposit?: () => void;
  isLoggedIn?: boolean;
};

export default function ArenaTodayBoard({
  pits,
  joinedContestIds,
  getParticipantCount,
  getRank,
  bellTick,
  hydrated,
  onInfo,
  onEnter,
  getPitLiveStats,
  getContestBoard,
  onViewLeaderboard,
  onShowHowItWorks,
  balance = 0,
  stripeEnabled,
  onDeposit,
  isLoggedIn = false,
}: ArenaTodayBoardProps) {
  const mainItem = pits[0];
  const mainBoard = mainItem && getContestBoard ? getContestBoard(mainItem.contest.id) : [];
  const mainJoined = mainItem ? joinedContestIds.includes(mainItem.contest.id) : false;
  const phase = getCurrentDailyPitWindow().phase;

  if (!mainItem) {
    const openMs = msUntilDailyPitOpen();
    return (
      <div className="at-board at-board-v3">
        <div className="dp-event-empty">
          <p className="dp-event-empty-kicker">Daily Pit</p>
          <h2 className="dp-event-empty-title">Between bells</h2>
          <p className="dp-event-empty-copy">{formatDailyPitScheduleLabel()}</p>
          {hydrated && openMs > 0 && (
            <p className="dp-event-empty-countdown">
              Next pit opens in <strong>{formatBellCountdown(openMs)}</strong>
            </p>
          )}
          <p className="dp-event-empty-sub">One pit. $5 in. Top half cash. Every single day.</p>
        </div>
        {onShowHowItWorks && (
          <button type="button" className="at-arena-footer-link mt-4" onClick={onShowHowItWorks}>
            How it works
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="at-board at-board-v3">
      {isLoggedIn && (
        <LowBalanceNudge
          balance={balance}
          isJoined={mainJoined}
          stripeEnabled={stripeEnabled}
          onDeposit={onDeposit}
          className="mb-3"
        />
      )}

      <DailyPitEventHero
        item={mainItem}
        isJoined={mainJoined}
        participantCount={getParticipantCount(mainItem.contest.id)}
        bellTick={bellTick}
        hydrated={hydrated}
        board={mainBoard}
        liveStats={getPitLiveStats?.(mainItem.contest.id) ?? null}
        onInfo={() => onInfo(mainItem.contest.id)}
        onEnter={() => onEnter(mainItem.contest)}
        onViewLeaderboard={
          onViewLeaderboard ? () => onViewLeaderboard(mainItem.contest.id) : undefined
        }
      />

      <div className="at-arena-footer">
        <p className="at-arena-footer-tagline">
          <strong>One pit. Every day.</strong>{' '}
          {phase === 'live' ? 'The pool grows with every trader who rings in.' : 'Same clock, same bell, bigger pot.'}
        </p>
        <p className="at-arena-footer-trust">
          {formatDailyPitScheduleLabel()} · 10% platform fee ·{' '}
          {onShowHowItWorks ? (
            <button type="button" className="at-arena-footer-link" onClick={onShowHowItWorks}>
              How it works
            </button>
          ) : null}
        </p>
      </div>
    </div>
  );
}