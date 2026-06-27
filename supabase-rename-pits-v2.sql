-- TradR Pit v2 names — paste in Supabase SQL Editor (safe to re-run)

update contests set
  title = 'First Candle Free-For-All',
  slug = 'opening-bell',
  tagline = 'No buy-in. Full ego. Bell rings — someone gets humbled.',
  badge = 'FREE TAPE'
where slug = 'opening-bell' or title in ('Opening Bell Pit', 'First Candle Free-For-All');

update contests set
  title = 'Margin Called',
  slug = 'the-liquidation',
  tagline = '$5 in. Thin book, thick coping. The bell takes no prisoners.',
  badge = 'DAILY REKT'
where slug = 'the-liquidation' or title in ('The Liquidation', 'Macro Royale', 'Margin Called');

update contests set
  title = 'Full Port Disorder',
  slug = 'full-send',
  tagline = 'Diversification is banned. Size is the whole strategy.',
  badge = 'ALL IN'
where slug = 'full-send' or title in ('Full Send Pit', 'Double Up', 'Full Port Disorder');

update contests set
  title = 'Triple Stack Therapy',
  slug = 'triple-stack',
  tagline = 'Three tickers. One fragile trader. Stack or spiral.',
  badge = '3-BAG MAX'
where slug = 'triple-stack' or title in ('Triple Stack Pit', 'Triple Stack Therapy');

update contests set
  title = 'Saturday Slaughterhouse',
  slug = 'weekend-carnage',
  tagline = 'Your plans can wait. Weekend candles hit different.',
  badge = 'OFF-HOURS'
where slug = 'weekend-carnage' or title in ('Weekend Carnage', 'Saturday Slaughterhouse');

update contests set
  title = 'Suits vs. Size',
  slug = 'tradfi-vs-degen',
  tagline = 'Macro on SPY. Vibes on SOL. Same bell, different damage.',
  badge = 'RIVAL PIT'
where slug = 'tradfi-vs-degen' or title in ('TradFi vs Degen Pit', 'Wall Street vs Crypto', 'Suits vs. Size');