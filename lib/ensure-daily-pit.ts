import type { SupabaseClient } from '@supabase/supabase-js';
import { getCurrentDailyPitWindow } from './daily-pit-schedule';
import { DAILY_ASSETS, DAILY_PIT_SLUG } from './daily-pit-config';
import { closeZombieDailyPits } from './close-zombie-daily-pits';
import { PIT_CONTEST_CATALOG } from './pit-contests';

/** Ensure an open daily pit exists so users can ring in early (today or tomorrow). */
export async function ensureDailyPitContest(admin: SupabaseClient): Promise<number | null> {
  const nowIso = new Date().toISOString();
  const template = PIT_CONTEST_CATALOG[0];
  const w = getCurrentDailyPitWindow();

  try {
    await closeZombieDailyPits(admin);
  } catch (e) {
    console.warn('closeZombieDailyPits', e);
  }

  const { data: existing } = await admin
    .from('contests')
    .select('id, starts_at, ends_at, status')
    .or(`slug.eq.${DAILY_PIT_SLUG},title.eq.${template.title}`)
    .neq('status', 'closed')
    .gte('ends_at', nowIso)
    .order('id', { ascending: false })
    .limit(1);

  if (existing?.length) {
    const row = existing[0];
    const startsMs = row.starts_at ? new Date(row.starts_at).getTime() : 0;
    const targetStartsMs = w.startsAt.getTime();
    if (Math.abs(startsMs - targetStartsMs) < 2 * 60 * 60 * 1000) {
      await admin
        .from('contests')
        .update({ assets: [...DAILY_ASSETS], slug: DAILY_PIT_SLUG })
        .eq('id', row.id);
      return row.id;
    }
  }

  const status = w.phase === 'live' ? 'active' : 'open';

  const payload: Record<string, unknown> = {
    title: template.title,
    slug: DAILY_PIT_SLUG,
    tagline: template.tagline,
    badge: template.badge,
    entry_fee: template.entryFee,
    first_prize: template.firstPrize,
    total_prizes: template.totalPrizes,
    max_entries: template.maxEntries,
    status,
    starting_portfolio: 100_000,
    assets: [...DAILY_ASSETS],
    starts_at: w.startsAt.toISOString(),
    ends_at: w.endsAt.toISOString(),
  };

  const { data: created, error } = await admin.from('contests').insert(payload).select('id').single();
  if (!error && created?.id) return created.id;

  const fallback = { ...payload };
  delete fallback.slug;
  delete fallback.tagline;
  delete fallback.badge;
  delete fallback.starts_at;

  const { data: created2, error: err2 } = await admin
    .from('contests')
    .insert(fallback)
    .select('id')
    .single();

  if (err2) {
    console.warn('ensureDailyPitContest failed', err2.message);
    return existing?.[0]?.id ?? null;
  }
  return created2?.id ?? null;
}