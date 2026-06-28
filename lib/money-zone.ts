import { LeaderboardEntry } from './game-types';
import { payoutForRank } from './portfolio';

export type MoneyZoneStatus =
  | 'in-the-money'
  | 'bubble'
  | 'chasing'
  | 'out'
  | 'solo'
  | 'unknown';

export type MoneyZoneInsight = {
  status: MoneyZoneStatus;
  rank: number | null;
  paidRanks: number;
  yourValue: number;
  cutoffValue: number | null;
  gapToMoney: number;
  projectedPayout: number;
  headline: string;
  detail: string;
  progressPct: number;
};

export function getPaidRankCount(entryCount: number): number {
  return Math.min(3, Math.max(0, entryCount));
}

export function analyzeMoneyZone(
  entries: LeaderboardEntry[],
  yourValue: number,
  firstPrize: number,
  isYouInList: boolean
): MoneyZoneInsight {
  const sorted = [...entries].sort((a, b) => b.portfolioValue - a.portfolioValue);
  const paidRanks = getPaidRankCount(sorted.length);
  const you = sorted.find((e) => e.isYou);
  const rank = you?.rank ?? (isYouInList ? null : null);

  if (sorted.length === 0) {
    return {
      status: 'unknown',
      rank: null,
      paidRanks: 0,
      yourValue,
      cutoffValue: null,
      gapToMoney: 0,
      projectedPayout: 0,
      headline: 'Waiting for traders',
      detail: 'Join the pit — rankings appear once others enter.',
      progressPct: 0,
    };
  }

  if (sorted.length === 1 && you) {
    return {
      status: 'solo',
      rank: 1,
      paidRanks: 1,
      yourValue,
      cutoffValue: yourValue,
      gapToMoney: 0,
      projectedPayout: payoutForRank(1, firstPrize),
      headline: 'Solo on the tape',
      detail: 'You\'re #1 — invite friends before the bell for a real prize fight.',
      progressPct: 100,
    };
  }

  const cutoffIdx = Math.max(0, paidRanks - 1);
  const cutoffEntry = sorted[cutoffIdx];
  const cutoffValue = cutoffEntry?.portfolioValue ?? null;
  const youIdx = sorted.findIndex((e) => e.isYou);
  const actualRank = you?.rank ?? (youIdx >= 0 ? youIdx + 1 : null);

  if (!you && !isYouInList) {
    return {
      status: 'unknown',
      rank: null,
      paidRanks,
      yourValue,
      cutoffValue,
      gapToMoney: cutoffValue != null ? Math.max(0, cutoffValue - yourValue) : 0,
      projectedPayout: 0,
      headline: 'Not ranked yet',
      detail: 'Your portfolio isn\'t on the leaderboard — refresh or place a trade.',
      progressPct: 0,
    };
  }

  const projectedPayout = actualRank ? payoutForRank(actualRank, firstPrize) : 0;
  const gapToMoney =
    cutoffValue != null && actualRank != null && actualRank > paidRanks
      ? Math.max(0, cutoffValue - yourValue + 1)
      : 0;

  if (actualRank != null && actualRank <= paidRanks && projectedPayout > 0) {
    const nextThreat = sorted[actualRank] ?? null;
    const cushion = nextThreat ? yourValue - nextThreat.portfolioValue : 0;
    return {
      status: actualRank === 1 ? 'in-the-money' : 'in-the-money',
      rank: actualRank,
      paidRanks,
      yourValue,
      cutoffValue,
      gapToMoney: 0,
      projectedPayout,
      headline: actualRank === 1 ? 'Leading the pit' : `In the money — #${actualRank}`,
      detail:
        cushion > 0 && actualRank > 1
          ? `$${cushion.toLocaleString()} ahead of #${actualRank + 1}. Hold the line.`
          : actualRank === 1
            ? `Projected payout: $${projectedPayout}. Defend the top spot.`
            : `Projected payout: $${projectedPayout}.`,
      progressPct: 100,
    };
  }

  const nextTarget =
    youIdx > 0 && !sorted[youIdx - 1]?.isYou ? sorted[youIdx - 1] : null;
  const nextTargetLabel = nextTarget
    ? `@${nextTarget.username.replace(/^@/, '')}`
    : null;

  const bubbleEntry = sorted[paidRanks];
  const bubbleGap = bubbleEntry ? bubbleEntry.portfolioValue - yourValue : gapToMoney;

  if (bubbleGap > 0 && bubbleGap <= yourValue * 0.02) {
    return {
      status: 'bubble',
      rank: actualRank,
      paidRanks,
      yourValue,
      cutoffValue,
      gapToMoney: bubbleGap,
      projectedPayout: 0,
      headline: 'On the bubble',
      detail: nextTargetLabel
        ? `+$${Math.ceil(bubbleGap).toLocaleString()} to pass ${nextTargetLabel} into the cash zone.`
        : `+$${Math.ceil(bubbleGap).toLocaleString()} to crack the cash zone (top ${paidRanks}).`,
      progressPct: Math.min(95, Math.round((yourValue / (cutoffValue || yourValue)) * 100)),
    };
  }

  const chaseGap = gapToMoney || bubbleGap;

  return {
    status: 'chasing',
    rank: actualRank,
    paidRanks,
    yourValue,
    cutoffValue,
    gapToMoney: chaseGap,
    projectedPayout: 0,
    headline: actualRank ? `#${actualRank} — outside the money` : 'Chasing the cash zone',
    detail:
      nextTargetLabel && chaseGap > 0
        ? `Pass ${nextTargetLabel} (+$${Math.ceil(chaseGap).toLocaleString()}) to climb. #${paidRanks} pays at $${cutoffValue?.toLocaleString() ?? '—'}.`
        : cutoffValue != null
          ? `Need +$${Math.ceil(chaseGap).toLocaleString()} to reach #${paidRanks} ($${cutoffValue.toLocaleString()}).`
          : 'Climb the board before the bell rings.',
    progressPct: cutoffValue
      ? Math.min(90, Math.round((yourValue / cutoffValue) * 100))
      : 30,
  };
}