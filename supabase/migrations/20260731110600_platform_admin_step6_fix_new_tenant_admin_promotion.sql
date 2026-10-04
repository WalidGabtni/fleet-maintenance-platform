-- Bug found during live testing of "New tenant" + invite: createTenant tried
-- to promote the newly invited user's role to 'admin' via a normal
-- RLS-scoped update, but platform admins only have SELECT (not UPDATE)
-- rights on other tenants' profiles (by design — see the tenant-isolation policies, the user
-- list stays read-only outside a platform admin's own tenant), so the
-- update silently matched zero rows and the invited user was left on the
-- default 'technicien' role.
--
-- Routing it through the service-role client instead wouldn't have been
-- enough on its own: prevent_self_privilege_escalation blocks any role
-- change where the acting session isn't recognized as is_admin(), and a
-- service-role call has no session at all (auth.uid() is null), so it
-- would still be blocked.
--
-- This narrow, purpose-built RPC is the fix: it lets a platform admin
-- promote the single, just-invited first user of a tenant they just
-- created — not general cross-tenant profile writes (the user list
-- elsewhere stays read-only, per design). It mirrors the disable/re-enable
-- trigger pattern already used for the one-off role backfill in
-- 20260730120500_five_role_system_data_and_policies.sql.
create or replace function public.promote_new_tenant_admin(target_profile_id uuid, target_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then
    raise exception 'Seul un administrateur de la plateforme peut effectuer cette action.';
  end if;

  if not exists (
    select 1 from profiles
    where id = target_profile_id and tenant_id = target_tenant_id
  ) then
    raise exception 'Utilisateur introuvable dans ce tenant.';
  end if;

  alter table profiles disable trigger profiles_prevent_self_privilege_escalation;
  update profiles set role = 'admin' where id = target_profile_id;
  alter table profiles enable trigger profiles_prevent_self_privilege_escalation;
end;
$$;
