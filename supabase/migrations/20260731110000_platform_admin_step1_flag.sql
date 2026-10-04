alter table profiles add column is_platform_admin boolean not null default false;

-- Mirrors is_admin()/current_tenant_id() — checks the CURRENT actor's own
-- profile, security definer so it bypasses RLS internally (no recursion).
create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_platform_admin = true and active = true
  );
$$;

-- Extend the existing self-privilege-escalation guard: only an existing
-- platform admin may change is_platform_admin on ANY row (stricter than the
-- role/email checks above, which only block non-admins — here even a full
-- tenant admin who isn't a platform admin must be blocked, since tenant
-- admin rights and platform-admin rights are intentionally independent).
-- Also blocks zeroing out the last remaining platform admin, mirroring the
-- last-admin-or-directeur safeguard already enforced at the app layer for
-- tenant roles.
create or replace function public.prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    if NEW.role is distinct from OLD.role then
      raise exception 'Vous ne pouvez pas modifier votre propre rôle.';
    end if;
    if NEW.email is distinct from OLD.email then
      raise exception 'La modification de l''e-mail n''est pas encore prise en charge ici.';
    end if;
  end if;

  if NEW.is_platform_admin is distinct from OLD.is_platform_admin then
    if not is_platform_admin() then
      raise exception 'Seul un administrateur de la plateforme peut modifier ce statut.';
    end if;
    if OLD.is_platform_admin = true and NEW.is_platform_admin = false then
      if not exists (
        select 1 from profiles
        where is_platform_admin = true and active = true and id <> OLD.id
      ) then
        raise exception 'Impossible de retirer le dernier administrateur de la plateforme.';
      end if;
    end if;
  end if;

  return NEW;
end;
$$;

-- Seed the first platform admin. The trigger above would otherwise block
-- this (no session during a migration → is_platform_admin() is false), so
-- disable it narrowly around just this UPDATE, same pattern used for the
-- five-role migration.
alter table profiles disable trigger profiles_prevent_self_privilege_escalation;
update profiles set is_platform_admin = true where email = 'platform-admin@example.com';
alter table profiles enable trigger profiles_prevent_self_privilege_escalation;
