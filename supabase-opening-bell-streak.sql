-- Opening Bell daily streak (profiles)
alter table profiles add column if not exists opening_bell_streak int not null default 0;
alter table profiles add column if not exists opening_bell_last_day_et text;
alter table profiles add column if not exists opening_bell_milestones_claimed jsonb not null default '[]'::jsonb;