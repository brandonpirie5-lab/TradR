'use client';

import React, { useState } from 'react';
import { Medal } from 'lucide-react';
import SegmentedControl from './SegmentedControl';
import { ActivityItem, UserPerformanceStats, formatMemberSince } from '../lib/game-types';
import { DAILY_ENTRY_FEE } from '../lib/daily-pit-config';
import { allowDevWalletTools, walletFundingCopy } from '../lib/runtime-env';

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
  profileSection: 'overview' | 'activity';
  onProfileSectionChange: (s: 'overview' | 'activity') => void;
  onSeedDemo?: () => void;
  onRefreshPrices?: () => void;
  onResetDemo?: () => void;
  showDevTools?: boolean;
  inDailyPit?: boolean;
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
  onSeedDemo,
  onRefreshPrices,
  onResetDemo,
  showDevTools = false,
  inDailyPit = false,
}: ProfileTabProps) {
  const [usernameInput, setUsernameInput] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const needsFunds = effectiveBalance < DAILY_ENTRY_FEE;
  const devWallet = showDevTools && allowDevWalletTools(stripeEnabled);

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
        <div className="pt-guest-hero">
          <p className="pt-guest-kicker">TradR Pit</p>
          <h2 className="pt-guest-title">One pit. Every day.</h2>
          <p className="pt-guest-copy">
            ${DAILY_ENTRY_FEE} in · top half cash · watch the tape free before you ring in.
          </p>
        </div>
        <div className="pt-wallet-card">
          <p className="pt-invite-title text-center mb-3">Sign in to ring in</p>
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
          <p className="pt-wallet-note">Cloud sync — balance and positions persist across devices.</p>
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
        {inDailyPit && (
          <p className="pt-rank-line">
            <Medal size={14} /> Today&apos;s pit rank #{yourRank}
            {usingServerGame && <span className="text-[10px] text-muted">· LIVE</span>}
          </p>
        )}
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
          { id: 'activity', label: 'LOG' },
        ]}
      />

      {profileSection === 'overview' && (
        <>
          {needsFunds && (
            <div className="pt-wallet-shortfall mb-4" role="status">
              <div className="pt-wallet-shortfall-title">Need ${DAILY_ENTRY_FEE} to ring in</div>
              <div className="pt-wallet-shortfall-copy">
                You have ${effectiveBalance.toFixed(2)} — add ${(DAILY_ENTRY_FEE - effectiveBalance).toFixed(2)} to join today&apos;s pit.
              </div>
            </div>
          )}
          <div className="pt-wallet-card">
            <div className="flex justify-between items-end">
              <span className="pt-wallet-label">Balance</span>
              <span className={`pt-wallet-value ${needsFunds ? 'pt-wallet-value-low' : ''}`}>
                ${effectiveBalance.toFixed(2)}
              </span>
            </div>
            {(stripeEnabled || devWallet) && (
              <div className="pt-wallet-actions">
                {[10, 25, 50].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => onDeposit(amt)}
                    disabled={depositLoading}
                    className="pt-wallet-deposit disabled:opacity-50"
                  >
                    +${amt}
                  </button>
                ))}
              </div>
            )}
            <p className="pt-wallet-note">{walletFundingCopy(stripeEnabled)}</p>
            {usingServerGame && onSeedDemo && devWallet && (
              <button
                type="button"
                onClick={onSeedDemo}
                className="mt-3 w-full text-xs py-2 border border-accent/30 text-accent rounded-xl"
              >
                Seed demo participation
              </button>
            )}
          </div>

          {effectiveStats && effectiveStats.contestsCompleted > 0 && (
            <div className="pt-stat-mini mt-4">
              <div className="pt-stat-mini-cell">
                <span className="pt-stat-mini-val">${effectiveStats.totalWinnings.toLocaleString()}</span>
                <span className="pt-stat-mini-lbl">won</span>
              </div>
              <div className="pt-stat-mini-cell">
                <span className="pt-stat-mini-val">{effectiveStats.contestsCompleted}</span>
                <span className="pt-stat-mini-lbl">pits</span>
              </div>
              <div className="pt-stat-mini-cell">
                <span className="pt-stat-mini-val">{effectiveStats.cashed}</span>
                <span className="pt-stat-mini-lbl">cashed</span>
              </div>
            </div>
          )}
          {profileExtrasLoading && !effectiveStats && (
            <p className="text-center text-xs text-muted mt-3">Loading stats…</p>
          )}
        </>
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

      {devWallet && (onRefreshPrices || onResetDemo) && (
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