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

export async function fetchContests(): Promise<Contest[]> {
  const res = await fetch('/api/contests');
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
};

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
  const data = await authFetch(`/api/pit-feed?contestId=${contestId}&limit=${limit}`);
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

export async function triggerAutoSettle(): Promise<{
  settled: number;
  spawned?: number;
  contests: Array<{ id: number; title: string; yourRank?: number; yourPayout?: number }>;
}> {
  return authFetch('/api/contests/auto-settle', { method: 'POST' });
}