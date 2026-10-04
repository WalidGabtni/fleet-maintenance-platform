-- ============================
-- Restrict who can mark a work order "completed"
-- ============================

-- Enforced with a trigger rather than baked into every RLS policy's WITH
-- CHECK: a WITH CHECK clause only sees the NEW row, not OLD, so it can't
-- distinguish "already completed, unrelated field edit" from "this update
-- is the one closing it out" without a fragile self-referential subquery.
-- A BEFORE UPDATE trigger gets OLD and NEW directly, and — because
-- triggers fire regardless of which RLS policy admitted the write — this
-- is a single, central check that covers every current and future path to
-- updating work_orders, not just the ones edited today.
create or replace function public.prevent_unauthorized_work_order_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    if not (is_admin() or "current_role"() = 'superviseur') then
      raise exception 'Seuls les administrateurs, directeurs de service et superviseurs peuvent marquer un bon de travail comme terminé.';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_prevent_unauthorized_work_order_completion
before update of status on work_orders
for each row execute function public.prevent_unauthorized_work_order_completion();

-- ============================
-- Give commis_pieces the same "edit all other fields" access technicians
-- already have on their assigned work orders, but tenant-wide since
-- commis_pieces isn't tied to a specific work order via technician_id.
-- The trigger above is what actually blocks the "completed" transition —
-- these policies just grant the write in the first place.
-- ============================
create policy "Commis pieces can update work_orders" on work_orders
  for update
  using ("current_role"() = 'commis_pieces' and tenant_id = current_tenant_id() and tenant_has_feature('work_orders'))
  with check ("current_role"() = 'commis_pieces' and tenant_id = current_tenant_id() and tenant_has_feature('work_orders'));

create policy "Commis pieces can read work_order_notes" on work_order_notes
  for select
  using ("current_role"() = 'commis_pieces' and tenant_id = current_tenant_id() and tenant_has_feature('work_orders'));

create policy "Commis pieces can add work_order_notes" on work_order_notes
  for insert
  with check ("current_role"() = 'commis_pieces' and tenant_id = current_tenant_id() and tenant_has_feature('work_orders'));
