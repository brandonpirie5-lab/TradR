import { Position } from './portfolio';

export interface DbContest {
  id: number;
  title: string;
  slug?: string | null;
  tagline?: string | null;
  badge?: string | null;
  entry_fee: number;
  first_prize: number;
  total_prizes: number;
  max_entries: number | null;
  status: 'open' | 'active' | 'closed';
  starting_portfolio: number;
  assets: string[];
  ends_at: string | null;
  entry_count: number;
}

export interface Contest {
  id: number;
  title: string;
  slug?: string;
  tagline?: string;
  badge?: string;
  date: string;
  entryFee: number;
  firstPrize: number;
  totalPrizes: number;
  entries: number;
  maxEntries: number;
  timeLeft: string;
  assets: string[];
  status: 'open' | 'active' | 'closed';
  startingPortfolioValue: number;
  endsAt: string | null;
  /** e.g. "Tuesday • Mega Degen Tape" */
  assetTheme?: string;
}

export interface Participation {
  contestId: number;
  cash: number;
  positions: Position[];
  startingValue: number;
  finalRank?: number | null;
  finalValue?: number | null;
  payout?: number | null;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  portfolioValue: number;
  rank: number;
  isYou?: boolean;
}

export interface GlobalLeaderboardEntry {
  userId: string;
  username: string;
  value: number;
  rank: number;
  wins?: number;
  contests?: number;
  isYou?: boolean;
}

export interface UserPerformanceStats {
  contestsEntered: number;
  contestsCompleted: number;
  wins: number;
  placements: number;
  cashed: number;
  winRate: number;
  totalWinnings: number;
  totalEntryFees: number;
  netProfit: number;
  avgFinishRank: number | null;
  bestFinishRank: number | null;
  pitStreak: number;
}

export interface ActivityItem {
  id: string;
  type: 'entry' | 'trade' | 'payout' | 'deposit' | 'settled';
  title: string;
  detail: string;
  amount?: number;
  createdAt: string;
  contestId?: number;
}

export interface TradeLogEntry {
  id: number;
  userId: string;
  username: string;
  symbol: string;
  side: 'buy' | 'sell';
  shares: number;
  price: number;
  total: number;
  createdAt: string;
  isYou?: boolean;
}

export interface ContestRecapStanding {
  userId: string;
  username: string;
  finalRank: number;
  finalValue: number;
  payout: number;
  cash?: number;
  positions?: Position[];
  isYou?: boolean;
}

export interface ContestRecap {
  contest: Contest;
  standings: ContestRecapStanding[];
  trades: TradeLogEntry[];
  settlementPrices?: Record<string, number>;
}

export type GlobalLeaderboardPeriod = 'week' | 'all';
export type GlobalLeaderboardMetric = 'winnings' | 'wins' | 'win_rate';

export function formatContestDate(endsAt: string | null): string {
  if (!endsAt) return 'TBD';
  const d = new Date(endsAt);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatTimeLeft(endsAt: string | null, status: string): string {
  if (status === 'closed') return 'ENDED';
  if (!endsAt) return 'OPEN';
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'CLOSING SOON';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export function formatMemberSince(createdAt: string): string {
  const d = new Date(createdAt);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function displayUsername(username: string | null | undefined, email?: string | null): string {
  if (username) return username.startsWith('@') ? username : `@${username}`;
  if (email) return `@${email.split('@')[0]}`;
  return '@trader';
}

export function dbContestToContest(row: DbContest): Contest {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug || undefined,
    tagline: row.tagline || undefined,
    badge: row.badge || undefined,
    date: formatContestDate(row.ends_at),
    entryFee: Number(row.entry_fee),
    firstPrize: Number(row.first_prize),
    totalPrizes: Number(row.total_prizes),
    entries: row.entry_count,
    maxEntries: row.max_entries ?? 999,
    timeLeft: formatTimeLeft(row.ends_at, row.status),
    assets: row.assets ?? [],
    status: row.status,
    startingPortfolioValue: Number(row.starting_portfolio),
    endsAt: row.ends_at,
  };
}