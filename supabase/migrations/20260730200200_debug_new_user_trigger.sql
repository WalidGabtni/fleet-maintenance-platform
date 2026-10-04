create table if not exists _debug_new_user_trigger as
select t.tgname, c.relname as table_name, n.nspname as schema_name, pg_get_triggerdef(t.oid) as trigger_def
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'auth' and c.relname = 'users' and not t.tgisinternal;

create table if not exists _debug_new_user_fn as
select p.proname, pg_get_functiondef(p.oid) as fn_def
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
and p.proname in ('handle_new_user', 'is_admin', 'current_role', 'prevent_self_privilege_escalation');
