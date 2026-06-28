'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { Contest } from '../lib/game-types';
import { TimeLeftLabel } from './BellCountdown';
import ScheduledPitChip from './ScheduledPitChip';
import { formatOpensAtLabel } from '../lib/pit-schedule';
import { useHydrated } from '../lib/use-hydrated';

type ArenaPitCardProps = {
  contest: Contest;
  isJoined: boolean;
  rank?: number | null;
  participantCount: number;
  scheduled?: boolean;
  bellTick: number;
  onPress: () => void;
  onInfo?: () => void;
};

export default function ArenaPitCard({
  contest,
  isJoined,
  rank,
  participantCount,
  scheduled = false,
  bellTick,
  onPress,
  onInfo,
}: ArenaPitCardProps) {
  const hydrated = useHydrated();

  return (
    <div className={`arena-pit-card-wrap ${isJoined ? 'arena-pit-card-joined' : ''} ${scheduled ? 'arena-pit-card-scheduled' : ''}`}>
    <button
      type="button"
      onClick={onPress}
      className="arena-pit-card w-full text-left"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {!scheduled ? (
              <span className="arena-live-pill arena-live-pill-sm">
                <span className="w-1 h-1 rounded-full bg-[#0A0A0A] live-dot" />
                Live
              </span>
            ) : (
              <ScheduledPitChip contest={contest} tick={bellTick} />
            )}
            {isJoined && (
              <span className="text-[9px] font-bold tracking-wide text-accent uppercase">Rang in</span>
            )}
          </div>
          <div className="font-semibold text-[15px] tracking-[-0.3px] leading-tight truncate">{contest.title}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-lg text-accent tabular-nums leading-none">${contest.firstPrize}</div>
          <div className="text-[9px] text-muted mt-0.5">1st</div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-muted flex items-center gap-2 flex-wrap">
          <span>{contest.entryFee === 0 ? 'Free entry' : `$${contest.entryFee} entry`}</span>
          <span className="text-card">·</span>
          <span>{participantCount} traders</span>
          {isJoined && rank && (
            <>
              <span className="text-card">·</span>
              <span className="font-mono text-accent">#{rank}</span>
            </>
          )}
        </div>
        <div className="text-[10px] text-muted inline-flex items-center gap-1 shrink-0">
          <Clock size={10} />
          {scheduled ? (
            hydrated ? (
              formatOpensAtLabel(contest.startsAt) ?? 'Scheduled'
            ) : (
              '—'
            )
          ) : contest.endsAt ? (
            <TimeLeftLabel endsAt={contest.endsAt} status={contest.status} tick={bellTick} />
          ) : (
            contest.timeLeft
          )}
        </div>
      </div>

    </button>
    {onInfo && (
      <button
        type="button"
        onClick={onInfo}
        className="arena-pit-card-info"
        data-tour="contest-info"
      >
        Rules & assets
      </button>
    )}
    </div>
  );
}