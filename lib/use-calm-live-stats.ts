'use client';

import { useEffect, useRef, useState } from 'react';

export type CalmLiveStatsOptions = {
  liveValue: number;
  pnlPct: number;
  rank: number | null;
  /** Min ms between display updates (default 2500) */
  throttleMs?: number;
  /** Min $ move before value display updates (default 250) */
  valueMinDelta?: number;
  /** Min % move before P&L display updates (default 0.15) */
  pnlMinDelta?: number;
};

export type CalmLiveStats = {
  displayValue: number;
  displayPnl: number;
  displayRank: number | null;
  valueFlash: 'up' | 'down' | null;
};

export function useCalmLiveStats({
  liveValue,
  pnlPct,
  rank,
  throttleMs = 2500,
  valueMinDelta = 250,
  pnlMinDelta = 0.15,
}: CalmLiveStatsOptions): CalmLiveStats {
  const [displayValue, setDisplayValue] = useState(liveValue);
  const [displayPnl, setDisplayPnl] = useState(pnlPct);
  const [displayRank, setDisplayRank] = useState(rank);
  const [valueFlash, setValueFlash] = useState<'up' | 'down' | null>(null);

  const lastCommitRef = useRef(Date.now());
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownRef = useRef({ value: liveValue, pnl: pnlPct, rank });

  useEffect(() => {
    const commit = () => {
      const prev = shownRef.current.value;
      if (liveValue !== prev) {
        setValueFlash(liveValue > prev ? 'up' : 'down');
        if (flashRef.current) clearTimeout(flashRef.current);
        flashRef.current = setTimeout(() => setValueFlash(null), 600);
      }
      shownRef.current = { value: liveValue, pnl: pnlPct, rank };
      setDisplayValue(liveValue);
      setDisplayPnl(pnlPct);
      setDisplayRank(rank);
      lastCommitRef.current = Date.now();
    };

    const valueDelta = Math.abs(liveValue - shownRef.current.value);
    const pnlDelta = Math.abs(pnlPct - shownRef.current.pnl);
    const rankChanged = rank !== shownRef.current.rank;
    const elapsed = Date.now() - lastCommitRef.current;

    const significant =
      rankChanged ||
      valueDelta >= valueMinDelta ||
      pnlDelta >= pnlMinDelta ||
      elapsed >= throttleMs;

    if (significant) {
      if (pendingRef.current) {
        clearTimeout(pendingRef.current);
        pendingRef.current = null;
      }
      commit();
      return;
    }

    if (!pendingRef.current) {
      const wait = Math.max(0, throttleMs - elapsed);
      pendingRef.current = setTimeout(() => {
        pendingRef.current = null;
        commit();
      }, wait);
    }

    return () => {
      if (pendingRef.current) {
        clearTimeout(pendingRef.current);
        pendingRef.current = null;
      }
    };
  }, [liveValue, pnlPct, rank, throttleMs, valueMinDelta, pnlMinDelta]);

  useEffect(
    () => () => {
      if (flashRef.current) clearTimeout(flashRef.current);
    },
    []
  );

  return { displayValue, displayPnl, displayRank, valueFlash };
}