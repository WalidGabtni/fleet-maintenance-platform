create table if not exists _debug_ff_policies as
select tablename, policyname, qual, with_check
from pg_policies
where schemaname = 'public'
and (qual like '%tenant_has_feature%' or with_check like '%tenant_has_feature%')
order by tablename, policyname;
