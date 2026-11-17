-- 42_person_funktion_standort.sql
-- Neuordnung Personen, Schritt 1: je Person Funktion, Stufe und Standort als eigene Felder.
-- Das bisherige Feld „role“ (Position) bleibt und wird vom Board automatisch passend gesetzt, damit alles weiterläuft.
-- Übernahme des heutigen Stands: SR/SE → Sales Agent (Stufe SR/SE, Olching) · VLC → Sales Agent, Valencia ·
-- SDL → SDL · SDC/SDM → Coach (Stufe SDC/SDM) · KAL → Peter Rode „Leitung“, Niklas Hojdem „Sales Ops“, sonst „Account Management“.
-- In DEV und Live ausführen, mehrfach unbedenklich (überschreibt nur leere Felder).
alter table public.employees add column if not exists funktion text;
alter table public.employees add column if not exists stufe text;
alter table public.employees add column if not exists standort text;

update public.employees set
  funktion = coalesce(funktion, case
     when role in ('SR','SE','VLC') then 'agent'
     when role = 'SDL' then 'sdl'
     when role in ('SDC','SDM') then 'coach'
     when role = 'KAL' and lower(name) = 'peter rode' then 'leitung'
     when role = 'KAL' and lower(name) like 'niklas hojdem%' then 'salesops'
     when role = 'KAL' then 'am'
     else 'agent' end),
  stufe = coalesce(stufe, case when role in ('SR','SE','SDC','SDM') then role end),
  standort = coalesce(standort, case when role = 'VLC' then 'VLC' else 'MUC' end);

select funktion, stufe, standort, count(*) as personen, string_agg(name, ', ' order by name) as namen
from public.employees where coalesce(active,true)
group by 1,2,3 order by 1,2,3;
