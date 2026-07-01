'use client';

import React, { useState } from 'react';
import { useCalmLiveStats } from '../lib/use-calm-live-stats';
import { Info } from 'lucide-react';
import { Contest, LeaderboardEntry } from '../lib/game-types';
import { formatFloorTraders } from '../lib/format-floor-count';
import { pitActionLabel, PIT_DEFAULT_TAGLINE } from '../lib/pit-cta';
import PitMoneyDisplay from './PitMoneyDisplay';
import { formatPitStartTime } from '../lib/pit-schedule';
import { TimeLeftLabel } from './BellCountdown';
import type { ArenaPitItem } from './ArenaHome';
import ArenaTapeLeaders from './ArenaTapeLeaders';
import { DAILY_ASSETS } from '../lib/daily-pit-config';

type ArenaTodayBoardProps = {
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
};

export default function ArenaTodayBoard({
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
}: ArenaTodayBoardProps) {
  const mainItem = pits.find((p) => !p.scheduled) ?? pits[0];
  const mainBoard =
    mainItem && getContestBoard ? getContestBoard(mainItem.contest.id) : [];

  return (
    <div className="at-board at-board-v3">
      <p className="at-value-hook">
        $5 in · top half cash · pool grows with every trader
      </p>

      {mainItem ? (
        <section className="at-main" data-tour="arena-hero">
          <p className="at-section-label">Today&apos;s pit</p>
          <HeroPitCard
            item={mainItem}
            isJoined={joinedContestIds.includes(mainItem.contest.id)}
            rank={getRank(mainItem.contest.id)}
            liveStats={getPitLiveStats?.(mainItem.contest.id) ?? null}
            participantCount={getParticipantCount(mainItem.contest.id)}
            bellTick={bellTick}
            hydrated={hydrated}
            isTradingOpen={isTradingOpen(mainItem.contest)}
            onInfo={() => onInfo(mainItem.contest.id)}
            onEnter={() => onEnter(mainItem.contest)}
          />

          {mainBoard.length >= 2 && onViewLeaderboard && (
            <ArenaTapeLeaders
              contest={mainItem.contest}
              entries={mainBoard}
              onViewAll={() => onViewLeaderboard(mainItem.contest.id)}
            />
          )}

          <p className="text-[11px] text-muted mt-3 text-center font-mono">
            Tape: {DAILY_ASSETS.join(' · ')}
          </p>
        </section>
      ) : (
        <div className="af-empty">
          <p className="af-empty-title">No pit open right now</p>
          <p className="af-empty-sub">Check back soon — daily pit drops on schedule.</p>
        </div>
      )}

      <div className="at-arena-footer">
        <p className="at-arena-footer-tagline">
          <strong>Pay to play. Winners split the pot.</strong> Trade in Battles, track rank in Vault.
        </p>
        <p className="at-arena-footer-trust">
          Entry fees fund the prize pool — TradR takes 10%.{' '}
          {onShowHowItWorks ? (
            <button type="button" className="at-arena-footer-link" onClick={onShowHowItWorks}>
              How it works
            </button>
          ) : null}
        </p>
      </div>
    </div>
  );
}

function HeroPitCard({
  item,
  isJoined,
  rank,
  liveStats,
  participantCount,
  bellTick,
  hydrated,
  isTradingOpen: tradingOpen,
  onInfo,
  onEnter,
}: {
  item: ArenaPitItem;
  isJoined: boolean;
  rank?: number | null;
  liveStats?: { liveValue: number; pnlPct: number; rank: number | null } | null;
  participantCount: number;
  bellTick: number;
  hydrated: boolean;
  isTradingOpen: boolean;
  onInfo: () => void;
  onEnter: () => void;
}) {
  const { contest, scheduled } = item;
  const timeLabel = formatPitStartTime(contest, scheduled, hydrated);
  const isLive = !scheduled && timeLabel === 'Live';
  const tagline = contest.tagline?.trim() || PIT_DEFAULT_TAGLINE;
  const calm = useCalmLiveStats({
    liveValue: liveStats?.liveValue ?? 0,
    pnlPct: liveStats?.pnlPct ?? 0,
    rank: liveStats?.rank ?? rank ?? null,
    throttleMs: 2500,
    valueMinDelta: 250,
  });
  const showLiveStats = isJoined && liveStats != null;
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <article className={`at-hero af-feature ${isLive ? 'af-feature-urgent at-hero-live' : ''}`}>
      <div className="af-feature-border" aria-hidden />
      {isLive && <div className="at-hero-bell-ring" aria-hidden />}
      <div className="af-feature-inner at-hero-inner">
        <div className="at-hero-head">
          <div className="af-feature-live">
            {isJoined ? (
              <span className="at-hero-joined-pill">Rang in</span>
            ) : isLive ? (
              <>
                <span className="af-live-dot af-live-dot-green" aria-hidden />
                <span className="af-live-text af-live-text-muted">Live on the floor</span>
              </>
            ) : (
              <span className="af-badge af-badge-soon">{timeLabel}</span>
            )}
          </div>
          <button
            type="button"
            onClick={onInfo}
            className="at-info-btn"
            data-tour="contest-info"
            aria-label="Contest info"
          >
            <Info size={14} />
          </button>
        </div>

        <div className="at-hero-prize-zone">
          <div className="at-hero-floor-visual" aria-hidden />
          <PitMoneyDisplay
            slug={contest.slug}
            totalPrizes={contest.totalPrizes}
            firstPrize={contest.firstPrize}
            entryFee={contest.entryFee}
            participantCount={participantCount}
            variant="hero"
          />
        </div>

        <h2 className="at-hero-name">{contest.title}</h2>

        <p className="at-hero-meta">
          <span>{formatFloorTraders(participantCount)}</span>
          <span className="at-meta-sep">·</span>
          <span>${contest.entryFee} entry</span>
          {!scheduled && contest.endsAt && hydrated && (
            <>
              <span className="at-meta-sep">·</span>
              <span>
                Ends in{' '}
                <TimeLeftLabel endsAt={contest.endsAt} status={contest.status} tick={bellTick} />
              </span>
            </>
          )}
        </p>

        {showLiveStats && (
          <div className="at-hero-live-stats">
            <div className="at-hero-live-main">
              <span
                className={`at-hero-live-value ${calm.valueFlash === 'up' ? 'bt-value-flash-up' : calm.valueFlash === 'down' ? 'bt-value-flash-down' : ''}`}
              >
                ${calm.displayValue.toLocaleString()}
              </span>
              <span
                className={`at-hero-live-pnl ${calm.displayPnl >= 0 ? 'at-hero-live-pnl-up' : 'at-hero-live-pnl-down'}`}
              >
                {calm.displayPnl >= 0 ? '+' : ''}
                {calm.displayPnl.toFixed(1)}%
              </span>
            </div>
            {calm.displayRank != null && (
              <span className="at-hero-live-rank">
                #{calm.displayRank}
                {!tradingOpen && <span className="at-hero-rank-hint"> · opens in Battles</span>}
              </span>
            )}
          </div>
        )}

        {tagline && (
          <button
            type="button"
            className="at-hero-details-toggle"
            onClick={() => setDetailsOpen((o) => !o)}
          >
            {detailsOpen ? 'Hide details' : 'Show details'}
          </button>
        )}
        {detailsOpen && <p className="at-hero-tagline">{tagline}</p>}

        <button type="button" onClick={onEnter} className="at-cta at-hero-cta">
          <span>
            {pitActionLabel({
              isJoined,
              isTradingOpen: tradingOpen,
              entryFee: contest.entryFee,
            })}
          </span>
        </button>
      </div>
    </article>
  );
}