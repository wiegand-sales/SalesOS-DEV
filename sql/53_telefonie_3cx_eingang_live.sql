-- 53_telefonie_3cx_eingang_live.sql  ·  Sales OS · Eingang für die 3CX-Anrufdaten
-- NUR im Live-Projekt (nhudrbulfyampyyxhosv) ausführen. DEV bekommt später nur fertige Tageszahlen ohne Rufnummern.
-- Grund: Die 3CX überträgt ihren ganzen Verlauf (Millionen Zeilen); das passt nicht in den kostenlosen DEV-Tarif.
--
-- Aufbau:
--   · Eigene Datenbank telefonie_3cx: Nur dort schreibt die 3CX (fest in public.cdroutput / public.cdrbilling).
--     Die Supabase-API kennt nur die Datenbank postgres – das Board kommt an telefonie_3cx nicht heran.
--   · Login threecx_writer: gehört nur diese Datenbank, sonst keine Rechte.
--   · Bereich telefonie in postgres (gesperrt, nicht über die API): Schlüssel für Rufnummern-Codes, später die
--     aufbereiteten Anrufe ohne Klarnummer.
--   · Spalte employees.nebenstelle.
--
-- Das Passwort steht NICHT in dieser Datei.
-- In VIER Teilen ausführen (CREATE DATABASE darf nicht mit anderen Befehlen zusammen laufen).

-- =====================  TEIL 1  (zusammen ausführen)  =====================
begin;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'threecx_writer') then
    create role threecx_writer login noinherit connection limit 5;
  end if;
end $$;
alter role threecx_writer connection limit 5;
alter role threecx_writer set statement_timeout = '10min';
grant threecx_writer to postgres;     -- postgres darf die 3CX-Datenbank verwalten und lesen (nicht umgekehrt)

create schema if not exists telefonie;
revoke all on schema telefonie from public, anon, authenticated, threecx_writer;

create table if not exists telefonie.geheimnis (
  id         int primary key default 1 check (id = 1),
  schluessel bytea not null default gen_random_bytes(32),
  angelegt   timestamptz not null default now()
);
insert into telefonie.geheimnis (id) values (1) on conflict (id) do nothing;
alter table telefonie.geheimnis enable row level security;
revoke all on telefonie.geheimnis from public, anon, authenticated, threecx_writer;

alter table public.employees add column if not exists nebenstelle text;
alter table public.employees drop constraint if exists employees_nebenstelle_format;
alter table public.employees add constraint employees_nebenstelle_format
  check (nebenstelle is null or nebenstelle ~ '^[0-9]{2,6}$');
create unique index if not exists employees_nebenstelle_eindeutig
  on public.employees (nebenstelle) where nebenstelle is not null;

commit;

-- =====================  TEIL 2  (allein ausführen)  =====================
-- create database telefonie_3cx owner threecx_writer;

-- =====================  TEIL 3  (zusammen ausführen)  =====================
-- revoke connect on database telefonie_3cx from public;
-- grant  connect on database telefonie_3cx to threecx_writer;

-- =====================  TEIL 4  (allein, NICHT speichern)  =====================
-- alter role threecx_writer password 'LANGES-PASSWORT-NUR-BUCHSTABEN-UND-ZIFFERN';

-- =====================  KONTROLLE  =====================
-- select rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls, rolconnlimit
--   from pg_roles where rolname = 'threecx_writer';
-- select datname, pg_get_userbyid(datdba) as besitzer, has_database_privilege('anon', datname, 'CONNECT') as anon_darf
--   from pg_database where datname = 'telefonie_3cx';
-- select r.rolname, has_schema_privilege(r.oid, 'telefonie', 'USAGE') as benutzen
--   from pg_roles r where r.rolname in ('anon','authenticated','threecx_writer');
