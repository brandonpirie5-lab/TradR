/**
 * Close expired + duplicate open/active contests (keep newest per slug+weekday).
 * Run: npm run db:dedupe
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { closeDuplicateAndExpiredContests } from '../lib/contest-pool-cleanup';

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

async function main() {
  loadEnv();
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { count: before } = await admin
    .from('contests')
    .select('id', { count: 'exact', head: true })
    .in('status', ['open', 'active']);

  const result = await closeDuplicateAndExpiredContests(admin);

  const { count: after } = await admin
    .from('contests')
    .select('id', { count: 'exact', head: true })
    .in('status', ['open', 'active']);

  console.log(`Live contests: ${before ?? 0} → ${after ?? 0}`);
  console.log('Cleanup:', result);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});