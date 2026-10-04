-- Purely for ergonomics: gives generated TS Insert types an optional
-- tenant_id (so existing .insert() call sites don't need edits). The
-- BEFORE INSERT trigger from the previous migration is still what actually
-- enforces tenant_id — it unconditionally overrides whatever a client sends
-- whenever there's an authenticated session, so this default only ever
-- takes effect for trusted service-role/migration inserts that omit it.
alter table customers alter column tenant_id set default public.current_tenant_id();
alter table vehicles alter column tenant_id set default public.current_tenant_id();
alter table technicians alter column tenant_id set default public.current_tenant_id();
alter table work_orders alter column tenant_id set default public.current_tenant_id();
alter table work_order_notes alter column tenant_id set default public.current_tenant_id();
alter table parts alter column tenant_id set default public.current_tenant_id();
alter table work_order_parts alter column tenant_id set default public.current_tenant_id();
alter table invoices alter column tenant_id set default public.current_tenant_id();
alter table shop_settings alter column tenant_id set default public.current_tenant_id();
alter table maintenance_templates alter column tenant_id set default public.current_tenant_id();
alter table vehicle_maintenance_schedules alter column tenant_id set default public.current_tenant_id();
