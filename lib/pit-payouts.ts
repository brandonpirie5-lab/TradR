/**
 * TradR Pit prize structures — tiered pools inspired by Swap Royale, tuned per pit.
 *
 * Each structure defines: min entries to run, max capacity, fixed prize pool,
 * and rank-range payouts (e.g. 6–10th @ $20).
 */

export type PayoutTier = {
  rankStart: number;
  rankEnd: number;
  amount: number;
};

export type PitPayoutMode = 'wide-board' | 'top-20' | 'triple-up' | 'double-up' | 'deep-board';

export type PitPayoutStructure = {
  id: string;
  mode: PitPayoutMode;
  label: string;
  hook: string;
  minEntries: number;
  maxEntries: number;
  totalPool: number;
  tiers: PayoutTier[];
};

export type PrizeTierDisplay = {
  rank: number;
  rankEnd?: number;
  label: string;
  amount: number;
  pctOfPool: number;
  winnerCount: number;
};

function tierWinners(tier: PayoutTier): number {
  return tier.rankEnd - tier.rankStart + 1;
}

function sumPool(tiers: PayoutTier[]): number {
  return tiers.reduce((sum, t) => sum + tierWinners(t) * t.amount, 0);
}

function assertPool(id: string, tiers: PayoutTier[], expected: number) {
  const actual = sumPool(tiers);
  if (actual !== expected) {
    throw new Error(`Payout structure "${id}" pool mismatch: expected $${expected}, got $${actual}`);
  }
}

/** Swap Royale free board — $150 pool, 40 winners, min 40 to run. */
const FREE_WIDE: PitPayoutStructure = {
  id: 'free-wide',
  mode: 'wide-board',
  label: 'Wide Board',
  hook: 'Top 40 cash — free entry, real prizes.',
  minEntries: 40,
  maxEntries: 350,
  totalPool: 150,
  tiers: [
    { rankStart: 1, rankEnd: 1, amount: 15 },
    { rankStart: 2, rankEnd: 2, amount: 13 },
    { rankStart: 3, rankEnd: 3, amount: 10 },
    { rankStart: 4, rankEnd: 4, amount: 8 },
    { rankStart: 5, rankEnd: 5, amount: 6 },
    { rankStart: 6, rankEnd: 8, amount: 5 },
    { rankStart: 9, rankEnd: 13, amount: 4 },
    { rankStart: 14, rankEnd: 22, amount: 3 },
    { rankStart: 23, rankEnd: 40, amount: 2 },
  ],
};

/** Swap Royale $5 / $500 pool — top 20, min 20. */
const PAID_TOP_20: PitPayoutStructure = {
  id: 'paid-top-20',
  mode: 'top-20',
  label: 'Top 20 Split',
  hook: '$500 pool — 1st takes $125, top 20 paid.',
  minEntries: 20,
  maxEntries: 120,
  totalPool: 500,
  tiers: [
    { rankStart: 1, rankEnd: 1, amount: 125 },
    { rankStart: 2, rankEnd: 2, amount: 75 },
    { rankStart: 3, rankEnd: 3, amount: 50 },
    { rankStart: 4, rankEnd: 4, amount: 35 },
    { rankStart: 5, rankEnd: 5, amount: 25 },
    { rankStart: 6, rankEnd: 10, amount: 20 },
    { rankStart: 11, rankEnd: 15, amount: 10 },
    { rankStart: 16, rankEnd: 20, amount: 8 },
  ],
};

/** Swap Royale Triple Up — 1st–15th @ $30, min 15, max 55. */
const TRIPLE_UP: PitPayoutStructure = {
  id: 'triple-up',
  mode: 'triple-up',
  label: 'Triple Up',
  hook: 'Top 15 each take $30 — 3× your $10 entry.',
  minEntries: 15,
  maxEntries: 55,
  totalPool: 450,
  tiers: [{ rankStart: 1, rankEnd: 15, amount: 30 }],
};

/** TradR Double Up — top ~40% double their $10 entry ($20 each). */
const DOUBLE_UP: PitPayoutStructure = {
  id: 'double-up',
  mode: 'double-up',
  label: 'Double Up',
  hook: 'Top 22 double up — $20 each on a $10 ticket.',
  minEntries: 15,
  maxEntries: 55,
  totalPool: 440,
  tiers: [{ rankStart: 1, rankEnd: 22, amount: 20 }],
};

/** $5 mid-size board — suits vs degen rhythm. */
const PAID_MID_BOARD: PitPayoutStructure = {
  id: 'paid-mid-board',
  mode: 'deep-board',
  label: 'Top 18 Split',
  hook: '$380 pool — macro day, deep payouts.',
  minEntries: 18,
  maxEntries: 150,
  totalPool: 380,
  tiers: [
    { rankStart: 1, rankEnd: 1, amount: 85 },
    { rankStart: 2, rankEnd: 2, amount: 50 },
    { rankStart: 3, rankEnd: 3, amount: 35 },
    { rankStart: 4, rankEnd: 4, amount: 25 },
    { rankStart: 5, rankEnd: 5, amount: 18 },
    { rankStart: 6, rankEnd: 10, amount: 15 },
    { rankStart: 11, rankEnd: 15, amount: 10 },
    { rankStart: 16, rankEnd: 18, amount: 14 },
  ],
};

/** Meme tape — more winners, $5 entry. */
const MEME_BOARD: PitPayoutStructure = {
  id: 'meme-board',
  mode: 'deep-board',
  label: 'Top 20 Split',
  hook: '$420 pool — degen tape, 20 winners.',
  minEntries: 20,
  maxEntries: 200,
  totalPool: 420,
  tiers: [
    { rankStart: 1, rankEnd: 1, amount: 120 },
    { rankStart: 2, rankEnd: 2, amount: 55 },
    { rankStart: 3, rankEnd: 3, amount: 38 },
    { rankStart: 4, rankEnd: 5, amount: 26 },
    { rankStart: 6, rankEnd: 10, amount: 15 },
    { rankStart: 11, rankEnd: 20, amount: 8 },
  ],
};

/** Metals / macro — $10 entry premium board. */
const GOLD_BOARD: PitPayoutStructure = {
  id: 'gold-board',
  mode: 'deep-board',
  label: 'Top 15 Split',
  hook: '$520 pool — macro tape, heavy 1st.',
  minEntries: 15,
  maxEntries: 80,
  totalPool: 520,
  tiers: [
    { rankStart: 1, rankEnd: 1, amount: 183 },
    { rankStart: 2, rankEnd: 2, amount: 90 },
    { rankStart: 3, rankEnd: 3, amount: 55 },
    { rankStart: 4, rankEnd: 5, amount: 30 },
    { rankStart: 6, rankEnd: 8, amount: 20 },
    { rankStart: 9, rankEnd: 12, amount: 12 },
    { rankStart: 13, rankEnd: 15, amount: 8 },
  ],
};

/** Weekend main event — biggest pool. */
const WEEKEND_BOARD: PitPayoutStructure = {
  id: 'weekend-board',
  mode: 'deep-board',
  label: 'Top 20 Split',
  hook: '$600 pool — weekend carnage, top 20 cash.',
  minEntries: 20,
  maxEntries: 100,
  totalPool: 600,
  tiers: [
    { rankStart: 1, rankEnd: 1, amount: 200 },
    { rankStart: 2, rankEnd: 2, amount: 95 },
    { rankStart: 3, rankEnd: 3, amount: 61 },
    { rankStart: 4, rankEnd: 5, amount: 32 },
    { rankStart: 6, rankEnd: 10, amount: 18 },
    { rankStart: 11, rankEnd: 15, amount: 11 },
    { rankStart: 16, rankEnd: 20, amount: 7 },
  ],
};

const STRUCTURES: Record<string, PitPayoutStructure> = {
  'free-wide': FREE_WIDE,
  'paid-top-20': PAID_TOP_20,
  'triple-up': TRIPLE_UP,
  'double-up': DOUBLE_UP,
  'paid-mid-board': PAID_MID_BOARD,
  'meme-board': MEME_BOARD,
  'gold-board': GOLD_BOARD,
  'weekend-board': WEEKEND_BOARD,
};

/** Pit slug → payout structure */
export const PIT_PAYOUT_BY_SLUG: Record<string, string> = {
  'opening-bell': 'free-wide',
  'the-liquidation': 'paid-top-20',
  'full-send': 'triple-up',
  'triple-stack': 'double-up',
  'tradfi-vs-degen': 'paid-mid-board',
  'meme-mayhem': 'meme-board',
  'gold-rush': 'gold-board',
  'weekend-carnage': 'weekend-board',
};

// Validate pool math at module load
for (const s of Object.values(STRUCTURES)) {
  assertPool(s.id, s.tiers, s.totalPool);
}

export function getPayoutStructure(slug?: string | null): PitPayoutStructure {
  const id = slug ? PIT_PAYOUT_BY_SLUG[slug] : undefined;
  return (id && STRUCTURES[id]) || PAID_TOP_20;
}

export function getPayoutStructureById(id: string): PitPayoutStructure | undefined {
  return STRUCTURES[id];
}

export function countPaidRanks(structure: PitPayoutStructure): number {
  return structure.tiers.reduce((max, t) => Math.max(max, t.rankEnd), 0);
}

export function payoutForContestRank(rank: number, slug?: string | null): number {
  if (rank < 1) return 0;
  const structure = getPayoutStructure(slug);
  for (const tier of structure.tiers) {
    if (rank >= tier.rankStart && rank <= tier.rankEnd) {
      return tier.amount;
    }
  }
  return 0;
}

/** @deprecated Use payoutForContestRank — kept for call sites passing firstPrize only */
export function payoutForRank(rank: number, slugOrLegacyFirstPrize: string | number): number {
  if (typeof slugOrLegacyFirstPrize === 'string') {
    return payoutForContestRank(rank, slugOrLegacyFirstPrize);
  }
  return payoutForContestRank(rank, undefined);
}

export function getFirstPrize(slug?: string | null): number {
  return payoutForContestRank(1, slug);
}

export function getCatalogPayoutFields(slug: string) {
  const s = getPayoutStructure(slug);
  return {
    firstPrize: payoutForContestRank(1, slug),
    totalPrizes: s.totalPool,
    maxEntries: s.maxEntries,
    minEntries: s.minEntries,
    payoutLabel: s.label,
    payoutHook: s.hook,
    paidRanks: countPaidRanks(s),
  };
}

export function getPrizeBreakdown(slug?: string | null): PrizeTierDisplay[] {
  const structure = getPayoutStructure(slug);
  const pool = structure.totalPool;

  return structure.tiers.map((tier) => {
    const winners = tierWinners(tier);
    const totalTier = winners * tier.amount;
    const label =
      tier.rankStart === tier.rankEnd
        ? `${tier.rankStart}${ordinal(tier.rankStart)}`
        : `${tier.rankStart}–${tier.rankEnd}`;

    return {
      rank: tier.rankStart,
      rankEnd: tier.rankEnd,
      label,
      amount: tier.amount,
      pctOfPool: Math.round((totalTier / pool) * 100),
      winnerCount: winners,
    };
  });
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export function formatPayoutHook(slug?: string | null): string {
  return getPayoutStructure(slug).hook;
}

export function formatPayoutSummary(slug?: string | null): string {
  const s = getPayoutStructure(slug);
  const winners = countPaidRanks(s);
  return `$${s.totalPool.toLocaleString()} pool · top ${winners} paid · min ${s.minEntries}`;
}