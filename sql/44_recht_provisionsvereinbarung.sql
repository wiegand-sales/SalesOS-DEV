-- 44_recht_provisionsvereinbarung.sql
-- Recht „Provisionsvereinbarung ändern“ auch in der Datenbank durchsetzen:
-- Änderungen an employees.provision_settings nur durch Admins, durch Coaches, wenn die Rolle das Recht hat
-- (Einstellungen › Rollen & Rechte), oder durch einzeln freigegebene Personen (settings.permPersons → provEdit).
-- In DEV und Live ausführen, mehrfach unbedenklich.
create or replace function public.guard_provision_settings() returns trigger
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); ok boolean := false; pp jsonb; rp jsonb;
begin
  if new.provision_settings is not distinct from old.provision_settings or me is null then return new; end if;
  if coalesce(public.board_role(),'') = 'admin' then return new; end if;
  select value::jsonb into pp from public.settings where key = 'permPersons';
  if pp is not null and jsonb_typeof(pp->'provEdit') = 'array' then
    ok := exists(select 1 from public.employees e where e.auth_user_id = me and (pp->'provEdit') ? ('emp:' || e.id::text))
       or exists(select 1 from public.app_users u where u.auth_user_id = me and (pp->'provEdit') ? ('app:' || u.id::text));
  end if;
  if not ok and public.board_role() = 'coach' then
    select value::jsonb into rp from public.settings where key = 'rolePermissions';
    ok := coalesce(rp->'coach'->>'provEdit','-') = 'E';
  end if;
  if not ok then raise exception 'Provisionsvereinbarung ändern: keine Berechtigung'; end if;
  return new;
end $$;
drop trigger if exists trg_guard_provision_settings on public.employees;
create trigger trg_guard_provision_settings before update on public.employees
  for each row execute function public.guard_provision_settings();
select 'Schutz für Provisionsvereinbarungen aktiv' as status;
