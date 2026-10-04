-- ============================
-- V2: PARTS & INVENTORY
-- parts catalog table
-- ============================

create table parts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  part_number text unique,
  unit_cost numeric(10,2) not null default 0,
  quantity_on_hand int not null default 0,
  low_stock_threshold int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_parts_updated_at
before update on parts
for each row execute function set_updated_at();

-- RLS: enabled with no policies yet (default-deny) — a real access model
-- (likely admin-manage / technician-read, matching the rest of v1) belongs
-- in a later step once it's specified, not guessed at here.
alter table parts enable row level security;
