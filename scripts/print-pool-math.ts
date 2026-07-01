import {
  buildScaledPayouts,
  computeEffectivePool,
  computeMaxPaidRank,
} from '../lib/pit-pool-math';

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

show('FREE @ min (10 traders)', 'opening-bell', 0, 10);
show('FREE @ 25 traders', 'opening-bell', 0, 25);
show('PAID 5-dollar @ min (6 traders)', 'the-liquidation', 5, 6);
show('PAID 5-dollar @ 20 traders', 'the-liquidation', 5, 20);
show('PAID 5-dollar @ 100 traders (cap)', 'the-liquidation', 5, 100);
show('BELOW MIN (9 traders) — void', 'opening-bell', 0, 9);