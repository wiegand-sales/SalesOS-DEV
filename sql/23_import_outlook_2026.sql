-- 23_import_outlook_2026.sql  ·  Sales OS · Kalender
-- Übernimmt die Einträge aus dem Outlook-Kalender „Sales – Urlaubsplanung“ (Jan–Nov 2026) als genehmigt.
-- NUR in Live ausführen (Projekt nhudrbulfyampyyxhosv), nach 22_kalender_freistellung.sql.
-- Doppelte Einträge werden übersprungen, das Skript kann also gefahrlos noch einmal laufen.
-- Achtung: März–Juli (bis 26.07.) und September fehlen im Export und sind hier NICHT enthalten.
-- Zuordnung: genauer Name, sonst Name beginnt mit … (z. B. „John Schneider“ → „John Schneider-Mendoza“), sonst Vor- und Nachname ohne Groß/Klein.
-- Am Ende listet die Abfrage alle Namen, die nicht eindeutig zugeordnet werden konnten.

drop table if exists pg_temp.kal_imp_map;
drop table if exists pg_temp.kal_imp;
create temp table kal_imp(name text, art text, von date, bis date, halb boolean, notiz text);
insert into kal_imp values
('Evi Kunze','krank','2025-11-19','2026-01-02',false,'Import Outlook'),
('Amir Hazaimia','urlaub','2026-01-02','2026-01-02',false,'Import Outlook'),
('Daniel Grund','urlaub','2026-01-02','2026-01-02',false,'Import Outlook'),
('Melanie Murad','urlaub','2026-01-02','2026-01-02',false,'Import Outlook'),
('Niko Nikolic','urlaub','2026-01-02','2026-01-02',false,'Import Outlook'),
('Ramadan Alijaj','urlaub','2026-01-02','2026-01-02',false,'Import Outlook'),
('Thorsten Müller','urlaub','2026-01-02','2026-01-02',false,'Import Outlook'),
('Bianca Sachon','urlaub','2026-01-05','2026-01-09',false,'Import Outlook'),
('Daniel Grund','urlaub','2026-01-05','2026-01-05',true,'Import Outlook'),
('Evi Kunze','krank','2026-01-05','2026-01-15',false,'Import Outlook'),
('Francisca Baumgarten','krank','2026-01-05','2026-01-05',false,'Import Outlook'),
('Melanie Murad','krank','2026-01-05','2026-01-05',false,'Import Outlook'),
('Thorsten Müller','urlaub','2026-01-05','2026-01-05',false,'Import Outlook'),
('Thorsten Müller','urlaub','2026-01-07','2026-01-07',false,'Import Outlook'),
('Daniel Grund','flex','2026-01-12','2026-01-12',false,'Import Outlook'),
('Francesco Svezia','krank','2026-01-12','2026-01-14',false,'Import Outlook'),
('Bianca Sachon','urlaub','2026-01-13','2026-01-16',false,'Import Outlook'),
('Jenny Weise','krank','2026-01-13','2026-01-13',false,'Import Outlook'),
('Ramadan Alijaj','krank','2026-01-13','2026-01-13',false,'Import Outlook'),
('Jenny Weise','krank','2026-01-14','2026-01-14',false,'Import Outlook'),
('Melanie Murad','freistellung','2026-01-16','2026-01-16',false,'Import Outlook'),
('Bianca Sachon','krank','2026-01-19','2026-01-23',false,'Import Outlook'),
('Daniel Grund','krank','2026-01-19','2026-01-23',false,'Import Outlook'),
('Francesco Svezia','krank','2026-01-19','2026-01-19',false,'Import Outlook'),
('Francisca Baumgarten','krank','2026-01-19','2026-01-23',false,'Import Outlook'),
('Jenny Weise','krank','2026-01-19','2026-01-19',false,'Import Outlook'),
('Kevin Gutmann','krank','2026-01-19','2026-01-20',false,'Import Outlook'),
('Jenny Weise','urlaub','2026-01-20','2026-01-20',false,'Import Outlook'),
('Amir Hazaimia','krank','2026-01-22','2026-01-23',false,'Import Outlook'),
('Amir Hazaimia','krank','2026-01-26','2026-01-26',false,'Import Outlook'),
('Jenny Weise','krank','2026-01-26','2026-01-28',false,'Import Outlook · Kind krank'),
('Julia Ruhstorfer','krank','2026-01-27','2026-01-28',false,'Import Outlook'),
('Evi Kunze','urlaub','2026-01-28','2026-01-28',false,'Import Outlook'),
('Evi Kunze','krank','2026-01-29','2026-01-29',false,'Import Outlook'),
('Evi Kunze','urlaub','2026-01-30','2026-01-30',false,'Import Outlook'),
('Dogoro Dembele','urlaub','2026-02-02','2026-02-02',true,'Import Outlook'),
('Niko Nikolic','urlaub','2026-02-02','2026-02-06',false,'Import Outlook'),
('Dogoro Dembele','urlaub','2026-02-03','2026-02-03',true,'Import Outlook'),
('Dogoro Dembele','urlaub','2026-02-04','2026-02-04',true,'Import Outlook'),
('Jenny Weise','krank','2026-02-09','2026-02-09',false,'Import Outlook'),
('Daniel Grund','urlaub','2026-02-13','2026-02-13',false,'Import Outlook'),
('Melanie Murad','urlaub','2026-02-13','2026-02-13',true,'Import Outlook'),
('Daniel Grund','urlaub','2026-02-16','2026-02-28',false,'Import Outlook'),
('Kevin Gutmann','krank','2026-02-16','2026-02-18',false,'Import Outlook'),
('Evi Kunze','krank','2026-02-17','2026-02-20',false,'Import Outlook'),
('Amir Hazaimia','urlaub','2026-02-18','2026-02-18',false,'Import Outlook'),
('Jenny Weise','urlaub','2026-02-18','2026-02-20',false,'Import Outlook'),
('Melanie Murad','urlaub','2026-02-23','2026-02-25',false,'Import Outlook'),
('Niko Nikolic','krank','2026-02-23','2026-02-25',false,'Import Outlook'),
('Ramadan Alijaj','krank','2026-02-23','2026-02-27',false,'Import Outlook'),
('Dogoro Dembele','freistellung','2026-02-24','2026-02-26',false,'Import Outlook'),
('Evi Kunze','flex','2026-02-26','2026-02-27',false,'Import Outlook'),
('Amir Hazaimia','urlaub','2026-07-27','2026-08-06',false,'Import Outlook'),
('Kathrin Steiniger','krank','2026-07-27','2026-08-07',false,'Import Outlook'),
('Max Tschage','krank','2026-07-27','2026-08-07',false,'Import Outlook'),
('Niko Nikolic','urlaub','2026-07-31','2026-08-11',false,'Import Outlook'),
('Mia Piepenburg','urlaub','2026-08-03','2026-08-03',true,'Import Outlook'),
('Ricardo Weigert','krank','2026-08-03','2026-08-03',false,'Import Outlook'),
('Julius Kolbeck','krank','2026-08-06','2026-08-06',false,'Import Outlook'),
('Dogoro Dembele','urlaub','2026-08-07','2026-08-11',false,'Import Outlook'),
('Duygu Sulaiman','urlaub','2026-08-07','2026-08-07',false,'Import Outlook'),
('Duygu Sulaiman','urlaub','2026-08-10','2026-08-11',false,'Import Outlook'),
('Johann Breuer','urlaub','2026-08-10','2026-08-28',false,'Import Outlook'),
('Loris Barbarito','krank','2026-08-11','2026-08-11',false,'Import Outlook'),
('Niko Nikolic','krank','2026-08-12','2026-08-12',false,'Import Outlook'),
('Mia Piepenburg','urlaub','2026-08-17','2026-08-21',false,'Import Outlook'),
('Dogoro Dembele','urlaub','2026-08-18','2026-08-21',false,'Import Outlook'),
('Duygu Sulaiman','krank','2026-08-24','2026-08-24',false,'Import Outlook'),
('Julius Kolbeck','urlaub','2026-08-24','2026-08-28',false,'Import Outlook'),
('Melanie Murad','urlaub','2026-08-24','2026-08-26',false,'Import Outlook'),
('Melanie Murad','urlaub','2026-08-31','2026-09-01',false,'Import Outlook'),
('Ricardo Weigert','urlaub','2026-09-28','2026-10-09',false,'Import Outlook'),
('Abenezer Werku','krank','2026-09-30','2026-10-02',false,'Import Outlook'),
('Jan Klimmeck','krank','2026-10-01','2026-10-02',false,'Import Outlook'),
('John Schneider','krank','2026-10-02','2026-10-02',false,'Import Outlook'),
('Jan Klimmeck','krank','2026-10-05','2026-10-07',false,'Import Outlook'),
('Niko Nikolic','urlaub','2026-10-07','2026-10-07',false,'Import Outlook'),
('Beren Eskimez','krank','2026-10-08','2026-10-09',false,'Import Outlook'),
('Thorsten Müller','urlaub','2026-10-12','2026-10-16',false,'Import Outlook'),
('Bianca Sachon','krank','2026-10-20','2026-10-23',false,'Import Outlook'),
('Jan Klimmeck','urlaub','2026-10-20','2026-10-23',false,'Import Outlook'),
('Milan Buhsolo','krank','2026-10-20','2026-10-23',false,'Import Outlook'),
('Bianca Sachon','urlaub','2026-10-26','2026-10-30',false,'Import Outlook'),
('Danae Soto','krank','2026-10-26','2026-10-30',false,'Import Outlook · Kind krank'),
('Katharina Leitner','krank','2026-10-26','2026-10-26',false,'Import Outlook'),
('Kathrin Steiniger','krank','2026-10-28','2026-10-28',false,'Import Outlook'),
('Mia Piepenburg','krank','2026-10-28','2026-10-28',false,'Import Outlook'),
('Dogoro Dembele','urlaub','2026-10-29','2026-10-30',false,'Import Outlook'),
('Robin Ringlstetter','krank','2026-10-29','2026-10-30',false,'Import Outlook'),
('Roque dos Santos','krank','2026-11-03','2026-11-05',false,'Import Outlook'),
('John Schneider','urlaub','2026-11-05','2026-11-06',false,'Import Outlook'),
('Julius Kolbeck','krank','2026-11-05','2026-11-05',false,'Import Outlook'),
('Elqiuo Dos Santos','urlaub','2026-11-16','2026-11-16',false,'Import Outlook');

create temp table kal_imp_map as
select i.name, (select array_agg(e.id) from public.employees e
  where lower(trim(e.name))=lower(trim(i.name))
     or lower(e.name) like lower(trim(i.name))||'%'
     or (lower(e.name) like split_part(lower(trim(i.name)),' ',1)||' %' and lower(e.name) like '%'||split_part(lower(trim(i.name)),' ',array_length(string_to_array(trim(i.name),' '),1)))) as ids
from (select distinct name from kal_imp) i;

insert into public.absences (employee_id, art, von, bis, halb, halb_teil, status, notiz, eingereicht_am, eingereicht_von, entschieden_von, entschieden_am)
select m.ids[1], i.art, i.von, i.bis, i.halb, case when i.halb then 'vm' end, 'genehmigt', i.notiz, i.von::timestamptz, 'Import Outlook', 'Import Outlook', now()
from kal_imp i join kal_imp_map m on m.name=i.name
where array_length(m.ids,1)=1
  and not exists (select 1 from public.absences a where a.employee_id=m.ids[1] and a.art=i.art and a.von=i.von and a.bis=i.bis);

select name as "nicht zugeordnet", coalesce(array_length(ids,1),0) as treffer,
       (select count(*) from kal_imp i where i.name=m.name) as eintraege
from kal_imp_map m where coalesce(array_length(ids,1),0)<>1 order by name;
