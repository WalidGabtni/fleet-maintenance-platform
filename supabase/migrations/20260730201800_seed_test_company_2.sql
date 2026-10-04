alter table profiles disable trigger profiles_prevent_self_privilege_escalation;
update profiles set role = 'admin' where email = 'admin@testcompany2.test';
alter table profiles enable trigger profiles_prevent_self_privilege_escalation;

insert into customers (name, phone, tenant_id)
values ('Acme Freight Co', '5145550199', (select id from tenants where name = 'Test Company 2'));

insert into vehicles (customer_id, unit_number, make, model, year, tenant_id)
select id, '900', 'Kenworth', 'T680', 2021, tenant_id
from customers where name = 'Acme Freight Co' and tenant_id = (select id from tenants where name = 'Test Company 2');

insert into parts (name, part_number, unit_cost, quantity_on_hand, low_stock_threshold, tenant_id)
values ('Filtre à huile', 'FLT-200', 18.50, 20, 5, (select id from tenants where name = 'Test Company 2'));
