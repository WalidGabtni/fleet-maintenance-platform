-- ============================
-- V3: INVOICING
-- shop settings (singleton config)
-- ============================

create table shop_settings (
  id int primary key default 1 check (id = 1),
  hourly_labor_rate numeric(10,2) not null default 75.00,
  tax_rate numeric(5,4) not null default 0.0700,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_shop_settings_updated_at
before update on shop_settings
for each row execute function set_updated_at();

insert into shop_settings (id) values (1);

-- RLS: enabled with no policies yet (default-deny) — admin-only access is
-- specified but implemented in the invoicing RLS step, same holding pattern
-- as v2's `parts` table.
alter table shop_settings enable row level security;
