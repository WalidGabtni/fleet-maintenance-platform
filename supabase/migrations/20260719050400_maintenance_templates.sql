-- ============================
-- V4: MAINTENANCE SCHEDULING
-- reusable maintenance schedule templates
-- ============================

create table maintenance_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  interval_mileage int,
  interval_days int,
  created_at timestamptz not null default now(),
  constraint chk_maintenance_templates_interval
    check (interval_mileage is not null or interval_days is not null)
);

-- RLS: enabled with no policies yet (default-deny) — admin-manage /
-- technician-read is specified but implemented in the maintenance RLS step,
-- same holding pattern as v2's `parts` and v3's `invoices`.
alter table maintenance_templates enable row level security;
