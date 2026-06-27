import { Contest, DbContest, dbContestToContest } from './game-types';
import { describeContestTape, getContestAssetSchedule } from './pit-asset-schedule';

export const OPENING_BELL_SLUG = 'opening-bell';

/** TradR Pit contest lineup — slang-forward, funny, unmistakably ours. */
export const PIT_CONTEST_CATALOG = [
  {
    slug: OPENING_BELL_SLUG,
    title: 'First Candle Free-For-All',
    tagline: 'No buy-in. Full ego. Bell rings — someone gets humbled.',
    entryFee: 0,
    firstPrize: 50,
    totalPrizes: 200,
    maxEntries: 500,
    assets: ['BTC', 'ETH', 'SOL'],
    badge: 'FREE TAPE',
  },
  {
    slug: 'the-liquidation',
    title: 'Margin Called',
    tagline: '$5 in. Thin book, thick coping. The bell takes no prisoners.',
    entryFee: 5,
    firstPrize: 125,
    totalPrizes: 500,
    maxEntries: 120,
    assets: ['SPY', 'QQQ', 'NVDA', 'BTC', 'ETH'],
    badge: 'DAILY REKT',
  },
  {
    slug: 'full-send',
    title: 'Full Port Disorder',
    tagline: 'Diversification is banned. Size is the whole strategy.',
    entryFee: 10,
    firstPrize: 200,
    totalPrizes: 440,
    maxEntries: 55,
    assets: ['AAPL', 'TSLA', 'BTC', 'SOL', 'DOGE'],
    badge: 'ALL IN',
  },
  {
    slug: 'triple-stack',
    title: 'Triple Stack Therapy',
    tagline: 'Three tickers. One fragile trader. Stack or spiral.',
    entryFee: 10,
    firstPrize: 180,
    totalPrizes: 400,
    maxEntries: 80,
    assets: ['NVDA', 'META', 'BTC'],
    badge: '3-BAG MAX',
  },
  {
    slug: 'weekend-carnage',
    title: 'Saturday Slaughterhouse',
    tagline: 'Your plans can wait. Weekend candles hit different.',
    entryFee: 10,
    firstPrize: 250,
    totalPrizes: 600,
    maxEntries: 100,
    assets: ['SPY', 'TSLA', 'BTC', 'ETH', 'SOL'],
    badge: 'OFF-HOURS',
  },
  {
    slug: 'tradfi-vs-degen',
    title: 'Suits vs. Size',
    tagline: 'Macro on SPY. Vibes on SOL. Same bell, different damage.',
    entryFee: 5,
    firstPrize: 85,
    totalPrizes: 380,
    maxEntries: 150,
    assets: ['SPY', 'META', 'BTC', 'ETH', 'SOL'],
    badge: 'RIVAL PIT',
  },
] as const;

/** Old DB / SwapRoyale-era titles → slug (keeps participations linked). */
const LEGACY_TITLE_MAP: Record<string, string> = {
  'Macro Royale': 'the-liquidation',
  'Double Up': 'full-send',
  'Wall Street vs Crypto': 'tradfi-vs-degen',
  'Opening Bell Pit': OPENING_BELL_SLUG,
  'The Liquidation': 'the-liquidation',
  'Full Send Pit': 'full-send',
  'Triple Stack Pit': 'triple-stack',
  'Weekend Carnage': 'weekend-carnage',
  'TradFi vs Degen Pit': 'tradfi-vs-degen',
};

export type PitCatalogEntry = (typeof PIT_CONTEST_CATALOG)[number];

export function getCatalogBySlug(slug: string): PitCatalogEntry | undefined {
  return PIT_CONTEST_CATALOG.find((c) => c.slug === slug);
}

export function isOpeningBellContest(contest: { slug?: string; title?: string }): boolean {
  return (
    contest.slug === OPENING_BELL_SLUG ||
    contest.title === 'First Candle Free-For-All' ||
    contest.title === 'Opening Bell Pit'
  );
}

export function resolveCatalogSlug(row: { slug?: string | null; title?: string }): string | undefined {
  if (row.slug) return row.slug;
  if (row.title && LEGACY_TITLE_MAP[row.title]) return LEGACY_TITLE_MAP[row.title];
  const byTitle = PIT_CONTEST_CATALOG.find((c) => c.title === row.title);
  return byTitle?.slug;
}

export function enrichContest(contest: Contest, meta?: PitCatalogEntry | null): Contest {
  const legacySlug = contest.title ? LEGACY_TITLE_MAP[contest.title] : undefined;
  const m =
    meta ||
    (contest.slug ? getCatalogBySlug(contest.slug) : undefined) ||
    (legacySlug ? getCatalogBySlug(legacySlug) : undefined) ||
    PIT_CONTEST_CATALOG.find((c) => c.title === contest.title);
  if (!m) return contest;

  const isLegacy = !!legacySlug;

  const slug = contest.slug || m.slug;
  return {
    ...contest,
    title: m.title,
    slug,
    tagline: m.tagline,
    badge: m.badge,
    entryFee: isLegacy ? m.entryFee : contest.entryFee,
    firstPrize: isLegacy ? m.firstPrize : contest.firstPrize,
    totalPrizes: isLegacy ? m.totalPrizes : contest.totalPrizes,
    assetTheme: describeContestTape(slug, contest.assets),
  };
}

export function dbRowToPitContest(row: DbContest): Contest {
  const slug = resolveCatalogSlug(row);
  const meta = slug ? getCatalogBySlug(slug) : undefined;
  const base = dbContestToContest(row);
  const enriched = enrichContest(
    {
      ...base,
      slug: row.slug || slug || undefined,
      tagline: row.tagline || undefined,
      badge: row.badge || undefined,
    },
    meta
  );
  return {
    ...enriched,
    assetTheme: describeContestTape(enriched.slug, enriched.assets),
  };
}

/** Local/demo fallback when Supabase is offline */
export function buildDemoContests(): Contest[] {
  const now = Date.now();
  const today = new Date();
  return PIT_CONTEST_CATALOG.map((c, i) => {
    const endsAt = new Date(now + (i === 0 ? 20 : 18 + i * 2) * 60 * 60 * 1000).toISOString();
    const schedule = getContestAssetSchedule(c.slug, today);
    return enrichContest({
      id: i + 1,
      title: c.title,
      slug: c.slug,
      tagline: c.tagline,
      badge: c.badge,
      date: new Date(endsAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      entryFee: c.entryFee,
      firstPrize: c.firstPrize,
      totalPrizes: c.totalPrizes,
      entries: [124, 47, 12, 28, 67, 89][i] ?? 20,
      maxEntries: c.maxEntries,
      timeLeft: 'OPEN',
      assets: schedule.assets,
      assetTheme: schedule.theme,
      status: 'open',
      startingPortfolioValue: 100000,
      endsAt,
    });
  });
}