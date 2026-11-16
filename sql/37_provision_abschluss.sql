-- 37_provision_abschluss.sql
-- Monatsabschluss der Provision: nach dem Abschluss zeigt das Board für diesen Monat nur noch die eingefrorenen Werte.
--   provision_monat      – welcher Monat ist abgeschlossen (von wem, wann)
--   provision_abschluss  – je Mitarbeiter die eingefrorenen Werte (Tage, Summen, Stunden, KPIs, Abzug, Optional, Provision)
-- Lesen: Monate alle Angemeldeten, Werte nach der Gehaltsregel (can_see_salary). Schreiben/Löschen nur Admins.
-- In DEV und Live ausführen, mehrfach unbedenklich.

begin;

create table if not exists public.provision_monat (
  monat text primary key check (monat ~ '^\d{4}-\d{2}$'),
  abgeschlossen_von text,
  abgeschlossen_am timestamptz not null default now()
);

do $$
declare t text;
begin
  select format_type(atttypid, atttypmod) into t from pg_attribute
  where attrelid = 'public.employees'::regclass and attname = 'id';
  execute format('create table if not exists public.provision_abschluss (
      monat text not null references public.provision_monat(monat) on delete cascade,
      employee_id %s not null references public.employees(id) on delete cascade,
      werte jsonb not null,
      primary key (monat, employee_id))', t);
end $$;

alter table public.provision_monat enable row level security;
alter table public.provision_abschluss enable row level security;
grant select, insert, update, delete on public.provision_monat, public.provision_abschluss to authenticated;
revoke all on public.provision_monat, public.provision_abschluss from anon;

drop policy if exists pm_select on public.provision_monat;
drop policy if exists pm_write  on public.provision_monat;
create policy pm_select on public.provision_monat for select to authenticated using (true);
create policy pm_write  on public.provision_monat for all to authenticated
  using ((select public.board_role()) = 'admin') with check ((select public.board_role()) = 'admin');

drop policy if exists pa_select on public.provision_abschluss;
drop policy if exists pa_write  on public.provision_abschluss;
create policy pa_select on public.provision_abschluss for select to authenticated
  using (public.can_see_salary(employee_id::text));
create policy pa_write  on public.provision_abschluss for all to authenticated
  using ((select public.board_role()) = 'admin') with check ((select public.board_role()) = 'admin');

commit;

select (select count(*) from information_schema.tables where table_schema='public' and table_name in ('provision_monat','provision_abschluss')) as tabellen_angelegt
