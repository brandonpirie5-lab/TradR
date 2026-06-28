export type AssetInfo = {
  symbol: string;
  name: string;
  category: 'crypto' | 'stock' | 'etf' | 'metal';
  description: string;
  funFact?: string;
};

const ASSET_CATALOG: Record<string, AssetInfo> = {
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    category: 'crypto',
    description: 'The original cryptocurrency — digital gold and the benchmark for the whole crypto market.',
    funFact: 'Often sets the tone for every other coin on the tape.',
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    category: 'crypto',
    description: 'Smart-contract platform powering DeFi, NFTs, and most on-chain apps.',
    funFact: 'The "blue chip" of altcoins for many traders.',
  },
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    category: 'crypto',
    description: 'High-speed L1 blockchain popular with traders and meme coin degens alike.',
  },
  DOGE: {
    symbol: 'DOGE',
    name: 'Dogecoin',
    category: 'crypto',
    description: 'The OG meme coin — started as a joke, traded like a religion.',
    funFact: 'Moves on vibes, tweets, and collective delusion.',
  },
  PEPE: {
    symbol: 'PEPE',
    name: 'Pepe',
    category: 'crypto',
    description: 'Frog-themed meme coin — pure sentiment, maximum volatility.',
    funFact: 'Not for the faint of heart. Size accordingly.',
  },
  XRP: {
    symbol: 'XRP',
    name: 'XRP',
    category: 'crypto',
    description: 'Payments-focused token with a loyal retail following and headline risk.',
  },
  ADA: {
    symbol: 'ADA',
    name: 'Cardano',
    category: 'crypto',
    description: 'Research-driven blockchain — slower hype cycle, still on many contest tapes.',
  },
  LINK: {
    symbol: 'LINK',
    name: 'Chainlink',
    category: 'crypto',
    description: 'Oracle network connecting blockchains to real-world data.',
  },
  AVAX: {
    symbol: 'AVAX',
    name: 'Avalanche',
    category: 'crypto',
    description: 'Fast L1 competing in the DeFi and gaming ecosystem wars.',
  },
  SUI: {
    symbol: 'SUI',
    name: 'Sui',
    category: 'crypto',
    description: 'Newer high-throughput L1 — popular with momentum traders.',
  },
  DOT: {
    symbol: 'DOT',
    name: 'Polkadot',
    category: 'crypto',
    description: 'Multi-chain interoperability protocol.',
  },
  LTC: {
    symbol: 'LTC',
    name: 'Litecoin',
    category: 'crypto',
    description: 'Early Bitcoin fork — "digital silver" to BTC\'s gold.',
  },
  UNI: {
    symbol: 'UNI',
    name: 'Uniswap',
    category: 'crypto',
    description: 'Governance token of the largest decentralized exchange.',
  },
  SPY: {
    symbol: 'SPY',
    name: 'S&P 500 ETF',
    category: 'etf',
    description: 'Tracks the S&P 500 — the single best proxy for "how is the market doing?"',
    funFact: 'When SPY moves, every pit feels it.',
  },
  QQQ: {
    symbol: 'QQQ',
    name: 'Nasdaq 100 ETF',
    category: 'etf',
    description: 'Tech-heavy index fund — MAG7 energy without picking one name.',
  },
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple',
    category: 'stock',
    description: 'Consumer tech giant — massive market cap, steady tape presence.',
  },
  GOOGL: {
    symbol: 'GOOGL',
    name: 'Alphabet',
    category: 'stock',
    description: 'Google parent — search, cloud, and AI narrative in one ticker.',
  },
  META: {
    symbol: 'META',
    name: 'Meta Platforms',
    category: 'stock',
    description: 'Social + metaverse + AI spend — moves hard on earnings.',
  },
  NVDA: {
    symbol: 'NVDA',
    name: 'NVIDIA',
    category: 'stock',
    description: 'AI chip king — the most watched ticker in every tech pit.',
    funFact: 'Can swing your whole portfolio in one session.',
  },
  TSLA: {
    symbol: 'TSLA',
    name: 'Tesla',
    category: 'stock',
    description: 'EV + energy + Elon premium — volatility is the brand.',
  },
  GLD: {
    symbol: 'GLD',
    name: 'Gold ETF',
    category: 'metal',
    description: 'Tracks gold bullion — the classic flight-to-safety trade.',
    funFact: 'Shines on macro fear days and Fed drama.',
  },
  SLV: {
    symbol: 'SLV',
    name: 'Silver ETF',
    category: 'metal',
    description: 'Tracks silver — more volatile than gold, industrial + precious metal hybrid.',
  },
};

export function getAssetInfo(symbol: string): AssetInfo {
  const upper = symbol.toUpperCase();
  return (
    ASSET_CATALOG[upper] || {
      symbol: upper,
      name: upper,
      category: 'stock',
      description: `${upper} is tradable on this contest tape. Check the chart for live price action.`,
    }
  );
}

export const CATEGORY_LABELS: Record<AssetInfo['category'], string> = {
  crypto: 'Crypto',
  stock: 'Stock',
  etf: 'ETF',
  metal: 'Metal',
};