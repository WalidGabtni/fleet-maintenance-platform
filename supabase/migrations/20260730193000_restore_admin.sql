alter table profiles disable trigger profiles_prevent_self_privilege_escalation;
update profiles set role = 'admin' where email = 'platform-admin@example.com';
alter table profiles enable trigger profiles_prevent_self_privilege_escalation;
