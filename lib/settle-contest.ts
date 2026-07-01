import { SupabaseClient } from '@supabase/supabase-js';
import { getContestRules } from './contest-rules';
import { fetchMarketPrices } from './market-prices';
import { buildScaledPayouts } from './pit-pool-math';
import { getPortfolioValue, normalizePositions } from './portfolio';

export type SettleResult = {
  contestId: number;
  contestTitle: string;
  totalParticipants: number;
  empty: boolean;
  voided?: boolean;
  userAffected?: boolean;
  userRank?: number;
  userPayout?: number;
  userRefund?: number;
  userFinalValue?: number;
  userNewBalance?: number;
  settlementPrices?: Record<string, number>;
};

type ContestRow = {
  id: number;
  title: string;
  slug?: string | null;
  entry_fee: number;
  max_entries?: number | null;
  starting_portfolio: number;
  first_prize: number;
  assets?: string[] | null;
  status: string;
};

async function voidUnderfilledContest(
  admin: SupabaseClient,
  contest: ContestRow,
  parts: Array<{ id: number; user_id: string }>,
  actingUserId?: string,
  minEntries?: number
): Promise<SettleResult> {
  const entryFee = Number(contest.entry_fee);
  let userRefund = 0;
  let userNewBalance: number | undefined;

  for (const row of parts) {
    await admin
      .from('participations')
      .update({ final_value: null, final_rank: null, payout: 0 })
      .eq('id', row.id);

    if (entryFee > 0) {
      const { data: profile } = await admin
        .from('profiles')
        .select('balance')
        .eq('id', row.user_id)
        .single();

      const newBalance = Number(profile?.balance || 0) + entryFee;
      await admin.from('profiles').update({ balance: newBalance }).eq('id', row.user_id);
      await admin.from('transactions').insert({
        user_id: row.user_id,
        type: 'deposit',
        amount: entryFee,
        description: `Entry refunded — ${contest.title} (${minEntries ?? '?'} trader min not met)`,
        contest_id: contest.id,
      });

      if (actingUserId && row.user_id === actingUserId) {
        userRefund = entryFee;
        userNewBalance = newBalance;
      }
    } else if (actingUserId && row.user_id === actingUserId) {
      const { data: profile } = await admin
        .from('profiles')
        .select('balance')
        .eq('id', row.user_id)
        .single();
      userNewBalance = Number(profile?.balance || 0);
    }
  }

  const closePayload: Record<string, unknown> = {
    status: 'closed',
    settled_at: new Date().toISOString(),
    voided: true,
  };

  try {
    await admin.from('contests').update(closePayload).eq('id', contest.id);
  } catch {
    await admin.from('contests').update({ status: 'closed' }).eq('id', contest.id);
  }

  const userInPit = actingUserId ? parts.some((p) => p.user_id === actingUserId) : false;

  return {
    contestId: contest.id,
    contestTitle: contest.title,
    totalParticipants: parts.length,
    empty: false,
    voided: true,
    userAffected: userInPit,
    userRefund: userInPit ? userRefund : undefined,
    userNewBalance: userInPit ? userNewBalance : undefined,
  };
}

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

  const rules = getContestRules({
    slug: contest.slug ?? undefined,
    entryFee: Number(contest.entry_fee),
    maxEntries: contest.max_entries ?? undefined,
    startingPortfolioValue: Number(contest.starting_portfolio),
  });

  if (parts.length < rules.minEntries) {
    return voidUnderfilledContest(admin, contest, parts, actingUserId, rules.minEntries);
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
  let userFinalValue = 0;
  let userNewBalance: number | null = null;

  const entryFee = Number(contest.entry_fee);
  const payoutMap = buildScaledPayouts(contest.slug ?? undefined, {
    entryFee,
    participantCount: parts.length,
  });

  for (let i = 0; i < ranked.length; i++) {
    const row = ranked[i];
    const rank = i + 1;
    const payout = payoutMap.get(rank) ?? 0;

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
        userFinalValue = row.finalValue;
        userNewBalance = newBalance;
      }
    } else if (actingUserId && row.user_id === actingUserId) {
      userRank = rank;
      userPayout = 0;
      userFinalValue = row.finalValue;
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

  const userInPit = actingUserId ? ranked.some((r) => r.user_id === actingUserId) : false;

  return {
    contestId,
    contestTitle: contest.title,
    totalParticipants: ranked.length,
    empty: false,
    userAffected: userInPit,
    userRank: actingUserId ? userRank : undefined,
    userPayout: actingUserId ? userPayout : undefined,
    userFinalValue: actingUserId ? userFinalValue : undefined,
    userNewBalance: actingUserId ? (userNewBalance ?? undefined) : undefined,
    settlementPrices: prices,
  };
}

export async function settleExpiredContests(
  admin: SupabaseClient,
  actingUserId?: string
): Promise<SettleResult[]> {
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
      const result = await settleContestById(admin, row.id, actingUserId);
      results.push(result);
    } catch (e) {
      console.warn(`Auto-settle failed for contest ${row.id}`, e);
    }
  }
  return results;
}