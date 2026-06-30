'use client';

import React from 'react';
import SegmentedControl from './SegmentedControl';
import { BellCountdown } from './BellCountdown';
import PitFeed, { type PitFeedItem } from './PitFeed';
import PitLeaderboardPanel from './PitLeaderboardPanel';
import TapeWeekLeaderboard from './TapeWeekLeaderboard';
import {
  Contest,
  GlobalLeaderboardEntry,
  GlobalLeaderboardMetric,
  GlobalLeaderboardPeriod,
  LeaderboardEntry,
  TapeLeaderboardEntry,
} from '../lib/game-types';
import { isContestTradingOpen } from '../lib/contest-bell';
import { formatVaultPitPickerLabel } from '../lib/pit-contests';
type VaultTabProps = {
  vaultMode: 'pit' | 'global' | 'tape';
  onVaultModeChange: (mode: 'pit' | 'global' | 'tape') => void;
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
  tapeLeaderboard: TapeLeaderboardEntry[];
  tapeThemeLine: string;
  tapeLoading: boolean;
  onRefreshTape: () => void;
  globalPeriod: GlobalLeaderboardPeriod;
  globalMetric: GlobalLeaderboardMetric;
  globalLeaderboard: GlobalLeaderboardEntry[];
  globalLoading: boolean;
  onGlobalPeriodChange: (period: GlobalLeaderboardPeriod) => void;
  onGlobalMetricChange: (metric: GlobalLeaderboardMetric) => void;
  onSelectVaultContest: (contestId: number) => void;
  onRefreshPit: () => void;
  onGoArena: () => void;
};

export default function VaultTab({
  vaultMode,
  onVaultModeChange,
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
  tapeLeaderboard,
  tapeThemeLine,
  tapeLoading,
  onRefreshTape,
  globalPeriod,
  globalMetric,
  globalLeaderboard,
  globalLoading,
  onGlobalPeriodChange,
  onGlobalMetricChange,
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
      <SegmentedControl
        className="mb-4"
        value={vaultMode}
        onChange={onVaultModeChange}
        options={[
          { id: 'pit', label: 'LIVE PIT' },
          { id: 'tape', label: 'TAPE WEEK' },
          { id: 'global', label: 'GLOBAL' },
        ]}
      />

      {vaultMode === 'pit' && (
        <>
          {!vaultContest || activeJoined.length === 0 ? (
            <div className="vt-empty">
              <p className="vt-empty-title">No live pit to watch</p>
              <p className="vt-empty-copy">
                Ring in on Arena — your pit leaderboard and tape feed show here while you trade.
              </p>
              <button type="button" className="bt-arena-link bt-arena-link-spaced" onClick={onGoArena}>
                <span>Join a pit in Arena</span>
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
                      {vaultPlayerCount} traders on the floor
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
        </>
      )}

      {vaultMode === 'tape' && (
        <>
          <p className="vt-floor-line">Weekly tape — who&apos;s running hot</p>
          <TapeWeekLeaderboard entries={tapeLeaderboard} themeLine={tapeThemeLine} loading={tapeLoading} />
          <button type="button" className="vt-refresh-link" onClick={onRefreshTape}>
            Refresh tape rankings
          </button>
        </>
      )}

      {vaultMode === 'global' && (
        <>
          <p className="vt-floor-line">Hall of legends</p>
          <SegmentedControl
            className="mb-3"
            value={globalPeriod}
            onChange={onGlobalPeriodChange}
            options={[
              { id: 'all', label: 'ALL-TIME' },
              { id: 'week', label: 'WEEKLY' },
            ]}
          />
          <div className="vt-global-metric-row">
            {(
              [
                { id: 'winnings' as const, label: 'Winnings' },
                { id: 'wins' as const, label: 'Wins' },
                { id: 'win_rate' as const, label: 'Win %' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onGlobalMetricChange(m.id)}
                className={`vt-global-metric ${globalMetric === m.id ? 'vt-global-metric-on' : ''}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {globalLoading ? (
            <div className="vt-empty">
              <p className="vt-empty-copy">Loading global rankings…</p>
            </div>
          ) : globalLeaderboard.length === 0 ? (
            <div className="vt-empty">
              <p className="vt-empty-title">Board is empty</p>
              <p className="vt-empty-copy">Finish a pit and claim your spot on the hall.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {globalLeaderboard.map((entry) => (
                <div
                  key={entry.userId}
                  className={`vt-global-row ${entry.isYou ? 'vt-global-row-you' : ''}`}
                >
                  <span
                    className={`vt-global-rank ${entry.rank <= 3 ? 'vt-global-rank-top' : ''}`}
                  >
                    #{entry.rank}
                  </span>
                  <div className="vt-global-user">
                    <div className="vt-global-name">
                      {entry.username}
                      {entry.isYou ? <span className="text-accent text-[10px]"> · you</span> : null}
                    </div>
                    {entry.contests != null && (
                      <div className="vt-global-sub">
                        {entry.contests} battles · {entry.wins} wins
                      </div>
                    )}
                  </div>
                  <span className="vt-global-value">
                    {globalMetric === 'win_rate'
                      ? `${entry.value}%`
                      : globalMetric === 'wins'
                        ? entry.value
                        : `$${entry.value.toLocaleString()}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}