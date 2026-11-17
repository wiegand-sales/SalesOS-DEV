-- 43_board_rolle_kein_zugang.sql
-- Neue Zugangsstufe „Kein Zugang“ (board_role = 'none'): weder Board noch Erweiterung,
-- z. B. Account Management. Im Urlaubskalender erscheint die Person trotzdem, wenn der Schalter an ist.
-- In DEV und Live ausführen, mehrfach unbedenklich.
begin;
do $$
declare c record;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.employees'::regclass and contype = 'c'
             and pg_get_constraintdef(oid) ilike '%board_role%'
  loop
    execute format('alter table public.employees drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.employees add constraint employees_board_role_check
  check (board_role is null or board_role in ('admin','coach','viewer','agent','none'));
-- Account Management / Personen ohne Board ausdrücklich auf „Kein Zugang“ setzen
update public.employees set board_role = 'none'
where role = 'KAL' and board_role is null
  and lower(trim(name)) not in ('peter rode','niklas hojdem');
commit;
select name, role, board_role from public.employees where board_role = 'none' or role = 'KAL' order by name;
