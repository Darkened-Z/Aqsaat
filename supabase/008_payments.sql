-- Online installment payments (JazzCash hosted checkout). Service key only.
create table if not exists payments (
  id            text primary key,
  shop_id       text not null,
  device_id     text,
  plan_id       text not null,
  txn_ref       text not null unique,
  amount        integer not null,          -- PKR
  installments  integer[] not null,        -- schedule n's this payment covers
  provider      text not null default 'jazzcash',
  status        text not null default 'pending',  -- pending | applying | paid | failed
  response_code text,
  response_msg  text,
  credit        integer not null default 0,   -- PKR received but not matched to an installment
  created_at    timestamptz not null default now(),
  paid_at       timestamptz
);
create index if not exists payments_plan_idx on payments (plan_id);
alter table payments enable row level security;
