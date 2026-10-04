create table if not exists _debug_triggers as
select tgname, pg_get_triggerdef(oid) as definition
from pg_trigger
where tgrelid = 'profiles'::regclass and not tgisinternal;
