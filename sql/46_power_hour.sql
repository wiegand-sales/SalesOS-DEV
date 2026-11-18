-- 46_power_hour.sql  ·  Sales OS · Power Hour für die Live-Ansicht
-- Erst im DEV-Projekt (kjlkneodyvfqgaukdjvb) ausführen, dann im Live-Projekt (nhudrbulfyampyyxhosv). Kann mehrfach ausgeführt werden.
-- Bestehende Tabellen und Daten werden nicht verändert.
--
-- 1) performance_ticks: Bei jedem Datenimport (alle ~5 Min.) merkt sich die Datenbank, was pro Agent seit dem
--    letzten Stand dazugekommen ist (Optimierungen, Mega Yes, Marge …). Daraus rechnet die Power Hour „ab Start“
--    und die Historie. Es wird nur der heutige Tag erfasst; Nachträge für alte Tage zählen nicht.
-- 2) power_hours: bis zu drei geplante Power Hours pro Tag (Start, Ende, Kennzahl). Lesen: alle Board-Nutzer, Schreiben: Admins.
-- 3) live_daten (Fernseher) liefert zusätzlich die heutigen Power Hours und die heutigen Ticks.

-- 1) Ticks ---------------------------------------------------------------------------------------
do $$
declare t text;
begin
  select format_type(atttypid, atttypmod) into t from pg_attribute
  where attrelid = 'public.employees'::regclass and attname = 'id';
  execute format('create table if not exists public.performance_ticks (
      id bigserial primary key,
      employee_id %s not null,
      date date not null,
      ts timestamptz not null default now(),
      d_oem integer not null default 0, d_my integer not null default 0, d_yes integer not null default 0, d_sy integer not null default 0,
      d_nicht integer not null default 0, d_ups integer not null default 0, d_wka integer not null default 0,
      d_oem_marge numeric not null default 0, d_marge numeric not null default 0)', t);
end $$;
create index if not exists performance_ticks_date_ts on public.performance_ticks (date, ts);
alter table public.performance_ticks enable row level security;
grant select on public.performance_ticks to authenticated;
revoke all on public.performance_ticks from anon;
drop policy if exists ticks_read on public.performance_ticks;
create policy ticks_read on public.performance_ticks for select to authenticated using (public.is_staff());

create or replace function public.performance_tick() returns trigger
language plpgsql security definer set search_path = public as $$
declare heute date := (now() at time zone 'Europe/Berlin')::date;
  a_oem int; a_my int; a_yes int; a_sy int; a_nicht int; a_ups int; a_wka int; a_om numeric; a_m numeric;
begin
  if new.date is distinct from heute then return new; end if;
  a_oem := coalesce(new.oem_gesamt,0)            - case when tg_op='UPDATE' then coalesce(old.oem_gesamt,0) else 0 end;
  a_my  := coalesce(new.oem_my,0)                - case when tg_op='UPDATE' then coalesce(old.oem_my,0) else 0 end;
  a_yes := coalesce(new.oem_yes,0)               - case when tg_op='UPDATE' then coalesce(old.oem_yes,0) else 0 end;
  a_sy  := coalesce(new.oem_sy,0)                - case when tg_op='UPDATE' then coalesce(old.oem_sy,0) else 0 end;
  a_nicht := coalesce(new.oem_nicht_erfolgreich,0) - case when tg_op='UPDATE' then coalesce(old.oem_nicht_erfolgreich,0) else 0 end;
  a_ups := coalesce(new.ups_yes,0)               - case when tg_op='UPDATE' then coalesce(old.ups_yes,0) else 0 end;
  a_wka := coalesce(new.wka_gesamt_yes,0)        - case when tg_op='UPDATE' then coalesce(old.wka_gesamt_yes,0) else 0 end;
  a_om  := coalesce(new.oem_margenerhoehung,0)   - case when tg_op='UPDATE' then coalesce(old.oem_margenerhoehung,0) else 0 end;
  a_m   := coalesce(new.gesamt_margenerhoehung,0)- case when tg_op='UPDATE' then coalesce(old.gesamt_margenerhoehung,0) else 0 end;
  if a_oem<>0 or a_my<>0 or a_yes<>0 or a_sy<>0 or a_nicht<>0 or a_ups<>0 or a_wka<>0 or a_om<>0 or a_m<>0 then
    insert into public.performance_ticks (employee_id, date, d_oem, d_my, d_yes, d_sy, d_nicht, d_ups, d_wka, d_oem_marge, d_marge)
    values (new.employee_id, new.date, a_oem, a_my, a_yes, a_sy, a_nicht, a_ups, a_wka, a_om, a_m);
  end if;
  return new;
exception when others then
  return new; -- der Datenimport darf nie an der Power Hour scheitern
end $$;
drop trigger if exists performance_tick on public.performance;
create trigger performance_tick after insert or update on public.performance
  for each row execute function public.performance_tick();

-- 2) Geplante Power Hours ------------------------------------------------------------------------
create table if not exists public.power_hours (
  id bigserial primary key,
  datum date not null,
  start_zeit time not null,
  end_zeit time not null,
  kpi text not null default 'opt' check (kpi in ('opt','my','marge','marge_my')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_zeit > start_zeit)
);
create index if not exists power_hours_datum on public.power_hours (datum);
alter table public.power_hours enable row level security;
grant select, insert, update, delete on public.power_hours to authenticated;
grant usage, select on sequence public.power_hours_id_seq to authenticated;
revoke all on public.power_hours from anon;
drop policy if exists ph_read on public.power_hours;
drop policy if exists ph_write on public.power_hours;
create policy ph_read on public.power_hours for select to authenticated using (public.is_staff());
create policy ph_write on public.power_hours for all to authenticated
  using (public.board_role() = 'admin') with check (public.board_role() = 'admin');

-- 3) Fernseher-Daten um Power Hour und Ticks erweitern ----------------------------------------------
create or replace function public.live_daten(p_key text, p_von date)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  k text;
  v_von date := greatest(coalesce(p_von, current_date - 7), current_date - 14);
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

-- Kontrolle
select (select count(*) from public.power_hours) as power_hours, (select count(*) from public.performance_ticks) as ticks;
