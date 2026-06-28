/**
 * Run scripts/apply-pit-migration.sql against Supabase Postgres.
 * Requires SUPABASE_DB_PASSWORD in .env.local (Dashboard → Settings → Database).
 * Run: npx tsx scripts/run-sql-migration.ts
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import postgres from 'postgres';

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

function getConnectionString(): string {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;

  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) {
    console.error(
      'Missing SUPABASE_DB_PASSWORD (or SUPABASE_DB_URL) in .env.local.\n' +
        'Get it from Supabase Dashboard → Project Settings → Database → Database password.'
    );
    process.exit(1);
  }

  const ref = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!ref) {
    console.error('Could not parse project ref from NEXT_PUBLIC_SUPABASE_URL');
    process.exit(1);
  }

  const region = process.env.SUPABASE_DB_REGION || 'us-east-1';
  return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
}

async function main() {
  loadEnv();
  const sqlPath = resolve(process.cwd(), 'scripts/apply-pit-migration.sql');
  const sql = readFileSync(sqlPath, 'utf8');

  const statements = sql
    .split(';')
    .map((s) => s.replace(/--[^\n]*/g, '').trim())
    .filter((s) => s.length > 0);

  const url = getConnectionString();
  console.log(`Connecting to Supabase Postgres (${statements.length} statements)...`);

  const db = postgres(url, { ssl: 'require', max: 1 });

  try {
    for (const statement of statements) {
      const preview = statement.split('\n').find((l) => l.trim())?.trim().slice(0, 72) || statement.slice(0, 72);
      console.log(`→ ${preview}...`);
      await db.unsafe(statement);
    }

    const rows = await db<{ id: number; title: string; slug: string | null; status: string }[]>`
      select id, title, slug, status from contests
      where status <> 'closed'
      order by id
    `;

    console.log('\nLive contests:');
    for (const r of rows) {
      const [{ count }] = await db<{ count: string }[]>`
        select count(*)::text as count from participations where contest_id = ${r.id}
      `;
      console.log(`  #${r.id} [${r.slug ?? '?'}] ${r.title} — ${count} traders`);
    }
    console.log('\nMigration applied successfully.');
  } finally {
    await db.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});