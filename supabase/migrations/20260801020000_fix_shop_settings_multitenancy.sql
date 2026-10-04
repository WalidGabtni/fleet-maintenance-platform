-- shop_settings was originally a true singleton (id hard-locked to 1) from
-- before multi-tenancy existed. The T1 multitenancy migration added a
-- tenant_id column but never removed the original "id = 1" check
-- constraint, so no tenant other than the one that already owns id=1
-- (Demo Fleet Co) could ever get a settings row — every other tenant's
-- Facturation/Settings page throws "Cannot coerce the result to a single
-- JSON object" (PostgREST's .single()-on-zero-rows error), because the row
-- simply doesn't exist and the schema wouldn't let one be created.

-- 1. Free the primary key from the singleton constraint and enforce
-- exactly one row per tenant instead of exactly one row total.
alter table shop_settings alter column id drop default;
alter table shop_settings drop constraint if exists shop_settings_id_check;
alter table shop_settings alter column id type uuid using gen_random_uuid();
alter table shop_settings alter column id set default gen_random_uuid();
alter table shop_settings alter column tenant_id set not null;
alter table shop_settings add constraint shop_settings_tenant_id_key unique (tenant_id);

-- 2. Backfill a default row for every existing tenant that doesn't have
-- one yet (any tenant created before this fix, other than Demo Fleet Co).
insert into shop_settings (tenant_id)
select t.id from tenants t
where not exists (select 1 from shop_settings s where s.tenant_id = t.id);

-- 3. Seed a default row automatically whenever a tenant is created from
-- now on, so this can't regress. set_tenant_id_trigger on shop_settings
-- would otherwise overwrite tenant_id to the *acting session's own*
-- tenant (see its own comment) — createTenant runs as the platform admin's
-- authenticated session, not service-role, so it would clobber the new
-- tenant's id with the platform admin's and collide with the unique
-- constraint above. Disable it for this one insert, same
-- disable/insert/enable pattern already used for the role backfill in
-- 20260730120500_five_role_system_data_and_policies.sql.
create or replace function public.seed_shop_settings_for_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  alter table shop_settings disable trigger set_tenant_id_trigger;
  insert into shop_settings (tenant_id) values (NEW.id);
  alter table shop_settings enable trigger set_tenant_id_trigger;
  return NEW;
end;
$$;

create trigger seed_shop_settings_trigger
after insert on tenants
for each row execute function public.seed_shop_settings_for_tenant();
