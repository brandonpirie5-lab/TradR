-- TradR Phase 2: referrals + public trade replay support
-- Run in Supabase SQL Editor (optional — app works without this)

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

-- Backfill referral codes for existing users
update profiles
set referral_code = 'pit' || left(replace(id::text, '-', ''), 8)
where referral_code is null;

-- Allow authenticated users to read all trades in CLOSED contests (recap feature)
drop policy if exists "View trades in closed contests" on trade_log;
create policy "View trades in closed contests"
  on trade_log for select
  using (
    exists (
      select 1 from contests c
      where c.id = trade_log.contest_id and c.status = 'closed'
    )
  );