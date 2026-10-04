-- Authoritatively stamps tenant_id from the inserting user's own profile —
-- runs only for real app requests (auth.uid() present), so it overrides
-- anything a client tried to send. Service-role/migration-driven seeding
-- (no session) is left alone so tenants can still be seeded directly.
create or replace function public.set_tenant_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.tenant_id := public.current_tenant_id();
  end if;
  return new;
end;
$$;

create trigger set_tenant_id_trigger before insert on customers for each row execute function public.set_tenant_id();
create trigger set_tenant_id_trigger before insert on vehicles for each row execute function public.set_tenant_id();
create trigger set_tenant_id_trigger before insert on technicians for each row execute function public.set_tenant_id();
create trigger set_tenant_id_trigger before insert on work_orders for each row execute function public.set_tenant_id();
create trigger set_tenant_id_trigger before insert on work_order_notes for each row execute function public.set_tenant_id();
create trigger set_tenant_id_trigger before insert on parts for each row execute function public.set_tenant_id();
create trigger set_tenant_id_trigger before insert on work_order_parts for each row execute function public.set_tenant_id();
create trigger set_tenant_id_trigger before insert on invoices for each row execute function public.set_tenant_id();
create trigger set_tenant_id_trigger before insert on shop_settings for each row execute function public.set_tenant_id();
create trigger set_tenant_id_trigger before insert on maintenance_templates for each row execute function public.set_tenant_id();
create trigger set_tenant_id_trigger before insert on vehicle_maintenance_schedules for each row execute function public.set_tenant_id();

-- New profiles are created by the on_auth_user_created trigger, which runs
-- with no authenticated session (fired via the Admin API during an invite),
-- so it can't use current_tenant_id(). Instead it reads tenant_id out of the
-- invite's user_metadata, which the app must always set (see inviteUser /
-- linkOrInviteTechnician). Missing metadata fails loudly via the NOT NULL
-- constraint rather than silently defaulting to some tenant.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, tenant_id)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    (new.raw_user_meta_data ->> 'tenant_id')::uuid
  );
  return new;
end;
$$;
