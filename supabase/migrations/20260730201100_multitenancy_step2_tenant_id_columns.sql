-- Clean-slate business/test data (per explicit instruction) — real login
-- accounts (profiles) and shop branding (shop_settings) are preserved and
-- backfilled instead, since those aren't disposable test rows.
truncate table
  invoices, work_order_parts, work_order_notes, work_orders,
  vehicle_maintenance_schedules, maintenance_templates, parts, vehicles,
  customers, technicians
  restart identity cascade;

-- Now-empty tables: tenant_id can be added NOT NULL directly.
alter table customers add column tenant_id uuid not null references tenants(id);
alter table vehicles add column tenant_id uuid not null references tenants(id);
alter table technicians add column tenant_id uuid not null references tenants(id);
alter table work_orders add column tenant_id uuid not null references tenants(id);
alter table work_order_notes add column tenant_id uuid not null references tenants(id);
alter table parts add column tenant_id uuid not null references tenants(id);
alter table work_order_parts add column tenant_id uuid not null references tenants(id);
alter table invoices add column tenant_id uuid not null references tenants(id);
alter table maintenance_templates add column tenant_id uuid not null references tenants(id);
alter table vehicle_maintenance_schedules add column tenant_id uuid not null references tenants(id);

-- profiles: real accounts, keep rows — add nullable, backfill, then enforce.
alter table profiles add column tenant_id uuid references tenants(id);
update profiles set tenant_id = (select id from tenants where name = 'Demo Fleet Co');
alter table profiles alter column tenant_id set not null;

-- shop_settings: was a hard singleton (id integer, check (id = 1)) — becomes
-- one row per tenant. Swap the PK to a uuid and enforce one-row-per-tenant
-- via a unique constraint on tenant_id instead of the old id=1 check.
alter table shop_settings drop constraint shop_settings_id_check;
alter table shop_settings drop constraint shop_settings_pkey;
alter table shop_settings alter column id drop default;
alter table shop_settings alter column id type uuid using gen_random_uuid();
alter table shop_settings alter column id set default gen_random_uuid();
alter table shop_settings add primary key (id);

alter table shop_settings add column tenant_id uuid references tenants(id);
update shop_settings set tenant_id = (select id from tenants where name = 'Demo Fleet Co');
alter table shop_settings alter column tenant_id set not null;
alter table shop_settings add constraint shop_settings_tenant_id_unique unique (tenant_id);

-- Every RLS check and app query will filter by tenant_id — index it everywhere.
create index idx_customers_tenant_id on customers (tenant_id);
create index idx_vehicles_tenant_id on vehicles (tenant_id);
create index idx_technicians_tenant_id on technicians (tenant_id);
create index idx_work_orders_tenant_id on work_orders (tenant_id);
create index idx_work_order_notes_tenant_id on work_order_notes (tenant_id);
create index idx_parts_tenant_id on parts (tenant_id);
create index idx_work_order_parts_tenant_id on work_order_parts (tenant_id);
create index idx_invoices_tenant_id on invoices (tenant_id);
create index idx_maintenance_templates_tenant_id on maintenance_templates (tenant_id);
create index idx_vehicle_maintenance_schedules_tenant_id on vehicle_maintenance_schedules (tenant_id);
create index idx_profiles_tenant_id on profiles (tenant_id);
create index idx_shop_settings_tenant_id on shop_settings (tenant_id);
