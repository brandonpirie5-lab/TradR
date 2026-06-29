import type { CSSProperties } from 'react';
import { PIT_CONTEST_CATALOG } from './pit-contests';
import {
  ASSET_POOLS,
  DAY_NAMES,
  POOL_LABELS,
  getPoolForSlugDay,
  type AssetPoolId,
} from './pit-asset-schedule';

export type DayTheme = {
  dayIndex: number;
  dayName: (typeof DAY_NAMES)[number];
  word: string;
  tagline: string;
  tapePoolId: AssetPoolId;
  tapeLabel: string;
};

/** One-word market-week rhythm — day-first, pit-second. */
export const DAY_THEMES: readonly DayTheme[] = [
  {
    dayIndex: 0,
    dayName: 'Sunday',
    word: 'Recovery',
    tagline: 'Off-hours tape. Sleep is optional.',
    tapePoolId: 'weekend-chaos',
    tapeLabel: POOL_LABELS['weekend-chaos'],
  },
  {
    dayIndex: 1,
    dayName: 'Monday',
    word: 'Desk',
    tagline: 'NYSE opens. Suits vs. degens.',
    tapePoolId: 'ws-vs-crypto-14',
    tapeLabel: POOL_LABELS['ws-vs-crypto-14'],
  },
  {
    dayIndex: 2,
    dayName: 'Tuesday',
    word: 'Degen',
    tagline: 'Mega tape. Maximum cope.',
    tapePoolId: 'crypto-mega',
    tapeLabel: POOL_LABELS['crypto-mega'],
  },
  {
    dayIndex: 3,
    dayName: 'Wednesday',
    word: 'Macro',
    tagline: 'Metals, indices, big picture.',
    tapePoolId: 'metals-macro',
    tapeLabel: POOL_LABELS['metals-macro'],
  },
  {
    dayIndex: 4,
    dayName: 'Thursday',
    word: 'Tech',
    tagline: 'Earnings brain. Stack discipline.',
    tapePoolId: 'tech-titans',
    tapeLabel: POOL_LABELS['tech-titans'],
  },
  {
    dayIndex: 5,
    dayName: 'Friday',
    word: 'Chaos',
    tagline: 'OPEX vibes. Full port disorder.',
    tapePoolId: 'full-send-five',
    tapeLabel: POOL_LABELS['full-send-five'],
  },
  {
    dayIndex: 6,
    dayName: 'Saturday',
    word: 'Carnage',
    tagline: 'Weekend slaughter. No mercy.',
    tapePoolId: 'weekend-chaos',
    tapeLabel: POOL_LABELS['weekend-chaos'],
  },
] as const;

/** Main-event pit slugs per weekday — fight-card headlines. */
export const FEATURED_PIT_BY_DAY: Record<number, { main: string; coMain?: string }> = {
  0: { main: 'meme-mayhem', coMain: 'weekend-carnage' },
  1: { main: 'tradfi-vs-degen', coMain: 'the-liquidation' },
  2: { main: 'meme-mayhem', coMain: 'the-liquidation' },
  3: { main: 'gold-rush', coMain: 'the-liquidation' },
  4: { main: 'triple-stack', coMain: 'full-send' },
  5: { main: 'full-send', coMain: 'the-liquidation' },
  6: { main: 'weekend-carnage', coMain: 'meme-mayhem' },
};

/** Per-weekday accent RGB for ribbon / today block theming */
export const DAY_THEME_ACCENTS: Record<number, string> = {
  0: '125, 211, 252', // Recovery — cool blue
  1: '234, 179, 8', // Desk — gold
  2: '192, 132, 252', // Degen — violet
  3: '251, 146, 60', // Macro — amber
  4: '56, 189, 248', // Tech — cyan
  5: '248, 113, 113', // Chaos — coral
  6: '239, 68, 68', // Carnage — red
};

export function getDayThemeAccentRgb(dayIndex: number): string {
  return DAY_THEME_ACCENTS[dayIndex] ?? DAY_THEME_ACCENTS[1];
}

export function getDayThemeStyle(dayIndex: number): CSSProperties {
  const rgb = getDayThemeAccentRgb(dayIndex);
  return {
    '--day-accent-rgb': rgb,
    '--day-accent': `rgb(${rgb})`,
    '--day-accent-soft': `rgba(${rgb}, 0.1)`,
    '--day-accent-mid': `rgba(${rgb}, 0.22)`,
    '--day-accent-glow': `rgba(${rgb}, 0.35)`,
  } as React.CSSProperties;
}

export function getDayTheme(dayIndex: number): DayTheme {
  return DAY_THEMES[dayIndex] ?? DAY_THEMES[1];
}

export function getTodayTheme(date: Date = new Date()): DayTheme {
  return getDayTheme(date.getDay());
}

export function isFeaturedPit(
  slug: string | undefined | null,
  dayIndex: number
): 'main' | 'co' | null {
  if (!slug) return null;
  const featured = FEATURED_PIT_BY_DAY[dayIndex];
  if (!featured) return null;
  if (slug === featured.main) return 'main';
  if (slug === featured.coMain) return 'co';
  return null;
}

export function featuredPitSortScore(slug: string | undefined | null, dayIndex: number): number {
  const role = isFeaturedPit(slug, dayIndex);
  if (role === 'main') return 0;
  if (role === 'co') return 1;
  if (slug === 'opening-bell') return 2;
  return 3;
}

export type ContestTapeInfo = {
  slug: string;
  poolId: AssetPoolId;
  poolLabel: string;
  assets: string[];
  topAssets: string[];
  assetCount: number;
  tapeLine: string;
};

export function getContestTapeInfo(slug: string | undefined, dayIndex: number): ContestTapeInfo | null {
  if (!slug) return null;
  const poolId = getPoolForSlugDay(slug, dayIndex);
  const assets = [...ASSET_POOLS[poolId]];
  const poolLabel = POOL_LABELS[poolId];
  const topAssets = assets.slice(0, 4);
  const extra = assets.length - topAssets.length;
  const tapeLine =
    extra > 0
      ? `${poolLabel} · ${topAssets.join(' ')} +${extra}`
      : `${poolLabel} · ${topAssets.join(' ')}`;

  return {
    slug,
    poolId,
    poolLabel,
    assets,
    topAssets,
    assetCount: assets.length,
    tapeLine,
  };
}

export function getCatalogTitle(slug: string): string {
  return PIT_CONTEST_CATALOG.find((c) => c.slug === slug)?.title ?? slug;
}

export function isWeekendDay(dayIndex: number): boolean {
  return dayIndex === 0 || dayIndex === 6;
}