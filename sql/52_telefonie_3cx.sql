-- 52_telefonie_3cx.sql  ·  Sales OS · Sicherer Bereich für die Anrufdaten aus der 3CX
-- NUR DEV (am 24.11.2026 ausgeführt). Für Live NICHT verwenden, dort gilt 53_telefonie_3cx_eingang_live.sql.
-- Erkenntnis aus dem Test: Die 3CX schreibt fest nach public.cdroutput und braucht deshalb eine eigene Datenbank;
-- telefonie_roh bleibt leer. Der 3CX-Login wurde in DEV danach wieder gesperrt (password null).
-- Kann mehrfach ausgeführt werden. Ändert keine bestehenden Daten.
--
-- Was passiert:
--   1. Bereich telefonie_roh: Hier schreibt die 3CX (Datenkonnektor) ihre Anrufliste hinein.
--   2. Bereich telefonie:     Hier liegen später die aufbereiteten Anrufe (ohne Klarnummer) und der Schlüssel.
--      Beide Bereiche sind für das Board (anon/authenticated) gesperrt und nicht über die API erreichbar.
--   3. Login threecx_writer: darf NUR in telefonie_roh Tabellen anlegen und schreiben – sonst nichts.
--      Das Passwort steht NICHT in dieser Datei. Peter setzt es danach selbst im SQL-Editor (siehe unten).
--   4. Geheimer Schlüssel für die Rufnummern-Codes (HMAC), nur für die Datenbank selbst lesbar.
--   5. Neue Spalte employees.nebenstelle (3CX-Nebenstelle des Mitarbeiters, z. B. '348').

begin;

create extension if not exists pgcrypto;

-- 1) + 2) Bereiche ------------------------------------------------------------
create schema if not exists telefonie_roh;
create schema if not exists telefonie;

revoke all on schema telefonie_roh from public, anon, authenticated;
revoke all on schema telefonie     from public, anon, authenticated;
revoke all on all tables in schema telefonie_roh from public, anon, authenticated;
revoke all on all tables in schema telefonie     from public, anon, authenticated;

-- 3) Login nur für die 3CX ----------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'threecx_writer') then
    -- ohne Passwort angelegt: Anmelden geht erst, wenn Peter das Passwort setzt
    -- ohne SUPERUSER/BYPASSRLS/REPLICATION/CREATEDB/CREATEROLE: das ist der Standard (Kontrolle 1 prüft es)
    create role threecx_writer login noinherit connection limit 5;
  end if;
end $$;

alter role threecx_writer set search_path = telefonie_roh;   -- 3CX legt ihre Tabellen dadurch in telefonie_roh an
alter role threecx_writer set statement_timeout = '5min';

grant usage, create on schema telefonie_roh to threecx_writer;
-- Die 3CX legt beim Übertragen selbst einen eigenen Bereich an (CREATE SCHEMA IF NOT EXISTS …) und braucht dafür
-- das Recht, Bereiche anzulegen. Neue Bereiche gehören dann threecx_writer, sind nicht über die API freigegeben,
-- und an bestehende Bereiche (public usw.) kommt der Login dadurch nicht heran. (Fehler 42501 beim 1. Versuch, 24.11.2026)
grant create on database postgres to threecx_writer;
-- Die Datenbank-Verwaltung (postgres) darf die 3CX-Tabellen später lesen und alte Zeilen löschen.
-- (Nur in diese Richtung: threecx_writer bekommt dadurch keine Rechte von postgres.)
grant threecx_writer to postgres;
revoke all on schema telefonie from threecx_writer;
revoke create on schema public from threecx_writer;

-- Tabellen, die die 3CX in telefonie_roh anlegt, gehören threecx_writer allein; anon/authenticated
-- haben schon keinen Zutritt zum Bereich (siehe oben), damit kommen sie an keine Tabelle darin.

-- 4) Geheimer Schlüssel für Rufnummern-Codes -------------------------------------
create table if not exists telefonie.geheimnis (
  id         int primary key default 1 check (id = 1),
  schluessel bytea not null default gen_random_bytes(32),
  angelegt   timestamptz not null default now()
);
insert into telefonie.geheimnis (id) values (1) on conflict (id) do nothing;
alter table telefonie.geheimnis enable row level security;   -- keine Regel = niemand außer der Datenbank selbst
revoke all on telefonie.geheimnis from public, anon, authenticated, threecx_writer;

-- 5) Nebenstelle je Mitarbeiter -------------------------------------------------
alter table public.employees add column if not exists nebenstelle text;
alter table public.employees drop constraint if exists employees_nebenstelle_format;
alter table public.employees add constraint employees_nebenstelle_format
  check (nebenstelle is null or nebenstelle ~ '^[0-9]{2,6}$');
create unique index if not exists employees_nebenstelle_eindeutig
  on public.employees (nebenstelle) where nebenstelle is not null;

commit;

-- ---------------------------------------------------------------------------
-- DANACH (einzeln, nur im SQL-Editor, NICHT in dieser Datei speichern):
--   alter role threecx_writer password 'HIER-EIN-LANGES-ZUFALLSPASSWORT';
-- Dasselbe Passwort trägst du in der 3CX beim Datenkonnektor ein.
-- In der 3CX als Nutzername:  threecx_writer.kjlkneodyvfqgaukdjvb   (Pooler-Schreibweise)
-- ---------------------------------------------------------------------------

-- Kontrolle 1: Rechte des 3CX-Logins (alles muss false sein, außer rolcanlogin)
select rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls, rolconnlimit
from pg_roles where rolname = 'threecx_writer';

-- Kontrolle 2: Wer darf die beiden Bereiche benutzen? (anon/authenticated dürfen nicht vorkommen)
select n.nspname as bereich, r.rolname as rolle,
       has_schema_privilege(r.oid, n.oid, 'USAGE')  as benutzen,
       has_schema_privilege(r.oid, n.oid, 'CREATE') as anlegen
from pg_namespace n cross join pg_roles r
where n.nspname in ('telefonie_roh', 'telefonie')
  and r.rolname in ('anon', 'authenticated', 'threecx_writer')
order by 1, 2;

-- Kontrolle 3: Schlüssel vorhanden (zeigt nur die Länge, nicht den Schlüssel)
select octet_length(schluessel) as schluessel_bytes from telefonie.geheimnis;
