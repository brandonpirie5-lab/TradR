import { DAILY_ASSETS } from './daily-pit-config';
import { isDailyPitSlug } from './daily-pit-schedule';

/**
 * TradR weekly asset tape — each pit gets a deliberate lineup per weekday.
 *
 * Tape tiers (SwapRoyale-style differentiation):
 *   3  — free pit + triple-stack (blue-chip crypto or themed triple)
 *   5  — crypto five / meme five / full-send five
 *   6  — metals & macro (GLD, SLV + indices + BTC, ETH)
 *   7  — tradfi board, tech titans, weekend chaos
 *  10  — suits + size hybrid (desk days)
 *  13  — mega degen crypto tape (Tuesdays + select pits)
 *  14  — Suits vs. Size full rivalry board (every day)
 */

export type AssetPoolId =
  | 'free-trio'
  | 'free-desk'
  | 'free-degen'
  | 'free-macro'
  | 'free-tech'
  | 'free-chaos'
  | 'crypto-five'
  | 'crypto-mega'
  | 'meme-five'
  | 'tradfi-core'
  | 'tradfi-hybrid'
  | 'metals-macro'
  | 'tech-titans'
  | 'full-send-five'
  | 'triple-stack'
  | 'triple-desk'
  | 'triple-degen'
  | 'triple-macro'
  | 'triple-tech'
  | 'triple-chaos'
  | 'triple-carnage'
  | 'weekend-chaos'
  | 'ws-vs-crypto-14';

export const ASSET_POOLS: Record<AssetPoolId, readonly string[]> = {
  'free-trio': ['BTC', 'ETH', 'SOL'],
  'free-desk': ['SPY', 'NVDA', 'AAPL'],
  'free-degen': ['BTC', 'ETH', 'DOGE'],
  'free-macro': ['GLD', 'SPY', 'BTC'],
  'free-tech': ['NVDA', 'META', 'AAPL'],
  'free-chaos': ['TSLA', 'BTC', 'SOL'],
  'crypto-five': ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP'],
  'crypto-mega': [
    'BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'LINK', 'AVAX', 'SUI', 'DOT', 'LTC', 'UNI', 'PEPE',
  ],
  'meme-five': ['DOGE', 'PEPE', 'BTC', 'ETH', 'SOL'],
  'tradfi-core': ['SPY', 'QQQ', 'AAPL', 'GOOGL', 'META', 'NVDA', 'TSLA'],
  'tradfi-hybrid': ['SPY', 'QQQ', 'AAPL', 'GOOGL', 'META', 'NVDA', 'TSLA', 'BTC', 'ETH', 'SOL'],
  'metals-macro': ['GLD', 'SLV', 'SPY', 'QQQ', 'BTC', 'ETH'],
  'tech-titans': ['NVDA', 'META', 'AAPL', 'TSLA', 'GOOGL', 'BTC', 'ETH'],
  'full-send-five': ['BTC', 'SOL', 'DOGE', 'NVDA', 'TSLA'],
  'triple-stack': ['BTC', 'ETH', 'SOL'],
  'triple-desk': ['SPY', 'NVDA', 'BTC'],
  'triple-degen': ['DOGE', 'PEPE', 'SOL'],
  'triple-macro': ['GLD', 'SLV', 'SPY'],
  'triple-tech': ['NVDA', 'META', 'AAPL'],
  'triple-chaos': ['TSLA', 'BTC', 'DOGE'],
  'triple-carnage': ['PEPE', 'DOGE', 'ETH'],
  'weekend-chaos': ['BTC', 'ETH', 'SOL', 'DOGE', 'PEPE', 'TSLA', 'SPY'],
  'ws-vs-crypto-14': [
    'SPY', 'QQQ', 'AAPL', 'GOOGL', 'META', 'NVDA', 'TSLA', 'GLD', 'SLV', 'BTC', 'ETH', 'SOL', 'DOGE', 'XRP',
  ],
};

export const POOL_LABELS: Record<AssetPoolId, string> = {
  'free-trio': 'Weekend Crypto (3)',
  'free-desk': 'Free Desk Trio',
  'free-degen': 'Free Degen Trio',
  'free-macro': 'Free Macro Trio',
  'free-tech': 'Free Tech Trio',
  'free-chaos': 'Free Chaos Trio',
  'crypto-five': 'Crypto Five',
  'crypto-mega': 'Mega Degen Tape',
  'meme-five': 'Meme Five',
  'tradfi-core': 'TradFi Board',
  'tradfi-hybrid': 'Suits + Size Hybrid',
  'metals-macro': 'Metals & Macro',
  'tech-titans': 'Tech Titans',
  'full-send-five': 'Full Send Five',
  'triple-stack': 'Triple Stack',
  'triple-desk': 'Desk Triple',
  'triple-degen': 'Degen Triple',
  'triple-macro': 'Macro Triple',
  'triple-tech': 'Tech Triple',
  'triple-chaos': 'Chaos Triple',
  'triple-carnage': 'Carnage Triple',
  'weekend-chaos': 'Weekend Chaos',
  'ws-vs-crypto-14': 'NYSE vs Chain (14)',
};

export const POOL_ASSET_COUNT: Record<AssetPoolId, number> = Object.fromEntries(
  Object.entries(ASSET_POOLS).map(([id, syms]) => [id, syms.length])
) as Record<AssetPoolId, number>;

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/**
 * Per-pit daily pool assignment (index 0 = Sunday).
 *
 * opening-bell     → free 3-asset tape rotates with weekday theme (crypto on weekends)
 * tradfi-vs-degen  → 14 rivalry board every day
 * gold-rush        → 6 metals/macro every day
 * triple-stack     → 3 themed triple rotates with weekday
 * meme-mayhem      → 5 meme / 13 mega Tue+Thu / 7 weekend
 * the-liquidation  → follows market-week theme (5→13 by day)
 * full-send        → 5 all-in, tech Thu, chaos Sat
 * weekend-carnage  → opens Sat — 7 chaos; lighter tapes other days
 */
const SLUG_DAY_POOL: Record<string, readonly AssetPoolId[]> = {
  'opening-bell': [
    'free-trio',   // Sun — weekend crypto
    'free-desk',   // Mon — desk
    'free-degen',  // Tue — degen
    'free-macro',  // Wed — macro
    'free-tech',   // Thu — tech
    'free-chaos',  // Fri — chaos
    'free-trio',   // Sat — weekend crypto
  ],

  'tradfi-vs-degen': Array(7).fill('ws-vs-crypto-14') as AssetPoolId[],

  'gold-rush': Array(7).fill('metals-macro') as AssetPoolId[],

  'triple-stack': [
    'triple-stack',   // Sun — recovery trio
    'triple-desk',    // Mon — desk
    'triple-degen',   // Tue — degen
    'triple-macro',   // Wed — macro
    'triple-tech',    // Thu — tech
    'triple-chaos',   // Fri — chaos
    'triple-carnage', // Sat — carnage
  ],

  'meme-mayhem': [
    'weekend-chaos',  // Sun
    'meme-five',      // Mon
    'crypto-mega',    // Tue — degen day headline
    'meme-five',      // Wed
    'crypto-mega',    // Thu
    'meme-five',      // Fri
    'weekend-chaos',  // Sat
  ],

  'the-liquidation': [
    'crypto-five',      // Sun
    'tradfi-hybrid',    // Mon — desk (10)
    'crypto-mega',      // Tue — degen (13)
    'metals-macro',     // Wed — macro (6)
    'tech-titans',      // Thu — tech (7)
    'tradfi-hybrid',    // Fri — OPEX (10)
    'crypto-mega',      // Sat
  ],

  'full-send': [
    'full-send-five',
    'full-send-five',
    'crypto-five',      // Tue — crypto full send
    'full-send-five',
    'tech-titans',      // Thu — tech heavy
    'full-send-five',
    'weekend-chaos',
  ],

  'weekend-carnage': [
    'crypto-five',      // Sun
    'tradfi-core',      // Mon — market week (pit scheduled for Sat open)
    'crypto-five',      // Tue
    'tradfi-core',      // Wed
    'crypto-five',      // Thu
    'weekend-chaos',    // Fri — pre-weekend warm-up
    'weekend-chaos',    // Sat — main event tape
  ],
};

export type PitAssetSchedule = {
  assets: string[];
  poolId: AssetPoolId;
  theme: string;
  dayName: string;
  assetCount: number;
  poolLabel: string;
};

export function getPoolForSlugDay(slug: string, dayIndex: number): AssetPoolId {
  const pools = SLUG_DAY_POOL[slug];
  return pools?.[dayIndex] ?? 'free-trio';
}

export function dayIndexFromDate(date: Date): number {
  return date.getDay();
}

export function getContestAssetSchedule(slug: string, date: Date = new Date()): PitAssetSchedule {
  if (isDailyPitSlug(slug)) {
    const day = dayIndexFromDate(date);
    const assets = [...DAILY_ASSETS];
    return {
      assets,
      poolId: 'tradfi-hybrid',
      theme: `${DAY_NAMES[day]} • Daily tape`,
      dayName: DAY_NAMES[day],
      assetCount: assets.length,
      poolLabel: 'Daily five',
    };
  }

  const day = dayIndexFromDate(date);
  const dayName = DAY_NAMES[day];
  const poolId = getPoolForSlugDay(slug, day);
  const assets = [...ASSET_POOLS[poolId]];
  const poolLabel = POOL_LABELS[poolId];

  return {
    assets,
    poolId,
    theme: `${dayName} • ${poolLabel}`,
    dayName,
    assetCount: assets.length,
    poolLabel,
  };
}

/** Resolve tradable tape from slug + pit open date (locks to the day the bell rang). */
export function resolveContestAssets(
  slug: string | undefined | null,
  startsAt?: string | Date | null,
  fallback: string[] = []
): PitAssetSchedule | null {
  if (!slug) {
    return fallback.length
      ? {
          assets: fallback,
          poolId: 'free-trio',
          theme: `Locked tape • ${fallback.length} names`,
          dayName: DAY_NAMES[dayIndexFromDate(new Date())],
          assetCount: fallback.length,
          poolLabel: 'Custom',
        }
      : null;
  }

  if (isDailyPitSlug(slug)) {
    const anchor = startsAt ? new Date(startsAt) : new Date();
    const dayName = DAY_NAMES[dayIndexFromDate(anchor)];
    const assets = [...DAILY_ASSETS];
    return {
      assets,
      poolId: 'tradfi-hybrid',
      theme: `${dayName} • Daily tape`,
      dayName,
      assetCount: assets.length,
      poolLabel: 'Daily five',
    };
  }

  const anchor = startsAt ? new Date(startsAt) : new Date();
  return getContestAssetSchedule(slug, anchor);
}

export function applyScheduleToContestAssets<T extends { slug?: string; assets: string[]; startsAt?: string | null }>(
  contest: T,
  date?: Date
): T & { assetTheme?: string; poolLabel?: string } {
  if (!contest.slug) return contest;

  const schedule = date
    ? getContestAssetSchedule(contest.slug, date)
    : resolveContestAssets(contest.slug, contest.startsAt, contest.assets);

  if (!schedule) return contest;

  return {
    ...contest,
    assets: schedule.assets,
    assetTheme: schedule.theme,
    poolLabel: schedule.poolLabel,
  };
}

export function describeContestTape(
  slug: string | undefined,
  assets: string[],
  startsAt?: string | null
): string {
  if (!slug || !assets.length) return `${assets.length} on tape`;

  const schedule = resolveContestAssets(slug, startsAt, assets);
  if (!schedule) return `${assets.length} on tape`;

  const scheduled = new Set(schedule.assets);
  const current = new Set(assets);
  const matches =
    scheduled.size === current.size && [...scheduled].every((sym) => current.has(sym));

  if (matches) return schedule.theme;
  return `${schedule.poolLabel} • ${assets.length} names`;
}

/** Full week matrix for a single pit (planning UI, admin). */
export function getPitWeekMatrix(slug: string): PitAssetSchedule[] {
  return DAY_NAMES.map((_, dayIndex) => {
    const fakeDate = new Date();
    const offset = dayIndex - fakeDate.getDay();
    fakeDate.setDate(fakeDate.getDate() + offset);
    return getContestAssetSchedule(slug, fakeDate);
  });
}

/** All symbols we may need prices for across the weekly rotation. */
export function getAllSchedulableSymbols(): string[] {
  const set = new Set<string>();
  Object.values(ASSET_POOLS).forEach((pool) => pool.forEach((s) => set.add(s)));
  return [...set];
}

/** Floor tape order for the Arena ticker — every tradable symbol, majors first. */
const ARENA_TAPE_SYMBOL_ORDER = [
  'BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'LINK', 'AVAX', 'SUI', 'DOT', 'LTC', 'UNI', 'PEPE',
  'SPY', 'QQQ', 'AAPL', 'GOOGL', 'META', 'NVDA', 'TSLA', 'GLD', 'SLV',
] as const;

export function getOrderedArenaTapeSymbols(): string[] {
  const all = new Set(getAllSchedulableSymbols());
  const ordered = ARENA_TAPE_SYMBOL_ORDER.filter((s) => all.has(s));
  const orderedSet = new Set<string>(ordered);
  const rest = [...all].filter((s) => !orderedSet.has(s)).sort();
  return [...ordered, ...rest];
}