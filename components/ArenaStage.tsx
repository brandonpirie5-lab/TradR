'use client';

import React from 'react';
import { ArrowRight, Info } from 'lucide-react';
import { Contest } from '../lib/game-types';
import { bellMsRemaining } from '../lib/contest-bell';
import ArenaCountdownRing from './ArenaCountdownRing';

type ArenaStageProps = {
  contest: Contest;
  scheduled: boolean;
  isJoined: boolean;
  rank?: number | null;
  liveValue?: number;
  pnlPct?: number;
  participantCount: number;
  bellTick: number;
  hydrated: boolean;
  isTradingOpen: boolean;
  onInfo: () => void;
  onPrimary: () => void;
};

export default function ArenaStage({
  contest,
  scheduled,
  isJoined,
  rank,
  liveValue,
  pnlPct,
  participantCount,
  bellTick,
  hydrated,
  isTradingOpen,
  onInfo,
  onPrimary,
}: ArenaStageProps) {
  const ms = hydrated ? bellMsRemaining(contest) : null;
  const urgent = ms != null && ms < 300_000;
  const portfolio = contest.startingPortfolioValue || 100_000;

  const primaryLabel = scheduled
    ? contest.entryFee === 0
      ? 'Ring in free'
      : `Ring in · $${contest.entryFee}`
    : !isJoined
      ? contest.entryFee === 0
        ? 'Enter the pit'
        : `Enter · $${contest.entryFee}`
      : isTradingOpen
        ? 'Trade now'
        : 'Rang in';

  return (
    <section
      key={contest.id}
      className={`pit-stage pit-stage-poster pit-stage-enter ${urgent && !scheduled ? 'pit-stage-urgent' : ''}`}
      data-tour="arena-hero"
    >
      <div className="pit-stage-border-glow" aria-hidden />
      <div className="pit-stage-mesh" aria-hidden />
      <div className="pit-stage-grain" aria-hidden />

      <div className="pit-stage-body">
        <div className="pit-poster-top">
          {scheduled ? (
            <span className="pit-poster-status pit-poster-status-soon">Opens soon</span>
          ) : (
            <span className="pit-poster-status pit-poster-status-live">
              <span className="pit-live-orb" />
              Live
            </span>
          )}
          {contest.badge && <span className="pit-eyebrow-badge">{contest.badge}</span>}
        </div>

        <div className="pit-prize-hero">${contest.firstPrize.toLocaleString()}</div>
        <div className="pit-prize-hero-sub">
          1st prize · ${contest.totalPrizes.toLocaleString()} pool
        </div>

        <h1 className="pit-poster-title">{contest.title}</h1>
        {contest.tagline && <p className="pit-poster-tagline">{contest.tagline}</p>}

        <div className="pit-poster-ring">
          <ArenaCountdownRing
            contest={contest}
            scheduled={scheduled}
            tick={bellTick}
            urgent={urgent}
            size="lg"
          />
        </div>

        <div className="pit-chips">
          <span className="pit-chip">
            {contest.entryFee === 0 ? 'Free entry' : `$${contest.entryFee} entry`}
          </span>
          <span className="pit-chip">{participantCount} traders</span>
          <span className="pit-chip">${portfolio.toLocaleString()} start</span>
        </div>

        {contest.assets.length > 0 && (
          <p className="pit-assets-line">{contest.assets.slice(0, 7).join(' · ')}</p>
        )}

        {isJoined && liveValue != null && (
          <div className="pit-you-dock">
            <div className="pit-you-dock-main">
              {rank && <span className="pit-you-rank">#{rank}</span>}
              <span className="pit-you-value">${liveValue.toLocaleString()}</span>
              {pnlPct != null && (
                <span className={pnlPct >= 0 ? 'pit-you-up' : 'pit-you-down'}>
                  {pnlPct >= 0 ? '+' : ''}
                  {pnlPct.toFixed(1)}%
                </span>
              )}
            </div>
            {isTradingOpen && <span className="pit-you-hint">Tap below to trade</span>}
          </div>
        )}

        <button type="button" onClick={onPrimary} className="pit-cta-clean">
          <span>{primaryLabel}</span>
          <ArrowRight size={17} strokeWidth={2.5} />
        </button>

        <button type="button" onClick={onInfo} className="pit-details-minimal" data-tour="contest-info">
          <Info size={12} />
          Contest details
        </button>
      </div>
    </section>
  );
}