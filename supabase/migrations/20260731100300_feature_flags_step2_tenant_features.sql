-- Hardcoded superadmin allowlist (temporary — proper superadmin roles come
-- in T3). Reads auth.jwt() ->> 'email', which PostgREST/Supabase populate
-- from the verified JWT on every request — never client-supplied, so this
-- cannot be spoofed by passing a different email from the browser.
create or replace function public.is_superadmin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') in ('platform-admin@example.com');
$$;

create table tenant_features (
  tenant_id uuid not null references tenants(id),
  feature_key text not null references features(key),
  enabled boolean not null default false,
  primary key (tenant_id, feature_key)
);

alter table tenant_features enable row level security;

create policy "Users can read their own tenant features" on tenant_features
  for select using (tenant_id = public.current_tenant_id());

create policy "Superadmin full access on tenant_features" on tenant_features
  for all using (public.is_superadmin()) with check (public.is_superadmin());

-- Superadmin needs to see every tenant to run the management page,
-- on top of the existing "read own tenant" policy from the multi-tenancy work.
create policy "Superadmin can read all tenants" on tenants
  for select using (public.is_superadmin());

create or replace function public.tenant_has_feature(p_feature_key text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from tenant_features tf
    where tf.tenant_id = public.current_tenant_id()
      and tf.feature_key = p_feature_key
      and tf.enabled = true
  );
$$;

-- Demo Fleet Co is the full-access reference client — every feature enabled.
insert into tenant_features (tenant_id, feature_key, enabled)
select t.id, f.key, true
from tenants t
cross join features f
where t.name = 'Demo Fleet Co';
