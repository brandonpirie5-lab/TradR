import { createClient, User } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { getSupabasePublishableKey, getSupabaseUrl } from './supabase-env';

export async function getUserFromRequest(request: NextRequest): Promise<User | null> {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabasePublishableKey();
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return Response.json({ error: message }, { status: 401 });
}

export function badRequestResponse(message: string) {
  return Response.json({ error: message }, { status: 400 });
}