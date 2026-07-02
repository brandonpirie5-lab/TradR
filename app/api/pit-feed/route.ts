import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/** Public read — spectators can watch the tape; auth only marks isYou. */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  const contestId = Number(request.nextUrl.searchParams.get('contestId'));
  if (!contestId) {
    return Response.json({ error: 'contestId is required' }, { status: 400 });
  }

  const limit = Math.min(40, parseInt(request.nextUrl.searchParams.get('limit') || '25'));
  const admin = getSupabaseAdmin();
  if (!admin) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { data: contest } = await admin
    .from('contests')
    .select('status')
    .eq('id', contestId)
    .maybeSingle();

  if (!contest) {
    return Response.json({ error: 'Contest not found' }, { status: 404 });
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
    isYou: user ? t.user_id === user.id : false,
  }));

  return Response.json({ feed });
}