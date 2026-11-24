-- Signed agreements (signatures) in a PRIVATE bucket. No client policies: the
-- server uploads with the service key and hands out short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('agreements', 'agreements', false, 1048576, array['image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
