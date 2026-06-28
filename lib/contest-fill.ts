import { Contest } from './game-types';
import { getContestRules } from './contest-rules';

export type PitFillStatus = {
  minEntries: number;
  current: number;
  needed: number;
  isConfirmed: boolean;
  label: string;
  urgency: 'ok' | 'warming' | 'critical';
};

export function getPitFillStatus(
  contest: Pick<Contest, 'entries' | 'slug' | 'entryFee' | 'maxEntries' | 'startingPortfolioValue'>,
  participantCount?: number
): PitFillStatus {
  const rules = getContestRules(contest);
  const minEntries = rules.minEntries;
  const current = participantCount ?? contest.entries;
  const needed = Math.max(0, minEntries - current);
  const isConfirmed = current >= minEntries;

  let urgency: PitFillStatus['urgency'] = 'ok';
  if (!isConfirmed && needed <= 2) urgency = 'critical';
  else if (!isConfirmed && needed <= 5) urgency = 'warming';

  const label = isConfirmed
    ? `${current} traders in — pit is live`
    : needed === 1
      ? `1 more trader needed to confirm`
      : `${needed} more traders needed to confirm`;

  return { minEntries, current, needed, isConfirmed, label, urgency };
}