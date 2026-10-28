-- Coaching-Ansicht der Chrome-Erweiterung: Agents lesen NUR ihre eigenen Sessions,
-- und davon nur die freigegebenen Felder (Datum, Art, Status, Start/Stop/Continue, Thema, Ziel-KPI, Coach-Name).
-- Interne Coach-Notizen (Spalte note) und Bewertungen bleiben unsichtbar. An den Tabellenregeln aendert sich nichts.
create or replace function public.my_coaching()
returns table (date text, uhrzeit text, art text, status text, start_note text, stop_note text,
               continue_note text, focus text, focus_metric text, coach_name text)
language sql stable security definer set search_path = public as $$
  select p.date::text, p.uhrzeit::text, p.art::text, p.status::text,
         p.start_note::text, p.stop_note::text, p.continue_note::text,
         p.focus::text, p.focus_metric::text, c.name::text
  from public.protocols p
  left join public.employees c on c.id::text = p.coach_id::text
  where public.is_agent() and public.owns_employee(p.employee_id::text)
  order by p.date desc
  limit 30;
$$;
revoke all on function public.my_coaching() from public;
grant execute on function public.my_coaching() to authenticated;
