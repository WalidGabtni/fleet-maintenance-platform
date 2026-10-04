-- Re-link the two real technicien accounts to fresh technician records
-- under Demo Fleet Co (technicians was truncated in the clean-slate step).
insert into technicians (full_name, email, user_id, tenant_id)
select 'Technician One', 'tech1@example.com', id, tenant_id from profiles where email = 'tech1@example.com'
union all
select 'Technician Two', 'tech2@example.com', id, tenant_id from profiles where email = 'tech2@example.com';

-- Minimal Demo Fleet Co test data so the app isn't empty during verification.
insert into customers (name, phone, tenant_id)
values ('Sample Customer', '5145550100', (select id from tenants where name = 'Demo Fleet Co'));

insert into vehicles (customer_id, unit_number, make, model, year, tenant_id)
select id, '169', 'Peterbilt', '389', 2019, tenant_id
from customers where name = 'Sample Customer' and tenant_id = (select id from tenants where name = 'Demo Fleet Co');

insert into parts (name, part_number, unit_cost, quantity_on_hand, low_stock_threshold, tenant_id)
values ('Plaquettes de frein', 'BRK-100', 45.00, 12, 4, (select id from tenants where name = 'Demo Fleet Co'));

-- Second tenant, for isolation testing.
insert into tenants (name) values ('Test Company 2');
