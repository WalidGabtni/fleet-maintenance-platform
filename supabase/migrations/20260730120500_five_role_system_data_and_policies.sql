-- ============================
-- FIVE-ROLE SYSTEM — data migration + is_admin()/current_role() + RLS
-- (the profiles_role_check constraint was already dropped in an earlier
-- migration in this batch)
-- ============================

-- profiles_prevent_self_privilege_escalation (an out-of-band trigger not
-- tracked in any prior migration) blocks role changes whenever the acting
-- session isn't recognized as admin via is_admin() — during a migration
-- there's no session at all, so it blocks unconditionally. Disable it only
-- for this bulk data migration, then restore it immediately after.
alter table profiles disable trigger profiles_prevent_self_privilege_escalation;
update profiles set role = 'technicien' where role = 'technician';
alter table profiles enable trigger profiles_prevent_self_privilege_escalation;

alter table profiles alter column role set default 'technicien';
alter table profiles add constraint profiles_role_check
  check (role in ('admin', 'directeur_service', 'superviseur', 'commis_pieces', 'technicien'));

-- Free-text trade for technicien profiles (e.g. "mécanicien", "électricien").
-- No predefined list yet — set manually until that's defined.
alter table profiles add column trade text;

-- Clean up the diagnostic tables from debugging the trigger above.
drop table if exists _debug_constraints;
drop table if exists _debug_triggers;
drop table if exists _debug_trigger_fn;

-- ============================
-- admin and directeur_service have identical permissions everywhere, so
-- is_admin() (already used throughout every existing RLS policy, and by the
-- privilege-escalation trigger above) now covers both — this alone extends
-- every admin-gated policy to directeur_service without touching those
-- policies individually.
-- ============================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'directeur_service') and active = true
  );
$$;

-- General-purpose role lookup for the new granular (non-admin-tier) roles.
-- Returns null for deactivated accounts so any policy built on it fails
-- closed, same hardening rationale as is_admin().
create or replace function public.current_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles
  where id = auth.uid() and active = true;
$$;

-- ============================
-- SUPERVISEUR
-- Full read/write on customers, vehicles, work_orders, work_order_notes,
-- maintenance_templates, vehicle_maintenance_schedules, technicians.
-- No access to invoices or shop_settings — those tables have no blanket
-- policy for non-admins already, so simply not granting anything here
-- leaves superviseur correctly excluded.
-- ============================
create policy "Superviseurs full access on customers" on customers
  for all using (public.current_role() = 'superviseur') with check (public.current_role() = 'superviseur');

create policy "Superviseurs full access on vehicles" on vehicles
  for all using (public.current_role() = 'superviseur') with check (public.current_role() = 'superviseur');

create policy "Superviseurs full access on work_orders" on work_orders
  for all using (public.current_role() = 'superviseur') with check (public.current_role() = 'superviseur');

create policy "Superviseurs full access on work_order_notes" on work_order_notes
  for all using (public.current_role() = 'superviseur') with check (public.current_role() = 'superviseur');

create policy "Superviseurs full access on maintenance_templates" on maintenance_templates
  for all using (public.current_role() = 'superviseur') with check (public.current_role() = 'superviseur');

create policy "Superviseurs full access on vehicle_maintenance_schedules" on vehicle_maintenance_schedules
  for all using (public.current_role() = 'superviseur') with check (public.current_role() = 'superviseur');

create policy "Superviseurs full access on technicians" on technicians
  for all using (public.current_role() = 'superviseur') with check (public.current_role() = 'superviseur');

-- ============================
-- COMMIS PIÈCES
-- Full read/write on parts (including unit_cost) and work_order_parts,
-- unscoped (unlike technicians' own work-order-scoped policy). Read-only on
-- vehicles/work_orders is already covered by the existing "any authenticated
-- user can read" policies on those two tables — no change needed there.
-- No access to invoices, shop_settings, or customers (nothing granted, and
-- customers' blanket read is narrowed below to exclude this role).
-- ============================
create policy "Commis pieces full access on parts" on parts
  for all using (public.current_role() = 'commis_pieces') with check (public.current_role() = 'commis_pieces');

create policy "Commis pieces full access on work_order_parts" on work_order_parts
  for all using (public.current_role() = 'commis_pieces') with check (public.current_role() = 'commis_pieces');

-- ============================
-- CUSTOMERS: narrow the old "any authenticated user" read policy so
-- commis_pieces (no customer access at all, per spec) is excluded. Every
-- other role either already gets full access via its own policy (admin tier,
-- superviseur) or should keep read-only access unchanged (technicien).
-- ============================
drop policy if exists "Authenticated users can read customers" on customers;

create policy "Non parts-clerk users can read customers" on customers
  for select using (auth.uid() is not null and public.current_role() is distinct from 'commis_pieces');
