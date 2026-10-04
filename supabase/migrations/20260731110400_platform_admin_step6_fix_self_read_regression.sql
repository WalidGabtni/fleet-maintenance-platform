-- Bug found during live testing: T2 added `tenant_id = current_tenant_id()`
-- to the profiles self-read/self-update policies for uniformity, reasoning
-- it was a no-op (a user's own row always matches their own tenant). That
-- broke once current_tenant_id() started returning NULL for a suspended
-- tenant's members (this migration) — suspended users could no longer read
-- even their own profile row, which silently defeated the proxy.ts
-- suspension check (it reads profiles for the actor before it can decide
-- anything) and would have broken login/account pages generally. A user
-- must always be able to read/update their own row regardless of tenant
-- status — that's what lets the app detect and act on the suspension in
-- the first place.
alter policy "Users can read their own profile" on profiles
  using (id = auth.uid());

alter policy "Users can update their own name" on profiles
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from profiles p2 where p2.id = auth.uid())
    and active = (select active from profiles p2 where p2.id = auth.uid())
  );
