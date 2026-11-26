-- Carrier + phone number per registered SIM, shown in /devices. {iccid: {carrier, number}}
alter table devices add column if not exists sim_labels jsonb;
