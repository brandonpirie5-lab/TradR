const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3/simple/price';
const POLYGON_BASE = 'https://api.polygon.io';

/** CoinGecko simple-price ids */
export const CRYPTO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  DOGE: 'dogecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  LINK: 'chainlink',
  AVAX: 'avalanche-2',
  SUI: 'sui',
  DOT: 'polkadot',
  LTC: 'litecoin',
  UNI: 'uniswap',
  PEPE: 'pepe',
};

const YAHOO_MAP: Record<string, string> = {
  BTC: 'BTC-USD',
  ETH: 'ETH-USD',
  SOL: 'SOL-USD',
  DOGE: 'DOGE-USD',
  XRP: 'XRP-USD',
  ADA: 'ADA-USD',
  LINK: 'LINK-USD',
  AVAX: 'AVAX-USD',
  SUI: 'SUI-USD',
  DOT: 'DOT-USD',
  LTC: 'LTC-USD',
  UNI: 'UNI-USD',
  PEPE: 'PEPE-USD',
  SPY: 'SPY',
  QQQ: 'QQQ',
  AAPL: 'AAPL',
  GOOGL: 'GOOGL',
  META: 'META',
  NVDA: 'NVDA',
  TSLA: 'TSLA',
  GLD: 'GLD',
  SLV: 'SLV',
};

export type MarketPrices = Record<string, number>;

export function isCryptoSymbol(sym: string): boolean {
  return !!CRYPTO_IDS[sym];
}

export function getYahooTicker(symbol: string): string {
  return YAHOO_MAP[symbol] || symbol;
}

async function fetchFromYahoo(symbols: string[]) {
  const results: MarketPrices = {};
  await Promise.all(
    symbols.map(async (sym) => {
      const ticker = getYahooTicker(sym);
      try {
        const url = `${YAHOO_BASE}${ticker}?interval=1m&range=1d&includePrePost=false`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) return;
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        let price = meta?.regularMarketPrice;
        if (!price) {
          const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(
            (v: number) => v != null
          );
          price = closes?.[closes.length - 1];
        }
        if (price) {
          const decimals = sym === 'DOGE' || sym === 'PEPE' ? 5 : sym.length > 4 ? 2 : 2;
          results[sym] = Number(price.toFixed(decimals));
        }
      } catch {
        /* ignore per-symbol failures */
      }
    })
  );
  return results;
}

async function fetchFromCoinGecko(symbols: string[]) {
  const ids = symbols.map((s) => CRYPTO_IDS[s]).filter(Boolean).join(',');
  if (!ids) return {};
  try {
    const url = `${COINGECKO_BASE}?ids=${ids}&vs_currencies=usd`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return {};
    const data = await res.json();
    const out: MarketPrices = {};
    symbols.forEach((sym) => {
      const id = CRYPTO_IDS[sym];
      if (data[id]?.usd) out[sym] = data[id].usd;
    });
    return out;
  } catch {
    return {};
  }
}

async function fetchFromPolygon(symbols: string[], apiKey: string) {
  const results: MarketPrices = {};
  try {
    await Promise.all(
      symbols.map(async (sym) => {
        const ticker = isCryptoSymbol(sym) ? `X:${sym}USD` : sym;
        const aggUrl = `${POLYGON_BASE}/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${apiKey}`;
        const res = await fetch(aggUrl, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return;
        const data = await res.json();
        const price = data?.results?.[0]?.c;
        if (price) {
          const decimals = sym === 'DOGE' || sym === 'PEPE' ? 5 : 2;
          results[sym] = Number(price.toFixed(decimals));
        }
      })
    );
  } catch {
    /* ignore */
  }
  return results;
}

export async function fetchMarketPrices(symbols: string[]): Promise<MarketPrices> {
  const rawSymbols = [...new Set(symbols.map((s) => s.trim()).filter(Boolean))];
  if (rawSymbols.length === 0) return {};

  const polygonKey = process.env.POLYGON_API_KEY;
  let results: MarketPrices = {};

  if (polygonKey) {
    results = await fetchFromPolygon(rawSymbols, polygonKey);
  }

  const missing = rawSymbols.filter((s) => !results[s]);
  if (missing.length > 0) {
    const cryptos = missing.filter(isCryptoSymbol);
    const stocks = missing.filter((s) => !isCryptoSymbol(s));
    const cryptoData = await fetchFromCoinGecko(cryptos);
    const cryptoStillMissing = cryptos.filter((c) => !cryptoData[c]);
    const [stockData, cryptoYahoo] = await Promise.all([
      fetchFromYahoo(stocks),
      fetchFromYahoo(cryptoStillMissing),
    ]);
    results = { ...results, ...cryptoData, ...stockData, ...cryptoYahoo };
  }

  return results;
}