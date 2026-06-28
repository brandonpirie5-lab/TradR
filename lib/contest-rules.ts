import { Contest } from './game-types';
import { payoutForRank } from './portfolio';

const DURATION_HOURS: Record<string, number> = {
  'opening-bell': 20,
  'the-liquidation': 24,
  'full-send': 24,
  'triple-stack': 24,
  'weekend-carnage': 48,
  'tradfi-vs-degen': 18,
  'meme-mayhem': 24,
  'gold-rush': 24,
};

export type ContestRules = {
  startingBalance: number;
  maxTrades: number | 'unlimited';
  tradingHours: '24/7' | 'market-hours';
  minEntries: number;
  maxEntriesPerUser: number;
  joinAnytime: boolean;
  joinCutoffMinutes: number;
  durationHours: number;
  rules: string[];
};

const DEFAULT_RULES: ContestRules = {
  startingBalance: 100_000,
  maxTrades: 'unlimited',
  tradingHours: '24/7',
  minEntries: 1,
  maxEntriesPerUser: 1,
  joinAnytime: true,
  joinCutoffMinutes: 5,
  durationHours: 24,
  rules: [
    'Start with $100,000 in fake buying power.',
    'Trade any asset on the contest tape while the bell is open.',
    'Rankings update live — highest portfolio value at the bell wins.',
    'Top 3 share the prize pool (1st / 2nd / 3rd).',
    'Join anytime before the final 5 minutes.',
  ],
};

const SLUG_OVERRIDES: Partial<Record<string, Partial<ContestRules>>> = {
  'opening-bell': {
    minEntries: 1,
    maxTrades: 'unlimited',
    rules: [
      'Free entry — no wallet charge.',
      'Three assets only — tape rotates with the market week (stocks mid-week, crypto on weekends).',
      'Top 3 still cash — ego is optional, leaderboard is not.',
    ],
  },
  'the-liquidation': {
    tradingHours: '24/7',
  },
  'full-send': {
    maxTrades: 40,
    rules: [
      'Max 40 trades — make them count.',
      'Diversification is discouraged. Size is the strategy.',
    ],
  },
  'triple-stack': {
    maxTrades: 30,
    rules: [
      'Only three tickers on tape — stack or spiral.',
      'Max 30 trades per entry.',
    ],
  },
  'weekend-carnage': {
    durationHours: 48,
    rules: [
      'Runs through the weekend — plan your tape.',
      'Meme + macro mix on Saturday/Sunday rotations.',
    ],
  },
  'tradfi-vs-degen': {
    durationHours: 18,
  },
  'meme-mayhem': {
    maxTrades: 50,
    rules: [
      'Meme coin heavy tape — DOGE, PEPE, and friends.',
      'Volatility is the feature, not a bug.',
    ],
  },
  'gold-rush': {
    tradingHours: 'market-hours',
    rules: [
      'Metals + macro day — GLD, SLV on the tape.',
      'TradFi hours apply to stock/ETF quotes; crypto stays 24/7.',
    ],
  },
};

export function getContestDurationHours(slug?: string): number {
  if (!slug) return 24;
  return DURATION_HOURS[slug] ?? 24;
}

export function getContestStartAt(contest: Pick<Contest, 'endsAt' | 'startsAt' | 'slug'>): Date | null {
  if (contest.startsAt) return new Date(contest.startsAt);
  if (!contest.endsAt) return null;
  const hours = getContestDurationHours(contest.slug);
  return new Date(new Date(contest.endsAt).getTime() - hours * 60 * 60 * 1000);
}

export function getContestRules(contest: Pick<Contest, 'slug' | 'entryFee' | 'maxEntries' | 'startingPortfolioValue'>): ContestRules {
  const base = { ...DEFAULT_RULES };
  const override = contest.slug ? SLUG_OVERRIDES[contest.slug] : undefined;
  const merged = { ...base, ...override };

  if (contest.startingPortfolioValue) {
    merged.startingBalance = contest.startingPortfolioValue;
  }
  if (contest.slug) {
    merged.durationHours = getContestDurationHours(contest.slug);
  }
  if (contest.entryFee === 0) {
    merged.minEntries = 1;
  }

  return merged;
}

export type PrizeTier = {
  rank: number;
  label: string;
  amount: number;
  pctOfPool: number;
};

export function getPrizeBreakdown(contest: Pick<Contest, 'firstPrize' | 'totalPrizes'>): PrizeTier[] {
  const first = contest.firstPrize;
  const second = payoutForRank(2, first);
  const third = payoutForRank(3, first);
  const pool = contest.totalPrizes || first + second + third;

  return [
    { rank: 1, label: '1st Place', amount: first, pctOfPool: Math.round((first / pool) * 100) },
    { rank: 2, label: '2nd Place', amount: second, pctOfPool: Math.round((second / pool) * 100) },
    { rank: 3, label: '3rd Place', amount: third, pctOfPool: Math.round((third / pool) * 100) },
  ];
}

export function formatContestWindow(contest: Pick<Contest, 'endsAt' | 'slug'>, now = Date.now()): {
  startsAt: Date | null;
  endsAt: Date | null;
  started: boolean;
  ended: boolean;
} {
  const endsAt = contest.endsAt ? new Date(contest.endsAt) : null;
  const startsAt = getContestStartAt(contest);
  return {
    startsAt,
    endsAt,
    started: startsAt ? startsAt.getTime() <= now : true,
    ended: endsAt ? endsAt.getTime() <= now : false,
  };
}