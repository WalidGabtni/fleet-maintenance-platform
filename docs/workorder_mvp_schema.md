# Work Order Tracker — MVP Database Schema (Postgres / Supabase)

This is the v1 schema: just enough to track work orders end-to-end. Everything else (invoicing, detailed parts catalog, reporting) builds on top of this later.

## Entity relationships

```
customers ──< vehicles ──< work_orders >── technicians
                              │
                              └──< work_order_notes
```

- A **customer** owns many **vehicles** (if it's their own fleet, you can seed one "internal" customer)
- A **vehicle** can have many **work_orders** over time (its service history)
- A **work_order** is assigned to one **technician** (nullable — unassigned is a valid state)
- A **work_order** can have many **notes** (progress log / timeline entries)

---

## SQL

```sql
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
```

---

## Notes on design choices

- **UUIDs over serial IDs** — plays nicely with Supabase auth/RLS and avoids ID-guessing issues if you ever expose an API.
- **`work_order_status` as an enum** — keeps status values consistent; add stages later (e.g. `'quality_check'`) with `alter type ... add value`.
- **`work_order_notes` as a separate table** — instead of one big text field, this gives you a timeline (who said what, when) — very close to how FullBay's activity feed works, and it's a small addition now that saves a painful migration later.
- **`technician_id` nullable on work_orders** — a work order can exist before anyone's assigned to it.
- **No parts/inventory table yet** — intentionally deferred. For v1, log parts as text inside `work_performed` or a note. Add a real `parts` + `work_order_parts` join table in v2 once the core flow is proven.

## Suggested v1 → v2 path

| Version | Adds |
|---|---|
| v1 (this) | Customers, vehicles, technicians, work orders, notes |
| v2 | Parts/inventory catalog + parts used per work order |
| v3 | Invoicing (tie labor hours + parts cost → invoice) |
| v4 | Fleet-level maintenance scheduling (recurring service reminders by mileage/date) |
| v5 | Reporting/dashboards (technician productivity, avg turnaround time, cost per vehicle) |
