-- These are SECURITY DEFINER functions, so they bypass table RLS entirely by
-- design (that's why they're definer — aggregating data individual roles
-- can't directly SELECT). But that means the multi-tenancy work never
-- actually reached them: as originally written, an admin calling e.g.
-- report_revenue_overview() got a sum across every tenant in the database,
-- not just their own. Fixing that here alongside adding the reporting
-- feature-flag check, since both require touching the same function bodies.

create or replace function public.report_parts_usage(start_date date, end_date date)
returns table(part_id uuid, part_name text, part_number text, total_quantity bigint, total_spend numeric)
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
    p.id,
    p.name,
    p.part_number,
    sum(wop.quantity_used),
    sum(wop.quantity_used * wop.unit_price_at_time)
  from parts p
  join work_order_parts wop on wop.part_id = p.id
  where wop.created_at::date between start_date and end_date
    and p.tenant_id = public.current_tenant_id()
    and wop.tenant_id = public.current_tenant_id()
  group by p.id, p.name, p.part_number
  order by total_spend desc;
end;
$$;

create or replace function public.report_revenue_overview(start_date date, end_date date)
returns table(total_invoiced numeric, total_paid numeric, total_outstanding numeric)
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
    coalesce(sum(i.grand_total), 0),
    coalesce(sum(i.grand_total) filter (where i.status = 'paid'), 0),
    coalesce(sum(i.grand_total) filter (where i.status = 'sent'), 0)
  from invoices i
  where coalesce(i.issued_at::date, i.created_at::date) between start_date and end_date
    and i.tenant_id = public.current_tenant_id();
end;
$$;

create or replace function public.report_technician_productivity(start_date date, end_date date)
returns table(technician_id uuid, technician_name text, completed_count bigint, avg_labor_hours numeric, avg_turnaround_hours numeric)
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
    t.id,
    t.full_name,
    count(wo.id),
    avg(wo.labor_hours),
    avg(extract(epoch from (wo.closed_at - wo.opened_at)) / 3600)
  from technicians t
  join work_orders wo on wo.technician_id = t.id
  where wo.status = 'completed'
    and wo.closed_at::date between start_date and end_date
    and t.tenant_id = public.current_tenant_id()
    and wo.tenant_id = public.current_tenant_id()
  group by t.id, t.full_name
  order by t.full_name;
end;
$$;

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

create or replace function public.report_vehicle_cost_history(start_date date, end_date date)
returns table(vehicle_id uuid, unit_number text, make text, model text, customer_name text, work_order_count bigint, total_labor numeric, total_parts numeric, total_cost numeric)
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
    v.id,
    v.unit_number,
    v.make,
    v.model,
    c.name,
    count(distinct i.work_order_id),
    coalesce(sum(i.labor_total), 0),
    coalesce(sum(i.parts_total), 0),
    coalesce(sum(i.grand_total), 0)
  from vehicles v
  join customers c on c.id = v.customer_id
  join work_orders wo on wo.vehicle_id = v.id
  join invoices i on i.work_order_id = wo.id
  where coalesce(i.issued_at::date, i.created_at::date) between start_date and end_date
    and v.tenant_id = public.current_tenant_id()
    and wo.tenant_id = public.current_tenant_id()
    and i.tenant_id = public.current_tenant_id()
  group by v.id, v.unit_number, v.make, v.model, c.name
  order by total_cost desc;
end;
$$;
