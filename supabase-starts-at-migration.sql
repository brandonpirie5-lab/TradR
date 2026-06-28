-- Optional: explicit contest start times (join anytime while bell is open)
alter table contests add column if not exists starts_at timestamptz;

-- Backfill existing open/active contests from ends_at and slug duration
update contests
set starts_at = coalesce(
  starts_at,
  ends_at - interval '24 hours'
)
where ends_at is not null and starts_at is null;