'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { Contest } from '../lib/game-types';
import { pitJoinLabel } from '../lib/pit-cta';
import { TimeLeftLabel } from './BellCountdown';
import ScheduledPitChip from './ScheduledPitChip';

type BattleDiscoverTicketProps = {
  contest: Contest;
  bellTick: number;
  scheduled?: boolean;
  onJoin: () => void;
};

export default function BattleDiscoverTicket({
  contest,
  bellTick,
  scheduled = false,
  onJoin,
}: BattleDiscoverTicketProps) {
  return (
    <article className={`bt-ticket bt-ticket-discover ${scheduled ? 'bt-ticket-waiting' : ''}`}>
      <div className="bt-ticket-head">
        <div className="bt-ticket-main">
          <h3 className="bt-ticket-name">{contest.title}</h3>
          <p className="bt-ticket-meta">
            ${contest.firstPrize.toLocaleString()} 1st
            <span> · </span>
            {contest.entryFee === 0 ? 'Free entry' : `$${contest.entryFee} entry`}
            <span> · </span>
            {scheduled ? (
              <ScheduledPitChip contest={contest} tick={bellTick} />
            ) : (
              <span className="bt-ticket-meta-strong inline-flex items-center gap-1">
                <Clock size={10} />
                {contest.endsAt ? (
                  <TimeLeftLabel endsAt={contest.endsAt} status={contest.status} tick={bellTick} />
                ) : (
                  contest.timeLeft
                )}
              </span>
            )}
          </p>
        </div>
      </div>
      <button type="button" onClick={onJoin} className="bt-ticket-join">
        {pitJoinLabel(contest.entryFee)}
      </button>
    </article>
  );
}