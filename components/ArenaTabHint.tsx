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

  if (suppressed || !visible) return null;

  const dismiss = () => {
    localStorage.setItem(ARENA_TAB_HINT_KEY, '1');
    setVisible(false);
  };

  return (
    <div className="at-tab-hint at-tab-hint-slim">
      <p className="at-tab-hint-text">
        <strong>Arena</strong> join · <strong>Battles</strong> trade · <strong>Vault</strong> tape ·{' '}
        <strong>Profile</strong> wallet
      </p>
      <button type="button" onClick={dismiss} className="at-tab-hint-dismiss" aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}