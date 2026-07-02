import type { SupabaseClient } from '@supabase/supabase-js';
import { DAILY_ASSETS, DAILY_PIT_SLUG } from './daily-pit-config';
import { getCurrentDailyPitWindow } from './daily-pit-schedule';

const ET = 'America/New_York';

function etDateKey(iso: string | null | undefined): string {
  if (!iso) return 'unknown';
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: ET });
}

/** Keep today + tomorrow daily pits; close duplicate/zombie rows; patch assets to catalog. */
export async function closeZombieDailyPits(
  admin: SupabaseClient
): Promise<{ closed: number; patched: number }> {
  const nowIso = new Date().toISOString();
  const w = getCurrentDailyPitWindow();
  const todayKey = etDateKey(w.startsAt.toISOString());
  const tomorrowStart = new Date(w.startsAt);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const tomorrowKey = etDateKey(tomorrowStart.toISOString());
  const allowedKeys = new Set([todayKey, tomorrowKey]);

  const { data: rows, error } = await admin
    .from('contests')
    .select('id, starts_at, status')
    .or(`slug.eq.${DAILY_PIT_SLUG},title.eq.Daily Pit`)
    .neq('status', 'closed')
    .gte('ends_at', nowIso);

  if (error || !rows?.length) return { closed: 0, patched: 0 };

  const counts = await fetchParticipationCounts(admin, rows.map((r) => r.id));
  const byDay = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = etDateKey(row.starts_at);
    const list = byDay.get(key) ?? [];
    list.push(row);
    byDay.set(key, list);
  }

  const keepIds = new Set<number>();
  const closeIds: number[] = [];

  for (const [dayKey, list] of byDay) {
    if (!allowedKeys.has(dayKey)) {
      closeIds.push(...list.map((r) => r.id));
      continue;
    }
    const sorted = [...list].sort((a, b) => {
      const countDiff = (counts[b.id] ?? 0) - (counts[a.id] ?? 0);
      if (countDiff !== 0) return countDiff;
      return b.id - a.id;
    });
    keepIds.add(sorted[0].id);
    for (const dup of sorted.slice(1)) closeIds.push(dup.id);
  }

  let patched = 0;
  for (const id of keepIds) {
    const { error: patchErr } = await admin
      .from('contests')
      .update({ assets: [...DAILY_ASSETS], slug: DAILY_PIT_SLUG, title: 'Daily Pit' })
      .eq('id', id);
    if (!patchErr) patched += 1;
  }

  if (closeIds.length) {
    await admin.from('contests').update({ status: 'closed' }).in('id', closeIds);
  }

  return { closed: closeIds.length, patched };
}

async function fetchParticipationCounts(
  admin: SupabaseClient,
  contestIds: number[]
): Promise<Record<number, number>> {
  const counts: Record<number, number> = {};
  if (!contestIds.length) return counts;
  const { data } = await admin
    .from('participations')
    .select('contest_id')
    .in('contest_id', contestIds);
  for (const row of data || []) {
    counts[row.contest_id] = (counts[row.contest_id] || 0) + 1;
  }
  return counts;
}