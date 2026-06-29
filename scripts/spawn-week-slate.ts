/**
 * Spawn the full week fight card (2 pits × 7 days) in Supabase.
 * Run: npm run week:spawn
 */

import { createPitBotAdmin, loadEnvLocal } from '../lib/pit-bots';
import { ensureWeekSlateContests } from '../lib/week-slate';

async function main() {
  loadEnvLocal();
  const admin = createPitBotAdmin();
  const results = await ensureWeekSlateContests(admin);
  const created = results.filter((r) => r.action === 'created');
  const exists = results.filter((r) => r.action === 'exists');

  console.log(`\n✅ Week slate: ${created.length} created, ${exists.length} already open\n`);
  for (const r of results) {
    if (r.action === 'skipped') continue;
    console.log(
      `  ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][r.dayIndex]} ${r.slug} — ${r.action}${r.contestId ? ` #${r.contestId}` : ''}`
    );
  }
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});