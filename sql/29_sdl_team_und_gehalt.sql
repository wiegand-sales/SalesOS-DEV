-- 29_sdl_team_und_gehalt.sql
-- 1) Position SC heißt jetzt SDC (Sales Department Coach), neu: SDL (Sales Department Lead = Agent + Coach)
-- 2) SDL bekommt ein Team (employees.sdl_team, Liste von Mitarbeiter-IDs)
-- 3) Gehalt (Grundgehalt, AG-Sozialabgaben) zieht aus employees.provision_settings in die geschützte Tabelle employee_salary:
--    Admin, Betrachter und Coaches sehen alle; ein SDL nur sich und sein Team; ein Agent nur sich selbst.
--    Gleiches gilt für die Gehalts-Einträge in der Änderungshistorie.
-- 4) Position, Team und Board-Rolle darf in der Datenbank nur noch ein Admin ändern.
-- Sicherung: backup_20261111_employees (id, role, provision_settings), über die App nicht abrufbar.
-- Erst in DEV ausführen, prüfen, dann in Live.

begin;

-- 0) Sicherung -------------------------------------------------------------
create table if not exists public.backup_20261111_employees as
  select id, role, board_role, provision_settings, now() as gesichert_am from public.employees;
alter table public.backup_20261111_employees enable row level security;   -- keine Policy = kein Zugriff über die App
revoke all on public.backup_20261111_employees from anon, authenticated;

-- 1) Positionen ------------------------------------------------------------
do $$
declare c record;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.employees'::regclass and contype = 'c'
             and conname <> 'employees_board_role_check'
             and pg_get_constraintdef(oid) ~* '\mrole\M'
  loop
    execute format('alter table public.employees drop constraint %I', c.conname);
    raise notice 'Alte Positions-Prüfung entfernt: %', c.conname;
  end loop;
end $$;

update public.employees set role = 'SDC' where role = 'SC';

-- 2) Team des SDL ----------------------------------------------------------
alter table public.employees add column if not exists sdl_team jsonb not null default '[]'::jsonb;

-- 3) Rolle aus der Position (SDC, SDM, SDL = Coach; SC bleibt übergangsweise erkannt)
create or replace function public.board_role() returns text
language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then null
    when exists (select 1 from public.app_users a
                 where a.auth_user_id::text = auth.uid()::text
                    or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
      then (select case when a.role = 'admin' then 'admin' else 'viewer' end
            from public.app_users a
            where a.auth_user_id::text = auth.uid()::text
               or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
            order by (a.role = 'admin') desc limit 1)
    else (select coalesce(e.board_role,
                          case when coalesce(e.is_pure_coach, false) or e.role in ('SC','SDC','SDM','SDL') then 'coach' else 'agent' end)
          from public.employees e where e.auth_user_id::text = auth.uid()::text limit 1)
  end;
$$;

-- Darf der Login das Gehalt dieses Mitarbeiters sehen?
create or replace function public.can_see_salary(eid text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then false
    when public.board_role() in ('admin','viewer') then true
    else exists (
      select 1 from public.employees me
      where me.auth_user_id::text = auth.uid()::text
        and (   me.id::text = eid
             or (public.board_role() = 'coach' and coalesce(me.role,'') <> 'SDL')
             or (public.board_role() = 'coach' and me.role = 'SDL' and coalesce(me.sdl_team, '[]'::jsonb) ? eid)))
  end;
$$;
revoke all on function public.can_see_salary(text) from public;
grant execute on function public.can_see_salary(text) to authenticated;

-- 4) Position, Team und Board-Rolle nur durch Admins (SQL-Editor/Sync ohne Login bleibt erlaubt)
create or replace function public.guard_employee_admin_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.board_role() = 'admin' then return new; end if;
  if tg_op = 'INSERT' then
    if new.role = 'SDL' or coalesce(new.sdl_team, '[]'::jsonb) <> '[]'::jsonb or new.board_role is not null then
      raise exception 'Position SDL, Team und Board-Rolle darf nur ein Admin vergeben';
    end if;
  elsif new.role is distinct from old.role
     or coalesce(new.sdl_team, '[]'::jsonb) is distinct from coalesce(old.sdl_team, '[]'::jsonb)
     or new.board_role is distinct from old.board_role then
    raise exception 'Position, Team und Board-Rolle darf nur ein Admin ändern';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_employee_admin_fields on public.employees;
create trigger guard_employee_admin_fields before insert or update on public.employees
  for each row execute function public.guard_employee_admin_fields();

-- 5) Gehalt in eigene Tabelle ----------------------------------------------
do $$
declare t text;
begin
  select format_type(atttypid, atttypmod) into t from pg_attribute
  where attrelid = 'public.employees'::regclass and attname = 'id';
  execute format('create table if not exists public.employee_salary (
      employee_id %s primary key references public.employees(id) on delete cascade,
      grundgehalt numeric, ag_sozialabgaben numeric, updated_at timestamptz not null default now())', t);
end $$;
alter table public.employee_salary enable row level security;
grant select, insert, update, delete on public.employee_salary to authenticated;
revoke all on public.employee_salary from anon;
drop policy if exists salary_select on public.employee_salary;
drop policy if exists salary_insert on public.employee_salary;
drop policy if exists salary_update on public.employee_salary;
drop policy if exists salary_delete on public.employee_salary;
create policy salary_select on public.employee_salary for select to authenticated
  using (public.can_see_salary(employee_id::text));
create policy salary_insert on public.employee_salary for insert to authenticated
  with check (public.can_write('stammdaten') and public.can_see_salary(employee_id::text));
create policy salary_update on public.employee_salary for update to authenticated
  using (public.can_write('stammdaten') and public.can_see_salary(employee_id::text))
  with check (public.can_write('stammdaten') and public.can_see_salary(employee_id::text));
create policy salary_delete on public.employee_salary for delete to authenticated
  using (public.can_write('stammdaten') and public.can_see_salary(employee_id::text));

insert into public.employee_salary (employee_id, grundgehalt, ag_sozialabgaben)
select e.id,
       nullif(e.provision_settings ->> 'grundgehalt', '')::numeric,
       nullif(e.provision_settings ->> 'agSozialabgaben', '')::numeric
from public.employees e
where e.provision_settings ?| array['grundgehalt','agSozialabgaben']
on conflict (employee_id) do update
  set grundgehalt      = coalesce(excluded.grundgehalt, public.employee_salary.grundgehalt),
      ag_sozialabgaben = coalesce(excluded.ag_sozialabgaben, public.employee_salary.ag_sozialabgaben),
      updated_at = now();

-- Prüfung VOR dem Entfernen: jedes gespeicherte Gehalt muss in employee_salary angekommen sein
do $$
declare fehlt int;
begin
  select count(*) into fehlt from public.employees e
  where e.provision_settings ? 'grundgehalt'
    and nullif(e.provision_settings ->> 'grundgehalt','') is not null
    and not exists (select 1 from public.employee_salary s
                    where s.employee_id = e.id
                      and s.grundgehalt = nullif(e.provision_settings ->> 'grundgehalt','')::numeric);
  if fehlt > 0 then raise exception 'Abbruch: % Gehälter nicht übertragen – nichts wurde geändert', fehlt; end if;
end $$;

update public.employees
   set provision_settings = provision_settings - 'grundgehalt' - 'agSozialabgaben'
 where provision_settings ?| array['grundgehalt','agSozialabgaben'];

-- 6) Gehalts-Einträge in der Änderungshistorie nur für Berechtigte
drop policy if exists salary_hist_hide on public.employee_history;
create policy salary_hist_hide on public.employee_history as restrictive for select to authenticated
  using (coalesce(field, '') not in ('provision_grundgehalt','provision_agSozialabgaben')
         or public.can_see_salary(employee_id::text));

commit;

-- Kontrolle
select (select count(*) from public.employee_salary) as gehaelter_in_neuer_tabelle,
       (select count(*) from public.employees where provision_settings ?| array['grundgehalt','agSozialabgaben']) as noch_in_provision_settings,
       (select count(*) from public.employees where role = 'SC') as noch_sc,
       (select count(*) from public.employees where role = 'SDC') as sdc;
