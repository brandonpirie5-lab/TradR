'use client';

import React from 'react';
import { DAILY_ENTRY_FEE, DAILY_MAX_ENTRIES } from '../lib/daily-pit-config';
import { formatBellCountdown } from '../lib/contest-bell';
import { msUntilDailyPitOpen } from '../lib/daily-pit-schedule';

type TomorrowPitBannerProps = {
  isJoined: boolean;
  participantCount: number;
  hydrated: boolean;
  onRingIn?: () => void;
  variant?: 'arena' | 'battles';
};

export default function TomorrowPitBanner({
  isJoined,
  participantCount,
  hydrated,
  onRingIn,
  variant = 'arena',
}: TomorrowPitBannerProps) {
  const openMs = msUntilDailyPitOpen();
  const spotsLeft = Math.max(0, DAILY_MAX_ENTRIES - participantCount);

  if (isJoined) {
    return (
      <div className={`dp-tomorrow-banner dp-tomorrow-banner-locked ${variant === 'battles' ? 'dp-tomorrow-banner-battles' : ''}`}>
        <span className="dp-tomorrow-kicker">Spot locked</span>
        <span className="dp-tomorrow-copy">
          You&apos;re in for tomorrow&apos;s pit
          {hydrated && openMs > 0 ? ` — bell in ${formatBellCountdown(openMs)}` : ''}. Ticket in
          Battles → Upcoming.
        </span>
      </div>
    );
  }

  return (
    <div className={`dp-tomorrow-banner ${variant === 'battles' ? 'dp-tomorrow-banner-battles' : ''}`}>
      <div className="dp-tomorrow-text">
        <span className="dp-tomorrow-kicker">Ring in for tomorrow</span>
        <span className="dp-tomorrow-copy">
          Lock your ${DAILY_ENTRY_FEE} seat before the room fills
          {spotsLeft < DAILY_MAX_ENTRIES ? ` · ${spotsLeft} spots left` : ''}
          {hydrated && openMs > 0 ? ` · opens ${formatBellCountdown(openMs)}` : ''}.
        </span>
      </div>
      {onRingIn && (
        <button type="button" className="dp-tomorrow-cta" onClick={onRingIn}>
          Ring in · ${DAILY_ENTRY_FEE}
        </button>
      )}
    </div>
  );
}