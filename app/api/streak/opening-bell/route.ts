import { NextRequest } from 'next/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  getOpeningBellStreakServer,
  syncOpeningBellStreakServer,
} from '@/lib/opening-bell-streak-server';

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  const admin = getSupabaseAdmin();
  if (!admin) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const result = await getOpeningBellStreakServer(admin, user.id);
  return Response.json(result);
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  const admin = getSupabaseAdmin();
  if (!admin) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const result = await syncOpeningBellStreakServer(admin, user.id);
  return Response.json(result);
}