'use client';

import React from 'react';
import { Wallet } from 'lucide-react';
import { DAILY_ENTRY_FEE } from '../lib/daily-pit-config';

export default function LowBalanceNudge({
  balance,
  isJoined,
  stripeEnabled,
  onDeposit,
  className = '',
}: {
  balance: number;
  isJoined: boolean;
  stripeEnabled?: boolean;
  onDeposit?: () => void;
  className?: string;
}) {
  if (isJoined || balance >= DAILY_ENTRY_FEE) return null;

  const shortfall = Math.ceil((DAILY_ENTRY_FEE - balance) * 100) / 100;
  const cta = stripeEnabled ? 'Deposit' : 'Add funds';

  return (
    <button
      type="button"
      className={`at-low-balance-nudge ${className}`.trim()}
      onClick={onDeposit}
    >
      <Wallet size={14} className="shrink-0 text-accent" aria-hidden />
      <span>
        <strong>${shortfall.toFixed(2)} short</strong> to ring in — ${DAILY_ENTRY_FEE} entry required
      </span>
      <span className="at-low-balance-cta">{cta} →</span>
    </button>
  );
}