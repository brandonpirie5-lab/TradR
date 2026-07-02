/** MVP: single paid daily pit — entry-funded pool, top half wins. */

export const DAILY_PIT_SLUG = 'daily-pit';

export const DAILY_ENTRY_FEE = 5;
export const DAILY_MIN_ENTRIES = 6;
export const DAILY_MAX_ENTRIES = 50;
/** 9:30 AM – 4:00 PM ET cash-session pit */
export const DAILY_DURATION_HOURS = 6.5;

export const DAILY_ASSETS = ['SPY', 'QQQ', 'NVDA', 'BTC', 'ETH'] as const;