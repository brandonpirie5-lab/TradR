import { OPENING_BELL_SLUG, PIT_CONTEST_CATALOG } from './pit-contests';
import { ASSET_POOLS, DAY_NAMES, getPoolForSlugDay } from './pit-asset-schedule';
import {
  FEATURED_PIT_BY_DAY,
  getCatalogTitle,
  getContestTapeInfo,
  getDayTheme,
  isFeaturedPit,
  type DayTheme,
} from './tape-week';

export type WeekContestPreview = {
  slug: string;
  title: string;
  tagline: string;
  badge: string;
  entryFee: number;
  firstPrize: number;
  totalPrizes: number;
  payoutLabel: string;
  payoutHook: string;
  minEntries: number;
  maxEntries: number;
  poolLabel: string;
  poolId: string;
  assetCount: number;
  topAssets: string[];
  allAssets: string[];
  tapeLine: string;
  featured: 'main' | 'co' | false;
};

export type DayPreview = {
  dayIndex: number;
  dayName: string;
  isToday: boolean;
  theme: DayTheme;
  tapeOfDay: { label: string; assets: string[] };
  mainEvent: WeekContestPreview | null;
  coMainEvent: WeekContestPreview | null;
  /** Daily fight card: free Opening Bell + today's main paid pit */
  slate: WeekContestPreview[];
  contests: WeekContestPreview[];
  supportingCount: number;
};

function buildContestPreview(
  slug: string,
  title: string,
  tagline: string,
  badge: string,
  entryFee: number,
  firstPrize: number,
  totalPrizes: number,
  payoutLabel: string,
  payoutHook: string,
  minEntries: number,
  maxEntries: number,
  dayIndex: number
): WeekContestPreview {
  const tape = getContestTapeInfo(slug, dayIndex)!;
  const featured = isFeaturedPit(slug, dayIndex);
  return {
    slug,
    title,
    tagline,
    badge,
    entryFee,
    firstPrize,
    totalPrizes,
    payoutLabel,
    payoutHook,
    minEntries,
    maxEntries,
    poolLabel: tape.poolLabel,
    poolId: tape.poolId,
    assetCount: tape.assetCount,
    topAssets: tape.topAssets,
    allAssets: tape.assets,
    tapeLine: tape.tapeLine,
    featured: featured ?? false,
  };
}

export function getWeekPreview(anchor: Date = new Date()): DayPreview[] {
  const today = anchor.getDay();

  return DAY_NAMES.map((dayName, dayIndex) => {
    const theme = getDayTheme(dayIndex);
    const tapeAssets = [...ASSET_POOLS[theme.tapePoolId]];

    const contests = PIT_CONTEST_CATALOG.map((c) =>
      buildContestPreview(
        c.slug,
        c.title,
        c.tagline,
        c.badge,
        c.entryFee,
        c.firstPrize,
        c.totalPrizes,
        c.payoutLabel,
        c.payoutHook,
        c.minEntries,
        c.maxEntries,
        dayIndex
      )
    ).sort((a, b) => {
      const order = (f: WeekContestPreview['featured']) => (f === 'main' ? 0 : f === 'co' ? 1 : 2);
      const diff = order(a.featured) - order(b.featured);
      if (diff !== 0) return diff;
      return b.firstPrize - a.firstPrize;
    });

    const featured = FEATURED_PIT_BY_DAY[dayIndex];
    const mainEvent = featured
      ? contests.find((c) => c.slug === featured.main) ?? null
      : null;
    const coMainEvent = featured?.coMain
      ? contests.find((c) => c.slug === featured.coMain) ?? null
      : null;

    const supportingCount = contests.filter((c) => !c.featured).length;

    const openingBell = contests.find((c) => c.slug === OPENING_BELL_SLUG) ?? null;
    const slate = [openingBell, mainEvent].filter((c): c is WeekContestPreview => c != null);

    return {
      dayIndex,
      dayName,
      isToday: dayIndex === today,
      theme,
      tapeOfDay: { label: theme.tapeLabel, assets: tapeAssets.slice(0, 5) },
      mainEvent,
      coMainEvent,
      slate,
      contests,
      supportingCount,
    };
  });
}

export function getTodayPreview(anchor: Date = new Date()): DayPreview {
  return getWeekPreview(anchor).find((d) => d.isToday) ?? getWeekPreview(anchor)[0];
}

export function isPlanningWindow(date: Date = new Date()): boolean {
  const day = date.getDay();
  return day === 0 || day === 1;
}

export function resolveSlugTitle(slug: string): string {
  return getCatalogTitle(slug);
}

/** Re-export for contest cards that only know pool id */
export { getPoolForSlugDay };