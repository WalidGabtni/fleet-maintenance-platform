-- ============================
-- V3: INVOICING
-- RLS policies
-- (RLS was already enabled with no policies for both tables; this adds them.)
-- ============================

-- ============================
-- SHOP_SETTINGS
-- Admins: full access. Everyone else: no access — rates and tax settings
-- are back-office only.
-- ============================
create policy "Admins full access on shop_settings" on shop_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================
-- INVOICES
-- Admins: full access. Technicians: read-only, scoped to invoices for
-- work orders assigned to them (mirrors work_order_notes/work_order_parts).
-- ============================
create policy "Admins full access on invoices" on invoices
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Technicians can read invoices on their assigned work_orders" on invoices
  for select using (
    exists (
      select 1 from work_orders wo
      join technicians t on t.id = wo.technician_id
      where wo.id = invoices.work_order_id
        and t.user_id = auth.uid()
    )
  );
