'use client';

import React from 'react';
import { X } from 'lucide-react';
import { CATEGORY_LABELS, getAssetInfo } from '../lib/asset-info';

export default function AssetInfoModal({
  symbol,
  onClose,
}: {
  symbol: string;
  onClose: () => void;
}) {
  const info = getAssetInfo(symbol);

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-5" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-card border border-accent/30 rounded-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="font-mono text-2xl font-black text-accent">{info.symbol}</div>
            <div className="text-sm text-secondary">{info.name}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg border border-card">
            <X size={16} />
          </button>
        </div>
        <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-surface border border-card text-muted mb-3">
          {CATEGORY_LABELS[info.category]}
        </span>
        <p className="text-sm text-secondary leading-relaxed mb-3">{info.description}</p>
        {info.funFact && (
          <p className="text-xs text-accent/90 bg-accent/5 border border-accent/20 rounded-xl p-3">
            {info.funFact}
          </p>
        )}
      </div>
    </div>
  );
}