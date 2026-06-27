-- Settlement price snapshot at bell (transparent final values)
alter table contests add column if not exists settlement_prices jsonb;
alter table contests add column if not exists settled_at timestamptz;