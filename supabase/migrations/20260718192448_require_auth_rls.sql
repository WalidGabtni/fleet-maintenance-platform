-- Tighten RLS: require an authenticated Supabase Auth session for all access.
-- Replaces the permissive MVP "allow all" policies now that the app has login.

drop policy if exists "Allow all on customers" on customers;
drop policy if exists "Allow all on vehicles" on vehicles;
drop policy if exists "Allow all on technicians" on technicians;
drop policy if exists "Allow all on work_orders" on work_orders;
drop policy if exists "Allow all on work_order_notes" on work_order_notes;

create policy "Authenticated users only" on customers
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Authenticated users only" on vehicles
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Authenticated users only" on technicians
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Authenticated users only" on work_orders
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Authenticated users only" on work_order_notes
  for all using (auth.uid() is not null) with check (auth.uid() is not null);
