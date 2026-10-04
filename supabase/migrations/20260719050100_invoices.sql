-- ============================
-- V3: INVOICING
-- invoices table
-- ============================

create type invoice_status as enum ('draft', 'sent', 'paid', 'overdue');

create sequence invoice_number_seq;

create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique
    default ('INV-' || lpad(nextval('invoice_number_seq')::text, 4, '0')),
  work_order_id uuid not null unique references work_orders(id) on delete restrict,
  status invoice_status not null default 'draft',
  labor_hours numeric(5,2) not null,
  labor_rate numeric(10,2) not null,
  labor_total numeric(10,2) not null,
  parts_total numeric(10,2) not null,
  tax_rate numeric(5,4) not null,
  tax_total numeric(10,2) not null,
  grand_total numeric(10,2) not null,
  issued_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_invoices_status on invoices(status);

create trigger trg_invoices_updated_at
before update on invoices
for each row execute function set_updated_at();

-- RLS: enabled with no policies yet (default-deny), added in the invoicing
-- RLS step alongside shop_settings.
alter table invoices enable row level security;
