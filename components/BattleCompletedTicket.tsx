'use client';

import React from 'react';
import { Trophy } from 'lucide-react';
import { Contest, Participation } from '../lib/game-types';
import { PitProjectedPayout } from './PitMoneyDisplay';

type BattleCompletedTicketProps = {
  contest: Contest;
  participation: Participation;
  finalValue: number;
  highlighted?: boolean;
  onRecap: () => void;
};

export default function BattleCompletedTicket({
  contest,
  participation,
  finalValue,
  highlighted = false,
  onRecap,
}: BattleCompletedTicketProps) {
  const payout = participation.payout || 0;
  const rank = participation.finalRank;
  const pnlPct = ((finalValue / participation.startingValue) - 1) * 100;
  const isWinner = rank === 1;
  const isPodium = rank != null && rank > 1 && rank <= 3;
  const tone = isWinner
    ? 'bt-ticket-won bt-ticket-won-hero'
    : isPodium
      ? 'bt-ticket-placed'
      : payout > 0
        ? 'bt-ticket-cashed'
        : '';

  return (
    <article
      className={`bt-ticket bt-ticket-done relative ${tone} ${highlighted ? 'bt-ticket-done-highlight' : ''} ${highlighted && isWinner ? 'bt-ticket-done-confetti' : ''}`}
    >
      <div
        className={`bt-ticket-accent ${tone ? 'bt-ticket-accent-done' : ''}`}
        aria-hidden
      />
      <div className="bt-ticket-inner">
        <div className="bt-ticket-top">
          <div className="bt-ticket-badges">
            <span className="bt-badge bt-badge-done">Settled</span>
            {isWinner && <span className="bt-badge bt-badge-win">Winner</span>}
            {isPodium && <span className="bt-badge bt-badge-podium">Podium</span>}
          </div>
        </div>

        {isWinner && (
          <div className="bt-done-celebration">
            <Trophy size={18} className="text-accent" />
            <span>You took the pit</span>
          </div>
        )}

        <h3 className={`bt-ticket-name ${isWinner ? 'bt-ticket-name-lead' : ''}`}>{contest.title}</h3>

        <div className={`bt-ticket-done-hero ${isWinner ? 'bt-ticket-done-hero-win' : ''}`}>
          <div className="bt-ticket-done-rank-block">
            <span className={`bt-ticket-done-rank ${isWinner ? 'bt-ticket-done-rank-win' : ''}`}>
              #{rank ?? '—'}
            </span>
            <span className="bt-ticket-done-rank-lbl">final rank</span>
          </div>
          <div className="bt-ticket-done-stats">
            {payout > 0 ? (
              <span className={`bt-ticket-payout-hero ${isWinner ? 'bt-ticket-payout-hero-win' : ''}`}>
                +${payout.toLocaleString()}
              </span>
            ) : rank ? (
              <PitProjectedPayout
                slug={contest.slug}
                rank={rank}
                className="bt-ticket-done-payout-hint"
              />
            ) : null}
            <span className="bt-ticket-done-value">${finalValue.toLocaleString()}</span>
            <span
              className={`bt-ticket-pnl-pill ${pnlPct >= 0 ? 'bt-ticket-pnl-pill-up' : 'bt-ticket-pnl-pill-down'}`}
            >
              {pnlPct >= 0 ? '+' : ''}
              {pnlPct.toFixed(1)}%
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onRecap}
          className={`bt-ticket-recap ${isWinner ? 'bt-ticket-recap-win' : ''}`}
        >
          Read the tape
        </button>
      </div>
    </article>
  );
}