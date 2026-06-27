import { LeaderboardEntry } from './game-types';
import { Position, getPortfolioValue } from './portfolio';

export function simulateTrade(
  cash: number,
  positions: Position[],
  symbol: string,
  side: 'buy' | 'sell',
  shares: number,
  price: number
): { cash: number; positions: Position[] } {
  let newCash = cash;
  let newPos = positions.map((p) => ({ ...p }));
  const cost = Math.round(shares * price * 100) / 100;

  if (side === 'buy') {
    if (newCash < cost) return { cash, positions };
    newCash -= cost;
    const idx = newPos.findIndex((p) => p.symbol === symbol);
    if (idx >= 0) {
      const old = newPos[idx];
      const tot = old.shares + shares;
      newPos[idx] = {
        symbol,
        shares: tot,
        avgPrice: (old.shares * old.avgPrice + cost) / tot,
      };
    } else {
      newPos.push({ symbol, shares, avgPrice: price });
    }
  } else {
    const idx = newPos.findIndex((p) => p.symbol === symbol);
    if (idx < 0 || newPos[idx].shares < shares) return { cash, positions };
    newCash += cost;
    newPos[idx] = { ...newPos[idx], shares: newPos[idx].shares - shares };
    if (newPos[idx].shares <= 0.0001) newPos.splice(idx, 1);
  }

  return { cash: Math.round(newCash), positions: newPos };
}

export function estimateRankAfterTrade(
  board: LeaderboardEntry[],
  userId: string,
  portfolioAfter: number
): number {
  const others = board.filter((e) => e.userId !== userId && !e.isYou);
  const sorted = [...others, { userId, portfolioValue: portfolioAfter, rank: 0, username: '' }]
    .sort((a, b) => b.portfolioValue - a.portfolioValue);
  const idx = sorted.findIndex((e) => e.userId === userId);
  return idx >= 0 ? idx + 1 : sorted.length;
}

export function portfolioAfterTrade(
  cash: number,
  positions: Position[],
  prices: Record<string, number>,
  symbol: string,
  side: 'buy' | 'sell',
  shares: number,
  price: number
): number | null {
  const sim = simulateTrade(cash, positions, symbol, side, shares, price);
  if (sim.cash === cash && side === 'buy') return null;
  return getPortfolioValue({ cash: sim.cash, positions: sim.positions }, prices);
}