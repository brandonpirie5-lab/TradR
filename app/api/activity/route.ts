import { NextRequest } from 'next/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/auth';
import { getSupabaseUserClient } from '@/lib/supabase-admin';
import type { ActivityItem } from '@/lib/game-types';

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  const token = request.headers.get('authorization')!.slice(7);
  const db = getSupabaseUserClient(token);
  if (!db) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const limit = Math.min(50, parseInt(request.nextUrl.searchParams.get('limit') || '30'));

  const [{ data: txs }, { data: parts }, { data: trades }] = await Promise.all([
    db.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit),
    db
      .from('participations')
      .select('*')
      .eq('user_id', user.id)
      .not('final_rank', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit),
    db.from('trade_log').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
  ]);

  const items: ActivityItem[] = [];

  for (const t of txs || []) {
    const type =
      t.type === 'deposit' ? 'deposit' : t.type === 'payout' ? 'payout' : t.type === 'entry_fee' ? 'entry' : 'settled';
    items.push({
      id: `tx-${t.id}`,
      type,
      title: t.type === 'entry_fee' ? 'Arena entry' : t.type === 'payout' ? 'Prize payout' : t.type === 'deposit' ? 'Deposit' : 'Transaction',
      detail: t.description || t.type,
      amount: Number(t.amount),
      createdAt: t.created_at,
      contestId: t.contest_id ?? undefined,
    });
  }

  const contestIds = [...new Set((parts || []).map((p) => p.contest_id))];
  let contestTitles = new Map<number, string>();
  if (contestIds.length) {
    const { data: contestList } = await db.from('contests').select('id, title').in('id', contestIds);
    contestTitles = new Map((contestList || []).map((c) => [c.id, c.title]));
  }

  for (const p of parts || []) {
    const title = contestTitles.get(p.contest_id) || `Contest #${p.contest_id}`;
    items.push({
      id: `settle-${p.id}`,
      type: 'settled',
      title,
      detail: `Finished #${p.final_rank} • $${Number(p.final_value || 0).toLocaleString()}`,
      amount: Number(p.payout || 0),
      createdAt: p.created_at,
      contestId: p.contest_id,
    });
  }

  for (const tr of trades || []) {
    items.push({
      id: `trade-${tr.id}`,
      type: 'trade',
      title: `${tr.side.toUpperCase()} ${tr.symbol}`,
      detail: `${Number(tr.shares)} shares @ $${Number(tr.price).toFixed(2)}`,
      amount: tr.side === 'buy' ? -Number(tr.total) : Number(tr.total),
      createdAt: tr.created_at,
      contestId: tr.contest_id,
    });
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return Response.json({ activities: items.slice(0, limit) });
}