'use client';

import React, { useMemo } from 'react';

type ArenaTapeTickerProps = {
  symbols: string[];
  highlightSymbols?: string[];
};

export default function ArenaTapeTicker({ symbols, highlightSymbols = [] }: ArenaTapeTickerProps) {
  const highlight = useMemo(() => new Set(highlightSymbols), [highlightSymbols]);

  const track = useMemo(() => {
    const base = symbols.length ? symbols : ['TAPE'];
    return [...base, ...base];
  }, [symbols]);

  const durationSec = Math.max(36, symbols.length * 2.4);
  const onFloorCount = symbols.filter((s) => highlight.has(s)).length;

  if (!symbols.length) return null;

  return (
    <div className="at-tape-ticker" aria-hidden>
      <span className="at-tape-ticker-label">On the tape</span>
      <div className="at-tape-ticker-viewport">
        <div className="at-tape-ticker-fade at-tape-ticker-fade-left" />
        <div className="at-tape-ticker-fade at-tape-ticker-fade-right" />
        <div
          className="at-tape-ticker-track"
          style={{ animationDuration: `${durationSec}s` }}
        >
          {track.map((sym, i) => (
            <span
              key={`${sym}-${i}`}
              className={`at-tape-ticker-item ${highlight.has(sym) ? 'at-tape-ticker-item-today' : ''}`}
            >
              {sym}
            </span>
          ))}
        </div>
      </div>
      <span className="at-tape-ticker-count" title={`${onFloorCount} on today's floor`}>
        {symbols.length}
      </span>
    </div>
  );
}