'use client';

import React from 'react';
import type { PitFillStatus } from '../lib/contest-fill';

export default function PitFillBanner({
  fill,
  className = '',
}: {
  fill: PitFillStatus;
  className?: string;
}) {
  if (fill.isConfirmed) {
    return (
      <div className={`at-fill-banner at-fill-banner-ok ${className}`.trim()} role="status">
        <span className="at-fill-banner-dot" aria-hidden />
        <span>
          Pit confirmed · <strong>{fill.current}</strong> traders · prizes lock at the bell
        </span>
      </div>
    );
  }

  const tone =
    fill.urgency === 'critical'
      ? 'at-fill-banner-critical'
      : fill.urgency === 'warming'
        ? 'at-fill-banner-warming'
        : 'at-fill-banner-pending';

  return (
    <div className={`at-fill-banner ${tone} ${className}`.trim()} role="status">
      <span className="at-fill-banner-dot" aria-hidden />
      <span>
        <strong>
          {fill.needed} more trader{fill.needed === 1 ? '' : 's'}
        </strong>{' '}
        needed to run ({fill.current}/{fill.minEntries}) — or pit voids + refunds
      </span>
    </div>
  );
}