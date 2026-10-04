-- T1 only ever gave tenants a SELECT policy (tenant creation/management was
-- migration-only back then). Platform admins now need to create and edit
-- tenants through the app. Deliberately no DELETE policy — there's no
-- delete-tenant UI, and removing a tenant isn't something to make casually
-- available via RLS.
create policy "Platform admins can insert tenants" on tenants
  for insert with check (is_platform_admin());

create policy "Platform admins can update tenants" on tenants
  for update using (is_platform_admin()) with check (is_platform_admin());
