-- ============================
-- ROLES SETUP
-- ============================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'technician' check (role in ('admin', 'technician')),
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill profiles for any auth users that already existed before this migration.
insert into public.profiles (id, email)
select u.id, u.email
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- Link a technicians row to the login account that "is" that technician,
-- so RLS can check "is this work order assigned to the calling user".
alter table technicians
  add column user_id uuid unique references auth.users(id) on delete set null;

-- Helper used throughout RLS policies to avoid repeating the profiles lookup.
-- security definer so it reads `profiles` without being subject to the RLS
-- policies we're about to put on that same table (no recursion).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table profiles enable row level security;

create policy "Admins full access on profiles" on profiles
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Users can read their own profile" on profiles
  for select using (id = auth.uid());
