-- TradR Pit: paste this entire file into Supabase SQL Editor and run once.
-- Safe to re-run (IF NOT EXISTS / conditional inserts).

-- ── 1. Contest rebrand + new pits ──────────────────────────────────────────
alter table contests add column if not exists slug text;
alter table contests add column if not exists tagline text;
alter table contests add column if not exists badge text;

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

-- ── 2. Settlement price snapshot at bell ───────────────────────────────────
alter table contests add column if not exists settlement_prices jsonb;
alter table contests add column if not exists settled_at timestamptz;

-- ── 3. Referrals + recap trade replay ──────────────────────────────────────
alter table profiles add column if not exists referral_code text unique;
alter table profiles add column if not exists referred_by uuid references auth.users;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, balance, referral_code)
  values (
    new.id,
    split_part(new.email, '@', 1),
    100.00,
    'pit' || left(replace(new.id::text, '-', ''), 8)
  );
  return new;
end;
$$ language plpgsql security definer;

update profiles
set referral_code = 'pit' || left(replace(id::text, '-', ''), 8)
where referral_code is null;

drop policy if exists "View trades in closed contests" on trade_log;
create policy "View trades in closed contests"
  on trade_log for select
  using (
    exists (
      select 1 from contests c
      where c.id = trade_log.contest_id and c.status = 'closed'
    )
  );

-- ── 4. Live pit feed RLS (trades visible to pit members) ───────────────────
drop policy if exists "View trades in joined contests" on trade_log;
create policy "View trades in joined contests"
  on trade_log for select
  using (
    exists (
      select 1 from participations p
      where p.contest_id = trade_log.contest_id
        and p.user_id = auth.uid()
    )
  );