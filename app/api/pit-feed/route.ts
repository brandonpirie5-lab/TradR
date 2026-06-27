import { NextRequest } from 'next/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  const contestId = Number(request.nextUrl.searchParams.get('contestId'));
  if (!contestId) {
    return Response.json({ error: 'contestId is required' }, { status: 400 });
  }

  const limit = Math.min(40, parseInt(request.nextUrl.searchParams.get('limit') || '25'));
  const admin = getSupabaseAdmin();
  if (!admin) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { data: part } = await admin
    .from('participations')
    .select('id')
    .eq('user_id', user.id)
    .eq('contest_id', contestId)
    .maybeSingle();

  if (!part) {
    return Response.json({ error: 'Join this pit to view live feed' }, { status: 403 });
  }

  const { data: trades, error } = await admin
    .from('trade_log')
    .select('*')
    .eq('contest_id', contestId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const userIds = [...new Set((trades || []).map((t) => t.user_id))];
  const { data: profiles } = userIds.length
    ? await admin.from('profiles').select('id, username').in('id', userIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map((p) => [p.id, p.username || 'trader']));

  const feed = (trades || []).map((t) => ({
    id: String(t.id),
    userId: t.user_id,
    username: `@${profileMap.get(t.user_id) || 'trader'}`,
    side: t.side as 'buy' | 'sell',
    symbol: t.symbol,
    shares: Number(t.shares),
    price: Number(t.price),
    total: Number(t.total),
    createdAt: t.created_at,
    isYou: t.user_id === user.id,
  }));

  return Response.json({ feed });
}