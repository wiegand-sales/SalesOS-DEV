-- 22_kalender_freistellung.sql  ·  Sales OS · Kalender
-- Neue Art „Freistellung“ (kostet keinen Urlaub). Kann mehrfach ausgeführt werden.
alter table public.absences drop constraint if exists absences_art_check;
alter table public.absences add constraint absences_art_check check (art in ('urlaub','flex','ausgleich','krank','freistellung'));

-- Team-Sicht: Freistellung wie Krank und Ausgleich nur als „abwesend“
create or replace function public.absences_team(p_von date, p_bis date)
returns table (employee_id uuid, art text, von date, bis date, halb boolean, status text)
language sql stable security definer set search_path = public as $$
  select a.employee_id,
         case when a.art in ('krank','ausgleich','freistellung') then 'abwesend'
              when a.art = 'flex' then 'urlaub' else a.art end,
         a.von, a.bis, a.halb, a.status
  from public.absences a
  where a.status in ('offen','genehmigt')
    and a.bis >= p_von and a.von <= p_bis
    and auth.uid() is not null
$$;
grant execute on function public.absences_team(date, date) to authenticated;
