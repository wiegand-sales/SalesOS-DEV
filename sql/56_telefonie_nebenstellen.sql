-- 56_telefonie_nebenstellen.sql  ·  Sales OS · Welche 3CX-Nebenstelle gehört wann zu welchem Mitarbeiter
-- In DEV UND Live ausführen. Kann mehrfach ausgeführt werden.
--
-- Nebenstellen werden bei Abgang an neue Mitarbeiter weitergegeben (Peter, 24.11.2026). Deshalb gilt jede Zuordnung
-- für einen Zeitraum (gueltig_ab … gueltig_bis); zusätzlich begrenzen start_date/end_date des Mitarbeiters.
-- Ein Mitarbeiter kann mehrere Nebenstellen haben (z. B. 343 + 365).
-- Ersetzt die Spalte employees.nebenstelle aus 52/53 (war noch leer).

begin;

alter table public.employees drop column if exists nebenstelle;

create table if not exists public.telefonie_nebenstellen (
  id          bigint generated always as identity primary key,
  nebenstelle text not null check (nebenstelle ~ '^[0-9]{2,6}$'),
  employee_id uuid not null references public.employees(id) on delete cascade,
  gueltig_ab  date not null default date '2026-01-01',
  gueltig_bis date,
  check (gueltig_bis is null or gueltig_bis >= gueltig_ab)
);
create index if not exists telefonie_nebenstellen_nst on public.telefonie_nebenstellen (nebenstelle);

alter table public.telefonie_nebenstellen enable row level security;
drop policy if exists staff_lesen  on public.telefonie_nebenstellen;
drop policy if exists admin_aendern on public.telefonie_nebenstellen;
create policy staff_lesen   on public.telefonie_nebenstellen for select to authenticated using (public.is_staff());
create policy admin_aendern on public.telefonie_nebenstellen for all    to authenticated
  using (public.board_role() = 'admin') with check (public.board_role() = 'admin');
revoke all on public.telefonie_nebenstellen from anon;

-- Die Zuordnung (Nebenstelle → Mitarbeiter) wurde am 25.11.2026 direkt in DEV und Live eingetragen,
-- Quelle: 3CX › Admin › Nutzer. Sie steht bewusst NICHT in dieser Datei (Repo ist öffentlich).
-- Neue Mitarbeiter: Eintrag mit gueltig_ab = Eintrittstag, z. B.
--   insert into public.telefonie_nebenstellen (nebenstelle, employee_id, gueltig_ab)
--   select '3xx', id, start_date from public.employees where name = '…';

commit;

-- Kontrolle: Zuordnungen und Namen, die nicht gefunden wurden
select t.nebenstelle, e.name, t.gueltig_ab, t.gueltig_bis from public.telefonie_nebenstellen t
  join public.employees e on e.id = t.employee_id order by t.nebenstelle;
