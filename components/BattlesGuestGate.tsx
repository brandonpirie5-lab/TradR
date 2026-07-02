'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import { DAILY_ENTRY_FEE } from '../lib/daily-pit-config';
import { formatDailyPitScheduleLabel } from '../lib/daily-pit-schedule';

export default function BattlesGuestGate({
  onSignIn,
  onWatchTape,
  onRingIn,
}: {
  onSignIn: () => void;
  onWatchTape: () => void;
  onRingIn?: () => void;
}) {
  return (
    <div className="bt-guest-gate">
      <div className="bt-guest-gate-icon" aria-hidden>
        <Zap size={28} className="text-accent" />
      </div>
      <p className="bt-guest-gate-kicker">Your ticket lives here</p>
      <h2 className="bt-guest-gate-title">Sign in to trade</h2>
      <p className="bt-guest-gate-copy">
        Ring in for ${DAILY_ENTRY_FEE} — your live pit ticket, trades, and results show up in Battles.
      </p>
      <p className="bt-guest-gate-schedule">{formatDailyPitScheduleLabel()}</p>
      <div className="bt-guest-gate-actions">
        <button type="button" className="bt-guest-gate-primary" onClick={onSignIn}>
          Sign in
        </button>
        {onRingIn && (
          <button type="button" className="bt-guest-gate-secondary" onClick={onRingIn}>
            Ring in · ${DAILY_ENTRY_FEE}
          </button>
        )}
        <button type="button" className="bt-guest-gate-link" onClick={onWatchTape}>
          Watch live tape first →
        </button>
      </div>
    </div>
  );
}