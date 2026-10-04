create table if not exists _debug_trigger_fn as
select pg_get_functiondef(oid) as definition
from pg_proc
where proname = 'prevent_self_privilege_escalation';
