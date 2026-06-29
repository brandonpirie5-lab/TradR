'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Contest } from '../lib/game-types';
import { getTodayPreview, getWeekPreview, type WeekContestPreview } from '../lib/weekly-preview';
import { getWeekJoinState } from '../lib/week-join';
import { getDayThemeStyle } from '../lib/tape-week';
import PitMoneyDisplay from './PitMoneyDisplay';

const WEEK_INTRO_KEY = 'tradr_week_intro_shown';

type WeekAheadStripProps = {
  anchor?: Date;
  contests: Contest[];
  joinedContestIds: number[];
  liveCount: number;
  onJoinPit: (slug: string, dayIndex: number) => void;
  onInfoPit: (slug: string, dayIndex: number) => void;
};

function featuredLabel(slug: string, role: WeekContestPreview['featured']): string | null {
  if (slug === 'opening-bell') return 'Free';
  if (role === 'main') return 'Main';
  if (role === 'co') return 'Co-main';
  return null;
}

function previewChipLabel(preview: WeekContestPreview): string {
  if (preview.slug === 'opening-bell') return 'Free bell';
  if (preview.entryFee === 0) return preview.title.split(' ')[0];
  return preview.title.split(' ').slice(0, 2).join(' ');
}

function WeekPitRow({
  preview,
  dayIndex,
  anchor,
  contests,
  joinedContestIds,
  onJoinPit,
  onInfoPit,
}: {
  preview: WeekContestPreview;
  dayIndex: number;
  anchor: Date;
  contests: Contest[];
  joinedContestIds: number[];
  onJoinPit: (slug: string, dayIndex: number) => void;
  onInfoPit: (slug: string, dayIndex: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const badge = featuredLabel(preview.slug, preview.featured);
  const state = getWeekJoinState(contests, preview.slug, dayIndex, joinedContestIds, anchor);
  const joinActive = state.canJoin || state.joined;

  return (
    <div
      className={`af-week-pit-row ${
        preview.slug === 'opening-bell' || preview.featured === 'main' ? 'af-week-pit-row-main' : ''
      } ${open ? 'af-week-pit-row-open' : ''}`}
    >
      <div className="af-week-pit-row-top">
        <button
          type="button"
          className="af-week-pit-row-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <div className="af-week-pit-row-body">
            <div className="af-week-pit-row-head">
              {badge && <span className="af-week-pit-badge">{badge}</span>}
              <span className="af-week-pit-title">{preview.title}</span>
              {state.isLive && (
                <span className="af-week-pit-live">
                  <span className="af-week-live-dot" aria-hidden />
                  Live
                </span>
              )}
            </div>
            <div className="af-week-pit-money-row">
              <PitMoneyDisplay
                slug={preview.slug}
                totalPrizes={preview.totalPrizes}
                entryFee={preview.entryFee}
                variant="compact"
                showSuffix={false}
              />
            </div>
            <span className="af-week-pit-tape">
              {preview.assetCount} assets · {preview.poolLabel}
            </span>
            {!open && (
              <div className="af-week-pit-chips">
                {preview.topAssets.slice(0, 3).map((sym) => (
                  <span key={sym} className="af-week-row-chip">
                    {sym}
                  </span>
                ))}
                {preview.assetCount > 3 && (
                  <span className="af-week-row-chip af-week-row-chip-more">+{preview.assetCount - 3}</span>
                )}
              </div>
            )}
          </div>
          {open ? (
            <ChevronUp size={16} className="af-week-pit-chevron" />
          ) : (
            <ChevronDown size={16} className="af-week-pit-chevron" />
          )}
        </button>
        <button
          type="button"
          className={`af-week-row-join ${
            state.joined ? 'af-week-row-join-in' : ''
          } ${!joinActive ? 'af-week-row-join-scheduled' : ''}`}
          disabled={!joinActive}
          onClick={() => {
            if (joinActive) onJoinPit(preview.slug, dayIndex);
          }}
        >
          {state.label}
        </button>
      </div>

      {open && (
        <div className="af-week-pit-detail">
          <p className="af-week-pit-tagline">{preview.tagline}</p>
          <p className="af-week-pit-schedule">{state.opensLabel}</p>

          <div className="af-week-pit-stats">
            <PitMoneyDisplay
              slug={preview.slug}
              totalPrizes={preview.totalPrizes}
              entryFee={preview.entryFee}
              showHook
            />
            <span className="af-week-pit-stat-muted">
              <strong>{preview.assetCount}</strong> assets on tape
            </span>
          </div>

          <div className="af-week-pit-assets-label">Tape for {preview.poolLabel}</div>
          <div className="af-week-pit-assets">
            {preview.allAssets.map((sym) => (
              <span key={sym} className="af-week-asset-chip">
                {sym}
              </span>
            ))}
          </div>

          <div className="af-week-pit-actions">
            <button
              type="button"
              className="af-week-pit-info"
              onClick={() => onInfoPit(preview.slug, dayIndex)}
            >
              <Info size={14} />
              Rules
            </button>
            <button
              type="button"
              className={`af-week-row-join af-week-pit-join-full ${
                state.joined ? 'af-week-row-join-in' : ''
              } ${!joinActive ? 'af-week-row-join-scheduled' : ''}`}
              disabled={!joinActive}
              onClick={() => {
                if (joinActive) onJoinPit(preview.slug, dayIndex);
              }}
            >
              {state.label}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WeekAheadStrip({
  anchor = new Date(),
  contests,
  joinedContestIds,
  liveCount,
  onJoinPit,
  onInfoPit,
}: WeekAheadStripProps) {
  const [expanded, setExpanded] = useState(false);
  const todayRef = useRef<HTMLDivElement>(null);
  const fightCardRef = useRef<HTMLDivElement>(null);
  const today = getTodayPreview(anchor);
  const week = getWeekPreview(anchor);
  const todayDayIndex = anchor.getDay();
  const themeStyle = getDayThemeStyle(todayDayIndex);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(WEEK_INTRO_KEY)) {
      setExpanded(true);
      localStorage.setItem(WEEK_INTRO_KEY, '1');
    }
  }, []);

  const scrollToToday = () => {
    todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section
      className="af-week af-week-arena-top af-week-ribbon af-week-themed"
      style={themeStyle}
      data-day-index={todayDayIndex}
      data-tour="week-ahead"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="af-week-toggle af-week-toggle-v4"
        aria-expanded={expanded}
      >
        <div className="af-week-toggle-bar">
          <span className="af-week-kicker af-week-kicker-compact">Week</span>
          {liveCount > 0 && (
            <span className="af-week-live-pill af-week-live-pill-compact">
              <span className="af-week-live-dot" aria-hidden />
              {liveCount} live
            </span>
          )}
          <span className="af-week-expand-hint af-week-expand-hint-compact">
            {expanded ? 'Hide' : 'Plan'}
          </span>
          {expanded ? (
            <ChevronUp size={15} className="af-week-chevron" />
          ) : (
            <ChevronDown size={15} className="af-week-chevron" />
          )}
        </div>

        <div className="af-week-toggle-body">
          <p className="af-week-headline-compact">
            <span className="af-week-theme-word">{today.theme.word}</span>
            <span className="af-week-headline-today"> today</span>
            {!expanded && today.slate.length > 0 && (
              <span className="af-week-inline-pits">
                {' · '}
                {today.slate.map((pit, i) => (
                  <React.Fragment key={pit.slug}>
                    {i > 0 && ' · '}
                    <span className="af-week-inline-pit">{previewChipLabel(pit)}</span>
                  </React.Fragment>
                ))}
              </span>
            )}
          </p>
          {!expanded && <p className="af-week-subline">2 pits · Mon–Sun</p>}
        </div>
      </button>

      {expanded && (
        <div className="af-week-expanded-wrap">
          <button type="button" className="af-week-jump-today" onClick={scrollToToday}>
            Jump to today
          </button>
          <div ref={fightCardRef} className="af-week-fight-card af-week-fight-card-v3">
            {week.map((day) => (
              <div
                key={day.dayName}
                ref={day.isToday ? todayRef : undefined}
                id={day.isToday ? 'af-week-today' : undefined}
                className={`af-week-day-block ${day.isToday ? 'af-week-day-block-today af-week-day-themed' : ''}`}
                style={day.isToday ? getDayThemeStyle(day.dayIndex) : undefined}
              >
                <div className="af-week-row-head">
                  <div className="af-week-row-day">
                    <span className="af-week-row-name">{day.dayName.slice(0, 3)}</span>
                    <span className="af-week-row-theme">{day.theme.word}</span>
                  </div>
                  {day.isToday && <span className="af-week-today-pill">Today</span>}
                </div>
                <p className="af-week-day-tag">{day.theme.tagline}</p>

                {day.slate.map((pit) => (
                  <WeekPitRow
                    key={`${day.dayIndex}-${pit.slug}`}
                    preview={pit}
                    dayIndex={day.dayIndex}
                    anchor={anchor}
                    contests={contests}
                    joinedContestIds={joinedContestIds}
                    onJoinPit={onJoinPit}
                    onInfoPit={onInfoPit}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}