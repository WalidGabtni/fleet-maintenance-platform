-- ============================
-- MANAGE USERS: account deactivation
-- ============================

alter table profiles add column active boolean not null default true;

-- Harden is_admin() so a deactivated admin immediately loses RLS bypass
-- everywhere too, as defense in depth alongside the middleware-level gate
-- (proxy.ts) that signs out and blocks deactivated accounts on their next
-- request regardless of RLS.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active = true
  );
$$;

-- Users can update their own name (used by account settings), but not
-- their own role or active status — those stay admin-only via the
-- existing "Admins full access on profiles" policy. The self-referencing
-- subqueries pin role/active to their current stored values, so a row
-- update is only accepted when those two columns are unchanged.
create policy "Users can update their own name" on profiles
  for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from profiles where id = auth.uid())
    and active = (select active from profiles where id = auth.uid())
  );
