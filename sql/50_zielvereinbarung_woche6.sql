-- 50_zielvereinbarung_woche6.sql  ·  Sales OS · 6. Kalenderwoche in der Zielvereinbarung (Review C1)
-- Monate mit 6 angeschnittenen KW (z. B. November 2026: KW 49 = 30.11.) verloren bisher die letzte Woche,
-- weil nur week1–week5 gespeichert wurden.
-- Erst im DEV-Projekt (kjlkneodyvfqgaukdjvb), dann im Live-Projekt (nhudrbulfyampyyxhosv) ausführen.
-- Kann mehrfach ausgeführt werden. Das Board schreibt week6 erst, sobald die Spalte existiert.

alter table public.zielvereinbarung add column if not exists week6 numeric;

-- Kontrolle: Spalte vorhanden?
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'zielvereinbarung' and column_name like 'week%'
order by column_name;
