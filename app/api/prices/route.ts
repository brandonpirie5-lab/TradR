import { NextRequest } from 'next/server';
import { fetchMarketPrices } from '@/lib/market-prices';

export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get('symbols') || '';
  const rawSymbols = symbolsParam.split(',').map((s) => s.trim()).filter(Boolean);

  if (rawSymbols.length === 0) {
    return Response.json({});
  }

  const results = await fetchMarketPrices(rawSymbols);
  return Response.json(results);
}