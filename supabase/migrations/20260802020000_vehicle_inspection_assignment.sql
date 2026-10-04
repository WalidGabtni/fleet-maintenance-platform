-- ============================
-- INSPECTION SCHEDULING — vehicle assignment + auto-schedule
--
-- Reuses vehicle_maintenance_schedules (rather than a parallel table) as an
-- alternative source of interval data alongside maintenance_templates: a
-- schedule row now comes from EITHER a template OR an inspection category,
-- never both, enforced by the check constraint below. This means the
-- existing due-list, dashboard module, and vehicle detail page all pick up
-- inspection schedules for free once vehicle_maintenance_status is updated
-- to know about the new source.
-- ============================

alter table vehicles
  add column inspection_category_id uuid references inspection_categories(id) on delete restrict;

alter table vehicle_maintenance_schedules
  alter column template_id drop not null;

alter table vehicle_maintenance_schedules
  add column inspection_category_id uuid references inspection_categories(id) on delete restrict;

-- Explicit override for manual date edits — when set, takes
-- precedence over the computed last_done_at + interval_days so the interval
-- logic in the view below can never silently recalculate it back.
alter table vehicle_maintenance_schedules
  add column next_due_override date;

alter table vehicle_maintenance_schedules
  add constraint chk_vms_exactly_one_source
  check ((template_id is not null) <> (inspection_category_id is not null));

-- A vehicle has at most one active inspection-category schedule (it maps
-- 1:1 from vehicles.inspection_category_id), but can still have several
-- maintenance_templates-based schedules (oil change, tire rotation, etc.) —
-- this only constrains the inspection-category side.
create unique index idx_vms_one_inspection_per_vehicle
  on vehicle_maintenance_schedules (vehicle_id)
  where inspection_category_id is not null;

-- ============================
-- Auto-create/update the vehicle's inspection schedule row whenever
-- vehicles.inspection_category_id changes. Fires on every UPDATE that
-- touches the column (even to the same value), so it no-ops explicitly
-- when nothing actually changed.
-- ============================
create or replace function public.sync_vehicle_inspection_schedule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.inspection_category_id is not distinct from old.inspection_category_id then
    return new;
  end if;

  if new.inspection_category_id is null then
    update vehicle_maintenance_schedules
    set active = false
    where vehicle_id = new.id and inspection_category_id is not null;
    return new;
  end if;

  -- Reassigning to a different category keeps the existing last_done_at —
  -- the vehicle's last real inspection date doesn't change just because
  -- it's been reclassified — but clears any override, since a date chosen
  -- under the old category's interval may not make sense under the new one.
  update vehicle_maintenance_schedules
  set inspection_category_id = new.inspection_category_id,
      next_due_override = null,
      active = true
  where vehicle_id = new.id and inspection_category_id is not null;

  if not found then
    insert into vehicle_maintenance_schedules (vehicle_id, inspection_category_id, tenant_id)
    values (new.id, new.inspection_category_id, new.tenant_id);
  end if;

  return new;
end;
$$;

create trigger trg_sync_vehicle_inspection_schedule
after insert or update of inspection_category_id on vehicles
for each row execute function public.sync_vehicle_inspection_schedule();

-- A fresh completion is a new cycle — clear any stale manual override so it
-- doesn't linger and mask the newly-computed due date. This does NOT
-- conflict with "the interval logic can't silently recalculate an
-- override back": that rule is about editing a category's interval_days,
-- not about a real inspection actually being completed.
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
        last_done_at = current_date,
        next_due_override = null
    where id = new.maintenance_schedule_id;
  end if;
  return new;
end;
$$;

-- ============================
-- vehicle_maintenance_status — extended to know about inspection
-- categories as a second possible interval source, and to respect a manual
-- override on the due date.
-- ============================
-- CREATE OR REPLACE VIEW can't reorder/insert columns mid-list (only append
-- at the end), and the new columns below are interleaved with the
-- original ones — drop and recreate instead. Nothing else in the schema
-- references this view, so this is safe.
drop view if exists vehicle_maintenance_status;

create view vehicle_maintenance_status
with (security_invoker = true)
as
with current_mileage as (
  select
    v.id as vehicle_id,
    coalesce(
      (
        select wo.mileage_at_service
        from work_orders wo
        where wo.vehicle_id = v.id
          and wo.mileage_at_service is not null
        order by wo.opened_at desc
        limit 1
      ),
      v.mileage
    ) as value
  from vehicles v
)
select
  vms.id as schedule_id,
  vms.vehicle_id,
  vms.template_id,
  vms.inspection_category_id,
  vms.last_done_mileage,
  vms.last_done_at,
  vms.next_due_override,
  coalesce(mt.name, ic.name) as template_name,
  mt.description as template_description,
  coalesce(mt.interval_mileage, ic.interval_km) as interval_mileage,
  coalesce(mt.interval_days, ic.interval_days) as interval_days,
  cm.value as current_mileage,
  due_mileage.value as next_due_mileage,
  coalesce(vms.next_due_override, due_date.value) as next_due_date,
  coalesce(cm.value >= due_mileage.value, false)
    or coalesce(current_date >= coalesce(vms.next_due_override, due_date.value), false) as is_due,
  (not (
    coalesce(cm.value >= due_mileage.value, false)
      or coalesce(current_date >= coalesce(vms.next_due_override, due_date.value), false)
  )) and (
    coalesce(cm.value >= due_mileage.value - 500, false)
      or coalesce(current_date >= coalesce(vms.next_due_override, due_date.value) - 14, false)
  ) as is_due_soon
from vehicle_maintenance_schedules vms
left join maintenance_templates mt on mt.id = vms.template_id
left join inspection_categories ic on ic.id = vms.inspection_category_id
join current_mileage cm on cm.vehicle_id = vms.vehicle_id
left join lateral (
  select vms.last_done_mileage + coalesce(mt.interval_mileage, ic.interval_km) as value
  where coalesce(mt.interval_mileage, ic.interval_km) is not null and vms.last_done_mileage is not null
) due_mileage on true
left join lateral (
  select vms.last_done_at + coalesce(mt.interval_days, ic.interval_days) as value
  where coalesce(mt.interval_days, ic.interval_days) is not null and vms.last_done_at is not null
) due_date on true
where vms.active = true;
