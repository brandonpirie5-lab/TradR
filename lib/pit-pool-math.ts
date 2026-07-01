/**
 * MVP pool math — paid entries only, 10% rake, top half splits pool evenly.
 */

import { DAILY_ENTRY_FEE, DAILY_MIN_ENTRIES } from './daily-pit-config';
import { countPaidRanks, getPayoutStructure } from './pit-payouts';

export const PLATFORM_RAKE_PCT = 10;

export type PayoutContext = {
  entryFee: number;
  participantCount: number;
};

export function computeGrossEntries(ctx: PayoutContext): number {
  return ctx.participantCount * ctx.entryFee;
}

export function computeRakeAmount(ctx: PayoutContext): number {
  if (ctx.entryFee <= 0 || ctx.participantCount < DAILY_MIN_ENTRIES) return 0;
  const gross = computeGrossEntries(ctx);
  return Math.round(gross * (PLATFORM_RAKE_PCT / 100) * 100) / 100;
}

export function computeMaxPaidRank(
  slug: string | null | undefined,
  participantCount: number
): number {
  const structure = getPayoutStructure(slug);
  return countPaidRanks(structure, participantCount);
}

export function computeEffectivePool(
  slug: string | null | undefined,
  ctx: PayoutContext
): number {
  const structure = getPayoutStructure(slug);
  const { entryFee, participantCount } = ctx;

  if (entryFee <= 0) return 0;
  if (participantCount < structure.minEntries) return 0;

  const gross = participantCount * entryFee;
  const afterRake = gross * (1 - PLATFORM_RAKE_PCT / 100);
  return Math.round(afterRake * 100) / 100;
}

/** Top 50% of field — equal split of prize pool. */
export function buildScaledPayouts(
  slug: string | null | undefined,
  ctx: PayoutContext
): Map<number, number> {
  const map = new Map<number, number>();
  const pool = computeEffectivePool(slug, ctx);
  const maxRank = computeMaxPaidRank(slug, ctx.participantCount);
  if (pool <= 0 || maxRank < 1) return map;

  const baseCents = Math.floor((pool * 100) / maxRank);
  let remainder = Math.round(pool * 100) - baseCents * maxRank;

  for (let rank = 1; rank <= maxRank; rank++) {
    let cents = baseCents;
    if (remainder > 0) {
      cents += 1;
      remainder -= 1;
    }
    map.set(rank, cents / 100);
  }
  return map;
}

export function payoutForContestRankLive(
  rank: number,
  slug: string | null | undefined,
  ctx: PayoutContext
): number {
  if (rank < 1) return 0;
  return buildScaledPayouts(slug, ctx).get(rank) ?? 0;
}

export function getLiveFirstPrize(slug: string | null | undefined, ctx: PayoutContext): number {
  return payoutForContestRankLive(1, slug, ctx);
}

export function formatPoolFundingNote(
  slug: string | null | undefined,
  entryFee: number,
  participantCount?: number
): string {
  const structure = getPayoutStructure(slug);
  const count = participantCount ?? structure.minEntries;
  const pool = computeEffectivePool(slug, { entryFee, participantCount: count });
  const maxRank = computeMaxPaidRank(slug, count);
  const gross = count * entryFee;
  return `$${pool.toLocaleString()} pool from $${gross.toLocaleString()} entries (${PLATFORM_RAKE_PCT}% platform) · top ${maxRank} paid`;
}

export type LivePrizeTier = {
  rank: number;
  label: string;
  amount: number;
  pctOfPool: number;
};

export function getLivePrizeTiers(
  slug: string | null | undefined,
  entryFee: number,
  participantCount: number
): LivePrizeTier[] {
  const pool = computeEffectivePool(slug, { entryFee, participantCount });
  if (pool <= 0) return [];
  const maxRank = computeMaxPaidRank(slug, participantCount);
  const amount = payoutForContestRankLive(1, slug, { entryFee, participantCount });
  if (amount <= 0) return [];
  return [
    {
      rank: 1,
      label: `Top ${maxRank} (each)`,
      amount,
      pctOfPool: 100,
    },
  ];
}

export function formatPoolRangeSummary(slug: string | null | undefined, entryFee: number): string {
  const structure = getPayoutStructure(slug);
  const atMin = computeEffectivePool(slug, {
    entryFee,
    participantCount: structure.minEntries,
  });
  const atMax = computeEffectivePool(slug, {
    entryFee,
    participantCount: structure.maxEntries,
  });
  return `$${atMin.toLocaleString()} at min (${structure.minEntries}) → up to $${atMax.toLocaleString()}`;
}