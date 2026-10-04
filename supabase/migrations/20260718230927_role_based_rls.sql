-- ============================
-- ROLE-BASED RLS
-- Replaces the flat "any authenticated user" policies with
-- admin-vs-technician rules.
-- ============================

drop policy if exists "Authenticated users only" on customers;
drop policy if exists "Authenticated users only" on vehicles;
drop policy if exists "Authenticated users only" on technicians;
drop policy if exists "Authenticated users only" on work_orders;
drop policy if exists "Authenticated users only" on work_order_notes;

-- ============================
-- CUSTOMERS
-- Admins: full access. Technicians: read-only.
-- ============================
create policy "Admins full access on customers" on customers
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Authenticated users can read customers" on customers
  for select using (auth.uid() is not null);

-- ============================
-- VEHICLES
-- Admins: full access. Technicians: read-only.
-- ============================
create policy "Admins full access on vehicles" on vehicles
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Authenticated users can read vehicles" on vehicles
  for select using (auth.uid() is not null);

-- ============================
-- TECHNICIANS
-- Admins: full access. Technicians: read-only (needed for
-- assignment dropdowns and note attribution in the UI).
-- ============================
create policy "Admins full access on technicians" on technicians
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Authenticated users can read technicians" on technicians
  for select using (auth.uid() is not null);

-- ============================
-- WORK ORDERS
-- Admins: full access. Technicians: read all, update only the
-- ones assigned to them (and can't reassign it away from
-- themselves in the same update).
-- ============================
create policy "Admins full access on work_orders" on work_orders
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Authenticated users can read work_orders" on work_orders
  for select using (auth.uid() is not null);

create policy "Technicians can update their assigned work_orders" on work_orders
  for update using (
    exists (
      select 1 from technicians t
      where t.id = work_orders.technician_id
        and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from technicians t
      where t.id = work_orders.technician_id
        and t.user_id = auth.uid()
    )
  );

-- ============================
-- WORK ORDER NOTES
-- Admins: full access. Technicians: can read/insert notes only
-- on work orders assigned to them (not a blanket read like the
-- tables above).
-- ============================
create policy "Admins full access on work_order_notes" on work_order_notes
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Technicians can read notes on their assigned work_orders" on work_order_notes
  for select using (
    exists (
      select 1 from work_orders wo
      join technicians t on t.id = wo.technician_id
      where wo.id = work_order_notes.work_order_id
        and t.user_id = auth.uid()
    )
  );

create policy "Technicians can add notes on their assigned work_orders" on work_order_notes
  for insert with check (
    exists (
      select 1 from work_orders wo
      join technicians t on t.id = wo.technician_id
      where wo.id = work_order_notes.work_order_id
        and t.user_id = auth.uid()
    )
  );
