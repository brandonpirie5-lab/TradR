'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getTodayPreview, getWeekPreview } from '../lib/weekly-preview';

type WeekAheadStripProps = {
  anchor?: Date;
  onPitSelect?: (slug: string) => void;
};

export default function WeekAheadStrip({ anchor = new Date(), onPitSelect }: WeekAheadStripProps) {
  const [expanded, setExpanded] = useState(false);
  const today = getTodayPreview(anchor);
  const week = getWeekPreview(anchor);

  return (
    <section className="af-week af-week-compact" data-tour="week-ahead">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="af-week-toggle"
        aria-expanded={expanded}
      >
        <div className="af-week-toggle-copy">
          <span className="af-week-kicker">Full week on the tape</span>
          <span className="af-week-headline">
            Same arenas · new assets daily
          </span>
        </div>
        {expanded ? <ChevronUp size={18} className="af-week-chevron" /> : <ChevronDown size={18} className="af-week-chevron" />}
      </button>

      {expanded && (
        <div className="af-week-fight-card">
          <p className="af-week-fight-lede">
            Today is <strong>{today.theme.word}</strong> — main event: {today.mainEvent?.title ?? '—'}
          </p>
          {week.map((day) => (
            <div
              key={day.dayName}
              className={`af-week-row ${day.isToday ? 'af-week-row-today' : ''}`}
            >
              <div className="af-week-row-head">
                <div className="af-week-row-day">
                  <span className="af-week-row-name">{day.dayName.slice(0, 3)}</span>
                  <span className="af-week-row-theme">{day.theme.word}</span>
                </div>
                {day.isToday && <span className="af-week-today-pill">Today</span>}
              </div>

              {day.mainEvent && (
                <button
                  type="button"
                  className="af-week-row-main"
                  onClick={() => onPitSelect?.(day.mainEvent!.slug)}
                >
                  <span className="af-week-row-pit">{day.mainEvent.title}</span>
                  <span className="af-week-row-tape">
                    {day.mainEvent.assetCount} assets · {day.mainEvent.poolLabel}
                  </span>
                </button>
              )}

              <div className="af-week-row-assets">
                {day.tapeOfDay.assets.slice(0, 4).map((sym) => (
                  <span key={sym} className="af-week-row-chip">
                    {sym}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}