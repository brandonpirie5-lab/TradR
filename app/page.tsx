"use client";

import React, { useState, useEffect } from 'react';
import { 
  Trophy, Clock, Home, List, BarChart3, User, 
  TrendingUp, ArrowUp, ArrowDown, X, Share2, Medal, Target, Zap, Copy, Check
} from 'lucide-react';
import AssetChart from '../components/AssetChart';
import SetupBanner from '../components/SetupBanner';
import SegmentedControl from '../components/SegmentedControl';
import ContestRecapModal from '../components/ContestRecapModal';
import PitFeed from '../components/PitFeed';
import BeatLeaderCard from '../components/BeatLeaderCard';
import OnboardingPit from '../components/OnboardingPit';
import PitRulesStrip from '../components/PitRulesStrip';
import { BellCountdown, TimeLeftLabel } from '../components/BellCountdown';
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
  formatTimeLeft,
  formatMemberSince,
  displayUsername,
} from '../lib/game-types';
import { Position, getPortfolioValue as calcPortfolioValue } from '../lib/portfolio';
import {
  fetchContests,
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
  createDepositCheckout,
  type PitFeedItem,
} from '../lib/game-api';
import { buildDemoContests, isOpeningBellContest } from '../lib/pit-contests';
import {
  isContestBellOpen,
  isJoinAllowed,
  isPriceStale,
  bellMsRemaining,
  formatBellCountdown,
} from '../lib/contest-bell';
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
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'paid' | 'free'>('paid');

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

  // Settlement results modal (SwapRoyale-style payout screen)
  const [settlementResult, setSettlementResult] = useState<{
    contestId: number;
    rank: number;
    payout: number;
    contestTitle: string;
    portfolioValue: number;
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
  const [vaultMode, setVaultMode] = useState<'pit' | 'global'>('pit');
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

  const hydrated = useHydrated();
  const isLoggedIn = !!user;
  const usingServerGame = isSupabaseConfigured && isLoggedIn;
  const effectiveBalance = isLoggedIn && profile ? profile.balance : userBalance;
  const pitDisplayName = displayUsername(profile?.username, user?.email);

  const shouldUseDemoSeed = !usingServerGame;

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
  }) => {
    setLastTradeFlash({
      rankBefore: result.rankBefore,
      rankAfter: result.rank,
      portfolioValue: result.portfolioValue,
      tradersBehind: result.tradersBehind,
    });
    setTimeout(() => setLastTradeFlash(null), 4000);

    const rankText =
      result.rankDelta > 0
        ? `#${result.rankBefore} → #${result.rank} ▲${result.rankDelta}`
        : result.rankDelta < 0
          ? `#${result.rankBefore} → #${result.rank}`
          : `#${result.rank} holding`;

    showToast(
      `${result.side.toUpperCase()} ${result.shares} ${result.symbol} @ $${result.executedPrice?.toFixed(2) || '—'} • ${rankText}`
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
      const [stats, acts] = await Promise.all([
        fetchMyStats().catch(() => null),
        fetchActivity(25).catch(() => []),
      ]);
      if (stats) setUserStats(stats);
      setActivities(acts);
    } catch (e) {
      console.warn('Profile extras load failed', e);
    } finally {
      setProfileExtrasLoading(false);
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

  const copyReferralLink = () => {
    const code = profile?.referral_code || `pit${user?.id?.replace(/-/g, '').slice(0, 8) || 'demo'}`;
    const link = `${typeof window !== 'undefined' ? window.location.origin : ''}?ref=${code}`;
    navigator.clipboard.writeText(link);
    setReferralCopied(true);
    showToast('Invite link copied!');
    setTimeout(() => setReferralCopied(false), 2000);
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
            const names = result.contests.map((c) => c.title).join(', ');
            showToast(`Pit closed: ${names}`);
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
    const interval = setInterval(runAutoSettle, 60000);
    return () => clearInterval(interval);
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
          if (serverContests.length) setContests(serverContests);
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

  // Poll leaderboard for joined + vault contests
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const contestIds = [...new Set(Object.keys(participations).map(Number))];
    if (vaultContestId && !contestIds.includes(vaultContestId)) {
      contestIds.push(vaultContestId);
    }
    if (!contestIds.length) return;

    contestIds.forEach((id) => refreshLeaderboard(id));
    const interval = setInterval(() => {
      contestIds.forEach((id) => refreshLeaderboard(id));
    }, 10000);
    return () => clearInterval(interval);
  }, [participations, isSupabaseConfigured, vaultContestId, user?.id]);

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
  }, [vaultMode, globalPeriod, globalMetric, isSupabaseConfigured]);

  useEffect(() => {
    const joined = Object.keys(participations).map(Number);
    if (!joined.length) return;
    const preferred =
      joined.find((id) => {
        const c = contests.find((x) => x.id === id);
        return c && c.status !== 'closed';
      }) ?? joined[joined.length - 1];
    setVaultContestId((prev) => prev ?? preferred);
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

  const featuredContest = contests.find((c) => c.status !== 'closed') || contests[0];

  const heroContest = (() => {
    if (joinedContests.length > 0) {
      const id =
        vaultContestId ??
        joinedContests.find((cid) => {
          const c = contests.find((x) => x.id === cid);
          return c && c.status !== 'closed';
        }) ??
        joinedContests[0];
      return contests.find((c) => c.id === id) || featuredContest;
    }
    return featuredContest;
  })();

  const entryFillPct = (c: Contest) =>
    Math.min(100, Math.round((c.entries / Math.max(c.maxEntries, 1)) * 100));

  const bestPortfolioValue = Object.values(participations).length
    ? Math.max(...Object.values(participations).map(getPortfolioValue))
    : 0;

  const resolveVaultContestId = (): number | null => {
    if (vaultContestId) return vaultContestId;
    if (joinedContests.length) {
      const live = joinedContests.find((id) => {
        const c = contests.find((x) => x.id === id);
        return c && c.status !== 'closed';
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
      payout: e.rank === 1 ? (c?.firstPrize || 0) : 0,
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

  const heroRank = rankInContest(heroContest.id);

  const filteredContests = contests.filter(c => {
    if (c.status !== 'open') return false;
    if (selectedFilter === 'paid') return c.entryFee > 0;
    if (selectedFilter === 'free') return c.entryFee === 0;
    return true;
  });

  const isBattleActive = (p: Participation) => {
    const c = contests.find((cc) => cc.id === p.contestId);
    return !!c && c.status !== 'closed' && p.finalRank == null;
  };

  const activeBattles = Object.values(participations).filter(isBattleActive);
  const completedBattles = Object.values(participations).filter((p) => {
    const c = contests.find((cc) => cc.id === p.contestId);
    return c?.status === 'closed' || p.finalRank != null;
  });
  const upcomingContests = contests.filter(
    (c) => (c.status === 'open' || c.status === 'active') && !joinedContests.includes(c.id)
  );

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
        showToast(`In the pit: ${contest.title}. $100k fake money, real ego.`);
        setTimeout(() => setTradingContestId(contestId), 80);
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
    showToast(`In the pit: ${contest.title}. $100k fake money, real ego.`);
    setTimeout(() => setTradingContestId(contestId), 80);
  };

  const openTradeModal = (contestId: number) => {
    const contest = contests.find(c => c.id === contestId);
    if (contest && !isContestBellOpen(contest)) {
      showToast('Bell has rung — trading is closed', 'error');
      return;
    }
    setTradingContestId(contestId);
    setTradeSymbol(contest?.assets[0] || '');
    setTradeShares('10');
    setTradeSide('buy');
  };

  const closeTradeModal = () => {
    setTradingContestId(null);
  };

  const executeTrade = async () => {
    if (!tradingContestId) return;
    const sharesNum = parseFloat(tradeShares);
    if (!tradeSymbol || isNaN(sharesNum) || sharesNum <= 0) return;

    const p = participations[tradingContestId];
    if (!p) return;

    const contest = contests.find((c) => c.id === tradingContestId);
    if (contest && !isContestBellOpen(contest)) {
      showToast('Bell has rung — trading is closed', 'error');
      return;
    }
    if (isPriceStale(lastPriceUpdate)) {
      showToast('Prices are stale — tap REFRESH before trading', 'error');
      await fetchLivePrices([tradeSymbol]);
      return;
    }

    const lockedPrice = prices[tradeSymbol];
    if (!lockedPrice) {
      showToast('No live price for this symbol', 'error');
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
        });
        await refreshLeaderboard(tradingContestId);
        await loadPitFeed(tradingContestId);
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
    });
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
        setSettlementResult({
          contestId,
          rank: result.rank,
          payout: result.payout,
          contestTitle: c.title,
          portfolioValue: finalValue,
          settlementPrices: result.settlementPrices,
        });
        showToast(`Pit closed! Rank #${result.rank} • +$${result.payout} added to balance`);
      } catch (err: any) {
        showToast(err.message || 'Settlement failed', 'error');
      }
      return;
    }

    const rank = dynamicVault.findIndex((v) => v.isYou) + 1 || 5;
    let payout = 0;
    if (rank === 1) payout = c.firstPrize;
    else if (rank === 2) payout = Math.floor(c.firstPrize * 0.38);
    else if (rank === 3) payout = Math.floor(c.firstPrize * 0.18);

    const finalValue = getPortfolioValue(p);
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
    setSettlementResult({
      contestId,
      rank,
      payout,
      contestTitle: c.title,
      portfolioValue: finalValue,
      settlementPrices: { ...prices },
    });
    showToast(`Pit closed! Rank #${rank} • +$${payout} added to balance`);
  };

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

  const openingBellContest = contests.find(isOpeningBellContest);

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
    } catch (err) {
      console.log('Supabase load skipped (demo mode or tables not ready)');
    }
  };

  return (
    <div className="app-container mx-auto bg-background text-[var(--text)] min-h-screen flex flex-col">
      <SetupBanner />
      {/* Header - Bold new branding */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between border-b border-[#1A1A1A]">
        <div className="flex items-baseline gap-1.5">
          <div className="font-black text-4xl tracking-[-3.5px] text-white">TRADR</div>
          <div className="text-[10px] font-mono tracking-[3px] text-accent mt-1.5">PIT</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-muted flex items-center gap-1 justify-end">
              BALANCE 
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
            </div>
            <div className="font-mono text-xl font-semibold tabular-nums tracking-tighter">${effectiveBalance.toFixed(2)}</div>
            {user && (
              <div className="text-[9px] text-accent">
                {gameSyncing ? 'syncing…' : 'live multiplayer'} • {pitDisplayName}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end text-[9px] text-muted mr-1">
            <div className="flex gap-2 items-center">
              <button 
                onClick={() => fetchLivePrices()}
                className="text-accent hover:underline active:text-white text-[10px]"
              >
                REFRESH
              </button>
              {!stripeEnabled && (
                <button 
                  onClick={() => deposit(50)}
                  className="text-xs px-2 py-0.5 bg-accent text-black rounded hover:bg-accent-light"
                >
                  +$50
                </button>
              )}
            </div>
            {hydrated && lastPriceUpdate && (
              <div>{lastPriceUpdate.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
            )}
            <div className="text-[8px] opacity-60 flex items-center gap-1">
              real data (Polygon/CG/Yahoo)
              {lastPriceUpdate && <span className="text-accent">• live</span>}
              {user && <span className="text-accent">• Supabase connected</span>}
            </div>
          </div>
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

      {/* Main Content */}
      <div className="flex-1 px-5 pb-28 overflow-y-auto pt-5">
        
        {/* ARENA TAB */}
        {activeTab === 'home' && (
          <>
            {/* MAIN EVENT HERO - shows your active pit when joined */}
            <div className={`hero p-6 mb-6 ${joinedContests.includes(heroContest.id) ? 'ring-1 ring-accent/20' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="px-3 py-0.5 rounded text-[10px] font-bold tracking-[1.5px] bg-accent text-[#0A0A0A] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A] live-dot" />
                  LIVE
                </div>
                <div className="text-xs text-muted tracking-widest">{heroContest.date.toUpperCase()}</div>
                {joinedContests.includes(heroContest.id) && heroRank && (
                  <div className="rank-badge ml-auto pill text-[10px] px-2 py-0.5">#{heroRank} IN PIT</div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap mb-1">
                <div className="font-black text-[42px] leading-[0.9] tracking-[-3px]">{heroContest.title}</div>
                {heroContest.badge && (
                  <span className="pill text-[10px] px-2 py-0.5 self-center">{heroContest.badge}</span>
                )}
              </div>
              <div className="text-secondary mb-1 text-sm leading-snug">
                {heroContest.tagline || (joinedContests.includes(heroContest.id) ? "YOU'RE ON THE TAPE" : 'ENTER THE ARENA')}
              </div>
              <PitRulesStrip contest={heroContest} bellTick={bellTick} />

              {heroContest.assetTheme && (
                <div className="text-[10px] text-accent font-mono tracking-wide mb-3 px-2 py-1.5 bg-surface border border-accent/20 rounded-lg">
                  TODAY&apos;S TAPE — {heroContest.assetTheme}
                </div>
              )}

              <div className="flex items-end gap-4 mb-5">
                <div>
                  <div className="text-[11px] tracking-[1px] text-muted mb-0.5">FIRST PRIZE</div>
                  <div className="font-mono text-5xl font-bold tracking-[-2.5px] text-accent tabular-nums">${heroContest.firstPrize}</div>
                </div>
                <div className="pb-1.5 text-sm text-muted">/ ${heroContest.totalPrizes} pool</div>
              </div>

              {joinedContests.includes(heroContest.id) && participations[heroContest.id] && (() => {
                const p = participations[heroContest.id];
                const liveVal = getPortfolioValue(p);
                const pnl = liveVal - p.startingValue;
                const pnlPct = ((liveVal / p.startingValue) - 1) * 100;
                const flashSym = heroContest.assets[0];
                const flashClass = priceFlashes[flashSym] === 'up' ? 'pnl-flash-up' : priceFlashes[flashSym] === 'down' ? 'pnl-flash-down' : '';
                return (
                  <div className={`mb-4 p-3 rounded-xl bg-surface border border-card ${flashClass}`}>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-[10px] text-muted tracking-widest">YOUR LIVE VALUE</div>
                        <div className={`font-mono text-2xl text-accent ${priceFlashes[flashSym] ? (priceFlashes[flashSym] === 'up' ? 'text-green-400' : 'text-red-400') : ''}`}>
                          ${liveVal.toLocaleString()}
                        </div>
                      </div>
                      <div className={`text-sm font-mono ${pnl >= 0 ? 'text-accent' : 'text-red'}`}>
                        {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="mb-3">
                <div className="flex justify-between text-[10px] text-muted mb-1">
                  <span>{heroContest.entries} / {heroContest.maxEntries} traders</span>
                  <span>{entryFillPct(heroContest)}% full</span>
                </div>
                <div className="progress h-1.5">
                  <div className="progress-fill" style={{ width: `${entryFillPct(heroContest)}%` }} />
                </div>
              </div>

              <div className="flex items-center justify-between mb-5 text-sm">
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 bg-surface text-xs border border-card rounded font-medium">
                    ENTRY <span className="text-accent font-mono">${heroContest.entryFee}</span>
                  </div>
                </div>
                {(() => {
                  void bellTick;
                  const ms = hydrated ? bellMsRemaining(heroContest) : null;
                  const urgent = ms != null && ms > 0 && ms < 5 * 60 * 1000;
                  const closed = hydrated && !isContestBellOpen(heroContest);
                  return (
                    <div className={`pill text-xs px-3 py-1 flex items-center gap-1.5 ${urgent ? 'bell-urgent' : ''} ${closed ? 'opacity-60' : ''}`}>
                      <Clock size={13} />
                      {hydrated ? (
                        closed ? 'BELL RUNG' : (
                          <BellCountdown contest={heroContest} tick={bellTick} prefix="" placeholder="—" openText={heroContest.timeLeft} />
                        )
                      ) : (
                        '—'
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Assets row */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {heroContest.assets.map((asset, i) => (
                  <div key={i} className="text-[10px] px-2.5 py-px border border-surface-2 bg-surface font-mono tracking-widest rounded">
                    {asset}
                  </div>
                ))}
              </div>

              <button 
                onClick={() => joinedContests.includes(heroContest.id) ? openTradeModal(heroContest.id) : joinArena(heroContest.id)}
                className="btn btn-primary w-full py-[17px] text-base tracking-[0.5px] active:scale-[0.985]"
              >
                {joinedContests.includes(heroContest.id) ? 'OPEN TICKET' : heroContest.entryFee === 0 ? 'RING IN FREE' : 'PAY ENTRY • SEND IT'}
              </button>

              <div className="flex justify-center gap-4 mt-3 text-[10px] text-muted tracking-widest">
                <button onClick={() => fetchLivePrices()} className="hover:text-accent active:text-accent">REFRESH LIVE PRICES</button>
                {joinedContests.includes(heroContest.id) && (
                  <button onClick={() => { setVaultContestId(heroContest.id); setActiveTab('leaderboard'); }} className="text-accent">VIEW VAULT →</button>
                )}
                {!usingServerGame && (
                  <>
                    <button onClick={() => simulateMarket(0.8)} className="hover:text-accent">TEST BUMP</button>
                    <button onClick={() => advanceTime} className="hover:text-accent">ADVANCE TIME</button>
                  </>
                )}
                {usingServerGame && <span className="text-accent">• LIVE MULTIPLAYER</span>}
              </div>
            </div>

            {/* Quick Arena Stats — real multiplayer data */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { label: "YOUR BATTLES", value: joinedContests.length > 0 ? String(joinedContests.length) : "0" },
                { label: "YOUR BEST", value: bestPortfolioValue > 0 ? `$${bestPortfolioValue.toLocaleString()}` : "—" },
                { label: "VAULT RANK", value: heroRank ? `#${heroRank}` : vaultPlayerCount > 0 ? `#${yourRank}` : "—" },
              ].map((s, i) => (
                <div key={i} className="bg-card border border-card p-3 rounded-xl text-center hover:border-accent/50 transition-colors">
                  <div className="text-xl font-mono font-semibold tracking-tighter text-accent">{s.value}</div>
                  <div className="text-[10px] text-muted tracking-[1px] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {!usingServerGame && (
              <div className="flex gap-2 mb-8">
                <button onClick={() => fetchLivePrices()} className="flex-1 py-2 text-xs border border-accent text-accent rounded-xl active:bg-surface">REFRESH LIVE PRICES</button>
                <button onClick={() => simulateMarket(0.9)} className="flex-1 py-2 text-xs border border-card rounded-xl active:bg-surface">TEST BUMP</button>
                <button onClick={advanceTime} className="flex-1 py-2 text-xs border border-card rounded-xl active:bg-surface">ADVANCE TIME</button>
              </div>
            )}

            {/* Global chart viewer for polished experience - opens from Arena or Battles */}
            {selectedChartSymbol && (
              <div className="mb-8">
                <AssetChart 
                  symbol={selectedChartSymbol} 
                  currentPrice={prices[selectedChartSymbol] || 0} 
                  livePrices={prices}
                  userPosition={Object.values(participations).flatMap(p => p.positions).find(p => p.symbol === selectedChartSymbol) || null}
                  onClose={() => setSelectedChartSymbol('')}
                />
              </div>
            )}

            {/* Live Pit Feed — arena tape */}
            {joinedContests.length > 0 && activeVaultContestId && (
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

            {joinedContests.length > 0 && dynamicVault.length > 0 && (
              <BeatLeaderCard
                entries={dynamicVault}
                yourValue={dynamicVault.find((e) => e.isYou)?.portfolioValue || bestPortfolioValue}
              />
            )}

            {/* THE VAULT - real multiplayer rankings */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3 px-0.5">
                <div>
                  <div className="uppercase text-xs tracking-[2px] text-secondary font-medium">THE VAULT</div>
                  <div className="font-bold text-xl tracking-tight">
                    {vaultContest?.title || 'Live Rankings'}
                  </div>
                  <div className="text-[10px] text-muted mt-0.5">
                    {vaultPlayerCount} trader{vaultPlayerCount === 1 ? '' : 's'} in pit
                    {usingServerGame && <span className="text-accent"> • LIVE</span>}
                  </div>
                </div>
                <button
                  onClick={() => activeVaultContestId && refreshLeaderboard(activeVaultContestId)}
                  className="text-[10px] px-2 py-1 border border-accent/40 text-accent rounded-lg"
                >
                  REFRESH
                </button>
              </div>

              {vaultPlayerCount === 0 && (
                <div className="text-center py-8 text-muted text-sm border border-dashed border-card rounded-2xl mb-4">
                  Join a contest to appear on the leaderboard
                </div>
              )}

              {vaultPlayerCount > 0 && (
                <>
                  <div className="podium mb-5">
                    {[0, 1, 2].map((idx) => {
                      const entry = dynamicVault[idx];
                      const place = idx === 0 ? 'gold' : idx === 1 ? 'silver' : 'bronze';
                      const rankLabel = idx === 0 ? '1ST' : String(idx + 1);
                      if (!entry) {
                        return (
                          <div key={idx} className={`podium-place ${place} opacity-30`}>
                            <div className="text-xs text-muted mb-1">{rankLabel}</div>
                            <div className="w-9 h-9 mx-auto rounded-full border border-dashed border-card flex items-center justify-center text-[10px] mb-1.5">—</div>
                            <div className="text-[10px] text-muted">open slot</div>
                          </div>
                        );
                      }
                      return (
                        <div key={entry.userId} className={`podium-place ${place} ${entry.isYou ? 'ring-1 ring-accent/40 rounded-xl' : ''}`}>
                          <div className="text-xs text-muted mb-1">{rankLabel}</div>
                          <div className={`w-9 h-9 mx-auto rounded-full ${idx === 0 ? 'bg-accent text-[#0A0A0A]' : entry.isYou ? 'bg-user-card border border-accent' : 'bg-zinc-800'} flex items-center justify-center font-mono text-sm mb-1.5`}>
                            {entry.username.replace('@', '').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="font-mono text-xs tracking-tight text-accent">${entry.portfolioValue.toLocaleString()}</div>
                          <div className="text-[10px] text-muted truncate max-w-[72px] mx-auto">
                            {entry.username}{entry.isYou ? ' (you)' : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {dynamicVault.find((e) => e.isYou) && (
                    <div className="bg-user-card border border-accent/30 rounded-2xl p-3 flex items-center justify-between text-sm mb-2">
                      <div className="flex items-center gap-3">
                        <div className="font-mono text-sm text-muted w-6">#{yourRank}</div>
                        <div className="font-medium">YOUR RANK</div>
                      </div>
                      <div className="font-mono font-semibold text-accent">
                        ${dynamicVault.find((e) => e.isYou)?.portfolioValue.toLocaleString()}
                      </div>
                    </div>
                  )}

                  {dynamicVault.length > 3 && (
                    <div className="space-y-1 mb-2">
                      {dynamicVault.slice(3, 6).map((entry) => (
                        <div key={entry.userId} className="flex justify-between text-xs py-1 px-1">
                          <span className="text-muted">#{entry.rank} {entry.username}</span>
                          <span className="font-mono text-accent">${entry.portfolioValue.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button onClick={() => setActiveTab('leaderboard')} className="w-full text-xs text-accent font-medium py-2 border border-card rounded-xl">
                    FULL VAULT →
                  </button>
                </>
              )}
            </div>

            {/* OPEN ARENAS */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="font-bold tracking-[-0.5px] text-lg">OPEN ARENAS</div>
              </div>

              {/* New filter style - segmented underline */}
              <div className="flex gap-6 border-b border-[#222] mb-4 text-sm">
                {(['all', 'paid', 'free'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setSelectedFilter(filter)}
                    className={`pb-2 font-medium transition-colors ${selectedFilter === filter 
                      ? 'text-accent border-b-2 border-accent' 
                      : 'text-secondary'}`}
                  >
                    {filter === 'all' ? 'ALL' : filter.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="space-y-3.5">
                {filteredContests.map((contest) => {
                  const isJoined = joinedContests.includes(contest.id);
                  const cardRank = rankInContest(contest.id);
                  const fill = entryFillPct(contest);
                  return (
                  <div key={contest.id} className={`arena-card p-5 ${isJoined ? 'arena-card-joined' : ''}`}>
                    <div className="flex justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-semibold text-[21px] tracking-[-0.8px] leading-none">{contest.title}</div>
                          {contest.badge && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-pill rounded font-bold tracking-wide">{contest.badge}</span>
                          )}
                          {isJoined && cardRank && (
                            <span className="rank-badge text-[10px] px-2 py-0.5 bg-pill rounded-full font-bold">#{cardRank}</span>
                          )}
                        </div>
                        {contest.tagline && (
                          <div className="text-[11px] text-secondary mt-1 leading-tight">{contest.tagline}</div>
                        )}
                        {contest.assetTheme && (
                          <div className="text-[10px] text-accent/90 font-mono mt-1">{contest.assetTheme}</div>
                        )}
                        <div className="text-xs text-muted mt-1 flex items-center gap-2">
                          {contest.date}
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {contest.endsAt ? <TimeLeftLabel endsAt={contest.endsAt} status={contest.status} tick={bellTick} /> : contest.timeLeft}
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-muted text-[10px]">ENTRY</div>
                        <div className="font-mono font-semibold tabular-nums">${contest.entryFee}</div>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-x-3 mb-3">
                      <span className="font-mono text-3xl font-bold tracking-[-1.5px] text-accent">${contest.firstPrize}</span>
                      <span className="text-xs text-muted">TO 1ST • ${contest.totalPrizes} TOTAL</span>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-[10px] text-muted mb-1">
                        <span>{contest.entries} traders</span>
                        <span>{fill}% full</span>
                      </div>
                      <div className="progress h-1">
                        <div className="progress-fill" style={{ width: `${fill}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-muted">
                        {contest.assets.slice(0, 3).map((a, idx) => (
                          <span key={idx} className="font-mono px-1.5 py-px bg-surface border border-card rounded">{a}</span>
                        ))}
                        <span className="ml-1">+{Math.max(0, contest.assets.length - 3)}</span>
                      </div>

                      {isJoined ? (
                        <div className="flex items-center gap-2">
                          <div className="text-right text-xs">
                            <div className="text-muted">YOUR VALUE</div>
                            <div className={`font-mono text-accent transition-colors ${priceFlashes[contest.assets[0]] ? (priceFlashes[contest.assets[0]] === 'up' ? 'text-green-400' : 'text-red-400') : ''}`}>
                              ${getPortfolioValue(participations[contest.id]).toLocaleString()}
                            </div>
                          </div>
                          <button onClick={() => openTradeModal(contest.id)} className="btn btn-primary text-xs px-5 py-2 rounded-xl">TRADE</button>
                        </div>
                      ) : (
                        <button onClick={() => joinArena(contest.id)} className="btn btn-primary text-xs px-7 py-2 rounded-xl tracking-[0.5px]">
                          {contest.entryFee === 0 ? 'RING IN FREE' : 'ENTER PIT'}
                        </button>
                      )}
                    </div>
                  </div>
                );
                })}
              </div>
            </div>
          </>
        )}

        {/* MY BATTLES TAB — Active / Upcoming / Completed */}
        {activeTab === 'entries' && (
          <div className="pt-2 tab-content-enter">
            <div className="mb-4">
              <div className="uppercase tracking-[2px] text-xs text-secondary">YOUR CONTEST HISTORY</div>
              <div className="text-3xl font-black tracking-[-1.5px]">MY BATTLES</div>
            </div>

            <SegmentedControl
              className="mb-5"
              value={battlesSegment}
              onChange={setBattlesSegment}
              options={[
                { id: 'active', label: 'ACTIVE', count: activeBattles.length },
                { id: 'upcoming', label: 'UPCOMING', count: upcomingContests.length },
                { id: 'completed', label: 'DONE', count: completedBattles.length },
              ]}
            />

            {battlesSegment === 'active' && activeBattles.length === 0 && (
              <div className="text-center py-12 text-muted border border-dashed border-card rounded-2xl">
                No active battles.<br />
                <button onClick={() => setBattlesSegment('upcoming')} className="text-accent mt-2 text-sm">Browse upcoming arenas →</button>
              </div>
            )}

            {battlesSegment === 'upcoming' && upcomingContests.length === 0 && (
              <div className="text-center py-12 text-muted border border-dashed border-card rounded-2xl">
                You&apos;re in every open arena.<br />New pits drop on the Arena tab.
              </div>
            )}

            {battlesSegment === 'completed' && completedBattles.length === 0 && (
              <div className="text-center py-12 text-muted border border-dashed border-card rounded-2xl">
                No completed battles yet.<br />Finish a contest to see your results here.
              </div>
            )}

            {battlesSegment === 'upcoming' && upcomingContests.map((c) => (
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
                  <div className="text-right">
                    <div className="font-mono text-2xl text-accent">${c.firstPrize}</div>
                    <div className="text-[10px] text-muted">1ST PRIZE</div>
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
                      {(p.payout || 0) > 0 && (
                        <div className="text-sm font-mono text-accent">+${p.payout}</div>
                      )}
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

              return (
                <div key={p.contestId} className="arena-card arena-card-joined p-5 mb-4">
                  <div className="flex justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-xl tracking-tight">{c.title}</div>
                        {battleRank && (
                          <span className="rank-badge text-[10px] px-2 py-0.5 bg-pill rounded-full font-bold flex items-center gap-1">
                            <Trophy size={10} /> #{battleRank}
                          </span>
                        )}
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
                    <div className="text-right">
                      <div className={`font-mono text-2xl text-accent tabular-nums transition-colors ${priceFlashes[c?.assets?.[0]] ? (priceFlashes[c.assets[0]] === 'up' ? 'text-green-400' : 'text-red-400') : ''}`}>
                        ${liveVal.toLocaleString()}
                      </div>
                      <div className={`text-xs font-mono ${pnl >= 0 ? 'text-accent' : 'text-red'}`}>
                        {pnl >= 0 ? '+' : ''}${pnl.toLocaleString()} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-[10px] text-muted mb-1">
                      <span>Portfolio vs $100k start</span>
                      <span className={pnl >= 0 ? 'text-accent' : 'text-red'}>{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%</span>
                    </div>
                    <div className="progress h-1.5">
                      <div
                        className="progress-fill"
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

                  <div className="flex gap-2">
                    <button onClick={() => openTradeModal(p.contestId)} className="btn btn-primary flex-1 py-2 text-sm">TRADE</button>
                    <button onClick={() => setSelectedChartSymbol(c.assets[0])} className="flex-1 py-2 text-sm border border-card rounded-xl">CHART</button>
                    {c.status !== 'closed' && (
                      <button onClick={() => settleContest(p.contestId)} className="flex-1 py-2 text-sm border border-card rounded-xl">SETTLE</button>
                    )}
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
                { id: 'global', label: 'GLOBAL' },
              ]}
            />

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
              <>
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
                <BeatLeaderCard
                  entries={dynamicVault}
                  yourValue={dynamicVault.find((e) => e.isYou)?.portfolioValue || 0}
                />
              </>
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

            {vaultMode === 'pit' && (dynamicVault.length === 0 ? (
              <div className="text-center py-12 text-muted">No traders in this contest yet.</div>
            ) : (
              <div className="divide-y divide-[#222] text-sm">
                {dynamicVault.map((entry) => (
                  <div key={entry.userId} className={`vault-row flex items-center justify-between py-4 px-1 ${entry.isYou ? 'bg-user-card -mx-1 px-2 rounded' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className={`font-mono text-xl w-8 text-right tabular-nums ${entry.rank === 1 ? 'text-accent' : 'text-muted'}`}>#{entry.rank}</div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${entry.isYou ? 'bg-accent text-black' : 'bg-zinc-800'}`}>
                        {entry.username.replace('@', '').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="font-medium">{entry.username} {entry.isYou && <span className="text-accent text-xs">(YOU)</span>}</div>
                    </div>
                    <div className="font-mono text-lg text-accent tabular-nums tracking-tighter">
                      ${entry.portfolioValue.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ))}

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
                    <p className="text-xs text-muted mb-4">Share your link. Friends get <span className="text-accent">+$5</span> welcome bonus — you earn <span className="text-accent">+$10</span> when they enter the Pit.</p>
                    <div className="bg-black/40 border border-card rounded-xl p-3 text-xs font-mono text-muted break-all mb-3">
                      {typeof window !== 'undefined' ? `${window.location.origin}?ref=${profile?.referral_code || 'yourcode'}` : '?ref=yourcode'}
                    </div>
                    <button onClick={copyReferralLink} className="btn btn-primary w-full py-3 text-sm flex items-center justify-center gap-2">
                      {referralCopied ? <Check size={16} /> : <Copy size={16} />}
                      {referralCopied ? 'COPIED!' : 'COPY INVITE LINK'}
                    </button>
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
        <div className="fixed inset-0 bg-black/92 z-[65] flex items-center justify-center p-5">
          <div className="settlement-card w-full max-w-[380px] bg-card border border-accent/40 rounded-3xl p-6 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-accent flex items-center justify-center">
              <Trophy size={28} className="text-[#0A0A0A]" />
            </div>
            <div className="text-[10px] tracking-[3px] text-muted uppercase mb-1">Bell Rung — Pit Closed</div>
            <div className="font-black text-2xl tracking-tight mb-4">{settlementResult.contestTitle}</div>
            <div className="rank-badge font-mono text-6xl font-black text-accent mb-1">#{settlementResult.rank}</div>
            <div className="text-sm text-muted mb-4">Final portfolio ${settlementResult.portfolioValue.toLocaleString()}</div>
            {settlementResult.payout > 0 ? (
              <div className="bg-user-card border border-accent/30 rounded-2xl p-4 mb-5">
                <div className="text-[10px] text-muted tracking-widest">PRIZE WON</div>
                <div className="font-mono text-4xl font-bold text-accent">+${settlementResult.payout}</div>
                <div className="text-[10px] text-muted mt-1">Added to your balance</div>
              </div>
            ) : (
              <div className="bg-surface border border-card rounded-2xl p-4 mb-5 text-sm text-muted">
                No payout this bell — size up and run it back.
              </div>
            )}
            {settlementResult.settlementPrices && Object.keys(settlementResult.settlementPrices).length > 0 && (
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
              <button
                onClick={() => {
                  const id = settlementResult.contestId;
                  setSettlementResult(null);
                  openContestRecap(id);
                }}
                className="w-full py-3 text-sm border border-accent/40 text-accent rounded-xl"
              >
                READ THE TAPE →
              </button>
              <button
                onClick={() => setSettlementResult(null)}
                className="btn btn-primary w-full py-3.5 text-sm"
              >
                BACK TO ARENA
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
              <div>
                <div className="font-bold text-xl">TRADE • {contests.find(c => c.id === tradingContestId)?.title}</div>
                {(() => {
                  void bellTick;
                  const tc = contests.find((c) => c.id === tradingContestId);
                  if (!tc) return null;
                  const ms = hydrated ? bellMsRemaining(tc) : null;
                  const closed = hydrated && !isContestBellOpen(tc);
                  return (
                    <div className={`text-[10px] mt-0.5 font-mono ${closed ? 'text-red-400' : ms != null && ms < 300000 ? 'text-red-400 bell-urgent' : 'text-muted'}`}>
                      {!hydrated ? '—' : closed ? '🔔 BELL RUNG — TRADING CLOSED' : (
                        <BellCountdown contest={tc} tick={bellTick} prefix="BELL IN " placeholder="PIT OPEN" openText="PIT OPEN" />
                      )}
                    </div>
                  );
                })()}
              </div>
              <button onClick={closeTradeModal} className="p-1"><X size={22} /></button>
            </div>

            {(() => {
              const tc = contests.find((c) => c.id === tradingContestId);
              return tc ? <PitRulesStrip contest={tc} bellTick={bellTick} /> : null;
            })()}

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

            {/* Asset price grid - Click for chart (better than SwapRoyale) */}
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
                      setSelectedChartSymbol(sym);  // Open chart for this asset
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.985] ${isSelected ? 'border-accent bg-surface ring-1 ring-accent/30' : 'border-card hover:border-[#333]'} ${priceFlashes[sym] ? (priceFlashes[sym] === 'up' ? 'bg-green-900/30' : 'bg-red-900/30') : ''}`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="font-mono font-semibold">{sym}</div>
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

            {/* Inline Chart - Different & better: Full featured with your entry marker */}
            {selectedChartSymbol && tradingContestId && (
              <div className="mb-5">
                <AssetChart 
                  symbol={selectedChartSymbol} 
                  currentPrice={prices[selectedChartSymbol] || 0} 
                  livePrices={prices}
                  userPosition={participations[tradingContestId]?.positions.find(p => p.symbol === selectedChartSymbol) || null}
                  onClose={() => setSelectedChartSymbol('')}
                />
              </div>
            )}

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
                  if (tradeSide === 'sell' && pos) {
                    setTradeShares(Math.floor(pos.shares * (q/100)).toString());
                  } else {
                    const cash = participations[tradingContestId]?.cash || 0;
                    const max = Math.floor(cash / (prices[tradeSymbol] || 1));
                    setTradeShares(Math.floor(max * (q/100)).toString());
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
              const blocked = !tc || !isContestBellOpen(tc) || isPriceStale(lastPriceUpdate) || !prices[tradeSymbol];
              return (
                <button
                  onClick={executeTrade}
                  disabled={blocked}
                  className="btn btn-primary w-full py-4 text-base disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {blocked && tc && !isContestBellOpen(tc)
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
    </div>
  );
}
