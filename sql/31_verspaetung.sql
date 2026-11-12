-- 31_verspaetung.sql
-- Verspätungen im Kalender: neue Art 'verspaetung' mit Minuten.
-- Sichtbar nur für Admins und Coaches (is_editor). Agents sehen ihre eigenen Verspätungen nicht,
-- Betrachter und die Teamansichten der Erweiterung bekommen sie nicht und zählen sie nicht als „frei“.
-- In DEV und Live ausführen. Mehrfaches Ausführen ist unbedenklich.

begin;

alter table public.absences drop constraint if exists absences_art_check;
alter table public.absences add constraint absences_art_check
  check (art in ('urlaub','flex','ausgleich','krank','freistellung','verspaetung'));

alter table public.absences add column if not exists minuten int;
alter table public.absences drop constraint if exists absences_minuten_check;
alter table public.absences add constraint absences_minuten_check
  check (minuten is null or (minuten between 1 and 600));

-- Lesen: Admins/Coaches alles, Agents nur eigene Einträge ohne Verspätungen
drop policy if exists abs_select on public.absences;
create policy abs_select on public.absences for select
  using ( (select public.is_editor()) or (employee_id = (select public.my_employee_id()) and art <> 'verspaetung') );

-- Teamansicht im Board für Betrachter: ohne Verspätungen
create or replace function public.absences_team(p_von date, p_bis date)
returns table (employee_id uuid, art text, von date, bis date, halb boolean, status text)
language sql stable security definer set search_path = public as $$
  select a.employee_id,
         case when a.art in ('krank','ausgleich','freistellung') then 'abwesend'
              when a.art = 'flex' then 'urlaub' else a.art end,
         a.von, a.bis, a.halb, a.status
  from public.absences a
  where a.status in ('offen','genehmigt')
    and a.art <> 'verspaetung'
    and a.bis >= p_von and a.von <= p_bis
    and auth.uid() is not null
$$;
grant execute on function public.absences_team(date, date) to authenticated;

-- Erweiterung: „wie viele frei“ ohne Verspätungen
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
    on a.status in ('offen','genehmigt') and a.art <> 'verspaetung'
   and a.von <= t.tag and a.bis >= t.tag and a.employee_id <> me.id
   and exists (select 1 from public.employees o
               where o.id = a.employee_id and coalesce(o.active, true)
                 and (o.role = 'VLC') = me.vlc)
  group by t.tag
  order by t.tag;
$$;
revoke all on function public.my_team_frei(date, date) from public;
grant execute on function public.my_team_frei(date, date) to authenticated;

-- Erweiterung: Teamkalender ohne Verspätungen
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
    and a.art <> 'verspaetung'
    and a.bis >= p_von and a.von <= least(p_bis, p_von + 42)
    and a.employee_id <> me.id
    and coalesce(o.active, true)
    and (o.role = 'VLC') = me.vlc
  order by 1, a.von;
$$;
revoke all on function public.my_team_kalender(date, date) from public;
grant execute on function public.my_team_kalender(date, date) to authenticated;

commit;

-- Kontrolle: Spalte da, Art erlaubt
select (select count(*) from information_schema.columns where table_schema='public' and table_name='absences' and column_name='minuten') as spalte_minuten,
       (select pg_get_constraintdef(oid) from pg_constraint where conname='absences_art_check') as erlaubte_arten
