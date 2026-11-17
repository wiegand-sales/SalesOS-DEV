-- 42_person_funktion_standort.sql
-- Neuordnung Personen: je Person Funktion, Stufe und Standort. Diese drei Felder sind ab jetzt die Wahrheit;
-- die alte Position (role) berechnet das Board daraus und schreibt sie nur noch passend mit.
-- Übernahme des heutigen Stands (überschreibt nur leere Felder):
--   Board-Rolle Betrachter → keine Funktion (nur Betrachter)   · SR/SE → Sales Agent (Stufe SR/SE, MUC)
--   VLC → Sales Agent, Standort VLC (Stufe offen)              · SDL → SDL
--   SDC/SDM → Coach (Stufe SDC/SDM)                             · KAL → Peter Rode „Leitung“, Niklas Hojdem „Sales Ops“, sonst „Account Management“
-- Außerdem: Funktion, Stufe und Standort dürfen – wie Position, Team und Board-Rolle – nur Admins ändern.
-- In DEV und Live ausführen, mehrfach unbedenklich.

begin;

alter table public.employees add column if not exists funktion text;
alter table public.employees add column if not exists stufe text;
alter table public.employees add column if not exists standort text;

update public.employees set
  funktion = coalesce(funktion, case
     when board_role = 'viewer' then 'none'
     when role in ('SR','SE','VLC') then 'agent'
     when role = 'SDL' then 'sdl'
     when role in ('SDC','SDM','SC') then 'coach'
     when role = 'KAL' and lower(name) = 'peter rode' then 'leitung'
     when role = 'KAL' and lower(name) like 'niklas hojdem%' then 'salesops'
     when role = 'KAL' then 'am'
     else 'agent' end),
  stufe = coalesce(stufe, case when board_role = 'viewer' then null when role in ('SR','SE','SDC','SDM') then role when role = 'SC' then 'SDC' end),
  standort = coalesce(standort, case when role = 'VLC' then 'VLC' else 'MUC' end);

-- Schutz: nur Admins ändern Funktion, Stufe, Standort
create or replace function public.guard_person_fields() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.funktion is distinct from old.funktion or new.stufe is distinct from old.stufe or new.standort is distinct from old.standort)
     and coalesce(public.board_role(),'') <> 'admin' and auth.uid() is not null then
    raise exception 'Funktion, Stufe und Standort dürfen nur Admins ändern';
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_person_fields on public.employees;
create trigger trg_guard_person_fields before update on public.employees for each row execute function public.guard_person_fields();

commit;

select funktion, stufe, standort, count(*) as personen, string_agg(name, ', ' order by name) as namen
from public.employees where coalesce(active,true)
group by 1,2,3 order by 1,2,3;
