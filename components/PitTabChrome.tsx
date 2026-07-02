'use client';

import React from 'react';
import { User } from 'lucide-react';

type PitTabChromeProps = {
  kicker: string;
  title: string;
  statusLine?: React.ReactNode;
  balance: number;
  user: { email?: string | null } | null;
  stripeEnabled?: boolean;
  devWalletEnabled?: boolean;
  onDeposit?: (amount: number) => void;
  onProfile: () => void;
  trailing?: React.ReactNode;
};

export default function PitTabChrome({
  kicker,
  title,
  statusLine,
  balance,
  user,
  stripeEnabled = false,
  devWalletEnabled = false,
  onDeposit,
  onProfile,
  trailing,
}: PitTabChromeProps) {
  return (
    <header className="ptc-chrome">
      <div className="ptc-chrome-main">
        <div className="ptc-chrome-copy">
          <p className="ptc-kicker">{kicker}</p>
          <div className="ptc-title-row">
            <h1 className="ptc-title">{title}</h1>
            {trailing}
          </div>
          {statusLine ? <div className="ptc-status">{statusLine}</div> : null}
        </div>
        <div className="ptc-chrome-actions">
          <div className="ptc-balance-block">
            <span className="ptc-balance-label">Balance</span>
            <span className="ptc-balance-value">${balance.toFixed(2)}</span>
          </div>
          {devWalletEnabled && user && onDeposit && (
            <button type="button" onClick={() => onDeposit(50)} className="ptc-deposit-chip">
              +$50
            </button>
          )}
          <button type="button" onClick={onProfile} className="ptc-avatar-btn" aria-label="Profile">
            {user ? (
              <span className="ptc-avatar-letter">
                {user.email?.[0]?.toUpperCase() || 'U'}
              </span>
            ) : (
              <User size={16} />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}