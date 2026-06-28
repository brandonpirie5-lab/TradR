/**
 * Close duplicate live contests without needing slug column (DML only).
 * Run: npx tsx scripts/close-legacy-contests.ts
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { PIT_CONTEST_CATALOG } from '../lib/pit-contests';

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
  if (!existsSync(envPath)) process.exit(1);
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}

function resolveSlug(row: { title: string }): string | undefined {
  if (LEGACY_TITLE_TO_SLUG[row.title]) return LEGACY_TITLE_TO_SLUG[row.title];
  return PIT_CONTEST_CATALOG.find((c) => c.title === row.title)?.slug;
}

async function main() {
  loadEnv();
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  const { data: rows, error } = await admin
    .from('contests')
    .select('id, title, status')
    .in('status', ['open', 'active'])
    .order('id', { ascending: true });

  if (error) throw error;
  console.log(`\n${rows?.length ?? 0} live contests before cleanup`);

  const bySlug = new Map<string, typeof rows>();
  const unmapped: typeof rows = [];

  for (const row of rows || []) {
    const slug = resolveSlug(row);
    if (!slug) {
      unmapped.push(row);
      continue;
    }
    const list = bySlug.get(slug) || [];
    list.push(row);
    bySlug.set(slug, list);
  }

  const closeIds: number[] = [];
  for (const [slug, list] of bySlug) {
    const sorted = [...(list || [])].sort((a, b) => b.id - a.id);
    console.log(`\n${slug}: keep #${sorted[0].id}, close ${sorted.length - 1}`);
    for (const dup of sorted.slice(1)) closeIds.push(dup.id);
  }
  for (const row of unmapped || []) {
    console.log(`unmapped: close #${row.id} "${row.title}"`);
    closeIds.push(row.id);
  }

  if (closeIds.length) {
    const { error: closeErr } = await admin.from('contests').update({ status: 'closed' }).in('id', closeIds);
    if (closeErr) throw closeErr;
    console.log(`\nClosed ${closeIds.length} duplicate/unmapped contests.`);
  } else {
    console.log('\nNo duplicates to close.');
  }

  const { data: after } = await admin
    .from('contests')
    .select('id, title, status')
    .in('status', ['open', 'active'])
    .order('id');

  console.log('\nRemaining live contests:');
  for (const c of after || []) {
    const { count } = await admin.from('participations').select('*', { count: 'exact', head: true }).eq('contest_id', c.id);
    console.log(`  #${c.id} ${c.title} — ${count ?? 0} traders`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});