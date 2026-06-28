'use client';

import React from 'react';
import { Contest } from '../lib/game-types';
import { getContestTapeInfo, isFeaturedPit } from '../lib/tape-week';

type ArenaContestCardProps = {
  contest: Contest;
  scheduled: boolean;
  isJoined: boolean;
  isSelected: boolean;
  participantCount: number;
  onSelect: () => void;
};

const ArenaContestCard = React.forwardRef<HTMLButtonElement, ArenaContestCardProps>(
  function ArenaContestCard(
    { contest, scheduled, isJoined, isSelected, participantCount, onSelect },
    ref
  ) {
    const dayIndex = new Date().getDay();
    const featured = isFeaturedPit(contest.slug, dayIndex);
    const tape =
      getContestTapeInfo(contest.slug, dayIndex) ??
      (contest.assets.length
        ? {
            poolLabel: contest.assetTheme?.split('•').pop()?.trim() ?? 'On tape',
            topAssets: contest.assets.slice(0, 3),
            assetCount: contest.assets.length,
          }
        : null);

    return (
      <button
        ref={ref}
        type="button"
        onClick={onSelect}
        className={`af-card ${isSelected ? 'af-card-on' : ''} ${isJoined ? 'af-card-in' : ''} ${featured === 'main' ? 'af-card-featured' : ''}`}
      >
        <div className="af-card-top">
          {scheduled ? (
            <span className="af-card-live af-card-live-soon">Soon</span>
          ) : (
            <span className="af-card-live">
              <span className="af-live-dot" aria-hidden />
              Live
            </span>
          )}
          {featured === 'main' && <span className="af-card-featured-badge">Main</span>}
          {featured === 'co' && <span className="af-card-co-badge">Co-main</span>}
          {isJoined && <span className="af-card-badge">In</span>}
        </div>
        <div className="af-card-prize">${contest.firstPrize.toLocaleString()}</div>
        <div className="af-card-title">{contest.title}</div>
        {tape && (
          <div className="af-card-tape">
            <span className="af-card-tape-label">
              {tape.assetCount ?? contest.assets.length} assets · {tape.poolLabel}
            </span>
            <span className="af-card-tape-assets">
              {tape.topAssets.join(' · ')}
              {tape.assetCount > tape.topAssets.length ? ` +${tape.assetCount - tape.topAssets.length}` : ''}
            </span>
          </div>
        )}
        <div className="af-card-meta">
          <span>{contest.entryFee === 0 ? 'Free' : `$${contest.entryFee}`}</span>
          <span className="af-card-meta-sep">·</span>
          <span>{participantCount} traders</span>
        </div>
      </button>
    );
  }
);

export default ArenaContestCard;