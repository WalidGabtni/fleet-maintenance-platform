create table if not exists _debug_policies as
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
