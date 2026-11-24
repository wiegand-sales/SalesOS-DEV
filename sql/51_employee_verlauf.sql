-- 51_employee_verlauf.sql  ·  Sales OS · Verlauf der Arbeitszeit mit „gültig ab“ (Review C4)
-- Bisher hat eine geänderte Arbeitszeit in den Stammdaten Opt./Std. und Provision aller offenen Vormonate neu berechnet.
-- Neu: Jede Arbeitszeit bekommt ein Datum „gültig ab“; das Board rechnet jeden Tag mit der Version, die an diesem Tag galt.
-- Startwert: die heute hinterlegte Arbeitszeit gilt ab Eintrittsdatum (bisherige Zahlen bleiben gleich).
-- Eintritt/Austritt bleiben ohne Verlauf (Änderung = Korrektur).
-- Erst im DEV-Projekt (kjlkneodyvfqgaukdjvb), dann im Live-Projekt (nhudrbulfyampyyxhosv) ausführen.
-- Kann mehrfach ausgeführt werden. Ohne diese Tabelle rechnet das Board wie bisher mit der aktuellen Arbeitszeit.

begin;

do $$
declare t text;
begin
  select format_type(atttypid, atttypmod) into t from pg_attribute
  where attrelid = 'public.employees'::regclass and attname = 'id';
  execute format('create table if not exists public.employee_verlauf (
      employee_id %s not null references public.employees(id) on delete cascade,
      feld text not null check (feld in (''workHours'')),
      gueltig_ab date not null,
      wert jsonb,
      geaendert_von text,
      geaendert_am timestamptz not null default now(),
      primary key (employee_id, feld, gueltig_ab))', t);
end $$;

alter table public.employee_verlauf enable row level security;
grant select, insert, update, delete on public.employee_verlauf to authenticated;
revoke all on public.employee_verlauf from anon;

drop policy if exists ev_select on public.employee_verlauf;
drop policy if exists ev_insert on public.employee_verlauf;
drop policy if exists ev_update on public.employee_verlauf;
drop policy if exists ev_delete on public.employee_verlauf;
-- Lesen: Staff alles, Sales Agent nur die eigene Zeile (wie employees/performance)
create policy ev_select on public.employee_verlauf for select to authenticated
  using ((select public.is_staff()) or ((select public.is_agent()) and public.owns_employee(employee_id::text)));
-- Schreiben: wie die Stammdaten (Admin, Coach laut „Rollen & Rechte“)
create policy ev_insert on public.employee_verlauf for insert to authenticated
  with check ((select public.can_write('stammdaten')));
create policy ev_update on public.employee_verlauf for update to authenticated
  using ((select public.can_write('stammdaten'))) with check ((select public.can_write('stammdaten')));
create policy ev_delete on public.employee_verlauf for delete to authenticated
  using ((select public.can_write('stammdaten')));

-- Startwerte: heutige Arbeitszeit ab Eintrittsdatum (ohne Eintritt: ab 01.01.2000).
-- wert = null heißt „Standard-Arbeitszeit des Boards“.
insert into public.employee_verlauf (employee_id, feld, gueltig_ab, wert, geaendert_von)
select e.id, 'workHours', coalesce(e.start_date::date, date '2000-01-01'), e.work_hours::jsonb, 'Startwert (SQL 51)'
from public.employees e
where not exists (select 1 from public.employee_verlauf v where v.employee_id = e.id and v.feld = 'workHours');

commit;

-- Kontrolle: je Mitarbeiter eine Startzeile?
select (select count(*) from public.employees) as mitarbeiter,
       (select count(distinct employee_id) from public.employee_verlauf where feld = 'workHours') as mit_verlauf;
