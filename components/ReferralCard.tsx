'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Users } from 'lucide-react';
import { fetchReferralStats } from '../lib/game-api';
import type { ReferralStats } from '../lib/game-types';

export default function ReferralCard({ onToast }: { onToast?: (msg: string) => void }) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchReferralStats()
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const inviteUrl = stats
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://tradr-green.vercel.app'}?ref=${stats.referralCode}`
    : '';

  const copyLink = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      onToast?.('Invite link copied');
    } catch {
      onToast?.('Could not copy link');
    }
  }, [inviteUrl, onToast]);

  if (loading) {
    return <p className="text-center text-xs text-muted py-2">Loading invites…</p>;
  }

  if (!stats) return null;

  return (
    <div className="pt-referral-card">
      <div className="pt-referral-head">
        <Users size={16} className="text-accent shrink-0" aria-hidden />
        <div>
          <div className="pt-referral-title">Invite traders</div>
          <div className="pt-referral-sub">Both get $5 when they ring in their first pit</div>
        </div>
      </div>
      <div className="pt-referral-stats">
        <span>{stats.inviteCount} invited</span>
        <span aria-hidden>·</span>
        <span>${stats.referralEarnings.toFixed(0)} earned</span>
      </div>
      <div className="pt-referral-link-row">
        <code className="pt-referral-code">{stats.referralCode}</code>
        <button type="button" className="pt-referral-copy" onClick={copyLink}>
          <Copy size={14} aria-hidden />
          Copy link
        </button>
      </div>
    </div>
  );
}