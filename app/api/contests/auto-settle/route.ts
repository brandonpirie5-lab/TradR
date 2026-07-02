import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { runPitCycle } from '@/lib/pit-cycle';

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  const cronOk = cronSecret && authHeader === `Bearer ${cronSecret}`;

  const user = await getUserFromRequest(request);
  if (!cronOk && !user) {
    /* Guests may trigger idempotent pit cycle — keeps bells closing without a logged-in client */
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const cycle = await runPitCycle(admin, user?.id);

  return Response.json({
    activated: cycle.activated,
    settled: cycle.settled.length,
    spawned: cycle.spawned,
    contests: cycle.settled.map((r) => ({
      id: r.contestId,
      title: r.contestTitle,
      participants: r.totalParticipants,
      empty: r.empty,
      yourRank: user ? r.userRank : undefined,
      yourPayout: user ? r.userPayout : undefined,
      yourPortfolioValue: user ? r.userFinalValue : undefined,
      settlementPrices: user ? r.settlementPrices : undefined,
      voided: !!r.voided,
      yourRefund: user ? r.userRefund : undefined,
      yourAffected: user ? r.userAffected : undefined,
    })),
  });
}