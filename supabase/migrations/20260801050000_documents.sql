-- ============================
-- DOCUMENTS / RESOURCES
-- Reference files (e.g. inspection guides) — admin/directeur_service
-- upload, every tenant member can view/download.
-- ============================

create table documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  name text not null,
  file_path text not null,
  created_at timestamptz not null default now()
);

create index idx_documents_tenant_id on documents (tenant_id);

alter table documents enable row level security;

create trigger set_tenant_id_trigger before insert on documents
for each row execute function public.set_tenant_id();

create policy "Tenant members can read documents" on documents
  for select using (auth.uid() is not null and tenant_id = current_tenant_id());

create policy "Admins can upload documents" on documents
  for insert with check (is_admin() and tenant_id = current_tenant_id());

create policy "Admins can delete documents" on documents
  for delete using (is_admin() and tenant_id = current_tenant_id());

-- Storage bucket. Private — access gated by RLS on storage.objects below.
-- Object paths are namespaced "<tenant_id>/<filename>" (Supabase's standard
-- multi-tenant storage pattern via storage.foldername()) so isolation is
-- enforced at the storage layer too, not just via the documents table —
-- unlike the older part-photos bucket, which predates multi-tenancy and
-- has no such prefix.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "Tenant members can read documents objects" on storage.objects
  for select using (
    bucket_id = 'documents'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = current_tenant_id()::text
  );

create policy "Admins can upload documents objects" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and is_admin()
    and (storage.foldername(name))[1] = current_tenant_id()::text
  );

create policy "Admins can delete documents objects" on storage.objects
  for delete using (
    bucket_id = 'documents'
    and is_admin()
    and (storage.foldername(name))[1] = current_tenant_id()::text
  );
