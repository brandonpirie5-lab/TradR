import { NextRequest } from 'next/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  const admin = getSupabaseAdmin();
  if (!admin) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const [{ count: inviteCount, error: inviteErr }, { data: txRows, error: txErr }, { data: profile }] =
    await Promise.all([
      admin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('referred_by', user.id),
      admin
        .from('transactions')
        .select('amount, description, type')
        .eq('user_id', user.id)
        .eq('type', 'deposit'),
      admin.from('profiles').select('referral_code').eq('id', user.id).single(),
    ]);

  if (inviteErr) {
    const msg = inviteErr.message.toLowerCase();
    if (!msg.includes('referred_by')) {
      return Response.json({ error: inviteErr.message }, { status: 500 });
    }
  }

  if (txErr) {
    return Response.json({ error: txErr.message }, { status: 500 });
  }

  const referralKeywords = /referral|invitee|rake|first pit bonus|2nd-degree|invited to the pit/i;
  const earnings = (txRows || [])
    .filter((t) => referralKeywords.test(String(t.description || '')))
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const referralCode =
    profile?.referral_code || `pit${user.id.replace(/-/g, '').slice(0, 8)}`;

  return Response.json({
    inviteCount: inviteCount ?? 0,
    referralEarnings: Math.round(earnings * 100) / 100,
    referralCode,
  });
}