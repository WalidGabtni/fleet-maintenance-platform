create table if not exists _debug_pks as
select conrelid::regclass::text as table_name, conname, contype, pg_get_constraintdef(oid) as definition
from pg_constraint
where connamespace = 'public'::regnamespace
and contype in ('p','c')
order by 1, 2;
