import {
  buildScaledPayouts,
  computeEffectivePool,
  computeMaxPaidRank,
  PLATFORM_RAKE_PCT,
} from '../lib/pit-pool-math';
import { DAILY_ENTRY_FEE, DAILY_MIN_ENTRIES } from '../lib/daily-pit-config';

function show(label: string, slug: string, fee: number, n: number) {
  const pool = computeEffectivePool(slug, { entryFee: fee, participantCount: n });
  const max = computeMaxPaidRank(slug, n);
  const map = buildScaledPayouts(slug, { entryFee: fee, participantCount: n });
  const first = map.get(1) ?? 0;
  const last = map.get(max) ?? 0;
  console.log(label);
  console.log(
    `  pool=$${pool} | paid ranks 1-${max} | 1st=$${first} | last paid=$${last}`
  );
}

console.log(`Daily Pit — $${DAILY_ENTRY_FEE} entry, ${PLATFORM_RAKE_PCT}% rake, top half split\n`);

show(`@ min (${DAILY_MIN_ENTRIES} traders)`, 'daily-pit', DAILY_ENTRY_FEE, DAILY_MIN_ENTRIES);
show('@ 12 traders', 'daily-pit', DAILY_ENTRY_FEE, 12);
show('@ 20 traders', 'daily-pit', DAILY_ENTRY_FEE, 20);
show('@ 50 traders (cap)', 'daily-pit', DAILY_ENTRY_FEE, 50);
show(`BELOW MIN (${DAILY_MIN_ENTRIES - 1} traders) — void`, 'daily-pit', DAILY_ENTRY_FEE, DAILY_MIN_ENTRIES - 1);