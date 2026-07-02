import { SupabaseClient } from '@supabase/supabase-js';
import { DAILY_PIT_SLUG } from './daily-pit-config';
import { PIT_CONTEST_CATALOG } from './pit-contests';

const ET = 'America/New_York';

function dailyPitDayKey(startsAt: string | null | undefined): string {
  if (!startsAt) return 'unknown';
  return new Date(startsAt).toLocaleDateString('en-CA', { timeZone: ET });
}
const LEGACY_TITLE_TO_SLUG: Record<string, string> = {
  'Macro Royale': 'the-liquidation',
  'Double Up': 'full-send',
  'Wall Street vs Crypto': 'tradfi-vs-degen',
  'Opening Bell Pit': 'opening-bell',
  'First Candle Free-For-All': 'opening-bell',
  'Opening Bell Bloodbath': 'opening-bell',
  'The Liquidation': 'the-liquidation',
  'Liquidation Lounge': 'the-liquidation',
  'Margin Called': 'the-liquidation',
  'Full Send Pit': 'full-send',
  'Full Port Disorder': 'full-send',
  'Triple Stack Pit': 'triple-stack',
  'Triple Stack Therapy': 'triple-stack',
  'Weekend Carnage': 'weekend-carnage',
  'Saturday Slaughterhouse': 'weekend-carnage',
  'TradFi vs Degen Pit': 'tradfi-vs-degen',
  'Suits vs. Size': 'tradfi-vs-degen',
  'Frog & Dog Derby': 'meme-mayhem',
  'Gold Rush Gauntlet': 'gold-rush',
};

type LiveRow = {
  id: number;
  title: string;
  slug?: string | null;
  status: string;
  starts_at?: string | null;
  ends_at?: string | null;
};

export function resolveContestSlug(row: Pick<LiveRow, 'title' | 'slug'>): string | undefined {
  if (row.slug) return row.slug;
  if (LEGACY_TITLE_TO_SLUG[row.title]) return LEGACY_TITLE_TO_SLUG[row.title];
  return PIT_CONTEST_CATALOG.find((c) => c.title === row.title)?.slug;
}

export function contestDedupeKey(row: LiveRow, now = new Date()): string {
  const slug = resolveContestSlug(row) ?? row.title;
  if (slug === DAILY_PIT_SLUG || slug === 'daily-pit') {
    return `daily-pit:${dailyPitDayKey(row.starts_at)}`;
  }
  const day = row.starts_at ? new Date(row.starts_at).getDay() : now.getDay();
  return `${slug}:${day}`;
}

/** Close expired pits and duplicate open/active rows (keep newest per slug+weekday). */
export async function closeDuplicateAndExpiredContests(
  admin: SupabaseClient,
  now = new Date()
): Promise<{ closedExpired: number; closedDuplicates: number }> {
  const { data: rows, error } = await admin
    .from('contests')
    .select('id, title, slug, status, starts_at, ends_at')
    .in('status', ['open', 'active'])
    .order('id', { ascending: true });

  if (error) throw error;

  const live = rows ?? [];
  const closeIds = new Set<number>();
  const nowMs = now.getTime();

  for (const row of live) {
    if (row.ends_at && new Date(row.ends_at).getTime() <= nowMs) {
      closeIds.add(row.id);
    }
  }

  const groups = new Map<string, LiveRow[]>();
  for (const row of live) {
    if (closeIds.has(row.id)) continue;
    const key = contestDedupeKey(row, now);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const participationCounts = await fetchParticipationCounts(
    admin,
    live.filter((r) => !closeIds.has(r.id)).map((r) => r.id)
  );

  for (const list of groups.values()) {
    const sorted = [...list].sort((a, b) => {
      const countDiff = (participationCounts[b.id] ?? 0) - (participationCounts[a.id] ?? 0);
      if (countDiff !== 0) return countDiff;
      return b.id - a.id;
    });
    for (const dup of sorted.slice(1)) closeIds.add(dup.id);
  }

  if (closeIds.size === 0) {
    return { closedExpired: 0, closedDuplicates: 0 };
  }

  const { error: closeErr } = await admin
    .from('contests')
    .update({ status: 'closed' })
    .in('id', [...closeIds]);

  if (closeErr) throw closeErr;

  const expiredCount = live.filter(
    (r) => r.ends_at && new Date(r.ends_at).getTime() <= nowMs && closeIds.has(r.id)
  ).length;

  return {
    closedExpired: expiredCount,
    closedDuplicates: closeIds.size - expiredCount,
  };
}

async function fetchParticipationCounts(
  admin: SupabaseClient,
  contestIds: number[]
): Promise<Record<number, number>> {
  const counts: Record<number, number> = {};
  if (!contestIds.length) return counts;

  const { data, error } = await admin
    .from('participations')
    .select('contest_id')
    .in('contest_id', contestIds);

  if (error) throw error;

  for (const row of data || []) {
    counts[row.contest_id] = (counts[row.contest_id] || 0) + 1;
  }
  return counts;
}

export function dedupeContestRows<T extends LiveRow>(
  rows: T[],
  now = new Date(),
  entryCounts?: Record<number, number>
): T[] {
  const byKey = new Map<string, T>();
  const nowMs = now.getTime();

  for (const row of rows) {
    if (row.ends_at && new Date(row.ends_at).getTime() <= nowMs) continue;
    const key = contestDedupeKey(row, now);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, row);
      continue;
    }
    const existingEntries = entryCounts?.[existing.id] ?? 0;
    const rowEntries = entryCounts?.[row.id] ?? 0;
    if (rowEntries > existingEntries || (rowEntries === existingEntries && row.id > existing.id)) {
      byKey.set(key, row);
    }
  }

  return [...byKey.values()].sort((a, b) => a.id - b.id);
}

export function rowMatchesArenaPool(
  row: Pick<LiveRow, 'title' | 'slug' | 'starts_at' | 'ends_at' | 'status'>,
  now = new Date()
): boolean {
  if (row.status === 'closed') return false;
  if (row.ends_at && new Date(row.ends_at).getTime() <= now.getTime()) return false;
  return true;
}