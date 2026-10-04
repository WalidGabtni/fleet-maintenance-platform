-- ============================
-- ACTIVITY LOG — table + RLS
--
-- action/entity_type are free text (no check constraint, no enum) so new
-- action types never require a migration — the small, consistent set of
-- values in use is enforced instead at the TypeScript layer, in
-- lib/activityLog.ts's ActivityAction/ActivityEntityType unions.
-- ============================

create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  user_id uuid references profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  description text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Primary listing query is "this tenant's log, newest first"; the other
-- three support the by-user/by-action/by-entity-type filters the UI offers.
create index idx_activity_logs_tenant_created on activity_logs (tenant_id, created_at desc);
create index idx_activity_logs_tenant_user on activity_logs (tenant_id, user_id);
create index idx_activity_logs_tenant_action on activity_logs (tenant_id, action);
create index idx_activity_logs_tenant_entity_type on activity_logs (tenant_id, entity_type);

alter table activity_logs enable row level security;

-- Unlike the shared public.set_tenant_id() (which *unconditionally*
-- overwrites tenant_id from current_tenant_id() whenever there's a session),
-- this only fills tenant_id in when the caller left it null. That's what
-- lets a platform admin's cross-tenant write (logActivityForTenant, which
-- sets tenant_id explicitly to the *affected* tenant, not their own) survive
-- the trigger instead of being silently clobbered back to their own tenant.
create or replace function public.set_activity_log_tenant_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tenant_id is null and auth.uid() is not null then
    new.tenant_id := public.current_tenant_id();
  end if;
  return new;
end;
$$;

create trigger set_tenant_id_trigger before insert on activity_logs
for each row execute function public.set_activity_log_tenant_id();

-- READ: admin-tier only (is_admin() covers admin + directeur_service), own
-- tenant only.
create policy "Admins can read their tenant's activity log" on activity_logs
  for select using (is_admin() and tenant_id = current_tenant_id());

-- WRITE (own tenant): any authenticated tenant member can write a log entry
-- attributed to themselves (or explicitly null, for a future system-
-- triggered event) — intentionally broader than the read policy, since
-- e.g. a commis_pieces editing a part or a superviseur closing a work order
-- both need to be able to log their own action.
create policy "Tenant members can log their own activity" on activity_logs
  for insert with check (
    auth.uid() is not null
    and tenant_id = current_tenant_id()
    and (user_id = auth.uid() or user_id is null)
  );

-- WRITE (cross-tenant): a platform admin occasionally takes an action that's
-- visible/relevant to a *different* tenant (e.g. toggling that tenant's
-- feature flags from /platform-admin) — this lets that write land in the
-- affected tenant's own log instead of nowhere, without loosening tenant
-- scoping for anyone else. Still self-attributed only (user_id = auth.uid()).
create policy "Platform admins can log activity for any tenant" on activity_logs
  for insert with check (is_platform_admin() and user_id = auth.uid());

-- No update or delete policy at all, for anyone — append-only audit trail.
-- RLS denies an operation by default when no policy grants it, so this
-- can't be edited or removed after the fact, not even by an admin.
