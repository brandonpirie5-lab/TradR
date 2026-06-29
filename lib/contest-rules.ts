import { Contest } from './game-types';
import {
  countPaidRanks,
  getPayoutStructure,
  getPrizeBreakdown as getStructurePrizeBreakdown,
} from './pit-payouts';

const DURATION_HOURS: Record<string, number> = {
  'opening-bell': 20,
  'the-liquidation': 24,
  'full-send': 24,
  'triple-stack': 24,
  'weekend-carnage': 48,
  'tradfi-vs-degen': 18,
  'meme-mayhem': 24,
  'gold-rush': 24,
};

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
  const winners = countPaidRanks(structure);
  const refundNote =
    entryFee > 0
      ? `Pit needs at least ${structure.minEntries} traders or entry fees refund.`
      : `Pit needs at least ${structure.minEntries} traders or the contest voids.`;

  const tierLines = getStructurePrizeBreakdown(slug).map((tier) => {
    const each = tier.winnerCount > 1 ? ' each' : '';
    const ranks =
      tier.rankEnd && tier.rankEnd !== tier.rank ? `${tier.label}` : `${tier.label} place`;
    return `${ranks} — $${tier.amount.toLocaleString()}${each} (${tier.pctOfPool}% of pool)`;
  });

  return {
    title: 'Prize pool',
    items: [
      `${structure.label} — $${structure.totalPool.toLocaleString()} fixed pool.`,
      structure.hook,
      `Top ${winners} traders cash when the bell rings.`,
      ...tierLines,
      refundNote,
      'Prizes credit to your TradR balance after settlement.',
    ],
  };
}

function buildBaseSections(
  contest: Pick<Contest, 'slug' | 'entryFee' | 'maxEntries'>
): RuleSection[] {
  const structure = getPayoutStructure(contest.slug);
  const paidRanks = countPaidRanks(structure);
  const feeLine =
    contest.entryFee === 0
      ? 'Free entry — no wallet charge for this pit.'
      : `$${contest.entryFee} entry fee is deducted from your TradR balance when you join.`;

  return [
    {
      title: 'Objective',
      items: [
        'Trade a fantasy portfolio on the contest tape before the bell rings.',
        'Rank by total portfolio value (cash + positions) at settlement.',
        `Top ${paidRanks} finishers win real balance prizes.`,
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
        'Assets on the tape rotate with the market week — check the tape list before sizing up.',
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
        `Pit needs at least ${structure.minEntries} traders to run; otherwise the contest voids${contest.entryFee > 0 ? ' and entry fees refund' : ''}.`,
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
  minEntries: 20,
  maxEntriesPerUser: 1,
  joinAnytime: true,
  joinCutoffMinutes: 5,
  durationHours: 24,
  rules: [
    'Start with $100,000 in fake buying power.',
    'Trade any asset on the contest tape while the bell is open.',
    'Rankings update live — highest portfolio value at the bell wins.',
    'Tiered prize pool — ranks and amounts vary by pit.',
    'Join anytime before the final 5 minutes.',
  ],
  sections: [],
};

type SlugOverride = Partial<ContestRules> & {
  sectionPatches?: Partial<Record<string, string[]>>;
  extraSections?: RuleSection[];
};

const SLUG_OVERRIDES: Partial<Record<string, SlugOverride>> = {
  'opening-bell': {
    maxTrades: 'unlimited',
    rules: [
      'Free entry — no wallet charge.',
      'Three assets only — tape rotates with the market week (stocks mid-week, crypto on weekends).',
      'Top 40 cash — wide board, real prizes.',
    ],
    sectionPatches: {
      'Portfolio': [
        'Start with $100,000 in fake buying power — isolated to this pit.',
        'One entry per user per daily Opening Bell instance.',
        'Only three tickers trade each day; the tape follows the market-week rhythm.',
      ],
      'Entry & refunds': [
        'Free entry — no wallet charge for this pit.',
        'Pit needs at least 40 traders to run; otherwise the contest voids (no fee to refund).',
        'Capacity: up to 350 traders per daily bell.',
      ],
    },
    extraSections: [
      {
        title: 'Opening Bell specifics',
        items: [
          'Always on — a fresh bell each market day.',
          'Stocks mid-week, crypto on weekends; three names only.',
          'Perfect pit to learn the floor before sizing into paid arenas.',
        ],
      },
    ],
  },
  'the-liquidation': {
    tradingHours: '24/7',
    sectionPatches: {
      'Trading': [
        'Unlimited trades — 24/7 tape with stocks and crypto.',
        'Thin book, thick coping: size into volatility at your own risk.',
        'Quotes follow live market data; stale or slipped fills may be rejected.',
      ],
    },
    extraSections: [
      {
        title: 'Liquidation Lounge',
        items: [
          'Daily rekt pit — $5 buy-in, 24-hour bell.',
          'Broad tape: indices, mega-cap, and crypto on the same floor.',
          'Rank at the bell; survivors take the pool.',
        ],
      },
    ],
  },
  'full-send': {
    maxTrades: 40,
    rules: [
      'Max 40 trades — make them count.',
      'Diversification is discouraged. Size is the strategy.',
    ],
    sectionPatches: {
      'Trading': [
        'Hard cap: 40 trades per entry — every click matters.',
        'Diversification is discouraged; concentrated bets are the meta.',
        'Friday chaos tape — five names, full-port energy.',
      ],
    },
    extraSections: [
      {
        title: 'Full Port Disorder',
        items: [
          'All-in pit for traders who hate position sizing.',
          'When you hit the trade cap, you ride the book to the bell.',
        ],
      },
    ],
  },
  'triple-stack': {
    maxTrades: 30,
    rules: [
      'Only three tickers on tape — stack or spiral.',
      'Max 30 trades per entry.',
    ],
    sectionPatches: {
      'Trading': [
        'Only three tickers on the tape — stack or spiral.',
        'Max 30 trades per entry.',
        'Thursday tech tilt: earnings brain, discipline optional.',
      ],
    },
    extraSections: [
      {
        title: 'Triple Stack Therapy',
        items: [
          'Three names. One fragile trader.',
          'Rotation and adds count against your 30-trade budget.',
        ],
      },
    ],
  },
  'weekend-carnage': {
    durationHours: 48,
    rules: [
      'Runs through the weekend — plan your tape.',
      'Meme + macro mix on Saturday/Sunday rotations.',
    ],
    sectionPatches: {
      'Schedule & joining': [
        'Opens Saturday morning ET — runs 48 hours through the weekend.',
        'Ring in early anytime before the bell; cutoff is 5 minutes before close.',
        'Off-hours tape — crypto leads when equities sleep.',
      ],
    },
    extraSections: [
      {
        title: 'Saturday Slaughterhouse',
        items: [
          'Weekend main event — meme and macro on one tape.',
          'Plan around gaps; Saturday/Sunday rotations hit different.',
        ],
      },
    ],
  },
  'tradfi-vs-degen': {
    durationHours: 18,
    extraSections: [
      {
        title: 'Suits vs. Size',
        items: [
          '18-hour pit — macro on SPY, vibes on SOL.',
          'Same bell, two tapes of damage.',
          'Monday desk day: Wall Street open energy.',
        ],
      },
    ],
  },
  'meme-mayhem': {
    maxTrades: 50,
    rules: [
      'Meme coin heavy tape — DOGE, PEPE, and friends.',
      'Volatility is the feature, not a bug.',
    ],
    sectionPatches: {
      'Trading': [
        'Max 50 trades — meme tape moves fast.',
        'DOGE, PEPE, and friends; sentiment is the only fundamental.',
        'Crypto quotes 24/7 on this pit.',
      ],
    },
    extraSections: [
      {
        title: 'Frog & Dog Derby',
        items: [
          'Meme-heavy rotation — perfect for weekend recovery and degen Tuesdays.',
          'Wide swings are expected; size like you mean it.',
        ],
      },
    ],
  },
  'gold-rush': {
    tradingHours: 'market-hours',
    rules: [
      'Metals + macro day — GLD, SLV on the tape.',
      'TradFi hours apply to stock/ETF quotes; crypto stays 24/7.',
    ],
    sectionPatches: {
      'Trading': [
        'Metals + macro tape — GLD, SLV, indices, and crypto.',
        'Stock and ETF orders follow US market hours.',
        'Crypto on the tape still trades 24/7.',
      ],
    },
    extraSections: [
      {
        title: 'Gold Rush Gauntlet',
        items: [
          'Wednesday macro day — when the world panics, metals pump.',
          'Watch the cash session for ETF liquidity.',
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
  if (!slug) return 24;
  return DURATION_HOURS[slug] ?? 24;
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
  contest: Pick<Contest, 'slug' | 'firstPrize' | 'totalPrizes'>
): PrizeTier[] {
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