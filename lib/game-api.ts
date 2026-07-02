import { supabase } from './supabase';
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
} from './game-types';
import { dbRowToPitContest } from './pit-contests';
import { normalizePositions } from './portfolio';
import type { TradeLimitInfo } from './trade-limits';

function mapParticipation(p: {
  contest_id: number;
  cash: number;
  positions: unknown;
  starting_value?: number;
  final_rank?: number | null;
  final_value?: number | null;
  payout?: number | null;
}): Participation {
  return {
    contestId: p.contest_id,
    cash: Number(p.cash),
    positions: normalizePositions(p.positions),
    startingValue: Number(p.starting_value ?? p.cash),
    finalRank: p.final_rank ?? null,
    finalValue: p.final_value != null ? Number(p.final_value) : null,
    payout: p.payout != null ? Number(p.payout) : null,
  };
}

async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function authFetch(path: string, options: RequestInit = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function ensureWeekSlate(): Promise<void> {
  try {
    await fetch('/api/contests/ensure-week', {
      method: 'POST',
      headers: { 'x-tradr-client': 'arena' },
    });
  } catch {
    /* non-fatal — contests may already exist */
  }
}

let weekSlateOnce: Promise<void> | null = null;

/** Spawn week slate at most once per page session — avoids API storms in dev. */
export function ensureWeekSlateOnce(): Promise<void> {
  if (!weekSlateOnce) {
    weekSlateOnce = ensureWeekSlate();
  }
  return weekSlateOnce;
}

async function fetchWithTimeout(path: string, init: RequestInit = {}, ms = 20000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(path, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out — server may be busy. Try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchContests(): Promise<Contest[]> {
  // MVP: no auto week-slate spawn — one daily pit managed by cron/manual.

  let res: Response | null = null;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      res = await fetchWithTimeout('/api/contests');
      break;
    } catch (err) {
      lastErr = err;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 400));
    }
  }
  if (!res) {
    const msg = lastErr instanceof Error ? lastErr.message : 'Failed to fetch';
    throw new Error(msg);
  }
  if (!res.ok) throw new Error('Failed to load contests');
  const rows = await res.json();
  return rows.map(dbRowToPitContest);
}

export async function fetchMyParticipations(): Promise<Record<number, Participation>> {
  const data = await authFetch('/api/participations');
  const loaded: Record<number, Participation> = {};
  for (const p of data.participations || []) {
    loaded[p.contest_id] = mapParticipation(p);
  }
  return loaded;
}

export async function joinContestApi(contestId: number): Promise<{ newBalance: number }> {
  const data = await authFetch('/api/contests/join', {
    method: 'POST',
    body: JSON.stringify({ contestId }),
  });
  return { newBalance: Number(data.newBalance) };
}

export type TradeResult = Participation & {
  executedPrice: number;
  portfolioValue: number;
  rank: number;
  rankBefore: number;
  rankDelta: number;
  tradersBehind: number;
  tradeLimit?: TradeLimitInfo;
};

export async function fetchTradeLimit(contestId: number): Promise<TradeLimitInfo> {
  const data = await authFetch(`/api/trades/count?contestId=${contestId}`);
  return data as TradeLimitInfo;
}

export async function executeTradeApi(params: {
  contestId: number;
  symbol: string;
  side: 'buy' | 'sell';
  shares: number;
  lockedPrice?: number;
}): Promise<TradeResult> {
  const data = await authFetch('/api/trades', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return {
    contestId: params.contestId,
    cash: Number(data.cash),
    positions: normalizePositions(data.positions),
    startingValue: Number(data.startingValue),
    executedPrice: Number(data.executedPrice),
    portfolioValue: Number(data.portfolioValue),
    rank: Number(data.rank),
    rankBefore: Number(data.rankBefore),
    rankDelta: Number(data.rankDelta),
    tradersBehind: Number(data.tradersBehind),
    tradeLimit: data.tradeLimit,
  };
}

export type PitFeedItem = {
  id: string;
  userId: string;
  username: string;
  side: 'buy' | 'sell';
  symbol: string;
  shares: number;
  price: number;
  total: number;
  createdAt: string;
  isYou?: boolean;
};

export async function fetchPitFeed(contestId: number, limit = 25): Promise<PitFeedItem[]> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api/pit-feed?contestId=${contestId}&limit=${limit}`, { headers });
  if (!res.ok) throw new Error('Failed to load pit feed');
  const data = await res.json();
  return data.feed || [];
}

export async function fetchLeaderboard(
  contestId: number
): Promise<{ entries: LeaderboardEntry[]; prices: Record<string, number>; contestStatus?: string }> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api/leaderboard?contestId=${contestId}`, { headers });
  if (!res.ok) throw new Error('Failed to load leaderboard');
  const data = await res.json();
  return {
    entries: data.entries || [],
    prices: data.prices || {},
    contestStatus: data.contestStatus,
  };
}

export async function settleContestApi(contestId: number): Promise<{
  rank: number;
  payout: number;
  refund: number;
  voided: boolean;
  newBalance: number;
  settlementPrices: Record<string, number>;
}> {
  const data = await authFetch('/api/contests/settle', {
    method: 'POST',
    body: JSON.stringify({ contestId }),
  });
  return {
    rank: data.rank,
    payout: data.payout,
    refund: Number(data.refund || 0),
    voided: !!data.voided,
    newBalance: Number(data.newBalance),
    settlementPrices: data.settlementPrices || {},
  };
}

export async function createDepositCheckout(amount: number): Promise<string> {
  const data = await authFetch('/api/deposits/checkout', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
  return data.url;
}

export async function refreshGameState(): Promise<{
  contests: Contest[];
  participations: Record<number, Participation>;
  profileBalance?: number;
}> {
  const token = await getAccessToken();
  const contests = await fetchContests();

  if (!token) {
    return { contests, participations: {} };
  }

  const [partData, profileRes] = await Promise.all([
    authFetch('/api/participations'),
    authFetch('/api/me').catch(() => null),
  ]);

  const participations: Record<number, Participation> = {};
  for (const p of partData.participations || []) {
    participations[p.contest_id] = mapParticipation(p);
  }

  return {
    contests,
    participations,
    profileBalance: profileRes?.balance != null ? Number(profileRes.balance) : undefined,
  };
}

export async function fetchMyStats(): Promise<UserPerformanceStats> {
  return authFetch('/api/stats/me');
}

export async function fetchGlobalLeaderboard(
  period: GlobalLeaderboardPeriod,
  metric: GlobalLeaderboardMetric
): Promise<GlobalLeaderboardEntry[]> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api/global-leaderboard?period=${period}&metric=${metric}`, { headers });
  if (!res.ok) throw new Error('Failed to load global leaderboard');
  const data = await res.json();
  return data.entries || [];
}

export async function fetchActivity(limit = 30): Promise<ActivityItem[]> {
  const data = await authFetch(`/api/activity?limit=${limit}`);
  return data.activities || [];
}

export async function fetchContestRecap(contestId: number): Promise<ContestRecap> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api/contests/recap?contestId=${contestId}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load recap');
  }
  return res.json();
}

export async function updateUsername(username: string): Promise<void> {
  await authFetch('/api/me', {
    method: 'PATCH',
    body: JSON.stringify({ username }),
  });
}

export async function fetchOpeningBellStreak(): Promise<{
  streak: number;
  playedToday: boolean;
  lastDayEt: string | null;
  creditsAwarded: { days: number; amount: number; label: string }[];
  daysToNext: number;
  rewardLabel: string | null;
}> {
  return authFetch('/api/streak/opening-bell');
}

export async function syncOpeningBellStreak(): Promise<{
  streak: number;
  playedToday: boolean;
  lastDayEt: string | null;
  creditsAwarded: { days: number; amount: number; label: string }[];
  daysToNext: number;
  rewardLabel: string | null;
}> {
  return authFetch('/api/streak/opening-bell', { method: 'POST' });
}

export async function fetchReferralStats(): Promise<import('./game-types').ReferralStats> {
  return authFetch('/api/referral/stats');
}

export async function fetchTapeLeaderboard(): Promise<{
  weekStart: string;
  themeLine: string;
  entries: import('./game-types').TapeLeaderboardEntry[];
}> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch('/api/tape-leaderboard', { headers });
  if (!res.ok) throw new Error('Failed to load tape leaderboard');
  return res.json();
}

export async function triggerAutoSettle(): Promise<{
  settled: number;
  spawned?: number;
  contests: Array<{
    id: number;
    title: string;
    yourRank?: number;
    yourPayout?: number;
    yourPortfolioValue?: number;
    settlementPrices?: Record<string, number>;
    voided?: boolean;
    yourRefund?: number;
    yourAffected?: boolean;
  }>;
}> {
  return authFetch('/api/contests/auto-settle', { method: 'POST' });
}