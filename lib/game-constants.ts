import { buildDemoContests } from './pit-contests';
import type { Contest } from './game-types';

export const initialContests: Contest[] = buildDemoContests();

export const initialPrices: Record<string, number> = {
  SPY: 545.20,
  QQQ: 478.90,
  NVDA: 128.45,
  BTC: 67250,
  ETH: 3520,
  AAPL: 212.80,
  TSLA: 248.30,
  META: 505.15,
  SOL: 142.75,
  DOGE: 0.124,
  PEPE: 0.000012,
  GLD: 218.5,
  SLV: 24.8,
};

export const initialUserBalance = 275;

export const mockOtherTraders = [
  { username: '@jeff', baseValue: 108450 },
  { username: '@guru', baseValue: 101200 },
  { username: '@cip', baseValue: 99500 },
];

export const CRYPTO_MAP: Record<string, string> = {
  BTC: 'X:BTCUSD',
  ETH: 'X:ETHUSD',
  SOL: 'X:SOLUSD',
  DOGE: 'X:DOGEUSD',
};

export function isCrypto(sym: string) {
  return !!CRYPTO_MAP[sym];
}