-- 39_kalender_personen.sql  ·  Sales OS · Kalender
-- Legt Peter Rode, Niklas Hojdem, Mia Piepenburg und Ricardo Weigert mit der Position „Nur Kalender“ (role 'KAL') an –
-- Olching, Vollzeit Mo–Fr (Standard-Arbeitszeit), Standard-Urlaubsanspruch. Sie erscheinen nur in Kalender,
-- Team-Ansicht und Urlaubskonto, nicht in Performance, Provision, QA oder Aufgaben.
-- Gibt es eine Person mit dem Namen schon, wird sie nicht doppelt angelegt.
-- Danach werden ihre Urlaube aus den Outlook-Exporten Dezember 2026 / Januar 2027 eingetragen (Überschneidungen werden übersprungen).
-- In DEV und Live ausführen (in DEV nur, wenn du dort testen willst). Mehrfach unbedenklich.

begin;

insert into public.employees (name, role, phase, team, contract, hours, active, color_index)
select v.name, 'KAL', 'Aktiv', 'Deutschland', 'full', 40, true, 0
from (values ('Peter Rode'), ('Niklas Hojdem'), ('Mia Piepenburg'), ('Ricardo Weigert')) v(name)
where not exists (select 1 from public.employees e where lower(trim(e.name)) = lower(v.name));

drop table if exists pg_temp.kal_imp;
create temp table kal_imp(name text, art text, von date, bis date, notiz text);
insert into kal_imp values
('Peter Rode','urlaub','2026-12-28','2026-12-30','Import Outlook'),
('Niklas Hojdem','urlaub','2026-12-10','2026-12-11','Import Outlook'),
('Niklas Hojdem','urlaub','2026-12-21','2026-12-23','Import Outlook'),
('Mia Piepenburg','urlaub','2026-12-28','2026-12-30','Import Outlook'),
('Mia Piepenburg','urlaub','2027-01-04','2027-01-05','Import Outlook Jan'),
('Ricardo Weigert','urlaub','2026-12-17','2026-12-23','Import Outlook');

insert into public.absences (employee_id, art, von, bis, halb, status, notiz, eingereicht_am, eingereicht_von, entschieden_von, entschieden_am)
select e.id, i.art, i.von, i.bis, false, 'genehmigt', i.notiz, now(), 'Import Outlook', 'Import Outlook', now()
from kal_imp i join public.employees e on lower(trim(e.name)) = lower(i.name)
where not exists (select 1 from public.absences a
                  where a.employee_id = e.id and a.art in ('urlaub','flex') and a.status in ('offen','genehmigt')
                    and a.von <= i.bis and a.bis >= i.von);

commit;

-- Kontrolle: Person, Position, aktiv, Anzahl Urlaube Dez/Jan
select e.name, e.role, e.active, e.is_pure_coach,
       (select count(*) from public.absences a where a.employee_id = e.id and a.bis >= '2026-12-01' and a.von <= '2027-01-31') as urlaube_dez_jan
from public.employees e
where lower(e.name) in ('peter rode','niklas hojdem','mia piepenburg','ricardo weigert','dogoro dembele','kathrin steininger')
order by e.name;
