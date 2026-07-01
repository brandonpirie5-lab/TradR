'use client';

import React from 'react';
import { X } from 'lucide-react';
import { DAILY_ENTRY_FEE, DAILY_MIN_ENTRIES } from '../lib/daily-pit-config';
import { PLATFORM_RAKE_PCT } from '../lib/pit-pool-math';

const SECTIONS = [
  {
    title: 'What is TradR Pit?',
    body: `Fantasy trading contests. Pay $${DAILY_ENTRY_FEE} to enter today's pit, trade a virtual $100,000 portfolio at live market prices, and climb the leaderboard. Top half of the field split the prize pool.`,
  },
  {
    title: 'How do prizes work?',
    body: `Prize pool = entry fees collected minus ${PLATFORM_RAKE_PCT}% platform fee. The top 50% of traders split the pool equally. Pool size grows with every trader who rings in. Need at least ${DAILY_MIN_ENTRIES} traders or the pit voids and entry fees refund.`,
  },
  {
    title: 'Is this gambling?',
    body: 'TradR Pit is designed as a skill-based fantasy contest. You compete with virtual portfolios — no real money is invested in the market. Outcomes depend on trading decisions during the contest window, not chance.',
  },
  {
    title: 'Who can play?',
    body: 'You must be 18 or older (or the legal age in your area). Availability may vary by state or region. This is a placeholder — final eligibility and terms will be published before public launch.',
  },
] as const;

export default function HowItWorksModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[92] flex items-end sm:items-center justify-center bg-black/85 p-0 sm:p-5"
      onClick={onClose}
      role="dialog"
      aria-labelledby="how-it-works-title"
    >
      <div
        className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-card border border-card rounded-t-3xl sm:rounded-3xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[9px] font-bold tracking-[0.16em] uppercase text-muted mb-1">Before you ring in</p>
            <h2 id="how-it-works-title" className="text-lg font-bold tracking-tight">
              How TradR Pit works
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-card flex items-center justify-center text-muted"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h3 className="text-sm font-bold text-[var(--text)] mb-1">{s.title}</h3>
              <p className="text-xs leading-relaxed text-secondary">{s.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-5 pt-4 border-t border-card text-[10px] leading-relaxed text-muted">
          Draft placeholder — not legal advice. Full terms, privacy policy, and state eligibility will ship before App Store launch.
        </p>
      </div>
    </div>
  );
}