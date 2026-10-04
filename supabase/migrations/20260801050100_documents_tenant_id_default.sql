-- Same ergonomics-only default as 20260730201600_multitenancy_tenant_id_default.sql
-- — makes tenant_id optional in generated Insert types. The BEFORE INSERT
-- trigger is still what actually enforces it.
alter table documents alter column tenant_id set default public.current_tenant_id();
