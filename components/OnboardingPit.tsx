'use client';

import React, { useState } from 'react';
import { Trophy, User, LayoutGrid, DollarSign } from 'lucide-react';
import { DAILY_ENTRY_FEE, DAILY_MIN_ENTRIES } from '../lib/daily-pit-config';
import { PLATFORM_RAKE_PCT } from '../lib/pit-pool-math';

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

  const steps = [
    {
      icon: Trophy,
      title: 'Welcome to TradR Pit',
      body: `$${DAILY_ENTRY_FEE} to enter today's pit. Trade a $100K virtual portfolio — top half split the prize pool.`,
    },
    {
      icon: User,
      title: 'Pick your display name',
      body: 'This is how you show up on the leaderboard.',
    },
    {
      icon: LayoutGrid,
      title: 'Three tabs',
      body: null as string | null,
    },
    {
      icon: DollarSign,
      title: 'Fund & join',
      body: `Deposit to your TradR wallet, then ring in. Pool grows with entries (${PLATFORM_RAKE_PCT}% platform fee). Min ${DAILY_MIN_ENTRIES} traders or the pit voids and refunds.`,
    },
  ];

  const StepIcon = steps[step].icon;
  const totalSteps = steps.length;
  const canJoin = balance >= DAILY_ENTRY_FEE;

  const finish = (opts?: { skipped?: boolean }) => {
    onComplete(opts);
  };

  const handleNext = async () => {
    if (step === 1) {
      const raw = username.trim().replace(/^@/, '');
      if (raw.length < 3) return;
      setLoading(true);
      try {
        await onSetUsername(raw);
        setStep(2);
      } finally {
        setLoading(false);
      }
      return;
    }
    if (step === 3) {
      if (!canJoin) {
        onDeposit?.();
        return;
      }
      setLoading(true);
      try {
        await onJoinPit();
      } catch {
        /* optional */
      } finally {
        setLoading(false);
        finish();
      }
      return;
    }
    setStep((s) => s + 1);
  };

  const ctaLabel =
    step === 0
      ? 'LET\'S GO'
      : step === 1
        ? 'SAVE NAME'
        : step === 2
          ? 'GOT IT'
          : canJoin
            ? `JOIN · $${DAILY_ENTRY_FEE}`
            : stripeEnabled
              ? 'DEPOSIT TO JOIN'
              : 'ADD FUNDS';

  return (
    <div className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center p-5">
      <div className="w-full max-w-[380px] bg-card border border-accent/30 rounded-3xl p-6 profile-header-glow">
        <div className="flex gap-2 mb-6 justify-center">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-accent' : 'bg-card border border-card'}`}
            />
          ))}
        </div>

        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-accent/15 flex items-center justify-center">
          <StepIcon size={28} className="text-accent" />
        </div>

        <div className="text-center mb-5">
          <div className="text-[10px] tracking-[3px] text-muted uppercase mb-1">
            Step {step + 1} of {totalSteps}
          </div>
          <div className="font-black text-2xl tracking-tight mb-2">{steps[step].title}</div>
          {steps[step].body && (
            <p className="text-sm text-secondary leading-relaxed">{steps[step].body}</p>
          )}
        </div>

        {step === 1 && (
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
        )}

        {step === 2 && (
          <div className="mb-5 rounded-xl border border-card bg-surface/50 p-4 text-left text-sm text-secondary space-y-3">
            <div>
              <span className="text-accent font-bold">Arena</span>
              <span className="text-muted"> — see today&apos;s pit and ring in.</span>
            </div>
            <div>
              <span className="text-accent font-bold">Battles</span>
              <span className="text-muted"> — trade when the bell opens.</span>
            </div>
            <div>
              <span className="text-accent font-bold">Vault</span>
              <span className="text-muted"> — live leaderboard.</span>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mb-5 rounded-xl border border-card bg-surface/50 p-3 text-center">
            <div className="text-[10px] text-muted uppercase tracking-widest mb-1">Wallet balance</div>
            <div className="font-mono text-2xl text-accent font-bold">${balance.toLocaleString()}</div>
            <div className="text-[11px] text-muted mt-1">${DAILY_ENTRY_FEE} required to join</div>
          </div>
        )}

        <button
          onClick={handleNext}
          disabled={loading || (step === 1 && username.trim().length < 3)}
          className="btn btn-primary w-full py-3.5 text-sm disabled:opacity-40"
        >
          {loading ? '…' : ctaLabel}
        </button>

        {step === 3 && (
          <button onClick={() => finish({ skipped: true })} className="w-full mt-2 text-xs text-muted py-2">
            Skip — browse first
          </button>
        )}

        {step < 3 && (
          <button onClick={() => finish({ skipped: true })} className="w-full mt-2 text-xs text-muted py-2">
            Skip intro
          </button>
        )}
      </div>
    </div>
  );
}