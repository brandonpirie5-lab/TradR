'use client';

import React from 'react';

type Option<T extends string> = { id: T; label: string; count?: number };

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`flex gap-1 p-1 bg-surface border border-card rounded-xl ${className}`}>
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`flex-1 py-2 px-2 text-[10px] font-bold tracking-[0.5px] rounded-lg transition-all ${
              active
                ? 'bg-accent text-[#0A0A0A] shadow-sm'
                : 'text-muted hover:text-secondary'
            }`}
          >
            {opt.label}
            {opt.count != null && opt.count > 0 && (
              <span className={`ml-1 ${active ? 'opacity-80' : 'text-accent'}`}>({opt.count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}