-- ============================
-- Remove "En attente du client" (waiting_on_customer) from work_order_status
-- ============================

-- Postgres has no ALTER TYPE ... DROP VALUE, so removing an enum value
-- means recreating the type without it. Migrate existing rows first (while
-- the old type, which still has the value, is in place), then swap types.
update work_orders set status = 'in_progress' where status = 'waiting_on_customer';

-- report_turnaround_by_status's RETURN TABLE signature also depends on the
-- enum type — drop it too, recreated verbatim after the swap below.
drop function public.report_turnaround_by_status(date, date);

alter type work_order_status rename to work_order_status_old;

create type work_order_status as enum (
  'open',
  'in_progress',
  'waiting_on_parts',
  'completed',
  'cancelled'
);

-- Postgres refuses to change a column's type while a trigger declares
-- "UPDATE OF <that column>" against it — drop and recreate the three
-- status-specific triggers on work_orders around the type swap.
drop trigger trg_work_orders_closed_at on work_orders;
drop trigger trg_work_orders_update_maintenance_schedule on work_orders;
drop trigger trg_prevent_unauthorized_work_order_completion on work_orders;

alter table work_orders alter column status drop default;
alter table work_orders
  alter column status type work_order_status
  using status::text::work_order_status;
alter table work_orders alter column status set default 'open';

drop type work_order_status_old;

create trigger trg_work_orders_closed_at
before insert or update of status on work_orders
for each row execute function public.set_work_order_closed_at();

create trigger trg_work_orders_update_maintenance_schedule
after insert or update of status on work_orders
for each row execute function public.update_maintenance_schedule_on_completion();

create trigger trg_prevent_unauthorized_work_order_completion
before update of status on work_orders
for each row execute function public.prevent_unauthorized_work_order_completion();

-- Recreated verbatim from 20260731100600_feature_flags_step3_report_fns.sql
-- — now binds to the new work_order_status type.
create or replace function public.report_turnaround_by_status(start_date date, end_date date)
returns table(status work_order_status, work_order_count bigint, avg_dwell_hours numeric)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : réservé aux administrateurs' using errcode = '42501';
  end if;
  if not public.tenant_has_feature('reporting') then
    raise exception 'Fonctionnalité désactivée pour ce compte' using errcode = '42501';
  end if;

  return query
  select
    wo.status,
    count(*),
    avg(extract(epoch from (now() - wo.updated_at)) / 3600)
  from work_orders wo
  where wo.status not in ('completed', 'cancelled')
    and wo.opened_at::date between start_date and end_date
    and wo.tenant_id = public.current_tenant_id()
  group by wo.status;
end;
$$;
