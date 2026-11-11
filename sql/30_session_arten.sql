-- 30_session_arten.sql
-- Neue Session-Struktur (Nov 2026): Was = Coaching · Performance · Training, Wie = Art.
-- Alte Schreibweisen werden auf die neuen Arten umgeschlüsselt. Alle anderen alten Arten bleiben unverändert
-- (z. B. Motivation, Kick-off, Gruppencoaching) und werden im Board nur einer Kategorie zugeordnet.
-- Sicherung: backup_20261111_protocols_art (id, art), über die App nicht abrufbar.
-- Erst in DEV ausführen, dann in Live beim Livegang.

begin;

create table if not exists public.backup_20261111_protocols_art as
  select id, art, now() as gesichert_am from public.protocols;
alter table public.backup_20261111_protocols_art enable row level security;
revoke all on public.backup_20261111_protocols_art from anon, authenticated;

update public.protocols set art = 'Einzelcoaching'          where art = '1:1 Coaching';
update public.protocols set art = 'Call Shadowing (Aktiv)'  where art = 'Call Shadowing Aktiv';
update public.protocols set art = 'Call Shadowing (Passiv)' where art = 'Call Shadowing Passiv';
update public.protocols set art = 'Weekly'                  where art = 'KPI Review';
update public.protocols set art = 'Performance-Gespräch'    where art = 'Performance Review';

commit;

-- Kontrolle
select coalesce(art, '(leer)') as art, count(*) as anzahl
from public.protocols
group by 1
order by 2 desc
