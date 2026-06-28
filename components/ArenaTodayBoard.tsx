'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, Info } from 'lucide-react';
import { Contest } from '../lib/game-types';
import { OPENING_BELL_SLUG } from '../lib/pit-contests';
import { formatPitStartTime, getCanonicalPitOpenLabel, getPitOpenSort } from '../lib/pit-schedule';
import { getContestTapeInfo, getTodayTheme, FEATURED_PIT_BY_DAY } from '../lib/tape-week';
import { TimeLeftLabel } from './BellCountdown';
import type { ArenaPitItem } from './ArenaHome';

const OpeningBellStreakBadge = dynamic(() => import('./OpeningBellStreakBadge'), {
  ssr: false,
});

type ArenaTodayBoardProps = {
  pits: ArenaPitItem[];
  selectedFilter: 'all' | 'paid' | 'free';
  joinedContestIds: number[];
  getParticipantCount: (contestId: number) => number;
  getRank: (contestId: number) => number | null | undefined;
  bellTick: number;
  hydrated: boolean;
  isTradingOpen: (contest: Contest) => boolean;
  onInfo: (contestId: number) => void;
  onEnter: (contest: Contest) => void;
  useServerStreak?: boolean;
};

function AssetChips({ assets, max = 4 }: { assets: string[]; max?: number }) {
  const shown = assets.slice(0, max);
  const extra = assets.length - shown.length;
  return (
    <div className="at-chips">
      {shown.map((sym) => (
        <span key={sym} className="at-chip">
          {sym}
        </span>
      ))}
      {extra > 0 && <span className="at-chip at-chip-more">+{extra}</span>}
    </div>
  );
}

function traderCount(n: number): string {
  return n === 1 ? '1 trader' : `${n} traders`;
}

function MetaLine({ parts }: { parts: React.ReactNode[] }) {
  return (
    <p className="at-meta-line">
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="at-meta-sep">·</span>}
          {part}
        </React.Fragment>
      ))}
    </p>
  );
}

function ctaLabel(
  contest: Contest,
  scheduled: boolean,
  isJoined: boolean,
  isTradingOpen: boolean
): string {
  if (scheduled) return contest.entryFee === 0 ? 'Ring in' : `Enter · $${contest.entryFee}`;
  if (!isJoined) return contest.entryFee === 0 ? 'Enter pit' : `Enter · $${contest.entryFee}`;
  if (isTradingOpen) return 'Open ticket';
  return 'Rang in';
}

export default function ArenaTodayBoard({
  pits,
  selectedFilter,
  joinedContestIds,
  getParticipantCount,
  getRank,
  bellTick,
  hydrated,
  isTradingOpen,
  onInfo,
  onEnter,
  useServerStreak = false,
}: ArenaTodayBoardProps) {
  const now = new Date();
  const dayIndex = now.getDay();
  const theme = getTodayTheme(now);
  const dateLabel = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const featured = FEATURED_PIT_BY_DAY[dayIndex];
  const liveCount = pits.filter((p) => !p.scheduled).length;

  const freeItem =
    selectedFilter !== 'paid'
      ? pits.find((p) => p.contest.slug === OPENING_BELL_SLUG)
      : undefined;

  const eligibleMain = pits.filter(
    (p) => p.contest.slug !== OPENING_BELL_SLUG || selectedFilter === 'free'
  );

  const mainItem =
    selectedFilter === 'free'
      ? freeItem
      : eligibleMain.find((p) => p.contest.slug === featured?.main) ??
        eligibleMain.find((p) => p.contest.entryFee > 0 && !p.scheduled) ??
        eligibleMain[0];

  const moreItems = pits
    .filter((p) => {
      if (p.contest.slug === OPENING_BELL_SLUG) return false;
      if (mainItem && p.contest.id === mainItem.contest.id) return false;
      if (selectedFilter === 'free') return false;
      if (selectedFilter === 'paid' && p.contest.entryFee === 0) return false;
      return true;
    })
    .sort(
      (a, b) =>
        getPitOpenSort(a.contest.slug) - getPitOpenSort(b.contest.slug) ||
        b.contest.firstPrize - a.contest.firstPrize
    );

  const freeTape = getContestTapeInfo(OPENING_BELL_SLUG, dayIndex);

  return (
    <div className="at-board">
      <header className="at-head">
        <div>
          <p className="at-kicker">Today on the floor</p>
          <h1 className="at-title">
            <span className="at-theme">{theme.word}</span>
            <span className="at-title-sep">·</span>
            <span className="at-date">{dateLabel}</span>
          </h1>
          <p className="at-tagline">{theme.tagline}</p>
        </div>
        {liveCount > 0 && (
          <span className="at-live-pill">
            <span className="at-live-dot" aria-hidden />
            {liveCount} live
          </span>
        )}
      </header>

      {mainItem && selectedFilter !== 'free' && (
        <section className="at-main" data-tour="arena-hero">
          <MainEventCard
            item={mainItem}
            dayIndex={dayIndex}
            isJoined={joinedContestIds.includes(mainItem.contest.id)}
            rank={getRank(mainItem.contest.id)}
            participantCount={getParticipantCount(mainItem.contest.id)}
            bellTick={bellTick}
            hydrated={hydrated}
            isTradingOpen={isTradingOpen(mainItem.contest)}
            onInfo={() => onInfo(mainItem.contest.id)}
            onEnter={() => onEnter(mainItem.contest)}
          />
        </section>
      )}

      {freeItem && selectedFilter !== 'paid' && (
        <section className="at-free" data-tour={selectedFilter === 'free' ? 'arena-hero' : undefined}>
          <FreeTapeRow
            item={freeItem}
            tapeLabel={freeTape?.poolLabel ?? 'Free trio'}
            assets={freeItem.contest.assets}
            isJoined={joinedContestIds.includes(freeItem.contest.id)}
            participantCount={getParticipantCount(freeItem.contest.id)}
            hydrated={hydrated}
            bellTick={bellTick}
            isTradingOpen={isTradingOpen(freeItem.contest)}
            onInfo={() => onInfo(freeItem.contest.id)}
            onEnter={() => onEnter(freeItem.contest)}
            useServerStreak={useServerStreak}
          />
        </section>
      )}

      {moreItems.length > 0 && (
        <section className="at-more" data-tour="open-arenas">
          <h2 className="at-more-title">More pits today</h2>
          <div className="at-more-list">
            {moreItems.map((item) => (
              <ScheduleRow
                key={item.contest.id}
                item={item}
                dayIndex={dayIndex}
                isJoined={joinedContestIds.includes(item.contest.id)}
                rank={getRank(item.contest.id)}
                participantCount={getParticipantCount(item.contest.id)}
                bellTick={bellTick}
                hydrated={hydrated}
                onInfo={() => onInfo(item.contest.id)}
                onEnter={() => onEnter(item.contest)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MainEventCard({
  item,
  dayIndex,
  isJoined,
  rank,
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

  return (
    <article className={`at-main-card ${scheduled ? 'at-main-card-soon' : ''}`}>
      <div className="at-main-top">
        <span className="at-main-badge">Main event</span>
        <button type="button" onClick={onInfo} className="at-info-btn" data-tour="contest-info" aria-label="Contest info">
          <Info size={14} />
        </button>
      </div>

      <div className="at-main-time">{timeLabel}</div>
      {!scheduled && timeLabel === 'Live' && contest.slug !== OPENING_BELL_SLUG && (
        <p className="at-main-open-hint">{getCanonicalPitOpenLabel(contest.slug)}</p>
      )}
      <h3 className="at-main-name">{contest.title}</h3>

      <MetaLine
        parts={[
          <span key="a">{tape?.assetCount ?? contest.assets.length} assets</span>,
          <span key="p" className="at-main-prize">${contest.firstPrize.toLocaleString()} 1st</span>,
          <span key="t">{traderCount(participantCount)}</span>,
        ]}
      />

      {tape && <AssetChips assets={tape.assets} max={5} />}

      {!scheduled && contest.endsAt && hydrated && (
        <div className="at-main-bell">
          Bell{' '}
          <TimeLeftLabel endsAt={contest.endsAt} status={contest.status} tick={bellTick} />
        </div>
      )}

      {isJoined && rank != null && (
        <div className="at-main-rank">Your rank #{rank}</div>
      )}

      <button type="button" onClick={onEnter} className="at-cta">
        <span>{ctaLabel(contest, scheduled, isJoined, tradingOpen)}</span>
        <ArrowRight size={16} strokeWidth={2.5} />
      </button>
    </article>
  );
}

function FreeTapeRow({
  item,
  tapeLabel,
  assets,
  isJoined,
  participantCount,
  hydrated,
  bellTick,
  isTradingOpen: tradingOpen,
  onInfo,
  onEnter,
  useServerStreak = false,
}: {
  item: ArenaPitItem;
  tapeLabel: string;
  assets: string[];
  isJoined: boolean;
  participantCount: number;
  hydrated: boolean;
  bellTick: number;
  isTradingOpen: boolean;
  onInfo: () => void;
  onEnter: () => void;
  useServerStreak?: boolean;
}) {
  const { contest, scheduled } = item;

  return (
    <article className="at-free-card">
      <div className="at-free-head">
        <div>
          <span className="at-free-badge">Free today</span>
          <h3 className="at-free-name">{contest.title}</h3>
          <p className="at-free-tape">{tapeLabel}</p>
          <OpeningBellStreakBadge useServer={useServerStreak} />
        </div>
        <button type="button" onClick={onInfo} className="at-info-btn" data-tour="contest-info" aria-label="Contest info">
          <Info size={14} />
        </button>
      </div>

      <AssetChips assets={assets} max={3} />

      <div className="at-free-foot">
        <div className="at-free-meta-wrap">
          <MetaLine
            parts={[
              <span key="on" className="at-free-time">Always on</span>,
              <span key="n">{traderCount(participantCount)}</span>,
            ]}
          />
          {!scheduled && contest.endsAt && hydrated && (
            <div className="at-free-bell">
              Bell <TimeLeftLabel endsAt={contest.endsAt} status={contest.status} tick={bellTick} />
            </div>
          )}
        </div>
        <button type="button" onClick={onEnter} className="at-free-cta">
          {ctaLabel(contest, scheduled, isJoined, tradingOpen)}
        </button>
      </div>
    </article>
  );
}

function ScheduleRow({
  item,
  dayIndex,
  isJoined,
  rank,
  participantCount,
  bellTick,
  hydrated,
  onInfo,
  onEnter,
}: {
  item: ArenaPitItem;
  dayIndex: number;
  isJoined: boolean;
  rank?: number | null;
  participantCount: number;
  bellTick: number;
  hydrated: boolean;
  onInfo: () => void;
  onEnter: () => void;
}) {
  const { contest, scheduled } = item;
  const tape = getContestTapeInfo(contest.slug, dayIndex);
  const timeLabel = formatPitStartTime(contest, scheduled, hydrated);

  return (
    <div className={`at-row ${isJoined ? 'at-row-in' : ''}`}>
      <button type="button" onClick={onEnter} className="at-row-btn">
        <div className="at-row-time">{timeLabel}</div>
        <div className="at-row-body">
          <div className="at-row-head">
            <span className="at-row-name">{contest.title}</span>
            {isJoined && <span className="at-row-in-badge">In</span>}
          </div>
          <MetaLine
            parts={[
              <span key="fee">{contest.entryFee === 0 ? 'Free' : `$${contest.entryFee}`}</span>,
              <span key="assets">{tape?.assetCount ?? contest.assets.length} assets</span>,
              <span key="prize">${contest.firstPrize.toLocaleString()} 1st</span>,
              <span key="traders">{traderCount(participantCount)}</span>,
            ]}
          />
          {tape && <AssetChips assets={tape.assets} max={4} />}
          {!scheduled && contest.endsAt && hydrated && (
            <div className="at-row-bell">
              Bell <TimeLeftLabel endsAt={contest.endsAt} status={contest.status} tick={bellTick} />
            </div>
          )}
        </div>
        <div className="at-row-side">
          {isJoined && rank != null ? (
            <span className="at-row-rank">#{rank}</span>
          ) : (
            <ArrowRight size={14} className="at-row-arrow" />
          )}
        </div>
      </button>
      <button type="button" onClick={onInfo} className="at-row-info" aria-label={`Info for ${contest.title}`}>
        <Info size={12} />
      </button>
    </div>
  );
}