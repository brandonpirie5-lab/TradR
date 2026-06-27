-- Allow pit members to read all trades in contests they've joined (live feed)
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