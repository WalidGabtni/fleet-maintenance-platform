create table if not exists _debug_report_fns as
select p.proname, pg_get_functiondef(p.oid) as fn_def
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
and p.proname like 'report_%';
