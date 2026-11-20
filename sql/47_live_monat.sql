-- 47_live_monat.sql  ·  Sales OS · Live-Ansicht: Monatsansicht und CR Fokus
-- Erst im DEV-Projekt (kjlkneodyvfqgaukdjvb) ausführen, dann im Live-Projekt (nhudrbulfyampyyxhosv). Kann mehrfach ausgeführt werden.
-- Ändert nur die Abfrage live_daten (Fernseher), keine Tabellen und keine Daten:
--   · liefert Leistungsdaten ab dem 1. des Monats (für die Monatsansicht), mindestens die letzten 14 Tage
--   · liefert zusätzlich die Rohwerte für CR UPS und CR WKA (für „CR Fokus“ bei UPS-/WKA-Spezialisten)

create or replace function public.live_daten(p_key text, p_von date)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  k text;
  v_von date := greatest(coalesce(p_von, current_date - 7), least(current_date - 14, date_trunc('month', current_date)::date));
  v_bis date := current_date + 1;
  heute date := (now() at time zone 'Europe/Berlin')::date;
begin
  select value into k from public.settings where key = 'liveKey';
  if k is null or length(k) < 20 or p_key is null or p_key <> k then
    raise exception 'Kein Zugang' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'stand', (select value from public.settings where key = 'ftpLastSync'),
    'config', (select value from public.settings where key = 'liveConfig'),
    'phconfig', (select value from public.settings where key = 'powerHourConfig'),
    'mitarbeiter', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id, 'name', e.name, 'role', e.role, 'funktion', e.funktion, 'stufe', e.stufe,
        'standort', e.standort, 'work_hours', e.work_hours, 'is_pure_coach', e.is_pure_coach,
        'start_date', e.start_date, 'end_date', e.end_date)), '[]'::jsonb)
      from public.employees e where coalesce(e.active, true)),
    'leistung', (select coalesce(jsonb_agg(jsonb_build_object(
        'employee_id', p.employee_id, 'date', p.date,
        'oem_gesamt', p.oem_gesamt, 'oem_nicht_erfolgreich', p.oem_nicht_erfolgreich,
        'oem_tw', p.oem_tw, 'oem_yes', p.oem_yes, 'oem_sy', p.oem_sy, 'oem_my', p.oem_my,
        'ups_yes', p.ups_yes, 'wka_gesamt_yes', p.wka_gesamt_yes,
        'ups_gesamt', p.ups_gesamt, 'ups_nerf', p.ups_nicht_erfolgreich,
        'wo_gesamt', p.wka_oem_gesamt, 'wu_gesamt', p.wka_ups_gesamt,
        'wo_nerf', p.wka_oem_nicht_erfolgreich, 'wu_nerf', p.wka_ups_nicht_erfolgreich,
        'wo_beendet', p.wka_oem_beendet, 'wu_beendet', p.wka_ups_beendet,
        'marge', p.gesamt_margenerhoehung)), '[]'::jsonb)
      from public.performance p where p.date between v_von and v_bis),
    'abwesend', (select coalesce(jsonb_agg(jsonb_build_object(
        'employee_id', a.employee_id, 'von', a.von, 'bis', a.bis, 'halb', coalesce(a.halb, false),
        'krank', a.art = 'krank')), '[]'::jsonb)
      from public.absences a
      where a.von <= v_bis and a.bis >= current_date - 1
        and coalesce(a.status, 'genehmigt') not in ('abgelehnt', 'storniert', 'offen')
        and a.art <> 'verspaetung'),
    'ziele', (select coalesce(jsonb_agg(jsonb_build_object(
        'employee_id', z.employee_id, 'month', z.month,
        'opt_per_tag', z.opt_per_tag, 'marge_per_opt', z.marge_per_opt)), '[]'::jsonb)
      from public.zielvereinbarung z
      where z.month in (to_char(current_date - 1, 'YYYY-MM'), to_char(current_date + 1, 'YYYY-MM'))),
    'powerhours', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', h.id, 'datum', h.datum, 'start', to_char(h.start_zeit,'HH24:MI'), 'ende', to_char(h.end_zeit,'HH24:MI'), 'kpi', h.kpi)
        order by h.start_zeit), '[]'::jsonb)
      from public.power_hours h where h.datum = heute),
    'ticks', (select coalesce(jsonb_agg(jsonb_build_object(
        'e', t.employee_id, 'ts', t.ts, 'oem', t.d_oem, 'my', t.d_my, 'yes', t.d_yes, 'sy', t.d_sy, 'ni', t.d_nicht,
        'ups', t.d_ups, 'wka', t.d_wka, 'om', t.d_oem_marge, 'm', t.d_marge) order by t.ts), '[]'::jsonb)
      from public.performance_ticks t
      where t.date = heute and exists (select 1 from public.power_hours h where h.datum = heute))
  );
end $$;

revoke all on function public.live_daten(text, date) from public;
grant execute on function public.live_daten(text, date) to anon, authenticated;
