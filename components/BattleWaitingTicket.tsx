'use client';

import React from 'react';
import { Contest, Participation } from '../lib/game-types';
import ScheduledPitChip from './ScheduledPitChip';

type BattleWaitingTicketProps = {
  contest: Contest;
  participation: Participation;
  bellTick: number;
};

export default function BattleWaitingTicket({
  contest,
  participation,
  bellTick,
}: BattleWaitingTicketProps) {
  const entryLabel = contest.entryFee === 0 ? 'Free entry' : `$${contest.entryFee} rang in`;

  return (
    <article className="bt-ticket bt-ticket-waiting bt-ticket-poster">
      <div className="bt-ticket-poster-glow bt-ticket-poster-glow-wait" aria-hidden />
      <div className="bt-ticket-accent bt-ticket-accent-wait" aria-hidden />
      <div className="bt-ticket-inner">
        <div className="bt-ticket-top">
          <div className="bt-ticket-badges">
            <span className="bt-badge bt-badge-in">Rang in</span>
            <span className="bt-badge bt-badge-soon">Pre-bell</span>
          </div>
        </div>

        <h3 className="bt-ticket-name">{contest.title}</h3>

        <div className="bt-ticket-wait-hero">
          <div className="bt-ticket-wait-prize-block">
            <span className="bt-ticket-wait-prize">${contest.firstPrize.toLocaleString()}</span>
            <span className="bt-ticket-wait-prize-lbl">1st place</span>
          </div>
          <ScheduledPitChip contest={contest} tick={bellTick} />
        </div>

        <p className="bt-ticket-tape-line">Tape: {contest.assets.join(' · ')}</p>

        <p className="bt-ticket-wait-foot">
          <span className="bt-ticket-meta-strong">${participation.cash.toLocaleString()} loaded</span>
          <span> · </span>
          <span>{entryLabel}</span>
          <span> · </span>
          <span>Trading opens at the bell</span>
        </p>
      </div>
    </article>
  );
}