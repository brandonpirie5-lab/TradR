'use client';

import React from 'react';
import { Info } from 'lucide-react';
import { Contest, LeaderboardEntry } from '../lib/game-types';
import { DAILY_ENTRY_FEE, DAILY_MAX_ENTRIES } from '../lib/daily-pit-config';
import { getCurrentDailyPitWindow, formatDailyPitScheduleLabel } from '../lib/daily-pit-schedule';
import { computeEffectivePool, computeMaxPaidRank } from '../lib/pit-pool-math';
import { getPitFillStatus } from '../lib/contest-fill';
import { pitActionLabel } from '../lib/pit-cta';
import { isContestTradingOpen } from '../lib/contest-bell';
import ArenaCountdownRing from './ArenaCountdownRing';
import OpeningBellStreakBadge from './OpeningBellStreakBadge';
import TomorrowPitBanner from './TomorrowPitBanner';
import ArenaTapeLeaders from './ArenaTapeLeaders';
import type { ArenaPitItem } from './ArenaHome';

type DailyPitEventHeroProps = {
  item: ArenaPitItem;
  isJoined: boolean;
  participantCount: number;
  bellTick: number;
  hydrated: boolean;
  board: LeaderboardEntry[];
  liveStats?: { liveValue: number; pnlPct: number; rank: number | null } | null;
  onInfo: () => void;
  onEnter: () => void;
  onViewLeaderboard?: () => void;
  isLoggedIn?: boolean;
  onWatchTape?: () => void;
  onShowHowItWorks?: () => void;
};

export default function DailyPitEventHero({
  item,
  isJoined,
  participantCount,
  bellTick,
  hydrated,
  board,
  liveStats,
  onInfo,
  onEnter,
  onViewLeaderboard,
  isLoggedIn = false,
  onWatchTape,
  onShowHowItWorks,
}: DailyPitEventHeroProps) {
  const { contest, scheduled } = item;
  const phase = getCurrentDailyPitWindow().phase;
  const fill = getPitFillStatus(contest, participantCount);
  const tradingOpen = isContestTradingOpen(contest);
  const poolLive = computeEffectivePool(contest.slug, {
    entryFee: contest.entryFee || DAILY_ENTRY_FEE,
    participantCount: Math.max(participantCount, fill.minEntries),
  });
  const paid = computeMaxPaidRank(contest.slug, Math.max(participantCount, fill.minEntries));
  const spotsLeft = Math.max(0, DAILY_MAX_ENTRIES - participantCount);

  const statusLine = (() => {
    if (participantCount >= fill.minEntries) {
      return (
        <>
          <strong>{participantCount}</strong> in · <strong>${poolLive.toLocaleString()}</strong> pool · top{' '}
          <strong>{paid}</strong> paid · {spotsLeft} spots left
        </>
      );
    }
    return (
      <>
        <strong>{participantCount}/{fill.minEntries}</strong> to unlock ${poolLive.toLocaleString()} pool ·{' '}
        {spotsLeft} spots left
      </>
    );
  })();

  const primaryLabel = pitActionLabel({
    isJoined,
    isTradingOpen: tradingOpen,
    entryFee: contest.entryFee,
    scheduled,
  });

  return (
    <section className="dp-poster" data-tour="arena-hero">
      <div className="dp-poster-head">
        <div className="dp-poster-head-text">
          <h1 className="dp-poster-title">$5 in · top half cash</h1>
          <p className="dp-poster-sub">
            Trade {contest.assets.slice(0, 5).join(' · ')} — one pit, {formatDailyPitScheduleLabel().toLowerCase()}
          </p>
          <OpeningBellStreakBadge useServer={isLoggedIn} className="mt-2" />
        </div>
        <button type="button" onClick={onInfo} className="at-info-btn" aria-label="How it works">
          <Info size={14} />
        </button>
      </div>

      <div
        className={`dp-poster-card ${phase === 'live' && tradingOpen ? 'dp-poster-card-live' : ''} ${isJoined ? 'dp-poster-card-joined' : ''}`}
      >
        <div className="dp-poster-ring-wrap">
          <ArenaCountdownRing
            contest={contest}
            scheduled={scheduled}
            tick={bellTick}
            urgent={phase === 'live'}
            size="lg"
            variant="af"
          />
        </div>

        <p className="dp-poster-status" role="status">
          {statusLine}
        </p>

        {isJoined && liveStats && tradingOpen && (
          <div className="dp-poster-ticket">
            <span className="dp-poster-ticket-rank">#{liveStats.rank ?? '—'}</span>
            <span className="dp-poster-ticket-val">${liveStats.liveValue.toLocaleString()}</span>
            <span className={liveStats.pnlPct >= 0 ? 'dp-poster-ticket-up' : 'dp-poster-ticket-down'}>
              {liveStats.pnlPct >= 0 ? '+' : ''}
              {liveStats.pnlPct.toFixed(1)}%
            </span>
          </div>
        )}

        <div className="dp-poster-actions">
          <button type="button" onClick={onEnter} className="at-cta dp-poster-cta-primary">
            {primaryLabel}
          </button>
          {!isLoggedIn && onWatchTape && (
            <button type="button" onClick={onWatchTape} className="dp-poster-cta-secondary">
              Watch live
            </button>
          )}
        </div>
      </div>

      {phase === 'between' && !isJoined && (
        <TomorrowPitBanner
          isJoined={false}
          participantCount={participantCount}
          hydrated={hydrated}
          onRingIn={onEnter}
        />
      )}

      {isJoined && !tradingOpen && (scheduled || phase === 'pre_open') && (
        <p className="dp-poster-locked">
          Spot locked — ticket in <strong>Battles → Upcoming</strong>. Trading opens at the bell.
        </p>
      )}

      {board.length >= 2 && isJoined && onViewLeaderboard && (
        <ArenaTapeLeaders contest={contest} entries={board} onViewAll={onViewLeaderboard} />
      )}

      {onShowHowItWorks && (
        <button type="button" className="dp-poster-how" onClick={onShowHowItWorks}>
          How it works
        </button>
      )}
    </section>
  );
}