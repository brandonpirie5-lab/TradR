import { NextRequest } from 'next/server';
import { badRequestResponse } from '@/lib/auth';
import { getSupabaseUrl, getSupabasePublishableKey } from '@/lib/supabase-env';
import { getAppUrl } from '@/lib/app-url';

export async function POST(request: NextRequest) {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) {
    return Response.json({ error: 'Auth not configured' }, { status: 503 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return badRequestResponse('Invalid JSON body');
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return badRequestResponse('Valid email is required');
  }

  const redirectTo = `${getAppUrl()}/?reset=1`;
  const res = await fetch(`${url}/auth/v1/recover`, {
    method: 'POST',
    headers: {
      apikey: key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, redirect_to: redirectTo }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return Response.json({ error: data.error_description || data.msg || 'Reset failed' }, { status: 400 });
  }

  return Response.json({ success: true });
}