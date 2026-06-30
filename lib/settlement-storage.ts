const SEEN_SETTLEMENTS_KEY = 'tradr_seen_settlements';

export function loadSeenSettlementIds(): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(SEEN_SETTLEMENTS_KEY);
    const ids = raw ? (JSON.parse(raw) as number[]) : [];
    return new Set(ids);
  } catch {
    return new Set();
  }
}

export function markSettlementSeen(contestId: number) {
  if (typeof window === 'undefined') return;
  const seen = loadSeenSettlementIds();
  seen.add(contestId);
  localStorage.setItem(SEEN_SETTLEMENTS_KEY, JSON.stringify([...seen].slice(-80)));
}