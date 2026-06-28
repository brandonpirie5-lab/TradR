'use client';

import React from 'react';

type ArenaFloorPulseProps = {
  livePitCount: number;
  totalPool: number;
  traderCount: number;
};

export default function ArenaFloorPulse({ livePitCount, totalPool, traderCount }: ArenaFloorPulseProps) {
  if (livePitCount === 0) return null;

  return (
    <div className="pit-floor-pulse">
      <div className="pit-floor-pulse-inner">
        <span className="pit-floor-orb" aria-hidden />
        <span className="pit-floor-stat">
          <strong>{traderCount}</strong> trading now
        </span>
        <span className="pit-floor-dot">·</span>
        <span className="pit-floor-stat">
          <strong>${totalPool.toLocaleString()}</strong> on the floor
        </span>
        <span className="pit-floor-dot">·</span>
        <span className="pit-floor-stat">
          <strong>{livePitCount}</strong> live {livePitCount === 1 ? 'pit' : 'pits'}
        </span>
      </div>
    </div>
  );
}