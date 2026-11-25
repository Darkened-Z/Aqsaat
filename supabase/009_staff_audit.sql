-- Staff logins (roles) + audit log. Service key only (RLS on, no policies).
create table if not exists shop_staff (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  shop_id    text not null,
  username   text not null,
  name       text not null,
  role       text not null check (role in ('salesman', 'agent')),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists shop_staff_username on shop_staff (shop_id, username);
alter table shop_staff enable row level security;

create table if not exists audit_log (
  id        bigserial primary key,
  shop_id   text not null,
  at        timestamptz not null default now(),
  user_id   uuid,
  actor     text not null,
  role      text not null,
  action    text not null,
  entity    text,
  entity_id text,
  summary   text not null,
  details   jsonb
);
create index if not exists audit_log_at on audit_log (shop_id, at desc);
alter table audit_log enable row level security;

-- Who saved the shop, recorded by the database itself: the app can't skip it, so
-- the detailed entries above can be cross-checked against real writes.
create table if not exists shop_writes (
  id      bigserial primary key,
  shop_id text not null,
  at      timestamptz not null default now(),
  user_id uuid
);
create index if not exists shop_writes_at on shop_writes (shop_id, at desc);
alter table shop_writes enable row level security;

create or replace function log_shop_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into shop_writes (shop_id, user_id) values (new.id, auth.uid());
  return new;
end $$;

drop trigger if exists shops_write_log on shops;
create trigger shops_write_log after update on shops for each row execute function log_shop_write();
