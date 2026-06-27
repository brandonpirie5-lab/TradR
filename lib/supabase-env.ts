/** Resolve publishable/anon key — Supabase dashboard may label it either way. */
export function getSupabasePublishableKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function isSupabaseEnvConfigured(): boolean {
  return !!(getSupabaseUrl() && getSupabasePublishableKey());
}