import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase-env';

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
      error: 'Missing Supabase environment variables in .env.local',
    }, { status: 503 });
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
      : error.message.includes('fetch failed')
        ? 'Cannot reach Supabase — your Project URL is likely wrong or the project was deleted'
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