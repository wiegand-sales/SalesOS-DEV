-- 27_erweiterung_urlaub_termine.sql  ·  Sales OS · Chrome-Erweiterung (Urlaub und Termine für Agents)
-- Erst im DEV-Projekt (kjlkneodyvfqgaukdjvb) ausführen, Live erst nach Freigabe. Kann mehrfach ausgeführt werden.
-- Bestehende Tabellen und Daten werden nicht verändert.
--
-- Was schon da ist (20_kalender_abwesenheiten.sql): Agents lesen ihre eigenen Abwesenheiten,
-- dürfen Urlaub/Flex Day mit Status „offen“ beantragen und eigene offene Anträge zurückziehen.
-- Neu:
--   1. Agents lesen aus den Einstellungen zusätzlich die Kalender-Regeln (Grenze „max. x frei je Standort“).
--   2. my_team_frei(): je Tag nur die ANZAHL anderer Abwesender am eigenen Standort – keine Namen, keine Gründe.

begin;

-- 1) Einstellungen: Sync-Zeitpunkt (wie bisher) und Kalender-Regeln
drop policy if exists agent_select_sync on public.settings;
create policy agent_select_sync on public.settings for select to authenticated
  using ( (select public.is_agent()) and key in ('ftpLastSync','kalenderRules') );

-- 2) Wie viele andere sind an diesen Tagen am eigenen Standort (Olching / Valencia) abwesend?
create or replace function public.my_team_frei(p_von date, p_bis date)
returns table (tag date, anzahl int)
language sql stable security definer set search_path = public as $$
  with me as (
    select e.id, (e.role = 'VLC') as vlc from public.employees e
    where e.auth_user_id::text = auth.uid()::text limit 1
  ), tage as (
    select d::date as tag from generate_series(p_von, least(p_bis, p_von + 92), interval '1 day') d
    where extract(isodow from d) < 6
  )
  select t.tag, count(distinct a.employee_id)::int
  from tage t
  cross join me
  left join public.absences a
    on a.status in ('offen','genehmigt') and a.von <= t.tag and a.bis >= t.tag and a.employee_id <> me.id
   and exists (select 1 from public.employees o
               where o.id = a.employee_id and coalesce(o.active, true)
                 and (o.role = 'VLC') = me.vlc)
  group by t.tag
  order by t.tag;
$$;
revoke all on function public.my_team_frei(date, date) from public;
grant execute on function public.my_team_frei(date, date) to authenticated;

commit;

-- Kontrolle (im SQL-Editor leer, weil dort niemand angemeldet ist):
select * from public.my_team_frei(current_date, current_date + 7);
