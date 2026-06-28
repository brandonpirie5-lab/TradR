/**
 * Apply pit schema columns, sync catalog metadata, close duplicate open contests.
 * Run: npx tsx scripts/migrate-and-cleanup-pits.ts
 * Dry run: npx tsx scripts/migrate-and-cleanup-pits.ts --dry-run
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PIT_CONTEST_CATALOG } from '../lib/pit-contests';
import { buildPitWindow } from '../lib/pit-schedule';
import { getContestAssetSchedule } from '../lib/pit-asset-schedule';

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

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) {
    console.error('Missing .env.local');
    process.exit(1);
  }
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

type ContestRow = {
  id: number;
  title: string;
  slug?: string | null;
  tagline?: string | null;
  badge?: string | null;
  status: string;
  starts_at?: string | null;
  ends_at?: string | null;
  entry_fee?: number;
  first_prize?: number;
  total_prizes?: number;
  max_entries?: number | null;
  assets?: string[] | null;
};

async function columnExists(admin: SupabaseClient, column: string): Promise<boolean> {
  const { error } = await admin.from('contests').select(column).limit(1);
  return !error;
}

async function runSqlStatements(admin: SupabaseClient, statements: string[], dryRun: boolean) {
  for (const sql of statements) {
    console.log(`\nSQL: ${sql.trim().split('\n')[0]}...`);
    if (dryRun) continue;
    const { error } = await admin.rpc('exec_sql', { query: sql });
    if (error) {
      console.warn('  rpc exec_sql not available:', error.message);
      return false;
    }
  }
  return true;
}

function resolveSlug(row: ContestRow): string | undefined {
  if (row.slug) return row.slug;
  if (row.title && LEGACY_TITLE_TO_SLUG[row.title]) return LEGACY_TITLE_TO_SLUG[row.title];
  const byTitle = PIT_CONTEST_CATALOG.find((c) => c.title === row.title);
  return byTitle?.slug;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  loadEnv();

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  console.log(dryRun ? '\n=== DRY RUN ===' : '\n=== MIGRATE & CLEANUP PITS ===');

  const neededCols = ['slug', 'tagline', 'badge', 'starts_at'] as const;
  const colStatus: Record<string, boolean> = {};
  for (const col of neededCols) {
    colStatus[col] = await columnExists(admin, col);
    console.log(`Column contests.${col}: ${colStatus[col] ? 'exists' : 'MISSING'}`);
  }

  const missingCols = neededCols.filter((c) => !colStatus[c]);
  if (missingCols.length) {
    const ddl = [
      'alter table contests add column if not exists slug text;',
      'alter table contests add column if not exists tagline text;',
      'alter table contests add column if not exists badge text;',
      'alter table contests add column if not exists starts_at timestamptz;',
      `update contests set starts_at = coalesce(starts_at, ends_at - interval '24 hours') where ends_at is not null and starts_at is null;`,
    ];
    console.log('\n--- DDL required (run in Supabase SQL Editor if script cannot apply) ---');
    console.log(ddl.join('\n'));
    const applied = await runSqlStatements(admin, ddl, dryRun);
    if (!applied && !dryRun) {
      console.log('\nApplying DDL via direct REST not available — attempting column probe after manual expectation...');
      for (const col of missingCols) {
        colStatus[col] = await columnExists(admin, col);
      }
      if (missingCols.some((c) => !colStatus[c])) {
        console.error('\nAborting data cleanup until DDL is applied. Paste SQL above into Supabase SQL Editor, then re-run.');
        process.exit(1);
      }
    }
  }

  const { data: contests, error } = await admin
    .from('contests')
    .select('id, title, slug, tagline, badge, status, starts_at, ends_at, entry_fee, first_prize, total_prizes, max_entries, assets')
    .order('id', { ascending: true });

  if (error) throw error;
  const rows = (contests || []) as ContestRow[];
  console.log(`\nFound ${rows.length} total contests, ${rows.filter((r) => r.status !== 'closed').length} non-closed`);

  // 1) Sync metadata from catalog onto all rows (by resolved slug)
  for (const row of rows) {
    const slug = resolveSlug(row);
    if (!slug) continue;
    const meta = PIT_CONTEST_CATALOG.find((c) => c.slug === slug);
    if (!meta) continue;

    const schedule = getContestAssetSchedule(slug, new Date());
    const patch: Record<string, unknown> = {
      slug: meta.slug,
      title: meta.title,
      tagline: meta.tagline,
      badge: meta.badge,
      entry_fee: meta.entryFee,
      first_prize: meta.firstPrize,
      total_prizes: meta.totalPrizes,
      max_entries: meta.maxEntries,
      assets: schedule.assets,
    };

    const changed =
      row.slug !== meta.slug ||
      row.title !== meta.title ||
      row.tagline !== meta.tagline ||
      row.badge !== meta.badge;

    if (changed) {
      console.log(`  sync #${row.id} → ${meta.title} (${slug})`);
      if (!dryRun) {
        const { error: upErr } = await admin.from('contests').update(patch).eq('id', row.id);
        if (upErr) console.warn(`    update failed: ${upErr.message}`);
      }
    }
  }

  // 2) Close duplicate open/active contests per slug (keep highest id)
  const live = rows.filter((r) => r.status === 'open' || r.status === 'active');
  const bySlug = new Map<string, ContestRow[]>();
  for (const row of live) {
    const slug = resolveSlug(row);
    if (!slug) {
      console.log(`  closing unmapped live contest #${row.id} "${row.title}"`);
      if (!dryRun) await admin.from('contests').update({ status: 'closed' }).eq('id', row.id);
      continue;
    }
    const list = bySlug.get(slug) || [];
    list.push(row);
    bySlug.set(slug, list);
  }

  const keepIds = new Set<number>();
  const closeIds: number[] = [];

  for (const [slug, list] of bySlug) {
    const sorted = [...list].sort((a, b) => b.id - a.id);
    const keeper = sorted[0];
    keepIds.add(keeper.id);
    console.log(`\nSlug "${slug}": keep #${keeper.id} (${keeper.title}), ${sorted.length - 1} duplicate(s)`);
    for (const dup of sorted.slice(1)) {
      closeIds.push(dup.id);
      console.log(`  close #${dup.id} "${dup.title}"`);
    }
  }

  if (closeIds.length && !dryRun) {
    const { error: closeErr } = await admin.from('contests').update({ status: 'closed' }).in('id', closeIds);
    if (closeErr) throw closeErr;
  }

  // 3) Refresh schedule window on canonical live contests
  const now = new Date();
  for (const id of keepIds) {
    const row = rows.find((r) => r.id === id);
    if (!row) continue;
    const slug = resolveSlug(row);
    if (!slug) continue;
    const window = buildPitWindow(slug, now);
    const patch: Record<string, unknown> = {
      status: window.status,
      ends_at: window.endsAt.toISOString(),
    };
    if (colStatus.starts_at || (await columnExists(admin, 'starts_at'))) {
      patch.starts_at = window.startsAt.toISOString();
    }
    console.log(`  refresh #${id} (${slug}) → ${window.status}, ends ${window.endsAt.toISOString()}`);
    if (!dryRun) {
      const { error: upErr } = await admin.from('contests').update(patch).eq('id', id);
      if (upErr) console.warn(`    window update failed: ${upErr.message}`);
    }
  }

  // 4) Summary
  const { data: after } = await admin
    .from('contests')
    .select('id, title, slug, status')
    .neq('status', 'closed')
    .order('id', { ascending: true });

  console.log('\n--- Live contests after cleanup ---');
  for (const c of after || []) {
    const { count } = await admin
      .from('participations')
      .select('*', { count: 'exact', head: true })
      .eq('contest_id', c.id);
    console.log(`  #${c.id} [${c.slug}] ${c.title} — ${count ?? 0} traders`);
  }

  console.log(dryRun ? '\nDry run complete — re-run without --dry-run to apply.' : '\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});