'use client';

import React from 'react';
import { Contest, LeaderboardEntry } from '../lib/game-types';
import { getCurrentDailyPitWindow, formatDailyPitScheduleLabel, msUntilDailyPitOpen } from '../lib/daily-pit-schedule';
import { formatBellCountdown } from '../lib/contest-bell';
import { DAILY_ENTRY_FEE } from '../lib/daily-pit-config';
import type { ArenaPitItem } from './ArenaHome';
import DailyPitEventHero from './DailyPitEventHero';
import LowBalanceNudge from './LowBalanceNudge';
import ArenaSkeleton from './ArenaSkeleton';

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
  onWatchTape?: () => void;
  onSignIn?: () => void;
  loading?: boolean;
};

export default function ArenaTodayBoard({
  pits,
  joinedContestIds,
  getParticipantCount,
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
  onWatchTape,
  onSignIn,
  loading = false,
}: ArenaTodayBoardProps) {
  if (loading) {
    return (
      <div className="at-board at-board-v3">
        <ArenaSkeleton />
      </div>
    );
  }

  const mainItem = pits[0];
  const mainBoard = mainItem && getContestBoard ? getContestBoard(mainItem.contest.id) : [];
  const mainJoined = mainItem ? joinedContestIds.includes(mainItem.contest.id) : false;

  if (!mainItem) {
    const openMs = msUntilDailyPitOpen();
    return (
      <div className="at-board at-board-v3">
        <div className="dp-poster dp-poster-empty">
          <h1 className="dp-poster-title">$5 in · top half cash</h1>
          <p className="dp-poster-sub">{formatDailyPitScheduleLabel()}</p>
          {hydrated && openMs > 0 && (
            <p className="dp-poster-empty-countdown">
              Next pit in <strong>{formatBellCountdown(openMs)}</strong>
            </p>
          )}
          <div className="dp-poster-actions">
            {!isLoggedIn && onWatchTape && (
              <button type="button" className="dp-poster-cta-secondary" onClick={onWatchTape}>
                Watch live
              </button>
            )}
            {!isLoggedIn && onSignIn && (
              <button type="button" className="at-cta dp-poster-cta-primary" onClick={onSignIn}>
                Sign in · ring in ${DAILY_ENTRY_FEE}
              </button>
            )}
          </div>
          {onShowHowItWorks && (
            <button type="button" className="dp-poster-how" onClick={onShowHowItWorks}>
              How it works
            </button>
          )}
        </div>
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
        isLoggedIn={isLoggedIn}
        onWatchTape={!isLoggedIn ? onWatchTape : undefined}
        onShowHowItWorks={onShowHowItWorks}
      />
    </div>
  );
}