'use client';

import React, { useState } from 'react';
import { X, Trophy, ChevronDown, ChevronUp, ScrollText } from 'lucide-react';
import type { ContestRecap } from '../lib/game-types';
import { countPaidRanks, getPayoutStructure } from '../lib/pit-payouts';
import PitMoneyDisplay, { PitPayoutChip } from './PitMoneyDisplay';

export default function ContestRecapModal({
  recap,
  onClose,
}: {
  recap: ContestRecap;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'standings' | 'tape'>('standings');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const winner = recap.standings.find((s) => s.finalRank === 1);
  const payout = getPayoutStructure(recap.contest.slug);
  const paidRanks = countPaidRanks(payout);
  const tradesByUser = recap.trades.reduce<Record<string, typeof recap.trades>>((acc, t) => {
    if (!acc[t.userId]) acc[t.userId] = [];
    acc[t.userId].push(t);
    return acc;
  }, {});

  const tape = [...recap.trades].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <div className="fixed inset-0 bg-black/92 z-[68] flex items-end">
      <div className="w-full max-w-[420px] mx-auto bg-card border-t border-accent rounded-t-3xl max-h-[90dvh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-card p-5 z-10">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="text-[10px] tracking-[3px] text-muted uppercase">Tape at the Bell</div>
              <div className="font-black text-2xl tracking-tight">{recap.contest.title}</div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <PitPayoutChip slug={recap.contest.slug} />
                <PitMoneyDisplay
                  slug={recap.contest.slug}
                  totalPrizes={recap.contest.totalPrizes}
                  entryFee={recap.contest.entryFee}
                  variant="compact"
                  showChip={false}
                  showSuffix={false}
                />
              </div>
              <div className="text-xs text-muted mt-1">
                {recap.standings.length} traders · top {paidRanks} paid · {recap.trades.length} tickets filled
              </div>
            </div>
            <button onClick={onClose} className="p-1"><X size={22} /></button>
          </div>

          {winner && (
            <div className="bg-user-card border border-accent/30 rounded-xl p-3 mb-3">
              <div className="text-[10px] tracking-widest text-accent mb-1 flex items-center gap-1">
                <Trophy size={12} /> CROWNED AT THE BELL
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold">{winner.username}</div>
                  <div className="font-mono text-accent text-lg">${winner.finalValue.toLocaleString()}</div>
                </div>
                {winner.payout > 0 && <div className="font-mono text-accent">+${winner.payout}</div>}
              </div>
              {winner.positions && winner.positions.length > 0 && (
                <div className="mt-2 pt-2 border-t border-accent/20 text-[10px] space-y-0.5">
                  <div className="text-muted mb-1">Final book:</div>
                  {winner.positions.map((pos) => (
                    <div key={pos.symbol} className="flex justify-between font-mono">
                      <span>{pos.symbol} × {pos.shares.toFixed(1)}</span>
                      <span className="text-muted">avg ${pos.avgPrice.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="text-muted pt-1">Cash: ${(winner.cash ?? 0).toLocaleString()}</div>
                </div>
              )}
            </div>
          )}

          {recap.settlementPrices && Object.keys(recap.settlementPrices).length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {Object.entries(recap.settlementPrices).slice(0, 6).map(([sym, px]) => (
                <span key={sym} className="text-[9px] px-1.5 py-0.5 bg-surface border border-card rounded font-mono">
                  {sym} ${Number(px).toFixed(Number(px) < 10 ? 2 : 0)}
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-1 p-1 bg-surface rounded-lg">
            {(['standings', 'tape'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-md ${tab === t ? 'bg-accent text-black' : 'text-muted'}`}
              >
                {t === 'standings' ? 'STANDINGS' : 'FULL TAPE'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 pt-3">
          {tab === 'tape' && (
            <div className="space-y-0">
              {tape.length === 0 ? (
                <div className="text-center text-muted text-sm py-8">No trades in this pit</div>
              ) : (
                tape.map((t, i) => (
                  <div key={t.id} className="flex gap-3 py-2 border-b border-card/50 text-xs">
                    <div className="text-muted font-mono w-6 shrink-0">{i + 1}</div>
                    <div className="text-muted font-mono w-14 shrink-0">
                      {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={t.isYou || t.username.includes('you') ? 'text-accent font-semibold' : ''}>
                        {t.username}
                      </span>
                      {' '}
                      <span className={t.side === 'buy' ? 'text-accent' : 'text-red-400'}>{t.side.toUpperCase()}</span>
                      {' '}{t.shares} {t.symbol}
                      <span className="text-muted"> @ ${t.price.toFixed(t.price < 10 ? 4 : 2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'standings' &&
            recap.standings.map((s, idx) => {
              const expanded = expandedUser === s.userId;
              const userTrades = tradesByUser[s.userId] || [];
              const inMoney = (s.finalRank ?? 0) <= paidRanks;
              const isCutLine = s.finalRank === paidRanks;
              const placeClass = s.finalRank === 1 ? 'border-accent/50 bg-user-card' : 'border-card';
              const showMoneyCut = s.finalRank === paidRanks + 1;

              return (
                <React.Fragment key={s.userId}>
                  {showMoneyCut && (
                    <div className="recap-money-cut text-[10px] text-accent font-mono text-center py-2 mb-2 border-y border-accent/30">
                      MONEY LINE — top {paidRanks} paid
                    </div>
                  )}
                <div className={`border rounded-2xl overflow-hidden mb-3 ${placeClass} ${s.isYou ? 'ring-1 ring-accent/30' : ''} ${isCutLine ? 'border-accent/40' : ''}`}>
                  <button
                    onClick={() => setExpandedUser(expanded ? null : s.userId)}
                    className="w-full p-4 flex items-center justify-between text-left active:bg-surface/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`font-mono text-lg font-bold w-8 ${s.finalRank === 1 ? 'text-accent' : inMoney ? 'text-accent/80' : 'text-muted'}`}>
                        #{s.finalRank}
                      </div>
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {s.username}
                          {s.isYou && <span className="text-[10px] text-accent">YOU</span>}
                          {s.finalRank === 1 && <Trophy size={12} className="text-accent" />}
                          {inMoney && s.payout > 0 && (
                            <span className="text-[10px] font-mono text-accent font-bold">+${s.payout}</span>
                          )}
                        </div>
                        <div className="text-xs text-muted font-mono">${s.finalValue.toLocaleString()}</div>
                        {!inMoney && (
                          <div className="text-[10px] text-muted">Outside the money</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted">{userTrades.length} trades</span>
                      {expanded ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-card bg-surface/50 px-4 py-3">
                      {s.positions && s.positions.length > 0 && (
                        <div className="mb-2 text-[10px]">
                          <div className="text-muted mb-1">Holdings at bell:</div>
                          {s.positions.map((pos) => (
                            <div key={pos.symbol} className="flex justify-between font-mono py-0.5">
                              <span>{pos.symbol} × {pos.shares.toFixed(1)}</span>
                              <span className="text-muted">${pos.avgPrice.toFixed(2)} avg</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {userTrades.length === 0 ? (
                        <div className="text-xs text-muted py-2 flex items-center gap-1">
                          <ScrollText size={12} /> No trades logged
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {userTrades.map((t) => (
                            <div key={t.id} className="flex justify-between text-xs py-1 border-b border-card/50 last:border-0">
                              <span>
                                <span className={t.side === 'buy' ? 'text-accent' : 'text-red-400'}>{t.side.toUpperCase()}</span>
                                {' '}{t.shares} {t.symbol} @ ${t.price.toFixed(t.price < 10 ? 4 : 2)}
                              </span>
                              <span className="text-muted font-mono">
                                {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                </React.Fragment>
              );
            })}
        </div>
      </div>
    </div>
  );
}