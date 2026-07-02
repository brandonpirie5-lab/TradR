'use client';

import React from 'react';
import { Contest, LeaderboardEntry } from '../lib/game-types';
import ArenaTodayBoard from './ArenaTodayBoard';

export type ArenaPitItem = { contest: Contest; scheduled: boolean };

type ArenaHomeProps = {
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

export default function ArenaHome({
  pits,
  joinedContestIds,
  getParticipantCount,
  getRank,
  bellTick,
  hydrated,
  isTradingOpen,
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
}: ArenaHomeProps) {
  return (
    <div className="af-landing af-landing-v3">
      <ArenaTodayBoard
        pits={pits}
        joinedContestIds={joinedContestIds}
        getParticipantCount={getParticipantCount}
        getRank={getRank}
        bellTick={bellTick}
        hydrated={hydrated}
        isTradingOpen={isTradingOpen}
        onInfo={onInfo}
        onEnter={onEnter}
        getPitLiveStats={getPitLiveStats}
        getContestBoard={getContestBoard}
        onViewLeaderboard={onViewLeaderboard}
        onShowHowItWorks={onShowHowItWorks}
        balance={balance}
        stripeEnabled={stripeEnabled}
        onDeposit={onDeposit}
        isLoggedIn={isLoggedIn}
        onWatchTape={onWatchTape}
        onSignIn={onSignIn}
      />
    </div>
  );
}