import { createClient } from '@supabase/supabase-js';
import { getSupabasePublishableKey, getSupabaseUrl, isSupabaseEnvConfigured } from './supabase-env';

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabasePublishableKey();

export const isSupabaseConfigured = isSupabaseEnvConfigured();

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Types
export type Profile = {
  id: string;
  username: string | null;
  balance: number;
  created_at: string;
  referral_code?: string | null;
};

export type DbParticipation = {
  id: number;
  user_id: string;
  contest_id: number;
  cash: number;
  positions: any[];
  starting_value: number;
  created_at: string;
};

export type DbTransaction = {
  id: number;
  user_id: string;
  type: 'deposit' | 'entry_fee' | 'payout' | 'withdrawal';
  amount: number;
  description: string;
  contest_id: number | null;
  created_at: string;
};
