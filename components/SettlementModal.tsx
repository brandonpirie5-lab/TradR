'use client';

import React from 'react';
import { Share2 } from 'lucide-react';
import SettleShareCard from './SettleShareCard';

export type SettlementPayload = {
  contestId: number;
  contestSlug?: string;
  rank: number;
  payout: number;
  refund?: number;
  voided?: boolean;
  contestTitle: string;
  portfolioValue: number;
  startingValue: number;
  settlementPrices?: Record<string, number>;
};

type SettlementModalProps = {
  result: SettlementPayload;
  onReadTape: () => void;
  onRunItBack: () => void;
  onShare: () => void;
  onViewDone: () => void;
  onDismiss: () => void;
};

export default function SettlementModal({
  result,
  onReadTape,
  onRunItBack,
  onShare,
  onViewDone,
  onDismiss,
}: SettlementModalProps) {
  const isWin = !result.voided && result.rank === 1;
  const isPodium = !result.voided && result.rank > 1 && result.rank <= 3;

  return (
    <div
      className="fixed inset-0 bg-black/92 z-[65] flex items-center justify-center p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Pit settlement"
      onClick={onDismiss}
    >
      <div
        className={`settlement-card w-full max-w-[380px] rounded-3xl p-6 text-center my-auto border ${
          result.voided
            ? 'settlement-card-void border-red-500/40'
            : isWin
              ? 'settlement-card-win border-accent/50'
              : isPodium
                ? 'settlement-card-podium border-accent/35'
                : 'border-accent/30'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settlement-card-kicker">
          {result.voided ? 'Pit didn\'t fill' : 'Bell rung — pit closed'}
        </div>

        <SettleShareCard
          contestTitle={result.contestTitle}
          contestSlug={result.contestSlug}
          rank={result.rank}
          portfolioValue={result.portfolioValue}
          startingValue={result.startingValue}
          payout={result.payout}
          voided={result.voided}
          refund={result.refund}
        />

        {!result.voided &&
          result.settlementPrices &&
          Object.keys(result.settlementPrices).length > 0 && (
            <div className="settlement-prices">
              <div className="settlement-prices-kicker">Bell snapshot</div>
              <div className="settlement-prices-grid">
                {Object.entries(result.settlementPrices).map(([sym, px]) => (
                  <div key={sym} className="settlement-prices-row">
                    <span>{sym}</span>
                    <span>${Number(px).toFixed(Number(px) < 10 ? 4 : 2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        <div className="flex flex-col gap-2">
          {!result.voided && (
            <button type="button" onClick={onReadTape} className="btn btn-primary w-full py-3.5 text-sm">
              Read the tape
            </button>
          )}
          <button
            type="button"
            onClick={onViewDone}
            className="bt-ticket-action-full settlement-done-link"
          >
            View in Done tab
          </button>
          <button
            type="button"
            onClick={onRunItBack}
            className={`w-full py-3.5 text-sm rounded-xl ${result.voided ? 'btn btn-primary' : 'border border-accent/40 text-accent'}`}
          >
            Run it back
          </button>
          <button
            type="button"
            onClick={onShare}
            className="w-full py-2.5 text-sm border border-card text-muted rounded-xl flex items-center justify-center gap-2"
          >
            <Share2 size={14} /> Share result
          </button>
        </div>
      </div>
    </div>
  );
}