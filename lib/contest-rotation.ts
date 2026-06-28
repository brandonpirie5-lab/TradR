import { SupabaseClient } from '@supabase/supabase-js';
import { PIT_CONTEST_CATALOG } from './pit-contests';
import { getContestAssetSchedule } from './pit-asset-schedule';
import { buildPitWindow } from './pit-schedule';

export type RotationResult = {
  slug: string;
  action: 'created' | 'active' | 'skipped';
  contestId?: number;
};

export async function rotatePitContests(admin: SupabaseClient): Promise<RotationResult[]> {
  const results: RotationResult[] = [];

  for (const template of PIT_CONTEST_CATALOG) {
    let latest: { id: number; status: string } | undefined;

    const bySlug = await admin
      .from('contests')
      .select('id, status')
      .eq('slug', template.slug)
      .order('id', { ascending: false })
      .limit(1);

    if (!bySlug.error && bySlug.data?.length) {
      latest = bySlug.data[0];
    } else {
      const byTitle = await admin
        .from('contests')
        .select('id, status')
        .eq('title', template.title)
        .order('id', { ascending: false })
        .limit(1);
      latest = byTitle.data?.[0];
    }

    if (latest && latest.status !== 'closed') {
      results.push({ slug: template.slug, action: 'active', contestId: latest.id });
      continue;
    }

    const window = buildPitWindow(template.slug);
    const schedule = getContestAssetSchedule(template.slug, window.startsAt);

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
    };

    // Optional columns (after rebrand migration)
    payload.slug = template.slug;
    payload.tagline = template.tagline;
    payload.badge = template.badge;

    const { data: created, error } = await admin.from('contests').insert(payload).select('id').single();

    if (error) {
      // Retry without optional columns if schema is older
      delete payload.slug;
      delete payload.tagline;
      delete payload.badge;
      delete payload.starts_at;
      const { data: fallback, error: err2 } = await admin.from('contests').insert(payload).select('id').single();
      if (err2) {
        results.push({ slug: template.slug, action: 'skipped' });
        continue;
      }
      results.push({ slug: template.slug, action: 'created', contestId: fallback?.id });
      continue;
    }

    results.push({ slug: template.slug, action: 'created', contestId: created?.id });
  }

  return results;
}