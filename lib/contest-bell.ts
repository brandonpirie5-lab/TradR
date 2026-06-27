import { Contest } from './game-types';

export const STALE_PRICE_MS = 30_000;
export const JOIN_CUTOFF_MS = 5 * 60 * 1000;
export const MAX_PRICE_SLIPPAGE = 0.005; // 0.5%

export function isContestBellOpen(contest: Pick<Contest, 'status' | 'endsAt'>): boolean {
  if (contest.status === 'closed') return false;
  if (!contest.endsAt) return true;
  return new Date(contest.endsAt).getTime() > Date.now();
}

export function isJoinAllowed(contest: Pick<Contest, 'status' | 'endsAt'>): boolean {
  if (!isContestBellOpen(contest)) return false;
  if (!contest.endsAt) return true;
  return new Date(contest.endsAt).getTime() - Date.now() > JOIN_CUTOFF_MS;
}

export function bellMsRemaining(contest: Pick<Contest, 'endsAt'>): number | null {
  if (!contest.endsAt) return null;
  return Math.max(0, new Date(contest.endsAt).getTime() - Date.now());
}

export function formatBellCountdown(ms: number | null): string {
  if (ms == null) return 'OPEN';
  if (ms <= 0) return 'BELL RUNG';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((ms % (1000 * 60)) / 1000);
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export function isPriceStale(lastUpdate: Date | null, now = Date.now()): boolean {
  if (!lastUpdate) return true;
  return now - lastUpdate.getTime() > STALE_PRICE_MS;
}

export function isSlippageExceeded(locked: number, executed: number): boolean {
  if (!locked || !executed) return false;
  return Math.abs(executed - locked) / locked > MAX_PRICE_SLIPPAGE;
}