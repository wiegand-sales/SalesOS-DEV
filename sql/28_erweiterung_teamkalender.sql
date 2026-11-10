-- 28_erweiterung_teamkalender.sql  ·  Sales OS · Chrome-Erweiterung (Teamansicht beim Urlaubsantrag)
-- Erst im DEV-Projekt (kjlkneodyvfqgaukdjvb) ausführen, Live erst nach Freigabe. Kann mehrfach ausgeführt werden.
-- Bestehende Tabellen und Daten werden nicht verändert.
--
-- Agents sehen beim Urlaubsantrag, wer am eigenen Standort (Olching / Valencia) wann frei hat:
--   · nur Vorname + erster Buchstabe des Nachnamens (z. B. „Amir H.“)
--   · Urlaub und Flex Day als „Urlaub“, Krank, Ausgleichstag und Freistellung nur als „abwesend“ (kein Grund)
--   · beantragte und genehmigte Einträge, keine Notizen, max. 6 Wochen pro Abfrage
create or replace function public.my_team_kalender(p_von date, p_bis date)
returns table (name text, art text, von date, bis date, halb boolean, status text)
language sql stable security definer set search_path = public as $$
  with me as (
    select e.id, (e.role = 'VLC') as vlc from public.employees e
    where e.auth_user_id::text = auth.uid()::text limit 1
  )
  select split_part(o.name, ' ', 1) || coalesce(' ' || nullif(left(split_part(o.name, ' ', 2), 1), '') || '.', ''),
         case when a.art in ('urlaub','flex') then 'urlaub' else 'abwesend' end,
         a.von, a.bis, a.halb, a.status
  from public.absences a
  join public.employees o on o.id = a.employee_id
  cross join me
  where a.status in ('offen','genehmigt')
    and a.bis >= p_von and a.von <= least(p_bis, p_von + 42)
    and a.employee_id <> me.id
    and coalesce(o.active, true)
    and (o.role = 'VLC') = me.vlc
  order by 1, a.von;
$$;
revoke all on function public.my_team_kalender(date, date) from public;
grant execute on function public.my_team_kalender(date, date) to authenticated;

-- Kontrolle (im SQL-Editor leer, weil dort niemand angemeldet ist):
select * from public.my_team_kalender(current_date, current_date + 14);
