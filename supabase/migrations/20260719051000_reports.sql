-- ============================
-- V5: REPORTING & DASHBOARDS
-- reports data layer
--
-- Implemented as SECURITY DEFINER functions rather than plain views, for
-- two reasons:
--   1. Views can't take parameters; a start_date/end_date-parameterized
--      function lets Postgres do the date filtering and aggregation
--      directly, instead of shipping raw rows to the client to filter.
--   2. Access control: these reports must be admin-only, but technicians
--      already have legitimate (if scoped) read access to work_orders,
--      invoices, vehicle_maintenance_schedules etc. via existing RLS. A
--      plain view with security_invoker=true would inherit that partial
--      access rather than blocking it. A SECURITY DEFINER function with
--      an explicit is_admin() check at the top is the reliable way to
--      make the whole report admin-only regardless of what the caller
--      could otherwise see through the base tables.
-- ============================

-- ============================
-- 1. Technician productivity: completed work orders, avg labor hours,
--    avg turnaround (closed_at - opened_at), per technician, in range.
--    Only technicians with at least one completed order in range appear.
-- ============================
create or replace function public.report_technician_productivity(start_date date, end_date date)
returns table (
  technician_id uuid,
  technician_name text,
  completed_count bigint,
  avg_labor_hours numeric,
  avg_turnaround_hours numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : réservé aux administrateurs' using errcode = '42501';
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
  group by t.id, t.full_name
  order by t.full_name;
end;
$$;

-- ============================
-- 2. Vehicle cost history: labor/parts/grand totals from invoices, and
--    work order count, per vehicle, in range. Date range applies to the
--    invoice's issued date (falling back to created_at for drafts that
--    haven't been sent yet).
-- ============================
create or replace function public.report_vehicle_cost_history(start_date date, end_date date)
returns table (
  vehicle_id uuid,
  unit_number text,
  make text,
  model text,
  customer_name text,
  work_order_count bigint,
  total_labor numeric,
  total_parts numeric,
  total_cost numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : réservé aux administrateurs' using errcode = '42501';
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
  group by v.id, v.unit_number, v.make, v.model, c.name
  order by total_cost desc;
end;
$$;

-- ============================
-- 3. Revenue overview: total invoiced, total paid, total outstanding, in
--    range. "Outstanding" = sent and not yet paid. Note: invoice_status
--    has an 'overdue' enum value, but nothing in this app ever writes it
--    — "overdue" is computed in the UI as sent + due_at passed (see v3).
--    So "sent" already covers both overdue and not-yet-due unpaid
--    invoices; there's no separate DB state to add here.
-- ============================
create or replace function public.report_revenue_overview(start_date date, end_date date)
returns table (
  total_invoiced numeric,
  total_paid numeric,
  total_outstanding numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : réservé aux administrateurs' using errcode = '42501';
  end if;

  return query
  select
    coalesce(sum(i.grand_total), 0),
    coalesce(sum(i.grand_total) filter (where i.status = 'paid'), 0),
    coalesce(sum(i.grand_total) filter (where i.status = 'sent'), 0)
  from invoices i
  where coalesce(i.issued_at::date, i.created_at::date) between start_date and end_date;
end;
$$;

-- ============================
-- 4. Parts usage: total quantity used and total spend, per part, in
--    range (date = when the part was added to a work order).
-- ============================
create or replace function public.report_parts_usage(start_date date, end_date date)
returns table (
  part_id uuid,
  part_name text,
  part_number text,
  total_quantity bigint,
  total_spend numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : réservé aux administrateurs' using errcode = '42501';
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
  group by p.id, p.name, p.part_number
  order by total_spend desc;
end;
$$;

-- ============================
-- 5. Turnaround by status.
--
-- LIMITATION (flagging as requested): without a status-history log
-- recording every transition's timestamp, a true historical "avg time
-- spent in each status" is not computable — a work order that spent 3
-- days in waiting_on_parts last month and is now completed contributes
-- nothing here, because only its CURRENT status is known; there's no
-- record of the statuses it passed through or how long each lasted.
--
-- What this approximates instead: for work orders presently sitting in
-- each non-terminal status, how long (now() - updated_at) they've been
-- there — a live "what's stuck right now" snapshot, not a historical
-- average. Date range is applied to opened_at (which orders count), but
-- the dwell time itself is always measured as of now, not as of
-- end_date. An accurate historical version would need a
-- work_order_status_history table logging (work_order_id, status,
-- entered_at) on every transition — a real follow-up if this report
-- turns out to matter.
-- ============================
create or replace function public.report_turnaround_by_status(start_date date, end_date date)
returns table (
  status work_order_status,
  work_order_count bigint,
  avg_dwell_hours numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : réservé aux administrateurs' using errcode = '42501';
  end if;

  return query
  select
    wo.status,
    count(*),
    avg(extract(epoch from (now() - wo.updated_at)) / 3600)
  from work_orders wo
  where wo.status not in ('completed', 'cancelled')
    and wo.opened_at::date between start_date and end_date
  group by wo.status;
end;
$$;
