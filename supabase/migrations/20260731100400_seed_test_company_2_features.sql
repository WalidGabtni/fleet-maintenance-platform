-- Test Company 2 starts with everything enabled too, so testing can
-- meaningfully exercise turning a feature OFF via the superadmin page.
insert into tenant_features (tenant_id, feature_key, enabled)
select t.id, f.key, true
from tenants t
cross join features f
where t.name = 'Test Company 2';
