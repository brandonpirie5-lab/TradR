/**
 * Seed 10 test traders into live pit(s).
 *
 * Run:
 *   npx tsx scripts/seed-pit-pool.ts              # Opening Bell (default)
 *   npx tsx scripts/seed-pit-pool.ts --all          # every joinable contest
 *   npx tsx scripts/seed-pit-pool.ts --slug=full-send
 */

import { rotatePitContests } from '../lib/contest-rotation';
import { OPENING_BELL_SLUG, PIT_CONTEST_CATALOG } from '../lib/pit-contests';
import {
  createPitBotAdmin,
  fetchJoinableContests,
  loadEnvLocal,
  PIT_BOT_PASSWORD,
  PIT_BOTS,
  seedBotsIntoContest,
  type ContestRow,
} from '../lib/pit-bots';

function getSlugArg(): string | null {
  const hit = process.argv.find((a) => a.startsWith('--slug='));
  return hit?.split('=')[1] ?? null;
}

async function fetchContestBySlug(
  admin: ReturnType<typeof createPitBotAdmin>,
  slug: string
): Promise<ContestRow | null> {
  const catalog = PIT_CONTEST_CATALOG.find((c) => c.slug === slug);
  const title = catalog?.title;

  const bySlug = await admin
    .from('contests')
    .select('id, title, slug, status, ends_at, starts_at, assets, entry_fee')
    .eq('slug', slug)
    .neq('status', 'closed')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!bySlug.error && bySlug.data) return bySlug.data as ContestRow;

  if (title) {
    const byTitle = await admin
      .from('contests')
      .select('id, title, slug, status, ends_at, starts_at, assets, entry_fee')
      .eq('title', title)
      .neq('status', 'closed')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!byTitle.error && byTitle.data) return byTitle.data as ContestRow;
  }

  return null;
}

async function main() {
  loadEnvLocal();
  const admin = createPitBotAdmin();
  const seedAll = process.argv.includes('--all');
  const slugArg = getSlugArg() || OPENING_BELL_SLUG;

  let contests: ContestRow[] = [];

  if (seedAll) {
    contests = await fetchJoinableContests(admin);
    if (!contests.length) {
      console.log('No joinable contests — spawning lineup…');
      await rotatePitContests(admin);
      contests = await fetchJoinableContests(admin);
    }
  } else {
    let contest = await fetchContestBySlug(admin, slugArg);
    if (!contest) {
      console.log('No open pit found — spawning contest lineup…');
      await rotatePitContests(admin);
      contest = await fetchContestBySlug(admin, slugArg);
    }
    if (!contest) {
      const any = await fetchJoinableContests(admin);
      contest = any[0] ?? null;
    }
    if (!contest) {
      console.error(`No open contest for slug "${slugArg}".`);
      process.exit(1);
    }
    contests = [contest];
  }

  console.log(`\n🎯 Seeding ${PIT_BOTS.length} bots into ${contests.length} contest(s)\n`);

  for (const contest of contests) {
    const assets = (contest.assets as string[]) || [];
    console.log(`── #${contest.id} ${contest.title} (${assets.join(', ') || 'no assets'})`);
    const results = await seedBotsIntoContest(admin, contest);
    for (const r of results) {
      console.log(`   ${r.bot.padEnd(8)} ${r.status}`);
    }

    const { count } = await admin
      .from('participations')
      .select('*', { count: 'exact', head: true })
      .eq('contest_id', contest.id);
    console.log(`   → ${count ?? '?'} traders in pit\n`);
  }

  console.log('✅ Done');
  console.log(`\nLogin any bot — password: ${PIT_BOT_PASSWORD}`);
  console.log('Emails: pitbot1@tradr.test … pitbot10@tradr.test');
  console.log('\nKeep bots trading for days:');
  console.log('   npx tsx scripts/run-pit-bots.ts\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});