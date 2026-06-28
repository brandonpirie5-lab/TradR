import { SupabaseClient } from '@supabase/supabase-js';
import { REFERRAL_TIERS } from './referral-program';

async function creditReferrer(
  admin: SupabaseClient,
  userId: string,
  amount: number,
  description: string
): Promise<void> {
  if (amount <= 0) return;

  const { data: profile } = await admin.from('profiles').select('balance').eq('id', userId).single();
  if (!profile) return;

  const newBal = Number(profile.balance) + amount;
  await admin.from('profiles').update({ balance: newBal }).eq('id', userId);
  await admin.from('transactions').insert({
    user_id: userId,
    type: 'deposit',
    amount,
    description,
  });
}

/** Award referral credits when a user pays an entry fee. */
export async function applyReferralEntryCredits(
  admin: SupabaseClient,
  entrantId: string,
  entryFee: number,
  contestTitle: string
): Promise<void> {
  if (entryFee <= 0) return;

  const { data: entrant } = await admin
    .from('profiles')
    .select('referred_by')
    .eq('id', entrantId)
    .single();

  const directReferrerId = entrant?.referred_by as string | null | undefined;
  if (!directReferrerId || directReferrerId === entrantId) return;

  const { count: priorPaidEntries } = await admin
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', entrantId)
    .eq('type', 'entry_fee');

  const isFirstPaidEntry = (priorPaidEntries ?? 0) <= 1;

  if (isFirstPaidEntry) {
    await creditReferrer(
      admin,
      directReferrerId,
      REFERRAL_TIERS.firstPaidEntryBonus,
      `First pit bonus — invitee entered ${contestTitle}`
    );
  }

  const directCredit = Math.min(
    REFERRAL_TIERS.monthlyCapPerReferral,
    Math.round(entryFee * (REFERRAL_TIERS.directEntryFeePct / 100) * 100) / 100
  );
  if (directCredit > 0) {
    await creditReferrer(
      admin,
      directReferrerId,
      directCredit,
      `${REFERRAL_TIERS.directEntryFeePct}% rake — ${contestTitle}`
    );
  }

  const { data: directReferrer } = await admin
    .from('profiles')
    .select('referred_by')
    .eq('id', directReferrerId)
    .single();

  const secondDegreeId = directReferrer?.referred_by as string | null | undefined;
  if (secondDegreeId && secondDegreeId !== entrantId) {
    const secondCredit = Math.min(
      REFERRAL_TIERS.monthlyCapPerReferral,
      Math.round(entryFee * (REFERRAL_TIERS.secondDegreeEntryFeePct / 100) * 100) / 100
    );
    if (secondCredit > 0) {
      await creditReferrer(
        admin,
        secondDegreeId,
        secondCredit,
        `${REFERRAL_TIERS.secondDegreeEntryFeePct}% 2nd-degree — ${contestTitle}`
      );
    }
  }
}