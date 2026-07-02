'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { fetchOpeningBellStreak } from '../lib/game-api';
import { getOpeningBellStreak, type OpeningBellStreakInfo } from '../lib/opening-bell-streak';

export default function OpeningBellStreakBadge({
  useServer = false,
  className = '',
}: {
  useServer?: boolean;
  className?: string;
}) {
  const [info, setInfo] = useState<OpeningBellStreakInfo | null>(null);

  const refresh = useCallback(async () => {
    if (useServer) {
      try {
        const remote = await fetchOpeningBellStreak();
        const { applyServerStreakSnapshot } = await import('../lib/opening-bell-streak');
        setInfo(applyServerStreakSnapshot(remote.streak, remote.lastDayEt));
        return;
      } catch {
        /* fall through to local */
      }
    }
    setInfo(getOpeningBellStreak());
  }, [useServer]);

  useEffect(() => {
    void refresh();
    window.addEventListener('tradr-streak-update', refresh);
    const id = window.setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener('tradr-streak-update', refresh);
      window.clearInterval(id);
    };
  }, [refresh]);

  if (!info || (info.streak < 1 && !info.playedToday)) return null;

  const streakLabel =
    info.streak > 0 ? `${info.streak}-day tape streak` : 'Ring in today — start your streak';

  const milestoneHint =
    info.nextMilestone && info.daysToNext > 0
      ? `${info.daysToNext}d to ${info.rewardLabel ?? 'bonus'}`
      : info.streak >= 7
        ? 'Week warrior'
        : null;

  return (
    <div
      className={`at-streak-badge ${className}`.trim()}
      title="Play Opening Bell daily — streak credits hit your balance at 3 and 7 days"
    >
      <Flame size={12} className="at-streak-icon" aria-hidden />
      <span className="at-streak-text">{streakLabel}</span>
      {milestoneHint && <span className="at-streak-milestone">· {milestoneHint}</span>}
    </div>
  );
}