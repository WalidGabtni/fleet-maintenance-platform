-- ============================
-- PARTS: photo capture support
-- ============================

alter table parts add column photo_url text;

-- Storage bucket for part photos. Private — access is gated by RLS on
-- storage.objects below, mirroring the parts table's own access model:
-- admins can upload/replace/remove, everyone authenticated can view.
insert into storage.buckets (id, name, public)
values ('part-photos', 'part-photos', false)
on conflict (id) do nothing;

create policy "Admins full access on part-photos objects" on storage.objects
  for all using (bucket_id = 'part-photos' and public.is_admin())
  with check (bucket_id = 'part-photos' and public.is_admin());

create policy "Authenticated users can read part-photos objects" on storage.objects
  for select using (bucket_id = 'part-photos' and auth.uid() is not null);
