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
  onWatchTape?: () => void;
  onSignIn?: () => void;
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
  onWatchTape,
  onSignIn,
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
          <p className="dp-event-empty-sub">
            One pit per day — ring in early tomorrow to lock your spot. Not a full week slate; same
            tape, same $5 entry, every session.
          </p>
          {!isLoggedIn && onWatchTape && onSignIn && (
            <div className="dp-guest-actions dp-guest-actions-empty mt-5">
              <button type="button" className="dp-guest-watch" onClick={onWatchTape}>
                Watch the tape
              </button>
              <button type="button" className="dp-guest-signin" onClick={onSignIn}>
                Sign in to ring in
              </button>
            </div>
          )}
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
      {!isLoggedIn && onWatchTape && onSignIn && (
        <div className="dp-guest-bar">
          <p className="dp-guest-copy">
            Watch today&apos;s pit live — no account needed.
          </p>
          <div className="dp-guest-actions">
            <button type="button" className="dp-guest-watch" onClick={onWatchTape}>
              Watch the tape
            </button>
            <button type="button" className="dp-guest-signin" onClick={onSignIn}>
              Sign in to ring in
            </button>
          </div>
        </div>
      )}

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