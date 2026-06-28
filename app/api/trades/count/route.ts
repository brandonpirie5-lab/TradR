import { NextRequest } from 'next/server';
import { getUserFromRequest, unauthorizedResponse, badRequestResponse } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { buildTradeLimitInfo } from '@/lib/trade-limits';

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  const contestId = Number(request.nextUrl.searchParams.get('contestId'));
  if (!contestId) return badRequestResponse('contestId is required');

  const admin = getSupabaseAdmin();
  if (!admin) return Response.json({ error: 'Database not configured' }, { status: 503 });

  const { data: contest } = await admin
    .from('contests')
    .select('slug')
    .eq('id', contestId)
    .single();

  const { count } = await admin
    .from('trade_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('contest_id', contestId);

  const info = buildTradeLimitInfo(count ?? 0, contest?.slug);

  return Response.json(info);
}