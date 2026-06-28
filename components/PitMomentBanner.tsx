'use client';

import React from 'react';
import { TrendingUp, Crown, TrendingDown } from 'lucide-react';
import type { PitMoment } from '../lib/pit-moments';

export default function PitMomentBanner({
  moment,
  onDismiss,
}: {
  moment: PitMoment;
  onDismiss?: () => void;
}) {
  const Icon =
    moment.tone === 'top' ? Crown : moment.tone === 'drop' ? TrendingDown : TrendingUp;

  const border =
    moment.tone === 'top'
      ? 'border-accent/60 bg-accent/10'
      : moment.tone === 'drop'
        ? 'border-red-500/40 bg-red-950/20'
        : 'border-accent/30 bg-surface';

  return (
    <div
      className={`pit-moment-banner mb-3 px-4 py-3 rounded-xl border flex items-center gap-3 ${border}`}
      onClick={onDismiss}
      role={onDismiss ? 'button' : undefined}
    >
      <Icon
        size={18}
        className={moment.tone === 'drop' ? 'text-red-400 shrink-0' : 'text-accent shrink-0'}
      />
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-bold truncate ${moment.tone === 'drop' ? 'text-red-300' : 'text-accent'}`}>
          {moment.headline}
        </div>
        {moment.detail && <div className="text-[11px] text-muted truncate">{moment.detail}</div>}
      </div>
    </div>
  );
}