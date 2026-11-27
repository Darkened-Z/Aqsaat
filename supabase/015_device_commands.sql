-- Remote fixes queued from /devices, run by the phone at its next check-in. [{id, op, arg, at}]
alter table devices add column if not exists commands jsonb not null default '[]'::jsonb;
