import { SupabaseClient } from '@supabase/supabase-js';
import { fetchMarketPrices } from './market-prices';
import { getPortfolioValue, normalizePositions, payoutForRank } from './portfolio';

export type SettleResult = {
  contestId: number;
  contestTitle: string;
  totalParticipants: number;
  empty: boolean;
  userRank?: number;
  userPayout?: number;
  userNewBalance?: number;
  settlementPrices?: Record<string, number>;
};

export async function settleContestById(
  admin: SupabaseClient,
  contestId: number,
  actingUserId?: string
): Promise<SettleResult> {
  const { data: contest, error: contestError } = await admin
    .from('contests')
    .select('*')
    .eq('id', contestId)
    .single();

  if (contestError || !contest) throw new Error('Contest not found');
  if (contest.status === 'closed') throw new Error('Contest already settled');

  const { data: parts, error: partsError } = await admin
    .from('participations')
    .select('*')
    .eq('contest_id', contestId);

  if (partsError) throw new Error(partsError.message);

  if (!parts?.length) {
    await admin.from('contests').update({ status: 'closed' }).eq('id', contestId);
    return {
      contestId,
      contestTitle: contest.title,
      totalParticipants: 0,
      empty: true,
    };
  }

  const symbols = new Set<string>(contest.assets || []);
  for (const p of parts) {
    for (const pos of normalizePositions(p.positions)) {
      symbols.add(pos.symbol);
    }
  }

  const prices = await fetchMarketPrices([...symbols]);

  const ranked = parts
    .map((p) => ({
      ...p,
      finalValue: getPortfolioValue(
        { cash: Number(p.cash), positions: normalizePositions(p.positions) },
        prices
      ),
    }))
    .sort((a, b) => b.finalValue - a.finalValue);

  let userRank = 0;
  let userPayout = 0;
  let userNewBalance: number | null = null;

  for (let i = 0; i < ranked.length; i++) {
    const row = ranked[i];
    const rank = i + 1;
    const payout = payoutForRank(rank, Number(contest.first_prize));

    await admin
      .from('participations')
      .update({ final_value: row.finalValue, final_rank: rank, payout })
      .eq('id', row.id);

    if (payout > 0) {
      const { data: profile } = await admin
        .from('profiles')
        .select('balance')
        .eq('id', row.user_id)
        .single();

      const newBalance = Number(profile?.balance || 0) + payout;
      await admin.from('profiles').update({ balance: newBalance }).eq('id', row.user_id);
      await admin.from('transactions').insert({
        user_id: row.user_id,
        type: 'payout',
        amount: payout,
        description: `Payout for ${contest.title} (rank #${rank})`,
        contest_id: contestId,
      });

      if (actingUserId && row.user_id === actingUserId) {
        userRank = rank;
        userPayout = payout;
        userNewBalance = newBalance;
      }
    } else if (actingUserId && row.user_id === actingUserId) {
      userRank = rank;
      userPayout = 0;
      const { data: profile } = await admin
        .from('profiles')
        .select('balance')
        .eq('id', row.user_id)
        .single();
      userNewBalance = Number(profile?.balance || 0);
    }
  }

  const closePayload: Record<string, unknown> = { status: 'closed' };
  closePayload.settlement_prices = prices;
  closePayload.settled_at = new Date().toISOString();

  try {
    await admin.from('contests').update(closePayload).eq('id', contestId);
  } catch {
    await admin.from('contests').update({ status: 'closed' }).eq('id', contestId);
  }

  return {
    contestId,
    contestTitle: contest.title,
    totalParticipants: ranked.length,
    empty: false,
    userRank: actingUserId ? userRank : undefined,
    userPayout: actingUserId ? userPayout : undefined,
    userNewBalance: actingUserId ? (userNewBalance ?? undefined) : undefined,
    settlementPrices: prices,
  };
}

export async function settleExpiredContests(admin: SupabaseClient): Promise<SettleResult[]> {
  const now = new Date().toISOString();
  const { data: expired, error } = await admin
    .from('contests')
    .select('id')
    .neq('status', 'closed')
    .not('ends_at', 'is', null)
    .lte('ends_at', now);

  if (error) throw new Error(error.message);
  if (!expired?.length) return [];

  const results: SettleResult[] = [];
  for (const row of expired) {
    try {
      const result = await settleContestById(admin, row.id);
      results.push(result);
    } catch (e) {
      console.warn(`Auto-settle failed for contest ${row.id}`, e);
    }
  }
  return results;
}