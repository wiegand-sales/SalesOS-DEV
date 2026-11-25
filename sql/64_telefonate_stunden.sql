-- 64_telefonate_stunden.sql  ·  Sales OS · Menü „Telefonate“, Nachträge Abschnitt 9 (25.11.2026)
-- 1) Ø Klingelzeit im Balken nur über nicht angenommene Anrufe mit ende_grund = 'cancelled' (Agent legt auf),
--    weggedrückte Anrufe zählen nicht mit.
-- 2) Einzelansicht „Telefonate je Mitarbeiter“: Werte je Arbeitsstunde 8–17 Uhr.
-- Drei Teile: TEIL A nur LIVE, TEIL B nur DEV, TEIL C in DEV UND LIVE. Kann mehrfach ausgeführt werden.

-- ================================================================ TEIL A · nur LIVE (nhudrbulfyampyyxhosv)
create or replace function telefonie.r_agenten(p_von date, p_bis date, p_grenze int default 10)
returns jsonb language sql stable security definer set search_path = '' as $$
  with z as (select telefonie.r_zeit(p_von) v, telefonie.r_zeit(p_bis + 1) b),
  aus as (
    select a.nebenstelle nst,
      count(*) wv,
      count(*) filter (where a.angenommen and a.gespraech_sek >= p_grenze) err,
      count(*) filter (where a.angenommen and a.gespraech_sek <  p_grenze) mb,
      count(*) filter (where not a.angenommen) ne,
      count(*) filter (where not a.angenommen and a.ende_grund = 'rejected') wg,
      round(avg(a.klingel_sek) filter (where not a.angenommen and a.ende_grund = 'cancelled'))::int klingel_ne,
      coalesce(sum(a.gespraech_sek), 0) gz_aus
    from telefonie.anrufe a, z
    where a.richtung = 'aus' and a.beginn >= z.v and a.beginn < z.b
    group by a.nebenstelle),
  ein as (
    select e.angenommen_von nst, count(*) ein_ang, coalesce(sum(e.gespraech_sek), 0) gz_ein
    from telefonie.eingehend e, z
    where e.angenommen and e.gruppe in (select nummer from telefonie.sales_gruppen)
      and e.beginn >= z.v and e.beginn < z.b
    group by e.angenommen_von)
  select coalesce(jsonb_agg(jsonb_build_object(
    'nst', coalesce(aus.nst, ein.nst), 'wv', coalesce(aus.wv, 0), 'err', coalesce(aus.err, 0), 'mb', coalesce(aus.mb, 0),
    'ne', coalesce(aus.ne, 0), 'wg', coalesce(aus.wg, 0), 'klingel_ne', aus.klingel_ne, 'gz_aus', coalesce(aus.gz_aus, 0),
    'ein_ang', coalesce(ein.ein_ang, 0), 'gz_ein', coalesce(ein.gz_ein, 0))), '[]'::jsonb)
  from aus full join ein on ein.nst = aus.nst
$$;

-- Je Stunde (Berlin) für die übergebenen Nebenstellen; dazu die Zahl der Tage mit ausgehenden Anrufen
create or replace function telefonie.r_stunden(p_von date, p_bis date, p_grenze int, p_nst text[])
returns jsonb language sql stable security definer set search_path = '' as $$
  with z as (select telefonie.r_zeit(p_von) v, telefonie.r_zeit(p_bis + 1) b),
  a as (
    select extract(hour from a.beginn at time zone 'Europe/Berlin')::int std, (a.beginn at time zone 'Europe/Berlin')::date tag,
           a.angenommen, a.gespraech_sek, a.ende_grund, a.klingel_sek
    from telefonie.anrufe a, z
    where a.richtung = 'aus' and a.beginn >= z.v and a.beginn < z.b and a.nebenstelle = any (p_nst)),
  aus as (
    select std, count(*) wv,
      count(*) filter (where angenommen and gespraech_sek >= p_grenze) err,
      count(*) filter (where angenommen and gespraech_sek <  p_grenze) mb,
      count(*) filter (where not angenommen) ne,
      round(avg(klingel_sek) filter (where not angenommen and ende_grund = 'cancelled'))::int klingel_ne,
      coalesce(sum(gespraech_sek), 0) gz_aus
    from a group by std),
  ein as (
    select extract(hour from e.beginn at time zone 'Europe/Berlin')::int std, count(*) ein_ang, coalesce(sum(e.gespraech_sek), 0) gz_ein
    from telefonie.eingehend e, z
    where e.angenommen and e.angenommen_von = any (p_nst) and e.gruppe in (select nummer from telefonie.sales_gruppen)
      and e.beginn >= z.v and e.beginn < z.b
    group by 1)
  select jsonb_build_object('tage', (select count(distinct tag) from a),
    'stunden', coalesce((select jsonb_agg(jsonb_build_object('std', coalesce(aus.std, ein.std), 'wv', coalesce(aus.wv, 0),
      'err', coalesce(aus.err, 0), 'mb', coalesce(aus.mb, 0), 'ne', coalesce(aus.ne, 0), 'klingel_ne', aus.klingel_ne,
      'gz_aus', coalesce(aus.gz_aus, 0), 'ein_ang', coalesce(ein.ein_ang, 0), 'gz_ein', coalesce(ein.gz_ein, 0)))
      from aus full join ein on ein.std = aus.std), '[]'::jsonb))
$$;
revoke all on function telefonie.r_stunden(date, date, int, text[]) from public, anon, authenticated;
grant execute on function telefonie.r_stunden(date, date, int, text[]) to telefonie_dev_leser;

-- ================================================================ TEIL B · nur DEV (kjlkneodyvfqgaukdjvb)
-- create or replace function telefonie.r_stunden(p_von date, p_bis date, p_grenze int, p_nst text[]) returns jsonb
-- language sql security definer set search_path = '' as $$
--   select telefonie.r_live(format('select telefonie.r_stunden(%L::date, %L::date, %s, %L::text[])', p_von, p_bis, p_grenze, p_nst)) $$;
-- revoke all on function telefonie.r_stunden(date, date, int, text[]) from public, anon, authenticated;

-- ================================================================ TEIL C · DEV UND LIVE (Board-Abfrage)
create or replace function public.telefonate_stunden(p_von date, p_bis date, p_param jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  g int := coalesce((p_param->>'grenze')::int, 10);
  sdl uuid[] := telefonie.b_sdl_team();
  emp uuid := (p_param->>'employee_id')::uuid;
begin
  if not public.is_staff() then raise exception 'Keine Berechtigung'; end if;
  if emp is null then raise exception 'employee_id fehlt'; end if;
  if sdl is not null and not (emp = any (sdl)) then raise exception 'Keine Berechtigung'; end if;
  return telefonie.r_stunden(p_von, p_bis, g, telefonie.b_nst(array[emp], p_von, p_bis));
end;
$$;
revoke all on function public.telefonate_stunden(date, date, jsonb) from public, anon;
grant execute on function public.telefonate_stunden(date, date, jsonb) to authenticated;
