'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { DAILY_ENTRY_FEE, DAILY_MIN_ENTRIES, DAILY_MAX_ENTRIES } from '../lib/daily-pit-config';
import { computeEffectivePool } from '../lib/pit-pool-math';

type SocialProofStripProps = {
  participantCount: number;
  slug?: string;
};

export default function SocialProofStrip({ participantCount, slug }: SocialProofStripProps) {
  const poolAtMin = computeEffectivePool(slug, {
    entryFee: DAILY_ENTRY_FEE,
    participantCount: DAILY_MIN_ENTRIES,
  });
  const spotsLeft = Math.max(0, DAILY_MAX_ENTRIES - participantCount);

  if (participantCount >= DAILY_MIN_ENTRIES) {
    return (
      <div className="dp-social-proof dp-social-proof-live">
        <Users size={13} className="shrink-0 text-accent" aria-hidden />
        <span>
          <strong>{participantCount}</strong> on the tape · {spotsLeft} spots left · pool grows every ring-in
        </span>
      </div>
    );
  }

  return (
    <div className="dp-social-proof">
      <Users size={13} className="shrink-0" aria-hidden />
      <span>
        Pit runs at <strong>{DAILY_MIN_ENTRIES} traders</strong> — unlocks{' '}
        <strong>${poolAtMin.toLocaleString()}</strong> pool · {participantCount}/{DAILY_MIN_ENTRIES} so far
      </span>
    </div>
  );
}