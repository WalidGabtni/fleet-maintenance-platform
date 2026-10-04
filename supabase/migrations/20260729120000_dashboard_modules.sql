-- ============================
-- MODULE DASHBOARD
-- ============================

-- Vehicles gain an "active" flag so the dashboard's Véhicules card can show
-- a real active/inactive breakdown instead of a fake stat. Defaults to true
-- so every existing vehicle stays counted as active.
alter table vehicles add column active boolean not null default true;

-- Per-user record of which dashboard module cards they've dismissed. No
-- data is deleted when a card is hidden — this table just tracks visibility
-- preference, scoped to the user who hid it.
create table dashboard_hidden_modules (
  user_id uuid not null references auth.users(id) on delete cascade,
  module_key text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, module_key)
);

alter table dashboard_hidden_modules enable row level security;

create policy "Users manage their own hidden modules" on dashboard_hidden_modules
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
