-- Device location reporting + call policy. Run after 002.
alter table public.devices
  add column if not exists last_lat     double precision,
  add column if not exists last_lng     double precision,
  add column if not exists last_loc_acc real,
  add column if not exists last_loc_at  timestamptz,
  add column if not exists call_mode    text not null default 'open',  -- open | shop_only
  add column if not exists allow_number text;
