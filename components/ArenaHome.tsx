'use client';

import React from 'react';
import { Contest } from '../lib/game-types';
import ArenaTodayBoard from './ArenaTodayBoard';
import WeekAheadStrip from './WeekAheadStrip';
import { TourHelpButton as ArenaTourHelpButton } from './ArenaTour';

export type ArenaPitItem = { contest: Contest; scheduled: boolean };

type ArenaHomeProps = {
  pits: ArenaPitItem[];
  selectedFilter: 'all' | 'paid' | 'free';
  onFilterChange: (filter: 'all' | 'paid' | 'free') => void;
  joinedContestIds: number[];
  getParticipantCount: (contestId: number) => number;
  getRank: (contestId: number) => number | null | undefined;
  bellTick: number;
  hydrated: boolean;
  isTradingOpen: (contest: Contest) => boolean;
  onInfo: (contestId: number) => void;
  onEnter: (contest: Contest) => void;
  onTour: () => void;
  useServerStreak?: boolean;
};

export default function ArenaHome({
  pits,
  selectedFilter,
  onFilterChange,
  joinedContestIds,
  getParticipantCount,
  getRank,
  bellTick,
  hydrated,
  isTradingOpen,
  onInfo,
  onEnter,
  onTour,
  useServerStreak = false,
}: ArenaHomeProps) {
  if (!pits.length) {
    return (
      <div className="af-landing">
        <div className="af-empty">
          <p className="af-empty-title">No contests right now</p>
          <p className="af-empty-sub">Check back when the floor opens.</p>
        </div>
      </div>
    );
  }

  const selectPitBySlug = (slug: string) => {
    const match = pits.find((p) => p.contest.slug === slug);
    if (match) onEnter(match.contest);
  };

  return (
    <div className="af-landing">
      <div className="at-toolbar">
        <div className="af-tabs" role="tablist" aria-label="Filter contests">
          {(['all', 'paid', 'free'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              role="tab"
              aria-selected={selectedFilter === filter}
              onClick={() => onFilterChange(filter)}
              className={`af-tab ${selectedFilter === filter ? 'af-tab-on' : ''}`}
            >
              {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
        <ArenaTourHelpButton onClick={onTour} />
      </div>

      <ArenaTodayBoard
        pits={pits}
        selectedFilter={selectedFilter}
        joinedContestIds={joinedContestIds}
        getParticipantCount={getParticipantCount}
        getRank={getRank}
        bellTick={bellTick}
        hydrated={hydrated}
        isTradingOpen={isTradingOpen}
        onInfo={onInfo}
        onEnter={onEnter}
        useServerStreak={useServerStreak}
      />

      <WeekAheadStrip onPitSelect={selectPitBySlug} />
    </div>
  );
}