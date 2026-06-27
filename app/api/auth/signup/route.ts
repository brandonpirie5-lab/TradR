import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { badRequestResponse } from '@/lib/auth';
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase-env';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import type { SupabaseClient } from '@supabase/supabase-js';

const REFERRAL_BONUS_NEW = 5;
const REFERRAL_BONUS_REFERRER = 10;

async function applyReferralBonus(admin: SupabaseClient, newUserId: string, referralCode: string) {
  if (!referralCode) return;

  const { data: allProfiles } = await admin.from('profiles').select('id, balance, referral_code');
  const match = (allProfiles || []).find(
    (p) =>
      p.referral_code?.toLowerCase() === referralCode ||
      `pit${String(p.id).replace(/-/g, '').slice(0, 8)}` === referralCode
  );

  if (!match?.id || match.id === newUserId) return;

  const referrerId = match.id;

  try {
    await admin.from('profiles').update({ referred_by: referrerId }).eq('id', newUserId);
  } catch {
    /* referred_by column optional until migration */
  }

  const { data: newProfile } = await admin.from('profiles').select('balance').eq('id', newUserId).single();
  const { data: refProfile } = await admin.from('profiles').select('balance').eq('id', referrerId).single();

  const newBal = Number(newProfile?.balance || 0) + REFERRAL_BONUS_NEW;
  const refBal = Number(refProfile?.balance || 0) + REFERRAL_BONUS_REFERRER;

  await admin.from('profiles').update({ balance: newBal }).eq('id', newUserId);
  await admin.from('profiles').update({ balance: refBal }).eq('id', referrerId);

  await admin.from('transactions').insert([
    {
      user_id: newUserId,
      type: 'deposit',
      amount: REFERRAL_BONUS_NEW,
      description: 'Welcome bonus — invited to the Pit',
    },
    {
      user_id: referrerId,
      type: 'deposit',
      amount: REFERRAL_BONUS_REFERRER,
      description: 'Referral bonus — friend entered the Pit',
    },
  ]);
}

function authClient() {
  const url = getSupabaseUrl()!;
  const anon = getSupabasePublishableKey()!;
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signInAfterSignup(email: string, password: string) {
  const supabase = authClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error };
  return {
    user: data.user ? { id: data.user.id, email: data.user.email } : null,
    session: data.session
      ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }
      : null,
    needsEmailConfirmation: false,
  };
}

export async function POST(request: NextRequest) {
  const url = getSupabaseUrl();
  const anon = getSupabasePublishableKey();

  if (!url || !anon) {
    return Response.json({ error: 'Supabase is not configured in .env.local' }, { status: 503 });
  }

  let body: { email?: string; password?: string; referralCode?: string };
  try {
    body = await request.json();
  } catch {
    return badRequestResponse('Invalid JSON body');
  }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const referralCode = String(body.referralCode || '').trim().toLowerCase();

  if (!email || !password) {
    return badRequestResponse('Email and password are required');
  }
  if (password.length < 6) {
    return badRequestResponse('Password must be at least 6 characters');
  }

  try {
    const admin = getSupabaseAdmin();

    // Dev-friendly path: admin createUser auto-confirms without sending email (avoids rate limits)
    if (admin) {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (!createError && created.user) {
        await applyReferralBonus(admin, created.user.id, referralCode);
        const result = await signInAfterSignup(email, password);
        if (!result.error) {
          return Response.json(result);
        }
      }

      const alreadyExists =
        createError?.message?.toLowerCase().includes('already') ||
        createError?.message?.toLowerCase().includes('registered');

      if (alreadyExists) {
        return Response.json(
          { error: 'Account already exists — use Sign In instead.' },
          { status: 400 }
        );
      }

      if (createError && !createError.message.toLowerCase().includes('already')) {
        console.warn('Admin signup failed, falling back to public signUp:', createError.message);
      }
    }

    // Fallback: public signUp (may hit email rate limits on free tier)
    const supabase = authClient();
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      const rateLimited = error.message.toLowerCase().includes('rate limit');
      return Response.json(
        {
          error: rateLimited
            ? 'Email rate limit hit. Wait ~1 hour, or disable "Confirm email" in Supabase → Authentication → Providers → Email.'
            : error.message,
          code: rateLimited ? 'EMAIL_RATE_LIMIT' : 'SIGNUP_FAILED',
        },
        { status: rateLimited ? 429 : 400 }
      );
    }

    if (!data.session) {
      const signedIn = await signInAfterSignup(email, password);
      if (!signedIn.error && signedIn.session) {
        return Response.json(signedIn);
      }
    }

    return Response.json({
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
      session: data.session
        ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          }
        : null,
      needsEmailConfirmation: !data.session,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Signup failed';
    const unreachable = message.includes('fetch failed') || message.includes('ENOTFOUND');
    return Response.json(
      {
        error: unreachable
          ? `Cannot reach Supabase at ${url}. Check NEXT_PUBLIC_SUPABASE_URL in .env.local`
          : message,
        code: unreachable ? 'SUPABASE_UNREACHABLE' : 'SIGNUP_FAILED',
      },
      { status: unreachable ? 503 : 500 }
    );
  }
}