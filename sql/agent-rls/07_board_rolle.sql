-- Sales OS · Board-Rolle pro Mitarbeiter
-- Leer (NULL) = Rolle ergibt sich wie bisher aus der Position (SC/SDM = Coach, sonst Sales Agent).
-- Einmal im DEV- und im Live-Projekt ausführen. Es ändert sich für niemanden etwas, bis eine Rolle bewusst gesetzt wird.
alter table public.employees add column if not exists board_role text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'employees_board_role_check') then
    alter table public.employees add constraint employees_board_role_check check (board_role is null or board_role in ('admin','coach','viewer','agent'));
  end if;
end $$;
select count(*) as mitarbeiter, count(board_role) as mit_gesetzter_rolle from public.employees;
