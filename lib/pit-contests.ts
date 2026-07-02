import {
  Contest,
  DbContest,
  dbContestToContest,
  formatContestDate,
  formatTimeLeft,
} from './game-types';
import { isContestTradingOpen, isJoinAllowed, startsMsRemaining, isContestStarted } from './contest-bell';
import { getContestDurationHours } from './contest-rules';
import {
  applyScheduleToContestAssets,
  describeContestTape,
  resolveContestAssets,
} from './pit-asset-schedule';
import { getCatalogPayoutFields, PIT_PAYOUT_BY_SLUG } from './pit-payouts';
import { computeEffectivePool, getLiveFirstPrize } from './pit-pool-math';
import { buildDemoPitWindow } from './pit-schedule';
import {
  DAILY_ASSETS,
  DAILY_ENTRY_FEE,
  DAILY_PIT_SLUG,
} from './daily-pit-config';

/** @deprecated Use DAILY_PIT_SLUG — kept for legacy imports */
export const OPENING_BELL_SLUG = DAILY_PIT_SLUG;

const CATALOG_SPECS = [
  {
    slug: DAILY_PIT_SLUG,
    title: 'Daily Pit',
    tagline: '$5 entry · top half cash · pool grows with the room.',
    entryFee: DAILY_ENTRY_FEE,
    assets: [...DAILY_ASSETS],
    badge: 'DAILY',
  },
] as const;

export const PIT_CONTEST_CATALOG = CATALOG_SPECS.map((spec) => {
  const catalog = getCatalogPayoutFields(spec.slug);
  const atMin = { entryFee: spec.entryFee, participantCount: catalog.minEntries };
  return {
    ...spec,
    ...catalog,
    firstPrize: getLiveFirstPrize(spec.slug, atMin),
    totalPrizes: computeEffectivePool(spec.slug, atMin),
    totalPrizesMax: catalog.totalPrizesMax,
  };
});

const LEGACY_TITLE_MAP: Record<string, string> = {
  'Daily Pit': DAILY_PIT_SLUG,
  'Opening Bell Pit': DAILY_PIT_SLUG,
  'Opening Bell Bloodbath': DAILY_PIT_SLUG,
  'First Candle Free-For-All': DAILY_PIT_SLUG,
  'Macro Royale': DAILY_PIT_SLUG,
  'The Liquidation': DAILY_PIT_SLUG,
  'Liquidation Lounge': DAILY_PIT_SLUG,
};

export type PitCatalogEntry = (typeof PIT_CONTEST_CATALOG)[number];

export function getCatalogBySlug(slug: string): PitCatalogEntry | undefined {
  return PIT_CONTEST_CATALOG.find((c) => c.slug === slug);
}

export function isDailyPitContest(contest: { slug?: string; title?: string }): boolean {
  if (contest.slug === DAILY_PIT_SLUG) return true;
  return (
    contest.title === 'Daily Pit' ||
    contest.title === 'Opening Bell Bloodbath' ||
    contest.title === 'Opening Bell Pit'
  );
}

/** @deprecated */
export const isOpeningBellContest = isDailyPitContest;

type DailyPitLike = {
  id?: number;
  slug?: string;
  title?: string;
  status?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  entryFee?: number;
};

function dailyPitPickScore(contest: DailyPitLike): number {
  const id = contest.id ?? 0;
  const clock = contest as Pick<Contest, 'status' | 'endsAt' | 'startsAt' | 'slug'>;
  if (isContestTradingOpen(clock)) return 2_000_000 + id;
  if (isContestStarted(clock)) return 1_000_000 + id;
  const opensIn = startsMsRemaining(clock);
  if (opensIn != null && isJoinAllowed(clock)) {
    return 500_000 - Math.min(Math.floor(opensIn / 1000), 499_999) + id * 0.0001;
  }
  return id;
}

/** Canonical open daily pit — daily-pit slug only; prefers trading > active > joinable. */
export function findDailyPitContest<T extends DailyPitLike>(contests: T[]): T | undefined {
  const daily = contests.filter((c) => isDailyPitContest(c) && c.status !== 'closed');
  if (!daily.length) return undefined;
  const paid = daily.filter((c) => Number(c.entryFee ?? 0) > 0);
  const pool = paid.length ? paid : daily;
  return pool.reduce((best, c) => (dailyPitPickScore(c) > dailyPitPickScore(best) ? c : best));
}

/** @deprecated */
export const findOpeningBellContest = findDailyPitContest;

export function formatVaultPitPickerLabel(contest: Pick<Contest, 'title' | 'slug' | 'startsAt'>): string {
  const day = contest.startsAt
    ? new Date(contest.startsAt).toLocaleDateString('en-US', { weekday: 'short' })
    : '';
  return day ? `${contest.title} · ${day}` : contest.title;
}

export function isStaleOpeningBellContest(
  contest: DailyPitLike,
  canonical?: DailyPitLike | null
): boolean {
  if (contest.status === 'closed') return false;
  if (!canonical?.id || !contest.id) return false;
  return contest.id !== canonical.id;
}

export function resolveCatalogSlug(row: { slug?: string | null; title?: string }): string | undefined {
  if (row.slug) return PIT_PAYOUT_BY_SLUG[row.slug] ? DAILY_PIT_SLUG : row.slug;
  if (row.title && LEGACY_TITLE_MAP[row.title]) return LEGACY_TITLE_MAP[row.title];
  return DAILY_PIT_SLUG;
}

export function enrichContest(contest: Contest, meta?: PitCatalogEntry | null): Contest {
  const legacySlug = contest.title ? LEGACY_TITLE_MAP[contest.title] : undefined;
  const m =
    meta ||
    (contest.slug ? getCatalogBySlug(contest.slug) : undefined) ||
    (legacySlug ? getCatalogBySlug(legacySlug) : undefined) ||
    PIT_CONTEST_CATALOG[0];
  const slug = DAILY_PIT_SLUG;
  const catalogAssets = [...m.assets];
  const scheduled =
    slug === DAILY_PIT_SLUG
      ? { ...contest, slug, assets: catalogAssets }
      : applyScheduleToContestAssets({ ...contest, slug });
  const entryFee = Math.max(DAILY_ENTRY_FEE, Number(contest.entryFee ?? m.entryFee));
  return {
    ...scheduled,
    title: m.title,
    slug,
    tagline: m.tagline,
    badge: m.badge,
    entryFee,
    firstPrize: m.firstPrize,
    totalPrizes: m.totalPrizes,
    maxEntries: m.maxEntries,
    assetTheme: describeContestTape(slug, scheduled.assets, contest.startsAt),
  };
}

export function dbContestToEnrichedContest(row: DbContest): Contest {
  const base = dbContestToContest(row);
  const catalogSlug = resolveCatalogSlug(row);
  const meta = catalogSlug ? getCatalogBySlug(catalogSlug) : PIT_CONTEST_CATALOG[0];
  return enrichContest(base, meta);
}

export function dbRowToPitContest(row: DbContest): Contest {
  return dbContestToEnrichedContest(row);
}

export function buildDemoPitContests(): Contest[] {
  return PIT_CONTEST_CATALOG.map((spec, catalogIndex) => {
    const window = buildDemoPitWindow(spec.slug, catalogIndex);
    const schedule = resolveContestAssets(spec.slug, window.startsAt, [...spec.assets]);
    const assets = schedule?.assets ?? [...spec.assets];
    const endsAt = window.endsAt.toISOString();
    return enrichContest({
      id: spec.slug === DAILY_PIT_SLUG ? 1 : 0,
      title: spec.title,
      slug: spec.slug,
      tagline: spec.tagline,
      badge: spec.badge,
      entryFee: spec.entryFee,
      firstPrize: spec.firstPrize,
      totalPrizes: spec.totalPrizes,
      maxEntries: spec.maxEntries,
      entries: 0,
      status: window.status,
      startingPortfolioValue: 100_000,
      assets,
      date: formatContestDate(endsAt),
      timeLeft: formatTimeLeft(endsAt, window.status),
      endsAt,
      startsAt: window.startsAt.toISOString(),
      assetTheme: describeContestTape(spec.slug, assets, window.startsAt.toISOString()),
    });
  });
}

export const buildDemoContests = buildDemoPitContests;