'use client';

import React from 'react';
import { Flame, Share2 } from 'lucide-react';
import SettleShareCard from './SettleShareCard';
import { getCurrentDailyPitWindow, msUntilDailyPitOpen, formatDailyPitScheduleLabel } from '../lib/daily-pit-schedule';
import { formatBellCountdown } from '../lib/contest-bell';
import { getDailyStreak } from '../lib/daily-streak';

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
  nextPit?: { title: string; entryFee: number } | null;
  canJoinNextPit?: boolean;
  onReadTape: () => void;
  onRunItBack: () => void;
  onShare: () => void;
  onViewDone: () => void;
  onDismiss: () => void;
};

export default function SettlementModal({
  result,
  nextPit,
  canJoinNextPit = true,
  onReadTape,
  onRunItBack,
  onShare,
  onViewDone,
  onDismiss,
}: SettlementModalProps) {
  const phase = getCurrentDailyPitWindow().phase;
  const openMs = msUntilDailyPitOpen();
  const streak = getDailyStreak();

  const runItBackLabel = nextPit
    ? canJoinNextPit
      ? `Ring in — $${nextPit.entryFee} · ${nextPit.title}`
      : `Already in ${nextPit.title}`
    : 'Back to Arena';
  const isWin = !result.voided && result.rank === 1;
  const isPodium = !result.voided && result.rank > 1 && result.rank <= 3;

  const nextPitCopy =
    phase === 'between'
      ? openMs > 0
        ? `Tomorrow's pit rings in ${formatBellCountdown(openMs)} · ${formatDailyPitScheduleLabel()}`
        : `Tomorrow's pit rings at 9:30 AM ET · same tape, bigger pot`
      : canJoinNextPit && nextPit
        ? `Today's pit is still open — ring in again and run it back on the tape.`
        : nextPit
          ? `You're on today's tape. Bell closes at 4:00 PM ET.`
          : null;

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

        {streak.count >= 2 && (
          <div className="dp-streak-badge mx-auto mb-4 w-fit">
            <Flame size={14} className="text-orange-400 shrink-0" aria-hidden />
            <span>{streak.count}-day streak</span>
          </div>
        )}

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

        {nextPitCopy && (
          <p className="text-[11px] text-muted mb-4 leading-relaxed">
            {nextPitCopy}
          </p>
        )}

        <div className="flex flex-col gap-2">
          {nextPit && canJoinNextPit ? (
            <button type="button" onClick={onRunItBack} className="btn btn-primary w-full py-3.5 text-sm">
              {runItBackLabel}
            </button>
          ) : null}
          {!result.voided && (
            <button
              type="button"
              onClick={onReadTape}
              className={`w-full py-3.5 text-sm rounded-xl ${nextPit && canJoinNextPit ? 'border border-accent/40 text-accent' : 'btn btn-primary'}`}
            >
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
          {(!nextPit || !canJoinNextPit) && (
            <button
              type="button"
              onClick={onRunItBack}
              className={`w-full py-3.5 text-sm rounded-xl ${result.voided ? 'btn btn-primary' : 'border border-accent/40 text-accent'}`}
            >
              {runItBackLabel}
            </button>
          )}
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