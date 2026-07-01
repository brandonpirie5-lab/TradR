/**
 * Live pool math — paid pits are entry-funded; free pits use a capped house pool
 * that scales with turnout. Prizes condense (fewer ranks + smaller $) at low fill.
 */

import {
  countPaidRanks,
  getPayoutStructure,
  payoutForContestRank,
  type PitPayoutStructure,
} from './pit-payouts';


/** Platform rake on paid entries — 0% at launch; raise when volume supports it. */
export const PLATFORM_RAKE_PCT = 0;

/** House liability cap per free pit at strong turnout (10+ traders). */
export const FREE_HOUSE_POOL_MAX = 40;

/** House pays this when a free pit runs at exactly minimum entries. */
export const FREE_HOUSE_POOL_FLOOR = 15;

/** Turnout at which the free house pool reaches FREE_HOUSE_POOL_MAX. */
export const FREE_HOUSE_SCALE_AT = 25;

export type PayoutContext = {
  entryFee: number;
  participantCount: number;
};

export function computeMaxPaidRank(
  slug: string | null | undefined,
  participantCount: number
): number {
  const structure = getPayoutStructure(slug);
  return Math.min(countPaidRanks(structure), Math.max(0, participantCount));
}

export function computeEffectivePool(
  slug: string | null | undefined,
  ctx: PayoutContext
): number {
  const structure = getPayoutStructure(slug);
  const { entryFee, participantCount } = ctx;

  if (participantCount < structure.minEntries) return 0;

  if (entryFee > 0) {
    const gross = participantCount * entryFee;
    const afterRake = gross * (1 - PLATFORM_RAKE_PCT / 100);
    const capped = Math.min(afterRake, structure.totalPool);
    return Math.round(capped * 100) / 100;
  }

  const floor = structure.minEntries;
  const scaleAt = Math.max(floor + 1, FREE_HOUSE_SCALE_AT);
  const t = Math.min(1, (participantCount - floor) / (scaleAt - floor));
  const pool = FREE_HOUSE_POOL_FLOOR + t * (FREE_HOUSE_POOL_MAX - FREE_HOUSE_POOL_FLOOR);
  return Math.round(Math.min(pool, structure.totalPool) * 100) / 100;
}

function basePayoutTotalForRanks(structure: PitPayoutStructure, maxRank: number): number {
  let total = 0;
  for (let r = 1; r <= maxRank; r++) {
    for (const tier of structure.tiers) {
      if (r >= tier.rankStart && r <= tier.rankEnd) {
        total += tier.amount;
        break;
      }
    }
  }
  return total;
}

/** Distribute `pool` across ranks 1..maxRank using catalog tier weights. */
export function buildScaledPayouts(
  slug: string | null | undefined,
  ctx: PayoutContext
): Map<number, number> {
  const structure = getPayoutStructure(slug);
  const pool = computeEffectivePool(slug, ctx);
  const maxRank = computeMaxPaidRank(slug, ctx.participantCount);
  const map = new Map<number, number>();

  if (pool <= 0 || maxRank < 1) return map;

  const baseTotal = basePayoutTotalForRanks(structure, maxRank);
  if (baseTotal <= 0) return map;

  const scale = pool / baseTotal;
  const rows: { rank: number; cents: number }[] = [];

  for (let r = 1; r <= maxRank; r++) {
    const base = payoutForContestRank(r, slug);
    if (base > 0) {
      rows.push({ rank: r, cents: Math.floor(base * scale * 100) });
    }
  }

  let sumCents = rows.reduce((s, row) => s + row.cents, 0);
  const targetCents = Math.round(pool * 100);
  let i = 0;
  while (sumCents < targetCents && rows.length > 0) {
    rows[i].cents += 1;
    sumCents += 1;
    i = (i + 1) % rows.length;
  }

  for (const row of rows) {
    map.set(row.rank, row.cents / 100);
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

  if (entryFee > 0) {
    const gross = count * entryFee;
    const rakeNote = PLATFORM_RAKE_PCT > 0 ? ` (${PLATFORM_RAKE_PCT}% platform)` : '';
    return `$${pool.toLocaleString()} pool from $${gross.toLocaleString()} in entries${rakeNote} · top ${maxRank} paid at ${count} traders`;
  }

  return `$${pool.toLocaleString()} house pool at ${count} traders · top ${maxRank} paid · scales to $${FREE_HOUSE_POOL_MAX} with turnout`;
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
  const structure = getPayoutStructure(slug);
  const pool = computeEffectivePool(slug, { entryFee, participantCount });
  if (pool <= 0) return [];

  const maxRank = computeMaxPaidRank(slug, participantCount);
  const payouts = buildScaledPayouts(slug, { entryFee, participantCount });
  const tiers: LivePrizeTier[] = [];

  for (const tier of structure.tiers) {
    if (tier.rankStart > maxRank) break;
    const rankEnd = Math.min(tier.rankEnd, maxRank);
    const amount = payouts.get(tier.rankStart) ?? 0;
    if (amount <= 0) continue;

    const winners = rankEnd - tier.rankStart + 1;
    const totalTier = amount * winners;
    const label =
      tier.rankStart === rankEnd
        ? `${tier.rankStart}${ordinal(tier.rankStart)}`
        : `${tier.rankStart}–${rankEnd}`;

    tiers.push({
      rank: tier.rankStart,
      label: winners > 1 ? `${label} (each)` : `${label} Place`,
      amount,
      pctOfPool: Math.round((totalTier / pool) * 100),
    });
  }

  return tiers;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export function formatPoolRangeSummary(slug: string | null | undefined, entryFee: number): string {
  const structure = getPayoutStructure(slug);
  const atMin = computeEffectivePool(slug, {
    entryFee,
    participantCount: structure.minEntries,
  });
  const atCap =
    entryFee > 0
      ? computeEffectivePool(slug, {
          entryFee,
          participantCount: Math.ceil(structure.totalPool / entryFee),
        })
      : FREE_HOUSE_POOL_MAX;

  if (entryFee > 0) {
    return `$${atMin.toLocaleString()} at min (${structure.minEntries}) → up to $${Math.min(atCap, structure.totalPool).toLocaleString()}`;
  }

  if (slug === 'opening-bell') {
    return `$${FREE_HOUSE_POOL_FLOOR}–$${FREE_HOUSE_POOL_MAX} house pool · min ${structure.minEntries} traders`;
  }

  return `$${atMin.toLocaleString()} at min → up to $${structure.totalPool.toLocaleString()}`;
}