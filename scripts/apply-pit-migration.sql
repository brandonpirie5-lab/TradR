-- TradR Pit: schema + catalog sync + close duplicate live contests
-- Safe to re-run. Run in Supabase SQL Editor OR: npx tsx scripts/run-sql-migration.ts

-- 1) Schema columns
alter table contests add column if not exists slug text;
alter table contests add column if not exists tagline text;
alter table contests add column if not exists badge text;
alter table contests add column if not exists starts_at timestamptz;

update contests
set starts_at = coalesce(starts_at, ends_at - interval '24 hours')
where ends_at is not null and starts_at is null;

-- 2) Resolve slug from legacy titles
update contests set slug = 'opening-bell'
where slug is null and title in (
  'Opening Bell Pit', 'First Candle Free-For-All', 'Opening Bell Bloodbath'
);

update contests set slug = 'the-liquidation'
where slug is null and title in ('Macro Royale', 'The Liquidation', 'Liquidation Lounge', 'Margin Called');

update contests set slug = 'full-send'
where slug is null and title in ('Double Up', 'Full Send Pit', 'Full Port Disorder');

update contests set slug = 'triple-stack'
where slug is null and title in ('Triple Stack Pit', 'Triple Stack Therapy');

update contests set slug = 'weekend-carnage'
where slug is null and title in ('Weekend Carnage', 'Saturday Slaughterhouse');

update contests set slug = 'tradfi-vs-degen'
where slug is null and title in ('TradFi vs Degen Pit', 'Wall Street vs Crypto', 'Suits vs. Size');

update contests set slug = 'meme-mayhem'
where slug is null and title in ('Frog & Dog Derby', 'Meme Mayhem');

update contests set slug = 'gold-rush'
where slug is null and title in ('Gold Rush Gauntlet');

-- 3) Sync current catalog metadata (v2 names)
update contests set
  title = 'Opening Bell Bloodbath',
  slug = 'opening-bell',
  tagline = 'Free entry. Fake money. Real humiliation when the bell rings.',
  badge = 'FREE TAPE',
  entry_fee = 0,
  first_prize = 50,
  total_prizes = 200,
  max_entries = 500,
  assets = ARRAY['BTC','ETH','SOL']
where slug = 'opening-bell';

update contests set
  title = 'Liquidation Lounge',
  slug = 'the-liquidation',
  tagline = '$5 buy-in. Thin book, thick coping. The bell shows no mercy.',
  badge = 'DAILY REKT',
  entry_fee = 5,
  first_prize = 125,
  total_prizes = 500,
  max_entries = 120,
  assets = ARRAY['SPY','QQQ','NVDA','BTC','ETH']
where slug = 'the-liquidation';

update contests set
  title = 'Full Port Disorder',
  slug = 'full-send',
  tagline = 'Diversification is banned. Size is the whole strategy.',
  badge = 'ALL IN',
  entry_fee = 10,
  first_prize = 200,
  total_prizes = 440,
  max_entries = 55,
  assets = ARRAY['AAPL','TSLA','BTC','SOL','DOGE']
where slug = 'full-send';

update contests set
  title = 'Triple Stack Therapy',
  slug = 'triple-stack',
  tagline = 'Three tickers. One fragile trader. Stack or spiral.',
  badge = '3-BAG MAX',
  entry_fee = 10,
  first_prize = 180,
  total_prizes = 400,
  max_entries = 80,
  assets = ARRAY['NVDA','META','BTC']
where slug = 'triple-stack';

update contests set
  title = 'Saturday Slaughterhouse',
  slug = 'weekend-carnage',
  tagline = 'Your plans can wait. Weekend candles hit different.',
  badge = 'OFF-HOURS',
  entry_fee = 10,
  first_prize = 250,
  total_prizes = 600,
  max_entries = 100,
  assets = ARRAY['SPY','TSLA','BTC','ETH','SOL']
where slug = 'weekend-carnage';

update contests set
  title = 'Suits vs. Size',
  slug = 'tradfi-vs-degen',
  tagline = 'Macro on SPY. Vibes on SOL. Same bell, different damage.',
  badge = 'RIVAL PIT',
  entry_fee = 5,
  first_prize = 85,
  total_prizes = 380,
  max_entries = 150,
  assets = ARRAY['SPY','META','BTC','ETH','SOL']
where slug = 'tradfi-vs-degen';

update contests set
  title = 'Frog & Dog Derby',
  slug = 'meme-mayhem',
  tagline = 'DOGE, PEPE, and chaos — sentiment is the only fundamental.',
  badge = 'MEME TAPE',
  entry_fee = 5,
  first_prize = 100,
  total_prizes = 420,
  max_entries = 200,
  assets = ARRAY['DOGE','PEPE','BTC','SOL','ETH']
where slug = 'meme-mayhem';

update contests set
  title = 'Gold Rush Gauntlet',
  slug = 'gold-rush',
  tagline = 'GLD, SLV, and macro — when the world panics, metals pump.',
  badge = 'METALS',
  entry_fee = 10,
  first_prize = 220,
  total_prizes = 520,
  max_entries = 80,
  assets = ARRAY['GLD','SLV','SPY','BTC','ETH']
where slug = 'gold-rush';

-- 4) Close duplicate open/active pits per slug (keep highest id)
with ranked as (
  select
    id,
    slug,
    row_number() over (partition by slug order by id desc) as rn
  from contests
  where status in ('open', 'active')
    and slug is not null
)
update contests c
set status = 'closed'
from ranked r
where c.id = r.id
  and r.rn > 1;

-- Close unmapped live contests (no slug)
update contests
set status = 'closed'
where status in ('open', 'active')
  and slug is null;

-- 5) Opening bell: always live now
update contests
set
  status = 'active',
  starts_at = now(),
  ends_at = now() + interval '24 hours'
where slug = 'opening-bell'
  and status in ('open', 'active');