import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { badRequestResponse } from '@/lib/auth';
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase-env';

export async function POST(request: NextRequest) {
  const url = getSupabaseUrl();
  const anon = getSupabasePublishableKey();

  if (!url || !anon) {
    return Response.json({ error: 'Supabase is not configured in .env.local' }, { status: 503 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return badRequestResponse('Invalid JSON body');
  }

  const email = String(body.email || '').trim();
  const password = String(body.password || '');

  if (!email || !password) {
    return badRequestResponse('Email and password are required');
  }

  try {
    const supabase = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
      session: data.session
        ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          }
        : null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sign in failed';
    const unreachable = message.includes('fetch failed') || message.includes('ENOTFOUND');
    return Response.json(
      {
        error: unreachable
          ? `Cannot reach Supabase at ${url}. Fix NEXT_PUBLIC_SUPABASE_URL in .env.local`
          : message,
        code: unreachable ? 'SUPABASE_UNREACHABLE' : 'SIGNIN_FAILED',
      },
      { status: unreachable ? 503 : 500 }
    );
  }
}