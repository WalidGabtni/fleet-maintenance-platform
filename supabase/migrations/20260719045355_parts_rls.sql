-- ============================
-- V2: PARTS & INVENTORY
-- RLS policies
-- (RLS was already enabled with no policies in steps 1/2; this adds them.)
-- ============================

-- ============================
-- PARTS
-- Admins: full access. Everyone else: read-only — no editing unit_cost or
-- quantity_on_hand by hand (receiving stock etc. is an admin action).
-- ============================
create policy "Admins full access on parts" on parts
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Authenticated users can read parts" on parts
  for select using (auth.uid() is not null);

-- ============================
-- WORK ORDER PARTS
-- Admins: full access. Technicians: read/insert scoped to their assigned
-- work orders (mirrors the work_order_notes policies).
-- ============================
create policy "Admins full access on work_order_parts" on work_order_parts
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Technicians can read work_order_parts on their assigned work_orders" on work_order_parts
  for select using (
    exists (
      select 1 from work_orders wo
      join technicians t on t.id = wo.technician_id
      where wo.id = work_order_parts.work_order_id
        and t.user_id = auth.uid()
    )
  );

create policy "Technicians can add work_order_parts on their assigned work_orders" on work_order_parts
  for insert with check (
    exists (
      select 1 from work_orders wo
      join technicians t on t.id = wo.technician_id
      where wo.id = work_order_parts.work_order_id
        and t.user_id = auth.uid()
    )
  );

-- ============================
-- Fix: the stock-deduction trigger writes to parts.quantity_on_hand
-- on every work_order_parts insert. Now that parts only allows admins to
-- write, that internal update would be blocked when a TECHNICIAN is the one
-- inserting — even though they're allowed to insert the work_order_parts
-- row itself. Running it security definer lets the stock adjustment bypass
-- the caller's own RLS, same pattern as is_admin().
-- ============================
create or replace function public.apply_part_stock_delta(target_part_id uuid, delta int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  new_qty int;
  part_name text;
begin
  update parts
  set quantity_on_hand = quantity_on_hand + delta
  where id = target_part_id
  returning quantity_on_hand, name into new_qty, part_name;

  if new_qty < 0 then
    raise exception 'Insufficient stock for "%": % on hand, this operation requires %',
      part_name, new_qty - delta, -delta
      using errcode = 'check_violation';
  end if;
end;
$$;
