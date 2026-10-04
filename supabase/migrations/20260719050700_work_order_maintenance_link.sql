-- ============================
-- V4: MAINTENANCE SCHEDULING
-- link work orders to maintenance schedules
--
-- security definer is required here for the same reason as v2's
-- apply_part_stock_delta: a technician completing their own assigned work
-- order needs this side-effecting UPDATE on vehicle_maintenance_schedules
-- to go through even though technicians only get read access to that
-- table, not write.
-- ============================

alter table work_orders
  add column maintenance_schedule_id uuid references vehicle_maintenance_schedules(id) on delete set null;

create index idx_work_orders_maintenance_schedule on work_orders(maintenance_schedule_id);

create or replace function public.update_maintenance_schedule_on_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and new.maintenance_schedule_id is not null then
    update vehicle_maintenance_schedules
    set last_done_mileage = coalesce(new.mileage_at_service, last_done_mileage),
        last_done_at = current_date
    where id = new.maintenance_schedule_id;
  end if;
  return new;
end;
$$;

create trigger trg_work_orders_update_maintenance_schedule
after insert or update of status on work_orders
for each row execute function public.update_maintenance_schedule_on_completion();
