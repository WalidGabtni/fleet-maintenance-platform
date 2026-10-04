-- ============================
-- V4: MAINTENANCE SCHEDULING
-- RLS policies
-- (RLS was already enabled with no policies for both tables; this adds them.)
-- ============================

-- ============================
-- MAINTENANCE_TEMPLATES
-- Admins: full access. Technicians: read-only, unscoped — templates are
-- shop-wide reference data, not tied to a specific technician's work.
-- ============================
create policy "Admins full access on maintenance_templates" on maintenance_templates
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Authenticated users can read maintenance_templates" on maintenance_templates
  for select using (auth.uid() is not null);

-- ============================
-- VEHICLE_MAINTENANCE_SCHEDULES
-- Admins: full access. Technicians: read-only, unscoped — same reasoning
-- as maintenance_templates.
-- ============================
create policy "Admins full access on vehicle_maintenance_schedules" on vehicle_maintenance_schedules
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Authenticated users can read vehicle_maintenance_schedules" on vehicle_maintenance_schedules
  for select using (auth.uid() is not null);
