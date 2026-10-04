create table if not exists _debug_constraints as
select con.conname, con.contype, pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
where rel.relname = 'profiles';
