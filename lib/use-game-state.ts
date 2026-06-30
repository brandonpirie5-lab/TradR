'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured, type Profile } from './supabase';
import {
  Contest,
  LeaderboardEntry,
  Participation,
  displayUsername,
} from './game-types';
import { getPortfolioValue as calcPortfolioValue } from './portfolio';
import {
  fetchContests,
  ensureWeekSlateOnce,
  refreshGameState,
  joinContestApi,
  executeTradeApi,
  fetchLeaderboard,
  settleContestApi,
  triggerAutoSettle,
  fetchPitFeed,
  fetchTradeLimit,
  syncOpeningBellStreak,
  type PitFeedItem,
} from './game-api';
import { buildTradeLimitInfo, canPlaceTrade, type TradeLimitInfo } from './trade-limits';
import {
  findOpeningBellContest,
  isStaleOpeningBellContest,
  OPENING_BELL_SLUG,
} from './pit-contests';
import { getOpeningBellStreak, recordOpeningBellDay, applyServerStreakSnapshot } from './opening-bell-streak';
import { getContestRules } from './contest-rules';
import { payoutForContestRank } from './pit-payouts';
import { loadSeenSettlementIds, markSettlementSeen } from './settlement-storage';
import {
  isContestBellOpen,
  isContestStarted,
  isContestTradingOpen,
  isJoinAllowed,
  bellMsRemaining,
} from './contest-bell';
import { isSymbolTradableNow } from './market-hours';
import { affordableBuyShares, formatShareInput } from './trade-sizing';
import { estimateRankAfterTrade } from './simulate-trade';
import {
  CRYPTO_MAP,
  initialContests,
  initialPrices,
  initialUserBalance,
  isCrypto,
} from './game-constants';
import {
  buildArenaPitList,
  buildContestBoard,
  computeDemoStats,
  getAllSymbolsFromContests,
  resolveVaultContestId,
  selectActiveBattles,
  selectCompletedBattles,
  selectJoinedContests,
  selectScheduledBattles,
} from './game-selectors';

export type SettlementResult = {
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
};

export type TradeCompletePayload = {
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
};

export type UseGameStateOptions = {
  user: { id?: string; email?: string | null } | null;
  setUser: (user: { id?: string; email?: string | null } | null) => void;
  profile: Profile | null;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  showToast: (message: string, type?: 'success' | 'error') => void;
  onSettlement: (result: SettlementResult) => void;
  onJoinFlash: (title: string) => void;
  onTradeComplete: (result: TradeCompletePayload) => void;
  onRouteAfterJoin: (contest: Contest) => void;
  onScheduleTrade: (contestId: number) => void;
  onRequireSignIn: () => void;
  loadProfileExtras?: () => void;
  setAuthLoading?: (loading: boolean) => void;
};

export function useGameState({
  user,
  setUser,
  profile,
  setProfile,
  showToast,
  onSettlement,
  onJoinFlash,
  onTradeComplete,
  onRouteAfterJoin,
  onScheduleTrade,
  onRequireSignIn,
  loadProfileExtras,
  setAuthLoading,
}: UseGameStateOptions) {
  const [contests, setContests] = useState<Contest[]>(initialContests);
  const [prices, setPrices] = useState<Record<string, number>>(initialPrices);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);
  const [userBalance, setUserBalance] = useState(initialUserBalance);
  const [participations, setParticipations] = useState<Record<number, Participation>>({});
  const [leaderboardByContest, setLeaderboardByContest] = useState<Record<number, LeaderboardEntry[]>>({});
  const [vaultContestId, setVaultContestId] = useState<number | null>(null);
  const [gameSyncing, setGameSyncing] = useState(false);
  const [history, setHistory] = useState<Array<{ time: string; action: string; amount?: number }>>([]);
  const [priceFlashes, setPriceFlashes] = useState<Record<string, 'up' | 'down'>>({});
  const [tradeLimitByContest, setTradeLimitByContest] = useState<Record<number, TradeLimitInfo>>({});
  const [demoTradeCounts, setDemoTradeCounts] = useState<Record<number, number>>({});
  const [pitFeedByContest, setPitFeedByContest] = useState<Record<number, PitFeedItem[]>>({});
  const [pitFeedLoading, setPitFeedLoading] = useState(false);
  const [bellTick, setBellTick] = useState(0);

  const prevPricesRef = useRef<Record<string, number>>({});
  const pricesRef = useRef(prices);
  pricesRef.current = prices;
  const autoSettledIdsRef = useRef<Set<number>>(new Set());
  const serverSettledShownRef = useRef<Set<number>>(loadSeenSettlementIds());
  const localSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const priceFetchRunningRef = useRef(false);
  const syncGameRef = useRef<() => Promise<void>>(async () => {});
  const loadProfileExtrasRef = useRef(loadProfileExtras);
  const onSettlementRef = useRef(onSettlement);
  const celebrateStreakRef = useRef<(c: Contest) => void>(() => {});
  const showToastRef = useRef(showToast);
  const contestsRef = useRef(contests);
  const participationsRef = useRef(participations);
  const userRef = useRef(user);
  const loadUserDataRef = useRef<(userId: string) => Promise<void>>(async () => {});
  const lastAuthUserIdRef = useRef<string | null>(null);
  const setUserRef = useRef(setUser);
  const setProfileRef = useRef(setProfile);
  const setAuthLoadingRef = useRef(setAuthLoading);

  const isLoggedIn = !!user;
  const usingServerGame = isSupabaseConfigured && isLoggedIn;
  const effectiveBalance = isLoggedIn && profile ? profile.balance : userBalance;
  const pitDisplayName = displayUsername(profile?.username, user?.email);
  const shouldUseDemoSeed = !usingServerGame;

  const joinedContests = useMemo(() => selectJoinedContests(participations), [participations]);

  const getPortfolioValue = useCallback(
    (p: Participation) => calcPortfolioValue(p, prices),
    [prices]
  );

  const getContestBoard = useCallback(
    (contestId: number | null): LeaderboardEntry[] =>
      buildContestBoard({
        contestId,
        participations,
        prices,
        leaderboardByContest,
        userId: user?.id,
        userEmail: user?.email,
        pitDisplayName,
        isSupabaseConfigured,
        isLoggedIn,
      }),
    [participations, prices, leaderboardByContest, user, pitDisplayName, isLoggedIn]
  );

  const syncGameFromServer = useCallback(async () => {
    if (!usingServerGame) return;
    setGameSyncing(true);
    try {
      const state = await refreshGameState();
      setContests((prev) => (state.contests.length ? state.contests : prev));
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
  }, [usingServerGame, setProfile]);

  const refreshLeaderboard = useCallback(
    async (contestId: number): Promise<LeaderboardEntry[]> => {
      if (!isSupabaseConfigured) return [];
      try {
        const { entries, prices: lbPrices } = await fetchLeaderboard(contestId);
        const activeUser = userRef.current;
        const marked = activeUser
          ? entries.map((e) => ({ ...e, isYou: e.userId === activeUser.id }))
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
    },
    []
  );

  const loadUserData = useCallback(
    async (_userId: string) => {
      if (!supabase) return;
      try {
        const state = await refreshGameState();
        setContests((prev) => (state.contests.length ? state.contests : prev));
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
      } catch {
        console.log('Supabase load skipped (demo mode or tables not ready)');
      }
    },
    [refreshLeaderboard, setProfile]
  );

  const loadTradeLimit = useCallback(
    async (contestId: number) => {
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
    },
    [contests, usingServerGame, demoTradeCounts]
  );

  const loadPitFeed = useCallback(
    async (contestId: number) => {
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
    },
    [usingServerGame]
  );

  const pushLocalFeedItem = useCallback((contestId: number, item: PitFeedItem) => {
    setPitFeedByContest((prev) => ({
      ...prev,
      [contestId]: [item, ...(prev[contestId] || [])].slice(0, 30),
    }));
  }, []);

  const fetchLivePrices = useCallback(
    async (symbolsToFetch?: string[]) => {
      const symbols = symbolsToFetch || getAllSymbolsFromContests(contests);
      if (symbols.length === 0) return prices;
      if (priceFetchRunningRef.current) return prices;

      priceFetchRunningRef.current = true;
      try {
        const res = await fetch(`/api/prices?symbols=${symbols.join(',')}`);
        if (!res.ok) throw new Error('price api failed');
        const fresh: Record<string, number> = await res.json();

        const updated = { ...prices, ...fresh };
        setPrices(updated);
        setLastPriceUpdate(new Date());
        return updated;
      } catch (err) {
        console.warn('Live price fetch failed', err);
        return prices;
      } finally {
        priceFetchRunningRef.current = false;
      }
    },
    [contests, prices]
  );

  const celebrateOpeningBellStreak = useCallback(
    async (contest?: Contest) => {
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
            loadProfileExtras?.();
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
    },
    [usingServerGame, showToast, syncGameFromServer, loadProfileExtras]
  );

  syncGameRef.current = syncGameFromServer;
  loadProfileExtrasRef.current = loadProfileExtras;
  onSettlementRef.current = onSettlement;
  celebrateStreakRef.current = celebrateOpeningBellStreak;
  showToastRef.current = showToast;
  contestsRef.current = contests;
  participationsRef.current = participations;
  userRef.current = user;
  loadUserDataRef.current = loadUserData;
  setUserRef.current = setUser;
  setProfileRef.current = setProfile;
  setAuthLoadingRef.current = setAuthLoading;

  const rankInContest = useCallback(
    (contestId: number): number | null => {
      const board = getContestBoard(contestId);
      return board.find((e) => e.isYou)?.rank ?? null;
    },
    [getContestBoard]
  );

  const getLiveParticipantCount = useCallback(
    (contestId: number): number => {
      if (usingServerGame) {
        const contest = contests.find((c) => c.id === contestId);
        if (contest?.entries) return contest.entries;
        const board = leaderboardByContest[contestId];
        if (board?.length) return board.length;
        return participations[contestId] ? 1 : 0;
      }
      return participations[contestId] ? 1 : 0;
    },
    [usingServerGame, leaderboardByContest, contests, participations]
  );

  const canonicalOpeningBell = useMemo(() => findOpeningBellContest(contests), [contests]);

  const featuredContest = useMemo(
    () =>
      contests.find((c) => c.status !== 'closed' && isContestTradingOpen(c)) ||
      canonicalOpeningBell ||
      contests.find((c) => c.status !== 'closed') ||
      contests[0],
    [contests, canonicalOpeningBell]
  );

  const activeVaultContestId = useMemo(
    () =>
      resolveVaultContestId({
        vaultContestId,
        joinedContests,
        contests,
        featuredContest,
      }),
    [vaultContestId, joinedContests, contests, featuredContest]
  );

  const vaultContest = useMemo(
    () =>
      activeVaultContestId
        ? contests.find((c) => c.id === activeVaultContestId)
        : featuredContest,
    [activeVaultContestId, contests, featuredContest]
  );

  const dynamicVault = useMemo(
    () => getContestBoard(activeVaultContestId),
    [getContestBoard, activeVaultContestId, prices, participations, leaderboardByContest, bellTick]
  );

  const arenaPitList = useMemo(
    () => buildArenaPitList(contests, joinedContests),
    [contests, joinedContests]
  );

  const activeBattles = useMemo(
    () => selectActiveBattles(participations, contests),
    [participations, contests]
  );

  const scheduledBattles = useMemo(
    () => selectScheduledBattles(participations, contests),
    [participations, contests]
  );

  const completedBattles = useMemo(
    () => selectCompletedBattles(participations, contests),
    [participations, contests]
  );

  const activeBattlesOrdered = useMemo(
    () => [...activeBattles].sort((a, b) => a.contestId - b.contestId),
    [activeBattles]
  );

  const sortedCompletedBattles = useMemo(
    () => [...completedBattles].sort((a, b) => b.contestId - a.contestId),
    [completedBattles]
  );

  const joinArena = useCallback(
    async (contestId: number) => {
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
        onRequireSignIn();
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
          onJoinFlash(contest.title);
          const fresh = contests.find((c) => c.id === contestId) ?? contest;
          onRouteAfterJoin(fresh);
          if (isContestTradingOpen(fresh)) {
            onScheduleTrade(contestId);
          } else {
            showToast('Rang in! Trading opens when the pit bell starts.');
          }
          await loadTradeLimit(contestId);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to join contest';
          showToast(message, 'error');
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
      onJoinFlash(contest.title);
      onRouteAfterJoin(contest);
      if (isContestTradingOpen(contest)) {
        onScheduleTrade(contestId);
      } else {
        showToast('Rang in! Trading opens when the pit bell starts.');
      }
      loadTradeLimit(contestId);
    },
    [
      contests,
      joinedContests,
      isLoggedIn,
      usingServerGame,
      profile,
      setProfile,
      syncGameFromServer,
      refreshLeaderboard,
      onJoinFlash,
      onRouteAfterJoin,
      onScheduleTrade,
      onRequireSignIn,
      effectiveBalance,
      participations,
      loadTradeLimit,
      showToast,
    ]
  );

  const settleContest = useCallback(
    async (contestId: number) => {
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
          loadProfileExtras?.();
          const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setHistory((h) => [
            { time: now, action: `Settled ${c.title} (#${result.rank})`, amount: result.payout },
            ...h,
          ].slice(0, 12));
          markSettlementSeen(contestId);
          serverSettledShownRef.current.add(contestId);
          if (c.slug === OPENING_BELL_SLUG) celebrateOpeningBellStreak(c);
          onSettlement({
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
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Settlement failed';
          showToast(message, 'error');
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
          [contestId]: { ...prev[contestId], finalRank: undefined, finalValue, payout: 0 },
        }));
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setHistory((h) => [
          { time: now, action: `Voided ${c.title} (min ${rules.minEntries} traders)`, amount: refund },
          ...h,
        ].slice(0, 12));
        markSettlementSeen(contestId);
        autoSettledIdsRef.current.add(contestId);
        onSettlement({
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

      const board = getContestBoard(contestId);
      const rank = board.findIndex((v) => v.isYou) + 1 || 5;
      const payout = payoutForContestRank(rank, c.slug);
      const newBal = userBalance + payout;
      setUserBalance(newBal);
      setContests(contests.map((x) => (x.id === contestId ? { ...x, status: 'closed' as const } : x)));
      setParticipations((prev) => ({
        ...prev,
        [contestId]: { ...prev[contestId], finalRank: rank, finalValue, payout },
      }));

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setHistory((h) => [{ time: now, action: `Settled ${c.title} (#${rank})`, amount: payout }, ...h].slice(0, 12));
      if (c.slug === OPENING_BELL_SLUG) celebrateOpeningBellStreak(c);
      onSettlement({
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
    },
    [
      contests,
      participations,
      usingServerGame,
      getPortfolioValue,
      profile,
      setProfile,
      syncGameFromServer,
      loadProfileExtras,
      onSettlement,
      showToast,
      getLiveParticipantCount,
      userBalance,
      getContestBoard,
      celebrateOpeningBellStreak,
      prices,
    ]
  );

  const executeTrade = useCallback(
    async (params: {
      tradingContestId: number;
      tradeSymbol: string;
      tradeShares: string;
      tradeSide: 'buy' | 'sell';
      onCloseTrade: () => void;
      setTradeShares: (shares: string) => void;
    }) => {
      const { tradingContestId, tradeSymbol, tradeShares, tradeSide, onCloseTrade, setTradeShares } = params;
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
        showToast("Pit hasn't opened yet — wait for the scheduled bell", 'error');
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
            {
              time: now,
              action: `${tradeSide.toUpperCase()} ${sharesNum} ${tradeSymbol} @ $${updated.executedPrice}`,
            },
            ...h,
          ].slice(0, 12));
          if (updated.tradeLimit) {
            setTradeLimitByContest((prev) => ({ ...prev, [tradingContestId]: updated.tradeLimit! }));
          }
          await refreshLeaderboard(tradingContestId);
          const boardAfter = getContestBoard(tradingContestId);
          onTradeComplete({
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
          onCloseTrade();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Trade failed';
          showToast(message, 'error');
        }
        return;
      }

      const price = lockedPrice;
      let newCash = p.cash;
      let newPos = [...p.positions];
      const cost = sharesNum * price;

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
      setHistory((h) => [
        { time: now, action: `${tradeSide.toUpperCase()} ${sharesNum} ${tradeSymbol} @ $${price}`, amount: tradeSide === 'buy' ? -cost : cost },
        ...h,
      ].slice(0, 12));
      const newPart = { ...p, cash: Math.round(newCash), positions: newPos };
      setParticipations({ ...participations, [tradingContestId]: newPart });
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

      onTradeComplete({
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
      onCloseTrade();
    },
    [
      participations,
      contests,
      fetchLivePrices,
      prices,
      usingServerGame,
      tradeLimitByContest,
      demoTradeCounts,
      refreshLeaderboard,
      getContestBoard,
      onTradeComplete,
      loadPitFeed,
      celebrateOpeningBellStreak,
      rankInContest,
      getPortfolioValue,
      user,
      pitDisplayName,
      pushLocalFeedItem,
      showToast,
    ]
  );

  // Auth listener — mount once; deps must not include loadUserData (it changes when user changes → infinite loop on signup)
  useEffect(() => {
    if (!supabase) {
      setAuthLoadingRef.current?.(false);
      return;
    }

    const applySession = (session: { user: NonNullable<typeof user> } | null) => {
      const nextId = session?.user?.id ?? null;
      const sameUser = nextId !== null && nextId === lastAuthUserIdRef.current;
      lastAuthUserIdRef.current = nextId;
      setAuthLoadingRef.current?.(false);

      if (sameUser) return;

      setUserRef.current(session?.user ?? null);
      if (session?.user?.id) {
        setParticipations({});
        setLeaderboardByContest({});
        void loadUserDataRef.current(session.user.id);
      } else {
        setProfileRef.current(null);
        setLeaderboardByContest({});
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !supabase) return;
    const sb = supabase;
    const channel = sb
      .channel('profile-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          const newBal = (payload.new as { balance?: number }).balance;
          if (typeof newBal === 'number') {
            setUserBalance((prev) => {
              if (prev === newBal) return prev;
              showToastRef.current('Balance updated live');
              return newBal;
            });
          }
        }
      )
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (isLoggedIn && profile && typeof profile.balance === 'number') {
      setUserBalance((prev) => (prev === profile.balance ? prev : profile.balance!));
    }
  }, [profile?.balance, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current);
    localSaveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem('tradr-state', JSON.stringify({ participations, prices, contests }));
      } catch {
        /* quota */
      }
    }, 2000);
    return () => {
      if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current);
    };
  }, [participations, prices, contests, isLoggedIn]);

  useEffect(() => {
    const t = setInterval(() => setBellTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Boot
  useEffect(() => {
    const boot = async () => {
      if (isSupabaseConfigured) {
        try {
          void ensureWeekSlateOnce();
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
        } catch {
          /* ignore */
        }
      }

      const contestList = contests.length ? contests : initialContests;
      const allSyms = getAllSymbolsFromContests(contestList);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!usingServerGame) {
      localStorage.setItem('tradr-state', JSON.stringify({ userBalance, participations, prices, contests }));
    }
  }, [userBalance, participations, prices, contests, usingServerGame]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const contestIds = [...new Set(Object.keys(participations).map(Number))];
    if (vaultContestId && !contestIds.includes(vaultContestId)) contestIds.push(vaultContestId);
    const freePitId = findOpeningBellContest(contests)?.id;
    if (freePitId && !contestIds.includes(freePitId)) contestIds.push(freePitId);
    if (!contestIds.length) return;

    contestIds.forEach((id) => refreshLeaderboard(id));
    const interval = setInterval(() => contestIds.forEach((id) => refreshLeaderboard(id)), 45000);
    return () => clearInterval(interval);
  }, [participations, contests, vaultContestId, user?.id, refreshLeaderboard]);

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
      if (prev != null && joined.includes(prev)) return prev;
      return preferred;
    });
  }, [participations, contests]);

  useEffect(() => {
    const symbols = getAllSymbolsFromContests(contests);
    if (!symbols.length) return;
    const interval = setInterval(() => fetchLivePrices(symbols), 60000);
    return () => clearInterval(interval);
  }, [contests, fetchLivePrices]);

  useEffect(() => {
    const flashes: Record<string, 'up' | 'down'> = {};
    Object.keys(prices).forEach((sym) => {
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

  useEffect(() => {
    const polygonKey = process.env.NEXT_PUBLIC_POLYGON_API_KEY;
    if (!polygonKey) return;

    const symbols = getAllSymbolsFromContests(contests);
    if (!symbols.length) return;

    const ws = new WebSocket('wss://socket.polygon.io/stocks');
    ws.onopen = () => {
      ws.send(JSON.stringify({ action: 'auth', params: polygonKey }));
      const tickers = symbols.map((s) => (isCrypto(s) ? `X:${s}USD` : s)).join(',');
      ws.send(JSON.stringify({ action: 'subscribe', params: `T.${tickers}` }));
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (!Array.isArray(msg)) return;
        const snapshot = pricesRef.current;
        let changed = false;
        const next = { ...snapshot };
        msg.forEach((m: { ev?: string; p?: number; T?: string }) => {
          if (m.ev !== 'T' || m.p == null) return;
          const sym =
            Object.keys(CRYPTO_MAP).find((k) => CRYPTO_MAP[k] === m.T) ||
            m.T?.replace('X:', '').replace('USD', '');
          if (!sym || snapshot[sym] === undefined) return;
          const px = Number(m.p.toFixed(sym === 'DOGE' ? 5 : 2));
          if (next[sym] !== px) {
            next[sym] = px;
            changed = true;
          }
        });
        if (changed) {
          setPrices(next);
          setLastPriceUpdate(new Date());
        }
      } catch {
        /* ignore */
      }
    };
    return () => ws.close();
  }, [contests]);

  useEffect(() => {
    if (!user || !supabase) return;
    const ids = Object.keys(participations).map(Number);
    if (!ids.length) return;
    const sb = supabase;
    const channel = sb.channel(`pit-live-${ids.join('-')}`);
    ids.forEach((contestId) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participations', filter: `contest_id=eq.${contestId}` },
        () => refreshLeaderboard(contestId)
      );
    });
    channel.subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [user?.id, Object.keys(participations).join(','), refreshLeaderboard]);

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
        { event: 'INSERT', schema: 'public', table: 'trade_log', filter: `contest_id=eq.${contestId}` },
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
      void sb.removeChannel(channel);
    };
  }, [usingServerGame, user?.id, Object.keys(participations).join(','), loadPitFeed, refreshLeaderboard]);

  useEffect(() => {
    if (!usingServerGame) return;

    let cancelled = false;
    let running = false;

    const runAutoSettle = async () => {
      if (cancelled || running) return;
      running = true;
      try {
        const result = await triggerAutoSettle();
        if (cancelled) return;
        if (result.settled > 0 || (result.spawned ?? 0) > 0) {
          await syncGameRef.current();
          loadProfileExtrasRef.current?.();
          if (result.settled > 0) {
            const yours = result.contests.find(
              (c) => c.yourAffected || c.yourRank != null || c.voided
            );
            if (yours && !serverSettledShownRef.current.has(yours.id)) {
              serverSettledShownRef.current.add(yours.id);
              markSettlementSeen(yours.id);
              const settledContest = contestsRef.current.find((x) => x.id === yours.id);
              if (settledContest?.slug === OPENING_BELL_SLUG) {
                void celebrateStreakRef.current(settledContest);
              }
              onSettlementRef.current({
                contestId: yours.id,
                contestSlug: settledContest?.slug,
                rank: yours.yourRank ?? 0,
                payout: yours.yourPayout ?? 0,
                refund: yours.yourRefund,
                voided: yours.voided,
                contestTitle: yours.title,
                portfolioValue: yours.yourPortfolioValue ?? 0,
                startingValue: participationsRef.current[yours.id]?.startingValue ?? 100_000,
                settlementPrices: yours.settlementPrices,
              });
            } else {
              const unseen = result.contests.filter((c) => !serverSettledShownRef.current.has(c.id));
              if (unseen.length) {
                unseen.forEach((c) => {
                  serverSettledShownRef.current.add(c.id);
                  markSettlementSeen(c.id);
                });
                showToastRef.current(`Pit closed: ${unseen.map((c) => c.title).join(', ')}`);
              }
            }
          }
          if ((result.spawned ?? 0) > 0) {
            showToastRef.current(`${result.spawned} fresh pit(s) spawned`);
          }
        }
      } catch {
        /* offline */
      } finally {
        running = false;
      }
    };

    const bootTimer = setTimeout(() => {
      void runAutoSettle();
    }, 5000);
    const interval = setInterval(() => {
      void runAutoSettle();
    }, 180000);

    return () => {
      cancelled = true;
      clearTimeout(bootTimer);
      clearInterval(interval);
    };
  }, [usingServerGame, user?.id]);

  useEffect(() => {
    if (usingServerGame) return;
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
  }, [bellTick, usingServerGame, participations, contests, settleContest]);

  useEffect(() => {
    setContests((prev) => {
      let changed = false;
      const next = prev.map((c) => {
        if (c.status === 'open' && c.startsAt && isContestStarted(c)) {
          changed = true;
          return { ...c, status: 'active' as const };
        }
        return c;
      });
      return changed ? next : prev;
    });
  }, [bellTick]);

  const simulateMarket = useCallback(
    (intensity = 1) => {
      const next = { ...prices };
      Object.keys(next).forEach((sym) => {
        const delta = (Math.random() - 0.47) * (0.018 * intensity);
        next[sym] = Math.max(0.01, +(next[sym] * (1 + delta)).toFixed(sym === 'DOGE' ? 5 : 2));
      });
      setPrices(next);
      showToast('Test market bump applied (real data preferred)');
    },
    [prices, showToast]
  );

  const resetDemo = useCallback(() => {
    localStorage.removeItem('tradr-state');
    window.location.reload();
  }, []);

  return {
    contests,
    setContests,
    prices,
    lastPriceUpdate,
    userBalance,
    setUserBalance,
    participations,
    leaderboardByContest,
    vaultContestId,
    setVaultContestId,
    gameSyncing,
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
    loadPitFeed,
    fetchLivePrices,
    joinArena,
    executeTrade,
    settleContest,
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
    simulateMarket,
    resetDemo,
    serverSettledShownRef,
  };
}