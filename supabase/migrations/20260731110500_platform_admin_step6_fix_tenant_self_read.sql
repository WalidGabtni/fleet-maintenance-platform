-- Same bug, one layer up: "Users can read their own tenant" was also
-- gated on current_tenant_id(), which returns NULL once the tenant is
-- suspended — so a suspended tenant's own row became invisible to its
-- users too, breaking the proxy.ts suspension check's embedded
-- profiles→tenants(active) read. Base this on the user's own profile row
-- directly instead, independent of whether the tenant is currently active.
alter policy "Users can read their own tenant" on tenants
  using (id = (select tenant_id from profiles where profiles.id = auth.uid()));
