-- Timed unlock from the panel (30 min / 2 h / 1 day): plan locks are held until this time.
alter table devices add column if not exists unlock_until timestamptz;
