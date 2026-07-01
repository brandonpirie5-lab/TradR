"use client";

import React, { useState, useEffect } from 'react';
import { 
  Trophy, Clock, Home, List, BarChart3, User, 
  TrendingUp, ArrowUp, ArrowDown, X, Share2, Zap
} from 'lucide-react';
import AssetChart from '../components/AssetChart';
import SetupBanner from '../components/SetupBanner';
import SegmentedControl from '../components/SegmentedControl';
import ContestRecapModal from '../components/ContestRecapModal';
import OnboardingPit from '../components/OnboardingPit';
import ContestInfoModal from '../components/ContestInfoModal';
import ArenaHome from '../components/ArenaHome';
import ArenaTabHint from '../components/ArenaTabHint';
import BattlesTab from '../components/BattlesTab';
import SettlementModal from '../components/SettlementModal';
import PitTabChrome from '../components/PitTabChrome';
import VaultTab from '../components/VaultTab';
import ProfileTab from '../components/ProfileTab';
import TradeSheet from '../components/TradeSheet';

import ActiveBattlesTour, { TourHelpButton as BattlesTourHelpButton } from '../components/ActiveBattlesTour';
import ArenaTour from '../components/ArenaTour';
import { REFERRAL_TIERS } from '../lib/referral-program';
import { useHydrated } from '../lib/use-hydrated';
import { supabase, isSupabaseConfigured, Profile } from '../lib/supabase';
import {
  Contest,
  GlobalLeaderboardEntry,
  GlobalLeaderboardMetric,
  GlobalLeaderboardPeriod,
  UserPerformanceStats,
  ActivityItem,
  ContestRecap,
  TradeLogEntry,
  TapeLeaderboardEntry,
  ReferralStats,
} from '../lib/game-types';
import {
  ensureWeekSlate,
  fetchContests,
  fetchMyStats,
  fetchGlobalLeaderboard,
  fetchActivity,
  fetchContestRecap,
  updateUsername,
  createDepositCheckout,
  fetchReferralStats,
  fetchTapeLeaderboard,
} from '../lib/game-api';
import { useGameState, type SettlementResult, type TradeCompletePayload } from '../lib/use-game-state';
import { initialContests } from '../lib/game-constants';
import { getPitFillStatus } from '../lib/contest-fill';
import JoinPitFlash from '../components/JoinPitFlash';
import HowItWorksModal from '../components/HowItWorksModal';
import PitMomentBanner from '../components/PitMomentBanner';
import { buildPitMoment, type PitMoment } from '../lib/pit-moments';
import { payoutForContestRankLive } from '../lib/pit-pool-math';
import { findNextJoinablePit, buildPitShareText } from '../lib/next-pit';
import {
  findContestForWeekPit,
  findJoinableContestForWeekDay,
  hasJoinedWeekDayPit,
} from '../lib/week-join';
import { DAY_THEMES } from '../lib/tape-week';
import { markSettlementSeen } from '../lib/settlement-storage';
import { hasCompletedOnboarding, markOnboardingComplete } from '../lib/onboarding-storage';
import {
  isContestBellOpen,
  isContestTradingOpen,
  isJoinAllowed,
  isPriceStale,
} from '../lib/contest-bell';
export default function TradR() {
  const [activeTab, setActiveTab] = useState<'home' | 'entries' | 'leaderboard' | 'account'>('home');
  const [tradingContestId, setTradingContestId] = useState<number | null>(null);
  const [tradeSymbol, setTradeSymbol] = useState('');
  const [tradeShares, setTradeShares] = useState('10');
  const [tradeSide, setTradeSide] = useState<'buy' | 'sell'>('buy');
  const [selectedChartSymbol, setSelectedChartSymbol] = useState<string>('');
  const [chartContestId, setChartContestId] = useState<number | null>(null);
  const [settlementResult, setSettlementResult] = useState<SettlementResult | null>(null);
  const [toasts, setToasts] = useState<{ id: number; message: string; type?: 'success' | 'error' }[]>([]);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2600);
  };
  const [user, setUser] = useState<{ id?: string; email?: string | null } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [battlesSegment, setBattlesSegment] = useState<'active' | 'upcoming' | 'completed'>('active');
  const [highlightDoneContestId, setHighlightDoneContestId] = useState<number | null>(null);
  const [vaultMode, setVaultMode] = useState<'pit' | 'global' | 'tape'>('pit');
  const [globalPeriod, setGlobalPeriod] = useState<GlobalLeaderboardPeriod>('all');
  const [globalMetric, setGlobalMetric] = useState<GlobalLeaderboardMetric>('winnings');
  const [globalLeaderboard, setGlobalLeaderboard] = useState<GlobalLeaderboardEntry[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [userStats, setUserStats] = useState<UserPerformanceStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [profileSection, setProfileSection] = useState<'overview' | 'performance' | 'invite' | 'activity'>('overview');
  const [recapData, setRecapData] = useState<ContestRecap | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [tapeLeaderboard, setTapeLeaderboard] = useState<TapeLeaderboardEntry[]>([]);
  const [tapeThemeLine, setTapeThemeLine] = useState('');
  const [tapeLoading, setTapeLoading] = useState(false);
  const [profileExtrasLoading, setProfileExtrasLoading] = useState(false);
  const [lastTradeFlash, setLastTradeFlash] = useState<{
    rankBefore: number;
    rankAfter: number;
    portfolioValue: number;
    tradersBehind: number;
  } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);
  const [infoContestId, setInfoContestId] = useState<number | null>(null);
  const [showBattlesTour, setShowBattlesTour] = useState(false);
  const [battlesTourStep, setBattlesTourStep] = useState(0);
  const [showArenaTour, setShowArenaTour] = useState(false);
  const [arenaTourStep, setArenaTourStep] = useState(0);
  const [joinFlashTitle, setJoinFlashTitle] = useState<string | null>(null);
  const [pitMoment, setPitMoment] = useState<PitMoment | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [rankShake, setRankShake] = useState(false);
  const [vaultRankAnim, setVaultRankAnim] = useState<'up' | 'down' | null>(null);

  const hydrated = useHydrated();

  const loadProfileExtras = async () => {
    if (!isSupabaseConfigured || !user) return;
    setProfileExtrasLoading(true);
    try {
      const [stats, acts, refStats] = await Promise.all([
        fetchMyStats().catch(() => null),
        fetchActivity(25).catch(() => []),
        fetchReferralStats().catch(() => null),
      ]);
      if (stats) setUserStats(stats);
      setActivities(acts);
      if (refStats) setReferralStats(refStats);
    } catch (e) {
      console.warn('Profile extras load failed', e);
    } finally {
      setProfileExtrasLoading(false);
    }
  };

  const showRankTradeToast = (result: TradeCompletePayload) => {
    setLastTradeFlash({
      rankBefore: result.rankBefore,
      rankAfter: result.rank,
      portfolioValue: result.portfolioValue,
      tradersBehind: result.tradersBehind,
    });
    setTimeout(() => setLastTradeFlash(null), 4000);

    if (result.board) {
      const moment = buildPitMoment({
        rankBefore: result.rankBefore,
        rankAfter: result.rank,
        rankDelta: result.rankDelta,
        board: result.board,
        symbol: result.symbol,
        side: result.side,
      });
      if (moment) {
        setPitMoment(moment);
        setTimeout(() => setPitMoment(null), 5000);
      }
    }

    if (result.rankDelta >= 3) {
      setRankShake(true);
      setTimeout(() => setRankShake(false), 400);
    }
    if (result.rankDelta > 0) {
      setVaultRankAnim('up');
      setTimeout(() => setVaultRankAnim(null), 1200);
    } else if (result.rankDelta < -2) {
      setVaultRankAnim('down');
      setTimeout(() => setVaultRankAnim(null), 1200);
    }

    const rankText =
      result.rankDelta > 0
        ? `#${result.rankBefore} → #${result.rank} ▲${result.rankDelta}`
        : result.rankDelta < 0
          ? `#${result.rankBefore} → #${result.rank}`
          : `#${result.rank} holding`;

    const tradesLeft = result.tradeLimit?.unlimited
      ? ''
      : result.tradeLimit?.remaining != null
        ? ` • ${result.tradeLimit.remaining} trades left`
        : '';

    showToast(
      `${result.side.toUpperCase()} ${result.shares} ${result.symbol} @ $${result.executedPrice?.toFixed(2) || '—'} • ${rankText}${tradesLeft}`
    );
  };

  const game = useGameState({
    user,
    setUser,
    profile,
    setProfile,
    showToast,
    onSettlement: setSettlementResult,
    onJoinFlash: setJoinFlashTitle,
    onTradeComplete: showRankTradeToast,
    onRouteAfterJoin: (contest) => {
      setActiveTab('entries');
      setBattlesSegment(isContestTradingOpen(contest) ? 'active' : 'upcoming');
    },
    onScheduleTrade: (contestId) => setTimeout(() => setTradingContestId(contestId), 1400),
    onRequireSignIn: () => setActiveTab('account'),
    loadProfileExtras,
    setAuthLoading,
  });

  const {
    contests,
    setContests,
    prices,
    lastPriceUpdate,
    userBalance,
    setUserBalance,
    participations,
    vaultContestId,
    setVaultContestId,
    history,
    setHistory,
    priceFlashes,
    tradeLimitByContest,
    pitFeedByContest,
    pitFeedLoading,
    bellTick,
    usingServerGame,
    isLoggedIn,
    effectiveBalance,
    pitDisplayName,
    joinedContests,
    getPortfolioValue,
    getContestBoard,
    syncGameFromServer,
    refreshLeaderboard,
    loadUserData,
    loadTradeLimit,
    fetchLivePrices,
    joinArena,
    executeTrade,
    rankInContest,
    getLiveParticipantCount,
    canonicalOpeningBell,
    featuredContest,
    activeVaultContestId,
    vaultContest,
    dynamicVault,
    arenaPitList,
    activeBattles,
    scheduledBattles,
    completedBattles,
    activeBattlesOrdered,
    sortedCompletedBattles,
    computeDemoStats,
    resetDemo,
    serverSettledShownRef,
  } = game;

  // Screen guides are manual only (help button) — auto-tour blocked clicks and felt like a freeze.

  const infoContest = infoContestId != null ? contests.find((c) => c.id === infoContestId) : null;

  const refreshGlobalLeaderboard = async (
    period: GlobalLeaderboardPeriod = globalPeriod,
    metric: GlobalLeaderboardMetric = globalMetric
  ) => {
    if (!isSupabaseConfigured) return;
    setGlobalLoading(true);
    try {
      const entries = await fetchGlobalLeaderboard(period, metric);
      setGlobalLeaderboard(entries);
    } catch (e) {
      console.warn('Global leaderboard failed', e);
    } finally {
      setGlobalLoading(false);
    }
  };

  const refreshTapeLeaderboard = async () => {
    setTapeLoading(true);
    try {
      const data = await fetchTapeLeaderboard();
      setTapeLeaderboard(data.entries);
      setTapeThemeLine(data.themeLine);
    } catch (e) {
      console.warn('Tape leaderboard load failed', e);
    } finally {
      setTapeLoading(false);
    }
  };

  const referralLink = () => {
    const code =
      referralStats?.referralCode ||
      profile?.referral_code ||
      `pit${user?.id?.replace(/-/g, '').slice(0, 8) || 'demo'}`;
    return `${typeof window !== 'undefined' ? window.location.origin : ''}?ref=${code}`;
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink());
    setReferralCopied(true);
    showToast('Invite link copied!');
    setTimeout(() => setReferralCopied(false), 2000);
  };

  const shareReferralLink = async () => {
    const link = referralLink();
    const text = `Join me on TradR Pit — $${REFERRAL_TIERS.friendSignupBonus} signup bonus: ${link}`;
    try {
      if (navigator.share) {
        await navigator.share({ text, title: 'TradR Pit Invite' });
      } else {
        await navigator.clipboard.writeText(link);
        showToast('Invite link copied!');
      }
    } catch {
      /* user cancelled share */
    }
  };

  useEffect(() => {
    fetch('/api/deposits/status')
      .then((r) => r.json())
      .then((d) => setStripeEnabled(!!d.stripe))
      .catch(() => {});

    const params = new URLSearchParams(window.location.search);
    if (params.get('deposit') === 'success') {
      const amt = params.get('amount');
      showToast(`Deposit successful!${amt ? ` +$${amt}` : ''} Balance updating…`);
      syncGameFromServer();
      loadProfileExtras();
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('deposit') === 'cancelled') {
      showToast('Deposit cancelled', 'error');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!user?.id || authLoading || !usingServerGame) return;
    if (!hasCompletedOnboarding(user.id)) setShowOnboarding(true);
  }, [user?.id, authLoading, usingServerGame]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('tradr_ref', ref.toLowerCase());
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (usingServerGame && user) loadProfileExtras();
  }, [usingServerGame, user?.id]);

  useEffect(() => {
    if (activeTab === 'account' && usingServerGame) loadProfileExtras();
  }, [activeTab]);

  useEffect(() => {
    if (vaultMode === 'global' && isSupabaseConfigured) {
      refreshGlobalLeaderboard(globalPeriod, globalMetric);
    }
    if (vaultMode === 'tape' && isSupabaseConfigured) {
      refreshTapeLeaderboard();
    }
  }, [vaultMode, globalPeriod, globalMetric, isSupabaseConfigured]);

  useEffect(() => {
    if (!tradingContestId || !usingServerGame) return;
    void refreshLeaderboard(tradingContestId);
    const interval = setInterval(() => {
      void refreshLeaderboard(tradingContestId);
    }, 30000);
    return () => clearInterval(interval);
  }, [tradingContestId, usingServerGame, refreshLeaderboard]);

  useEffect(() => {
    if (!usingServerGame || activeTab !== 'leaderboard' || vaultMode !== 'pit' || !activeVaultContestId) return;
    void refreshLeaderboard(activeVaultContestId);
    const interval = setInterval(() => {
      void refreshLeaderboard(activeVaultContestId);
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab, vaultMode, activeVaultContestId, usingServerGame, refreshLeaderboard]);

  const yourRank = dynamicVault.find((e) => e.isYou)?.rank || (dynamicVault.length ? dynamicVault.length + 1 : 1);
  const vaultPlayerCount = dynamicVault.length;
  const bestPortfolioValue = Object.values(participations).length
    ? Math.max(...Object.values(participations).map(getPortfolioValue))
    : 0;

  const shareSettlement = async () => {
    if (!settlementResult) return;
    const text = buildPitShareText({
      contestTitle: settlementResult.contestTitle,
      rank: settlementResult.rank,
      payout: settlementResult.payout,
      voided: settlementResult.voided,
      refund: settlementResult.refund,
      portfolioValue: settlementResult.portfolioValue,
      startingValue: settlementResult.startingValue,
    });
    try {
      if (navigator.share) {
        await navigator.share({ text, title: 'TradR Pit' });
      } else {
        await navigator.clipboard.writeText(text);
        showToast('Result copied — share the tape');
      }
    } catch {
      /* user cancelled share */
    }
  };

  const goToDoneTab = (contestId?: number | null) => {
    setActiveTab('entries');
    setBattlesSegment('completed');
    if (contestId != null) setHighlightDoneContestId(contestId);
  };

  const closeSettlement = (navigateToDone: boolean) => {
    const closedId = settlementResult?.contestId;
    if (closedId != null) {
      markSettlementSeen(closedId);
      serverSettledShownRef.current.add(closedId);
    }
    setSettlementResult(null);
    if (navigateToDone) goToDoneTab(closedId ?? null);
  };

  const dismissSettlement = () => closeSettlement(true);
  const viewSettlementInDone = () => closeSettlement(true);

  const runItBack = async () => {
    const closedId = settlementResult?.contestId;
    closeSettlement(false);
    setActiveTab('home');
    const next = findNextJoinablePit(contests, joinedContests, closedId);
    if (next) await joinArena(next.id);
    else showToast('No open arenas right now — fresh pits drop soon');
  };

  const openContestRecap = async (contestId: number) => {
    if (usingServerGame) {
      try {
        const recap = await fetchContestRecap(contestId);
        setRecapData(recap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Recap unavailable';
        showToast(message, 'error');
      }
      return;
    }
    const c = contests.find((x) => x.id === contestId);
    const p = participations[contestId];
    const board = getContestBoard(contestId);
    const feed = pitFeedByContest[contestId] || [];
    const trades: TradeLogEntry[] = feed.map((t, i) => ({
      id: i,
      userId: t.userId,
      username: t.isYou ? `${t.username} (you)` : t.username,
      symbol: t.symbol,
      side: t.side,
      shares: t.shares,
      price: t.price,
      total: t.total,
      createdAt: t.createdAt,
    }));
    const standings = board.map((e) => ({
      userId: e.userId,
      username: e.username,
      finalRank: e.rank,
      finalValue: e.portfolioValue,
      payout: payoutForContestRankLive(e.rank, c?.slug, {
        entryFee: c?.entryFee ?? 0,
        participantCount: board.length,
      }),
      cash: e.isYou ? p?.cash : undefined,
      positions: e.isYou ? p?.positions : undefined,
      isYou: e.isYou,
    }));
    if (c) {
      setRecapData({
        contest: c,
        standings,
        trades,
        settlementPrices: c.status === 'closed' ? { ...prices } : undefined,
      });
    }
  };

  const isJoinableContest = (c: Contest) =>
    (c.status === 'open' || c.status === 'active') && isJoinAllowed(c);

  const floorLivePitCount = arenaPitList.filter((p) => !p.scheduled).length;
  const floorPrizePool = arenaPitList
    .filter((p) => !p.scheduled)
    .reduce((sum, p) => sum + p.contest.totalPrizes, 0);

  const primaryActiveBattle = activeBattles.length
    ? [...activeBattles].sort((a, b) => getPortfolioValue(b) - getPortfolioValue(a))[0]
    : null;
  const primaryActiveContest = primaryActiveBattle
    ? contests.find((c) => c.id === primaryActiveBattle.contestId)
    : null;

  const spotlightContest = (() => {
    if (primaryActiveContest) return primaryActiveContest;
    const firstLive = arenaPitList.find((p) => !p.scheduled);
    if (firstLive) return firstLive.contest;
    const firstScheduled = arenaPitList.find((p) => p.scheduled);
    if (firstScheduled) return firstScheduled.contest;
    return featuredContest;
  })();

  const spotlightFill = spotlightContest
    ? getPitFillStatus(spotlightContest, getLiveParticipantCount(spotlightContest.id))
    : null;

  const bestActiveRank = activeBattles.length
    ? Math.min(...activeBattles.map((p) => rankInContest(p.contestId) ?? 9999))
    : null;
  const displayBestActiveRank =
    bestActiveRank != null && bestActiveRank < 9999 ? bestActiveRank : null;

  const effectiveStats =
    userStats || (completedBattles.length || activeBattles.length ? computeDemoStats(participations) : null);

  const vaultActiveJoinedCount = joinedContests.filter((id) => {
    const c = contests.find((x) => x.id === id);
    return c && c.status !== 'closed';
  }).length;

  useEffect(() => {
    if (activeTab === 'leaderboard' && vaultActiveJoinedCount === 0 && vaultMode === 'pit') {
      setVaultMode('tape');
    }
  }, [activeTab, vaultActiveJoinedCount]);

  const openTradeModal = (contestId: number) => {
    const contest = contests.find((c) => c.id === contestId);
    if (contest && !isContestBellOpen(contest)) {
      showToast('Bell has rung — trading is closed', 'error');
      return;
    }
    if (contest && !isContestTradingOpen(contest)) {
      showToast("Pit opens soon — you're rang in. Trading starts when the bell opens.", 'error');
      return;
    }
    const firstAsset = contest?.assets[0] || '';
    setTradingContestId(contestId);
    setTradeSymbol(firstAsset);
    setSelectedChartSymbol(firstAsset);
    setTradeShares('10');
    setTradeSide('buy');
    loadTradeLimit(contestId);
  };

  const closeTradeModal = () => {
    setTradingContestId(null);
    setSelectedChartSymbol('');
  };

  const closeChart = () => {
    setSelectedChartSymbol('');
    setChartContestId(null);
  };

  const openLeaderboard = async (contestId: number) => {
    setTradingContestId(null);
    setVaultContestId(contestId);
    setVaultMode('pit');
    setActiveTab('leaderboard');
    try {
      const contest = contests.find((c) => c.id === contestId);
      if (contest?.assets?.length) await fetchLivePrices(contest.assets);
      await refreshLeaderboard(contestId);
    } catch {
      /* board still shows live local rank */
    }
  };

  const handleTrade = () =>
    executeTrade({
      tradingContestId: tradingContestId!,
      tradeSymbol,
      tradeShares,
      tradeSide,
      onCloseTrade: closeTradeModal,
      setTradeShares,
    });

  const handleAuth = async () => {
    if (!email || !password) {
      showToast('Please enter email and password', 'error');
      return;
    }
    const referralCode = localStorage.getItem('tradr_ref') || '';
    try {
      const endpoint = isSigningUp ? '/api/auth/signup' : '/api/auth/signin';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, referralCode: isSigningUp ? referralCode : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Auth failed');
      if (data.session && supabase) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        if (sessionError) throw sessionError;
      }
      if (isSigningUp) {
        localStorage.removeItem('tradr_ref');
        if (data.session) {
          setShowOnboarding(true);
          setActiveTab('home');
        }
        showToast(
          data.needsEmailConfirmation
            ? 'Account created! Check your email to confirm, then sign in.'
            : referralCode
              ? 'Welcome to the Pit! Referral bonus applied.'
              : 'Account created — welcome to the Pit!'
        );
      } else {
        showToast('Logged in successfully');
      }
      setEmail('');
      setPassword('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Auth error';
      showToast(message, 'error');
    }
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    showToast('Logged out');
  };

  const deposit = async (amount: number) => {
    if (stripeEnabled && usingServerGame) {
      setDepositLoading(true);
      try {
        const url = await createDepositCheckout(amount);
        window.location.href = url;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Checkout failed';
        showToast(message, 'error');
      } finally {
        setDepositLoading(false);
      }
      return;
    }
    const newBal = effectiveBalance + amount;
    setUserBalance(newBal);
    if (isLoggedIn && profile) setProfile({ ...profile, balance: newBal });
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setHistory((h) => [{ time: now, action: 'Deposit (dev)', amount }, ...h].slice(0, 12));
    showToast(`Deposited $${amount}. New balance: $${newBal}`);
    if (user && supabase) {
      try {
        await supabase.from('profiles').update({ balance: newBal }).eq('id', user.id);
        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'deposit',
          amount,
          description: 'Dev wallet deposit',
        });
      } catch {
        console.log('Supabase write skipped - run the schema first');
      }
    }
  };

  const completeOnboarding = (opts?: { skipped?: boolean }) => {
    markOnboardingComplete(user?.id);
    setShowOnboarding(false);
    if (opts?.skipped) setActiveTab('home');
  };

  const openingBellContest = canonicalOpeningBell;
  const showArenaNavDot =
    !!openingBellContest &&
    !joinedContests.includes(openingBellContest.id) &&
    isJoinableContest(openingBellContest);
  const showProfileNavDot = !!(spotlightFill && !spotlightFill.isConfirmed);
  const battlesChromeStatus =
    battlesSegment === 'active' && activeBattles.length > 0
      ? `${activeBattles.length} pit${activeBattles.length === 1 ? '' : 's'} on the floor${displayBestActiveRank != null ? ` · best #${displayBestActiveRank}` : ''}`
      : battlesSegment === 'upcoming' && scheduledBattles.length > 0
        ? `${scheduledBattles.length} ticket${scheduledBattles.length === 1 ? '' : 's'} rang in`
        : battlesSegment === 'completed' && completedBattles.length > 0
          ? `${completedBattles.length} battle${completedBattles.length === 1 ? '' : 's'} settled`
          : 'Active · upcoming · done';

  const saveUsernameFromProfile = async (rawName: string) => {
    const raw = rawName.trim().replace(/^@/, '');
    if (!raw) return;
    if (usingServerGame) {
      try {
        await updateUsername(raw);
        setProfile((prev) => (prev ? { ...prev, username: raw } : prev));
        showToast('Pit name updated!');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Could not update name';
        showToast(message, 'error');
      }
      return;
    }
    setProfile((prev) =>
      prev
        ? { ...prev, username: raw }
        : { id: 'demo', username: raw, balance: userBalance, created_at: new Date().toISOString() }
    );
    showToast('Pit name saved locally');
  };

  const seedDemoToAccount = async () => {
    if (!user || !supabase) {
      showToast('Login first to seed to your real account', 'error');
      return;
    }
    const first = initialContests[0];
    try {
      await supabase.from('participations').upsert({
        user_id: user.id,
        contest_id: first.id,
        cash: first.startingPortfolioValue * 0.6,
        positions: [
          { symbol: 'SPY', shares: 55, avgPrice: 545 },
          { symbol: 'NVDA', shares: 280, avgPrice: 128 },
        ],
        starting_value: first.startingPortfolioValue,
      });
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'entry_fee',
        amount: -first.entryFee,
        description: `Demo entry for ${first.title}`,
        contest_id: first.id,
      });
      await loadUserData(user.id!);
      showToast('Demo participation seeded to your Supabase account!');
    } catch {
      showToast('Seed failed - check schema', 'error');
    }
  };
  return (
    <div className={`app-container mx-auto bg-background text-[var(--text)] min-h-screen flex flex-col ${activeTab === 'home' ? 'arena-mode' : ''} ${rankShake ? 'screen-rank-shake' : ''}`}>
      <SetupBanner />
      {/* Header */}
      {activeTab === 'home' ? (
        <div className="pit-chrome">
          <div className="pit-chrome-left">
            <div className="pit-chrome-mark">
              TRADR<span>PIT</span>
            </div>
            <div className="pit-chrome-status">
              {floorLivePitCount > 0 && <span className="pit-chrome-orb" aria-hidden />}
              <span>{DAY_THEMES[new Date().getDay()].word} day</span>
              {floorLivePitCount > 0 && (
                <>
                  <span className="pit-chrome-status-sep">·</span>
                  <span>
                    {floorLivePitCount} live · ${floorPrizePool.toLocaleString()} in prizes
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="font-mono text-sm font-semibold tabular-nums text-[var(--text)]">
              ${effectiveBalance.toFixed(2)}
            </div>
            {!stripeEnabled && user && (
              <button
                onClick={() => deposit(50)}
                className="text-[10px] px-2 py-1 border border-accent/40 text-accent rounded-lg"
              >
                +$50
              </button>
            )}
            <button
              onClick={() => setActiveTab('account')}
              className="w-8 h-8 rounded-full bg-surface border border-card flex items-center justify-center active:bg-overlay overflow-hidden"
            >
              {user ? (
                <div className="text-[10px] font-mono bg-accent text-black w-full h-full flex items-center justify-center">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </div>
              ) : (
                <User size={16} />
              )}
            </button>
          </div>
        </div>
      ) : null}

      {activeTab === 'home' && <ArenaTabHint suppressed={showOnboarding} />}

      {activeTab === 'entries' && (
        <PitTabChrome
          kicker="Your tickets"
          title="Battles"
          statusLine={
            <>
              {(battlesSegment === 'active' && activeBattles.length > 0) && (
                <span className="ptc-status-dot" aria-hidden />
              )}
              {battlesChromeStatus}
            </>
          }
          balance={effectiveBalance}
          user={user}
          stripeEnabled={stripeEnabled}
          onDeposit={deposit}
          onProfile={() => setActiveTab('account')}
          trailing={
            <BattlesTourHelpButton
              onClick={() => {
                setBattlesSegment('active');
                setBattlesTourStep(0);
                setShowBattlesTour(true);
              }}
            />
          }
        />
      )}

      {activeTab === 'leaderboard' && (
        <PitTabChrome
          kicker="Spectator deck"
          title="Vault"
          statusLine="Live pit · tape week · global hall"
          balance={effectiveBalance}
          user={user}
          stripeEnabled={stripeEnabled}
          onDeposit={deposit}
          onProfile={() => setActiveTab('account')}
        />
      )}

      {activeTab === 'account' && (
        <PitTabChrome
          kicker="Pit identity"
          title="Profile"
          statusLine={user ? pitDisplayName : 'Sign in to sync your tape'}
          balance={effectiveBalance}
          user={user}
          stripeEnabled={stripeEnabled}
          onDeposit={deposit}
          onProfile={() => setActiveTab('account')}
        />
      )}

      {/* Main Content */}
      <div className={`flex-1 pb-28 overflow-y-auto ${activeTab === 'home' ? 'px-4 pt-0 arena-scroll' : 'px-5 pt-4'}`}>
        
        {/* ARENA TAB */}
        {activeTab === 'home' && (
          <ArenaHome
            pits={arenaPitList}
            joinedContestIds={joinedContests}
            getParticipantCount={getLiveParticipantCount}
            getRank={rankInContest}
            bellTick={bellTick}
            hydrated={hydrated}
            isTradingOpen={isContestTradingOpen}
            onInfo={setInfoContestId}
            onEnter={(contest) => {
              if (!joinedContests.includes(contest.id)) joinArena(contest.id);
              else if (isContestTradingOpen(contest)) openTradeModal(contest.id);
              else {
                setActiveTab('entries');
                setBattlesSegment('upcoming');
              }
            }}
            contests={contests}
            onJoinWeekPit={async (slug, dayIndex) => {
              if (hasJoinedWeekDayPit(contests, joinedContests, slug, dayIndex)) {
                const live =
                  findJoinableContestForWeekDay(contests, slug, dayIndex, []) ??
                  findContestForWeekPit(contests, slug, dayIndex);
                if (live && joinedContests.includes(live.id) && isContestTradingOpen(live)) {
                  openTradeModal(live.id);
                  return;
                }
                setActiveTab('entries');
                setBattlesSegment('upcoming');
                return;
              }
              if (usingServerGame) {
                await ensureWeekSlate();
                const fresh = await fetchContests();
                setContests(fresh);
                const match = findJoinableContestForWeekDay(fresh, slug, dayIndex, joinedContests);
                if (match) {
                  joinArena(match.id);
                  return;
                }
              } else {
                const match = findJoinableContestForWeekDay(contests, slug, dayIndex, joinedContests);
                if (match) {
                  joinArena(match.id);
                  return;
                }
              }
              showToast('Pit is full or entries closed — check back when the tape drops', 'error');
            }}
            onInfoWeekPit={(slug, dayIndex) => {
              const match =
                findContestForWeekPit(contests, slug, dayIndex) ??
                findJoinableContestForWeekDay(contests, slug, dayIndex, joinedContests);
              if (match) setInfoContestId(match.id);
              else showToast('Contest details unlock when this pit opens', 'error');
            }}
            useServerStreak={usingServerGame}
            getPitLiveStats={(contestId) => {
              const p = participations[contestId];
              if (!p) return null;
              const liveValue = getPortfolioValue(p);
              return {
                liveValue,
                pnlPct: ((liveValue / p.startingValue) - 1) * 100,
                rank: rankInContest(contestId),
              };
            }}
            getContestBoard={getContestBoard}
            onViewLeaderboard={openLeaderboard}
            onShowHowItWorks={() => setShowHowItWorks(true)}
          />
        )}

        {activeTab === 'entries' && (
          <BattlesTab
            battlesSegment={battlesSegment}
            onBattlesSegmentChange={setBattlesSegment}
            highlightDoneContestId={highlightDoneContestId}
            onClearDoneHighlight={() => setHighlightDoneContestId(null)}
            activeBattles={activeBattles}
            activeBattlesOrdered={activeBattlesOrdered}
            scheduledBattles={scheduledBattles}
            sortedCompletedBattles={sortedCompletedBattles}
            completedBattlesCount={completedBattles.length}
            contests={contests}
            openingBellContest={openingBellContest}
            bellTick={bellTick}
            prices={prices}
            tradeLimitByContest={tradeLimitByContest}
            getPortfolioValue={getPortfolioValue}
            rankInContest={rankInContest}
            getContestBoard={getContestBoard}
            onJoinFree={() => {
              if (openingBellContest) joinArena(openingBellContest.id);
            }}
            onGoArena={() => setActiveTab('home')}
            onTrade={openTradeModal}
            onLeaderboard={openLeaderboard}
            onInfo={(contestId) => setInfoContestId(contestId)}
            onRecap={openContestRecap}
          />
        )}

        {activeTab === 'leaderboard' && (
          <VaultTab
            vaultMode={vaultMode}
            onVaultModeChange={setVaultMode}
            vaultContest={vaultContest}
            activeVaultContestId={activeVaultContestId}
            joinedContests={joinedContests}
            contests={contests}
            dynamicVault={dynamicVault}
            vaultPlayerCount={vaultPlayerCount}
            bestPortfolioValue={bestPortfolioValue}
            bellTick={bellTick}
            hydrated={hydrated}
            pitFeedItems={(activeVaultContestId ? pitFeedByContest[activeVaultContestId] || [] : []).map((f) => ({
              id: f.id,
              username: f.username,
              side: f.side,
              symbol: f.symbol,
              shares: f.shares,
              price: f.price,
              isYou: f.isYou,
            }))}
            pitFeedLoading={pitFeedLoading}
            tapeLeaderboard={tapeLeaderboard}
            tapeThemeLine={tapeThemeLine}
            tapeLoading={tapeLoading}
            onRefreshTape={() => refreshTapeLeaderboard()}
            globalPeriod={globalPeriod}
            globalMetric={globalMetric}
            globalLeaderboard={globalLeaderboard}
            globalLoading={globalLoading}
            onGlobalPeriodChange={(v) => {
              setGlobalPeriod(v);
              refreshGlobalLeaderboard(v, globalMetric);
            }}
            onGlobalMetricChange={(m) => {
              setGlobalMetric(m);
              refreshGlobalLeaderboard(globalPeriod, m);
            }}
            onSelectVaultContest={async (id) => {
              setVaultContestId(id);
              try {
                const c = contests.find((x) => x.id === id);
                if (c?.assets?.length) await fetchLivePrices(c.assets);
                await refreshLeaderboard(id);
              } catch {
                showToast('Could not load that pit board', 'error');
              }
            }}
            onRefreshPit={async () => {
              if (!activeVaultContestId) return;
              try {
                await refreshLeaderboard(activeVaultContestId);
                showToast('Rankings updated');
              } catch {
                showToast('Could not refresh rankings', 'error');
              }
            }}
            onGoArena={() => setActiveTab('home')}
          />
        )}

        {activeTab === 'account' && (
          <ProfileTab
            authLoading={authLoading}
            user={user}
            profile={profile}
            pitDisplayName={pitDisplayName}
            yourRank={yourRank}
            usingServerGame={usingServerGame}
            stripeEnabled={stripeEnabled}
            depositLoading={depositLoading}
            effectiveBalance={effectiveBalance}
            effectiveStats={effectiveStats}
            profileExtrasLoading={profileExtrasLoading}
            spotlightContest={spotlightContest}
            spotlightFill={spotlightFill}
            referralStats={referralStats}
            referralLink={referralLink()}
            referralCopied={referralCopied}
            activities={activities}
            history={history}
            onSaveUsername={saveUsernameFromProfile}
            onDeposit={deposit}
            onLogout={handleLogout}
            onAuth={handleAuth}
            onToggleSignup={() => setIsSigningUp(!isSigningUp)}
            isSigningUp={isSigningUp}
            email={email}
            password={password}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            profileSection={profileSection}
            onProfileSectionChange={setProfileSection}
            onShareReferral={shareReferralLink}
            onCopyReferral={copyReferralLink}
            onSeedDemo={usingServerGame ? seedDemoToAccount : undefined}
            onRefreshPrices={fetchLivePrices}
            onResetDemo={resetDemo}
            showDevTools={!stripeEnabled}
          />
        )}
      </div>

      {/* Bottom Tab Bar - Arena style with underline active */}
      <div className="tab-bar fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] z-50 h-[68px]">
        <div className="flex justify-around items-center h-full px-2 text-xs">
          {[
            { id: 'home', label: 'ARENA', icon: Home },
            { id: 'entries', label: 'BATTLES', icon: List },
            { id: 'leaderboard', label: 'VAULT', icon: BarChart3 },
            { id: 'account', label: 'PROFILE', icon: User },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const badge = tab.id === 'entries' && activeBattles.length > 0 ? activeBattles.length : null;
            const navDot =
              tab.id === 'home' && showArenaNavDot
                ? 'tab-dot'
                : tab.id === 'account' && showProfileNavDot
                  ? 'tab-dot tab-pulse-dot'
                  : null;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`tab-item flex flex-col items-center justify-center flex-1 py-1 ${isActive ? 'active' : 'text-muted'}`}
              >
                <div className="relative">
                  <Icon size={19} strokeWidth={isActive ? 2.6 : 2} />
                  {badge != null && <span className="tab-badge">{badge}</span>}
                  {navDot && <span className={navDot} aria-hidden />}
                </div>
                <div className="text-[9px] mt-0.5 font-medium tracking-[1px]">{tab.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rank delta flash after trade */}
      {lastTradeFlash && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[72] w-[calc(100%-2.5rem)] max-w-[380px] rank-delta-pop">
          <div className="bg-user-card border border-accent/50 rounded-2xl px-4 py-3 shadow-lg">
            <div className="text-[10px] tracking-[2px] text-muted uppercase mb-1">Rank update</div>
            <div className="flex justify-between items-center">
              <div className="font-mono text-2xl font-black text-accent">
                #{lastTradeFlash.rankBefore}
                {lastTradeFlash.rankAfter !== lastTradeFlash.rankBefore && (
                  <span> → #{lastTradeFlash.rankAfter}</span>
                )}
              </div>
              <div className="text-right text-xs">
                <div className="font-mono text-accent">${lastTradeFlash.portfolioValue.toLocaleString()}</div>
                <div className="text-muted">{lastTradeFlash.tradersBehind} behind you</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[70] flex flex-col gap-1.5 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-2 rounded-2xl text-sm shadow pointer-events-auto ${t.type === 'error' ? 'bg-red-950 text-red-400' : 'bg-[#1a1a1a] text-accent border border-accent/30'}`}>
            {t.message}
          </div>
        ))}
      </div>

      {/* Global rank-move toast — battles, vault, arena (not inside trade sheet) */}
      {pitMoment && !tradingContestId && (
        <div className="pit-moment-toast" role="status">
          <PitMomentBanner moment={pitMoment} onDismiss={() => setPitMoment(null)} />
        </div>
      )}

      {/* FIRST-TIME ONBOARDING */}
      {showOnboarding && user && (
        <OnboardingPit
          defaultUsername={profile?.username || user.email?.split('@')[0] || ''}
          freePitName={openingBellContest?.title || 'Opening Bell'}
          onComplete={completeOnboarding}
          onSetUsername={async (name) => {
            await updateUsername(name);
            setProfile((prev) => (prev ? { ...prev, username: name } : prev));
          }}
          onJoinFreePit={async () => {
            if (openingBellContest && !joinedContests.includes(openingBellContest.id)) {
              await joinArena(openingBellContest.id);
            }
          }}
        />
      )}

      {/* CONTEST RECAP MODAL */}
      {recapData && (
        <ContestRecapModal recap={recapData} onClose={() => setRecapData(null)} />
      )}

      {settlementResult && (
        <SettlementModal
          result={settlementResult}
          onReadTape={() => {
            const id = settlementResult.contestId;
            viewSettlementInDone();
            openContestRecap(id);
          }}
          onRunItBack={runItBack}
          onShare={shareSettlement}
          onViewDone={viewSettlementInDone}
          onDismiss={dismissSettlement}
        />
      )}

      {tradingContestId && participations[tradingContestId] && (() => {
        const tc = contests.find((c) => c.id === tradingContestId)!;
        const tp = participations[tradingContestId];
        return (
          <TradeSheet
            contestId={tradingContestId}
            contest={tc}
            participation={tp}
            board={getContestBoard(tradingContestId)}
            liveValue={getPortfolioValue(tp)}
            rank={rankInContest(tradingContestId)}
            prices={prices}
            priceFlashes={priceFlashes}
            tradeSymbol={tradeSymbol}
            tradeShares={tradeShares}
            tradeSide={tradeSide}
            selectedChartSymbol={selectedChartSymbol}
            tradeLimit={tradeLimitByContest[tradingContestId]}
            lastPriceUpdate={lastPriceUpdate}
            bellTick={bellTick}
            hydrated={hydrated}
            userId={user?.id || 'you'}
            onClose={closeTradeModal}
            onInfo={() => setInfoContestId(tradingContestId)}
            onLeaderboard={() => openLeaderboard(tradingContestId)}
            onTradeSymbol={(sym) => {
              setTradeSymbol(sym);
              setSelectedChartSymbol(sym);
            }}
            onTradeShares={setTradeShares}
            onTradeSide={setTradeSide}
            onClearChart={() => setSelectedChartSymbol('')}
            onRefreshPrices={fetchLivePrices}
            onExecuteTrade={handleTrade}
          />
        );
      })()}

{infoContest && (
        <ContestInfoModal
          contest={infoContest}
          bellTick={bellTick}
          onClose={() => setInfoContestId(null)}
        />
      )}

      {showBattlesTour && activeTab === 'entries' && (
        <ActiveBattlesTour
          stepIndex={battlesTourStep}
          onStepChange={setBattlesTourStep}
          onClose={() => setShowBattlesTour(false)}
        />
      )}

      {showArenaTour && activeTab === 'home' && (
        <ArenaTour
          stepIndex={arenaTourStep}
          onStepChange={setArenaTourStep}
          onClose={() => setShowArenaTour(false)}
        />
      )}

      {joinFlashTitle && (
        <JoinPitFlash title={joinFlashTitle} onDone={() => setJoinFlashTitle(null)} />
      )}

      {showHowItWorks && <HowItWorksModal onClose={() => setShowHowItWorks(false)} />}

      {selectedChartSymbol && !tradingContestId && (
        <div className="fixed inset-0 bg-black/92 z-[58] flex items-end justify-center p-4 pb-24">
          <div className="w-full max-w-[420px] max-h-[85dvh] overflow-y-auto">
            <AssetChart
              symbol={selectedChartSymbol}
              currentPrice={prices[selectedChartSymbol] || 0}
              livePrices={prices}
              userPosition={
                chartContestId
                  ? participations[chartContestId]?.positions.find((p) => p.symbol === selectedChartSymbol) || null
                  : null
              }
              onClose={closeChart}
            />
          </div>
        </div>
      )}
    </div>
  );
}
