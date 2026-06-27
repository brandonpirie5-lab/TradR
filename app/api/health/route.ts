import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase-env';

async function probeKey(url: string, key: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { ok: true, detail: 'valid' };
    const body = await res.text();
    if (body.toLowerCase().includes('invalid api key')) {
      return { ok: false, detail: 'invalid api key' };
    }
    return { ok: false, detail: `HTTP ${res.status}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'fetch failed';
    return { ok: false, detail: msg.includes('fetch failed') || msg.includes('ENOTFOUND') ? 'cannot reach project url' : msg };
  }
}

export async function GET() {
  const url = getSupabaseUrl();
  const anon = getSupabasePublishableKey();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const checks: Record<string, string> = {
    supabaseUrl: url ? 'set' : 'missing',
    publishableKey: anon ? (anon.startsWith('sb_publishable_') || anon.startsWith('eyJ') ? 'set' : 'unexpected format') : 'missing',
    serviceKey: service ? (service.startsWith('sb_secret_') || service.startsWith('eyJ') ? 'set' : 'unexpected format') : 'missing',
  };

  if (!url || !anon || !service) {
    return Response.json({
      ok: false,
      checks,
      error: 'Missing Supabase environment variables (set in .env.local or Vercel → Environment Variables)',
    }, { status: 503 });
  }

  const [publishableProbe, serviceProbe] = await Promise.all([
    probeKey(url, anon),
    probeKey(url, service),
  ]);

  checks.publishableKeyValid = publishableProbe.ok ? 'yes' : `no (${publishableProbe.detail})`;
  checks.serviceKeyValid = serviceProbe.ok ? 'yes' : `no (${serviceProbe.detail})`;

  if (!publishableProbe.ok || !serviceProbe.ok) {
    const bad = [
      !publishableProbe.ok ? 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY' : null,
      !serviceProbe.ok ? 'SUPABASE_SERVICE_ROLE_KEY' : null,
    ].filter(Boolean);

    return Response.json({
      ok: false,
      checks,
      error: 'Invalid or mismatched Supabase API key(s)',
      hint:
        bad.length === 2
          ? 'Both keys failed — Project URL and keys may be from different projects, or keys were swapped.'
          : `Fix ${bad.join(' and ')} in Vercel env vars (must match Supabase → Settings → API). Then Redeploy.`,
      projectUrl: url,
    }, { status: 500 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return Response.json({
      ok: false,
      checks,
      error: 'Could not create Supabase admin client',
    }, { status: 503 });
  }

  const { data, error } = await admin.from('contests').select('id, title').limit(1);

  if (error) {
    const hint = error.message.includes('relation') || error.message.includes('does not exist')
      ? 'Run supabase-schema.sql in the Supabase SQL Editor'
      : error.message;

    return Response.json({
      ok: false,
      checks,
      error: error.message,
      hint,
      projectUrl: url,
    }, { status: 500 });
  }

  return Response.json({
    ok: true,
    checks,
    contestsFound: data?.length ?? 0,
    projectUrl: url,
  });
}