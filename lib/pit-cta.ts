/** Unified pit CTA copy — Arena, week rows, and free strip. */

export function pitJoinLabel(entryFee: number): string {
  return entryFee === 0 ? 'Join free' : `Join · $${entryFee}`;
}

export function pitActionLabel({
  isJoined,
  isTradingOpen,
  entryFee,
}: {
  isJoined: boolean;
  isTradingOpen: boolean;
  entryFee: number;
}): string {
  if (!isJoined) return pitJoinLabel(entryFee);
  if (isTradingOpen) return 'Trade now';
  return 'Rang in';
}

/** Week-row / compact secondary buttons (same verbs, shorter where needed). */
export function pitCompactLabel({
  isJoined,
  isTradingOpen,
  entryFee,
  canJoin,
  isFull,
  ended,
}: {
  isJoined: boolean;
  isTradingOpen: boolean;
  entryFee: number;
  canJoin: boolean;
  isFull?: boolean;
  ended?: boolean;
}): string {
  if (ended) return 'Ended';
  if (isFull && !isJoined) return 'Full';
  if (isJoined) return isTradingOpen ? 'Trade now' : 'Rang in';
  if (canJoin) return pitJoinLabel(entryFee);
  return 'Ended';
}

export const PIT_DEFAULT_TAGLINE =
  'Paper-trade the tape. Top portfolio wins the pool.';