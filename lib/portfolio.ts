export interface Position {
  symbol: string;
  shares: number;
  avgPrice: number;
}

export interface ParticipationLike {
  cash: number;
  positions: Position[];
  startingValue?: number;
}

export function normalizePositions(raw: unknown): Position[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => ({
      symbol: String((p as Position).symbol || ''),
      shares: Number((p as Position).shares) || 0,
      avgPrice: Number((p as Position).avgPrice) || 0,
    }))
    .filter((p) => p.symbol && p.shares > 0);
}

export function getPortfolioValue(
  participation: ParticipationLike,
  prices: Record<string, number>
): number {
  let value = Number(participation.cash) || 0;
  for (const pos of normalizePositions(participation.positions)) {
    const price = prices[pos.symbol] ?? pos.avgPrice;
    value += pos.shares * price;
  }
  return Math.round(value);
}

export function payoutForRank(rank: number, firstPrize: number): number {
  if (rank === 1) return firstPrize;
  if (rank === 2) return Math.floor(firstPrize * 0.38);
  if (rank === 3) return Math.floor(firstPrize * 0.18);
  return 0;
}