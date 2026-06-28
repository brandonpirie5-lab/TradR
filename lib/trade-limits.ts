import { getContestRules } from './contest-rules';

export type TradeLimitInfo = {
  used: number;
  max: number | null;
  unlimited: boolean;
  remaining: number | null;
};

export function resolveMaxTrades(slug?: string): number | null {
  const rules = getContestRules({ slug, entryFee: 0, maxEntries: 999, startingPortfolioValue: 100_000 });
  if (rules.maxTrades === 'unlimited') return null;
  return rules.maxTrades;
}

export function buildTradeLimitInfo(used: number, slug?: string): TradeLimitInfo {
  const max = resolveMaxTrades(slug);
  if (max == null) {
    return { used, max: null, unlimited: true, remaining: null };
  }
  return {
    used,
    max,
    unlimited: false,
    remaining: Math.max(0, max - used),
  };
}

export function canPlaceTrade(used: number, slug?: string): { ok: boolean; message?: string; info: TradeLimitInfo } {
  const info = buildTradeLimitInfo(used, slug);
  if (info.unlimited || info.remaining == null || info.remaining > 0) {
    return { ok: true, info };
  }
  return {
    ok: false,
    info,
    message: `Trade limit reached (${info.max} max for this pit). Bell's still open — hold your line.`,
  };
}