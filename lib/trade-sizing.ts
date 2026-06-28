const CRYPTO_SYMBOLS = new Set(['BTC', 'ETH', 'SOL', 'DOGE', 'PEPE', 'XRP', 'ADA']);

export function shareDecimals(symbol: string): number {
  if (symbol === 'DOGE' || symbol === 'PEPE') return 2;
  if (CRYPTO_SYMBOLS.has(symbol)) return 6;
  return 2;
}

export function roundShares(shares: number, symbol: string): number {
  const factor = 10 ** shareDecimals(symbol);
  return Math.floor(shares * factor) / factor;
}

export function formatShareInput(shares: number, symbol: string): string {
  if (shares <= 0) return '0';
  const rounded = roundShares(shares, symbol);
  const str = rounded.toFixed(shareDecimals(symbol));
  return str.replace(/\.?0+$/, '') || '0';
}

/** Leave headroom so a tick up doesn't reject max-size buys. */
export function cashBudgetForPercent(cash: number, percent: number): number {
  const raw = cash * (percent / 100);
  if (percent >= 100) return raw * 0.985;
  if (percent >= 50) return raw * 0.99;
  return raw;
}

/** Cash % → share count (fractional for crypto / expensive assets). */
export function sharesForCashPercent(
  cash: number,
  price: number,
  symbol: string,
  percent: number
): string {
  if (!price || price <= 0 || cash <= 0) return '0';
  const budget = cashBudgetForPercent(cash, percent);
  return formatShareInput(budget / price, symbol);
}

/** Trim buy size to fit cash at the given price (with slippage buffer). */
export function affordableBuyShares(cash: number, price: number, symbol: string, requested: number): number {
  if (!price || price <= 0 || cash <= 0) return 0;
  const max = cashBudgetForPercent(cash, 100) / price;
  return roundShares(Math.min(requested, max), symbol);
}

/** Position % → share count. */
export function sharesForPositionPercent(
  held: number,
  symbol: string,
  percent: number
): string {
  if (held <= 0) return '0';
  return formatShareInput(held * (percent / 100), symbol);
}