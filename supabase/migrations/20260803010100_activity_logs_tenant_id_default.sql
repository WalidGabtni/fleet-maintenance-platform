-- Purely for ergonomics: gives the generated TS Insert type an optional
-- tenant_id, matching every other tenant-scoped table (see
-- 20260730201600_multitenancy_tenant_id_default.sql). Safe alongside
-- set_activity_log_tenant_id(): a DEFAULT only applies when the column is
-- omitted from the INSERT — an explicit value (used by the cross-tenant
-- platform-admin write path) always wins regardless of this default.
alter table activity_logs alter column tenant_id set default public.current_tenant_id();
