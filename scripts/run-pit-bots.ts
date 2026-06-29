/**
 * Keep pit bots alive — joins all open contests and trades every few minutes.
 *
 * Run (leave open in a terminal):
 *   npx tsx scripts/run-pit-bots.ts
 *
 * Options:
 *   --interval=180   seconds between ticks (default 180 = 3 min)
 *   --once           single tick then exit
 */

import {
  createPitBotAdmin,
  loadEnvLocal,
  PIT_BOT_PASSWORD,
  PIT_BOTS,
  runBotCycle,
} from '../lib/pit-bots';

function getIntervalSec(): number {
  const hit = process.argv.find((a) => a.startsWith('--interval='));
  const raw = hit ? Number(hit.split('=')[1]) : 180;
  return Number.isFinite(raw) && raw >= 30 ? raw : 180;
}

async function main() {
  loadEnvLocal();
  const admin = createPitBotAdmin();
  const once = process.argv.includes('--once');
  const intervalSec = getIntervalSec();
  let tick = 0;

  console.log('\n🤖 TradR pit bots');
  console.log(`   ${PIT_BOTS.length} traders · interval ${intervalSec}s`);
  console.log(`   Password (all bots): ${PIT_BOT_PASSWORD}`);
  console.log(`   Emails: pitbot1@tradr.test … pitbot10@tradr.test`);
  console.log('   Ctrl+C to stop\n');

  const run = async () => {
    tick += 1;
    console.log(`── tick ${tick} @ ${new Date().toLocaleTimeString()} ──`);
    await runBotCycle(admin, tick);
  };

  await run();

  if (once) return;

  setInterval(() => {
    run().catch((e) => console.error('tick failed:', e));
  }, intervalSec * 1000);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});