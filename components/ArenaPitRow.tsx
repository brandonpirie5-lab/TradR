'use client';

import React from 'react';
import { ChevronRight, Clock, Info } from 'lucide-react';
import { Contest } from '../lib/game-types';
import { TimeLeftLabel } from './BellCountdown';
import ScheduledPitChip from './ScheduledPitChip';
import { formatOpensAtLabel } from '../lib/pit-schedule';
import { useHydrated } from '../lib/use-hydrated';

type ArenaPitRowProps = {
  contest: Contest;
  isJoined: boolean;
  rank?: number | null;
  participantCount: number;
  scheduled?: boolean;
  bellTick: number;
  onPress: () => void;
  onInfo?: () => void;
};

export default function ArenaPitRow({
  contest,
  isJoined,
  rank,
  participantCount,
  scheduled = false,
  bellTick,
  onPress,
  onInfo,
}: ArenaPitRowProps) {
  const hydrated = useHydrated();

  return (
    <div className={`arena-pit-row-wrap ${isJoined ? 'arena-pit-row-joined' : ''}`}>
      <button type="button" onClick={onPress} className="arena-pit-row w-full text-left">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              {!scheduled && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent live-dot shrink-0" aria-hidden />
              )}
              <span className="font-medium text-[15px] tracking-[-0.3px] truncate">{contest.title}</span>
              {isJoined && (
                <span className="text-[9px] font-bold tracking-wide text-accent/90 uppercase shrink-0">In</span>
              )}
            </div>
            <div className="text-[11px] text-muted mt-1 flex items-center gap-2 flex-wrap">
              <span>{contest.entryFee === 0 ? 'Free' : `$${contest.entryFee}`}</span>
              <span className="text-card">·</span>
              <span>{participantCount} traders</span>
              <span className="text-card">·</span>
              <span className="inline-flex items-center gap-0.5">
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
              </span>
              {scheduled && <ScheduledPitChip contest={contest} tick={bellTick} />}
            </div>
          </div>
          <div className="shrink-0 text-right pl-1">
            <div className="font-mono text-[15px] text-accent tabular-nums">${contest.firstPrize}</div>
            {isJoined && rank ? (
              <div className="text-[9px] font-mono text-muted">#{rank}</div>
            ) : (
              <div className="text-[9px] text-muted">1st prize</div>
            )}
          </div>
          <ChevronRight size={15} className="text-muted/70 shrink-0" />
        </div>
      </button>
      {onInfo && (
        <button
          type="button"
          onClick={onInfo}
          data-tour="contest-info"
          className="arena-pit-info"
          aria-label={`Info for ${contest.title}`}
        >
          <Info size={13} />
        </button>
      )}
    </div>
  );
}