-- SIM lock + device info reported by the lock app (v1.9+).
alter table devices add column if not exists sim_mode text not null default 'lock';   -- lock | alert | off
alter table devices add column if not exists sim_baseline jsonb;                     -- registered ICCIDs
alter table devices add column if not exists sim_current jsonb;                      -- last report {readable, absent, iccids, slots}
alter table devices add column if not exists sim_changed_at timestamptz;             -- set while a foreign / no SIM is in
alter table devices add column if not exists device_info jsonb;                      -- imei, serial, model, battery, network...
alter table devices add column if not exists info_at timestamptz;
