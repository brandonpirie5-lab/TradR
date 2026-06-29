import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase-env';

const SERVER_UA = 'TradR-Server/1.0';

type ProbeResult = { ok: boolean; detail: string };

function serverHeaders(key: string): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'User-Agent': SERVER_UA,
  };
}

async function probeAuthHealth(url: string, key: string): Promise<ProbeResult> {
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: serverHeaders(key),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { ok: true, detail: 'auth ok' };
    const body = await res.text();
    if (body.toLowerCase().includes('invalid api key')) {
      return { ok: false, detail: 'invalid api key' };
    }
    return { ok: false, detail: `auth HTTP ${res.status}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'fetch failed';
    return {
      ok: false,
      detail:
        msg.includes('fetch failed') || msg.includes('ENOTFOUND')
          ? 'cannot reach project url'
          : msg,
    };
  }
}

async function probeRestAccess(url: string, key: string): Promise<ProbeResult> {
  try {
    const res = await fetch(`${url}/rest/v1/contests?select=id&limit=1`, {
      headers: serverHeaders(key),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { ok: true, detail: 'rest ok' };
    if (res.status === 401) {
      return { ok: false, detail: 'unauthorized' };
    }
    return { ok: false, detail: `rest HTTP ${res.status}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'fetch failed';
    return { ok: false, detail: msg };
  }
}

async function probePublishableKey(url: string, key: string): Promise<ProbeResult> {
  const auth = await probeAuthHealth(url, key);
  if (auth.ok) return auth;
  return probeRestAccess(url, key);
}

async function probeServiceKey(url: string, key: string): Promise<ProbeResult> {
  // sb_secret_* keys are validated via REST; legacy service_role JWT also works on REST.
  const rest = await probeRestAccess(url, key);
  if (rest.ok) return rest;
  return probeAuthHealth(url, key);
}

function keyLooksPublishable(key: string): boolean {
  return key.startsWith('sb_publishable_') || key.startsWith('eyJ');
}

function keyLooksSecret(key: string): boolean {
  return key.startsWith('sb_secret_') || key.startsWith('eyJ');
}

export async function GET() {
  const url = getSupabaseUrl();
  const anon = getSupabasePublishableKey();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const checks: Record<string, string> = {
    supabaseUrl: url ? 'set' : 'missing',
    publishableKey: anon
      ? keyLooksPublishable(anon)
        ? 'set'
        : 'unexpected format'
      : 'missing',
    serviceKey: service
      ? keyLooksSecret(service)
        ? 'set'
        : 'unexpected format'
      : 'missing',
  };

  if (!url || !anon || !service) {
    return Response.json(
      {
        ok: false,
        checks,
        error: 'Missing Supabase environment variables (set in .env.local or Vercel → Environment Variables)',
        hint: '.env.local is local only — Vercel does not auto-sync from git. Add the same keys in Vercel, then redeploy.',
      },
      { status: 503 }
    );
  }

  if (anon === service) {
    return Response.json(
      {
        ok: false,
        checks,
        error: 'Publishable and service keys are identical',
        hint: 'Use sb_publishable_* for NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and sb_secret_* for SUPABASE_SERVICE_ROLE_KEY.',
        projectUrl: url,
      },
      { status: 500 }
    );
  }

  if (keyLooksPublishable(service) && keyLooksSecret(anon)) {
    return Response.json(
      {
        ok: false,
        checks,
        error: 'Supabase keys appear swapped',
        hint: 'Swap them: publishable → NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, secret → SUPABASE_SERVICE_ROLE_KEY.',
        projectUrl: url,
      },
      { status: 500 }
    );
  }

  const [publishableProbe, serviceProbe] = await Promise.all([
    probePublishableKey(url, anon),
    probeServiceKey(url, service),
  ]);

  checks.publishableKeyValid = publishableProbe.ok ? 'yes' : `no (${publishableProbe.detail})`;
  checks.serviceKeyValid = serviceProbe.ok ? 'yes' : `no (${serviceProbe.detail})`;

  if (!publishableProbe.ok || !serviceProbe.ok) {
    const bad = [
      !publishableProbe.ok ? 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY' : null,
      !serviceProbe.ok ? 'SUPABASE_SERVICE_ROLE_KEY' : null,
    ].filter(Boolean);

    let hint =
      bad.length === 2
        ? 'Both keys failed — Project URL and keys may be from different projects.'
        : `Fix ${bad.join(' and ')} in .env.local (local) or Vercel env vars (production), then restart dev / redeploy.`;

    if (!serviceProbe.ok && publishableProbe.ok) {
      const swapped = await probeRestAccess(url, anon);
      if (!swapped.ok) {
        hint =
          'Service key invalid. In Supabase → Settings → API Keys: copy the secret key (sb_secret_…) into SUPABASE_SERVICE_ROLE_KEY.';
      }
    }

    return Response.json(
      {
        ok: false,
        checks,
        error: 'Invalid or mismatched Supabase API key(s)',
        hint,
        projectUrl: url,
      },
      { status: 500 }
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return Response.json(
      {
        ok: false,
        checks,
        error: 'Could not create Supabase admin client',
      },
      { status: 503 }
    );
  }

  const { data, error } = await admin.from('contests').select('id, title').limit(1);

  if (error) {
    const hint = error.message.includes('relation') || error.message.includes('does not exist')
      ? 'Run supabase-schema.sql in the Supabase SQL Editor'
      : error.message;

    return Response.json(
      {
        ok: false,
        checks,
        error: error.message,
        hint,
        projectUrl: url,
      },
      { status: 500 }
    );
  }

  return Response.json({
    ok: true,
    checks,
    contestsFound: data?.length ?? 0,
    projectUrl: url,
  });
}