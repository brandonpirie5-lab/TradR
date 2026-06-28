import { SupabaseClient } from '@supabase/supabase-js';

/** Promote scheduled pits whose starts_at has passed to active (trading live). */
export async function activateScheduledContests(admin: SupabaseClient): Promise<number> {
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from('contests')
    .update({ status: 'active' })
    .eq('status', 'open')
    .not('starts_at', 'is', null)
    .lte('starts_at', now)
    .select('id');

  if (error) {
    console.warn('activateScheduledContests failed', error.message);
    return 0;
  }
  return data?.length ?? 0;
}