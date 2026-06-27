import { NextRequest } from 'next/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/auth';
import { getSupabaseUserClient } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  const token = request.headers.get('authorization')!.slice(7);
  const db = getSupabaseUserClient(token);
  if (!db) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { data, error } = await db
    .from('participations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ participations: data || [] });
}