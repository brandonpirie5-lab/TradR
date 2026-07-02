'use client';

import React from 'react';
import { Info, Radio } from 'lucide-react';
import { Contest, LeaderboardEntry } from '../lib/game-types';
import { DAILY_ASSETS, DAILY_ENTRY_FEE, DAILY_MAX_ENTRIES } from '../lib/daily-pit-config';
import {
  getCurrentDailyPitWindow,
  formatDailyPitScheduleLabel,
  formatDailyPitPhaseLabel,
  msUntilDailyPitOpen,
} from '../lib/daily-pit-schedule';
import { computeEffectivePool, computeMaxPaidRank } from '../lib/pit-pool-math';
import { getPitFillStatus } from '../lib/contest-fill';
import { pitActionLabel } from '../lib/pit-cta';
import { formatBellCountdown, isContestTradingOpen } from '../lib/contest-bell';
import ArenaCountdownRing from './ArenaCountdownRing';
import OpeningBellStreakBadge from './OpeningBellStreakBadge';
import ArenaTapeLeaders from './ArenaTapeLeaders';
import PitMoneyDisplay from './PitMoneyDisplay';

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

function floorPhaseMeta(
  phase: ReturnType<typeof getCurrentDailyPitWindow>['phase'],
  tradingOpen: boolean,
  scheduled: boolean
): { ribbon: string; tone: 'live' | 'open' | 'closed' } {
  if (phase === 'live' && tradingOpen) return { ribbon: 'LIVE ON THE FLOOR', tone: 'live' };
  if (phase === 'between') return { ribbon: 'BETWEEN BELLS', tone: 'closed' };
  if (scheduled || phase === 'pre_open') return { ribbon: 'RING-IN OPEN', tone: 'open' };
  return { ribbon: 'THE DAILY PIT', tone: 'open' };
}

function countdownCaption(scheduled: boolean, tradingOpen: boolean, phase: string): string {
  if (phase === 'between') return 'Next bell';
  if (scheduled) return 'Opens in';
  if (tradingOpen) return 'Closes in';
  return 'Status';
}

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
}: DailyPitEventHeroProps) {
  const { contest, scheduled } = item;
  const phase = getCurrentDailyPitWindow().phase;
  const fill = getPitFillStatus(contest, participantCount);
  const tradingOpen = isContestTradingOpen(contest);
  const { ribbon, tone } = floorPhaseMeta(phase, tradingOpen, scheduled);
  const poolLive = computeEffectivePool(contest.slug, {
    entryFee: contest.entryFee || DAILY_ENTRY_FEE,
    participantCount: Math.max(participantCount, fill.minEntries),
  });
  const paid = computeMaxPaidRank(contest.slug, Math.max(participantCount, fill.minEntries));
  const spotsLeft = Math.max(0, DAILY_MAX_ENTRIES - participantCount);
  const fillPct = Math.min(100, (participantCount / fill.minEntries) * 100);
  const betweenOpenMs = phase === 'between' ? msUntilDailyPitOpen() : 0;

  const primaryLabel = pitActionLabel({
    isJoined,
    isTradingOpen: tradingOpen,
    entryFee: contest.entryFee,
    scheduled,
  });

  const showTicket = isJoined && liveStats && tradingOpen;
  const showTape = board.length >= 1 && onViewLeaderboard;

  return (
    <section className="pit-floor" data-tour="arena-hero">
      <div className={`pit-floor-ribbon pit-floor-ribbon-${tone}`}>
        <div className="pit-floor-ribbon-left">
          {tone === 'live' && <Radio size={12} className="pit-floor-ribbon-icon" aria-hidden />}
          <span className="pit-floor-ribbon-label">{ribbon}</span>
        </div>
        <span className="pit-floor-ribbon-meta">
          {participantCount > 0 ? (
            <>
              <strong>{participantCount}</strong> on the floor
            </>
          ) : (
            'Floor empty'
          )}
        </span>
      </div>

      <div
        className={`pit-floor-stage ${tone === 'live' ? 'pit-floor-stage-live' : ''} ${isJoined ? 'pit-floor-stage-joined' : ''}`}
      >
        <div className="pit-floor-stage-glow" aria-hidden />

        <div className="pit-floor-head">
          <div>
            <p className="pit-floor-kicker">The daily day-trading pit</p>
            <p className="pit-floor-hook">One bell · top half cash · {formatDailyPitScheduleLabel()}</p>
          </div>
          <button type="button" onClick={onInfo} className="at-info-btn" aria-label="How it works">
            <Info size={14} />
          </button>
        </div>

        <div className="pit-floor-money">
          <PitMoneyDisplay
            slug={contest.slug}
            totalPrizes={poolLive}
            entryFee={contest.entryFee || DAILY_ENTRY_FEE}
            participantCount={participantCount}
            variant="hero"
            showChip={false}
          />
        </div>

        <div className="pit-floor-assets" aria-label="Tradable assets">
          {DAILY_ASSETS.map((sym) => (
            <span key={sym} className="pit-floor-asset">
              {sym}
            </span>
          ))}
        </div>

        <div className="pit-floor-fill">
          <div className="pit-floor-fill-track" role="progressbar" aria-valuenow={participantCount} aria-valuemin={0} aria-valuemax={fill.minEntries}>
            <div
              className={`pit-floor-fill-bar ${fill.isConfirmed ? 'pit-floor-fill-bar-ok' : ''}`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
          <span className="pit-floor-fill-copy">
            {fill.isConfirmed ? (
              <>
                Pit runs · top <strong>{paid}</strong> paid · <strong>{spotsLeft}</strong> spots left
              </>
            ) : (
              <>
                <strong>{participantCount}/{fill.minEntries}</strong> to run · ${poolLive.toLocaleString()} unlocks at min
              </>
            )}
          </span>
        </div>

        <div className="pit-floor-clock">
          <ArenaCountdownRing
            contest={contest}
            scheduled={scheduled || phase === 'between'}
            tick={bellTick}
            urgent={tone === 'live'}
            size="lg"
            variant="af"
          />
          <div className="pit-floor-clock-copy">
            <span className="pit-floor-clock-label">
              {countdownCaption(scheduled, tradingOpen, phase)}
            </span>
            <span className="pit-floor-clock-phase">{formatDailyPitPhaseLabel(phase)}</span>
            {phase === 'between' && hydrated && betweenOpenMs > 0 && (
              <span className="pit-floor-clock-sub">{formatBellCountdown(betweenOpenMs)} to ring-in</span>
            )}
          </div>
        </div>

        {showTicket && (
          <div className="pit-floor-ticket">
            <div className="pit-floor-ticket-rank">
              <span className="pit-floor-ticket-rank-lbl">Your rank</span>
              <span className="pit-floor-ticket-rank-val">#{liveStats!.rank ?? '—'}</span>
            </div>
            <div className="pit-floor-ticket-mid">
              <span className="pit-floor-ticket-val">${liveStats!.liveValue.toLocaleString()}</span>
              <span className="pit-floor-ticket-lbl">portfolio</span>
            </div>
            <div className={`pit-floor-ticket-pnl ${liveStats!.pnlPct >= 0 ? 'up' : 'down'}`}>
              {liveStats!.pnlPct >= 0 ? '+' : ''}
              {liveStats!.pnlPct.toFixed(1)}%
            </div>
          </div>
        )}

        {isJoined && !tradingOpen && (scheduled || phase === 'pre_open') && (
          <p className="pit-floor-locked">
            You&apos;re in — ticket in <strong>Battles → Upcoming</strong> until the bell.
          </p>
        )}

        <div className="pit-floor-actions">
          <button type="button" onClick={onEnter} className="pit-floor-cta">
            {primaryLabel}
          </button>
          {!isLoggedIn && onWatchTape && (
            <button type="button" onClick={onWatchTape} className="pit-floor-cta-ghost">
              Watch the tape live
            </button>
          )}
        </div>
      </div>

      <div className="pit-floor-tape">
        <div className="pit-floor-tape-head">
          <span className="pit-floor-tape-title">The tape</span>
          {showTape && (
            <button type="button" className="pit-floor-tape-link" onClick={onViewLeaderboard}>
              Full board →
            </button>
          )}
        </div>

        {showTape ? (
          <ArenaTapeLeaders contest={contest} entries={board} onViewAll={onViewLeaderboard!} bare />
        ) : (
          <div className="pit-floor-tape-empty">
            {participantCount > 0 ? (
              <p>Traders are ringing in — board loads at the bell.</p>
            ) : (
              <>
                <p className="pit-floor-tape-empty-hero">Be trader #1 on the floor.</p>
                <p className="pit-floor-tape-empty-sub">
                  ${DAILY_ENTRY_FEE} in · virtual $100k · beat the room · take the pool.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <OpeningBellStreakBadge useServer={isLoggedIn} className="pit-floor-streak" />

      {phase === 'between' && !isJoined && (
        <button type="button" className="pit-floor-early" onClick={onEnter}>
          <span className="pit-floor-early-kicker">Tomorrow&apos;s pit</span>
          <span className="pit-floor-early-copy">Ring in early · lock ${DAILY_ENTRY_FEE} before the room fills</span>
        </button>
      )}
    </section>
  );
}