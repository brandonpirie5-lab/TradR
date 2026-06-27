import { NextRequest } from 'next/server';

const POLYGON_BASE = 'https://api.polygon.io';
const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

const CRYPTO_MAP: Record<string, string> = {
  BTC: 'X:BTCUSD',
  ETH: 'X:ETHUSD',
  SOL: 'X:SOLUSD',
  DOGE: 'X:DOGEUSD',
};

const MULTIPLIERS: Record<string, { multiplier: number; timespan: string }> = {
  '1m': { multiplier: 1, timespan: 'minute' },
  '5m': { multiplier: 5, timespan: 'minute' },
  '15m': { multiplier: 15, timespan: 'minute' },
  '1h': { multiplier: 1, timespan: 'hour' },
  '4h': { multiplier: 4, timespan: 'hour' },
  '1d': { multiplier: 1, timespan: 'day' },
  '1w': { multiplier: 1, timespan: 'week' },
  '1M': { multiplier: 1, timespan: 'month' },
};

export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get('symbols') || '';
  const interval = request.nextUrl.searchParams.get('interval') || '1h';
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100');

  const rawSymbols = symbolsParam.split(',').map(s => s.trim()).filter(Boolean);
  if (rawSymbols.length === 0) return Response.json({});

  const polygonKey = process.env.POLYGON_API_KEY;
  const results: Record<string, any[]> = {};

  const { multiplier, timespan } = MULTIPLIERS[interval] || MULTIPLIERS['1h'];
  const from = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0]; // ~30 days back

  await Promise.all(rawSymbols.map(async (sym) => {
    try {
      if (polygonKey) {
        const ticker = CRYPTO_MAP[sym] || sym;
        const url = `${POLYGON_BASE}/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${from}/${new Date().toISOString().split('T')[0]}?adjusted=true&sort=asc&limit=${Math.min(limit, 50000)}&apiKey=${polygonKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.results) {
            results[sym] = data.results.map((r: any) => ({
              time: Math.floor(r.t / 1000),
              open: r.o,
              high: r.h,
              low: r.l,
              close: r.c,
              volume: r.v,
            }));
            return;
          }
        }
      }

      // Fallback to Yahoo for stocks or general
      const yahooTicker = CRYPTO_MAP[sym]?.replace('X:', '') || sym;
      const range = interval.includes('m') || interval.includes('h') ? '5d' : interval === '1d' ? '1mo' : '3mo';
      const url = `${YAHOO_BASE}/${yahooTicker}?interval=${interval === '1h' ? '60m' : interval.includes('m') ? '15m' : '1d'}&range=${range}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const data = await res.json();
      const result = data?.chart?.result?.[0];
      const timestamps = result?.timestamp || [];
      const quotes = result?.indicators?.quote?.[0] || {};

      results[sym] = timestamps.map((t: number, i: number) => ({
        time: t,
        open: quotes.open?.[i] || 0,
        high: quotes.high?.[i] || 0,
        low: quotes.low?.[i] || 0,
        close: quotes.close?.[i] || 0,
        volume: quotes.volume?.[i] || 0,
      })).filter((c: any) => c.close > 0).slice(-limit);
    } catch (e) {
      console.error('History fetch failed for', sym);
      results[sym] = [];
    }
  }));

  return Response.json(results);
}
