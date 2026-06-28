import { LeaderboardEntry } from './game-types';

export type PitMoment = {
  headline: string;
  detail?: string;
  tone: 'climb' | 'top' | 'drop' | 'hold';
};

export function buildPitMoment(params: {
  rankBefore: number;
  rankAfter: number;
  rankDelta: number;
  board: LeaderboardEntry[];
  symbol: string;
  side: 'buy' | 'sell' | string;
}): PitMoment | null {
  const { rankBefore, rankAfter, rankDelta, board, symbol, side } = params;

  if (rankDelta > 0) {
    const passed = board
      .filter((e) => !e.isYou && e.rank >= rankAfter && e.rank < rankBefore)
      .sort((a, b) => a.rank - b.rank);

    if (rankAfter === 1) {
      return {
        headline: 'You took the tape',
        detail: `${side.toUpperCase()} ${symbol} put you on top`,
        tone: 'top',
      };
    }

    if (passed.length > 0) {
      const names = passed
        .slice(0, 2)
        .map((e) => e.username)
        .join(', ');
      const more = passed.length > 2 ? ` +${passed.length - 2}` : '';
      return {
        headline: `Passed ${names}${more}`,
        detail: `Now #${rankAfter} after that ${side}`,
        tone: 'climb',
      };
    }

    return {
      headline: `Climbed to #${rankAfter}`,
      detail: `${side.toUpperCase()} ${symbol} moved you up`,
      tone: 'climb',
    };
  }

  if (rankDelta < -2) {
    return {
      headline: `Slipped to #${rankAfter}`,
      detail: 'Tape is moving — respond or get buried',
      tone: 'drop',
    };
  }

  return null;
}