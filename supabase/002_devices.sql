-- Device-financing lock: enrolled phones. Run after 001.
-- Only the service key (server API) touches this table; no anon/authenticated access.

create table if not exists public.devices (
  id          text primary key,            -- random device id (also in the phone app)
  shop_id     text not null,
  plan_id     text,
  customer_id text,
  label       text,                         -- free text, e.g. "Samsung A15 — IMEI ...."
  secret      text not null,                -- per-device HMAC secret (checkin auth + unlock codes)
  status      text not null default 'active',   -- active | released | lost
  lock_mode   text not null default 'auto',     -- auto | force_lock | force_unlock
  grace_days  int,                          -- overrides shop default grace before hard lock
  last_checkin  timestamptz,
  last_action   text,
  created_at    timestamptz not null default now()
);

create index if not exists devices_shop_idx on public.devices (shop_id);
create index if not exists devices_plan_idx on public.devices (plan_id);

alter table public.devices enable row level security;
-- No policies on purpose: authenticated/anon clients get nothing.
-- The server reaches it with the service_role key, which bypasses RLS.
