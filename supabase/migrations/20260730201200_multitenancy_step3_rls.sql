create or replace function public.current_tenant_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select tenant_id from public.profiles
  where id = auth.uid() and active = true;
$$;

create policy "Users can read their own tenant" on tenants
  for select using (id = public.current_tenant_id());

-- customers
alter policy "Admins full access on customers" on customers
  using (is_admin() and tenant_id = public.current_tenant_id())
  with check (is_admin() and tenant_id = public.current_tenant_id());
alter policy "Non parts-clerk users can read customers" on customers
  using (auth.uid() is not null and "current_role"() is distinct from 'commis_pieces' and tenant_id = public.current_tenant_id());
alter policy "Superviseurs full access on customers" on customers
  using ("current_role"() = 'superviseur' and tenant_id = public.current_tenant_id())
  with check ("current_role"() = 'superviseur' and tenant_id = public.current_tenant_id());

-- invoices
alter policy "Admins full access on invoices" on invoices
  using (is_admin() and tenant_id = public.current_tenant_id())
  with check (is_admin() and tenant_id = public.current_tenant_id());
alter policy "Technicians can read invoices on their assigned work_orders" on invoices
  using (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from work_orders wo join technicians t on t.id = wo.technician_id
      where wo.id = invoices.work_order_id and t.user_id = auth.uid()
    )
  );

-- maintenance_templates
alter policy "Admins full access on maintenance_templates" on maintenance_templates
  using (is_admin() and tenant_id = public.current_tenant_id())
  with check (is_admin() and tenant_id = public.current_tenant_id());
alter policy "Authenticated users can read maintenance_templates" on maintenance_templates
  using (auth.uid() is not null and tenant_id = public.current_tenant_id());
alter policy "Superviseurs full access on maintenance_templates" on maintenance_templates
  using ("current_role"() = 'superviseur' and tenant_id = public.current_tenant_id())
  with check ("current_role"() = 'superviseur' and tenant_id = public.current_tenant_id());

-- parts
alter policy "Admins full access on parts" on parts
  using (is_admin() and tenant_id = public.current_tenant_id())
  with check (is_admin() and tenant_id = public.current_tenant_id());
alter policy "Authenticated users can read parts" on parts
  using (auth.uid() is not null and tenant_id = public.current_tenant_id());
alter policy "Commis pieces full access on parts" on parts
  using ("current_role"() = 'commis_pieces' and tenant_id = public.current_tenant_id())
  with check ("current_role"() = 'commis_pieces' and tenant_id = public.current_tenant_id());

-- profiles
alter policy "Admins full access on profiles" on profiles
  using (is_admin() and tenant_id = public.current_tenant_id())
  with check (is_admin() and tenant_id = public.current_tenant_id());
alter policy "Users can read their own profile" on profiles
  using (id = auth.uid() and tenant_id = public.current_tenant_id());
alter policy "Users can update their own name" on profiles
  using (id = auth.uid() and tenant_id = public.current_tenant_id())
  with check (
    id = auth.uid()
    and tenant_id = public.current_tenant_id()
    and role = (select role from profiles p2 where p2.id = auth.uid())
    and active = (select active from profiles p2 where p2.id = auth.uid())
  );

-- shop_settings
alter policy "Admins full access on shop_settings" on shop_settings
  using (is_admin() and tenant_id = public.current_tenant_id())
  with check (is_admin() and tenant_id = public.current_tenant_id());

-- technicians
alter policy "Admins full access on technicians" on technicians
  using (is_admin() and tenant_id = public.current_tenant_id())
  with check (is_admin() and tenant_id = public.current_tenant_id());
alter policy "Authenticated users can read technicians" on technicians
  using (auth.uid() is not null and tenant_id = public.current_tenant_id());
alter policy "Superviseurs full access on technicians" on technicians
  using ("current_role"() = 'superviseur' and tenant_id = public.current_tenant_id())
  with check ("current_role"() = 'superviseur' and tenant_id = public.current_tenant_id());

-- vehicle_maintenance_schedules
alter policy "Admins full access on vehicle_maintenance_schedules" on vehicle_maintenance_schedules
  using (is_admin() and tenant_id = public.current_tenant_id())
  with check (is_admin() and tenant_id = public.current_tenant_id());
alter policy "Authenticated users can read vehicle_maintenance_schedules" on vehicle_maintenance_schedules
  using (auth.uid() is not null and tenant_id = public.current_tenant_id());
alter policy "Superviseurs full access on vehicle_maintenance_schedules" on vehicle_maintenance_schedules
  using ("current_role"() = 'superviseur' and tenant_id = public.current_tenant_id())
  with check ("current_role"() = 'superviseur' and tenant_id = public.current_tenant_id());

-- vehicles
alter policy "Admins full access on vehicles" on vehicles
  using (is_admin() and tenant_id = public.current_tenant_id())
  with check (is_admin() and tenant_id = public.current_tenant_id());
alter policy "Authenticated users can read vehicles" on vehicles
  using (auth.uid() is not null and tenant_id = public.current_tenant_id());
alter policy "Superviseurs full access on vehicles" on vehicles
  using ("current_role"() = 'superviseur' and tenant_id = public.current_tenant_id())
  with check ("current_role"() = 'superviseur' and tenant_id = public.current_tenant_id());

-- work_order_notes
alter policy "Admins full access on work_order_notes" on work_order_notes
  using (is_admin() and tenant_id = public.current_tenant_id())
  with check (is_admin() and tenant_id = public.current_tenant_id());
alter policy "Superviseurs full access on work_order_notes" on work_order_notes
  using ("current_role"() = 'superviseur' and tenant_id = public.current_tenant_id())
  with check ("current_role"() = 'superviseur' and tenant_id = public.current_tenant_id());
alter policy "Technicians can add notes on their assigned work_orders" on work_order_notes
  with check (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from work_orders wo join technicians t on t.id = wo.technician_id
      where wo.id = work_order_notes.work_order_id and t.user_id = auth.uid()
    )
  );
alter policy "Technicians can read notes on their assigned work_orders" on work_order_notes
  using (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from work_orders wo join technicians t on t.id = wo.technician_id
      where wo.id = work_order_notes.work_order_id and t.user_id = auth.uid()
    )
  );

-- work_order_parts
alter policy "Admins full access on work_order_parts" on work_order_parts
  using (is_admin() and tenant_id = public.current_tenant_id())
  with check (is_admin() and tenant_id = public.current_tenant_id());
alter policy "Commis pieces full access on work_order_parts" on work_order_parts
  using ("current_role"() = 'commis_pieces' and tenant_id = public.current_tenant_id())
  with check ("current_role"() = 'commis_pieces' and tenant_id = public.current_tenant_id());
alter policy "Technicians can add work_order_parts on their assigned work_ord" on work_order_parts
  with check (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from work_orders wo join technicians t on t.id = wo.technician_id
      where wo.id = work_order_parts.work_order_id and t.user_id = auth.uid()
    )
  );
alter policy "Technicians can read work_order_parts on their assigned work_or" on work_order_parts
  using (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from work_orders wo join technicians t on t.id = wo.technician_id
      where wo.id = work_order_parts.work_order_id and t.user_id = auth.uid()
    )
  );

-- work_orders
alter policy "Admins full access on work_orders" on work_orders
  using (is_admin() and tenant_id = public.current_tenant_id())
  with check (is_admin() and tenant_id = public.current_tenant_id());
alter policy "Authenticated users can read work_orders" on work_orders
  using (auth.uid() is not null and tenant_id = public.current_tenant_id());
alter policy "Superviseurs full access on work_orders" on work_orders
  using ("current_role"() = 'superviseur' and tenant_id = public.current_tenant_id())
  with check ("current_role"() = 'superviseur' and tenant_id = public.current_tenant_id());
alter policy "Technicians can update their assigned work_orders" on work_orders
  using (
    tenant_id = public.current_tenant_id()
    and exists (select 1 from technicians t where t.id = work_orders.technician_id and t.user_id = auth.uid())
  )
  with check (
    tenant_id = public.current_tenant_id()
    and exists (select 1 from technicians t where t.id = work_orders.technician_id and t.user_id = auth.uid())
  );
