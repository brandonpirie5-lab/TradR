import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildStreakInfo,
  computeStreakAfterPlay,
  milestonesToClaim,
  type OpeningBellStreakInfo,
} from './opening-bell-streak-shared';

type ProfileStreakRow = {
  opening_bell_streak?: number | null;
  opening_bell_last_day_et?: string | null;
  opening_bell_milestones_claimed?: number[] | null;
  balance?: number | null;
};

async function creditUser(
  admin: SupabaseClient,
  userId: string,
  amount: number,
  description: string
): Promise<void> {
  const { data: profile } = await admin.from('profiles').select('balance').eq('id', userId).single();
  if (!profile) return;

  const newBal = Number(profile.balance || 0) + amount;
  await admin.from('profiles').update({ balance: newBal }).eq('id', userId);
  await admin.from('transactions').insert({
    user_id: userId,
    type: 'deposit',
    amount,
    description,
  });
}

export type OpeningBellStreakSyncResult = OpeningBellStreakInfo & {
  lastDayEt: string | null;
  creditsAwarded: { days: number; amount: number; label: string }[];
};

export async function syncOpeningBellStreakServer(
  admin: SupabaseClient,
  userId: string,
  now = new Date()
): Promise<OpeningBellStreakSyncResult> {
  const { data: profile, error } = await admin
    .from('profiles')
    .select('opening_bell_streak, opening_bell_last_day_et, opening_bell_milestones_claimed, balance')
    .eq('id', userId)
    .single();

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('opening_bell') || msg.includes('column')) {
      return { ...buildStreakInfo(0, null, now), lastDayEt: null, creditsAwarded: [] };
    }
    throw error;
  }

  const row = (profile || {}) as ProfileStreakRow;
  const claimed = Array.isArray(row.opening_bell_milestones_claimed)
    ? row.opening_bell_milestones_claimed.map(Number)
    : [];

  const { streak, lastDayEt, incremented } = computeStreakAfterPlay(
    row.opening_bell_last_day_et,
    Number(row.opening_bell_streak || 0),
    now
  );

  const toClaim = incremented ? milestonesToClaim(streak, claimed) : [];
  const creditsAwarded: OpeningBellStreakSyncResult['creditsAwarded'] = [];
  const newClaimed = [...claimed];

  for (const milestone of toClaim) {
    await creditUser(
      admin,
      userId,
      milestone.rewardAmount,
      `Opening Bell streak — ${milestone.label}`
    );
    creditsAwarded.push({
      days: milestone.days,
      amount: milestone.rewardAmount,
      label: milestone.label,
    });
    newClaimed.push(milestone.days);
  }

  if (incremented || toClaim.length > 0) {
    await admin
      .from('profiles')
      .update({
        opening_bell_streak: streak,
        opening_bell_last_day_et: lastDayEt,
        opening_bell_milestones_claimed: newClaimed,
      })
      .eq('id', userId);
  }

  return {
    ...buildStreakInfo(streak, lastDayEt, now),
    lastDayEt,
    creditsAwarded,
  };
}

export async function getOpeningBellStreakServer(
  admin: SupabaseClient,
  userId: string,
  now = new Date()
): Promise<OpeningBellStreakSyncResult> {
  const { data: profile, error } = await admin
    .from('profiles')
    .select('opening_bell_streak, opening_bell_last_day_et')
    .eq('id', userId)
    .single();

  if (error) {
    return { ...buildStreakInfo(0, null, now), lastDayEt: null, creditsAwarded: [] };
  }

  const row = (profile || {}) as ProfileStreakRow;
  const lastDayEt = row.opening_bell_last_day_et ?? null;
  return {
    ...buildStreakInfo(Number(row.opening_bell_streak || 0), lastDayEt, now),
    lastDayEt,
    creditsAwarded: [],
  };
}