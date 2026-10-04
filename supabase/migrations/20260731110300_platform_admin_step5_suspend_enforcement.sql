-- A suspended tenant must block business-data access for its members the
-- same way a deactivated profile already does. current_tenant_id() feeds
-- every tenant-scoped RLS policy (tenant_id = current_tenant_id()), so
-- making it return NULL when the tenant is suspended retroactively locks
-- down every one of those policies without editing them individually —
-- same trick as the active=true check already does for deactivated users.
create or replace function public.current_tenant_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select p.tenant_id
  from public.profiles p
  join public.tenants t on t.id = p.tenant_id
  where p.id = auth.uid() and p.active = true and t.active = true;
$$;
