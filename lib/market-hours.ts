import { Contest } from './game-types';
import { getContestRules } from './contest-rules';

const CRYPTO_SYMBOLS = new Set(['BTC', 'ETH', 'SOL', 'DOGE', 'PEPE', 'SHIB', 'WIF']);

/** US equity session — Mon–Fri 9:30–16:00 Eastern (simplified, no holidays). */
export function isUsMarketOpen(now = new Date()): boolean {
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  if (day === 0 || day === 6) return false;

  const minutes = et.getHours() * 60 + et.getMinutes();
  const open = 9 * 60 + 30;
  const close = 16 * 60;
  return minutes >= open && minutes < close;
}

export function isCryptoSymbol(symbol: string): boolean {
  return CRYPTO_SYMBOLS.has(symbol.toUpperCase());
}

export function isSymbolTradableNow(
  contest: Pick<Contest, 'slug' | 'entryFee' | 'maxEntries' | 'startingPortfolioValue'>,
  symbol: string,
  now = new Date()
): { ok: boolean; message?: string } {
  const rules = getContestRules(contest);
  if (rules.tradingHours === '24/7') return { ok: true };
  if (isCryptoSymbol(symbol)) return { ok: true };

  if (!isUsMarketOpen(now)) {
    return {
      ok: false,
      message: 'Market closed — TradFi tape resumes weekdays 9:30 AM ET. Crypto still trades 24/7.',
    };
  }
  return { ok: true };
}