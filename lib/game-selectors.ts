import type { Contest, LeaderboardEntry, Participation, UserPerformanceStats } from './game-types';
import { getPortfolioValue as calcPortfolioValue } from './portfolio';
import { findOpeningBellContest, isStaleOpeningBellContest } from './pit-contests';
import { featuredPitSortScore } from './tape-week';
import {
  isContestStarted,
  isContestTradingOpen,
  isJoinAllowed,
} from './contest-bell';
import { mockOtherTraders } from './game-constants';

export type ArenaPitListItem = { contest: Contest; scheduled: boolean };

export function selectJoinedContests(participations: Record<number, Participation>): number[] {
  return Object.keys(participations).map(Number);
}

export function getAllSymbolsFromContests(contests: Contest[]): string[] {
  const set = new Set<string>();
  contests.forEach((c) => c.assets.forEach((a) => set.add(a)));
  return Array.from(set);
}

export function buildContestBoard(params: {
  contestId: number | null;
  participations: Record<number, Participation>;
  prices: Record<string, number>;
  leaderboardByContest: Record<number, LeaderboardEntry[]>;
  userId?: string;
  userEmail?: string | null;
  pitDisplayName: string;
  isSupabaseConfigured: boolean;
  isLoggedIn: boolean;
}): LeaderboardEntry[] {
  const {
    contestId,
    participations,
    prices,
    leaderboardByContest,
    userId,
    userEmail,
    pitDisplayName,
    isSupabaseConfigured,
    isLoggedIn,
  } = params;
  if (!contestId) return [];

  const part = participations[contestId];
  const getVal = (p: { cash: number; positions: Participation['positions'] }) =>
    calcPortfolioValue(p, prices);

  const liveEntryValue = (entry: LeaderboardEntry): number => {
    const isYou = entry.isYou || (userId != null && entry.userId === userId);
    if (isYou && part) return getVal(part);
    if (entry.cash != null && entry.positions) {
      return getVal({ cash: entry.cash, positions: entry.positions });
    }
    return entry.portfolioValue;
  };

  const serverBoard = leaderboardByContest[contestId];
  if (serverBoard?.length) {
    const hasLivePrices = Object.keys(prices).length > 0;
    const merged = serverBoard.map((e) => {
      const isYou = e.isYou || (userId != null && e.userId === userId);
      const portfolioValue = hasLivePrices ? liveEntryValue({ ...e, isYou }) : e.portfolioValue;
      return { ...e, isYou, portfolioValue };
    });
    return merged
      .sort((a, b) => b.portfolioValue - a.portfolioValue)
      .map((e, i) => ({ ...e, rank: i + 1 }));
  }

  if (!part) return [];

  if (isSupabaseConfigured || isLoggedIn) {
    const v = getVal(part);
    return [
      {
        userId: userId || 'you',
        username:
          pitDisplayName !== '@trader'
            ? pitDisplayName
            : userEmail
              ? `@${userEmail.split('@')[0]}`
              : '@you',
        portfolioValue: v,
        isYou: true,
        rank: 1,
      },
    ];
  }

  const entries: LeaderboardEntry[] = [];
  const yourVal = getVal(part);
  entries.push({
    userId: 'you',
    username: '@you',
    portfolioValue: yourVal || 98500,
    isYou: true,
    rank: 1,
  });

  const priceHash = Object.values(prices).reduce((a, b) => a + b, 0);
  mockOtherTraders.forEach((t, i) => {
    const variance = ((priceHash % (700 + i * 30)) - 250) * (i === 0 ? 3.8 : 2.2);
    entries.push({
      userId: `mock-${i}`,
      username: t.username,
      portfolioValue: Math.round(t.baseValue + variance),
      rank: i + 2,
    });
  });

  return entries
    .sort((a, b) => b.portfolioValue - a.portfolioValue)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

export function resolveVaultContestId(params: {
  vaultContestId: number | null;
  joinedContests: number[];
  contests: Contest[];
  featuredContest?: Contest;
}): number | null {
  const { vaultContestId, joinedContests, contests, featuredContest } = params;
  const canonicalOpeningBell = findOpeningBellContest(contests);

  if (vaultContestId) {
    const prevContest = contests.find((c) => c.id === vaultContestId);
    if (prevContest && isStaleOpeningBellContest(prevContest, canonicalOpeningBell)) {
      if (canonicalOpeningBell?.id && joinedContests.includes(canonicalOpeningBell.id)) {
        return canonicalOpeningBell.id;
      }
    }
    return vaultContestId;
  }
  if (joinedContests.length) {
    if (canonicalOpeningBell?.id && joinedContests.includes(canonicalOpeningBell.id)) {
      return canonicalOpeningBell.id;
    }
    const live = joinedContests.find((id) => {
      const c = contests.find((x) => x.id === id);
      return c && c.status !== 'closed' && !isStaleOpeningBellContest(c, canonicalOpeningBell);
    });
    return live ?? joinedContests[joinedContests.length - 1];
  }
  return featuredContest?.id ?? null;
}

export function buildArenaPitList(
  contests: Contest[],
  joinedContests: number[]
): ArenaPitListItem[] {
  const canonicalOpeningBell = findOpeningBellContest(contests);
  const todayDayIndex = new Date().getDay();

  const isJoinableContest = (c: Contest) =>
    (c.status === 'open' || c.status === 'active') && isJoinAllowed(c);

  const arenaPitPriority = (c: Contest, scheduled: boolean) => {
    const joined = joinedContests.includes(c.id);
    if (joined && isContestTradingOpen(c)) return 0;
    if (joined && scheduled) return 1;
    if (!joined && isContestTradingOpen(c)) return 2;
    return 3;
  };

  const arenaPitList: ArenaPitListItem[] = [];
  const seenArenaPitIds = new Set<number>();

  for (const c of contests) {
    if (c.status !== 'open' && c.status !== 'active') continue;
    if (isStaleOpeningBellContest(c, canonicalOpeningBell)) continue;

    const scheduled = isJoinableContest(c) && !isContestStarted(c);
    const live = isContestTradingOpen(c);
    if (!live && !scheduled) continue;
    if (seenArenaPitIds.has(c.id)) continue;

    arenaPitList.push({ contest: c, scheduled });
    seenArenaPitIds.add(c.id);
  }

  arenaPitList.sort((a, b) => {
    const priorityDiff =
      arenaPitPriority(a.contest, a.scheduled) - arenaPitPriority(b.contest, b.scheduled);
    if (priorityDiff !== 0) return priorityDiff;
    const featuredDiff =
      featuredPitSortScore(a.contest.slug, todayDayIndex) -
      featuredPitSortScore(b.contest.slug, todayDayIndex);
    if (featuredDiff !== 0) return featuredDiff;
    return b.contest.firstPrize - a.contest.firstPrize;
  });

  return arenaPitList;
}

export function isBattleOpen(
  p: Participation,
  contests: Contest[]
): boolean {
  const c = contests.find((cc) => cc.id === p.contestId);
  return !!c && c.status !== 'closed' && p.finalRank == null;
}

export function selectActiveBattles(
  participations: Record<number, Participation>,
  contests: Contest[]
): Participation[] {
  return Object.values(participations).filter(
    (p) => isBattleOpen(p, contests) && isContestStarted(contests.find((c) => c.id === p.contestId)!)
  );
}

export function selectScheduledBattles(
  participations: Record<number, Participation>,
  contests: Contest[]
): Participation[] {
  return Object.values(participations).filter(
    (p) => isBattleOpen(p, contests) && !isContestStarted(contests.find((c) => c.id === p.contestId)!)
  );
}

export function selectCompletedBattles(
  participations: Record<number, Participation>,
  contests: Contest[]
): Participation[] {
  return Object.values(participations).filter((p) => {
    const c = contests.find((cc) => cc.id === p.contestId);
    return c?.status === 'closed' || p.finalRank != null;
  });
}

export function computeDemoStats(participations: Record<number, Participation>): UserPerformanceStats {
  const all = Object.values(participations);
  const completed = all.filter((p) => p.finalRank != null);
  const wins = completed.filter((p) => p.finalRank === 1).length;
  const placements = completed.filter((p) => p.finalRank != null && (p.finalRank as number) <= 3).length;
  const cashed = completed.filter((p) => (p.payout || 0) > 0).length;
  const totalWinnings = completed.reduce((s, p) => s + (p.payout || 0), 0);
  const ranks = completed.map((p) => p.finalRank as number);
  const sortedCompleted = [...completed].sort((a, b) => b.contestId - a.contestId);
  let pitStreak = 0;
  for (const p of sortedCompleted) {
    if (p.finalRank != null && p.finalRank <= 3) pitStreak++;
    else break;
  }
  return {
    contestsEntered: all.length,
    contestsCompleted: completed.length,
    wins,
    placements,
    cashed,
    winRate: completed.length ? Math.round((wins / completed.length) * 1000) / 10 : 0,
    totalWinnings,
    totalEntryFees: 0,
    netProfit: totalWinnings,
    avgFinishRank: ranks.length ? Math.round((ranks.reduce((a, b) => a + b, 0) / ranks.length) * 10) / 10 : null,
    bestFinishRank: ranks.length ? Math.min(...ranks) : null,
    pitStreak,
  };
}