-- 49_solidroad_entfernen.sql  ·  Sales OS · SolidRoad aus der Datenbank entfernen
-- SolidRoad wird nicht mehr verwendet; das Board liest und schreibt diese Tabellen seit 23.11.2026 nicht mehr.
-- Erst im DEV-Projekt (kjlkneodyvfqgaukdjvb), dann im Live-Projekt (nhudrbulfyampyyxhosv) ausführen.
-- Kann mehrfach ausgeführt werden.
--
-- ACHTUNG: Löscht endgültig
--   · solidroad_simulations  (alle erfassten SolidRoad-Simulationen)
--   · admin_secrets          (enthielt nur den SolidRoad-API-Key und die Organisations-ID)
-- Wer die Simulationen aufheben will: vorher in Supabase › Table Editor › solidroad_simulations › Export als CSV sichern.
--
-- Bewusst ohne CASCADE: Hängt noch etwas an den Tabellen (z. B. eine Ansicht), bricht das Skript ab, statt es mitzulöschen.

-- Vorher: was wird gelöscht?
select 'solidroad_simulations' as tabelle, count(*) as zeilen from public.solidroad_simulations
union all
select 'admin_secrets', count(*) from public.admin_secrets;

begin;
drop table if exists public.solidroad_simulations;
drop table if exists public.admin_secrets;
commit;

-- Kontrolle: beide Tabellen sind weg (erwartet: keine Zeile)
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('solidroad_simulations', 'admin_secrets');
