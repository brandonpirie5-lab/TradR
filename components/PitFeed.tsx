'use client';

import React from 'react';
import { Zap } from 'lucide-react';

export type PitFeedItem = {
  id: string;
  username: string;
  side: 'buy' | 'sell';
  symbol: string;
  shares: number;
  price?: number;
  createdAt?: string;
  isYou?: boolean;
};

export default function PitFeed({
  items,
  contestTitle,
  loading,
}: {
  items: PitFeedItem[];
  contestTitle?: string;
  loading?: boolean;
}) {
  if (!items.length && !loading) {
    return (
      <div className="pit-feed border border-card rounded-xl px-4 py-3 text-center text-xs text-muted">
        <Zap size={14} className="inline mr-1 text-accent opacity-60" />
        Tape's quiet… someone's about to send it.
      </div>
    );
  }

  const doubled = [...items, ...items];

  return (
    <div className="pit-feed-wrap mb-4">
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <div className="text-[10px] tracking-[2px] text-accent font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-accent live-dot" />
          LIVE TAPE
        </div>
        {contestTitle && <div className="text-[10px] text-muted truncate max-w-[140px]">{contestTitle}</div>}
      </div>
      <div className="pit-feed border border-accent/20 rounded-xl overflow-hidden bg-surface/80">
        {loading && items.length === 0 ? (
          <div className="px-4 py-2.5 text-xs text-muted animate-pulse">Loading tape…</div>
        ) : (
          <div className="pit-feed-track py-2.5">
            {doubled.map((item, i) => (
              <span
                key={`${item.id}-${i}`}
                className={`pit-feed-item ${item.isYou ? 'pit-feed-you' : ''}`}
              >
                <span className={item.side === 'buy' ? 'text-accent' : 'text-red-400'}>
                  {item.side.toUpperCase()}
                </span>
                {' '}{item.shares} {item.symbol}
                <span className="text-muted"> @ </span>
                <span className="font-mono">${item.price?.toFixed(item.price && item.price < 10 ? 4 : 2)}</span>
                <span className="text-muted mx-1.5">•</span>
                <span className={item.isYou ? 'text-accent font-semibold' : ''}>{item.username}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}