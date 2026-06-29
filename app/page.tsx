"use client";

import React, { useState, useEffect } from 'react';
import { 
  Trophy, Clock, Home, List, BarChart3, User, 
  TrendingUp, ArrowUp, ArrowDown, X, Share2, Medal, Target, Zap, Copy, Check, Info
} from 'lucide-react';
import AssetChart from '../components/AssetChart';
import SetupBanner from '../components/SetupBanner';
import SegmentedControl from '../components/SegmentedControl';
import ContestRecapModal from '../components/ContestRecapModal';
import PitFeed from '../components/PitFeed';
import BeatLeaderCard from '../components/BeatLeaderCard';
import OnboardingPit from '../components/OnboardingPit';
import PitRulesStrip from '../components/PitRulesStrip';
import ContestInfoModal from '../components/ContestInfoModal';
import AssetChip from '../components/AssetChip';
import MoneyZoneBar from '../components/MoneyZoneBar';
import PitLeaderboardPanel from '../components/PitLeaderboardPanel';
import ArenaHome from '../components/ArenaHome';
import ActiveBattlesTour, { TourHelpButton as BattlesTourHelpButton, shouldShowActiveBattlesTour } from '../components/ActiveBattlesTour';
import ArenaTour, { shouldShowArenaTour } from '../components/ArenaTour';
import { BellCountdown, TimeLeftLabel } from '../components/BellCountdown';
import { REFERRAL_HIGHLIGHTS, REFERRAL_TIERS } from '../lib/referral-program';
import { useHydrated } from '../lib/use-hydrated';
import { supabase, isSupabaseConfigured, Profile } from '../lib/supabase';
import {
  Contest,
  Participation,
  LeaderboardEntry,
  GlobalLeaderboardEntry,
  GlobalLeaderboardMetric,
  GlobalLeaderboardPeriod,
  UserPerformanceStats,
  ActivityItem,
  ContestRecap,
  TradeLogEntry,
  TapeLeaderboardEntry,
  ReferralStats,
  formatTimeLeft,
  formatMemberSince,
  displayUsername,
} from '../lib/game-types';
import { Position, getPortfolioValue as calcPortfolioValue } from '../lib/portfolio';
import {
  fetchContests,
  ensureWeekSlate,
  refreshGameState,
  joinContestApi,
  executeTradeApi,
  fetchLeaderboard,
  settleContestApi,
  fetchMyStats,
  fetchGlobalLeaderboard,
  fetchActivity,
  fetchContestRecap,
  updateUsername,
  triggerAutoSettle,
  fetchPitFeed,
  fetchTradeLimit,
  createDepositCheckout,
  syncOpeningBellStreak,
  fetchReferralStats,
  fetchTapeLeaderboard,
  type PitFeedItem,
} from '../lib/game-api';
import { buildTradeLimitInfo, canPlaceTrade, type TradeLimitInfo } from '../lib/trade-limits';
import TradeMeter from '../components/TradeMeter';
import PitFillBadge from '../components/PitFillBadge';
import JoinPitFlash from '../components/JoinPitFlash';
import PitMomentBanner from '../components/PitMomentBanner';
import EmptyActiveBattles from '../components/EmptyActiveBattles';
import SettleShareCard from '../components/SettleShareCard';
import {
  buildDemoContests,
  findOpeningBellContest,
  isStaleOpeningBellContest,
  OPENING_BELL_SLUG,
} from '../lib/pit-contests';
import { getOpeningBellStreak, recordOpeningBellDay, applyServerStreakSnapshot } from '../lib/opening-bell-streak';
import TapeWeekLeaderboard from '../components/TapeWeekLeaderboard';
import { buildPitMoment, type PitMoment } from '../lib/pit-moments';
import { getContestRules } from '../lib/contest-rules';
import { payoutForContestRank } from '../lib/pit-payouts';
import PitMoneyDisplay, { PitProjectedPayout } from '../components/PitMoneyDisplay';
import { findNextJoinablePit, buildPitShareText } from '../lib/next-pit';
import {
  findContestForWeekPit,
  findJoinableContestForWeekDay,
  hasJoinedWeekDayPit,
} from '../lib/week-join';
import { isSymbolTradableNow } from '../lib/market-hours';
import {
  affordableBuyShares,
  formatShareInput,
  sharesForCashPercent,
  sharesForPositionPercent,
} from '../lib/trade-sizing';
import { featuredPitSortScore } from '../lib/tape-week';

const SEEN_SETTLEMENTS_KEY = 'tradr_seen_settlements';

function loadSeenSettlementIds(): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(SEEN_SETTLEMENTS_KEY);
    const ids = raw ? (JSON.parse(raw) as number[]) : [];
    return new Set(ids);
  } catch {
    return new Set();
  }
}

function markSettlementSeen(contestId: number) {
  if (typeof window === 'undefined') return;
  const seen = loadSeenSettlementIds();
  seen.add(contestId);
  localStorage.setItem(SEEN_SETTLEMENTS_KEY, JSON.stringify([...seen].slice(-80)));
}
import {
  isContestBellOpen,
  isContestStarted,
  isContestTradingOpen,
  isJoinAllowed,
  isPriceStale,
  bellMsRemaining,
  formatBellCountdown,
} from '../lib/contest-bell';
import ScheduledPitChip from '../components/ScheduledPitChip';
import { estimateRankAfterTrade, portfolioAfterTrade } from '../lib/simulate-trade';

type MarketPrices = Record<string, number>;

// ==================== INITIAL DATA — TradR Pit contest lineup ====================
const initialContests: Contest[] = buildDemoContests();

const initialPrices: MarketPrices = {
  SPY: 545.20,
  QQQ: 478.90,
  NVDA: 128.45,
  BTC: 67250,
  ETH: 3520,
  AAPL: 212.80,
  TSLA: 248.30,
  META: 505.15,
  SOL: 142.75,
  DOGE: 0.124,
  PEPE: 0.000012,
  GLD: 218.5,
  SLV: 24.8,
};

const initialUserBalance = 275;

const mockOtherTraders = [
  { username: '@jeff', baseValue: 108450 },
  { username: '@guru', baseValue: 101200 },
  { username: '@cip', baseValue: 99500 },
];

const CRYPTO_MAP: Record<string, string> = {
  BTC: 'X:BTCUSD',
  ETH: 'X:ETHUSD',
  SOL: 'X:SOLUSD',
  DOGE: 'X:DOGEUSD',
};

function isCrypto(sym: string) {
  return !!CRYPTO_MAP[sym];
}

export default function TradR() {
  // UI state
  const [activeTab, setActiveTab] = useState<'home' | 'entries' | 'leaderboard' | 'account'>('home');


  // Fully functioning state
  const [contests, setContests] = useState<Contest[]>(initialContests);
  const [prices, setPrices] = useState<MarketPrices>(initialPrices);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);
  const [userBalance, setUserBalance] = useState(initialUserBalance);
  const [participations, setParticipations] = useState<Record<number, Participation>>({});
  const [leaderboardByContest, setLeaderboardByContest] = useState<Record<number, LeaderboardEntry[]>>({});
  const [vaultContestId, setVaultContestId] = useState<number | null>(null);
  const [gameSyncing, setGameSyncing] = useState(false);

  // Trading modal state
  const [tradingContestId, setTradingContestId] = useState<number | null>(null);
  const [tradeSymbol, setTradeSymbol] = useState('');
  const [tradeShares, setTradeShares] = useState('10');
  const [tradeSide, setTradeSide] = useState<'buy' | 'sell'>('buy');
  const [selectedChartSymbol, setSelectedChartSymbol] = useState<string>('');
  const [chartContestId, setChartContestId] = useState<number | null>(null);

  // Settlement results modal (SwapRoyale-style payout screen)
  const [settlementResult, setSettlementResult] = useState<{
    contestId: number;
    contestSlug?: string;
    rank: number;
    payout: number;
    refund?: number;
    voided?: boolean;
    contestTitle: string;
    portfolioValue: number;
    startingValue: number;
    settlementPrices?: Record<string, number>;
  } | null>(null);

  // Toast system for clean feedback
  const [toasts, setToasts] = useState<{ id: number; message: string; type?: 'success' | 'error' }[]>([]);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2600);
  };

  // Simple transaction history
  const [history, setHistory] = useState<Array<{ time: string; action: string; amount?: number }>>([]);

  // Polish: price change flash for live feel
  const prevPricesRef = React.useRef<MarketPrices>({});
  const [priceFlashes, setPriceFlashes] = useState<Record<string, 'up' | 'down'>>({});

  // Auth + User state (Supabase)
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Battles / Vault / Profile enhancements
  const [battlesSegment, setBattlesSegment] = useState<'active' | 'upcoming' | 'completed'>('active');
  const [vaultMode, setVaultMode] = useState<'pit' | 'global' | 'tape'>('pit');
  const [globalPeriod, setGlobalPeriod] = useState<GlobalLeaderboardPeriod>('all');
  const [globalMetric, setGlobalMetric] = useState<GlobalLeaderboardMetric>('winnings');
  const [globalLeaderboard, setGlobalLeaderboard] = useState<GlobalLeaderboardEntry[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [userStats, setUserStats] = useState<UserPerformanceStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [profileSection, setProfileSection] = useState<'overview' | 'performance' | 'invite' | 'activity'>('overview');
  const [recapData, setRecapData] = useState<ContestRecap | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [tapeLeaderboard, setTapeLeaderboard] = useState<TapeLeaderboardEntry[]>([]);
  const [tapeThemeLine, setTapeThemeLine] = useState('');
  const [tapeLoading, setTapeLoading] = useState(false);
  const [profileExtrasLoading, setProfileExtrasLoading] = useState(false);
  const [pitFeedByContest, setPitFeedByContest] = useState<Record<number, PitFeedItem[]>>({});
  const [pitFeedLoading, setPitFeedLoading] = useState(false);
  const [lastTradeFlash, setLastTradeFlash] = useState<{
    rankBefore: number;
    rankAfter: number;
    portfolioValue: number;
    tradersBehind: number;
  } | null>(null);
  const [bellTick, setBellTick] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);
  const [infoContestId, setInfoContestId] = useState<number | null>(null);
  const [showBattlesTour, setShowBattlesTour] = useState(false);
  const [battlesTourStep, setBattlesTourStep] = useState(0);
  const [showArenaTour, setShowArenaTour] = useState(false);
  const [arenaTourStep, setArenaTourStep] = useState(0);
  const [tradeLimitByContest, setTradeLimitByContest] = useState<Record<number, TradeLimitInfo>>({});
  const [demoTradeCounts, setDemoTradeCounts] = useState<Record<number, number>>({});
  const [joinFlashTitle, setJoinFlashTitle] = useState<string | null>(null);
  const [pitMoment, setPitMoment] = useState<PitMoment | null>(null);
  const [rankShake, setRankShake] = useState(false);
  const [vaultRankAnim, setVaultRankAnim] = useState<'up' | 'down' | null>(null);
  const autoSettledIdsRef = React.useRef<Set<number>>(new Set());
  const serverSettledShownRef = React.useRef<Set<number>>(loadSeenSettlementIds());

  const hydrated = useHydrated();
  const isLoggedIn = !!user;
  const usingServerGame = isSupabaseConfigured && isLoggedIn;
  const effectiveBalance = isLoggedIn && profile ? profile.balance : userBalance;
  const pitDisplayName = displayUsername(profile?.username, user?.email);

  const shouldUseDemoSeed = !usingServerGame;

  useEffect(() => {
    if (activeTab === 'entries' && shouldShowActiveBattlesTour()) {
      setBattlesSegment('active');
      setBattlesTourStep(0);
      setShowBattlesTour(true);
    }
    if (activeTab === 'home' && shouldShowArenaTour()) {
      setShowArenaTour(true);
      setArenaTourStep(0);
    }
  }, [activeTab]);

  const infoContest = infoContestId != null ? contests.find((c) => c.id === infoContestId) : null;

  const loadTradeLimit = async (contestId: number) => {
    const contest = contests.find((c) => c.id === contestId);
    if (!contest) return;
    if (usingServerGame) {
      try {
        const info = await fetchTradeLimit(contestId);
        setTradeLimitByContest((prev) => ({ ...prev, [contestId]: info }));
      } catch {
        /* offline */
      }
      return;
    }
    const used = demoTradeCounts[contestId] ?? 0;
    setTradeLimitByContest((prev) => ({
      ...prev,
      [contestId]: buildTradeLimitInfo(used, contest.slug),
    }));
  };

  // Keep local balance in sync with Supabase profile when logged in
  useEffect(() => {
    if (isLoggedIn && profile && typeof profile.balance === 'number') {
      setUserBalance(profile.balance);
    }
  }, [profile, isLoggedIn]);

  // When logged in, don't persist the local userBalance to localStorage (use DB instead)
  useEffect(() => {
    if (isLoggedIn) {
      // Only persist other state, not balance when using Supabase
      localStorage.setItem('tradr-state', JSON.stringify({ participations, prices, contests }));
    }
  }, [participations, prices, contests, isLoggedIn]);

  const syncGameFromServer = async () => {
    if (!usingServerGame) return;
    setGameSyncing(true);
    try {
      const state = await refreshGameState();
      setContests(state.contests.length ? state.contests : contests);
      setParticipations(state.participations);
      if (state.profileBalance != null) {
        setUserBalance(state.profileBalance);
        setProfile((prev) => (prev ? { ...prev, balance: state.profileBalance! } : prev));
      }
    } catch (e) {
      console.warn('Game sync failed', e);
    } finally {
      setGameSyncing(false);
    }
  };

  const refreshLeaderboard = async (contestId: number): Promise<LeaderboardEntry[]> => {
    if (!isSupabaseConfigured) return [];
    try {
      const { entries, prices: lbPrices } = await fetchLeaderboard(contestId);
      const marked = user
        ? entries.map((e) => ({ ...e, isYou: e.userId === user.id }))
        : entries;
      setLeaderboardByContest((prev) => ({ ...prev, [contestId]: marked }));
      if (Object.keys(lbPrices).length) {
        setPrices((prev) => ({ ...prev, ...lbPrices }));
      }
      return marked;
    } catch (e) {
      console.warn('Leaderboard refresh failed', e);
      return [];
    }
  };

  const loadPitFeed = async (contestId: number) => {
    if (!usingServerGame) return;
    setPitFeedLoading(true);
    try {
      const feed = await fetchPitFeed(contestId);
      setPitFeedByContest((prev) => ({ ...prev, [contestId]: feed }));
    } catch (e) {
      console.warn('Pit feed failed', e);
    } finally {
      setPitFeedLoading(false);
    }
  };

  const pushLocalFeedItem = (contestId: number, item: PitFeedItem) => {
    setPitFeedByContest((prev) => ({
      ...prev,
      [contestId]: [item, ...(prev[contestId] || [])].slice(0, 30),
    }));
  };

  const showRankTradeToast = (result: {
    rankBefore: number;
    rank: number;
    rankDelta: number;
    portfolioValue: number;
    tradersBehind: number;
    side: string;
    symbol: string;
    shares: number;
    executedPrice?: number;
    tradeLimit?: TradeLimitInfo;
    board?: LeaderboardEntry[];
  }) => {
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

  const loadProfileExtras = async () => {
    if (!usingServerGame) return;
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

  const saveUsername = async () => {
    const raw = usernameInput.trim().replace(/^@/, '');
    if (!raw) return;
    if (usingServerGame) {
      try {
        await updateUsername(raw);
        setProfile((prev) => (prev ? { ...prev, username: raw } : prev));
        setEditingUsername(false);
        showToast('Pit name updated!');
      } catch (err: any) {
        showToast(err.message || 'Could not update name', 'error');
      }
      return;
    }
    setProfile((prev) => (prev ? { ...prev, username: raw } : { id: 'demo', username: raw, balance: userBalance, created_at: new Date().toISOString() }));
    setEditingUsername(false);
    showToast('Pit name saved locally');
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

  // Stripe availability + deposit return URL
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

  // First-time pit onboarding
  useEffect(() => {
    if (!user || authLoading) return;
    const done = localStorage.getItem('tradr_pit_onboarded');
    if (!done && usingServerGame) {
      setShowOnboarding(true);
    }
  }, [user, authLoading, usingServerGame]);

  // Capture referral code from invite links (?ref=pitXXXXXXXX)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('tradr_ref', ref.toLowerCase());
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Auto-settle expired pits (server truth)
  useEffect(() => {
    if (!usingServerGame) return;
    const runAutoSettle = async () => {
      try {
        const result = await triggerAutoSettle();
        if (result.settled > 0 || (result.spawned ?? 0) > 0) {
          await syncGameFromServer();
          loadProfileExtras();
          if (result.settled > 0) {
            const yours = result.contests.find(
              (c) => c.yourAffected || c.yourRank != null || c.voided
            );
            if (yours && !serverSettledShownRef.current.has(yours.id)) {
              serverSettledShownRef.current.add(yours.id);
              markSettlementSeen(yours.id);
              const settledContest = contests.find((x) => x.id === yours.id);
              if (settledContest?.slug === OPENING_BELL_SLUG) celebrateOpeningBellStreak(settledContest);
              setSettlementResult({
                contestId: yours.id,
                contestSlug: settledContest?.slug,
                rank: yours.yourRank ?? 0,
                payout: yours.yourPayout ?? 0,
                refund: yours.yourRefund,
                voided: yours.voided,
                contestTitle: yours.title,
                portfolioValue: yours.yourPortfolioValue ?? 0,
                startingValue: participations[yours.id]?.startingValue ?? 100_000,
                settlementPrices: yours.settlementPrices,
              });
            } else {
              const unseen = result.contests.filter((c) => !serverSettledShownRef.current.has(c.id));
              if (unseen.length) {
                unseen.forEach((c) => {
                  serverSettledShownRef.current.add(c.id);
                  markSettlementSeen(c.id);
                });
                const names = unseen.map((c) => c.title).join(', ');
                showToast(`Pit closed: ${names}`);
              }
            }
          }
          if ((result.spawned ?? 0) > 0) {
            showToast(`${result.spawned} fresh pit(s) spawned`);
          }
        }
      } catch {
        /* ignore when offline */
      }
    };
    runAutoSettle();
    const interval = setInterval(runAutoSettle, 30000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') runAutoSettle();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [usingServerGame, user?.id]);

  // Realtime vault — refresh when any trader moves in your pits
  useEffect(() => {
    if (!user || !supabase) return;
    const ids = Object.keys(participations).map(Number);
    if (!ids.length) return;

    const sb = supabase;
    const channel = sb.channel(`pit-live-${ids.join('-')}`);
    ids.forEach((contestId) => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participations',
          filter: `contest_id=eq.${contestId}`,
        },
        () => refreshLeaderboard(contestId)
      );
    });
    channel.subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [user?.id, Object.keys(participations).join(',')]);

  // Pit feed — poll + realtime on trade_log
  useEffect(() => {
    if (!usingServerGame || !user || !supabase) return;
    const ids = Object.keys(participations).map(Number);
    if (!ids.length) return;

    ids.forEach((id) => loadPitFeed(id));

    const sb = supabase;
    const channel = sb.channel(`pit-feed-${ids.join('-')}`);
    ids.forEach((contestId) => {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trade_log',
          filter: `contest_id=eq.${contestId}`,
        },
        () => {
          loadPitFeed(contestId);
          refreshLeaderboard(contestId);
        }
      );
    });
    channel.subscribe();

    const poll = setInterval(() => ids.forEach((id) => loadPitFeed(id)), 20000);
    return () => {
      clearInterval(poll);
      sb.removeChannel(channel);
    };
  }, [usingServerGame, user?.id, Object.keys(participations).join(',')]);

  // Bell countdown ticker (1s)
  useEffect(() => {
    const t = setInterval(() => setBellTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Auth listener
  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (session?.user) {
        setParticipations({});
        setLeaderboardByContest({});
        loadUserData(session.user.id);
      } else {
        setProfile(null);
        setLeaderboardByContest({});
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (session?.user) {
        setParticipations({});
        loadUserData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Realtime: subscribe to profile balance changes for live wallet feel (backend polish)
  useEffect(() => {
    if (!user || !supabase) return;

    const sb = supabase; // capture non-null for closure
    const channel = sb
      .channel('profile-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`
      }, (payload) => {
        const newBal = (payload.new as any).balance;
        if (typeof newBal === 'number') {
          setUserBalance(newBal);
          showToast('Balance updated live');
        }
      })
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [user]);

  // Load contests from server + demo seed for anonymous users
  useEffect(() => {
    const boot = async () => {
      if (isSupabaseConfigured) {
        try {
          const serverContests = await fetchContests();
          if (serverContests.length) {
            setContests(serverContests);
            const freePitId = findOpeningBellContest(serverContests)?.id;
            if (freePitId) refreshLeaderboard(freePitId);
          }
        } catch (e) {
          console.warn('Using local contest fallback', e);
        }
      }

      const saved = localStorage.getItem('tradr-state');
      let didLoadSaved = false;

      if (!usingServerGame && saved) {
        try {
          const p = JSON.parse(saved);
          if (p.userBalance != null) setUserBalance(p.userBalance);
          if (p.participations) setParticipations(p.participations);
          if (p.prices) setPrices(p.prices);
          if (p.contests) setContests(p.contests);
          didLoadSaved = true;
        } catch {}
      }

      const contestList = contests.length ? contests : initialContests;
      const allSyms = contestList.flatMap((c) => c.assets);
      const freshPrices = await fetchLivePrices(allSyms);

      if (!didLoadSaved && shouldUseDemoSeed) {
        const first = contestList[0];
        const sp = freshPrices['SPY'] || 545;
        const nv = freshPrices['NVDA'] || 128;

        const demoPart: Participation = {
          contestId: first.id,
          cash: first.startingPortfolioValue * 0.6,
          positions: [
            { symbol: 'SPY', shares: 55, avgPrice: sp },
            { symbol: 'NVDA', shares: 280, avgPrice: nv },
          ],
          startingValue: first.startingPortfolioValue,
        };
        setParticipations({ [first.id]: demoPart });
        setContests(
          contestList.map((c) =>
            c.id === first.id ? { ...c, entries: c.entries + 1, status: 'active' as const } : c
          )
        );
        setHistory([{ time: 'now', action: `Demo: Pre-joined ${first.title} at live market prices` }]);
      }
    };

    boot();
  }, []);

  // Poll leaderboard for joined + vault + canonical free pit
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const contestIds = [...new Set(Object.keys(participations).map(Number))];
    if (vaultContestId && !contestIds.includes(vaultContestId)) {
      contestIds.push(vaultContestId);
    }
    const freePitId = findOpeningBellContest(contests)?.id;
    if (freePitId && !contestIds.includes(freePitId)) {
      contestIds.push(freePitId);
    }
    if (!contestIds.length) return;

    contestIds.forEach((id) => refreshLeaderboard(id));
    const interval = setInterval(() => {
      contestIds.forEach((id) => refreshLeaderboard(id));
    }, 10000);
    return () => clearInterval(interval);
  }, [participations, contests, isSupabaseConfigured, vaultContestId, user?.id]);

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
    const joined = Object.keys(participations).map(Number);
    if (!joined.length) return;
    const canonical = findOpeningBellContest(contests);
    const preferred =
      (canonical?.id && joined.includes(canonical.id) ? canonical.id : undefined) ??
      joined.find((id) => {
        const c = contests.find((x) => x.id === id);
        return c && c.status !== 'closed';
      }) ??
      joined[joined.length - 1];
    setVaultContestId((prev) => {
      if (prev != null) {
        const prevContest = contests.find((c) => c.id === prev);
        if (prevContest && canonical && isStaleOpeningBellContest(prevContest, canonical)) {
          return joined.includes(canonical.id) ? canonical.id : preferred;
        }
        return prev;
      }
      return preferred;
    });
  }, [participations, contests]);

  useEffect(() => {
    if (usingServerGame) return;
    localStorage.setItem('tradr-state', JSON.stringify({ userBalance, participations, prices, contests }));
  }, [userBalance, participations, prices, contests, usingServerGame]);

  // Periodic live price polling (every ~20s)
  useEffect(() => {
    const symbols = getAllSymbols();
    if (symbols.length === 0) return;

    const interval = setInterval(() => {
      fetchLivePrices(symbols);
    }, 10000);  // 10s for polished live feel

    return () => clearInterval(interval);
  }, [contests]);

  // Detect price changes for flash animations (insanely polished live feel)
  useEffect(() => {
    const flashes: Record<string, 'up' | 'down'> = {};
    Object.keys(prices).forEach(sym => {
      const prev = prevPricesRef.current[sym];
      if (prev !== undefined && prev !== prices[sym]) {
        flashes[sym] = prices[sym] > prev ? 'up' : 'down';
      }
    });
    if (Object.keys(flashes).length > 0) {
      setPriceFlashes(flashes);
      setTimeout(() => setPriceFlashes({}), 800);
    }
    prevPricesRef.current = { ...prices };
  }, [prices]);

  // True live updates via Polygon WebSocket (if key available - the pro way)
  useEffect(() => {
    const polygonKey = process.env.NEXT_PUBLIC_POLYGON_API_KEY;
    if (!polygonKey) return;

    const ws = new WebSocket(`wss://socket.polygon.io/stocks`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ action: 'auth', params: polygonKey }));
      // Subscribe to all relevant tickers
      const tickers = getAllSymbols().map(s => isCrypto(s) ? `X:${s}USD` : s).join(',');
      ws.send(JSON.stringify({ action: 'subscribe', params: `T.${tickers}` }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (Array.isArray(msg)) {
          msg.forEach((m: any) => {
            if (m.ev === 'T' && m.p) {  // trade price
              const sym = Object.keys(CRYPTO_MAP).find(k => CRYPTO_MAP[k] === m.T) || m.T?.replace('X:', '').replace('USD', '');
              if (sym && prices[sym] !== undefined) {
                setPrices(prev => ({ ...prev, [sym]: Number(m.p.toFixed(sym === 'DOGE' ? 5 : 2)) }));
              }
            }
          });
        }
      } catch {}
    };

    return () => ws.close();
  }, [contests]);

  // ==================== HELPERS ====================
  const joinedContests = Object.keys(participations).map(Number);

  const getPortfolioValue = (p: Participation): number =>
    calcPortfolioValue(p, prices);

  const canonicalOpeningBell = findOpeningBellContest(contests);

  const featuredContest =
    contests.find((c) => c.status !== 'closed' && isContestTradingOpen(c)) ||
    canonicalOpeningBell ||
    contests.find((c) => c.status !== 'closed') ||
    contests[0];

  const entryFillPct = (c: Contest) =>
    Math.min(100, Math.round((c.entries / Math.max(c.maxEntries, 1)) * 100));

  const bestPortfolioValue = Object.values(participations).length
    ? Math.max(...Object.values(participations).map(getPortfolioValue))
    : 0;

  const resolveVaultContestId = (): number | null => {
    if (vaultContestId) {
      const prevContest = contests.find((c) => c.id === vaultContestId);
      if (prevContest && isStaleOpeningBellContest(prevContest, canonicalOpeningBell)) {
        if (canonicalOpeningBell?.id && joinedContests.includes(canonicalOpeningBell.id)) {
          return canonicalOpeningBell.id;
        }
      }
      return vaultContestId;
    }
    if (joinedContests.length) {
      if (canonicalOpeningBell?.id && joinedContests.includes(canonicalOpeningBell.id)) {
        return canonicalOpeningBell.id;
      }
      const live = joinedContests.find((id) => {
        const c = contests.find((x) => x.id === id);
        return c && c.status !== 'closed' && !isStaleOpeningBellContest(c, canonicalOpeningBell);
      });
      return live ?? joinedContests[joinedContests.length - 1];
    }
    return featuredContest?.id ?? null;
  };

  const activeVaultContestId = resolveVaultContestId();
  const vaultContest = activeVaultContestId
    ? contests.find((c) => c.id === activeVaultContestId)
    : featuredContest;

  const getContestBoard = (contestId: number | null): LeaderboardEntry[] => {
    if (!contestId) return [];

    const serverBoard = leaderboardByContest[contestId];
    if (serverBoard?.length) return serverBoard;

    const part = participations[contestId];
    if (!part) return [];

    // Logged-in / Supabase: never show fake traders
    if (isSupabaseConfigured || isLoggedIn) {
      const v = getPortfolioValue(part);
      return [{
        userId: user?.id || 'you',
        username: pitDisplayName !== '@trader' ? pitDisplayName : (user?.email ? `@${user.email.split('@')[0]}` : '@you'),
        portfolioValue: v,
        isYou: true,
        rank: 1,
      }];
    }

    // Demo-only fallback for anonymous local play
    const entries: LeaderboardEntry[] = [];
    const yourVal = getPortfolioValue(part);
    entries.push({
      userId: 'you',
      username: '@you',
      portfolioValue: yourVal || 98500,
      isYou: true,
      rank: 1,
    });

    const priceHash = Object.values(prices).reduce((a, b) => a + b, 0);
    mockOtherTraders.forEach((t, i) => {
      const variance = ((priceHash % (700 + i * 30)) - 250) * (i === 0 ? 3.8 : 2.2);
      entries.push({
        userId: `mock-${i}`,
        username: t.username,
        portfolioValue: Math.round(t.baseValue + variance),
        rank: i + 2,
      });
    });

    return entries
      .sort((a, b) => b.portfolioValue - a.portfolioValue)
      .map((e, i) => ({ ...e, rank: i + 1 }));
  };

  const getDynamicVault = (): LeaderboardEntry[] => getContestBoard(activeVaultContestId);

  const dynamicVault = getDynamicVault();
  const yourRank = dynamicVault.find((e) => e.isYou)?.rank || (dynamicVault.length ? dynamicVault.length + 1 : 1);
  const vaultPlayerCount = dynamicVault.length;

  const rankInContest = (contestId: number): number | null => {
    const board = getContestBoard(contestId);
    const you = board.find((e) => e.isYou);
    return you?.rank ?? null;
  };

  const getLiveParticipantCount = (contestId: number): number => {
    if (usingServerGame) {
      const board = leaderboardByContest[contestId];
      if (board?.length) return board.length;
      const contest = contests.find((c) => c.id === contestId);
      if (contest?.entries) return contest.entries;
      return participations[contestId] ? 1 : 0;
    }
    return participations[contestId] ? 1 : 0;
  };

  const celebrateOpeningBellStreak = async (contest?: Contest) => {
    if (contest?.slug !== OPENING_BELL_SLUG) return;

    if (usingServerGame) {
      try {
        const before = getOpeningBellStreak();
        const result = await syncOpeningBellStreak();
        const after = applyServerStreakSnapshot(result.streak, result.lastDayEt);

        if (result.creditsAwarded.length > 0) {
          for (const credit of result.creditsAwarded) {
            showToast(`${credit.label} — +$${credit.amount} pit credit`);
          }
          await syncGameFromServer();
          loadProfileExtras();
        } else if (after.streak >= 3 && before.streak < 3) {
          showToast('3-day tape streak — $2 pit credit unlocks at settlement');
        } else if (after.streak >= 7 && before.streak < 7) {
          showToast('Week on the tape — $5 pit credit unlocks at settlement');
        }
      } catch {
        const before = getOpeningBellStreak();
        const after = recordOpeningBellDay();
        if (after.streak >= 3 && before.streak < 3) {
          showToast('3-day tape streak — $2 pit credit unlocks at settlement');
        } else if (after.streak >= 7 && before.streak < 7) {
          showToast('Week on the tape — $5 pit credit unlocks at settlement');
        }
      }
      return;
    }

    const before = getOpeningBellStreak();
    const after = recordOpeningBellDay();
    if (after.streak >= 3 && before.streak < 3) {
      showToast('3-day tape streak — $2 pit credit unlocks at settlement');
    } else if (after.streak >= 7 && before.streak < 7) {
      showToast('Week on the tape — $5 pit credit unlocks at settlement');
    }
  };

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

  const dismissSettlement = () => {
    if (settlementResult?.contestId != null) {
      markSettlementSeen(settlementResult.contestId);
      serverSettledShownRef.current.add(settlementResult.contestId);
    }
    setSettlementResult(null);
  };

  const runItBack = async () => {
    const closedId = settlementResult?.contestId;
    dismissSettlement();
    const next = findNextJoinablePit(contests, joinedContests, closedId);
    setActiveTab('home');
    if (next) {
      await joinArena(next.id);
    } else {
      showToast('No open arenas right now — fresh pits drop soon');
    }
  };

  const openContestRecap = async (contestId: number) => {
    if (usingServerGame) {
      try {
        const recap = await fetchContestRecap(contestId);
        setRecapData(recap);
      } catch (err: any) {
        showToast(err.message || 'Recap unavailable', 'error');
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
      payout: payoutForContestRank(e.rank, c?.slug),
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

  const todayDayIndex = new Date().getDay();

  const arenaPitPriority = (c: Contest, scheduled: boolean) => {
    const joined = joinedContests.includes(c.id);
    if (joined && isContestTradingOpen(c)) return 0;
    if (joined && scheduled) return 1;
    if (!joined && isContestTradingOpen(c)) return 2;
    return 3;
  };

  const arenaPitList: Array<{ contest: Contest; scheduled: boolean }> = [];
  const seenArenaPitIds = new Set<number>();
  for (const c of contests) {
    if (c.status !== 'open' && c.status !== 'active') continue;
    if (isStaleOpeningBellContest(c, canonicalOpeningBell)) continue;


    const scheduled = isJoinableContest(c) && !isContestStarted(c);
    const live = isContestTradingOpen(c);
    if (!live && !scheduled) continue;
    if (seenArenaPitIds.has(c.id)) continue;

    arenaPitList.push({ contest: c, scheduled });
    seenArenaPitIds.add(c.id);
  }
  arenaPitList.sort((a, b) => {
    const priorityDiff =
      arenaPitPriority(a.contest, a.scheduled) - arenaPitPriority(b.contest, b.scheduled);
    if (priorityDiff !== 0) return priorityDiff;
    const featuredDiff =
      featuredPitSortScore(a.contest.slug, todayDayIndex) -
      featuredPitSortScore(b.contest.slug, todayDayIndex);
    if (featuredDiff !== 0) return featuredDiff;
    return b.contest.firstPrize - a.contest.firstPrize;
  });

  const floorLivePitCount = arenaPitList.filter((p) => !p.scheduled).length;
  const floorPrizePool = arenaPitList
    .filter((p) => !p.scheduled)
    .reduce((sum, p) => sum + p.contest.totalPrizes, 0);

  const isBattleOpen = (p: Participation) => {
    const c = contests.find((cc) => cc.id === p.contestId);
    return !!c && c.status !== 'closed' && p.finalRank == null;
  };

  const activeBattles = Object.values(participations).filter(
    (p) => isBattleOpen(p) && isContestStarted(contests.find((c) => c.id === p.contestId)!)
  );
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
  const scheduledBattles = Object.values(participations).filter(
    (p) => isBattleOpen(p) && !isContestStarted(contests.find((c) => c.id === p.contestId)!)
  );
  const completedBattles = Object.values(participations).filter((p) => {
    const c = contests.find((cc) => cc.id === p.contestId);
    return c?.status === 'closed' || p.finalRank != null;
  });
  const upcomingContests = contests.filter(
    (c) => isJoinableContest(c) && !joinedContests.includes(c.id)
  );
  const liveUpcomingContests = upcomingContests.filter((c) => isContestStarted(c));
  const scheduledUpcomingContests = upcomingContests.filter((c) => !isContestStarted(c));

  const computeDemoStats = (): UserPerformanceStats => {
    const all = Object.values(participations);
    const completed = all.filter((p) => p.finalRank != null);
    const wins = completed.filter((p) => p.finalRank === 1).length;
    const placements = completed.filter((p) => p.finalRank != null && (p.finalRank as number) <= 3).length;
    const cashed = completed.filter((p) => (p.payout || 0) > 0).length;
    const totalWinnings = completed.reduce((s, p) => s + (p.payout || 0), 0);
    const ranks = completed.map((p) => p.finalRank as number);
    const sortedCompleted = [...completed].sort((a, b) => b.contestId - a.contestId);
    let pitStreak = 0;
    for (const p of sortedCompleted) {
      if (p.finalRank != null && p.finalRank <= 3) pitStreak++;
      else break;
    }
    return {
      contestsEntered: all.length,
      contestsCompleted: completed.length,
      wins,
      placements,
      cashed,
      winRate: completed.length ? Math.round((wins / completed.length) * 1000) / 10 : 0,
      totalWinnings,
      totalEntryFees: 0,
      netProfit: totalWinnings,
      avgFinishRank: ranks.length ? Math.round((ranks.reduce((a, b) => a + b, 0) / ranks.length) * 10) / 10 : null,
      bestFinishRank: ranks.length ? Math.min(...ranks) : null,
      pitStreak,
    };
  };

  const effectiveStats = userStats || (completedBattles.length || activeBattles.length ? computeDemoStats() : null);

  // ==================== CORE ACTIONS ====================
  const joinArena = async (contestId: number) => {
    const contest = contests.find((c) => c.id === contestId);
    if (!contest) return;
    if (joinedContests.includes(contestId)) return;
    if (!isJoinAllowed(contest)) {
      showToast(
        isContestBellOpen(contest)
          ? 'Join cutoff — pit closes in under 5 minutes'
          : 'This pit has closed',
        'error'
      );
      return;
    }

    if (isSupabaseConfigured && !isLoggedIn) {
      showToast('Sign in to join live multiplayer contests', 'error');
      setActiveTab('account');
      return;
    }

    if (usingServerGame) {
      try {
        const { newBalance } = await joinContestApi(contestId);
        setUserBalance(newBalance);
        if (profile) setProfile({ ...profile, balance: newBalance });
        await syncGameFromServer();
        await refreshLeaderboard(contestId);
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setHistory((h) => [{ time: now, action: `Joined ${contest.title} (-$${contest.entryFee})` }, ...h].slice(0, 12));
        setJoinFlashTitle(contest.title);
        const fresh = contests.find((c) => c.id === contestId) ?? contest;
        if (isContestTradingOpen(fresh)) {
          setTimeout(() => setTradingContestId(contestId), 900);
        } else {
          showToast('Rang in! Trading opens when the pit bell starts.');
        }
        await loadTradeLimit(contestId);
      } catch (err: any) {
        showToast(err.message || 'Failed to join contest', 'error');
      }
      return;
    }

    const currentBalance = effectiveBalance;
    if (contest.status !== 'open' || currentBalance < contest.entryFee) {
      showToast('Insufficient balance to enter the pit.', 'error');
      return;
    }

    const newBalance = currentBalance - contest.entryFee;
    const newPart: Participation = {
      contestId,
      cash: contest.startingPortfolioValue,
      positions: [],
      startingValue: contest.startingPortfolioValue,
    };

    setUserBalance(newBalance);
    setParticipations({ ...participations, [contestId]: newPart });
    setContests(
      contests.map((c) =>
        c.id === contestId ? { ...c, entries: c.entries + 1, status: 'active' as const } : c
      )
    );

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setHistory((h) => [{ time: now, action: `Joined ${contest.title} (-$${contest.entryFee})` }, ...h].slice(0, 12));
    setJoinFlashTitle(contest.title);
    if (isContestTradingOpen(contest)) {
      setTimeout(() => setTradingContestId(contestId), 900);
    } else {
      showToast('Rang in! Trading opens when the pit bell starts.');
    }
    loadTradeLimit(contestId);
  };

  const openTradeModal = (contestId: number) => {
    const contest = contests.find(c => c.id === contestId);
    if (contest && !isContestBellOpen(contest)) {
      showToast('Bell has rung — trading is closed', 'error');
      return;
    }
    if (contest && !isContestTradingOpen(contest)) {
      showToast('Pit opens soon — you\'re rang in. Trading starts when the bell opens.', 'error');
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

  const openChart = (symbol: string, contestId: number) => {
    setChartContestId(contestId);
    setSelectedChartSymbol(symbol);
  };

  const closeChart = () => {
    setSelectedChartSymbol('');
    setChartContestId(null);
  };

  const openLeaderboard = (contestId: number) => {
    setVaultContestId(contestId);
    setVaultMode('pit');
    refreshLeaderboard(contestId);
    setActiveTab('leaderboard');
  };

  const handleHomePitPress = (contest: Contest) => {
    if (joinedContests.includes(contest.id)) {
      if (isContestTradingOpen(contest)) openTradeModal(contest.id);
      else {
        setActiveTab('entries');
        setBattlesSegment('active');
      }
    } else {
      joinArena(contest.id);
    }
  };

  const executeTrade = async () => {
    if (!tradingContestId) return;
    let sharesNum = parseFloat(tradeShares);
    if (!tradeSymbol || isNaN(sharesNum) || sharesNum <= 0) return;

    const p = participations[tradingContestId];
    if (!p) return;

    const contest = contests.find((c) => c.id === tradingContestId);
    if (contest && !isContestBellOpen(contest)) {
      showToast('Bell has rung — trading is closed', 'error');
      return;
    }
    if (contest && !isContestTradingOpen(contest)) {
      showToast('Pit hasn\'t opened yet — wait for the scheduled bell', 'error');
      return;
    }

    const freshPrices = await fetchLivePrices([tradeSymbol]);
    const lockedPrice = freshPrices[tradeSymbol] ?? prices[tradeSymbol];
    if (!lockedPrice) {
      showToast('No live price for this symbol', 'error');
      return;
    }

    if (tradeSide === 'buy') {
      sharesNum = affordableBuyShares(p.cash, lockedPrice, tradeSymbol, sharesNum);
      if (sharesNum <= 0) {
        showToast('Not enough cash for this order', 'error');
        return;
      }
      setTradeShares(formatShareInput(sharesNum, tradeSymbol));
    }

    if (contest) {
      const hoursCheck = isSymbolTradableNow(contest, tradeSymbol);
      if (!hoursCheck.ok) {
        showToast(hoursCheck.message || 'Market closed for this symbol', 'error');
        return;
      }
    }

    const contestForLimit = contests.find((c) => c.id === tradingContestId);
    const usedTrades = usingServerGame
      ? (tradeLimitByContest[tradingContestId]?.used ?? 0)
      : (demoTradeCounts[tradingContestId] ?? 0);
    const limitCheck = canPlaceTrade(usedTrades, contestForLimit?.slug);
    if (!limitCheck.ok) {
      showToast(limitCheck.message || 'Trade limit reached', 'error');
      return;
    }

    if (usingServerGame) {
      try {
        const rankBefore = rankInContest(tradingContestId) || dynamicVault.find((e) => e.isYou)?.rank || 99;
        const updated = await executeTradeApi({
          contestId: tradingContestId,
          symbol: tradeSymbol,
          side: tradeSide,
          shares: sharesNum,
          lockedPrice,
        });
        setParticipations({
          ...participations,
          [tradingContestId]: {
            contestId: tradingContestId,
            cash: updated.cash,
            positions: updated.positions,
            startingValue: updated.startingValue,
          },
        });
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setHistory((h) => [
          { time: now, action: `${tradeSide.toUpperCase()} ${sharesNum} ${tradeSymbol} @ $${updated.executedPrice}`, amount: undefined },
          ...h,
        ].slice(0, 12));
        if (updated.tradeLimit) {
          setTradeLimitByContest((prev) => ({ ...prev, [tradingContestId]: updated.tradeLimit! }));
        }
        await refreshLeaderboard(tradingContestId);
        const boardAfter = getContestBoard(tradingContestId);
        showRankTradeToast({
          rankBefore: updated.rankBefore,
          rank: updated.rank,
          rankDelta: updated.rankDelta,
          portfolioValue: updated.portfolioValue,
          tradersBehind: updated.tradersBehind,
          side: tradeSide,
          symbol: tradeSymbol,
          shares: sharesNum,
          executedPrice: updated.executedPrice,
          tradeLimit: updated.tradeLimit,
          board: boardAfter,
        });
        await loadPitFeed(tradingContestId);
        celebrateOpeningBellStreak(contestForLimit);
        closeTradeModal();
      } catch (err: any) {
        showToast(err.message || 'Trade failed', 'error');
      }
      return;
    }

    const price = lockedPrice;

    let newCash = p.cash;
    let newPos = [...p.positions];
    const cost = sharesNum * price;
    const actionText = `${tradeSide.toUpperCase()} ${sharesNum} ${tradeSymbol} @ $${price}`;

    if (tradeSide === 'buy') {
      if (newCash < cost) {
        showToast('Not enough cash for this trade.', 'error');
        return;
      }
      newCash -= cost;
      const idx = newPos.findIndex((x) => x.symbol === tradeSymbol);
      if (idx >= 0) {
        const old = newPos[idx];
        const totShares = old.shares + sharesNum;
        newPos[idx] = {
          symbol: tradeSymbol,
          shares: totShares,
          avgPrice: (old.shares * old.avgPrice + cost) / totShares,
        };
      } else {
        newPos.push({ symbol: tradeSymbol, shares: sharesNum, avgPrice: price });
      }
    } else {
      const idx = newPos.findIndex((x) => x.symbol === tradeSymbol);
      if (idx < 0 || newPos[idx].shares < sharesNum) {
        showToast('Not enough shares to sell.', 'error');
        return;
      }
      newCash += cost;
      newPos[idx].shares -= sharesNum;
      if (newPos[idx].shares < 0.0001) newPos.splice(idx, 1);
    }

    const rankBefore = rankInContest(tradingContestId) || 1;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setHistory((h) => [{ time: now, action: actionText, amount: tradeSide === 'buy' ? -cost : cost }, ...h].slice(0, 12));
    const newPart = { ...p, cash: Math.round(newCash), positions: newPos };
    setParticipations({
      ...participations,
      [tradingContestId]: newPart,
    });
    const newVal = getPortfolioValue(newPart);
    const board = getContestBoard(tradingContestId);
    const youId = user?.id || 'you';
    const rankAfter = estimateRankAfterTrade(board, youId, newVal);
    const tradersBehind = board.filter((e) => !e.isYou && e.portfolioValue < newVal).length;
    pushLocalFeedItem(tradingContestId, {
      id: `local-${Date.now()}`,
      userId: youId,
      username: pitDisplayName,
      side: tradeSide,
      symbol: tradeSymbol,
      shares: sharesNum,
      price,
      total: cost,
      createdAt: new Date().toISOString(),
      isYou: true,
    });
    const nextUsed = (demoTradeCounts[tradingContestId] ?? 0) + 1;
    setDemoTradeCounts((prev) => ({ ...prev, [tradingContestId]: nextUsed }));
    const demoLimit = buildTradeLimitInfo(nextUsed, contestForLimit?.slug);
    setTradeLimitByContest((prev) => ({ ...prev, [tradingContestId]: demoLimit }));

    const updatedBoard = board
      .map((e) => (e.isYou ? { ...e, portfolioValue: newVal } : e))
      .sort((a, b) => b.portfolioValue - a.portfolioValue)
      .map((e, i) => ({ ...e, rank: i + 1 }));

    showRankTradeToast({
      rankBefore,
      rank: rankAfter,
      rankDelta: rankBefore - rankAfter,
      portfolioValue: newVal,
      tradersBehind,
      side: tradeSide,
      symbol: tradeSymbol,
      shares: sharesNum,
      executedPrice: price,
      tradeLimit: demoLimit,
      board: updatedBoard,
    });
    celebrateOpeningBellStreak(contestForLimit);
    closeTradeModal();
  };

  // Fetch real market prices (Polygon preferred if key set, else CoinGecko + Yahoo)
  // This is how real apps like SwapRoyale get live prices for virtual portfolios
  const fetchLivePrices = async (symbolsToFetch?: string[]) => {
    const symbols = symbolsToFetch || getAllSymbols();
    if (symbols.length === 0) return prices;

    try {
      const res = await fetch(`/api/prices?symbols=${symbols.join(',')}`);
      if (!res.ok) throw new Error('price api failed');
      const fresh: MarketPrices = await res.json();

      const updated = { ...prices, ...fresh };
      setPrices(updated);
      setLastPriceUpdate(new Date());
      // Subtle toast only if significant time passed
      if (!lastPriceUpdate || Date.now() - lastPriceUpdate.getTime() > 30000) {
        showToast('Live market prices updated');
      }
      return updated;
    } catch (err) {
      console.warn('Live price fetch failed', err);
      showToast('Could not fetch live prices (using cached)', 'error');
      return prices;
    }
  };

  // Optional: force a price refresh right after trading
  const afterTradeRefresh = () => {
    setTimeout(() => fetchLivePrices(), 800);
  };

  function getAllSymbols(): string[] {
    const set = new Set<string>();
    contests.forEach(c => c.assets.forEach(a => set.add(a)));
    return Array.from(set);
  }

  // Test-only: bump prices on top of real (for demo without waiting for markets)
  const simulateMarket = (intensity = 1) => {
    const next: MarketPrices = { ...prices };
    Object.keys(next).forEach(sym => {
      const delta = (Math.random() - 0.47) * (0.018 * intensity);
      next[sym] = Math.max(0.01, +(next[sym] * (1 + delta)).toFixed(sym === 'DOGE' ? 5 : 2));
    });
    setPrices(next);
    showToast('Test market bump applied (real data preferred)');
  };

  const advanceTime = () => {
    setContests(prev => prev.map(c => {
      if (c.status !== 'open' && c.status !== 'active') return c;
      const parts = c.timeLeft.replace('CLOSED SOON', '0h 0m').split('h');
      const h = parseInt(parts[0]) || 0;
      const m = parseInt(parts[1]) || 0;
      let nh = Math.max(0, h - 1);
      let nm = Math.max(0, m - 40);
      let newTime = nh > 0 ? `${nh}h ${nm}m` : `${nm}m`;
      if (nh === 0 && nm === 0) newTime = 'CLOSED SOON';
      return { ...c, timeLeft: newTime };
    }));
    fetchLivePrices(); // pull real update when time advances
    showToast('Time advanced');
  };

  const settleContest = async (contestId: number) => {
    const c = contests.find((x) => x.id === contestId);
    const p = participations[contestId];
    if (!c || !p) return;

    if (usingServerGame) {
      try {
        const result = await settleContestApi(contestId);
        const finalValue = getPortfolioValue(p);
        setUserBalance(result.newBalance);
        if (profile) setProfile({ ...profile, balance: result.newBalance });
        await syncGameFromServer();
        loadProfileExtras();
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setHistory((h) => [
          { time: now, action: `Settled ${c.title} (#${result.rank})`, amount: result.payout },
          ...h,
        ].slice(0, 12));
        markSettlementSeen(contestId);
        serverSettledShownRef.current.add(contestId);
        if (c.slug === OPENING_BELL_SLUG) celebrateOpeningBellStreak(c);
        setSettlementResult({
          contestId,
          contestSlug: c.slug,
          rank: result.rank,
          payout: result.payout,
          refund: result.refund,
          voided: result.voided,
          contestTitle: c.title,
          portfolioValue: finalValue,
          startingValue: p.startingValue,
          settlementPrices: result.settlementPrices,
        });
        if (result.voided) {
          showToast(
            result.refund > 0
              ? `Pit didn't fill — $${result.refund} entry refunded`
              : `Pit didn't fill — no prize pool this bell`
          );
        } else {
          showToast(`Pit closed! Rank #${result.rank} • +$${result.payout} added to balance`);
        }
      } catch (err: any) {
        showToast(err.message || 'Settlement failed', 'error');
      }
      return;
    }

    const participantCount = getLiveParticipantCount(contestId);
    const rules = getContestRules(c);
    const finalValue = getPortfolioValue(p);

    if (participantCount < rules.minEntries) {
      const refund = c.entryFee;
      const newBal = userBalance + refund;
      setUserBalance(newBal);
      setContests(contests.map((x) => (x.id === contestId ? { ...x, status: 'closed' as const } : x)));
      setParticipations((prev) => ({
        ...prev,
        [contestId]: {
          ...prev[contestId],
          finalRank: undefined,
          finalValue,
          payout: 0,
        },
      }));
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setHistory((h) => [
        { time: now, action: `Voided ${c.title} (min ${rules.minEntries} traders)`, amount: refund },
        ...h,
      ].slice(0, 12));
      markSettlementSeen(contestId);
      autoSettledIdsRef.current.add(contestId);
      setSettlementResult({
        contestId,
        contestSlug: c.slug,
        rank: 0,
        payout: 0,
        refund,
        voided: true,
        contestTitle: c.title,
        portfolioValue: finalValue,
        startingValue: p.startingValue,
      });
      showToast(
        refund > 0
          ? `Pit didn't fill — $${refund} entry refunded`
          : `Pit didn't fill — invite friends next time`
      );
      return;
    }

    const rank = dynamicVault.findIndex((v) => v.isYou) + 1 || 5;
    const payout = payoutForContestRank(rank, c.slug);

    const newBal = userBalance + payout;
    setUserBalance(newBal);
    setContests(contests.map((x) => (x.id === contestId ? { ...x, status: 'closed' as const } : x)));
    setParticipations((prev) => ({
      ...prev,
      [contestId]: {
        ...prev[contestId],
        finalRank: rank,
        finalValue,
        payout,
      },
    }));

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setHistory((h) => [{ time: now, action: `Settled ${c.title} (#${rank})`, amount: payout }, ...h].slice(0, 12));
    if (c.slug === OPENING_BELL_SLUG) celebrateOpeningBellStreak(c);
    setSettlementResult({
      contestId,
      contestSlug: c.slug,
      rank,
      payout,
      contestTitle: c.title,
      portfolioValue: finalValue,
      startingValue: p.startingValue,
      settlementPrices: { ...prices },
    });
    showToast(`Pit closed! Rank #${rank} • +$${payout} added to balance`);
  };

  // Demo mode: auto-settle when bell expires
  useEffect(() => {
    if (usingServerGame) return;
    void bellTick;

    Object.values(participations).forEach((p) => {
      const c = contests.find((cc) => cc.id === p.contestId);
      if (!c || c.status === 'closed' || p.finalRank != null) return;
      if (autoSettledIdsRef.current.has(p.contestId)) return;

      const expired = c.endsAt
        ? bellMsRemaining(c) !== null && bellMsRemaining(c)! <= 0
        : c.timeLeft === 'CLOSED SOON';

      if (expired) {
        autoSettledIdsRef.current.add(p.contestId);
        settleContest(p.contestId);
      }
    });
  }, [bellTick, usingServerGame, participations, contests]);

  // Demo: activate scheduled pits when starts_at passes
  useEffect(() => {
    void bellTick;
    setContests((prev) =>
      prev.map((c) => {
        if (c.status === 'open' && c.startsAt && isContestStarted(c)) {
          return { ...c, status: 'active' as const };
        }
        return c;
      })
    );
  }, [bellTick]);

  const resetDemo = () => {
    localStorage.removeItem('tradr-state');
    window.location.reload();
  };

  // ==================== AUTH FUNCTIONS (Supabase foundation) ====================
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

      if (!res.ok) {
        throw new Error(data.error || 'Auth failed');
      }

      if (data.session && supabase) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        if (sessionError) throw sessionError;
      }

      if (isSigningUp) {
        localStorage.removeItem('tradr_ref');
        showToast(
          data.needsEmailConfirmation
            ? 'Account created! Check your email to confirm, then sign in.'
            : referralCode
              ? 'Welcome to the Pit! Referral bonus applied.'
              : 'Account created — enter the Pit!'
        );
      } else {
        showToast('Logged in successfully');
      }

      setEmail('');
      setPassword('');
    } catch (err: any) {
      showToast(err?.message || 'Auth error', 'error');
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    showToast('Logged out');
    // For demo, keep local data
  };

  const deposit = async (amount: number) => {
    if (stripeEnabled && usingServerGame) {
      setDepositLoading(true);
      try {
        const url = await createDepositCheckout(amount);
        window.location.href = url;
      } catch (err: any) {
        showToast(err.message || 'Checkout failed', 'error');
      } finally {
        setDepositLoading(false);
      }
      return;
    }

    const newBal = effectiveBalance + amount;
    setUserBalance(newBal);
    if (isLoggedIn && profile) setProfile({ ...profile, balance: newBal });

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setHistory(h => [{ time: now, action: `Deposit (dev)`, amount }, ...h].slice(0, 12));

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
      } catch (e) {
        console.log('Supabase write skipped - run the schema first');
      }
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem('tradr_pit_onboarded', '1');
    setShowOnboarding(false);
  };

  const openingBellContest = canonicalOpeningBell;

  // For logged in users: seed a demo participation to their Supabase account (polish + test)
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
          { symbol: 'NVDA', shares: 280, avgPrice: 128 }
        ],
        starting_value: first.startingPortfolioValue
      });
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'entry_fee',
        amount: -first.entryFee,
        description: `Demo entry for ${first.title}`,
        contest_id: first.id
      });
      // Reload data
      await loadUserData(user.id);
      showToast('Demo participation seeded to your Supabase account!');
    } catch (e) {
      showToast('Seed failed - check schema', 'error');
    }
  };

  const loadUserData = async (_userId: string) => {
    if (!supabase) return;
    try {
      const state = await refreshGameState();
      setContests(state.contests.length ? state.contests : contests);
      setParticipations(state.participations);
      if (state.profileBalance != null) {
        setUserBalance(state.profileBalance);
      }
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (token) {
          const meRes = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } });
          if (meRes.ok) {
            const me = await meRes.json();
            setProfile({
              id: me.id,
              username: me.username,
              balance: me.balance,
              created_at: me.created_at || new Date().toISOString(),
              referral_code: me.referral_code,
            });
          }
        }
      } catch {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', _userId).single();
        if (prof) setProfile(prof as Profile);
      }
      const joinedIds = Object.keys(state.participations).map(Number);
      joinedIds.forEach((id) => refreshLeaderboard(id));
      const freePitId = findOpeningBellContest(state.contests)?.id;
      if (freePitId) refreshLeaderboard(freePitId);
    } catch (err) {
      console.log('Supabase load skipped (demo mode or tables not ready)');
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
            {floorLivePitCount > 0 && (
              <div className="pit-chrome-status">
                <span className="pit-chrome-orb" aria-hidden />
                {floorLivePitCount} live · ${floorPrizePool.toLocaleString()} in prizes
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="font-mono text-sm font-semibold tabular-nums text-accent">
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
      ) : (
        <div className="px-5 pt-6 pb-4 flex items-center justify-between border-b border-[#1A1A1A]">
          <div className="flex items-baseline gap-1.5">
            <div className="font-black text-4xl tracking-[-3.5px] text-white">TRADR</div>
            <div className="text-[10px] font-mono tracking-[3px] text-accent mt-1.5">PIT</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-muted">Balance</div>
              <div className="font-mono text-lg font-semibold tabular-nums tracking-tight text-accent">
                ${effectiveBalance.toFixed(2)}
              </div>
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
              className="w-9 h-9 rounded-full bg-surface border border-card flex items-center justify-center active:bg-overlay overflow-hidden"
            >
              {user ? (
                <div className="text-[10px] font-mono bg-accent text-black w-full h-full flex items-center justify-center">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </div>
              ) : (
                <User size={17} />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 pb-28 overflow-y-auto ${activeTab === 'home' ? 'px-4 pt-1 arena-scroll' : 'px-5 pt-5'}`}>
        
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
            onCopyReferralLink={copyReferralLink}
            onShareReferralLink={shareReferralLink}
            referralCopied={referralCopied}
          />
        )}

        {/* MY BATTLES TAB — Active / Upcoming / Completed */}
        {activeTab === 'entries' && (
          <div className="pt-2 tab-content-enter">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="uppercase tracking-[2px] text-xs text-secondary">YOUR CONTEST HISTORY</div>
                <div className="text-3xl font-black tracking-[-1.5px]">MY BATTLES</div>
              </div>
              <BattlesTourHelpButton onClick={() => { setBattlesSegment('active'); setBattlesTourStep(0); setShowBattlesTour(true); }} />
            </div>

            <div data-tour="tabs">
              <SegmentedControl
                className="mb-5"
                value={battlesSegment}
                onChange={setBattlesSegment}
                options={[
                  { id: 'active', label: 'ACTIVE', count: activeBattles.length },
                  { id: 'upcoming', label: 'UPCOMING', count: scheduledBattles.length + upcomingContests.length },
                  { id: 'completed', label: 'DONE', count: completedBattles.length },
                ]}
              />
            </div>

            {battlesSegment === 'active' && activeBattles.length === 0 && (
              <EmptyActiveBattles
                freePit={openingBellContest}
                onJoinFree={() => {
                  if (openingBellContest) joinArena(openingBellContest.id);
                }}
                onBrowseUpcoming={() => setBattlesSegment('upcoming')}
              />
            )}

            {battlesSegment === 'upcoming' && scheduledBattles.length === 0 && upcomingContests.length === 0 && (
              <div className="text-center py-12 text-muted border border-dashed border-card rounded-2xl">
                Nothing on deck.<br />Check the Arena for scheduled pits.
              </div>
            )}

            {battlesSegment === 'upcoming' && scheduledBattles.length > 0 && (
              <div className="text-[10px] tracking-widest text-muted mb-2">YOUR RING-INS — OPENS SOON</div>
            )}
            {battlesSegment === 'upcoming' && scheduledBattles.map((p) => {
              const c = contests.find((cc) => cc.id === p.contestId)!;
              return (
                <div key={p.contestId} className="arena-card arena-card-joined p-5 mb-4 border border-accent/20">
                  <div className="flex justify-between mb-2">
                    <div>
                      <div className="font-bold text-xl">{c.title}</div>
                      <div className="text-xs text-muted mt-1 flex items-center gap-2 flex-wrap">
                        <ScheduledPitChip contest={c} tick={bellTick} />
                        <span>• ${p.cash.toLocaleString()} cash ready</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <PitMoneyDisplay
                        slug={c.slug}
                        totalPrizes={c.totalPrizes}
                        entryFee={c.entryFee}
                        variant="stacked"
                        showHook={false}
                      />
                    </div>
                  </div>
                  <PitFillBadge contest={c} participantCount={getLiveParticipantCount(c.id)} />
                  <div className="text-xs text-muted py-2">
                    You&apos;re rang in. Tape goes live when the pit opens — no trades until then.
                  </div>
                </div>
              );
            })}

            {battlesSegment === 'completed' && completedBattles.length === 0 && (
              <div className="text-center py-12 text-muted border border-dashed border-card rounded-2xl">
                No completed battles yet.<br />Finish a contest to see your results here.
              </div>
            )}

            {battlesSegment === 'upcoming' && scheduledUpcomingContests.length > 0 && (
              <div className="text-[10px] tracking-widest text-muted mb-2 mt-4">SCHEDULED ARENAS</div>
            )}
            {battlesSegment === 'upcoming' && scheduledUpcomingContests.map((c) => (
              <div key={c.id} className="arena-card p-5 mb-4 border border-dashed border-accent/25">
                <div className="flex justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-bold text-xl">{c.title}</div>
                      {c.badge && <span className="text-[9px] px-1.5 py-0.5 bg-pill rounded font-bold">{c.badge}</span>}
                      <ScheduledPitChip contest={c} tick={bellTick} />
                    </div>
                    {c.tagline && <div className="text-[11px] text-secondary mt-0.5">{c.tagline}</div>}
                    <div className="text-xs text-muted flex items-center gap-2 mt-0.5">
                      <span>{c.entryFee === 0 ? 'FREE' : `$${c.entryFee} entry`}</span>
                      {c.startsAt && (
                        <span className="font-mono">
                          {new Date(c.startsAt).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <PitMoneyDisplay
                      slug={c.slug}
                      totalPrizes={c.totalPrizes}
                      entryFee={c.entryFee}
                      variant="stacked"
                      showHook={false}
                    />
                  </div>
                </div>
                <PitFillBadge contest={c} participantCount={getLiveParticipantCount(c.id)} />
                <button onClick={() => joinArena(c.id)} className="btn btn-primary w-full py-3 text-sm mt-3">RING IN EARLY</button>
              </div>
            ))}

            {battlesSegment === 'upcoming' && liveUpcomingContests.length > 0 && (
              <div className="text-[10px] tracking-widest text-muted mb-2 mt-4">LIVE NOW</div>
            )}
            {battlesSegment === 'upcoming' && liveUpcomingContests.map((c) => (
              <div key={c.id} className="arena-card p-5 mb-4">
                <div className="flex justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-xl">{c.title}</div>
                        {c.badge && <span className="text-[9px] px-1.5 py-0.5 bg-pill rounded font-bold">{c.badge}</span>}
                      </div>
                      {c.tagline && <div className="text-[11px] text-secondary mt-0.5">{c.tagline}</div>}
                      <div className="text-xs text-muted flex items-center gap-2 mt-0.5">
                        <Clock size={10} /> {c.endsAt ? <TimeLeftLabel endsAt={c.endsAt} status={c.status} tick={bellTick} /> : c.timeLeft}
                        <span>• {c.entryFee === 0 ? 'FREE' : `$${c.entryFee} entry`}</span>
                      </div>
                    </div>
                  <div className="text-right shrink-0">
                    <PitMoneyDisplay
                      slug={c.slug}
                      totalPrizes={c.totalPrizes}
                      entryFee={c.entryFee}
                      variant="stacked"
                      showHook={false}
                    />
                  </div>
                </div>
                <div className="progress h-1 mb-4">
                  <div className="progress-fill" style={{ width: `${entryFillPct(c)}%` }} />
                </div>
                <button onClick={() => joinArena(c.id)} className="btn btn-primary w-full py-3 text-sm">ENTER PIT</button>
              </div>
            ))}

            {battlesSegment === 'completed' && completedBattles.map((p) => {
              const c = contests.find((cc) => cc.id === p.contestId)!;
              return (
                <div key={p.contestId} className="arena-card p-5 mb-4 opacity-90">
                  <div className="flex justify-between mb-3">
                    <div>
                      <div className="font-bold text-xl">{c?.title || `Contest ${p.contestId}`}</div>
                      <div className="text-xs text-muted">ENDED • {c?.date}</div>
                    </div>
                    <div className="text-right">
                      <div className="rank-badge font-mono text-3xl font-black text-accent">#{p.finalRank || '—'}</div>
                      {(p.payout || 0) > 0 ? (
                        <div className="text-sm font-mono text-accent font-bold">+${p.payout}</div>
                      ) : p.finalRank ? (
                        <PitProjectedPayout slug={c?.slug} rank={p.finalRank} className="text-xs" />
                      ) : null}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-muted">Final value</span>
                    <span className="font-mono text-accent">${(p.finalValue || getPortfolioValue(p)).toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => openContestRecap(p.contestId)}
                    className="w-full py-2.5 text-sm border border-accent/40 text-accent rounded-xl"
                  >
                    READ THE TAPE →
                  </button>
                </div>
              );
            })}

            {battlesSegment === 'active' && activeBattles.map((p) => {
              const c = contests.find(cc => cc.id === p.contestId)!;
              const liveVal = getPortfolioValue(p);
              const pnl = liveVal - p.startingValue;
              const pnlPct = ((liveVal / p.startingValue) - 1) * 100;
              const battleRank = rankInContest(p.contestId);
              const battleBoard = getContestBoard(p.contestId);

              return (
                <div key={p.contestId} className="arena-card arena-card-joined p-5 mb-4" data-tour="overview">
                  <div className="flex justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-bold text-xl tracking-tight">{c.title}</div>
                        {battleRank && (
                          <span className="rank-badge text-[10px] px-2 py-0.5 bg-pill rounded-full font-bold flex items-center gap-1">
                            <Trophy size={10} /> #{battleRank}
                          </span>
                        )}
                        {battleRank && (
                          <PitProjectedPayout slug={c.slug} rank={battleRank} />
                        )}
                        <button
                          type="button"
                          data-tour="contest-info"
                          onClick={() => setInfoContestId(c.id)}
                          className="w-6 h-6 rounded-full border border-card flex items-center justify-center text-muted hover:text-accent"
                          aria-label="Contest info"
                        >
                          <Info size={12} />
                        </button>
                      </div>
                      <div className="text-xs text-muted flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent live-dot" />
                          {c.status.toUpperCase()}
                        </span>
                        <span>•</span>
                        <Clock size={10} />
                        {c.endsAt ? <TimeLeftLabel endsAt={c.endsAt} status={c.status} tick={bellTick} /> : c.timeLeft}
                      </div>
                    </div>
                    <div className="arena-live-stats">
                      <div className="arena-live-value font-mono text-2xl text-accent tabular-nums">
                        ${liveVal.toLocaleString()}
                      </div>
                      <div className={`arena-live-pnl text-xs font-mono ${pnl >= 0 ? 'text-accent' : 'text-red'}`}>
                        {pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toLocaleString()} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
                      </div>
                    </div>
                  </div>

                  <PitFillBadge contest={c} participantCount={getLiveParticipantCount(c.id)} />

                  <div data-tour="money-zone">
                    <MoneyZoneBar
                      entries={battleBoard}
                      yourValue={liveVal}
                      slug={c.slug}
                      hero
                    />
                  </div>

                  <PitRulesStrip
                    contest={c}
                    bellTick={bellTick}
                    tradeLimit={tradeLimitByContest[p.contestId]}
                  />

                  <div className="mb-3" data-tour="stats">
                    <div className="flex justify-between text-[10px] text-muted mb-1">
                      <span>Portfolio vs $100k start</span>
                      <span className={pnl >= 0 ? 'text-accent' : 'text-red'}>{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%</span>
                    </div>
                    <div className="progress h-1.5">
                      <div
                        className="progress-fill progress-fill--instant"
                        style={{ width: `${Math.min(100, Math.max(5, 50 + pnlPct * 2))}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-xs mb-3 text-muted">CASH: ${p.cash.toLocaleString()} &nbsp;•&nbsp; POSITIONS: {p.positions.length}</div>

                  {p.positions.length > 0 && (
                    <div className="bg-surface border border-card text-xs p-2 mb-3 rounded">
                      {p.positions.map(pos => {
                        const curPrice = prices[pos.symbol] || pos.avgPrice;
                        const posVal = Math.round(pos.shares * curPrice);
                        return (
                          <div key={pos.symbol} className="flex justify-between py-0.5">
                            <span className="font-mono">{pos.symbol} × {pos.shares.toFixed(1)}</span>
                            <span>${posVal}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex gap-2" data-tour="trade">
                    <button onClick={() => openTradeModal(p.contestId)} className="btn btn-primary flex-1 py-2 text-sm">TRADE</button>
                    <button onClick={() => openLeaderboard(p.contestId)} className="flex-1 py-2 text-sm border border-accent/40 text-accent rounded-xl">LEADERBOARD</button>
                    <button onClick={() => openChart(c.assets[0], p.contestId)} className="flex-1 py-2 text-sm border border-card rounded-xl">CHART</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* THE VAULT TAB — Live Pit + Global Rankings */}
        {activeTab === 'leaderboard' && (
          <div className="pt-3 tab-content-enter">
            <div className="mb-4">
              <div className="uppercase text-xs tracking-[3px] text-secondary">PERFORMANCE RANKINGS</div>
              <div className="text-3xl font-black tracking-[-1.5px]">THE VAULT</div>
            </div>

            <SegmentedControl
              className="mb-4"
              value={vaultMode}
              onChange={setVaultMode}
              options={[
                { id: 'pit', label: 'LIVE PIT' },
                { id: 'tape', label: 'TAPE WEEK' },
                { id: 'global', label: 'GLOBAL' },
              ]}
            />

            {vaultMode === 'tape' && (
              <>
                <TapeWeekLeaderboard
                  entries={tapeLeaderboard}
                  themeLine={tapeThemeLine}
                  loading={tapeLoading}
                />
                <div className="mt-6">
                  <button
                    onClick={() => refreshTapeLeaderboard()}
                    className="w-full text-xs py-2 rounded-full border border-accent text-accent active:bg-surface"
                  >
                    REFRESH TAPE RANKINGS
                  </button>
                </div>
              </>
            )}

            {vaultMode === 'global' && (
              <>
                <div className="flex gap-2 mb-3">
                  <SegmentedControl
                    value={globalPeriod}
                    onChange={(v) => { setGlobalPeriod(v); refreshGlobalLeaderboard(v, globalMetric); }}
                    options={[
                      { id: 'all', label: 'ALL-TIME' },
                      { id: 'week', label: 'WEEKLY' },
                    ]}
                  />
                </div>
                <div className="flex gap-2 mb-4 flex-wrap">
                  {([
                    { id: 'winnings' as const, label: 'WINNINGS' },
                    { id: 'wins' as const, label: 'WINS' },
                    { id: 'win_rate' as const, label: 'WIN %' },
                  ]).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setGlobalMetric(m.id); refreshGlobalLeaderboard(globalPeriod, m.id); }}
                      className={`text-[10px] px-3 py-1.5 rounded-full border font-bold ${globalMetric === m.id ? 'border-accent text-accent bg-surface' : 'border-card text-muted'}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {globalLoading ? (
                  <div className="text-center py-12 text-muted">Loading global rankings…</div>
                ) : globalLeaderboard.length === 0 ? (
                  <div className="text-center py-12 text-muted border border-dashed border-card rounded-2xl">
                    No settled contests yet.<br />Be the first legend on the board.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {globalLeaderboard.map((entry) => (
                      <div
                        key={entry.userId}
                        className={`vault-global-row vault-row flex items-center justify-between py-3.5 px-2 rounded-lg ${entry.isYou ? 'bg-user-card ring-1 ring-accent/20' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`font-mono text-lg w-7 ${entry.rank <= 3 ? 'text-accent' : 'text-muted'}`}>#{entry.rank}</div>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${entry.isYou ? 'bg-accent text-black' : 'bg-zinc-800'}`}>
                            {entry.username.replace('@', '').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{entry.username} {entry.isYou && <span className="text-accent text-[10px]">(YOU)</span>}</div>
                            {entry.contests != null && (
                              <div className="text-[10px] text-muted">{entry.contests} battles • {entry.wins} wins</div>
                            )}
                          </div>
                        </div>
                        <div className="font-mono text-accent font-semibold">
                          {globalMetric === 'win_rate' ? `${entry.value}%` : globalMetric === 'wins' ? entry.value : `$${entry.value.toLocaleString()}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {vaultMode === 'pit' && vaultContest && (
                  <div className="text-sm text-muted mb-3 flex items-center gap-2 flex-wrap">
                    {vaultContest.title} • {vaultPlayerCount} traders
                    {vaultPlayerCount >= 2 && (
                      <span className="flex items-center gap-1 text-accent text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent live-dot" /> LIVE
                      </span>
                    )}
                    {hydrated && vaultContest.endsAt && (() => {
                      void bellTick;
                      const ms = bellMsRemaining(vaultContest);
                      if (ms == null) return null;
                      return (
                        <span className={`text-xs font-mono ${ms < 300000 ? 'text-red-400 bell-urgent' : 'text-muted'}`}>
                          <BellCountdown contest={vaultContest} tick={bellTick} />
                        </span>
                      );
                    })()}
                  </div>
            )}

            {vaultMode === 'pit' && activeVaultContestId && joinedContests.includes(activeVaultContestId) && (
              <PitFeed
                items={(pitFeedByContest[activeVaultContestId] || []).map((f) => ({
                  id: f.id,
                  username: f.username,
                  side: f.side,
                  symbol: f.symbol,
                  shares: f.shares,
                  price: f.price,
                  isYou: f.isYou,
                }))}
                contestTitle={vaultContest?.title}
                loading={pitFeedLoading}
              />
            )}

            {vaultMode === 'pit' && joinedContests.length > 1 && (
              <div className="flex gap-2 mb-4 flex-wrap">
                {joinedContests.map((id) => {
                  const c = contests.find((x) => x.id === id);
                  const active = activeVaultContestId === id;
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        setVaultContestId(id);
                        refreshLeaderboard(id);
                      }}
                      className={`text-xs px-3 py-1.5 rounded-full border ${active ? 'border-accent text-accent bg-surface' : 'border-card text-muted'}`}
                    >
                      {c?.title || `Contest ${id}`}
                    </button>
                  );
                })}
              </div>
            )}

            {vaultMode === 'pit' && vaultContest && (
              dynamicVault.length === 0 ? (
                <div className="text-center py-12 text-muted">No traders in this contest yet.</div>
              ) : (
                <PitLeaderboardPanel
                  entries={dynamicVault}
                  contest={vaultContest}
                  yourValue={dynamicVault.find((e) => e.isYou)?.portfolioValue || bestPortfolioValue}
                />
              )
            )}

            {vaultMode === 'pit' && (
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => activeVaultContestId && refreshLeaderboard(activeVaultContestId)}
                className="flex-1 text-xs py-2 rounded-full border border-accent text-accent active:bg-surface"
              >
                REFRESH RANKINGS
              </button>
              <button onClick={() => fetchLivePrices()} className="flex-1 text-xs py-2 rounded-full border border-card text-muted active:bg-surface">
                REFRESH PRICES
              </button>
            </div>
            )}
          </div>
        )}

        {/* PROFILE TAB — Identity, Performance, Invite, Activity */}
        {activeTab === 'account' && (
          <div className="pt-4 tab-content-enter profile-header-glow">
            {authLoading ? (
              <div className="text-center py-10">Loading your account...</div>
            ) : user ? (
              <>
                <div className="text-center mb-5">
                  <div className="w-20 h-20 mx-auto rounded-full bg-accent flex items-center justify-center text-[#0A0A0A] font-black text-3xl mb-3 ring-4 ring-accent/20">
                    {pitDisplayName.replace('@', '').slice(0, 2).toUpperCase()}
                  </div>
                  {editingUsername ? (
                    <div className="flex gap-2 max-w-[280px] mx-auto mb-2">
                      <input
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        placeholder="pitname"
                        className="flex-1 bg-surface border border-card px-3 py-2 rounded-xl text-center font-bold"
                      />
                      <button onClick={saveUsername} className="px-3 py-2 bg-accent text-black rounded-xl text-sm font-bold">SAVE</button>
                    </div>
                  ) : (
                    <button onClick={() => { setUsernameInput(profile?.username || ''); setEditingUsername(true); }} className="font-black text-2xl tracking-tight hover:text-accent transition-colors">
                      {pitDisplayName}
                    </button>
                  )}
                  <div className="text-xs text-muted mt-1">
                    Pit member since {profile?.created_at ? formatMemberSince(profile.created_at) : 'today'}
                  </div>
                  <div className="text-accent mt-1 text-sm flex items-center justify-center gap-2">
                    <Medal size={14} /> Vault rank #{yourRank}
                    {usingServerGame && <span className="text-[10px] text-muted">• LIVE</span>}
                  </div>
                  <button onClick={handleLogout} className="mt-2 text-xs text-red-400 hover:text-red-500">Sign out</button>
                </div>

                <SegmentedControl
                  className="mb-4"
                  value={profileSection}
                  onChange={setProfileSection}
                  options={[
                    { id: 'overview', label: 'WALLET' },
                    { id: 'performance', label: 'STATS' },
                    { id: 'invite', label: 'INVITE' },
                    { id: 'activity', label: 'LOG' },
                  ]}
                />

                {profileSection === 'overview' && (
                <div className="bg-card border border-card rounded-2xl p-4 mb-5">
                  <div className="flex justify-between py-2">
                    <span className="text-muted">Real Money Balance</span>
                    <span className="font-mono text-3xl text-accent font-semibold">${effectiveBalance.toFixed(2)}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {[25, 50, 100].map(amt => (
                      <button
                        key={amt}
                        onClick={() => deposit(amt)}
                        disabled={depositLoading}
                        className="flex-1 py-2 text-sm bg-accent text-black rounded-xl active:bg-yellow-400 disabled:opacity-50"
                      >
                        {stripeEnabled ? `Add $${amt}` : `Deposit +$${amt}`}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-center text-muted mt-2">
                    {stripeEnabled ? 'Secure checkout via Stripe' : 'Dev deposits — add STRIPE_SECRET_KEY for real payments'}
                  </p>
                  {usingServerGame && (
                    <p className="text-[9px] text-center text-accent mt-1">✓ Synced with Supabase cloud</p>
                  )}
                  <button onClick={seedDemoToAccount} className="mt-2 w-full text-xs py-1 border border-accent text-accent rounded hover:bg-surface">Seed demo participation to my real account</button>
                </div>
                )}

                {profileSection === 'performance' && (
                  <div className="mb-5">
                    {profileExtrasLoading && !effectiveStats ? (
                      <div className="text-center py-10 text-muted">Loading stats…</div>
                    ) : effectiveStats ? (
                      <>
                        <div className="stat-grid-card p-5 mb-4 text-center">
                          <div className="text-[10px] tracking-[3px] text-muted uppercase mb-1">Total Winnings</div>
                          <div className="stat-hero-value font-mono text-5xl font-black">${effectiveStats.totalWinnings.toLocaleString()}</div>
                          <div className={`text-sm mt-1 font-mono ${effectiveStats.netProfit >= 0 ? 'text-accent' : 'text-red'}`}>
                            Net {effectiveStats.netProfit >= 0 ? '+' : ''}${effectiveStats.netProfit.toLocaleString()} after fees
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          {[
                            { label: 'Entered', value: effectiveStats.contestsEntered, icon: Target },
                            { label: 'Wins', value: effectiveStats.wins, icon: Trophy },
                            { label: 'Podiums', value: effectiveStats.placements, icon: Medal },
                            { label: 'Cashed', value: effectiveStats.cashed, icon: Zap },
                          ].map((s) => {
                            const Icon = s.icon;
                            return (
                              <div key={s.label} className="stat-grid-card p-4">
                                <Icon size={14} className="text-accent mb-2" />
                                <div className="font-mono text-2xl font-bold text-accent">{s.value}</div>
                                <div className="text-[10px] text-muted tracking-widest">{s.label.toUpperCase()}</div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="stat-grid-card p-4 flex justify-between items-center">
                          <div>
                            <div className="text-[10px] text-muted tracking-widest">WIN RATE</div>
                            <div className="font-mono text-3xl font-bold text-accent">{effectiveStats.winRate}%</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-muted">AVG FINISH</div>
                            <div className="font-mono text-xl">{effectiveStats.avgFinishRank ?? '—'}</div>
                            <div className="text-[10px] text-muted mt-1">Best: #{effectiveStats.bestFinishRank ?? '—'}</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12 text-muted border border-dashed border-card rounded-2xl">
                        Enter your first battle to build your record.
                      </div>
                    )}
                  </div>
                )}

                {profileSection === 'invite' && (
                  <div className="invite-card rounded-2xl p-5 mb-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Share2 size={18} className="text-accent" />
                      <div className="font-bold text-lg">Invite to the Pit</div>
                    </div>
                    <p className="text-xs text-muted mb-4 leading-relaxed">
                      Grow the tape. Friends get <span className="text-accent">${REFERRAL_TIERS.friendSignupBonus}</span> on signup —
                      you earn on their first paid pit and ongoing entry fees.
                    </p>
                    {usingServerGame && referralStats && (
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-surface border border-card rounded-xl p-3 text-center">
                          <div className="text-2xl font-black text-accent">{referralStats.inviteCount}</div>
                          <div className="text-[10px] text-muted uppercase tracking-wide">Friends invited</div>
                        </div>
                        <div className="bg-surface border border-card rounded-xl p-3 text-center">
                          <div className="text-2xl font-black text-accent">${referralStats.referralEarnings}</div>
                          <div className="text-[10px] text-muted uppercase tracking-wide">Referral earnings</div>
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
                      {referralLink()}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={shareReferralLink} className="btn btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-2">
                        <Share2 size={16} />
                        SHARE
                      </button>
                      <button onClick={copyReferralLink} className="flex-1 py-3 text-sm border border-accent/40 text-accent rounded-xl flex items-center justify-center gap-2">
                        {referralCopied ? <Check size={16} /> : <Copy size={16} />}
                        {referralCopied ? 'COPIED' : 'COPY'}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted mt-3 text-center">
                      Live: signup bonuses + paid-entry rake-back when friends enter pits.
                    </p>
                  </div>
                )}

                {profileSection === 'activity' && (
                  <div className="bg-card border border-card rounded-2xl p-4 mb-5 max-h-[420px] overflow-y-auto">
                    <div className="uppercase tracking-widest text-muted text-[10px] mb-3">Recent Activity</div>
                    {(activities.length > 0 ? activities : history.map((h, i) => ({
                      id: `local-${i}`,
                      type: 'trade' as const,
                      title: h.action,
                      detail: '',
                      amount: h.amount,
                      createdAt: new Date().toISOString(),
                    }))).length === 0 ? (
                      <div className="text-center py-8 text-muted text-sm">No activity yet</div>
                    ) : (
                      (activities.length > 0 ? activities : history.map((h, i) => ({
                        id: `local-${i}`,
                        type: 'trade' as const,
                        title: h.action,
                        detail: '',
                        amount: h.amount,
                        createdAt: new Date().toISOString(),
                      }))).map((a) => (
                        <div key={a.id} className="flex justify-between py-2.5 border-b border-card/50 last:border-0 text-xs">
                          <div>
                            <div className="font-medium">{a.title}</div>
                            {a.detail && <div className="text-muted">{a.detail}</div>}
                          </div>
                          <div className="text-right">
                            {a.amount != null && (
                              <div className={`font-mono ${a.amount >= 0 ? 'text-accent' : 'text-red'}`}>
                                {a.amount >= 0 ? '+' : ''}${Math.round(Math.abs(a.amount))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-card border border-card rounded-2xl p-5 mb-5">
                <div className="font-bold text-lg mb-3 text-center">Sign in for real account</div>
                <div className="space-y-3">
                  <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-surface border border-card p-3 rounded-xl" />
                  <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-surface border border-card p-3 rounded-xl" />
                  <button onClick={handleAuth} className="w-full py-3 bg-accent text-black font-bold rounded-2xl">
                    {isSigningUp ? 'Create Account' : 'Sign In'}
                  </button>
                  <button onClick={() => setIsSigningUp(!isSigningUp)} className="text-xs w-full text-muted">
                    {isSigningUp ? 'Have an account? Sign in' : 'New here? Create account'}
                  </button>
                </div>
                <p className="text-[10px] text-center mt-3 text-muted">Uses real Supabase auth + database</p>
                <p className="text-[9px] text-center text-muted mt-1">Sign up and your balance + positions will persist in the cloud.</p>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => fetchLivePrices()} className="flex-1 py-3 text-sm border border-accent text-accent rounded-2xl active:bg-surface">REFRESH LIVE PRICES</button>
              <button onClick={resetDemo} className="flex-1 py-3 text-sm border border-red-900/60 text-red-400 rounded-2xl active:bg-surface">RESET DEMO</button>
            </div>
          </div>
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
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`tab-item flex flex-col items-center justify-center flex-1 py-1 ${isActive ? 'active' : 'text-muted'}`}
              >
                <div className="relative">
                  <Icon size={19} strokeWidth={isActive ? 2.6 : 2} />
                  {badge != null && <span className="tab-badge">{badge}</span>}
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
          onComplete={completeOnboarding}
          onSetUsername={async (name) => {
            await updateUsername(name);
            setProfile((prev) => (prev ? { ...prev, username: name } : prev));
          }}
          onJoinFreePit={async () => {
            if (openingBellContest && !joinedContests.includes(openingBellContest.id)) {
              await joinArena(openingBellContest.id);
            }
            completeOnboarding();
          }}
        />
      )}

      {/* CONTEST RECAP MODAL */}
      {recapData && (
        <ContestRecapModal recap={recapData} onClose={() => setRecapData(null)} />
      )}

      {/* SETTLEMENT RESULTS MODAL */}
      {settlementResult && (
        <div className="fixed inset-0 bg-black/92 z-[65] flex items-center justify-center p-5 overflow-y-auto">
          <div className={`settlement-card w-full max-w-[380px] bg-card border rounded-3xl p-6 text-center my-auto ${settlementResult.voided ? 'border-red-500/40' : settlementResult.rank === 1 ? 'border-accent/60' : 'border-accent/40'}`}>
            <div className="text-[10px] tracking-[3px] text-muted uppercase mb-3">
              {settlementResult.voided ? 'Pit Didn\'t Fill' : 'Bell Rung — Pit Closed'}
            </div>

            <SettleShareCard
              contestTitle={settlementResult.contestTitle}
              contestSlug={settlementResult.contestSlug}
              rank={settlementResult.rank}
              portfolioValue={settlementResult.portfolioValue}
              startingValue={settlementResult.startingValue}
              payout={settlementResult.payout}
              voided={settlementResult.voided}
              refund={settlementResult.refund}
            />
            {!settlementResult.voided && settlementResult.settlementPrices && Object.keys(settlementResult.settlementPrices).length > 0 && (
              <div className="bg-surface border border-card rounded-xl p-3 mb-4 text-left text-xs max-h-32 overflow-y-auto">
                <div className="text-[10px] tracking-widest text-muted mb-2">BELL SNAPSHOT — FINAL PRICES</div>
                <div className="grid grid-cols-2 gap-1 font-mono">
                  {Object.entries(settlementResult.settlementPrices).map(([sym, px]) => (
                    <div key={sym} className="flex justify-between py-0.5 border-b border-card/40">
                      <span>{sym}</span>
                      <span className="text-accent">${Number(px).toFixed(Number(px) < 10 ? 4 : 2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {!settlementResult.voided && (
                <button
                  onClick={() => {
                    const id = settlementResult.contestId;
                    dismissSettlement();
                    openContestRecap(id);
                  }}
                  className="btn btn-primary w-full py-3.5 text-sm"
                >
                  READ THE TAPE →
                </button>
              )}
              <button onClick={runItBack} className={`w-full py-3.5 text-sm rounded-xl ${settlementResult.voided ? 'btn btn-primary' : 'border border-accent/40 text-accent'}`}>
                RUN IT BACK →
              </button>
              <button
                onClick={shareSettlement}
                className="w-full py-2.5 text-sm border border-card text-muted rounded-xl flex items-center justify-center gap-2"
              >
                <Share2 size={14} /> SHARE RESULT
              </button>
              <button
                onClick={dismissSettlement}
                className="w-full py-2 text-xs text-muted"
              >
                Back to arena
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRADING MODAL - Rich & fully functional */}
      {tradingContestId && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-end">
          <div className="w-full max-w-[420px] mx-auto bg-card border-t border-accent rounded-t-3xl p-5 pb-8 max-h-[92dvh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <div className="font-bold text-xl truncate">TRADE • {contests.find(c => c.id === tradingContestId)?.title}</div>
                  {tradingContestId && (
                    <button
                      type="button"
                      onClick={() => setInfoContestId(tradingContestId)}
                      className="w-7 h-7 shrink-0 rounded-full border border-card flex items-center justify-center text-muted hover:text-accent"
                      aria-label="Contest info"
                    >
                      <Info size={13} />
                    </button>
                  )}
                </div>
                {(() => {
                  void bellTick;
                  const tc = contests.find((c) => c.id === tradingContestId);
                  if (!tc) return null;
                  const ms = hydrated ? bellMsRemaining(tc) : null;
                  const closed = hydrated && !isContestBellOpen(tc);
                  return (
                    <>
                      <div className={`text-[10px] mt-0.5 font-mono ${closed ? 'text-red-400' : ms != null && ms < 300000 ? 'text-red-400 bell-urgent' : 'text-muted'}`}>
                        {!hydrated ? '—' : closed ? '🔔 BELL RUNG — TRADING CLOSED' : (
                          <BellCountdown contest={tc} tick={bellTick} prefix="BELL IN " placeholder="PIT OPEN" openText="PIT OPEN" />
                        )}
                      </div>
                      <div className="mt-1.5">
                        <PitMoneyDisplay
                          slug={tc.slug}
                          totalPrizes={tc.totalPrizes}
                          entryFee={tc.entryFee}
                          variant="compact"
                          showSuffix={false}
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
              <button onClick={closeTradeModal} className="p-1"><X size={22} /></button>
            </div>

            {tradingContestId && participations[tradingContestId] && (() => {
              const tc = contests.find((c) => c.id === tradingContestId);
              const board = getContestBoard(tradingContestId);
              const liveVal = getPortfolioValue(participations[tradingContestId]);
              return tc ? (
                <MoneyZoneBar entries={board} yourValue={liveVal} slug={tc.slug} hero />
              ) : null;
            })()}

            {pitMoment && tradingContestId && (
              <PitMomentBanner moment={pitMoment} onDismiss={() => setPitMoment(null)} />
            )}

            {(() => {
              const tc = contests.find((c) => c.id === tradingContestId);
              return tc ? (
                <PitRulesStrip
                  contest={tc}
                  bellTick={bellTick}
                  tradeLimit={tradingContestId ? tradeLimitByContest[tradingContestId] : null}
                />
              ) : null;
            })()}

            {tradingContestId && tradeLimitByContest[tradingContestId] && !tradeLimitByContest[tradingContestId].unlimited && (
              <div className="trade-limit-hero">
                <div className="text-[10px] font-bold tracking-wide text-accent uppercase mb-2">Trades remaining</div>
                <TradeMeter info={tradeLimitByContest[tradingContestId]} />
              </div>
            )}

            {isPriceStale(lastPriceUpdate) && (
              <div className="mb-3 text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl px-3 py-2">
                Prices over 30s old — refresh before confirming.
                <button onClick={() => fetchLivePrices()} className="ml-2 text-accent underline">REFRESH</button>
              </div>
            )}

            {leaderboardByContest[tradingContestId]?.length ? (
              <BeatLeaderCard
                entries={leaderboardByContest[tradingContestId]}
                yourValue={getPortfolioValue(participations[tradingContestId])}
              />
            ) : null}

            {tradingContestId && participations[tradingContestId] && (() => {
              const tp = participations[tradingContestId];
              const liveVal = getPortfolioValue(tp);
              const pnl = liveVal - tp.startingValue;
              const pnlPct = ((liveVal / tp.startingValue) - 1) * 100;
              const tRank = rankInContest(tradingContestId);
              return (
                <div className="order-preview-strip p-3 mb-4 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] text-muted tracking-widest">PORTFOLIO</div>
                    <div className="font-mono text-xl font-bold text-accent">${liveVal.toLocaleString()}</div>
                    <div className={`text-xs font-mono ${pnl >= 0 ? 'text-accent' : 'text-red'}`}>
                      {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(2)}% ({pnl >= 0 ? '+' : ''}${pnl.toLocaleString()})
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-muted">CASH</div>
                    <div className="font-mono text-sm">${tp.cash.toLocaleString()}</div>
                    {tRank && <div className="rank-badge text-[10px] mt-1 px-2 py-0.5 bg-pill rounded-full font-bold">#{tRank}</div>}
                  </div>
                </div>
              );
            })()}

            {/* Asset price grid — tap price to trade, (i) on chip for description */}
            <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
              {(contests.find(c => c.id === tradingContestId)?.assets || []).map(sym => {
                const currentP = prices[sym];
                const pos = participations[tradingContestId]?.positions.find(pp => pp.symbol === sym);
                const posValue = pos ? Math.round(pos.shares * currentP) : 0;
                const isSelected = tradeSymbol === sym;
                return (
                  <div 
                    key={sym} 
                    onClick={() => {
                      setTradeSymbol(sym);
                      setSelectedChartSymbol(sym);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.985] ${isSelected ? 'border-accent bg-surface ring-1 ring-accent/30' : 'border-card hover:border-[#333]'} ${priceFlashes[sym] ? (priceFlashes[sym] === 'up' ? 'bg-green-900/30' : 'bg-red-900/30') : ''}`}
                  >
                    <div className="flex justify-between items-center gap-1">
                      <div onClick={(e) => e.stopPropagation()}>
                        <AssetChip symbol={sym} size="sm" />
                      </div>
                      <div className={`font-mono text-accent flex items-center gap-1 ${priceFlashes[sym] ? (priceFlashes[sym] === 'up' ? 'text-green-400' : 'text-red-400') : ''}`}>
                        ${currentP?.toFixed(currentP < 10 ? 4 : 2)}
                        {priceFlashes[sym] && <span className="text-[10px]">{priceFlashes[sym] === 'up' ? '↑' : '↓'}</span>}
                      </div>
                    </div>
                    {pos && <div className="text-[10px] text-muted mt-0.5">Hold {pos.shares.toFixed(1)} • ${posValue}</div>}
                    <div className="text-[9px] text-accent mt-1">Tap for chart →</div>
                  </div>
                );
              })}
            </div>

            {/* Inline chart — opens with trade ticket, taller than Swap */}
            {tradingContestId && (selectedChartSymbol || tradeSymbol) && (
              <div className="mb-5">
                <AssetChart
                  symbol={selectedChartSymbol || tradeSymbol}
                  currentPrice={prices[selectedChartSymbol || tradeSymbol] || 0}
                  livePrices={prices}
                  userPosition={
                    participations[tradingContestId]?.positions.find(
                      (p) => p.symbol === (selectedChartSymbol || tradeSymbol)
                    ) || null
                  }
                  tall
                  onClose={() => setSelectedChartSymbol('')}
                />
              </div>
            )}

            {leaderboardByContest[tradingContestId]?.length ? (
              <button
                type="button"
                onClick={() => openLeaderboard(tradingContestId)}
                className="w-full mb-4 py-2 text-xs border border-accent/40 text-accent rounded-xl"
              >
                FULL LEADERBOARD & MONEY LINE →
              </button>
            ) : null}

            {/* Holdings summary for current symbol */}
            {(() => {
              const pos = participations[tradingContestId]?.positions.find(p => p.symbol === tradeSymbol);
              if (!pos) return null;
              const curP = prices[tradeSymbol];
              const unreal = Math.round((curP - pos.avgPrice) * pos.shares);
              return (
                <div className="mb-3 text-xs bg-surface border border-card p-2 rounded-xl">
                  Holding: {pos.shares.toFixed(1)} @ avg ${pos.avgPrice.toFixed(2)} → Current value ${Math.round(pos.shares * curP)} 
                  <span className={unreal >= 0 ? " text-accent" : " text-red"}> ({unreal >= 0 ? '+' : ''}{unreal})</span>
                </div>
              );
            })()}

            <div className="mb-2">
              <div className="text-xs uppercase tracking-widest text-muted mb-1">SHARES</div>
              <input 
                type="number" 
                value={tradeShares} 
                onChange={e => setTradeShares(e.target.value)}
                className="w-full bg-surface border border-card text-3xl font-mono p-3 rounded-2xl text-center focus:outline-none" 
              />
            </div>

            {/* Quick amount buttons */}
            <div className="flex gap-2 mb-4">
              {[10, 25, 50, 100].map(q => (
                <button key={q} onClick={() => {
                  const pos = participations[tradingContestId]?.positions.find(p => p.symbol === tradeSymbol);
                  const price = prices[tradeSymbol] || 1;
                  if (tradeSide === 'sell' && pos) {
                    setTradeShares(sharesForPositionPercent(pos.shares, tradeSymbol, q));
                  } else {
                    const cash = participations[tradingContestId]?.cash || 0;
                    setTradeShares(sharesForCashPercent(cash, price, tradeSymbol, q));
                  }
                }} className="flex-1 py-1 text-xs border border-card rounded-lg active:bg-surface">
                  {q}%
                </button>
              ))}
            </div>

            <div className="flex gap-2 mb-5">
              <button onClick={() => setTradeSide('buy')} className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all ${tradeSide === 'buy' ? 'bg-accent text-black' : 'border border-card'}`}>
                BUY
              </button>
              <button onClick={() => setTradeSide('sell')} className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all ${tradeSide === 'sell' ? 'bg-accent text-black' : 'border border-card'}`}>
                SELL
              </button>
            </div>

            {(() => {
              const sharesNum = parseFloat(tradeShares || '0');
              const lockedPrice = prices[tradeSymbol];
              const tp = tradingContestId ? participations[tradingContestId] : null;
              let previewRank: number | null = null;
              let previewValue: number | null = null;
              let invalid = false;

              if (tp && tradeSymbol && lockedPrice && !isNaN(sharesNum) && sharesNum > 0) {
                if (tradeSide === 'buy' && tp.cash < sharesNum * lockedPrice) invalid = true;
                if (tradeSide === 'sell') {
                  const pos = tp.positions.find((x) => x.symbol === tradeSymbol);
                  if (!pos || pos.shares < sharesNum) invalid = true;
                }
                if (!invalid) {
                  previewValue = portfolioAfterTrade(
                    tp.cash,
                    tp.positions,
                    prices,
                    tradeSymbol,
                    tradeSide,
                    sharesNum,
                    lockedPrice
                  );
                  if (previewValue != null) {
                    const board = getContestBoard(tradingContestId);
                    previewRank = estimateRankAfterTrade(board, user?.id || 'you', previewValue);
                  }
                }
              }

              const curRank = tradingContestId ? rankInContest(tradingContestId) : null;

              return (
                <div className="order-preview-strip p-3 mb-4">
                  <div className="text-[10px] text-muted tracking-widest mb-1">ORDER PREVIEW</div>
                  <div className="flex justify-between items-center text-sm">
                    <span className={`font-bold ${tradeSide === 'buy' ? 'text-accent' : 'text-red'}`}>
                      {tradeSide.toUpperCase()} {tradeShares || 0} {tradeSymbol}
                    </span>
                    <span className="font-mono text-accent">
                      ${(sharesNum * (lockedPrice || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted mt-1">
                    Locked @ ${lockedPrice?.toFixed(lockedPrice < 10 ? 4 : 2)} per share
                    {hydrated && lastPriceUpdate && (
                      <span className="text-accent"> • quote {lastPriceUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    )}
                  </div>
                  {invalid && (
                    <div className="text-[10px] text-red-400 mt-2">Insufficient {tradeSide === 'buy' ? 'cash' : 'shares'} for this order</div>
                  )}
                  {!invalid && previewValue != null && previewRank != null && (
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-accent/20 text-xs">
                      <span className="text-muted">After trade</span>
                      <div className="text-right">
                        <div className="font-mono text-accent">${previewValue.toLocaleString()}</div>
                        {curRank != null && previewRank !== curRank ? (
                          <div className="font-mono text-[10px]">
                            <span className="text-muted">#{curRank}</span>
                            <span className="text-accent"> → #{previewRank}</span>
                            {previewRank < curRank && <span className="text-accent ml-1">▲</span>}
                          </div>
                        ) : (
                          <div className="font-mono text-[10px] text-muted">Hold #{previewRank}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {(() => {
              const tc = contests.find((c) => c.id === tradingContestId);
              const limit = tradingContestId ? tradeLimitByContest[tradingContestId] : null;
              const atLimit = !!(limit && !limit.unlimited && limit.remaining === 0);
              const marketClosed = tc && tradeSymbol
                ? !isSymbolTradableNow(tc, tradeSymbol).ok
                : false;
              const pitNotOpen = tc ? !isContestTradingOpen(tc) : false;
              const blocked =
                !tc ||
                !isContestBellOpen(tc) ||
                pitNotOpen ||
                !prices[tradeSymbol] ||
                atLimit ||
                marketClosed;
              return (
                <button
                  onClick={executeTrade}
                  disabled={blocked}
                  className="btn btn-primary w-full py-4 text-base disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {atLimit
                    ? 'TRADE LIMIT REACHED'
                    : pitNotOpen
                      ? 'PIT OPENS SOON'
                      : marketClosed
                        ? 'MARKET CLOSED — PICK CRYPTO'
                        : blocked && tc && !isContestBellOpen(tc)
                          ? 'BELL RUNG — PIT CLOSED'
                          : blocked && isPriceStale(lastPriceUpdate)
                            ? 'REFRESH PRICES TO TRADE'
                            : `CONFIRM ${tradeSide.toUpperCase()} ORDER`}
                </button>
              );
            })()}
          </div>
        </div>
      )}

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
