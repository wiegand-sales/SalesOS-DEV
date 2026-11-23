-- 48_sicherheit.sql  ·  Sales OS · Sicherheits-Paket aus dem Code-Review vom 23.11.2026
-- Erst im DEV-Projekt (kjlkneodyvfqgaukdjvb) ausführen und testen, dann im Live-Projekt (nhudrbulfyampyyxhosv).
-- Kann mehrfach ausgeführt werden. Ändert keine Daten, nur Regeln und Funktionen.
--
--   1. SolidRoad-Zugangsdaten (admin_secrets): lesen und schreiben nur noch Admins
--   2. Nur Admins dürfen „reiner Coach“ (is_pure_coach) und die Login-Verknüpfung (auth_user_id) ändern
--      → verhindert, dass ein Coach einen Agent zum Coach macht (und der dann alle Gehälter sieht)
--   3. „Kein Zugang“ (board_role = 'none') zählt nicht mehr als Agent (keine Erweiterung, keine eigenen Daten)
--   4. Namen von Mitarbeitern und Benutzern dürfen keine Zeichen < > " enthalten (Schutz vor eingeschleustem Code)
--   5. Fernseher-Abfrage live_daten liefert kein Krank-Kennzeichen mehr (Gesundheitsdaten)

begin;

-- 0) Vorher-Prüfung: Gibt es Namen mit < > " ? Dann bricht Schritt 4 ab – Namen zuerst im Board korrigieren.
do $$
declare n int;
begin
  select count(*) into n from public.employees where name ~ '[<>"]';
  if n > 0 then raise exception 'Abbruch: % Mitarbeiter-Name(n) enthalten < > oder " – bitte zuerst korrigieren', n; end if;
  select count(*) into n from public.app_users where name ~ '[<>"]';
  if n > 0 then raise exception 'Abbruch: % Benutzer-Name(n) enthalten < > oder " – bitte zuerst korrigieren', n; end if;
end $$;

-- 1) admin_secrets nur für Admins -------------------------------------------
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'admin_secrets' loop
    execute format('drop policy %I on public.admin_secrets', p.policyname);
  end loop;
end $$;
alter table public.admin_secrets enable row level security;
create policy admin_only on public.admin_secrets for all to authenticated
  using (public.board_role() = 'admin') with check (public.board_role() = 'admin');

-- 2) Schutz-Trigger erweitern: is_pure_coach und auth_user_id nur durch Admins --------
--    (SQL-Editor, Daten-Sync und die Funktion agent-login laufen ohne Login und bleiben erlaubt)
create or replace function public.guard_employee_admin_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.board_role() = 'admin' then return new; end if;
  if tg_op = 'INSERT' then
    if new.role = 'SDL' or coalesce(new.sdl_team, '[]'::jsonb) <> '[]'::jsonb or new.board_role is not null
       or coalesce(new.is_pure_coach, false) or new.auth_user_id is not null then
      raise exception 'Position SDL, Team, Board-Rolle, „reiner Coach“ und Login darf nur ein Admin vergeben';
    end if;
  elsif new.role is distinct from old.role
     or coalesce(new.sdl_team, '[]'::jsonb) is distinct from coalesce(old.sdl_team, '[]'::jsonb)
     or new.board_role is distinct from old.board_role
     or coalesce(new.is_pure_coach, false) is distinct from coalesce(old.is_pure_coach, false)
     or new.auth_user_id::text is distinct from old.auth_user_id::text then
    raise exception 'Position, Team, Board-Rolle, „reiner Coach“ und Login darf nur ein Admin ändern';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_employee_admin_fields on public.employees;
create trigger guard_employee_admin_fields before insert or update on public.employees
  for each row execute function public.guard_employee_admin_fields();

-- 3) Agent = Board-Rolle „agent“ (schließt „Kein Zugang“ aus) ------------------
create or replace function public.is_agent() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.board_role() = 'agent', false);
$$;
revoke all on function public.is_agent() from public;
grant execute on function public.is_agent() to authenticated;

-- 4) Namen ohne < > " ----------------------------------------------------------
alter table public.employees drop constraint if exists employees_name_sicher;
alter table public.employees add constraint employees_name_sicher check (name is null or name !~ '[<>"]');
alter table public.app_users drop constraint if exists app_users_name_sicher;
alter table public.app_users add constraint app_users_name_sicher check (name is null or name !~ '[<>"]');

-- 5) live_daten ohne Krank-Kennzeichen (sonst identisch zu 47_live_monat.sql) ----
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
        'employee_id', a.employee_id, 'von', a.von, 'bis', a.bis, 'halb', coalesce(a.halb, false))), '[]'::jsonb)
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

commit;

-- Kontrolle 1: Regeln auf admin_secrets (soll nur „admin_only“ zeigen)
select tablename, policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'admin_secrets';

-- Kontrolle 2: Gibt es weitere Tabellen mit sensiblen Daten, die noch die alte Allgemein-Regel „editor_write“ haben?
-- (Erwartet: keine der Tabellen employee_salary, provision_extra, provision_abschluss, provision_monat, app_users, settings)
select tablename, policyname from pg_policies
where schemaname = 'public' and policyname in ('editor_write', 'staff_read')
  and tablename in ('employee_salary','provision_extra','provision_abschluss','provision_monat','app_users','settings','admin_secrets')
order by 1, 2;
