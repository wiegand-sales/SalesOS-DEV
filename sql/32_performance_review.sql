-- 32_performance_review.sql
-- Einheitlicher Name: Session-Art „Performance Review“ (statt „Performance-Gespräch“).
-- Sicherung: backup_20261112_protocols_art (id, art). In DEV und Live ausführen, mehrfach unbedenklich.

begin;

create table if not exists public.backup_20261112_protocols_art as
  select id, art, now() as gesichert_am from public.protocols where art = 'Performance-Gespräch';
alter table public.backup_20261112_protocols_art enable row level security;
revoke all on public.backup_20261112_protocols_art from anon, authenticated;

update public.protocols set art = 'Performance Review' where art = 'Performance-Gespräch';

commit;

select coalesce(art, '(leer)') as art, count(*) as anzahl
from public.protocols
where art ilike 'performance%'
group by 1
order by 2 desc
