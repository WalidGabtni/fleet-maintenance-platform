-- ============================
-- V4: MAINTENANCE SCHEDULING
-- due status calculation
--
-- "Due soon" thresholds are hardcoded below (500 miles / 14 days). To
-- adjust, edit the two literals and re-migrate this view.
--
-- security_invoker = true is required here: without it, a Postgres view
-- runs with the view owner's table-level permissions rather than the
-- querying user's, which silently bypasses the RLS policies on
-- vehicle_maintenance_schedules / maintenance_templates / vehicles /
-- work_orders that this view reads from.
-- ============================

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
  vms.last_done_mileage,
  vms.last_done_at,
  mt.name as template_name,
  mt.description as template_description,
  mt.interval_mileage,
  mt.interval_days,
  cm.value as current_mileage,
  due_mileage.value as next_due_mileage,
  due_date.value as next_due_date,
  coalesce(cm.value >= due_mileage.value, false)
    or coalesce(current_date >= due_date.value, false) as is_due,
  (not (
    coalesce(cm.value >= due_mileage.value, false)
      or coalesce(current_date >= due_date.value, false)
  )) and (
    coalesce(cm.value >= due_mileage.value - 500, false)
      or coalesce(current_date >= due_date.value - 14, false)
  ) as is_due_soon
from vehicle_maintenance_schedules vms
join maintenance_templates mt on mt.id = vms.template_id
join current_mileage cm on cm.vehicle_id = vms.vehicle_id
left join lateral (
  select vms.last_done_mileage + mt.interval_mileage as value
  where mt.interval_mileage is not null and vms.last_done_mileage is not null
) due_mileage on true
left join lateral (
  select vms.last_done_at + mt.interval_days as value
  where mt.interval_days is not null and vms.last_done_at is not null
) due_date on true
where vms.active = true;
