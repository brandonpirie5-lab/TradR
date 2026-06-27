import { NextRequest } from 'next/server';
import { getUserFromRequest, unauthorizedResponse, badRequestResponse } from '@/lib/auth';
import { getSupabaseAdmin, getSupabaseUserClient } from '@/lib/supabase-admin';
import { joinContestServer, isMissingRpcError } from '@/lib/game-server';

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  const authHeader = request.headers.get('authorization')!;
  const token = authHeader.slice(7);
  const db = getSupabaseUserClient(token);
  const admin = getSupabaseAdmin();
  if (!db || !admin) {
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

  const { data, error } = await db.rpc('join_contest', { p_contest_id: contestId });

  if (!error) {
    return Response.json({
      success: true,
      newBalance: data?.new_balance,
      entryCount: data?.entry_count,
    });
  }

  if (isMissingRpcError(error.message)) {
    try {
      const result = await joinContestServer(admin, user.id, contestId);
      return Response.json({
        success: true,
        newBalance: result.new_balance,
        entryCount: result.entry_count,
        via: 'server-fallback',
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to join contest';
      const status =
        msg.includes('Insufficient') || msg.includes('full') || msg.includes('Already') ? 400 : 500;
      return Response.json({ error: msg }, { status });
    }
  }

  const msg = error.message || 'Failed to join contest';
  const status = msg.includes('Insufficient') || msg.includes('full') || msg.includes('Already') ? 400 : 500;
  return Response.json({ error: msg }, { status });
}