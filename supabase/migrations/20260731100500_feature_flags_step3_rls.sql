-- work_orders (feature: work_orders)
alter policy "Admins full access on work_orders" on work_orders
  using (is_admin() and tenant_id = current_tenant_id() and tenant_has_feature('work_orders'))
  with check (is_admin() and tenant_id = current_tenant_id() and tenant_has_feature('work_orders'));
alter policy "Authenticated users can read work_orders" on work_orders
  using (auth.uid() is not null and tenant_id = current_tenant_id() and tenant_has_feature('work_orders'));
alter policy "Superviseurs full access on work_orders" on work_orders
  using ("current_role"() = 'superviseur' and tenant_id = current_tenant_id() and tenant_has_feature('work_orders'))
  with check ("current_role"() = 'superviseur' and tenant_id = current_tenant_id() and tenant_has_feature('work_orders'));
alter policy "Technicians can update their assigned work_orders" on work_orders
  using (
    tenant_id = current_tenant_id() and tenant_has_feature('work_orders')
    and exists (select 1 from technicians t where t.id = work_orders.technician_id and t.user_id = auth.uid())
  )
  with check (
    tenant_id = current_tenant_id() and tenant_has_feature('work_orders')
    and exists (select 1 from technicians t where t.id = work_orders.technician_id and t.user_id = auth.uid())
  );

-- work_order_notes (feature: work_orders)
alter policy "Admins full access on work_order_notes" on work_order_notes
  using (is_admin() and tenant_id = current_tenant_id() and tenant_has_feature('work_orders'))
  with check (is_admin() and tenant_id = current_tenant_id() and tenant_has_feature('work_orders'));
alter policy "Superviseurs full access on work_order_notes" on work_order_notes
  using ("current_role"() = 'superviseur' and tenant_id = current_tenant_id() and tenant_has_feature('work_orders'))
  with check ("current_role"() = 'superviseur' and tenant_id = current_tenant_id() and tenant_has_feature('work_orders'));
alter policy "Technicians can add notes on their assigned work_orders" on work_order_notes
  with check (
    tenant_id = current_tenant_id() and tenant_has_feature('work_orders')
    and exists (
      select 1 from work_orders wo join technicians t on t.id = wo.technician_id
      where wo.id = work_order_notes.work_order_id and t.user_id = auth.uid()
    )
  );
alter policy "Technicians can read notes on their assigned work_orders" on work_order_notes
  using (
    tenant_id = current_tenant_id() and tenant_has_feature('work_orders')
    and exists (
      select 1 from work_orders wo join technicians t on t.id = wo.technician_id
      where wo.id = work_order_notes.work_order_id and t.user_id = auth.uid()
    )
  );

-- parts (feature: parts_inventory)
alter policy "Admins full access on parts" on parts
  using (is_admin() and tenant_id = current_tenant_id() and tenant_has_feature('parts_inventory'))
  with check (is_admin() and tenant_id = current_tenant_id() and tenant_has_feature('parts_inventory'));
alter policy "Authenticated users can read parts" on parts
  using (auth.uid() is not null and tenant_id = current_tenant_id() and tenant_has_feature('parts_inventory'));
alter policy "Commis pieces full access on parts" on parts
  using ("current_role"() = 'commis_pieces' and tenant_id = current_tenant_id() and tenant_has_feature('parts_inventory'))
  with check ("current_role"() = 'commis_pieces' and tenant_id = current_tenant_id() and tenant_has_feature('parts_inventory'));

-- work_order_parts (features: work_orders AND parts_inventory — needs both)
alter policy "Admins full access on work_order_parts" on work_order_parts
  using (is_admin() and tenant_id = current_tenant_id() and tenant_has_feature('work_orders') and tenant_has_feature('parts_inventory'))
  with check (is_admin() and tenant_id = current_tenant_id() and tenant_has_feature('work_orders') and tenant_has_feature('parts_inventory'));
alter policy "Commis pieces full access on work_order_parts" on work_order_parts
  using ("current_role"() = 'commis_pieces' and tenant_id = current_tenant_id() and tenant_has_feature('work_orders') and tenant_has_feature('parts_inventory'))
  with check ("current_role"() = 'commis_pieces' and tenant_id = current_tenant_id() and tenant_has_feature('work_orders') and tenant_has_feature('parts_inventory'));
alter policy "Technicians can add work_order_parts on their assigned work_ord" on work_order_parts
  with check (
    tenant_id = current_tenant_id() and tenant_has_feature('work_orders') and tenant_has_feature('parts_inventory')
    and exists (
      select 1 from work_orders wo join technicians t on t.id = wo.technician_id
      where wo.id = work_order_parts.work_order_id and t.user_id = auth.uid()
    )
  );
alter policy "Technicians can read work_order_parts on their assigned work_or" on work_order_parts
  using (
    tenant_id = current_tenant_id() and tenant_has_feature('work_orders') and tenant_has_feature('parts_inventory')
    and exists (
      select 1 from work_orders wo join technicians t on t.id = wo.technician_id
      where wo.id = work_order_parts.work_order_id and t.user_id = auth.uid()
    )
  );

-- invoices (feature: invoicing)
alter policy "Admins full access on invoices" on invoices
  using (is_admin() and tenant_id = current_tenant_id() and tenant_has_feature('invoicing'))
  with check (is_admin() and tenant_id = current_tenant_id() and tenant_has_feature('invoicing'));
alter policy "Technicians can read invoices on their assigned work_orders" on invoices
  using (
    tenant_id = current_tenant_id() and tenant_has_feature('invoicing')
    and exists (
      select 1 from work_orders wo join technicians t on t.id = wo.technician_id
      where wo.id = invoices.work_order_id and t.user_id = auth.uid()
    )
  );

-- maintenance_templates (feature: maintenance_scheduling)
alter policy "Admins full access on maintenance_templates" on maintenance_templates
  using (is_admin() and tenant_id = current_tenant_id() and tenant_has_feature('maintenance_scheduling'))
  with check (is_admin() and tenant_id = current_tenant_id() and tenant_has_feature('maintenance_scheduling'));
alter policy "Authenticated users can read maintenance_templates" on maintenance_templates
  using (auth.uid() is not null and tenant_id = current_tenant_id() and tenant_has_feature('maintenance_scheduling'));
alter policy "Superviseurs full access on maintenance_templates" on maintenance_templates
  using ("current_role"() = 'superviseur' and tenant_id = current_tenant_id() and tenant_has_feature('maintenance_scheduling'))
  with check ("current_role"() = 'superviseur' and tenant_id = current_tenant_id() and tenant_has_feature('maintenance_scheduling'));

-- vehicle_maintenance_schedules (feature: maintenance_scheduling)
alter policy "Admins full access on vehicle_maintenance_schedules" on vehicle_maintenance_schedules
  using (is_admin() and tenant_id = current_tenant_id() and tenant_has_feature('maintenance_scheduling'))
  with check (is_admin() and tenant_id = current_tenant_id() and tenant_has_feature('maintenance_scheduling'));
alter policy "Authenticated users can read vehicle_maintenance_schedules" on vehicle_maintenance_schedules
  using (auth.uid() is not null and tenant_id = current_tenant_id() and tenant_has_feature('maintenance_scheduling'));
alter policy "Superviseurs full access on vehicle_maintenance_schedules" on vehicle_maintenance_schedules
  using ("current_role"() = 'superviseur' and tenant_id = current_tenant_id() and tenant_has_feature('maintenance_scheduling'))
  with check ("current_role"() = 'superviseur' and tenant_id = current_tenant_id() and tenant_has_feature('maintenance_scheduling'));

-- profiles: only cross-user management is feature-gated (manage_users). Self
-- read/update policies are untouched — logging in must never depend on a
-- feature flag.
alter policy "Admins full access on profiles" on profiles
  using (is_admin() and tenant_id = current_tenant_id() and tenant_has_feature('manage_users'))
  with check (is_admin() and tenant_id = current_tenant_id() and tenant_has_feature('manage_users'));
