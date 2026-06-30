'use client';

import React from 'react';
import { Contest, Participation } from '../lib/game-types';
import AssetChip from './AssetChip';
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
  const assets = contest.assets.slice(0, 4);
  const assetOverflow = contest.assets.length - assets.length;
  const entryLabel = contest.entryFee === 0 ? 'Free entry' : `$${contest.entryFee} entry`;

  return (
    <article className="bt-ticket bt-ticket-waiting">
      <div className="bt-ticket-accent bt-ticket-accent-wait" aria-hidden />
      <div className="bt-ticket-inner">
        <div className="bt-ticket-top">
          <div className="bt-ticket-badges">
            <span className="bt-badge bt-badge-in">In</span>
            <span className="bt-badge bt-badge-soon">Opens soon</span>
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

        {assets.length > 0 && (
          <div className="bt-ticket-assets">
            {assets.map((symbol) => (
              <AssetChip key={symbol} symbol={symbol} size="sm" />
            ))}
            {assetOverflow > 0 && (
              <span className="bt-ticket-asset-more">+{assetOverflow}</span>
            )}
          </div>
        )}

        <p className="bt-ticket-wait-foot">
          <span className="bt-ticket-meta-strong">${participation.cash.toLocaleString()} ready</span>
          <span> · </span>
          <span>{entryLabel}</span>
          <span> · </span>
          <span>Tape opens at the bell</span>
        </p>
      </div>
    </article>
  );
}