import { PLATFORM_RAKE_PCT, computeGrossEntries, computeRakeAmount, type PayoutContext } from './pit-pool-math';

export type PlatformRakeRecord = {
  contestId: number;
  contestTitle: string;
  participantCount: number;
  entryFee: number;
  grossEntries: number;
  rakePct: number;
  rakeAmount: number;
  poolPaid: number;
};

export function buildPlatformRakeRecord(
  contestId: number,
  contestTitle: string,
  entryFee: number,
  participantCount: number,
  poolPaid: number
): PlatformRakeRecord {
  const ctx: PayoutContext = { entryFee, participantCount };
  return {
    contestId,
    contestTitle,
    participantCount,
    entryFee,
    grossEntries: computeGrossEntries(ctx),
    rakePct: PLATFORM_RAKE_PCT,
    rakeAmount: computeRakeAmount(ctx),
    poolPaid,
  };
}