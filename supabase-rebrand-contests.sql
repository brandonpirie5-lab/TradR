-- TradR Pit contest rebrand + new pits
-- Run in Supabase SQL Editor (safe to re-run)

alter table contests add column if not exists slug text;
alter table contests add column if not exists tagline text;
alter table contests add column if not exists badge text;

-- Rename existing contests (preserves IDs — your active battles stay linked)
update contests set
  title = 'The Liquidation',
  slug = 'the-liquidation',
  tagline = 'Paid daily drop. Only the ruthless survive.',
  badge = 'DAILY DROP',
  entry_fee = 5,
  first_prize = 125,
  total_prizes = 500,
  max_entries = 120,
  assets = ARRAY['SPY','QQQ','NVDA','BTC','ETH']
where title = 'Macro Royale' or slug = 'the-liquidation' or id = 1;

update contests set
  title = 'Full Send Pit',
  slug = 'full-send',
  tagline = 'No brakes. Max conviction. Enter the chaos.',
  badge = 'HIGH STAKES',
  entry_fee = 10,
  first_prize = 200,
  total_prizes = 440,
  max_entries = 55,
  assets = ARRAY['AAPL','TSLA','BTC','SOL','DOGE']
where title = 'Double Up' or slug = 'full-send' or id = 2;

update contests set
  title = 'TradFi vs Degen Pit',
  slug = 'tradfi-vs-degen',
  tagline = 'NYSE suits vs on-chain chaos. Pick your side.',
  badge = 'RIVALRY',
  entry_fee = 5,
  first_prize = 85,
  total_prizes = 380,
  max_entries = 150,
  assets = ARRAY['SPY','META','BTC','ETH','SOL']
where title = 'Wall Street vs Crypto' or slug = 'tradfi-vs-degen' or id = 3;

-- Add new pits if missing
insert into contests (title, slug, tagline, badge, entry_fee, first_prize, total_prizes, max_entries, status, starting_portfolio, assets, ends_at)
select 'Opening Bell Pit', 'opening-bell', 'Free daily — when the bell rings, the pit opens.', 'FREE DAILY',
  0, 50, 200, 500, 'open', 100000, ARRAY['SPY','QQQ','BTC','ETH'], now() + interval '20 hours'
where not exists (select 1 from contests where slug = 'opening-bell');

insert into contests (title, slug, tagline, badge, entry_fee, first_prize, total_prizes, max_entries, status, starting_portfolio, assets, ends_at)
select 'Triple Stack Pit', 'triple-stack', 'Three positions. Triple the pressure.', '3X HEAT',
  10, 180, 400, 80, 'open', 100000, ARRAY['NVDA','META','BTC'], now() + interval '1 day'
where not exists (select 1 from contests where slug = 'triple-stack');

insert into contests (title, slug, tagline, badge, entry_fee, first_prize, total_prizes, max_entries, status, starting_portfolio, assets, ends_at)
select 'Weekend Carnage', 'weekend-carnage', 'Saturday slaughter. Sunday survivors.', 'WEEKEND',
  10, 250, 600, 100, 'open', 100000, ARRAY['SPY','TSLA','BTC','ETH','SOL'], now() + interval '2 days'
where not exists (select 1 from contests where slug = 'weekend-carnage');