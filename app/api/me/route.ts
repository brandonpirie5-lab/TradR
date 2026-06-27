import { NextRequest } from 'next/server';
import { getUserFromRequest, unauthorizedResponse, badRequestResponse } from '@/lib/auth';
import { getSupabaseUserClient } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  const token = request.headers.get('authorization')!.slice(7);
  const db = getSupabaseUserClient(token);
  if (!db) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { data, error } = await db.from('profiles').select('*').eq('id', user.id).single();
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const referralCode = data.referral_code || `pit${user.id.replace(/-/g, '').slice(0, 8)}`;

  return Response.json({
    id: user.id,
    email: user.email,
    balance: Number(data.balance),
    username: data.username,
    created_at: data.created_at,
    referral_code: referralCode,
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  const token = request.headers.get('authorization')!.slice(7);
  const db = getSupabaseUserClient(token);
  if (!db) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  let body: { username?: string };
  try {
    body = await request.json();
  } catch {
    return badRequestResponse('Invalid JSON body');
  }

  const raw = (body.username || '').trim().replace(/^@/, '');
  if (!raw || raw.length < 3 || raw.length > 20) {
    return badRequestResponse('Username must be 3–20 characters');
  }
  if (!/^[a-zA-Z0-9_]+$/.test(raw)) {
    return badRequestResponse('Username: letters, numbers, underscore only');
  }

  const { data, error } = await db
    .from('profiles')
    .update({ username: raw })
    .eq('id', user.id)
    .select('*')
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    id: user.id,
    email: user.email,
    balance: Number(data.balance),
    username: data.username,
    created_at: data.created_at,
    referral_code: data.referral_code || `pit${user.id.replace(/-/g, '').slice(0, 8)}`,
  });
}