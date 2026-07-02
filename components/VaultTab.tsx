'use client';

import React from 'react';
import { BellCountdown } from './BellCountdown';
import PitFeed, { type PitFeedItem } from './PitFeed';
import PitLeaderboardPanel from './PitLeaderboardPanel';
import { Contest, LeaderboardEntry } from '../lib/game-types';
import { isContestTradingOpen } from '../lib/contest-bell';
import { formatDailyPitScheduleLabel } from '../lib/daily-pit-schedule';
import { computeEffectivePool } from '../lib/pit-pool-math';
import { DAILY_ENTRY_FEE } from '../lib/daily-pit-config';

type VaultTabProps = {
  vaultContest: Contest | null | undefined;
  activeVaultContestId: number | null;
  joinedContests: number[];
  contests: Contest[];
  dynamicVault: LeaderboardEntry[];
  vaultPlayerCount: number;
  bestPortfolioValue: number;
  bellTick: number;
  hydrated: boolean;
  pitFeedItems: PitFeedItem[];
  pitFeedLoading: boolean;
  isSpectating?: boolean;
  onSelectVaultContest: (contestId: number) => void;
  onRefreshPit: () => void;
  onGoArena: () => void;
  onJoinPit?: () => void;
};

export default function VaultTab({
  vaultContest,
  activeVaultContestId,
  joinedContests,
  contests,
  dynamicVault,
  vaultPlayerCount,
  bestPortfolioValue,
  bellTick,
  hydrated,
  pitFeedItems,
  pitFeedLoading,
  isSpectating = false,
  onRefreshPit,
  onGoArena,
  onJoinPit,
}: VaultTabProps) {
  const yourValue = dynamicVault.find((e) => e.isYou)?.portfolioValue || bestPortfolioValue;
  const activeJoined = joinedContests.filter((id) => {
    const c = contests.find((x) => x.id === id);
    return c && c.status !== 'closed';
  });
  const isLive = vaultContest && isContestTradingOpen(vaultContest);
  const pool =
    vaultContest && vaultPlayerCount > 0
      ? computeEffectivePool(vaultContest.slug, {
          entryFee: vaultContest.entryFee || DAILY_ENTRY_FEE,
          participantCount: vaultPlayerCount,
        })
      : 0;

  if (!vaultContest) {
    return (
      <div className="vt-shell tab-content-enter">
        <div className="vt-empty">
          <p className="vt-empty-title">No pit on the floor</p>
          <p className="vt-empty-copy">{formatDailyPitScheduleLabel()}</p>
          <button type="button" className="bt-arena-link bt-arena-link-spaced" onClick={onGoArena}>
            <span>Go to Arena</span>
            <span className="bt-arena-link-arrow" aria-hidden>→</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="vt-shell tab-content-enter">
      <div className="vt-pit-hero vt-pit-hero-spectate">
        <div className="vt-pit-hero-top">
          <div>
            <p className="vt-spectate-kicker">{isSpectating ? 'Spectator deck' : 'Your pit'}</p>
            <h2 className="vt-pit-hero-name">{vaultContest.title}</h2>
            <p className="vt-pit-hero-meta">
              {vaultPlayerCount} traders
              {pool > 0 && <> · ${pool.toLocaleString()} pool</>}
              {hydrated && vaultContest.endsAt && (
                <>
                  {' '}
                  · <BellCountdown contest={vaultContest} tick={bellTick} />
                </>
              )}
            </p>
          </div>
          {isLive && (
            <span className="vt-pit-live">
              <span className="vt-pit-live-dot" aria-hidden />
              Live
            </span>
          )}
        </div>
      </div>

      {isSpectating && onJoinPit && (
        <button type="button" className="vt-spectate-join btn btn-primary w-full py-3 text-sm mb-4" onClick={onJoinPit}>
          Ring in — ${vaultContest.entryFee} · join the tape
        </button>
      )}

      {isLive && (
        <div className="vt-feed-wrap vt-feed-wrap-prominent">
          <PitFeed items={pitFeedItems} contestTitle={vaultContest.title} loading={pitFeedLoading} />
        </div>
      )}

      {!isSpectating && (() => {
        const you = dynamicVault.find((e) => e.isYou);
        if (!you) return null;
        return (
          <div className="vt-you-pin">
            <span className="vt-you-pin-label">Your position</span>
            <span className="vt-you-pin-rank">#{you.rank}</span>
            <span className="vt-you-pin-value">${you.portfolioValue.toLocaleString()}</span>
          </div>
        );
      })()}

      {dynamicVault.length === 0 ? (
        <div className="vt-empty">
          <p className="vt-empty-copy">Waiting for traders on the tape…</p>
        </div>
      ) : (
        <PitLeaderboardPanel entries={dynamicVault} contest={vaultContest} yourValue={yourValue} />
      )}

      {!isLive && activeJoined.length === 0 && (
        <p className="vt-spectate-hint text-center text-xs text-muted mt-4">
          Ring in on Arena to climb this board.
        </p>
      )}

      <button type="button" className="vt-refresh-link" onClick={onRefreshPit}>
        Refresh rankings
      </button>
    </div>
  );
}