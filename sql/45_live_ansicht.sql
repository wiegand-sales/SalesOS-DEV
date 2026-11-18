-- 45_live_ansicht.sql  ·  Sales OS · Live-Ansicht für die Fernseher
-- Erst im DEV-Projekt (kjlkneodyvfqgaukdjvb) ausführen, Live erst nach Freigabe. Kann mehrfach ausgeführt werden.
-- Bestehende Tabellen und Daten werden nicht verändert.
--
-- Die Fernseher melden sich nicht an. Sie öffnen live.html mit einem geheimen Schlüssel in der Adresse (?k=…).
-- Diese Funktion gibt NUR mit dem richtigen Schlüssel Daten heraus, und nur das, was die Live-Ansicht zeigt:
--   · aktive Mitarbeiter: Name, Position, Standort, Arbeitszeiten (kein Gehalt, keine Provision, keine Notizen)
--   · Leistungszahlen der letzten Tage (Optimierungen, CR-Rohwerte, Margenerhöhung)
--   · wer heute abwesend ist (nur ob und ob halb, kein Grund)
--   · Tagesziel aus der Zielvereinbarung (Optimierungen je Tag, Marge je Optimierung)
-- Der Schlüssel liegt in settings (key = 'liveKey') und wird im Board unter „Live“ erzeugt bzw. erneuert.
-- Neuer Schlüssel = alte Adresse funktioniert sofort nicht mehr.

create extension if not exists pgcrypto;

-- Startschlüssel anlegen, falls noch keiner da ist (im Board jederzeit erneuerbar)
insert into public.settings (key, value)
select 'liveKey', encode(gen_random_bytes(18), 'hex')
where not exists (select 1 from public.settings where key = 'liveKey');

create or replace function public.live_daten(p_key text, p_von date)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  k text;
  v_von date := greatest(coalesce(p_von, current_date - 7), current_date - 14);
  v_bis date := current_date + 1;
begin
  select value into k from public.settings where key = 'liveKey';
  if k is null or length(k) < 20 or p_key is null or p_key <> k then
    raise exception 'Kein Zugang' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'stand', (select value from public.settings where key = 'ftpLastSync'),
    'config', (select value from public.settings where key = 'liveConfig'),
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
      where z.month in (to_char(current_date - 1, 'YYYY-MM'), to_char(current_date + 1, 'YYYY-MM')))
  );
end $$;

revoke all on function public.live_daten(text, date) from public;
grant execute on function public.live_daten(text, date) to anon, authenticated;

-- Kontrolle: Schlüssel vorhanden? (im Board unter „Live“ steht die fertige Adresse)
select key, left(value, 6) || '…' as schluessel_anfang from public.settings where key = 'liveKey';
