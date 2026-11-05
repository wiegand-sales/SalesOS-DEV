-- Sales OS · Rechteprüfung schneller machen (Ladezeit nach dem Login)
-- Problem: Die Datenbank hat is_staff(), is_editor(), board_role(), can_write() … für JEDE einzelne Zeile neu
--          ausgerechnet (bei der Performance-Tabelle tausendfach). Das hat das Laden des Boards um Sekunden verzögert.
-- Lösung:  Jede dieser Prüfungen wird in (select …) eingepackt. Dann rechnet Postgres sie nur EINMAL pro Abfrage.
--          Wer was sehen und ändern darf, bleibt exakt gleich – nur die Schreibweise der Regeln ändert sich.
-- Kann gefahrlos mehrfach ausgeführt werden. Erst DEV, dann Live.
begin;

do $$
declare
  r record;
  fn text := '(public\.)?(is_staff|is_editor|is_agent|board_role|can_edit_history)\(\)';
  q text; c text;
begin
  for r in select tablename, policyname, qual, with_check from pg_policies where schemaname = 'public' loop
    q := r.qual; c := r.with_check;
    -- bereits eingepackte Aufrufe nicht noch einmal einpacken
    if q is not null and q !~ 'SELECT (public\.)?(is_staff|is_editor|is_agent|board_role|can_edit_history|can_write)\(' then
      q := regexp_replace(q, fn, '(SELECT public.\2())', 'g');
      q := regexp_replace(q, '(public\.)?can_write\(''(\w+)''::text\)', '(SELECT public.can_write(''\2''::text))', 'g');
      execute format('alter policy %I on public.%I using (%s)', r.policyname, r.tablename, q);
    end if;
    if c is not null and c !~ 'SELECT (public\.)?(is_staff|is_editor|is_agent|board_role|can_edit_history|can_write)\(' then
      c := regexp_replace(c, fn, '(SELECT public.\2())', 'g');
      c := regexp_replace(c, '(public\.)?can_write\(''(\w+)''::text\)', '(SELECT public.can_write(''\2''::text))', 'g');
      execute format('alter policy %I on public.%I with check (%s)', r.policyname, r.tablename, c);
    end if;
  end loop;
end $$;

commit;

-- Kontrolle: Hier sollte nichts mehr auftauchen (leeres Ergebnis = alle Regeln umgestellt)
select tablename, policyname from pg_policies
where schemaname = 'public'
  and (coalesce(qual,'') || ' ' || coalesce(with_check,'')) ~ '(is_staff|is_editor|is_agent|board_role|can_edit_history|can_write)\('
  and (coalesce(qual,'') || ' ' || coalesce(with_check,'')) !~ 'SELECT (public\.)?(is_staff|is_editor|is_agent|board_role|can_edit_history|can_write)\(';
