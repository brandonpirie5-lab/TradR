import { SupabaseClient } from '@supabase/supabase-js';
import { PIT_CONTEST_CATALOG } from './pit-contests';
import { getContestAssetSchedule } from './pit-asset-schedule';

const DURATION_HOURS: Record<string, number> = {
  'opening-bell': 20,
  'the-liquidation': 24,
  'full-send': 24,
  'triple-stack': 24,
  'weekend-carnage': 48,
  'tradfi-vs-degen': 18,
};

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

    const hours = DURATION_HOURS[template.slug] ?? 24;
    const endsAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    const schedule = getContestAssetSchedule(template.slug);

    const payload: Record<string, unknown> = {
      title: template.title,
      entry_fee: template.entryFee,
      first_prize: template.firstPrize,
      total_prizes: template.totalPrizes,
      max_entries: template.maxEntries,
      status: 'open',
      starting_portfolio: 100000,
      assets: schedule.assets,
      ends_at: endsAt,
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