'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Contest, LeaderboardEntry, Participation } from '../lib/game-types';
import { analyzeMoneyZone } from '../lib/money-zone';
import { TimeLeftLabel } from './BellCountdown';
import MoneyZoneBar from './MoneyZoneBar';
import TradeMeter from './TradeMeter';
import type { TradeLimitInfo } from '../lib/trade-limits';
import { useCalmLiveStats } from '../lib/use-calm-live-stats';
import { DAILY_ASSETS } from '../lib/daily-pit-config';

type BattleActiveTicketProps = {
  contest: Contest;
  participation: Participation;
  liveValue: number;
  pnlPct: number;
  rank: number | null;
  board: LeaderboardEntry[];
  prices: Record<string, number>;
  bellTick: number;
  tradeLimit?: TradeLimitInfo | null;
  hero?: boolean;
  onTrade: () => void;
  onLeaderboard: () => void;
  onInfo?: () => void;
};

export default function BattleActiveTicket({
  contest,
  participation,
  liveValue,
  pnlPct,
  rank,
  board,
  prices,
  bellTick,
  tradeLimit,
  hero = false,
  onTrade,
  onLeaderboard,
}: BattleActiveTicketProps) {
  const [positionsOpen, setPositionsOpen] = useState(false);
  const positions = participation.positions;
  const calm = useCalmLiveStats({ liveValue, pnlPct, rank });
  const zone = analyzeMoneyZone(board, calm.displayValue, contest.slug, true, contest.entryFee);
  const zoneTone =
    zone.status === 'in-the-money' || zone.status === 'solo'
      ? 'bt-ticket-zone-in'
      : zone.status === 'bubble'
        ? 'bt-ticket-zone-bubble'
        : '';
  const assets =
    contest.slug === 'daily-pit' ? [...DAILY_ASSETS] : contest.assets.slice(0, 5);

  return (
    <article
      className={`bt-ticket bt-ticket-stub bt-ticket-active ${zoneTone} ${hero ? 'bt-ticket-lead' : ''}`}
      data-tour="overview"
    >
      <div className="bt-ticket-stub-glow" aria-hidden />

      <div className="bt-ticket-stub-head">
        <div className="bt-ticket-stub-badges">
          <span className="bt-badge bt-badge-live">
            <span className="bt-badge-dot" aria-hidden />
            Live
          </span>
          {calm.displayRank != null && (
            <span className="bt-ticket-stub-rank">#{calm.displayRank}</span>
          )}
          {zone.status === 'in-the-money' && (
            <span className="bt-ticket-stub-paid">In the money</span>
          )}
        </div>
        <div className="bt-ticket-stub-clock">
          <span className="bt-ticket-stub-clock-lbl">Closes</span>
          <span className="bt-ticket-stub-clock-val">
            {contest.endsAt ? (
              <TimeLeftLabel endsAt={contest.endsAt} status={contest.status} tick={bellTick} />
            ) : (
              contest.timeLeft
            )}
          </span>
        </div>
      </div>

      <div className="bt-ticket-stub-body">
        <div className="bt-ticket-stub-value-row">
          <div>
            <span className="bt-ticket-stub-value-lbl">Portfolio</span>
            <span
              className={`bt-ticket-stub-value ${calm.valueFlash === 'up' ? 'bt-value-flash-up' : calm.valueFlash === 'down' ? 'bt-value-flash-down' : ''}`}
            >
              ${calm.displayValue.toLocaleString()}
            </span>
          </div>
          <span
            className={`bt-ticket-stub-pnl ${calm.displayPnl >= 0 ? 'up' : 'down'}`}
          >
            {calm.displayPnl >= 0 ? '+' : ''}
            {calm.displayPnl.toFixed(1)}%
          </span>
        </div>

        <p className="bt-ticket-stub-assets">{assets.join(' · ')}</p>

        {tradeLimit && (
          <div className="bt-ticket-stub-trades" data-tour="stats">
            <TradeMeter info={tradeLimit} compact />
          </div>
        )}

        <div className="bt-ticket-stub-zone" data-tour="money-zone">
          <MoneyZoneBar
            entries={board}
            yourValue={calm.displayValue}
            slug={contest.slug}
            entryFee={contest.entryFee}
            compact
            hero={hero}
          />
        </div>

        {positions.length > 0 && (
          <div className="bt-ticket-positions">
            <button
              type="button"
              className="bt-ticket-positions-toggle"
              onClick={() => setPositionsOpen((v) => !v)}
              aria-expanded={positionsOpen}
            >
              <span>
                {positions.length} position{positions.length === 1 ? '' : 's'} · $
                {participation.cash.toLocaleString()} cash
              </span>
              {positionsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {positionsOpen && (
              <div className="bt-ticket-positions-list">
                {positions.map((pos) => {
                  const curPrice = prices[pos.symbol] || pos.avgPrice;
                  const posVal = Math.round(pos.shares * curPrice);
                  return (
                    <div key={pos.symbol} className="bt-ticket-position-row">
                      <span>
                        {pos.symbol} × {pos.shares.toFixed(1)}
                      </span>
                      <span>${posVal.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <button type="button" onClick={onTrade} className="bt-ticket-stub-cta" data-tour="trade">
        Trade now
      </button>
      <button type="button" onClick={onLeaderboard} className="bt-ticket-stub-secondary">
        Vault leaderboard →
      </button>
    </article>
  );
}