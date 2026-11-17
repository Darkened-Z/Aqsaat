-- Run once in the Supabase SQL Editor.
-- Before running: create the shop owner's login under Authentication → Users,
-- and turn OFF "Allow new users to sign up" (Authentication → Providers → Email).

create table if not exists public.shop_members (
  shop_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (shop_id, user_id)
);

alter table public.shop_members enable row level security;
alter table public.shops enable row level security;

-- Drop whatever policies existed before (they allowed the anon key full access).
do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies
           where schemaname = 'public' and tablename in ('shops', 'shop_members')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

create policy "members see own membership" on public.shop_members
  for select to authenticated using (user_id = auth.uid());

create policy "members read shop" on public.shops
  for select to authenticated
  using (exists (select 1 from public.shop_members m where m.shop_id = shops.id and m.user_id = auth.uid()));

create policy "members insert shop" on public.shops
  for insert to authenticated
  with check (exists (select 1 from public.shop_members m where m.shop_id = shops.id and m.user_id = auth.uid()));

create policy "members update shop" on public.shops
  for update to authenticated
  using (exists (select 1 from public.shop_members m where m.shop_id = shops.id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.shop_members m where m.shop_id = shops.id and m.user_id = auth.uid()));

-- Grant the owner's login access (repeat for each staff login).
insert into public.shop_members (shop_id, user_id)
select 'aqsat-main', id from auth.users where email = 'OWNER_EMAIL_HERE'
on conflict do nothing;
