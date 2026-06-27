import { SupabaseClient } from '@supabase/supabase-js';
import { normalizePositions, Position } from './portfolio';
import { isContestBellOpen, isJoinAllowed } from './contest-bell';

export function isMissingRpcError(message?: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes('could not find the function') || m.includes('schema cache');
}

export async function joinContestServer(
  admin: SupabaseClient,
  userId: string,
  contestId: number
): Promise<{ new_balance: number; entry_count: number }> {
  const { data: contest, error: contestError } = await admin
    .from('contests')
    .select('*')
    .eq('id', contestId)
    .single();

  if (contestError || !contest) throw new Error('Contest not found');
  if (contest.status === 'closed') throw new Error('Contest is closed');
  if (!isJoinAllowed({ status: contest.status, endsAt: contest.ends_at })) {
    throw new Error('Join cutoff — pit closes in under 5 minutes');
  }

  const { count } = await admin
    .from('participations')
    .select('*', { count: 'exact', head: true })
    .eq('contest_id', contestId);

  const entryCount = count ?? 0;
  if (contest.max_entries != null && entryCount >= contest.max_entries) {
    throw new Error('Contest is full');
  }

  const { data: existing } = await admin
    .from('participations')
    .select('id')
    .eq('user_id', userId)
    .eq('contest_id', contestId)
    .maybeSingle();

  if (existing) throw new Error('Already joined this contest');

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('balance')
    .eq('id', userId)
    .single();

  if (profileError || !profile) throw new Error('Profile not found');

  const balance = Number(profile.balance);
  const entryFee = Number(contest.entry_fee);
  if (balance < entryFee) throw new Error('Insufficient balance');

  const newBalance = balance - entryFee;
  const startingPortfolio = Number(contest.starting_portfolio);

  const { error: balanceError } = await admin
    .from('profiles')
    .update({ balance: newBalance })
    .eq('id', userId);

  if (balanceError) throw new Error(balanceError.message);

  const { error: partError } = await admin.from('participations').insert({
    user_id: userId,
    contest_id: contestId,
    cash: startingPortfolio,
    positions: [],
    starting_value: startingPortfolio,
  });

  if (partError) {
    await admin.from('profiles').update({ balance }).eq('id', userId);
    throw new Error(partError.message);
  }

  await admin.from('transactions').insert({
    user_id: userId,
    type: 'entry_fee',
    amount: -entryFee,
    description: `Entry for ${contest.title}`,
    contest_id: contestId,
  });

  if (contest.status === 'open') {
    await admin.from('contests').update({ status: 'active' }).eq('id', contestId);
  }

  return { new_balance: newBalance, entry_count: entryCount + 1 };
}

export async function executeTradeServer(
  admin: SupabaseClient,
  userId: string,
  contestId: number,
  symbol: string,
  side: 'buy' | 'sell',
  shares: number,
  price: number
): Promise<{ cash: number; positions: Position[] }> {
  const { data: contest, error: contestError } = await admin
    .from('contests')
    .select('assets, status, ends_at')
    .eq('id', contestId)
    .single();

  if (contestError || !contest) throw new Error('Contest not found');
  if (contest.status === 'closed') throw new Error('Contest is closed');
  if (!isContestBellOpen({ status: contest.status, endsAt: contest.ends_at })) {
    throw new Error('Bell has rung — trading is closed for this pit');
  }

  const assets: string[] = contest.assets || [];
  if (assets.length && !assets.includes(symbol)) {
    throw new Error('Symbol not allowed in this contest');
  }

  const { data: part, error: partError } = await admin
    .from('participations')
    .select('*')
    .eq('user_id', userId)
    .eq('contest_id', contestId)
    .single();

  if (partError || !part) throw new Error('You are not in this contest');

  let cash = Number(part.cash);
  let positions = normalizePositions(part.positions);
  const cost = Math.round(shares * price * 100) / 100;

  if (side === 'buy') {
    if (cash < cost) throw new Error('Insufficient cash');
    cash -= cost;
    const idx = positions.findIndex((p) => p.symbol === symbol);
    if (idx >= 0) {
      const old = positions[idx];
      const totShares = old.shares + shares;
      positions[idx] = {
        symbol,
        shares: totShares,
        avgPrice: (old.shares * old.avgPrice + cost) / totShares,
      };
    } else {
      positions.push({ symbol, shares, avgPrice: price });
    }
  } else {
    const idx = positions.findIndex((p) => p.symbol === symbol);
    if (idx < 0 || positions[idx].shares < shares) throw new Error('Insufficient shares');
    cash += cost;
    positions[idx].shares -= shares;
    if (positions[idx].shares <= 0.0001) positions.splice(idx, 1);
  }

  cash = Math.round(cash);

  const { error: updateError } = await admin
    .from('participations')
    .update({ cash, positions })
    .eq('user_id', userId)
    .eq('contest_id', contestId);

  if (updateError) throw new Error(updateError.message);

  try {
    await admin.from('trade_log').insert({
      user_id: userId,
      contest_id: contestId,
      symbol,
      side,
      shares,
      price,
      total: cost,
    });
  } catch {
    /* trade_log table optional until SQL migration is run */
  }

  return { cash, positions };
}