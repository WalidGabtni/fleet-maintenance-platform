-- Replace T2's hardcoded-email superadmin check with the real flag.
drop policy "Superadmin can read all tenants" on tenants;
create policy "Platform admins can read all tenants" on tenants
  for select using (is_platform_admin());

drop policy "Superadmin full access on tenant_features" on tenant_features;
create policy "Platform admins full access on tenant_features" on tenant_features
  for all using (is_platform_admin()) with check (is_platform_admin());

-- Platform admins need to see users across every tenant for the tenant
-- detail page's user list and the tenant list's user counts. Read-only —
-- deliberately no write policy here; managing a tenant's users (role,
-- active status, invites) stays the tenant admin's job via the existing
-- tenant-scoped "Admins full access on profiles" policy.
create policy "Platform admins can read all profiles" on profiles
  for select using (is_platform_admin());

drop function public.is_superadmin();
