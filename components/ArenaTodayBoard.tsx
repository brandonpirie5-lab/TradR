'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, Info } from 'lucide-react';
import { Contest } from '../lib/game-types';
import { OPENING_BELL_SLUG } from '../lib/pit-contests';
import PitMoneyDisplay, { PitPoolSummary, PitProjectedPayout } from './PitMoneyDisplay';
import PitFillBadge from './PitFillBadge';
import { formatPitStartTime, getCanonicalPitOpenLabel } from '../lib/pit-schedule';
import { getContestTapeInfo, FEATURED_PIT_BY_DAY } from '../lib/tape-week';
import { TimeLeftLabel } from './BellCountdown';
import type { ArenaPitItem } from './ArenaHome';
import WeekAheadStrip from './WeekAheadStrip';
import InviteFriendsHero from './InviteFriendsHero';
import { countPaidRanks, getPayoutStructure } from '../lib/pit-payouts';
import { getPitFillStatus } from '../lib/contest-fill';

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
  onCopyReferralLink: () => void;
  onShareReferralLink: () => void;
  referralCopied?: boolean;
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

function entryLabel(fee: number): string {
  return fee === 0 ? 'Free' : `$${fee}`;
}

function ctaLabel(
  contest: Contest,
  scheduled: boolean,
  isJoined: boolean,
  isTradingOpen: boolean
): string {
  if (scheduled) return contest.entryFee === 0 ? 'Ring in' : `Enter · $${contest.entryFee}`;
  if (!isJoined) return contest.entryFee === 0 ? 'Ring in' : 'Enter pit';
  if (isTradingOpen) return 'Open ticket';
  return 'Rang in';
}

function joinLabel(
  contest: Contest,
  scheduled: boolean,
  isJoined: boolean,
  isTradingOpen: boolean
): string {
  if (scheduled) return 'Ring in';
  if (!isJoined) return 'Join';
  if (isTradingOpen) return 'Trade';
  return 'View';
}

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
  onCopyReferralLink,
  onShareReferralLink,
  referralCopied = false,
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
  const inviteFocus = mainItem?.contest ?? freeItem?.contest ?? null;
  const inviteJoined =
    !!inviteFocus && joinedContestIds.includes(inviteFocus.id);
  const inviteCount = inviteFocus ? getParticipantCount(inviteFocus.id) : 0;
  const showFreeStrip = freeItem && mainItem?.contest.slug !== OPENING_BELL_SLUG;

  return (
    <div className="at-board at-board-v3">
      <WeekAheadStrip
        contests={contests}
        joinedContestIds={joinedContestIds}
        liveCount={liveCount}
        onJoinPit={onJoinWeekPit}
        onInfoPit={onInfoWeekPit}
      />

      {mainItem && (
        <section className="at-main" data-tour="arena-hero">
          <HeroPitCard
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
            featured={mainItem.contest.slug !== OPENING_BELL_SLUG}
          />
        </section>
      )}

      {showFreeStrip && freeItem && (
        <section className="at-free-strip-wrap" data-tour="open-arenas">
          <FreeStrip
            item={freeItem}
            tapeLabel={freeTape?.poolLabel ?? 'Free trio'}
            isJoined={joinedContestIds.includes(freeItem.contest.id)}
            rank={getRank(freeItem.contest.id)}
            participantCount={getParticipantCount(freeItem.contest.id)}
            isTradingOpen={isTradingOpen(freeItem.contest)}
            onInfo={() => onInfo(freeItem.contest.id)}
            onEnter={() => onEnter(freeItem.contest)}
            useServerStreak={useServerStreak}
          />
        </section>
      )}

      <InviteFriendsHero
        focusContest={inviteFocus}
        participantCount={inviteCount}
        userJoined={inviteJoined}
        onCopyLink={onCopyReferralLink}
        onShareLink={onShareReferralLink}
        copied={referralCopied}
      />
    </div>
  );
}

function HeroPitCard({
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
  featured,
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
  featured: boolean;
}) {
  const { contest, scheduled } = item;
  const tape = getContestTapeInfo(contest.slug, dayIndex);
  const timeLabel = formatPitStartTime(contest, scheduled, hydrated);
  const isLive = !scheduled && timeLabel === 'Live';
  const assets = tape?.assets ?? contest.assets;
  const fill = getPitFillStatus(contest, participantCount);
  const showFillUrgency = !isJoined || !fill.isConfirmed;

  return (
    <article
      className={`at-hero af-feature ${isLive ? 'af-feature-urgent' : ''} ${
        isJoined ? 'at-hero-joined at-hero-compact' : ''
      }`}
    >
      <div className="af-feature-aurora" aria-hidden />
      <div className="af-feature-border" aria-hidden />
      <div className="af-feature-inner at-hero-inner">
        <div className="at-hero-head">
          <div className="af-feature-live">
            {isLive ? (
              <>
                <span className="af-live-dot" aria-hidden />
                <span className="af-live-text">Live</span>
              </>
            ) : (
              <span className="af-badge af-badge-soon">{timeLabel}</span>
            )}
            {!scheduled && contest.endsAt && hydrated && (
              <span className="af-live-clock">
                Bell <TimeLeftLabel endsAt={contest.endsAt} status={contest.status} tick={bellTick} />
              </span>
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

        <span className="at-hero-badge">{featured ? "Today's main event" : 'Free pit'}</span>
        <h2 className="at-hero-name">{contest.title}</h2>
        {tape && <p className="at-hero-tape">{tape.poolLabel}</p>}

        <div className="at-hero-money-banner">
          <PitMoneyDisplay
            slug={contest.slug}
            totalPrizes={contest.totalPrizes}
            entryFee={contest.entryFee}
            variant="hero"
            showHook={!isJoined}
          />
          {!isJoined && (
            <div className="mt-1.5">
              <PitPoolSummary slug={contest.slug} />
            </div>
          )}
        </div>

        {isJoined ? (
          <div className="at-hero-you-rail">
            <div className="at-hero-you-rail-main">
              <div className="at-hero-joined-rank">
                <span className="at-hero-joined-label">Your rank</span>
                <span className="at-hero-joined-val">#{rank ?? '—'}</span>
              </div>
              {rank != null && (
                <PitProjectedPayout
                  slug={contest.slug}
                  rank={rank}
                  className="at-hero-joined-payout"
                />
              )}
            </div>
            {showFillUrgency && (
              <PitFillBadge
                contest={contest}
                participantCount={participantCount}
                variant="arena-inline"
              />
            )}
          </div>
        ) : (
          <PitFillBadge contest={contest} participantCount={participantCount} variant="arena" />
        )}

        <div className={`at-hero-stats ${isJoined ? 'at-hero-stats-compact' : ''}`}>
          {!isJoined && (
            <div className="at-hero-stat">
              <span
                className={`at-hero-stat-val ${contest.entryFee === 0 ? 'at-money-free' : 'at-money-entry'}`}
              >
                {entryLabel(contest.entryFee)}
              </span>
              <span className="at-hero-stat-lbl">Entry</span>
            </div>
          )}
          <div className="at-hero-stat">
            <span className="at-hero-stat-val">{participantCount.toLocaleString()}</span>
            <span className="at-hero-stat-lbl">Traders</span>
          </div>
          <div className="at-hero-stat">
            <span className="at-hero-stat-val">{countPaidRanks(getPayoutStructure(contest.slug))}</span>
            <span className="at-hero-stat-lbl">Paid ranks</span>
          </div>
          <div className="at-hero-stat">
            <span className="at-hero-stat-val">{assets.length}</span>
            <span className="at-hero-stat-lbl">Assets</span>
          </div>
        </div>

        <AssetChips assets={assets} max={isJoined ? 4 : 6} />

        {!isJoined && !scheduled && isLive && contest.slug !== OPENING_BELL_SLUG && (
          <p className="at-hero-open-hint">{getCanonicalPitOpenLabel(contest.slug)}</p>
        )}

        <button
          type="button"
          onClick={onEnter}
          className={`at-cta at-hero-cta ${isJoined ? 'at-hero-cta-in' : ''} ${isJoined && tradingOpen ? 'at-hero-cta-trade' : ''}`}
        >
          <span>{ctaLabel(contest, scheduled, isJoined, tradingOpen)}</span>
          <ArrowRight size={18} strokeWidth={2.5} />
        </button>
      </div>
    </article>
  );
}

function FreeStrip({
  item,
  tapeLabel,
  isJoined,
  rank,
  participantCount,
  isTradingOpen: tradingOpen,
  onInfo,
  onEnter,
  useServerStreak,
}: {
  item: ArenaPitItem;
  tapeLabel: string;
  isJoined: boolean;
  rank?: number | null;
  participantCount: number;
  isTradingOpen: boolean;
  onInfo: () => void;
  onEnter: () => void;
  useServerStreak?: boolean;
}) {
  const { contest, scheduled } = item;

  return (
    <div className={`at-free-strip ${isJoined ? 'at-free-strip-in' : ''}`}>
      <div className="at-free-strip-copy">
        <span className="at-free-strip-badge">Free</span>
        <div className="at-free-strip-text">
          <span className="at-free-strip-name">{contest.title}</span>
          <span className="at-free-strip-meta">
            {tapeLabel} · <span className="at-free-strip-pool">${contest.totalPrizes} pool</span> ·{' '}
            {traderCount(participantCount)}
            {isJoined && rank != null && (
              <>
                {' '}
                · <span className="at-free-strip-rank">#{rank}</span>
              </>
            )}
          </span>
        </div>
        <OpeningBellStreakBadge useServer={useServerStreak} />
      </div>
      <div className="at-free-strip-actions">
        <button type="button" onClick={onInfo} className="at-free-strip-info" aria-label="Contest info">
          <Info size={14} />
        </button>
        <button type="button" onClick={onEnter} className="at-free-strip-join">
          {joinLabel(contest, scheduled, isJoined, tradingOpen)}
        </button>
      </div>
    </div>
  );
}

