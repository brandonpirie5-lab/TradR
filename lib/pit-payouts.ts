/**
 * TradR MVP — one contest format: top half of the field splits the pool evenly.
 */

import {
  DAILY_ENTRY_FEE,
  DAILY_MAX_ENTRIES,
  DAILY_MIN_ENTRIES,
  DAILY_PIT_SLUG,
} from './daily-pit-config';

export type PitPayoutMode = 'top-half';

export type PitPayoutStructure = {
  id: string;
  mode: PitPayoutMode;
  label: string;
  hook: string;
  minEntries: number;
  maxEntries: number;
};

export type PrizeTierDisplay = {
  rank: number;
  rankEnd?: number;
  label: string;
  amount: number;
  pctOfPool: number;
  winnerCount: number;
};

const DAILY_PIT: PitPayoutStructure = {
  id: 'daily-pit',
  mode: 'top-half',
  label: 'Top Half Split',
  hook: '$5 entry · top 50% split the pool · grows with every trader',
  minEntries: DAILY_MIN_ENTRIES,
  maxEntries: DAILY_MAX_ENTRIES,
};

/** All slugs resolve to the single MVP structure (legacy DB rows included). */
export const PIT_PAYOUT_BY_SLUG: Record<string, string> = {
  [DAILY_PIT_SLUG]: 'daily-pit',
  'opening-bell': 'daily-pit',
  'the-liquidation': 'daily-pit',
  'full-send': 'daily-pit',
  'triple-stack': 'daily-pit',
  'tradfi-vs-degen': 'daily-pit',
  'meme-mayhem': 'daily-pit',
  'gold-rush': 'daily-pit',
  'weekend-carnage': 'daily-pit',
};

const STRUCTURES: Record<string, PitPayoutStructure> = {
  'daily-pit': DAILY_PIT,
};

export function getPayoutStructure(slug?: string | null): PitPayoutStructure {
  const id = slug ? PIT_PAYOUT_BY_SLUG[slug] : undefined;
  return (id && STRUCTURES[id]) || DAILY_PIT;
}

export function countPaidRanks(
  structure: PitPayoutStructure,
  participantCount: number = structure.minEntries
): number {
  if (participantCount < structure.minEntries) return 0;
  return Math.max(1, Math.floor(participantCount / 2));
}

/** @deprecated Use pit-pool-math live payouts — static catalog estimate only */
export function payoutForContestRank(rank: number, slug?: string | null): number {
  void slug;
  if (rank < 1) return 0;
  const structure = getPayoutStructure(slug);
  const count = structure.minEntries;
  const paid = countPaidRanks(structure, count);
  if (rank > paid) return 0;
  const gross = count * DAILY_ENTRY_FEE;
  const pool = gross * 0.9;
  return Math.floor((pool / paid) * 100) / 100;
}

export function getFirstPrize(slug?: string | null): number {
  return payoutForContestRank(1, slug);
}

export function getCatalogPayoutFields(slug: string) {
  const s = getPayoutStructure(slug);
  const atMin = s.minEntries;
  const paid = countPaidRanks(s, atMin);
  const pool = atMin * DAILY_ENTRY_FEE * 0.9;
  const each = paid > 0 ? Math.floor((pool / paid) * 100) / 100 : 0;
  return {
    firstPrize: each,
    totalPrizes: pool,
    totalPrizesMax: DAILY_MAX_ENTRIES * DAILY_ENTRY_FEE * 0.9,
    maxEntries: s.maxEntries,
    minEntries: s.minEntries,
    payoutLabel: s.label,
    payoutHook: s.hook,
    paidRanks: paid,
  };
}

export function getPrizeBreakdown(slug?: string | null): PrizeTierDisplay[] {
  const structure = getPayoutStructure(slug);
  const count = structure.minEntries;
  const paid = countPaidRanks(structure, count);
  const pool = count * DAILY_ENTRY_FEE * 0.9;
  const each = paid > 0 ? Math.floor((pool / paid) * 100) / 100 : 0;
  if (paid <= 0) return [];
  return [
    {
      rank: 1,
      rankEnd: paid,
      label: `1–${paid}`,
      amount: each,
      pctOfPool: 100,
      winnerCount: paid,
    },
  ];
}

export function formatPayoutHook(slug?: string | null): string {
  return getPayoutStructure(slug).hook;
}

export function formatPayoutSummary(slug?: string | null): string {
  const s = getPayoutStructure(slug);
  return `$${DAILY_ENTRY_FEE} entry · top half paid · min ${s.minEntries} traders`;
}