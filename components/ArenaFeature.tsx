'use client';

import React from 'react';
import { ArrowRight, Info } from 'lucide-react';
import { Contest } from '../lib/game-types';
import { bellMsRemaining } from '../lib/contest-bell';
import { getContestTapeInfo, getTodayTheme, isFeaturedPit } from '../lib/tape-week';
import { BellCountdown } from './BellCountdown';
import ArenaCountdownRing from './ArenaCountdownRing';

type ArenaFeatureProps = {
  contest: Contest;
  scheduled: boolean;
  isJoined: boolean;
  rank?: number | null;
  liveValue?: number;
  pnlPct?: number;
  participantCount: number;
  bellTick: number;
  hydrated: boolean;
  isBellOpen: boolean;
  isTradingOpen: boolean;
  onInfo: () => void;
  onPrimary: () => void;
};

export default function ArenaFeature({
  contest,
  scheduled,
  isJoined,
  rank,
  liveValue,
  pnlPct,
  participantCount,
  bellTick,
  hydrated,
  isBellOpen,
  isTradingOpen,
  onInfo,
  onPrimary,
}: ArenaFeatureProps) {
  const ms = hydrated ? bellMsRemaining(contest) : null;
  const urgent = ms != null && ms < 300_000;
  const portfolio = contest.startingPortfolioValue || 100_000;
  const dayIndex = new Date().getDay();
  const todayTheme = getTodayTheme();
  const featured = isFeaturedPit(contest.slug, dayIndex);
  const tapeInfo = getContestTapeInfo(contest.slug, dayIndex);

  const ctaLabel = scheduled
    ? contest.entryFee === 0
      ? 'Ring in — free'
      : `Ring in — $${contest.entryFee}`
    : !isJoined
      ? contest.entryFee === 0
        ? 'Enter the pit'
        : `Enter — $${contest.entryFee}`
      : isTradingOpen
        ? 'Open ticket'
        : 'Rang in';

  return (
    <article
      key={contest.id}
      className={`af-feature ${urgent && !scheduled ? 'af-feature-urgent' : ''}`}
      data-tour="arena-hero"
    >
      <div className="af-feature-aurora" aria-hidden />
      <div className="af-feature-border" aria-hidden />

      <div className="af-feature-inner">
        <header className="af-feature-head">
          <div className="af-feature-live">
            {scheduled ? (
              <span className="af-badge af-badge-soon">Opens soon</span>
            ) : (
              <>
                <span className="af-live-dot" aria-hidden />
                <span className="af-live-text">Live</span>
                {hydrated && isBellOpen && (
                  <span className="af-live-clock">
                    <BellCountdown contest={contest} tick={bellTick} prefix="" placeholder="—" openText="Open" />
                  </span>
                )}
              </>
            )}
            {featured === 'main' && <span className="af-badge af-badge-main">Main event</span>}
            {featured === 'co' && <span className="af-badge af-badge-co">Co-main</span>}
            {contest.badge && <span className="af-badge">{contest.badge}</span>}
          </div>
          <button
            type="button"
            onClick={onInfo}
            className="af-info-btn"
            data-tour="contest-info"
            aria-label="Contest details"
          >
            <Info size={15} />
          </button>
        </header>

        <div className="af-prize-zone">
          <div className="af-prize-label">First prize</div>
          <div className="af-prize">${contest.firstPrize.toLocaleString()}</div>
          <div className="af-prize-pool">${contest.totalPrizes.toLocaleString()} total pool</div>
        </div>

        <h1 className="af-title">{contest.title}</h1>
        {contest.tagline && <p className="af-tagline">{contest.tagline}</p>}
        {tapeInfo && (
          <p className="af-tape-line">
            <span className="af-tape-day">{todayTheme.word} tape</span>
            <span className="af-tape-sep">·</span>
            <span className="af-tape-pool">{tapeInfo.poolLabel}</span>
          </p>
        )}

        <div className="af-ring-wrap">
          <ArenaCountdownRing
            contest={contest}
            scheduled={scheduled}
            tick={bellTick}
            urgent={urgent}
            size="md"
            variant="af"
          />
        </div>

        <div className="af-stats">
          <div className="af-stat">
            <span className="af-stat-val">{contest.entryFee === 0 ? 'Free' : `$${contest.entryFee}`}</span>
            <span className="af-stat-key">Entry</span>
          </div>
          <div className="af-stat-div" />
          <div className="af-stat">
            <span className="af-stat-val">{participantCount}</span>
            <span className="af-stat-key">Traders</span>
          </div>
          <div className="af-stat-div" />
          <div className="af-stat">
            <span className="af-stat-val">${(portfolio / 1000).toFixed(0)}K</span>
            <span className="af-stat-key">Start</span>
          </div>
        </div>

        {contest.assets.length > 0 && (
          <div className="af-assets">
            {contest.assets.slice(0, 6).map((sym) => (
              <span key={sym} className="af-asset">
                {sym}
              </span>
            ))}
            {contest.assets.length > 6 && (
              <span className="af-asset af-asset-more">+{contest.assets.length - 6}</span>
            )}
          </div>
        )}

        {isJoined && liveValue != null && (
          <div className="af-position">
            {rank != null && <span className="af-pos-rank">#{rank}</span>}
            <span className="af-pos-value">${liveValue.toLocaleString()}</span>
            {pnlPct != null && (
              <span className={pnlPct >= 0 ? 'af-pos-up' : 'af-pos-down'}>
                {pnlPct >= 0 ? '+' : ''}
                {pnlPct.toFixed(1)}%
              </span>
            )}
          </div>
        )}

        <button type="button" onClick={onPrimary} className="af-cta">
          <span>{ctaLabel}</span>
          <ArrowRight size={18} strokeWidth={2.5} />
        </button>
      </div>
    </article>
  );
}