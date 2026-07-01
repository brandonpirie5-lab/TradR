'use client';

import React, { useState } from 'react';
import { Trophy, User, LayoutGrid, Zap } from 'lucide-react';

export default function OnboardingPit({
  onComplete,
  onSetUsername,
  onJoinFreePit,
  defaultUsername,
  freePitName = 'Opening Bell',
}: {
  onComplete: (opts?: { skipped?: boolean }) => void;
  onSetUsername: (name: string) => Promise<void>;
  onJoinFreePit: () => Promise<void>;
  defaultUsername?: string;
  freePitName?: string;
}) {
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState(defaultUsername || '');
  const [loading, setLoading] = useState(false);

  const steps = [
    {
      icon: Trophy,
      title: 'Welcome to TradR Pit',
      body: 'Live trading contests with $100,000 in play money. Out-trade the room before the bell rings — top spots can win real prizes.',
    },
    {
      icon: User,
      title: 'Pick your display name',
      body: 'This is how you show up on the leaderboard and live tape. Keep it simple — your family will see it.',
    },
    {
      icon: LayoutGrid,
      title: 'Three tabs, that’s it',
      body: null as string | null,
    },
    {
      icon: Zap,
      title: 'Join your first pit — free',
      body: `${freePitName} costs nothing to enter. We’ll ring you in, then you can make your first trade when the bell opens.`,
    },
  ];

  const StepIcon = steps[step].icon;
  const totalSteps = steps.length;

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
      setLoading(true);
      try {
        await onJoinFreePit();
      } catch {
        /* join optional */
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
      ? 'LET’S GO'
      : step === 1
        ? 'SAVE NAME'
        : step === 2
          ? 'GOT IT'
          : 'JOIN FREE PIT';

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
              <span className="text-muted"> — browse today’s pits and ring in with one tap.</span>
            </div>
            <div>
              <span className="text-accent font-bold">Battles</span>
              <span className="text-muted"> — trade stocks & crypto when your pit opens.</span>
            </div>
            <div>
              <span className="text-accent font-bold">Vault</span>
              <span className="text-muted"> — live leaderboard: who’s winning right now.</span>
            </div>
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
            Skip — look around first
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