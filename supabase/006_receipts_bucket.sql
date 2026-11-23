-- Udhaar receipt photos live in Storage instead of inside the shop JSON blob.
-- Public read by unguessable object name (img src works in the app and printed
-- statements); only signed-in shop users can upload. No select policy, so the
-- bucket can't be listed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "receipts insert by members" on storage.objects;
create policy "receipts insert by members" on storage.objects
  for insert to authenticated with check (bucket_id = 'receipts');
