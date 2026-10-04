-- Work Order Tracker — MVP schema
-- Source: docs/workorder_mvp_schema.md

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================
-- CUSTOMERS
-- ============================
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

-- ============================
-- VEHICLES / UNITS
-- ============================
create table vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  unit_number text,              -- internal fleet number, e.g. "T-104"
  vin text,
  make text,
  model text,
  year int,
  license_plate text,
  mileage int,
  created_at timestamptz not null default now()
);

create index idx_vehicles_customer on vehicles(customer_id);

-- ============================
-- TECHNICIANS (basic user profile)
-- ============================
create table technicians (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text unique,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================
-- WORK ORDERS
-- ============================
create type work_order_status as enum (
  'open',
  'in_progress',
  'waiting_on_parts',
  'waiting_on_customer',
  'completed',
  'cancelled'
);

create table work_orders (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete restrict,
  technician_id uuid references technicians(id) on delete set null,
  status work_order_status not null default 'open',
  reported_issue text not null,       -- what the customer/driver reported
  diagnosis text,                     -- what the tech found
  work_performed text,                -- what was actually done
  mileage_at_service int,
  labor_hours numeric(5,2),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_work_orders_vehicle on work_orders(vehicle_id);
create index idx_work_orders_technician on work_orders(technician_id);
create index idx_work_orders_status on work_orders(status);

-- ============================
-- WORK ORDER NOTES (timeline / progress log)
-- ============================
create table work_order_notes (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  technician_id uuid references technicians(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create index idx_notes_work_order on work_order_notes(work_order_id);

-- ============================
-- Auto-update `updated_at` on work_orders
-- ============================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_work_orders_updated_at
before update on work_orders
for each row execute function set_updated_at();

-- ============================
-- Row Level Security
-- MVP: no auth system yet, so allow full access via the anon key.
-- Before shipping past internal MVP use, replace these permissive
-- policies with ones scoped to authenticated users/roles.
-- ============================
alter table customers enable row level security;
alter table vehicles enable row level security;
alter table technicians enable row level security;
alter table work_orders enable row level security;
alter table work_order_notes enable row level security;

create policy "Allow all on customers" on customers for all using (true) with check (true);
create policy "Allow all on vehicles" on vehicles for all using (true) with check (true);
create policy "Allow all on technicians" on technicians for all using (true) with check (true);
create policy "Allow all on work_orders" on work_orders for all using (true) with check (true);
create policy "Allow all on work_order_notes" on work_order_notes for all using (true) with check (true);
