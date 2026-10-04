-- ============================
-- INSPECTION SCHEDULING — inspection_categories
--
-- Admin-configurable SAAQ-style inspection categories. No interval is ever
-- hardcoded in application code — every schedule traces back to a row in
-- this table, and the table starts empty (no seeded defaults) so an admin
-- must define the shop's actual categories before any vehicle can be
-- assigned one.
-- ============================

create table inspection_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) default public.current_tenant_id(),
  name text not null,
  interval_days int not null check (interval_days > 0),
  interval_km int check (interval_km > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_inspection_categories_tenant_id on inspection_categories (tenant_id);

alter table inspection_categories enable row level security;

create trigger set_tenant_id_trigger before insert on inspection_categories
for each row execute function public.set_tenant_id();

-- Same role shape as maintenance_templates (its closest sibling): admins and
-- superviseurs manage, everyone in the tenant can read. Gated behind the
-- existing maintenance_scheduling feature flag — this is a sub-feature of
-- fleet maintenance scheduling, not a new billable feature of its own.
create policy "Admins full access on inspection_categories" on inspection_categories
  for all
  using (is_admin() and tenant_id = current_tenant_id() and tenant_has_feature('maintenance_scheduling'))
  with check (is_admin() and tenant_id = current_tenant_id() and tenant_has_feature('maintenance_scheduling'));

create policy "Superviseurs full access on inspection_categories" on inspection_categories
  for all
  using ("current_role"() = 'superviseur' and tenant_id = current_tenant_id() and tenant_has_feature('maintenance_scheduling'))
  with check ("current_role"() = 'superviseur' and tenant_id = current_tenant_id() and tenant_has_feature('maintenance_scheduling'));

create policy "Authenticated users can read inspection_categories" on inspection_categories
  for select
  using (auth.uid() is not null and tenant_id = current_tenant_id() and tenant_has_feature('maintenance_scheduling'));
