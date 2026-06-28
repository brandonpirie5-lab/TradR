'use client';

import React, { useState } from 'react';
import { Info } from 'lucide-react';
import AssetInfoModal from './AssetInfoModal';

export default function AssetChip({
  symbol,
  size = 'md',
  showInfo = true,
}: {
  symbol: string;
  size?: 'sm' | 'md';
  showInfo?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <>
      <button
        type="button"
        onClick={() => showInfo && setOpen(true)}
        className={`inline-flex items-center gap-1 border border-surface-2 bg-surface font-mono tracking-widest rounded ${pad} ${
          showInfo ? 'hover:border-accent/50 active:border-accent' : ''
        }`}
      >
        {symbol}
        {showInfo && <Info size={size === 'sm' ? 9 : 11} className="text-muted" />}
      </button>
      {open && <AssetInfoModal symbol={symbol} onClose={() => setOpen(false)} />}
    </>
  );
}