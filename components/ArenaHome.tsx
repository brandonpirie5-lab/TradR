'use client';

import React from 'react';
import { Contest } from '../lib/game-types';
import ArenaTodayBoard from './ArenaTodayBoard';

export type ArenaPitItem = { contest: Contest; scheduled: boolean };

type ArenaHomeProps = {
  pits: ArenaPitItem[];
  joinedContestIds: number[];
  contests: Contest[];
  getParticipantCount: (contestId: number) => number;
  getRank: (contestId: number) => number | null | undefined;
  bellTick: number;
  hydrated: boolean;
  isTradingOpen: (contest: Contest) => boolean;
  onInfo: (contestId: number) => void;
  onEnter: (contest: Contest) => void;
  onJoinWeekPit: (slug: string, dayIndex: number) => void;
  onInfoWeekPit: (slug: string, dayIndex: number) => void;
  useServerStreak?: boolean;
  onCopyReferralLink: () => void;
  onShareReferralLink: () => void;
  referralCopied?: boolean;
};

export default function ArenaHome({
  pits,
  joinedContestIds,
  contests,
  getParticipantCount,
  getRank,
  bellTick,
  hydrated,
  isTradingOpen,
  onInfo,
  onEnter,
  onJoinWeekPit,
  onInfoWeekPit,
  useServerStreak = false,
  onCopyReferralLink,
  onShareReferralLink,
  referralCopied = false,
}: ArenaHomeProps) {
  if (!pits.length) {
    return (
      <div className="af-landing">
        <div className="af-empty">
          <p className="af-empty-title">No contests right now</p>
          <p className="af-empty-sub">Check back when the floor opens.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="af-landing af-landing-v3">
      <ArenaTodayBoard
        pits={pits}
        joinedContestIds={joinedContestIds}
        contests={contests}
        getParticipantCount={getParticipantCount}
        getRank={getRank}
        bellTick={bellTick}
        hydrated={hydrated}
        isTradingOpen={isTradingOpen}
        onInfo={onInfo}
        onEnter={onEnter}
        onJoinWeekPit={onJoinWeekPit}
        onInfoWeekPit={onInfoWeekPit}
        useServerStreak={useServerStreak}
        onCopyReferralLink={onCopyReferralLink}
        onShareReferralLink={onShareReferralLink}
        referralCopied={referralCopied}
      />
    </div>
  );
}