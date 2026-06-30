'use client';

import React, { useState } from 'react';
import { Check, Copy, Medal, Share2, Target, Trophy, Zap } from 'lucide-react';
import SegmentedControl from './SegmentedControl';
import { REFERRAL_HIGHLIGHTS, REFERRAL_TIERS } from '../lib/referral-program';
import {
  ActivityItem,
  Contest,
  ReferralStats,
  UserPerformanceStats,
  formatMemberSince,
} from '../lib/game-types';
import type { PitFillStatus } from '../lib/contest-fill';

type ProfileTabProps = {
  authLoading: boolean;
  user: { email?: string | null; id?: string } | null;
  profile: { username?: string | null; balance?: number; created_at?: string } | null;
  pitDisplayName: string;
  yourRank: number | string;
  usingServerGame: boolean;
  stripeEnabled: boolean;
  depositLoading: boolean;
  effectiveBalance: number;
  effectiveStats: UserPerformanceStats | null;
  profileExtrasLoading: boolean;
  spotlightContest: Contest | null | undefined;
  spotlightFill: PitFillStatus | null;
  referralStats: ReferralStats | null;
  referralLink: string;
  referralCopied: boolean;
  activities: ActivityItem[];
  history: Array<{ time: string; action: string; amount?: number }>;
  onSaveUsername: (name: string) => Promise<void>;
  onDeposit: (amount: number) => void;
  onLogout: () => void;
  onAuth: () => void;
  onToggleSignup: () => void;
  isSigningUp: boolean;
  email: string;
  password: string;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  profileSection: 'overview' | 'performance' | 'invite' | 'activity';
  onProfileSectionChange: (s: 'overview' | 'performance' | 'invite' | 'activity') => void;
  onShareReferral: () => void;
  onCopyReferral: () => void;
  onSeedDemo?: () => void;
  onRefreshPrices?: () => void;
  onResetDemo?: () => void;
  showDevTools?: boolean;
};

export default function ProfileTab({
  authLoading,
  user,
  profile,
  pitDisplayName,
  yourRank,
  usingServerGame,
  stripeEnabled,
  depositLoading,
  effectiveBalance,
  effectiveStats,
  profileExtrasLoading,
  spotlightContest,
  spotlightFill,
  referralStats,
  referralLink,
  referralCopied,
  activities,
  history,
  onSaveUsername,
  onDeposit,
  onLogout,
  onAuth,
  onToggleSignup,
  isSigningUp,
  email,
  password,
  onEmailChange,
  onPasswordChange,
  profileSection,
  onProfileSectionChange,
  onShareReferral,
  onCopyReferral,
  onSeedDemo,
  onRefreshPrices,
  onResetDemo,
  showDevTools = false,
}: ProfileTabProps) {
  const [usernameInput, setUsernameInput] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [devOpen, setDevOpen] = useState(false);

  const activityItems =
    activities.length > 0
      ? activities
      : history.map((h, i) => ({
          id: `local-${i}`,
          type: 'trade' as const,
          title: h.action,
          detail: '',
          amount: h.amount,
          createdAt: new Date().toISOString(),
        }));

  if (authLoading) {
    return <div className="pt-shell text-center py-10 text-muted">Loading your account…</div>;
  }

  if (!user) {
    return (
      <div className="pt-shell tab-content-enter">
        <div className="pt-wallet-card">
          <p className="pt-invite-title text-center mb-3">Sign in to the pit</p>
          <div className="space-y-3">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              className="w-full bg-surface border border-card p-3 rounded-xl"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="w-full bg-surface border border-card p-3 rounded-xl"
            />
            <button onClick={onAuth} className="w-full py-3 bg-accent text-black font-bold rounded-2xl">
              {isSigningUp ? 'Create Account' : 'Sign In'}
            </button>
            <button onClick={onToggleSignup} className="text-xs w-full text-muted">
              {isSigningUp ? 'Have an account? Sign in' : 'New here? Create account'}
            </button>
          </div>
          <p className="pt-wallet-note">Cloud sync with Supabase — balance and positions persist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-shell tab-content-enter">
      <div className="pt-identity">
        <div className="pt-avatar">{pitDisplayName.replace('@', '').slice(0, 2).toUpperCase()}</div>
        {editingUsername ? (
          <div className="flex gap-2 max-w-[280px] mx-auto mb-2">
            <input
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="pitname"
              className="flex-1 bg-surface border border-card px-3 py-2 rounded-xl text-center font-bold"
            />
            <button
              onClick={async () => {
                await onSaveUsername(usernameInput);
                setEditingUsername(false);
              }}
              className="px-3 py-2 bg-accent text-black rounded-xl text-sm font-bold"
            >
              SAVE
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setUsernameInput(profile?.username || '');
              setEditingUsername(true);
            }}
            className="pt-name-btn"
          >
            {pitDisplayName}
          </button>
        )}
        <p className="pt-meta">
          Pit member since {profile?.created_at ? formatMemberSince(profile.created_at) : 'today'}
        </p>
        <p className="pt-rank-line">
          <Medal size={14} /> Vault rank #{yourRank}
          {usingServerGame && <span className="text-[10px] text-muted">· LIVE</span>}
        </p>
        <button type="button" onClick={onLogout} className="pt-signout">
          Sign out
        </button>
      </div>

      <SegmentedControl
        className="mb-4"
        value={profileSection}
        onChange={onProfileSectionChange}
        options={[
          { id: 'overview', label: 'WALLET' },
          { id: 'performance', label: 'STATS' },
          { id: 'invite', label: 'INVITE' },
          { id: 'activity', label: 'LOG' },
        ]}
      />

      {profileSection === 'overview' && (
        <>
          {spotlightFill && !spotlightFill.isConfirmed && (
            <button
              type="button"
              onClick={() => onProfileSectionChange('invite')}
              className="pt-urgency"
            >
              <div className="pt-urgency-kicker">Pit needs traders</div>
              <div className="pt-urgency-title">
                {spotlightFill.needed} more to confirm {spotlightContest?.title ?? "today's pit"}
              </div>
              <div className="pt-urgency-sub">
                {spotlightFill.current}/{spotlightFill.minEntries} rang in
              </div>
              <div className="pt-urgency-cta">Invite friends →</div>
            </button>
          )}
          <button
            type="button"
            onClick={() => onProfileSectionChange('invite')}
            className="pt-invite-row"
          >
            <div>
              <div className="pt-invite-title">Invite friends to the pit</div>
              <div className="pt-invite-sub">
                Friends get ${REFERRAL_TIERS.friendSignupBonus} · you earn on their entries
              </div>
            </div>
            <Share2 size={18} className="text-muted shrink-0" />
          </button>
          <div className="pt-wallet-card">
            <div className="flex justify-between items-end">
              <span className="pt-wallet-label">Balance</span>
              <span className="pt-wallet-value">${effectiveBalance.toFixed(2)}</span>
            </div>
            <div className="pt-wallet-actions">
              {[25, 50, 100].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => onDeposit(amt)}
                  disabled={depositLoading}
                  className="pt-wallet-deposit disabled:opacity-50"
                >
                  {stripeEnabled ? `+$${amt}` : `+$${amt}`}
                </button>
              ))}
            </div>
            <p className="pt-wallet-note">
              {stripeEnabled ? 'Secure checkout via Stripe' : 'Dev deposits until Stripe is wired'}
            </p>
            {usingServerGame && onSeedDemo && (
              <button
                type="button"
                onClick={onSeedDemo}
                className="mt-3 w-full text-xs py-2 border border-accent/30 text-accent rounded-xl"
              >
                Seed demo participation
              </button>
            )}
          </div>
        </>
      )}

      {profileSection === 'performance' && (
        <>
          {profileExtrasLoading && !effectiveStats ? (
            <div className="vt-empty">
              <p className="vt-empty-copy">Loading stats…</p>
            </div>
          ) : effectiveStats ? (
            <>
              <div className="pt-stat-hero">
                <div className="pt-stat-hero-label">Total winnings</div>
                <div className="pt-stat-hero-value">${effectiveStats.totalWinnings.toLocaleString()}</div>
                <p className={`text-sm mt-2 font-mono ${effectiveStats.netProfit >= 0 ? 'text-accent' : 'text-red-400'}`}>
                  Net {effectiveStats.netProfit >= 0 ? '+' : ''}${effectiveStats.netProfit.toLocaleString()}
                </p>
              </div>
              <div className="pt-stat-grid">
                {[
                  { label: 'Entered', value: effectiveStats.contestsEntered },
                  { label: 'Wins', value: effectiveStats.wins },
                  { label: 'Podiums', value: effectiveStats.placements },
                  { label: 'Cashed', value: effectiveStats.cashed },
                ].map((s) => (
                  <div key={s.label} className="pt-stat-cell">
                    <div className="pt-stat-cell-value">{s.value}</div>
                    <div className="pt-stat-cell-label">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="pt-stat-footer">
                <div>
                  <div className="pt-stat-cell-label">Win rate</div>
                  <div className="pt-stat-cell-value text-2xl">{effectiveStats.winRate}%</div>
                </div>
                <div className="text-right">
                  <div className="pt-stat-cell-label">Avg finish</div>
                  <div className="font-mono text-xl">{effectiveStats.avgFinishRank ?? '—'}</div>
                  <div className="text-[10px] text-muted mt-1">Best #{effectiveStats.bestFinishRank ?? '—'}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="vt-empty">
              <p className="vt-empty-title">No record yet</p>
              <p className="vt-empty-copy">Enter your first battle to build your tape.</p>
            </div>
          )}
        </>
      )}

      {profileSection === 'invite' && (
        <div className="pt-invite-card">
          <div className="flex items-center gap-2 mb-2">
            <Share2 size={18} className="text-accent" />
            <div className="font-bold text-lg">Invite to the Pit</div>
          </div>
          {spotlightFill && !spotlightFill.isConfirmed && spotlightContest && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/6 px-3 py-2.5 mb-4">
              <div className="text-[11px] font-semibold leading-snug">
                {spotlightContest.title} needs {spotlightFill.needed} more trader
                {spotlightFill.needed === 1 ? '' : 's'} to run
              </div>
              <div className="text-[10px] text-muted font-mono mt-1">
                {spotlightFill.current}/{spotlightFill.minEntries} on the tape
              </div>
            </div>
          )}
          <p className="text-xs text-muted mb-4 leading-relaxed">
            Friends get <span className="text-accent">${REFERRAL_TIERS.friendSignupBonus}</span> on signup —
            you earn on their paid pits.
          </p>
          {usingServerGame && referralStats && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-surface border border-card rounded-xl p-3 text-center">
                <div className="text-2xl font-black text-accent">{referralStats.inviteCount}</div>
                <div className="text-[10px] text-muted uppercase">Friends invited</div>
              </div>
              <div className="bg-surface border border-card rounded-xl p-3 text-center">
                <div className="text-2xl font-black text-accent">${referralStats.referralEarnings}</div>
                <div className="text-[10px] text-muted uppercase">Referral earnings</div>
              </div>
            </div>
          )}
          <div className="space-y-2 mb-4">
            {REFERRAL_HIGHLIGHTS.map((h) => (
              <div key={h.title} className="bg-surface border border-card rounded-xl p-3">
                <div className="text-xs font-bold text-accent mb-0.5">{h.title}</div>
                <div className="text-[11px] text-muted leading-snug">{h.detail}</div>
              </div>
            ))}
          </div>
          <div className="bg-black/40 border border-card rounded-xl p-3 text-xs font-mono text-muted break-all mb-3">
            {referralLink}
          </div>
          <div className="flex gap-2">
            <button onClick={onShareReferral} className="btn btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-2">
              <Share2 size={16} />
              SHARE
            </button>
            <button
              onClick={onCopyReferral}
              className="flex-1 py-3 text-sm border border-accent/40 text-accent rounded-xl flex items-center justify-center gap-2"
            >
              {referralCopied ? <Check size={16} /> : <Copy size={16} />}
              {referralCopied ? 'COPIED' : 'COPY'}
            </button>
          </div>
        </div>
      )}

      {profileSection === 'activity' && (
        <div className="pt-activity-card">
          <div className="pt-activity-kicker">Tape log</div>
          {activityItems.length === 0 ? (
            <div className="text-center py-8 text-muted text-sm">No activity yet</div>
          ) : (
            activityItems.map((a) => (
              <div key={a.id} className="pt-activity-row">
                <div>
                  <div className="font-medium">{a.title}</div>
                  {a.detail && <div className="text-muted text-[11px]">{a.detail}</div>}
                </div>
                {a.amount != null && (
                  <div className={`font-mono ${a.amount >= 0 ? 'text-accent' : 'text-red-400'}`}>
                    {a.amount >= 0 ? '+' : ''}${Math.round(Math.abs(a.amount))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {showDevTools && (onRefreshPrices || onResetDemo) && (
        <div className="pt-dev-footer">
          <button type="button" className="pt-dev-toggle" onClick={() => setDevOpen((v) => !v)}>
            {devOpen ? 'Hide dev tools' : 'Dev tools'}
          </button>
          {devOpen && (
            <div className="pt-dev-actions">
              {onRefreshPrices && (
                <button type="button" className="pt-dev-btn" onClick={onRefreshPrices}>
                  Refresh prices
                </button>
              )}
              {onResetDemo && (
                <button type="button" className="pt-dev-btn pt-dev-btn-danger" onClick={onResetDemo}>
                  Reset demo
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}