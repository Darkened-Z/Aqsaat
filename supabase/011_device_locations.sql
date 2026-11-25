-- Location history for lost-mode tracking. Service key only.
create table if not exists device_locations (
  id        bigserial primary key,
  device_id text not null,
  at        timestamptz not null default now(),
  lat       double precision not null,
  lng       double precision not null,
  acc       real
);
create index if not exists device_locations_dev_at on device_locations (device_id, at desc);
alter table device_locations enable row level security;
