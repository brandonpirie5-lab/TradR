import { Contest } from './game-types';
import { DAILY_DURATION_HOURS } from './daily-pit-config';
import {
  countPaidRanks,
  getPayoutStructure,
  getPrizeBreakdown as getStructurePrizeBreakdown,
} from './pit-payouts';
import { computeEffectivePool, getLivePrizeTiers, PLATFORM_RAKE_PCT } from './pit-pool-math';

export type RuleSection = {
  title: string;
  items: string[];
};

export type ContestRules = {
  startingBalance: number;
  maxTrades: number | 'unlimited';
  tradingHours: '24/7' | 'market-hours';
  minEntries: number;
  maxEntriesPerUser: number;
  joinAnytime: boolean;
  joinCutoffMinutes: number;
  durationHours: number;
  /** Flat bullets — used by strips & legacy UI */
  rules: string[];
  /** Swap Royale–style structured rules for the info modal */
  sections: RuleSection[];
};

function prizeSection(slug: string | undefined, entryFee: number): RuleSection {
  const structure = getPayoutStructure(slug);
  const atMin = { entryFee, participantCount: structure.minEntries };
  const poolAtMin = computeEffectivePool(slug, atMin);
  const winnersAtMin = countPaidRanks(structure, structure.minEntries);
  const tierLines = getStructurePrizeBreakdown(slug).map((tier) => {
    const each = tier.winnerCount > 1 ? ' each' : '';
    return `Ranks ${tier.label} — $${tier.amount.toLocaleString()}${each}`;
  });

  return {
    title: 'Prize pool',
    items: [
      structure.label,
      structure.hook,
      `$${entryFee} entry · ${PLATFORM_RAKE_PCT}% platform fee · pool = entries minus rake.`,
      `Top 50% of the field split the pool equally (${winnersAtMin} paid at min fill).`,
      `At ${structure.minEntries} traders: ~$${poolAtMin.toLocaleString()} pool.`,
      ...tierLines,
      `Pit needs at least ${structure.minEntries} traders or entry fees refund.`,
      'Prizes credit to your TradR balance after settlement.',
    ],
  };
}

function buildBaseSections(
  contest: Pick<Contest, 'slug' | 'entryFee' | 'maxEntries'>
): RuleSection[] {
  const structure = getPayoutStructure(contest.slug);
  const paidRanks = countPaidRanks(structure);
  const feeLine = `$${contest.entryFee} entry fee is deducted from your TradR balance when you join.`;

  return [
    {
      title: 'Objective',
      items: [
        'Trade a fantasy portfolio on the contest tape before the bell rings.',
        'Rank by total portfolio value (cash + positions) at settlement.',
        `Top half of the field splits the prize pool equally (up to ${paidRanks} paid at min fill).`,
      ],
    },
    {
      title: 'How to play',
      items: [
        'Tap Join to ring in, then trade from your pit ticket when the bell opens.',
        'Buy and sell any asset on today\'s tape — long only, no margin or shorts.',
        'Leaderboard updates live; final ranks lock when the bell rings.',
      ],
    },
    {
      title: 'Portfolio',
      items: [
        'Start with $100,000 in fake buying power — isolated to this pit.',
        'One entry per user per pit instance.',
        'Your live wallet only pays the entry fee; pit P&L does not touch outside balance until prizes settle.',
      ],
    },
    {
      title: 'Trading',
      items: [
        'Unlimited trades unless this pit specifies a cap.',
        'Quotes follow live market data; stale or slipped fills may be rejected.',
        'Same five-name tape every day — SPY, QQQ, NVDA, BTC, ETH.',
      ],
    },
    {
      title: 'Schedule & joining',
      items: [
        'Ring in anytime before the pit opens, or while the bell is still open.',
        `Join cutoff: final ${DEFAULT_RULES.joinCutoffMinutes} minutes before the bell — no late entries.`,
        `Pit runs until the scheduled end time; trading stops when the bell rings.`,
      ],
    },
    {
      title: 'Entry & refunds',
      items: [
        feeLine,
        `Pit needs at least ${structure.minEntries} traders to run; otherwise the contest voids and entry fees refund.`,
        `Capacity: up to ${structure.maxEntries.toLocaleString()} traders per instance.`,
      ],
    },
    prizeSection(contest.slug, contest.entryFee),
    {
      title: 'Fair play',
      items: [
        'One account per person — collusion and multi-accounting void prizes.',
        'TradR may void results for abuse, manipulation, or platform errors.',
        'All times shown in Eastern Time unless noted.',
      ],
    },
  ];
}

const DEFAULT_RULES: ContestRules = {
  startingBalance: 100_000,
  maxTrades: 'unlimited',
  tradingHours: '24/7',
  minEntries: 6,
  maxEntriesPerUser: 1,
  joinAnytime: true,
  joinCutoffMinutes: 5,
  durationHours: DAILY_DURATION_HOURS,
  rules: [
    'Start with $100,000 in fake buying power.',
    'Trade SPY, QQQ, NVDA, BTC, ETH while the bell is open.',
    'Rankings update live — highest portfolio value at the bell wins.',
    'Top half of the field splits the prize pool equally.',
    'Join anytime before the final 5 minutes.',
  ],
  sections: [],
};

type SlugOverride = Partial<ContestRules> & {
  sectionPatches?: Partial<Record<string, string[]>>;
  extraSections?: RuleSection[];
};

const SLUG_OVERRIDES: Partial<Record<string, SlugOverride>> = {
  'daily-pit': {
    durationHours: DAILY_DURATION_HOURS,
    sectionPatches: {
      Trading: [
        'Unlimited trades on SPY, QQQ, NVDA, BTC, ETH.',
        'Quotes follow live market data; stale or slipped fills may be rejected.',
        'Long only — no margin or shorts.',
      ],
    },
    extraSections: [
      {
        title: 'Daily Pit',
        items: [
          '$5 entry — one pit per day.',
          'Pool grows with every trader; top half split equally.',
          'Min 6 traders or the pit voids and refunds.',
        ],
      },
    ],
  },
};

function mergeSections(
  base: RuleSection[],
  override?: SlugOverride
): RuleSection[] {
  const patches = override?.sectionPatches ?? {};
  const merged = base.map((section) => {
    const patch = patches[section.title];
    return patch ? { ...section, items: patch } : section;
  });

  if (override?.extraSections?.length) {
    const insertBefore = merged.findIndex((s) => s.title === 'Fair play');
    const idx = insertBefore >= 0 ? insertBefore : merged.length;
    merged.splice(idx, 0, ...override.extraSections);
  }

  return merged;
}

export function getContestDurationHours(slug?: string): number {
  void slug;
  return DAILY_DURATION_HOURS;
}

export function getContestStartAt(contest: Pick<Contest, 'endsAt' | 'startsAt' | 'slug'>): Date | null {
  if (contest.startsAt) return new Date(contest.startsAt);
  if (!contest.endsAt) return null;
  const hours = getContestDurationHours(contest.slug);
  return new Date(new Date(contest.endsAt).getTime() - hours * 60 * 60 * 1000);
}

export function getContestRules(
  contest: Pick<Contest, 'slug' | 'entryFee' | 'maxEntries' | 'startingPortfolioValue'> & {
    firstPrize?: number;
    totalPrizes?: number;
  }
): ContestRules {
  const base = { ...DEFAULT_RULES };
  const override = contest.slug ? SLUG_OVERRIDES[contest.slug] : undefined;
  const { sectionPatches: _p, extraSections: _e, ...scalarOverride } = override ?? {};
  const merged = { ...base, ...scalarOverride };

  if (contest.startingPortfolioValue) {
    merged.startingBalance = contest.startingPortfolioValue;
  }
  if (contest.slug) {
    merged.durationHours = getContestDurationHours(contest.slug);
  }
  const payout = getPayoutStructure(contest.slug);
  merged.minEntries = payout.minEntries;

  const sections = mergeSections(buildBaseSections(contest), override);
  const portfolioSection = sections.find((s) => s.title === 'Portfolio');
  if (portfolioSection && contest.startingPortfolioValue) {
    portfolioSection.items[0] = `Start with $${contest.startingPortfolioValue.toLocaleString()} in fake buying power — isolated to this pit.`;
  }
  const entrySection = sections.find((s) => s.title === 'Entry & refunds');
  if (entrySection && contest.maxEntries) {
    entrySection.items[2] = `Capacity: up to ${contest.maxEntries.toLocaleString()} traders per instance.`;
  }
  const scheduleSection = sections.find((s) => s.title === 'Schedule & joining');
  if (scheduleSection) {
    scheduleSection.items[1] = `Join cutoff: final ${merged.joinCutoffMinutes} minutes before the bell — no late entries.`;
    scheduleSection.items[2] = `Pit runs ${merged.durationHours} hours unless noted; trading stops when the bell rings.`;
  }

  merged.sections = sections;
  return merged;
}

export type PrizeTier = {
  rank: number;
  label: string;
  amount: number;
  pctOfPool: number;
};

export function getPrizeBreakdown(
  contest: Pick<Contest, 'slug' | 'firstPrize' | 'totalPrizes' | 'entryFee' | 'entries'>
): PrizeTier[] {
  const count = Math.max(contest.entries ?? 0, getPayoutStructure(contest.slug).minEntries);
  const live = getLivePrizeTiers(contest.slug, contest.entryFee ?? 0, count);
  if (live.length) return live;
  return getStructurePrizeBreakdown(contest.slug).map((tier) => ({
    rank: tier.rank,
    label:
      tier.rankEnd && tier.rankEnd !== tier.rank
        ? `${tier.label}${tier.winnerCount > 1 ? ' (each)' : ''}`
        : `${tier.label} Place`,
    amount: tier.amount,
    pctOfPool: tier.pctOfPool,
  }));
}

export function formatContestWindow(contest: Pick<Contest, 'endsAt' | 'slug'>, now = Date.now()): {
  startsAt: Date | null;
  endsAt: Date | null;
  started: boolean;
  ended: boolean;
} {
  const endsAt = contest.endsAt ? new Date(contest.endsAt) : null;
  const startsAt = getContestStartAt(contest);
  return {
    startsAt,
    endsAt,
    started: startsAt ? startsAt.getTime() <= now : true,
    ended: endsAt ? endsAt.getTime() <= now : false,
  };
}