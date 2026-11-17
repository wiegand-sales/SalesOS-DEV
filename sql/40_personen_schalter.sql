-- 40_personen_schalter.sql
-- Zwei Schalter je Person in Einstellungen › Personen: „Im Urlaubskalender“ und „In Provision“.
-- Leer (null) = Standard nach Position (Agenten und Coaches im Kalender; Agenten und Coaches in der Provision).
-- In DEV und Live ausführen, mehrfach unbedenklich.
alter table public.employees add column if not exists im_kalender boolean;
alter table public.employees add column if not exists in_provision boolean;
select count(*) filter (where column_name in ('im_kalender','in_provision')) as spalten_angelegt
from information_schema.columns where table_schema='public' and table_name='employees';
