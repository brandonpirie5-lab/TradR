'use client';

import React, { useEffect, useState } from 'react';
import { Info, X } from 'lucide-react';
import AssetChart from './AssetChart';
import AssetChip from './AssetChip';
import { BellCountdown } from './BellCountdown';
import MoneyZoneBar from './MoneyZoneBar';
import TradeMeter from './TradeMeter';
import {
  Contest,
  LeaderboardEntry,
  Participation,
} from '../lib/game-types';
import type { TradeLimitInfo } from '../lib/trade-limits';
import { isContestBellOpen, isContestTradingOpen, isPriceStale } from '../lib/contest-bell';
import { isSymbolTradableNow } from '../lib/market-hours';
import { portfolioAfterTrade, estimateRankAfterTrade } from '../lib/simulate-trade';
import { sharesForCashPercent, sharesForPositionPercent } from '../lib/trade-sizing';
import { useCalmLiveStats } from '../lib/use-calm-live-stats';

type TradeSheetProps = {
  contestId: number;
  contest: Contest;
  participation: Participation;
  board: LeaderboardEntry[];
  liveValue: number;
  rank: number | null;
  prices: Record<string, number>;
  priceFlashes: Record<string, 'up' | 'down'>;
  tradeSymbol: string;
  tradeShares: string;
  tradeSide: 'buy' | 'sell';
  selectedChartSymbol: string;
  tradeLimit: TradeLimitInfo | null | undefined;
  lastPriceUpdate: Date | null;
  bellTick: number;
  hydrated: boolean;
  userId: string;
  onClose: () => void;
  onInfo: () => void;
  onLeaderboard: () => void;
  onTradeSymbol: (symbol: string) => void;
  onTradeShares: (shares: string) => void;
  onTradeSide: (side: 'buy' | 'sell') => void;
  onClearChart: () => void;
  onRefreshPrices: () => void | Promise<void>;
  onExecuteTrade: () => void;
};

export default function TradeSheet({
  contestId,
  contest,
  participation,
  board,
  liveValue,
  rank,
  prices,
  priceFlashes,
  tradeSymbol,
  tradeShares,
  tradeSide,
  selectedChartSymbol,
  tradeLimit,
  lastPriceUpdate,
  bellTick,
  hydrated,
  userId,
  onClose,
  onInfo,
  onLeaderboard,
  onTradeSymbol,
  onTradeShares,
  onTradeSide,
  onClearChart,
  onRefreshPrices,
  onExecuteTrade,
}: TradeSheetProps) {
  void bellTick;
  const [refreshingPrices, setRefreshingPrices] = useState(false);

  const refreshPrices = async () => {
    setRefreshingPrices(true);
    try {
      await onRefreshPrices();
    } finally {
      setRefreshingPrices(false);
    }
  };

  useEffect(() => {
    void refreshPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId]);

  const pnlPct = ((liveValue / participation.startingValue) - 1) * 100;
  const calm = useCalmLiveStats({
    liveValue,
    pnlPct,
    rank,
    throttleMs: 2000,
    valueMinDelta: 200,
  });
  const closed = hydrated && !isContestBellOpen(contest);
  const pitNotOpen = !isContestTradingOpen(contest);
  const atLimit = !!(tradeLimit && !tradeLimit.unlimited && tradeLimit.remaining === 0);
  const marketClosed = tradeSymbol ? !isSymbolTradableNow(contest, tradeSymbol).ok : false;
  const stale = isPriceStale(lastPriceUpdate);

  const sharesNum = parseFloat(tradeShares || '0');
  const lockedPrice = prices[tradeSymbol];
  let previewRank: number | null = null;
  let previewValue: number | null = null;
  let invalid = false;

  if (tradeSymbol && lockedPrice && !isNaN(sharesNum) && sharesNum > 0) {
    if (tradeSide === 'buy' && participation.cash < sharesNum * lockedPrice) invalid = true;
    if (tradeSide === 'sell') {
      const pos = participation.positions.find((x) => x.symbol === tradeSymbol);
      if (!pos || pos.shares < sharesNum) invalid = true;
    }
    if (!invalid) {
      previewValue = portfolioAfterTrade(
        participation.cash,
        participation.positions,
        prices,
        tradeSymbol,
        tradeSide,
        sharesNum,
        lockedPrice
      );
      if (previewValue != null) {
        previewRank = estimateRankAfterTrade(board, userId || 'you', previewValue);
      }
    }
  }

  const blocked =
    !isContestBellOpen(contest) ||
    pitNotOpen ||
    !prices[tradeSymbol] ||
    atLimit ||
    marketClosed ||
    stale;

  const confirmLabel = atLimit
    ? 'Trade limit reached'
    : pitNotOpen
      ? 'Pit opens soon'
      : marketClosed
        ? 'Market closed'
        : closed
          ? 'Bell rung — closed'
          : stale
            ? 'Refresh prices to trade'
            : `Confirm ${tradeSide}`;

  return (
    <div className="ts-overlay">
      <div className="ts-sheet">
        <div className="ts-sheet-top">
          <p className="ts-sheet-kicker">On the tape</p>
          <div className="ts-head-actions">
            <button type="button" onClick={onInfo} className="ts-icon-btn" aria-label="Contest info">
              <Info size={14} />
            </button>
            <button type="button" onClick={onClose} className="ts-icon-btn" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className={`ts-poster ${closed ? '' : 'ts-poster-live'}`}>
          <div className="ts-poster-glow" aria-hidden />
          <div className="ts-poster-phase">
            <span className={`ts-poster-dot ${closed ? '' : 'ts-poster-dot-live'}`} />
            {closed ? 'BELL RUNG' : 'LIVE ON THE TAPE'}
          </div>
          <h2 className="ts-poster-title">{contest.title}</h2>
          <div className="ts-poster-stats">
            <div className="ts-poster-stat">
              <span className="ts-poster-stat-label">Rank</span>
              <span className="ts-poster-stat-rank">#{calm.displayRank ?? '—'}</span>
            </div>
            <div className="ts-poster-stat ts-poster-stat-main">
              <span className="ts-poster-stat-label">Portfolio</span>
              <span
                className={`ts-poster-value ${calm.valueFlash === 'up' ? 'ts-poster-value-up' : calm.valueFlash === 'down' ? 'ts-poster-value-down' : ''}`}
              >
                ${calm.displayValue.toLocaleString()}
              </span>
              <span className={calm.displayPnl >= 0 ? 'ts-poster-pnl-up' : 'ts-poster-pnl-down'}>
                {calm.displayPnl >= 0 ? '+' : ''}
                {calm.displayPnl.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className={`ts-poster-bell ${closed ? 'ts-poster-bell-closed' : ''}`}>
            {!hydrated ? '—' : closed ? 'Trading closed' : (
              <BellCountdown contest={contest} tick={bellTick} prefix="Bell in " openText="Pit open" />
            )}
          </div>
          <p className="ts-poster-tape">Tape: {contest.assets.join(' · ')}</p>
        </div>

        <div className="ts-zone">
          <MoneyZoneBar
            entries={board}
            yourValue={calm.displayValue}
            slug={contest.slug}
            entryFee={contest.entryFee}
            hero
          />
        </div>

        {tradeLimit && !tradeLimit.unlimited && (
          <div className="ts-trade-meter">
            <TradeMeter info={tradeLimit} compact />
          </div>
        )}

        {(stale || refreshingPrices) && (
          <div className="ts-stale">
            {refreshingPrices
              ? 'Updating live prices…'
              : 'Prices over 30s old.'}
            <button
              type="button"
              onClick={() => void refreshPrices()}
              disabled={refreshingPrices}
              className="ml-2 text-accent underline disabled:opacity-50"
            >
              {refreshingPrices ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        )}

        <div className="ts-assets">
          {contest.assets.map((sym) => {
            const currentP = prices[sym];
            const pos = participation.positions.find((pp) => pp.symbol === sym);
            const posValue = pos ? Math.round(pos.shares * currentP) : 0;
            const isSelected = tradeSymbol === sym;
            const flash = priceFlashes[sym];
            return (
              <div
                key={sym}
                role="button"
                tabIndex={0}
                onClick={() => onTradeSymbol(sym)}
                onKeyDown={(e) => e.key === 'Enter' && onTradeSymbol(sym)}
                className={`ts-asset ${isSelected ? 'ts-asset-on' : ''} ${flash === 'up' ? 'ts-asset-flash-up' : flash === 'down' ? 'ts-asset-flash-down' : ''}`}
              >
                <div className="ts-asset-top">
                  <div onClick={(e) => e.stopPropagation()}>
                    <AssetChip symbol={sym} size="sm" />
                  </div>
                  <span className="ts-asset-price">
                    ${currentP?.toFixed(currentP < 10 ? 4 : 2)}
                  </span>
                </div>
                {pos && (
                  <div className="ts-asset-hold">
                    {pos.shares.toFixed(1)} sh · ${posValue.toLocaleString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {(selectedChartSymbol || tradeSymbol) && (
          <div className="ts-chart">
            <AssetChart
              symbol={selectedChartSymbol || tradeSymbol}
              currentPrice={prices[selectedChartSymbol || tradeSymbol] || 0}
              livePrices={prices}
              userPosition={
                participation.positions.find(
                  (p) => p.symbol === (selectedChartSymbol || tradeSymbol)
                ) || null
              }
              tall
              onClose={onClearChart}
            />
          </div>
        )}

        {board.length > 0 && (
          <button type="button" onClick={onLeaderboard} className="ts-leaderboard-link">
            Full leaderboard →
          </button>
        )}

        <div className="ts-order">
          <div className="text-[10px] font-bold tracking-widest uppercase text-muted">Shares</div>
          <input
            type="number"
            value={tradeShares}
            onChange={(e) => onTradeShares(e.target.value)}
            className="ts-shares-input"
          />
          <div className="ts-quick-row">
            {[10, 25, 50, 100].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  const pos = participation.positions.find((p) => p.symbol === tradeSymbol);
                  const price = prices[tradeSymbol] || 1;
                  if (tradeSide === 'sell' && pos) {
                    onTradeShares(sharesForPositionPercent(pos.shares, tradeSymbol, q));
                  } else {
                    onTradeShares(sharesForCashPercent(participation.cash, price, tradeSymbol, q));
                  }
                }}
                className="ts-quick-btn"
              >
                {q}%
              </button>
            ))}
          </div>
          <div className="ts-side-row">
            <button
              type="button"
              onClick={() => onTradeSide('buy')}
              className={`ts-side-btn ${tradeSide === 'buy' ? 'ts-side-btn-on' : ''}`}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => onTradeSide('sell')}
              className={`ts-side-btn ${tradeSide === 'sell' ? 'ts-side-btn-on' : ''}`}
            >
              Sell
            </button>
          </div>
        </div>

        {!invalid && previewValue != null && previewRank != null && (
          <div className="ts-preview">
            <div className="ts-preview-kicker">After trade</div>
            <div className="flex justify-between items-center">
              <span className="font-mono text-accent">${previewValue.toLocaleString()}</span>
              {rank != null && previewRank !== rank ? (
                <span className="font-mono text-muted">
                  #{rank} → <span className="text-accent">#{previewRank}</span>
                </span>
              ) : (
                <span className="font-mono text-muted">Hold #{previewRank}</span>
              )}
            </div>
          </div>
        )}
        {invalid && (
          <p className="text-[11px] text-red-400 mb-3">
            Insufficient {tradeSide === 'buy' ? 'cash' : 'shares'} for this order
          </p>
        )}

        <button
          type="button"
          onClick={onExecuteTrade}
          disabled={blocked || invalid}
          className="ts-confirm"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}