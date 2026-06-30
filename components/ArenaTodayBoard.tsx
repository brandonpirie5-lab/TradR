'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useCalmLiveStats } from '../lib/use-calm-live-stats';
import { ArrowRight, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Contest, LeaderboardEntry } from '../lib/game-types';
import { formatFloorTraders, formatFloorTradersShort } from '../lib/format-floor-count';
import { OPENING_BELL_SLUG } from '../lib/pit-contests';
import { pitActionLabel, PIT_DEFAULT_TAGLINE } from '../lib/pit-cta';
import PitMoneyDisplay from './PitMoneyDisplay';
import { formatPitStartTime } from '../lib/pit-schedule';
import { getContestTapeInfo, FEATURED_PIT_BY_DAY } from '../lib/tape-week';
import { TimeLeftLabel } from './BellCountdown';
import type { ArenaPitItem } from './ArenaHome';
import WeekAheadStrip from './WeekAheadStrip';
import ArenaTapeTicker from './ArenaTapeTicker';
import ArenaTapeLeaders from './ArenaTapeLeaders';
import { getOrderedArenaTapeSymbols } from '../lib/pit-asset-schedule';
import { DAY_THEMES } from '../lib/tape-week';

const OpeningBellStreakBadge = dynamic(() => import('./OpeningBellStreakBadge'), {
  ssr: false,
});

type ArenaTodayBoardProps = {
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
  getPitLiveStats?: (contestId: number) => { liveValue: number; pnlPct: number; rank: number | null } | null;
  getContestBoard?: (contestId: number) => LeaderboardEntry[];
  onViewLeaderboard?: (contestId: number) => void;
  onShowHowItWorks?: () => void;
};

export default function ArenaTodayBoard({
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
  getPitLiveStats,
  getContestBoard,
  onViewLeaderboard,
  onShowHowItWorks,
}: ArenaTodayBoardProps) {
  const dayIndex = new Date().getDay();
  const featured = FEATURED_PIT_BY_DAY[dayIndex];
  const liveCount = pits.filter((p) => !p.scheduled).length;

  const freeItem = pits.find((p) => p.contest.slug === OPENING_BELL_SLUG);

  const mainItem =
    pits.find((p) => p.contest.slug === featured?.main) ??
    pits.find((p) => p.contest.entryFee > 0 && !p.scheduled) ??
    pits.find((p) => p.contest.slug !== OPENING_BELL_SLUG) ??
    pits[0];

  const freeTape = getContestTapeInfo(OPENING_BELL_SLUG, dayIndex);
  const showFreeStrip = freeItem && mainItem?.contest.slug !== OPENING_BELL_SLUG;
  const dayTheme = DAY_THEMES[dayIndex];
  const tickerSymbols = getOrderedArenaTapeSymbols();
  const mainTape = mainItem ? getContestTapeInfo(mainItem.contest.slug, dayIndex) : null;
  const todayTapeSymbols = new Set([
    ...(mainTape?.assets ?? []),
    ...(freeTape?.assets ?? []),
  ]);

  const mainBoard =
    mainItem && getContestBoard ? getContestBoard(mainItem.contest.id) : [];

  return (
    <div className="at-board at-board-v3">
      <p className="at-value-hook">
        $100K virtual portfolio · live market prices · real prize pools
      </p>

      <p className="at-floor-status">
        <span className="at-floor-status-theme">{dayTheme.word} day</span>
        <span className="at-floor-status-sep">·</span>
        <span className="at-floor-status-tag">{dayTheme.tagline}</span>
        {liveCount > 0 && (
          <>
            <span className="at-floor-status-sep">·</span>
            <span className="at-floor-status-live">
              {liveCount} pit{liveCount === 1 ? '' : 's'} live
            </span>
          </>
        )}
      </p>

      {mainItem && (
        <section className="at-main" data-tour="arena-hero">
          <p className="at-section-label">
            Today&apos;s main pit
            <span className="at-section-theme">{dayTheme.word}</span>
          </p>
          <HeroPitCard
            item={mainItem}
            dayIndex={dayIndex}
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

          <ArenaTapeTicker
            symbols={tickerSymbols}
            highlightSymbols={[...todayTapeSymbols]}
            subtle
          />
        </section>
      )}

      {showFreeStrip && freeItem && (
        <section className="at-free-strip-wrap" data-tour="open-arenas">
          <p className="at-section-label">Free pit</p>
          <FreeStrip
            item={freeItem}
            tapeLabel={freeTape?.poolLabel ?? 'Free trio'}
            isJoined={joinedContestIds.includes(freeItem.contest.id)}
            participantCount={getParticipantCount(freeItem.contest.id)}
            isTradingOpen={isTradingOpen(freeItem.contest)}
            onInfo={() => onInfo(freeItem.contest.id)}
            onEnter={() => onEnter(freeItem.contest)}
            useServerStreak={useServerStreak}
          />
        </section>
      )}

      <div className="at-zone-divider" aria-hidden />

      <WeekAheadStrip
        contests={contests}
        joinedContestIds={joinedContestIds}
        liveCount={liveCount}
        onJoinPit={onJoinWeekPit}
        onInfoPit={onInfoWeekPit}
      />

      <div className="at-arena-footer">
        <p className="at-arena-footer-tagline">
          <strong>Fake money. Real ego.</strong> Ring in on the floor, trade in Battles, climb the Vault.
        </p>
        <p className="at-arena-footer-trust">
          Skill-based fantasy contest — virtual trades only.{' '}
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
  dayIndex,
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
  dayIndex: number;
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
  const tape = getContestTapeInfo(contest.slug, dayIndex);
  const timeLabel = formatPitStartTime(contest, scheduled, hydrated);
  const isLive = !scheduled && timeLabel === 'Live';
  const assetList = (tape?.assets ?? contest.assets).slice(0, 4);
  const assetOverflow = Math.max(0, (tape?.assetCount ?? contest.assets.length) - assetList.length);
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
  const hasDetails = Boolean(tagline || tape || assetList.length > 0);

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
            variant="hero"
          />
        </div>

        <h2 className="at-hero-name">{contest.title}</h2>

        <p className="at-hero-meta">
          <span>{formatFloorTraders(participantCount)}</span>
          <span className="at-meta-sep">·</span>
          <span className={contest.entryFee === 0 ? 'at-money-free' : ''}>
            {contest.entryFee === 0 ? 'Free entry' : `$${contest.entryFee} entry`}
          </span>
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

        <button type="button" onClick={onEnter} className="at-cta at-hero-cta">
          <span>
            {pitActionLabel({
              isJoined,
              isTradingOpen: tradingOpen,
              entryFee: contest.entryFee,
            })}
          </span>
          <ArrowRight size={18} strokeWidth={2.5} />
        </button>

        {hasDetails && (
          <div className="at-hero-details">
            <button
              type="button"
              className="at-hero-details-toggle"
              onClick={() => setDetailsOpen((v) => !v)}
              aria-expanded={detailsOpen}
            >
              <span>What&apos;s on the tape</span>
              {detailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {detailsOpen && (
              <div className="at-hero-details-body">
                <p className="at-hero-tagline">{tagline}</p>
                {tape && <p className="at-hero-tape">{tape.poolLabel}</p>}
                {assetList.length > 0 && (
                  <p className="at-hero-tape-compact">
                    <span className="at-hero-tape-symbols">
                      {assetList.join(' · ')}
                      {assetOverflow > 0 ? ` +${assetOverflow}` : ''}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function FreeStrip({
  item,
  tapeLabel,
  isJoined,
  participantCount,
  isTradingOpen: tradingOpen,
  onInfo,
  onEnter,
  useServerStreak,
}: {
  item: ArenaPitItem;
  tapeLabel: string;
  isJoined: boolean;
  participantCount: number;
  isTradingOpen: boolean;
  onInfo: () => void;
  onEnter: () => void;
  useServerStreak?: boolean;
}) {
  const { contest } = item;

  return (
    <div className={`at-secondary-pit at-free-strip ${isJoined ? 'at-secondary-pit-in' : ''}`}>
      <div className="at-secondary-pit-body">
        <div className="at-secondary-pit-head">
          <span className="at-secondary-pit-badge at-secondary-pit-badge-free">Free</span>
          <span className="at-secondary-pit-title">{contest.title}</span>
        </div>
        <span className="at-secondary-pit-meta">
          ${contest.firstPrize.toLocaleString()} 1st
          <span className="at-secondary-pit-sep">·</span>
          Free entry
          <span className="at-secondary-pit-sep">·</span>
          {formatFloorTradersShort(participantCount)}
        </span>
        <span className="at-secondary-pit-sub">{tapeLabel}</span>
        <OpeningBellStreakBadge useServer={useServerStreak} />
      </div>
      <div className="at-secondary-pit-actions">
        <button type="button" onClick={onInfo} className="at-secondary-pit-info" aria-label="Contest info">
          <Info size={14} />
        </button>
        <button type="button" onClick={onEnter} className="at-secondary-pit-join">
          {pitActionLabel({
            isJoined,
            isTradingOpen: tradingOpen,
            entryFee: contest.entryFee,
          })}
        </button>
      </div>
    </div>
  );
}