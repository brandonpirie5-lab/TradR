'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

import { ARENA_TAB_HINT_KEY } from '../lib/onboarding-storage';

export default function ArenaTabHint({ suppressed = false }: { suppressed?: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || suppressed) return;
    if (!localStorage.getItem(ARENA_TAB_HINT_KEY)) {
      setVisible(true);
    }
  }, [suppressed]);

  if (suppressed) return null;

  const dismiss = () => {
    localStorage.setItem(ARENA_TAB_HINT_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="at-tab-hint">
      <p className="at-tab-hint-text">
        <strong>Arena</strong> — pick a pit and ring in with one tap.
        <br />
        <strong>Battles</strong> — trade your ticket when the bell opens.
        <br />
        <strong>Vault</strong> — see who&apos;s winning on the tape.
      </p>
      <button type="button" onClick={dismiss} className="at-tab-hint-dismiss" aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}