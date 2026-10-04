-- ============================
-- V2: PARTS & INVENTORY
-- parts used per work order
-- ============================

create table work_order_parts (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  part_id uuid not null references parts(id) on delete restrict,
  quantity_used int not null check (quantity_used > 0),
  unit_price_at_time numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create index idx_work_order_parts_work_order on work_order_parts(work_order_id);
create index idx_work_order_parts_part on work_order_parts(part_id);

-- RLS: enabled with no policies yet (default-deny), same holding pattern as `parts`.
alter table work_order_parts enable row level security;
