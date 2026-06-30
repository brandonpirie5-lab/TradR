'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Contest, LeaderboardEntry, Participation } from '../lib/game-types';
import { analyzeMoneyZone } from '../lib/money-zone';
import { TimeLeftLabel } from './BellCountdown';
import AssetChip from './AssetChip';
import MoneyZoneBar from './MoneyZoneBar';
import TradeMeter from './TradeMeter';
import type { TradeLimitInfo } from '../lib/trade-limits';
import { useCalmLiveStats } from '../lib/use-calm-live-stats';

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
  onInfo: () => void;
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
  onInfo,
}: BattleActiveTicketProps) {
  const [positionsOpen, setPositionsOpen] = useState(false);
  const positions = participation.positions;
  const calm = useCalmLiveStats({ liveValue, pnlPct, rank });
  const zone = analyzeMoneyZone(board, calm.displayValue, contest.slug, true);
  const zoneTone =
    zone.status === 'in-the-money' || zone.status === 'solo'
      ? 'bt-ticket-zone-in'
      : zone.status === 'bubble'
        ? 'bt-ticket-zone-bubble'
        : '';
  const assets = contest.assets.slice(0, 4);
  const assetOverflow = contest.assets.length - assets.length;

  return (
    <article
      className={`bt-ticket bt-ticket-active ${zoneTone} ${hero ? 'bt-ticket-lead' : ''}`}
      data-tour="overview"
    >
      <div className="bt-ticket-accent" aria-hidden />
      <div className="bt-ticket-inner">
        <div className="bt-ticket-top">
          <div className="bt-ticket-badges">
            {hero ? (
              <span className="bt-badge bt-badge-lead">Lead pit</span>
            ) : (
              <span className="bt-badge bt-badge-live">
                <span className="bt-badge-dot" aria-hidden />
                Live
              </span>
            )}
            {calm.displayRank != null && (
              <span className="bt-badge bt-badge-rank">#{calm.displayRank}</span>
            )}
          </div>
          <button
            type="button"
            onClick={onInfo}
            className="bt-ticket-info"
            aria-label="Contest info"
            data-tour="contest-info"
          >
            <Info size={14} />
          </button>
        </div>

        <h3 className={`bt-ticket-name ${hero ? 'bt-ticket-name-lead' : ''}`}>{contest.title}</h3>

        <div className={`bt-ticket-hero-stats ${hero ? 'bt-ticket-hero-stats-lead' : ''}`}>
          <div className="bt-ticket-hero-main">
            <span
              className={`bt-ticket-value ${hero ? 'bt-ticket-value-lead' : ''} ${calm.valueFlash === 'up' ? 'bt-value-flash-up' : calm.valueFlash === 'down' ? 'bt-value-flash-down' : ''}`}
            >
              ${calm.displayValue.toLocaleString()}
            </span>
            <span
              className={`bt-ticket-pnl-pill ${calm.displayPnl >= 0 ? 'bt-ticket-pnl-pill-up' : 'bt-ticket-pnl-pill-down'}`}
            >
              {calm.displayPnl >= 0 ? '+' : ''}
              {calm.displayPnl.toFixed(1)}%
            </span>
          </div>
          <div className="bt-ticket-hero-side">
            <span className="bt-ticket-hero-label">Bell closes</span>
            <span className="bt-ticket-hero-time">
              {contest.endsAt ? (
                <TimeLeftLabel endsAt={contest.endsAt} status={contest.status} tick={bellTick} />
              ) : (
                contest.timeLeft
              )}
            </span>
          </div>
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

        <div className="bt-ticket-zone" data-tour="money-zone">
          <MoneyZoneBar
            entries={board}
            yourValue={calm.displayValue}
            slug={contest.slug}
            compact={!hero}
            hero={hero}
          />
        </div>

        {tradeLimit && (
          <div className="bt-ticket-trades" data-tour="stats">
            <TradeMeter info={tradeLimit} compact />
          </div>
        )}

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

        <button type="button" onClick={onTrade} className="bt-ticket-cta" data-tour="trade">
          {hero ? 'Trade this pit' : 'Trade now'}
        </button>
        <button type="button" onClick={onLeaderboard} className="bt-ticket-action-full">
          Leaderboard
        </button>
      </div>
    </article>
  );
}