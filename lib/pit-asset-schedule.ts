/**
 * TradR Pit weekly asset tape — each pit type has a deliberate daily lineup.
 * Free pit stays lean (3 blue-chip crypto). Paid pits widen the tape by theme.
 */

export type AssetPoolId =
  | 'free-trio'
  | 'crypto-five'
  | 'crypto-mega'
  | 'tradfi-core'
  | 'tradfi-hybrid'
  | 'metals-macro'
  | 'tech-titans'
  | 'full-send-five'
  | 'triple-stack'
  | 'weekend-chaos'
  | 'rivalry-split';

export const ASSET_POOLS: Record<AssetPoolId, readonly string[]> = {
  'free-trio': ['BTC', 'ETH', 'SOL'],
  'crypto-five': ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP'],
  'crypto-mega': [
    'BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'LINK', 'AVAX', 'SUI', 'DOT', 'LTC', 'UNI', 'PEPE',
  ],
  'tradfi-core': ['SPY', 'QQQ', 'AAPL', 'GOOGL', 'META', 'NVDA', 'TSLA'],
  'tradfi-hybrid': ['SPY', 'QQQ', 'AAPL', 'GOOGL', 'META', 'NVDA', 'TSLA', 'BTC', 'ETH', 'SOL'],
  'metals-macro': ['GLD', 'SLV', 'SPY', 'QQQ', 'BTC', 'ETH'],
  'tech-titans': ['NVDA', 'META', 'AAPL', 'TSLA', 'GOOGL', 'BTC', 'ETH'],
  'full-send-five': ['BTC', 'SOL', 'DOGE', 'NVDA', 'TSLA'],
  'triple-stack': ['NVDA', 'BTC', 'ETH'],
  'weekend-chaos': ['BTC', 'ETH', 'SOL', 'DOGE', 'PEPE', 'TSLA', 'SPY'],
  'rivalry-split': ['SPY', 'QQQ', 'NVDA', 'TSLA', 'BTC', 'ETH', 'SOL', 'DOGE'],
};

export const POOL_LABELS: Record<AssetPoolId, string> = {
  'free-trio': 'Blue-Chip Crypto',
  'crypto-five': 'Crypto Five',
  'crypto-mega': 'Mega Degen Tape',
  'tradfi-core': 'TradFi Board',
  'tradfi-hybrid': 'Suits + Size',
  'metals-macro': 'Metals & Macro',
  'tech-titans': 'Tech Titans',
  'full-send-five': 'Full Send Five',
  'triple-stack': 'Triple Stack',
  'weekend-chaos': 'Weekend Chaos',
  'rivalry-split': 'NYSE vs Chain',
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/** Which asset pool each pit uses on each day of week (0 = Sunday). */
const SLUG_DAY_POOL: Record<string, readonly AssetPoolId[]> = {
  'opening-bell': Array(7).fill('free-trio') as AssetPoolId[],
  'the-liquidation': [
    'crypto-five',      // Sun — lighter weekend tape
    'tradfi-hybrid',    // Mon — desk open energy
    'crypto-mega',      // Tue — degen day
    'metals-macro',     // Wed — macro + metals
    'tech-titans',      // Thu — earnings brain
    'tradfi-hybrid',    // Fri — OPEX vibes
    'crypto-mega',      // Sat — off-hours animals
  ],
  'full-send': [
    'full-send-five',
    'full-send-five',
    'crypto-five',
    'full-send-five',
    'tech-titans',
    'full-send-five',
    'weekend-chaos',
  ],
  'triple-stack': [
    'triple-stack',
    'triple-stack',
    'triple-stack',
    'triple-stack',
    'triple-stack',
    'triple-stack',
    'triple-stack',
  ],
  'weekend-carnage': [
    'crypto-five',
    'tradfi-core',
    'tradfi-core',
    'tradfi-core',
    'tradfi-core',
    'weekend-chaos',
    'weekend-chaos',
  ],
  'tradfi-vs-degen': Array(7).fill('rivalry-split') as AssetPoolId[],
};

export type PitAssetSchedule = {
  assets: string[];
  poolId: AssetPoolId;
  theme: string;
  dayName: string;
};

export function getContestAssetSchedule(slug: string, date: Date = new Date()): PitAssetSchedule {
  const day = date.getDay();
  const dayName = DAY_NAMES[day];
  const pools = SLUG_DAY_POOL[slug];
  const poolId = pools?.[day] ?? 'free-trio';
  const assets = [...ASSET_POOLS[poolId]];
  const label = POOL_LABELS[poolId];

  return {
    assets,
    poolId,
    theme: `${dayName} • ${label}`,
    dayName,
  };
}

export function applyScheduleToContestAssets<T extends { slug?: string; assets: string[] }>(
  contest: T,
  date?: Date
): T & { assetTheme?: string } {
  if (!contest.slug) return contest;
  const schedule = getContestAssetSchedule(contest.slug, date);
  return {
    ...contest,
    assets: schedule.assets,
    assetTheme: schedule.theme,
  };
}

export function describeContestTape(slug: string | undefined, assets: string[]): string {
  if (!slug || !assets.length) return `${assets.length} on tape`;
  const schedule = getContestAssetSchedule(slug);
  const scheduled = new Set(schedule.assets);
  const current = new Set(assets);
  const matches =
    scheduled.size === current.size && [...scheduled].every((sym) => current.has(sym));
  if (matches) return schedule.theme;
  return `Locked tape • ${assets.length} names`;
}

/** All symbols we may need prices for across the weekly rotation. */
export function getAllSchedulableSymbols(): string[] {
  const set = new Set<string>();
  Object.values(ASSET_POOLS).forEach((pool) => pool.forEach((s) => set.add(s)));
  return [...set];
}