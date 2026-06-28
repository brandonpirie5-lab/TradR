import { NextRequest } from 'next/server';
import { getUserFromRequest, unauthorizedResponse, badRequestResponse } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { settleContestById } from '@/lib/settle-contest';

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  const admin = getSupabaseAdmin();
  if (!admin) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  let body: { contestId?: number };
  try {
    body = await request.json();
  } catch {
    return badRequestResponse('Invalid JSON body');
  }

  const contestId = Number(body.contestId);
  if (!contestId) return badRequestResponse('contestId is required');

  try {
    const result = await settleContestById(admin, contestId, user.id);
    return Response.json({
      success: true,
      rank: result.userRank ?? 0,
      payout: result.userPayout ?? 0,
      refund: result.userRefund ?? 0,
      voided: !!result.voided,
      newBalance: result.userNewBalance ?? 0,
      totalParticipants: result.totalParticipants,
      empty: result.empty,
      settlementPrices: result.settlementPrices ?? {},
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Settlement failed';
    const status = message.includes('not found') ? 404 : message.includes('already') ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}