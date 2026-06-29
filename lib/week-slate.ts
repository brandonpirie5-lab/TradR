import { SupabaseClient } from '@supabase/supabase-js';
import { Contest } from './game-types';
import { getContestDurationHours } from './contest-rules';
import { getContestAssetSchedule } from './pit-asset-schedule';
import { OPENING_BELL_SLUG, PIT_CONTEST_CATALOG, getCatalogBySlug } from './pit-contests';
import { FEATURED_PIT_BY_DAY } from './tape-week';
import { getNextPitStart } from './pit-schedule';

function daysUntil(fromDay: number, targetDay: number): number {
  return (targetDay - fromDay + 7) % 7;
}

/** Pit open time for a specific weekday in the current week window. */
export function getWeekdayPitStart(slug: string, dayIndex: number, now = new Date()): Date {
  const today = now.getDay();
  const offset = daysUntil(today, dayIndex);
  const anchor = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
  anchor.setHours(0, 0, 0, 0);
  const start = getNextPitStart(slug, new Date(anchor.getTime() + 12 * 60 * 60 * 1000));
  if (start.getDay() === dayIndex) return start;
  return getNextPitStart(slug, anchor);
}

export function getDaySlateSlugs(dayIndex: number): string[] {
  const featured = FEATURED_PIT_BY_DAY[dayIndex];
  const slugs: string[] = [OPENING_BELL_SLUG];
  if (featured?.main) slugs.push(featured.main);
  return slugs;
}

export function buildSlatePitWindow(slug: string, dayIndex: number, now = new Date()) {
  const startsAt = getWeekdayPitStart(slug, dayIndex, now);
  const hours = getContestDurationHours(slug);
  const endsAt = new Date(startsAt.getTime() + hours * 60 * 60 * 1000);
  const active = startsAt.getTime() <= now.getTime() && endsAt.getTime() > now.getTime();
  return {
    startsAt,
    endsAt,
    status: (active ? 'active' : 'open') as 'open' | 'active',
  };
}

export function contestMatchesSlug(
  contest: Pick<Contest, 'slug' | 'title'>,
  slug: string
): boolean {
  if (contest.slug === slug) return true;
  const catalog = getCatalogBySlug(slug);
  return catalog?.title === contest.title;
}

export function contestOnWeekday(
  contest: Pick<Contest, 'startsAt'>,
  dayIndex: number,
  now = new Date()
): boolean {
  if (!contest.startsAt) return dayIndex === now.getDay();
  return new Date(contest.startsAt).getDay() === dayIndex;
}

export function findSlateContestInPool(
  contests: Contest[],
  slug: string,
  dayIndex: number,
  now = new Date()
): Contest | null {
  const pool = contests.filter((c) => contestMatchesSlug(c, slug) && c.status !== 'closed');
  if (!pool.length) return null;

  const targetMs = getWeekdayPitStart(slug, dayIndex, now).getTime();

  return [...pool].sort((a, b) => {
    const aDay = contestOnWeekday(a, dayIndex, now) ? 0 : 1;
    const bDay = contestOnWeekday(b, dayIndex, now) ? 0 : 1;
    if (aDay !== bDay) return aDay - bDay;
    const aMs = a.startsAt ? new Date(a.startsAt).getTime() : 0;
    const bMs = b.startsAt ? new Date(b.startsAt).getTime() : 0;
    return Math.abs(aMs - targetMs) - Math.abs(bMs - targetMs);
  })[0];
}

export type WeekSlateSpawnResult = {
  slug: string;
  dayIndex: number;
  action: 'created' | 'exists' | 'skipped';
  contestId?: number;
};

export async function ensureWeekSlateContests(
  admin: SupabaseClient,
  now = new Date()
): Promise<WeekSlateSpawnResult[]> {
  const results: WeekSlateSpawnResult[] = [];

  const { data: openRows } = await admin
    .from('contests')
    .select('id, slug, title, status, starts_at')
    .neq('status', 'closed');

  const openPool = openRows ?? [];

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    for (const slug of getDaySlateSlugs(dayIndex)) {
      const template = getCatalogBySlug(slug);
      if (!template) {
        results.push({ slug, dayIndex, action: 'skipped' });
        continue;
      }

      const window = buildSlatePitWindow(slug, dayIndex, now);
      if (window.endsAt.getTime() <= now.getTime()) {
        results.push({ slug, dayIndex, action: 'skipped' });
        continue;
      }

      const exists = openPool.find(
        (row) =>
          contestMatchesSlug({ slug: row.slug ?? undefined, title: row.title }, slug) &&
          contestOnWeekday({ startsAt: row.starts_at ?? undefined }, dayIndex, now)
      );

      if (exists) {
        results.push({ slug, dayIndex, action: 'exists', contestId: exists.id });
        continue;
      }

      const schedule = getContestAssetSchedule(slug, window.startsAt);
      const payload: Record<string, unknown> = {
        title: template.title,
        entry_fee: template.entryFee,
        first_prize: template.firstPrize,
        total_prizes: template.totalPrizes,
        max_entries: template.maxEntries,
        status: window.status,
        starting_portfolio: 100000,
        assets: schedule.assets,
        starts_at: window.startsAt.toISOString(),
        ends_at: window.endsAt.toISOString(),
        slug: template.slug,
        tagline: template.tagline,
        badge: template.badge,
      };

      let createdId: number | undefined;
      const { data: created, error } = await admin
        .from('contests')
        .insert(payload)
        .select('id')
        .single();

      if (!error && created) {
        createdId = created.id;
      } else {
        const lean = { ...payload };
        delete lean.slug;
        delete lean.tagline;
        delete lean.badge;
        delete lean.starts_at;
        const { data: fallback } = await admin.from('contests').insert(lean).select('id').single();
        createdId = fallback?.id;
      }

      if (createdId) {
        openPool.push({
          id: createdId,
          slug: template.slug,
          title: template.title,
          status: window.status,
          starts_at: window.startsAt.toISOString(),
        });
        results.push({ slug, dayIndex, action: 'created', contestId: createdId });
      } else {
        results.push({ slug, dayIndex, action: 'skipped' });
      }
    }
  }

  return results;
}

/** Demo/local: 14 contests — 2 per day for the full week slate. */
export function buildWeekSlateDemoContests(now = new Date()): Contest[] {
  const contests: Contest[] = [];
  let id = 1;

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    for (const slug of getDaySlateSlugs(dayIndex)) {
      const template = PIT_CONTEST_CATALOG.find((c) => c.slug === slug);
      if (!template) continue;

      const window = buildSlatePitWindow(slug, dayIndex, now);
      if (window.endsAt.getTime() <= now.getTime()) continue;

      const schedule = getContestAssetSchedule(slug, window.startsAt);

      contests.push({
        id: id++,
        title: template.title,
        slug: template.slug,
        tagline: template.tagline,
        badge: template.badge,
        date: window.startsAt.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        entryFee: template.entryFee,
        firstPrize: template.firstPrize,
        totalPrizes: template.totalPrizes,
        entries: Math.min(3 + dayIndex + id, template.maxEntries - 1),
        maxEntries: template.maxEntries,
        timeLeft: window.status === 'active' ? 'OPEN' : 'SCHEDULED',
        assets: schedule.assets,
        assetTheme: schedule.theme,
        status: window.status,
        startingPortfolioValue: 100_000,
        startsAt: window.startsAt.toISOString(),
        endsAt: window.endsAt.toISOString(),
      });
    }
  }

  return contests;
}