'use client';

import React, { useState } from 'react';
import { Trophy, DollarSign } from 'lucide-react';
import { DAILY_ENTRY_FEE, DAILY_MIN_ENTRIES } from '../lib/daily-pit-config';

export default function OnboardingPit({
  onComplete,
  onSetUsername,
  onJoinPit,
  onDeposit,
  defaultUsername,
  balance = 0,
  stripeEnabled = false,
}: {
  onComplete: (opts?: { skipped?: boolean }) => void;
  onSetUsername: (name: string) => Promise<void>;
  onJoinPit: () => Promise<void>;
  onDeposit?: () => void;
  defaultUsername?: string;
  balance?: number;
  stripeEnabled?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState(defaultUsername || '');
  const [loading, setLoading] = useState(false);

  const canJoin = balance >= DAILY_ENTRY_FEE;

  const finish = (opts?: { skipped?: boolean }) => {
    onComplete(opts);
  };

  const handleStep0 = async () => {
    const raw = username.trim().replace(/^@/, '');
    if (raw.length < 3) return;
    setLoading(true);
    try {
      await onSetUsername(raw);
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const handleRingIn = async () => {
    if (!canJoin) {
      onDeposit?.();
      return;
    }
    setLoading(true);
    try {
      await onJoinPit();
      finish();
    } catch {
      /* optional */
    } finally {
      setLoading(false);
    }
  };

  if (step === 0) {
    return (
      <div className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center p-5">
        <div className="w-full max-w-[380px] bg-card border border-accent/30 rounded-3xl p-6 profile-header-glow">
          <div className="flex gap-2 mb-6 justify-center">
            <div className="h-1 flex-1 rounded-full bg-accent" />
            <div className="h-1 flex-1 rounded-full bg-card border border-card" />
          </div>

          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-accent/15 flex items-center justify-center">
            <Trophy size={28} className="text-accent" />
          </div>

          <div className="text-center mb-5">
            <div className="font-black text-2xl tracking-tight mb-2">TradR Pit</div>
            <p className="text-sm text-secondary leading-relaxed">
              ${DAILY_ENTRY_FEE} in · trade live · top half split the pot. Pick your pit name.
            </p>
          </div>

          <div className="mb-5">
            <div className="text-[10px] text-muted tracking-widest mb-1 text-center">DISPLAY NAME</div>
            <div className="flex items-center bg-surface border border-card rounded-xl overflow-hidden">
              <span className="pl-3 text-muted font-mono">@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder="yourname"
                className="flex-1 bg-transparent py-3 pr-3 font-bold focus:outline-none"
                maxLength={20}
                autoFocus
              />
            </div>
          </div>

          <button
            onClick={handleStep0}
            disabled={loading || username.trim().length < 3}
            className="btn btn-primary w-full py-3.5 text-sm disabled:opacity-40"
          >
            {loading ? '…' : 'CONTINUE'}
          </button>

          <button onClick={() => finish({ skipped: true })} className="w-full mt-2 text-xs text-muted py-2">
            Skip — watch the tape first
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center p-5">
      <div className="w-full max-w-[380px] bg-card border border-accent/30 rounded-3xl p-6 profile-header-glow">
        <div className="flex gap-2 mb-6 justify-center">
          <div className="h-1 flex-1 rounded-full bg-accent" />
          <div className="h-1 flex-1 rounded-full bg-accent" />
        </div>

        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-accent/15 flex items-center justify-center">
          <DollarSign size={28} className="text-accent" />
        </div>

        <div className="text-center mb-5">
          <div className="font-black text-2xl tracking-tight mb-2">Ring in</div>
          <p className="text-sm text-secondary leading-relaxed">
            ${DAILY_ENTRY_FEE} from your wallet. Need {DAILY_MIN_ENTRIES}+ traders or the pit refunds.
          </p>
        </div>

        <div className="mb-5 rounded-xl border border-card bg-surface/50 p-3 text-center">
          <div className="text-[10px] text-muted uppercase tracking-widest mb-1">Balance</div>
          <div className="font-mono text-2xl text-accent font-bold">${balance.toLocaleString()}</div>
        </div>

        <button
          onClick={handleRingIn}
          disabled={loading}
          className="btn btn-primary w-full py-3.5 text-sm disabled:opacity-40"
        >
          {loading ? '…' : canJoin ? `RING IN · $${DAILY_ENTRY_FEE}` : stripeEnabled ? 'ADD FUNDS' : 'CHECK WALLET'}
        </button>

        <button onClick={() => finish({ skipped: true })} className="w-full mt-2 text-xs text-muted py-2">
          Skip — I&apos;ll ring in later
        </button>
      </div>
    </div>
  );
}