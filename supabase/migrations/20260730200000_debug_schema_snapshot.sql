create table if not exists _debug_columns as
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
and table_name in (
  'profiles','customers','vehicles','technicians','work_orders','work_order_notes',
  'parts','work_order_parts','invoices','shop_settings','maintenance_templates',
  'vehicle_maintenance_schedules','dashboard_hidden_modules'
)
order by table_name, ordinal_position;

create table if not exists _debug_policies as
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

create table if not exists _debug_fks as
select conrelid::regclass::text as table_name, conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where contype = 'f'
and connamespace = 'public'::regnamespace
order by 1, 2;

create table if not exists _debug_rowcounts as
select 'profiles' as t, count(*) as n from profiles
union all select 'customers', count(*) from customers
union all select 'vehicles', count(*) from vehicles
union all select 'technicians', count(*) from technicians
union all select 'work_orders', count(*) from work_orders
union all select 'work_order_notes', count(*) from work_order_notes
union all select 'parts', count(*) from parts
union all select 'work_order_parts', count(*) from work_order_parts
union all select 'invoices', count(*) from invoices
union all select 'shop_settings', count(*) from shop_settings
union all select 'maintenance_templates', count(*) from maintenance_templates
union all select 'vehicle_maintenance_schedules', count(*) from vehicle_maintenance_schedules
union all select 'dashboard_hidden_modules', count(*) from dashboard_hidden_modules;
