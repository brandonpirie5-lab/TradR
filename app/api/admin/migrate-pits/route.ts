import { NextRequest } from 'next/server';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import postgres from 'postgres';

function authorize(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization')?.replace('Bearer ', '');
  return auth === secret;
}

function getDbUrl(): string | null {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  const password = process.env.SUPABASE_DB_PASSWORD;
  const ref = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!password || !ref) return null;
  const region = process.env.SUPABASE_DB_REGION || 'us-east-1';
  return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
}

export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return Response.json({ error: 'Unauthorized — set CRON_SECRET and pass Bearer token' }, { status: 401 });
  }

  const dbUrl = getDbUrl();
  if (!dbUrl) {
    return Response.json(
      {
        error: 'SUPABASE_DB_PASSWORD (or SUPABASE_DB_URL) not configured',
        hint: 'Add database password from Supabase Dashboard → Settings → Database',
        fallback: 'Or paste scripts/apply-pit-migration.sql into Supabase SQL Editor',
      },
      { status: 503 }
    );
  }

  const sqlPath = resolve(process.cwd(), 'scripts/apply-pit-migration.sql');
  const sql = readFileSync(sqlPath, 'utf8');
  const statements = sql
    .split(';')
    .map((s) => s.replace(/--[^\n]*/g, '').trim())
    .filter((s) => s.length > 0);

  const db = postgres(dbUrl, { ssl: 'require', max: 1 });

  try {
    for (const statement of statements) {
      await db.unsafe(statement);
    }

    const live = await db<{ id: number; title: string; slug: string | null; status: string }[]>`
      select id, title, slug, status from contests where status <> 'closed' order by id
    `;

    return Response.json({
      ok: true,
      statementsRun: statements.length,
      liveContests: live,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Migration failed';
    return Response.json({ error: message }, { status: 500 });
  } finally {
    await db.end({ timeout: 5 });
  }
}