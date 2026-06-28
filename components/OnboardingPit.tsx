'use client';

import React, { useState } from 'react';
import { Trophy, User, Target, Zap } from 'lucide-react';

export default function OnboardingPit({
  onComplete,
  onSetUsername,
  onJoinFreePit,
  defaultUsername,
}: {
  onComplete: () => void;
  onSetUsername: (name: string) => Promise<void>;
  onJoinFreePit: () => Promise<void>;
  defaultUsername?: string;
}) {
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState(defaultUsername || '');
  const [loading, setLoading] = useState(false);

  const steps = [
    {
      icon: Trophy,
      title: 'Welcome to the Pit',
      body: 'Live fantasy trading. Fake money, real ego. Outtrade the room before the bell rings.',
    },
    {
      icon: User,
      title: 'Claim your tape name',
      body: 'This is how you show up on the feed, vault, and leaderboard. Make it memorable — or regrettable.',
    },
    {
      icon: Target,
      title: 'Follow the money zone',
      body: 'Green = in the money. Yellow = on the bubble. Every trade card shows exactly how far you are from a real payout — not just your rank.',
    },
    {
      icon: Zap,
      title: 'Ring your first ticket',
      body: 'Opening Bell Bloodbath is free and always on. Make one trade, watch your money zone move, then scout today\'s paid pits.',
    },
  ];

  const StepIcon = steps[step].icon;
  const totalSteps = steps.length;

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
        onComplete();
      }
      return;
    }
    setStep((s) => s + 1);
  };

  const ctaLabel =
    step === 0
      ? 'ENTER THE ARENA'
      : step === 1
        ? 'LOCK IN NAME'
        : step === 2
          ? 'GOT IT'
          : 'RING IN FREE';

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
          <p className="text-sm text-secondary leading-relaxed">{steps[step].body}</p>
        </div>

        {step === 1 && (
          <div className="mb-5">
            <div className="text-[10px] text-muted tracking-widest mb-1 text-center">TAPE NAME</div>
            <div className="flex items-center bg-surface border border-card rounded-xl overflow-hidden">
              <span className="pl-3 text-muted font-mono">@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder="yourname"
                className="flex-1 bg-transparent py-3 pr-3 font-bold focus:outline-none"
                maxLength={20}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mb-5 rounded-xl border border-yellow-500/25 bg-yellow-500/5 p-3 text-left text-[11px] text-muted space-y-1.5">
            <div className="flex items-center gap-2 text-yellow-300 font-bold text-xs">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              On the bubble
            </div>
            <p>+$842 to pass @tape into the cash zone.</p>
            <div className="flex items-center gap-2 text-accent font-bold text-xs mt-2">
              <span className="w-2 h-2 rounded-full bg-accent" />
              In the money
            </div>
            <p>Projected payout: $125 — defend your spot.</p>
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
          <button onClick={onComplete} className="w-full mt-2 text-xs text-muted py-2">
            Skip — browse the arena first
          </button>
        )}

        {step < 3 && (
          <button onClick={onComplete} className="w-full mt-2 text-xs text-muted py-2">
            Skip onboarding
          </button>
        )}
      </div>
    </div>
  );
}