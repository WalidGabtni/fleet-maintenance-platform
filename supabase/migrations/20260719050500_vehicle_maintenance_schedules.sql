-- ============================
-- V4: MAINTENANCE SCHEDULING
-- a template applied to a specific vehicle
-- ============================

create table vehicle_maintenance_schedules (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  template_id uuid not null references maintenance_templates(id) on delete restrict,
  last_done_mileage int,
  last_done_at date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_vehicle_maintenance_schedules_vehicle on vehicle_maintenance_schedules(vehicle_id);
create index idx_vehicle_maintenance_schedules_template on vehicle_maintenance_schedules(template_id);

-- RLS: enabled with no policies yet (default-deny), added in the
-- maintenance RLS step alongside maintenance_templates.
alter table vehicle_maintenance_schedules enable row level security;
