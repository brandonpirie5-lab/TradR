'use client';

import React from 'react';
import { Info } from 'lucide-react';
import { Contest, LeaderboardEntry } from '../lib/game-types';
import { DAILY_ASSETS, DAILY_ENTRY_FEE, DAILY_MAX_ENTRIES } from '../lib/daily-pit-config';
import { getCurrentDailyPitWindow, formatDailyPitScheduleLabel } from '../lib/daily-pit-schedule';
import { computeEffectivePool, computeMaxPaidRank } from '../lib/pit-pool-math';
import { getPitFillStatus } from '../lib/contest-fill';
import { pitActionLabel } from '../lib/pit-cta';
import { isContestTradingOpen } from '../lib/contest-bell';
import ArenaCountdownRing from './ArenaCountdownRing';
import PitFillBanner from './PitFillBanner';
import DailyStreakBadge from './DailyStreakBadge';
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
}: DailyPitEventHeroProps) {
  const { contest, scheduled } = item;
  const phase = getCurrentDailyPitWindow().phase;
  const fill = getPitFillStatus(contest, participantCount);
  const pool = computeEffectivePool(contest.slug, {
    entryFee: contest.entryFee || DAILY_ENTRY_FEE,
    participantCount: Math.max(participantCount, fill.minEntries),
  });
  const maxPool = computeEffectivePool(contest.slug, {
    entryFee: contest.entryFee || DAILY_ENTRY_FEE,
    participantCount: DAILY_MAX_ENTRIES,
  });
  const paid = computeMaxPaidRank(contest.slug, Math.max(participantCount, fill.minEntries));
  const tradingOpen = isContestTradingOpen(contest);
  const fillPct = Math.min(100, Math.round((participantCount / DAILY_MAX_ENTRIES) * 100));

  const phaseLabel =
    phase === 'live' && tradingOpen
      ? 'LIVE ON THE FLOOR'
      : phase === 'pre_open' || scheduled
        ? 'RING IN EARLY'
        : 'BETWEEN BELLS';

  return (
    <section className="dp-event-hero" data-tour="arena-hero">
      <div className="dp-event-top">
        <div>
          <p className="dp-event-kicker">Today&apos;s only pit</p>
          <DailyStreakBadge className="mt-2" />
        </div>
        <button type="button" onClick={onInfo} className="at-info-btn" aria-label="Contest info">
          <Info size={14} />
        </button>
      </div>

      <div className={`dp-event-poster ${phase === 'live' && tradingOpen ? 'dp-event-poster-live' : ''}`}>
        <div className="dp-event-poster-glow" aria-hidden />
        <div className="dp-event-phase">
          <span className={`dp-event-phase-dot ${phase === 'live' && tradingOpen ? 'dp-event-phase-dot-live' : ''}`} />
          {phaseLabel}
        </div>

        <div className="dp-event-pool-block">
          <div className="dp-event-pool-label">Live prize pool</div>
          <div className="dp-event-pool-amount">
            ${participantCount >= fill.minEntries ? pool.toLocaleString() : '—'}
          </div>
          <div className="dp-event-pool-sub">
            {participantCount > 0 && participantCount < fill.minEntries
              ? `Fills at ${fill.minEntries} traders · $${computeEffectivePool(contest.slug, { entryFee: DAILY_ENTRY_FEE, participantCount: fill.minEntries }).toLocaleString()}`
              : `Top ${paid || '—'} split the pot · $${DAILY_ENTRY_FEE} entry`}
          </div>
        </div>

        <div className="dp-event-ring-row">
          <ArenaCountdownRing
            contest={contest}
            scheduled={scheduled}
            tick={bellTick}
            urgent={phase === 'live'}
            size="lg"
            variant="af"
          />
          <div className="dp-event-ring-copy">
            <div className="dp-event-title">{contest.title}</div>
            <div className="dp-event-schedule">{formatDailyPitScheduleLabel()}</div>
            <div className="dp-event-cap">
              Room: {participantCount}/{DAILY_MAX_ENTRIES} · up to ${maxPool.toLocaleString()} today
            </div>
          </div>
        </div>

        <div className="dp-event-fill-bar" aria-hidden>
          <div className="dp-event-fill-track">
            <div className="dp-event-fill-progress" style={{ width: `${fillPct}%` }} />
          </div>
          <div className="dp-event-fill-labels">
            <span>{participantCount} traders</span>
            <span>Full house ${maxPool.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <PitFillBanner fill={fill} className="mt-3" />

      {isJoined && liveStats && (
        <div className="dp-event-your-ticket">
          <span className="dp-event-your-kicker">Your ticket</span>
          <span className="dp-event-your-rank">#{liveStats.rank ?? '—'}</span>
          <span className="dp-event-your-value">${liveStats.liveValue.toLocaleString()}</span>
          <span className={liveStats.pnlPct >= 0 ? 'dp-event-your-pnl-up' : 'dp-event-your-pnl-down'}>
            {liveStats.pnlPct >= 0 ? '+' : ''}
            {liveStats.pnlPct.toFixed(1)}%
          </span>
        </div>
      )}

      <button type="button" onClick={onEnter} className="at-cta dp-event-cta">
        {pitActionLabel({ isJoined, isTradingOpen: tradingOpen, entryFee: contest.entryFee })}
      </button>

      <p className="dp-event-tape">Tape: {DAILY_ASSETS.join(' · ')}</p>

      {board.length >= 2 && onViewLeaderboard && (
        <ArenaTapeLeaders contest={contest} entries={board} onViewAll={onViewLeaderboard} />
      )}
    </section>
  );
}