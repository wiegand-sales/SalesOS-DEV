-- 34_session_ausgefallen.sql
-- „Fand nicht statt“ markiert geplante Sessions als status = 'ausgefallen' (statt sie zu löschen).
-- Falls die Tabelle protocols eine Prüfung auf erlaubte Status-Werte hat, wird sie entfernt.
-- In DEV und Live ausführen, mehrfach unbedenklich.
do $$
declare c record;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.protocols'::regclass and contype = 'c'
             and pg_get_constraintdef(oid) ~* 'status'
  loop
    execute format('alter table public.protocols drop constraint %I', c.conname);
    raise notice 'Status-Prüfung entfernt: %', c.conname;
  end loop;
end $$;

-- Kontrolle: vorhandene Status-Werte
select coalesce(status,'(leer)') as status, count(*) as anzahl from public.protocols group by 1 order by 2 desc
