'use client';

import React from 'react';
import { BellCountdown } from './BellCountdown';
import PitFeed, { type PitFeedItem } from './PitFeed';
import PitLeaderboardPanel from './PitLeaderboardPanel';
import { Contest, LeaderboardEntry } from '../lib/game-types';
import { isContestTradingOpen } from '../lib/contest-bell';
import { formatVaultPitPickerLabel } from '../lib/pit-contests';

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
  onSelectVaultContest: (contestId: number) => void;
  onRefreshPit: () => void;
  onGoArena: () => void;
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
  onSelectVaultContest,
  onRefreshPit,
  onGoArena,
}: VaultTabProps) {
  const yourValue = dynamicVault.find((e) => e.isYou)?.portfolioValue || bestPortfolioValue;
  const activeJoined = joinedContests.filter((id) => {
    const c = contests.find((x) => x.id === id);
    return c && c.status !== 'closed';
  });

  return (
    <div className="vt-shell tab-content-enter">
      {!vaultContest || activeJoined.length === 0 ? (
        <div className="vt-empty">
          <p className="vt-empty-title">No live pit to watch</p>
          <p className="vt-empty-copy">
            Ring in on Arena — your pit leaderboard shows here while you trade.
          </p>
          <button type="button" className="bt-arena-link bt-arena-link-spaced" onClick={onGoArena}>
            <span>Join today&apos;s pit</span>
            <span className="bt-arena-link-arrow" aria-hidden>→</span>
          </button>
        </div>
      ) : (
        <>
          <div className="vt-pit-hero">
            <div className="vt-pit-hero-top">
              <div>
                <h2 className="vt-pit-hero-name">{vaultContest.title}</h2>
                <p className="vt-pit-hero-meta">
                  {vaultPlayerCount} traders · ${vaultContest.entryFee} entry
                  {hydrated && vaultContest.endsAt && (
                    <>
                      {' '}
                      ·{' '}
                      <BellCountdown contest={vaultContest} tick={bellTick} />
                    </>
                  )}
                </p>
              </div>
              {vaultContest && isContestTradingOpen(vaultContest) && (
                <span className="vt-pit-live">
                  <span className="vt-pit-live-dot" aria-hidden />
                  Live
                </span>
              )}
            </div>
          </div>

          {activeJoined.length > 1 && (
            <div className="vt-pit-picker">
              {activeJoined.map((id) => {
                const c = contests.find((x) => x.id === id);
                const active = activeVaultContestId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectVaultContest(id)}
                    className={`vt-pit-pill ${active ? 'vt-pit-pill-on' : ''}`}
                  >
                    {c ? formatVaultPitPickerLabel(c) : `Pit ${id}`}
                  </button>
                );
              })}
            </div>
          )}

          {(() => {
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
            <PitLeaderboardPanel
              entries={dynamicVault}
              contest={vaultContest}
              yourValue={yourValue}
            />
          )}

          {activeVaultContestId && joinedContests.includes(activeVaultContestId) && (
            <div className="vt-feed-wrap">
              <p className="vt-feed-label">Pit feed</p>
              <PitFeed
                items={pitFeedItems}
                contestTitle={vaultContest.title}
                loading={pitFeedLoading}
              />
            </div>
          )}

          <button type="button" className="vt-refresh-link" onClick={onRefreshPit}>
            Refresh rankings
          </button>
        </>
      )}
    </div>
  );
}