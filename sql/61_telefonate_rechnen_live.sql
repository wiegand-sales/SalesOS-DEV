-- 61_telefonate_rechnen_live.sql  ·  Sales OS · Menü „Telefonate“: Rechenfunktionen (NUR Live, nhudrbulfyampyyxhosv)
-- Alle Auswertungen laufen hier über die Einzelanrufe (telefonie.anrufe / telefonie.eingehend) und liefern
-- fertige Zahlen je NEBENSTELLE als jsonb – keine Rufnummern, keine Mitarbeiter-IDs. DEV ruft dieselben Funktionen
-- über 62_telefonate_dev_proxy.sql auf. Schwellen kommen als Parameter (Einstellungen › Telefonate).
-- Definitionen laut Auftrag „Telefonate_Umsetzung_fuer_Claude_Code“, Abschnitt 3:
--   erreicht = ausgehend, angenommen, gespraech_sek >= grenze · Mailbox = angenommen, < grenze
--   weggedrückt = nicht angenommen, ende_grund = 'rejected'
--   Lead-Anruf = ausgehend, ohne Anruf derselben Nummer auf 800/831 in den <fenster> Tagen davor
--   Versuch = laufende Nummer der Lead-Anrufe je Kunde (nummer_hash) im Zeitraum, bis einschließlich 1. „erreicht“
--   Rückrufer = nach nicht erreichtem Versuch innerhalb <fenster> und vor dem nächsten Versuch auf 800/831 angerufen
--   Kernzeit = Mo–Fr 8–17 Uhr, Freitag nur bis 14 Uhr. Zeitzone immer Europe/Berlin.
-- Kann mehrfach ausgeführt werden.

create index if not exists eingehend_hash_beginn  on telefonie.eingehend (nummer_hash, beginn);
create index if not exists anrufe_richtung_beginn on telefonie.anrufe (richtung, beginn);

-- Zeitraum: p_von/p_bis sind Kalendertage (Berlin), p_bis einschließlich
create or replace function telefonie.r_zeit(p_tag date) returns timestamptz
language sql immutable set search_path = '' as $$ select (p_tag::timestamp at time zone 'Europe/Berlin') $$;

-- Kernzeit-Prüfung
create or replace function telefonie.r_kernzeit(p_t timestamptz) returns boolean
language sql immutable set search_path = '' as $$
  select case
    when extract(isodow from p_t at time zone 'Europe/Berlin') >= 6 then false
    when extract(hour from p_t at time zone 'Europe/Berlin') < 8 then false
    when extract(isodow from p_t at time zone 'Europe/Berlin') = 5 then extract(hour from p_t at time zone 'Europe/Berlin') < 14
    else extract(hour from p_t at time zone 'Europe/Berlin') < 17 end
$$;

-- ---------------------------------------------------------------- Box 1: je Nebenstelle
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
      round(avg(a.klingel_sek) filter (where not a.angenommen))::int klingel_ne,
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

-- ---------------------------------------------------------------- Lead-Anrufe mit Versuchsnummer (Hilfsfunktion)
create or replace function telefonie.r_lead(p_von date, p_bis date, p_grenze int, p_fenster int, p_nst text[])
returns table (h text, nst text, beginn timestamptz, err boolean, mb boolean, wg boolean, gespraech_sek int,
               n int, naechster timestamptz, vorher timestamptz)
language sql stable security definer set search_path = '' as $$
  with z as (select telefonie.r_zeit(p_von) v, telefonie.r_zeit(p_bis + 1) b, make_interval(days => p_fenster) f),
  ein as materialized (
    select e.nummer_hash h, e.beginn from telefonie.eingehend e, z
    where e.gruppe in (select nummer from telefonie.sales_gruppen) and e.nummer_hash is not null
      and e.beginn >= z.v - z.f and e.beginn < z.b),
  aus as materialized (
    select a.nummer_hash h, a.nebenstelle nst, a.beginn,
           (a.angenommen and a.gespraech_sek >= p_grenze) err,
           (a.angenommen and a.gespraech_sek <  p_grenze) mb,
           (not a.angenommen and a.ende_grund = 'rejected') wg,
           a.gespraech_sek
    from telefonie.anrufe a, z
    where a.richtung = 'aus' and a.nummer_hash is not null and a.beginn >= z.v and a.beginn < z.b
      and (p_nst is null or a.nebenstelle = any (p_nst))),
  lead as (
    select aus.* from aus, z
    where not exists (select 1 from ein where ein.h = aus.h and ein.beginn < aus.beginn and ein.beginn >= aus.beginn - z.f)),
  nr as (
    select l.*, (row_number() over w)::int n, lead(l.beginn) over w naechster, lag(l.beginn) over w vorher,
           coalesce(sum(l.err::int) over (partition by l.h order by l.beginn rows between unbounded preceding and 1 preceding), 0) vorher_err
    from lead l window w as (partition by l.h order by l.beginn))
  select h, nst, beginn, err, mb, wg, gespraech_sek, n, naechster, vorher from nr where vorher_err = 0
$$;

-- ---------------------------------------------------------------- Box 2: Ausgehend nach Versuch
create or replace function telefonie.r_versuche(p_von date, p_bis date, p_grenze int default 10, p_fenster int default 3,
                                                p_nst text[] default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  with v as materialized (select * from telefonie.r_lead(p_von, p_bis, p_grenze, p_fenster, p_nst)),
  z as (select telefonie.r_zeit(p_von) v, telefonie.r_zeit(p_bis + 1) b, make_interval(days => p_fenster) f),
  ein as materialized (
    select e.nummer_hash h, e.beginn, e.angenommen from telefonie.eingehend e, z
    where e.gruppe in (select nummer from telefonie.sales_gruppen) and e.nummer_hash is not null
      and e.beginn >= z.v and e.beginn < z.b + z.f),
  rr as (
    select v.h, v.n from v, z
    where not v.err and exists (select 1 from ein e where e.h = v.h and e.beginn > v.beginn and e.beginn <= v.beginn + z.f
                                 and (v.naechster is null or e.beginn < v.naechster))),
  je as (
    select least(v.n, 7) k,
      count(*) anrufe,
      count(*) filter (where v.err) err, count(*) filter (where v.mb) mb, count(*) filter (where v.wg) wg,
      count(*) filter (where not v.err and not v.mb and not v.wg) na,
      (percentile_cont(0.5) within group (order by extract(epoch from v.beginn - v.vorher) / 3600.0)
         filter (where v.vorher is not null))::numeric(10,2) median_std,
      round(avg(v.gespraech_sek) filter (where v.err))::int gespraech_avg
    from v group by 1),
  je4 as (
    select count(*) anrufe, count(*) filter (where v.err) err, count(*) filter (where v.mb) mb,
      count(*) filter (where v.wg) wg, count(*) filter (where not v.err and not v.mb and not v.wg) na,
      (percentile_cont(0.5) within group (order by extract(epoch from v.beginn - v.vorher) / 3600.0)
         filter (where v.vorher is not null))::numeric(10,2) median_std,
      round(avg(v.gespraech_sek) filter (where v.err))::int gespraech_avg
    from v where v.n >= 4),
  rueck as (select least(n, 7) k, count(*) rueck from rr group by 1),
  kunden as (select h, max(n) versuche, bool_or(err) err, min(n) filter (where err) err_n from v group by h)
  select jsonb_build_object(
    'versuche', (select coalesce(jsonb_agg(jsonb_build_object('n', je.k, 'kunden', je.anrufe, 'err', je.err, 'mb', je.mb,
                   'wg', je.wg, 'na', je.na, 'rueck', coalesce(rueck.rueck, 0), 'median_std', je.median_std,
                   'gespraech_avg', je.gespraech_avg) order by je.k), '[]'::jsonb)
                 from je left join rueck on rueck.k = je.k),
    'ab4', (select to_jsonb(je4) from je4),
    'gesamt', (select jsonb_build_object('kunden', count(*), 'err', count(*) filter (where err),
                 'err1', count(*) filter (where err_n = 1), 'err2', count(*) filter (where err_n = 2),
                 'err3', count(*) filter (where err_n = 3), 'err4', count(*) filter (where err_n >= 4),
                 'nie', count(*) filter (where not err), 'nur_einmal', count(*) filter (where not err and versuche = 1),
                 'rueckrufer', (select count(distinct h) from rr)) from kunden))
$$;

-- ---------------------------------------------------------------- Banner: Trichter (Kunden)
create or replace function telefonie.r_trichter(p_von date, p_bis date, p_grenze int default 10, p_fenster int default 3)
returns jsonb language sql stable security definer set search_path = '' as $$
  with v as materialized (select * from telefonie.r_lead(p_von, p_bis, p_grenze, p_fenster, null)),
  z as (select telefonie.r_zeit(p_von) v, telefonie.r_zeit(p_bis + 1) b, make_interval(days => p_fenster) f),
  ein as materialized (
    select e.nummer_hash h, e.beginn, e.angenommen from telefonie.eingehend e, z
    where e.gruppe in (select nummer from telefonie.sales_gruppen) and e.nummer_hash is not null
      and e.beginn >= z.v and e.beginn < z.b + z.f),
  rr as (   -- je nicht erreichtem Versuch die Rückrufe im Fenster vor dem nächsten Versuch
    select v.h, v.beginn vb, e.beginn eb, e.angenommen
    from v, z join ein e on true
    where not v.err and e.h = v.h and e.beginn > v.beginn and e.beginn <= v.beginn + z.f
      and (v.naechster is null or e.beginn < v.naechster)),
  kunde as (
    select h, min(eb) erster, bool_or(angenommen) ang,
           (array_agg(angenommen order by eb))[1] erster_ang,
           (array_agg(extract(epoch from eb - vb) / 60.0 order by eb))[1] min_bis
    from rr group by h),
  erst as (select h, err from v where n = 1)
  select jsonb_build_object(
    'erstanruf', (select count(*) from erst),
    'err1', (select count(*) from erst where err),
    'nicht_err', (select count(*) from erst where not err),
    'rueck', (select count(*) from kunde),
    'angen', (select count(*) from kunde where ang),
    'verloren', (select count(*) from kunde where not ang),
    'gleich_1', (select count(*) from kunde where erster_ang),
    'median_min', (select round((percentile_cont(0.5) within group (order by min_bis))::numeric) from kunde))
$$;

-- ---------------------------------------------------------------- Box 3: Eingehend 800/831
create or replace function telefonie.r_eingang(p_von date, p_bis date, p_gruppierung text default 'tag')
returns jsonb language sql stable security definer set search_path = '' as $$
  with z as (select telefonie.r_zeit(p_von) v, telefonie.r_zeit(p_bis + 1) b)
  select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n, 'a800', a800, 'a831', a831, 'n800', n800, 'n831', n831) order by k), '[]'::jsonb)
  from (
    select (date_trunc(case p_gruppierung when 'woche' then 'week' when 'monat' then 'month' else 'day' end,
                       e.beginn at time zone 'Europe/Berlin'))::date k,
           count(*) n,
           count(*) filter (where e.angenommen and e.gruppe = '800') a800,
           count(*) filter (where e.angenommen and e.gruppe = '831') a831,
           count(*) filter (where e.gruppe = '800') n800,
           count(*) filter (where e.gruppe = '831') n831
    from telefonie.eingehend e, z
    where e.gruppe in (select nummer from telefonie.sales_gruppen) and e.beginn >= z.v and e.beginn < z.b
    group by 1) x
$$;

create or replace function telefonie.r_eingang_kacheln(p_von date, p_bis date, p_fenster int default 3)
returns jsonb language sql stable security definer set search_path = '' as $$
  with z as (select telefonie.r_zeit(p_von) v, telefonie.r_zeit(p_bis + 1) b, make_interval(days => p_fenster) f),
  e as materialized (
    select x.*, telefonie.r_kernzeit(x.beginn) kern,
           extract(isodow from x.beginn at time zone 'Europe/Berlin')::int wd,
           extract(hour from x.beginn at time zone 'Europe/Berlin')::int std
    from telefonie.eingehend x, z
    where x.gruppe in (select nummer from telefonie.sales_gruppen) and x.beginn >= z.v and x.beginn < z.b),
  verpasst as (
    select e.nummer_hash h, e.beginn,
      exists (select 1 from telefonie.eingehend y where y.nummer_hash = e.nummer_hash and y.angenommen
              and y.gruppe in (select nummer from telefonie.sales_gruppen)
              and y.beginn > e.beginn and y.beginn <= e.beginn + (select f from z)) durch,
      exists (select 1 from telefonie.anrufe a where a.nummer_hash = e.nummer_hash and a.richtung = 'aus'
              and a.beginn > e.beginn and a.beginn <= e.beginn + (select f from z)) angerufen
    from e where not e.angenommen and e.nummer_hash is not null
    union all
    select null, e.beginn, false, false from e where not e.angenommen and e.nummer_hash is null),
  heute as (
    select count(distinct nummer_hash) filter (where true) n,
           count(distinct nummer_hash) filter (where beginn < now() - interval '2 hours') ueber2
    from telefonie.eingehend x
    where x.gruppe in (select nummer from telefonie.sales_gruppen) and not x.angenommen and x.nummer_hash is not null
      and (x.beginn at time zone 'Europe/Berlin')::date = (now() at time zone 'Europe/Berlin')::date
      and not exists (select 1 from telefonie.eingehend y where y.nummer_hash = x.nummer_hash and y.angenommen
                      and y.gruppe in (select nummer from telefonie.sales_gruppen) and y.beginn > x.beginn
                      and y.beginn < x.beginn + interval '1 day'))
  select jsonb_build_object(
    'n', (select count(*) from e), 'ang', (select count(*) from e where angenommen),
    'gruppen', (select coalesce(jsonb_agg(jsonb_build_object('g', gruppe, 'n', n, 'ang', ang) order by gruppe), '[]'::jsonb)
                from (select gruppe, count(*) n, count(*) filter (where angenommen) ang from e group by gruppe) g),
    'kern', (select jsonb_build_object('n', count(*), 'ang', count(*) filter (where angenommen)) from e where kern),
    'von', (select coalesce(jsonb_agg(jsonb_build_object('nst', angenommen_von, 'n', n)), '[]'::jsonb)
            from (select angenommen_von, count(*) n from e where angenommen group by angenommen_von) x),
    'gespraech_avg', (select round(avg(gespraech_sek))::int from e where angenommen),
    'warte_ang_avg', (select round(avg(warte_sek))::int from e where angenommen),
    'warte_auflegen_avg', (select round(avg(warte_sek))::int from e where not angenommen),
    'gewartet', (select jsonb_build_object('u15', count(*) filter (where warte_sek < 15),
                   'm15_59', count(*) filter (where warte_sek between 15 and 59), 'ab60', count(*) filter (where warte_sek >= 60))
                 from e where not angenommen),
    'verpasst', (select jsonb_build_object('n', count(*),
                   -- Reihenfolge wie im Entwurf: erst „von uns angerufen“, dann „selbst durchgekommen“
                   'angerufen', count(*) filter (where h is not null and angerufen),
                   'durch', count(*) filter (where h is not null and not angerufen and durch),
                   'kein', count(*) filter (where h is not null and not angerufen and not durch),
                   'unbekannt', count(*) filter (where h is null)) from verpasst),
    'ausser', (select jsonb_build_object('n', count(*), 'ang', count(*) filter (where angenommen),
                 'ab17', count(*) filter (where wd <= 5 and std >= 17),
                 'fr14', count(*) filter (where wd = 5 and std >= 14 and std < 17),
                 'we', count(*) filter (where wd >= 6),
                 'vor8', count(*) filter (where wd <= 5 and std < 8)) from e where not kern),
    'heute', (select jsonb_build_object('n', n, 'ueber2', ueber2) from heute))
$$;

-- ---------------------------------------------------------------- Box 4: Erreichbarkeit (Heatmap)
create or replace function telefonie.r_heatmap(p_von date, p_bis date, p_richtung text default 'aus',
  p_versuch text default 'alle', p_grenze int default 10, p_fenster int default 3, p_nst text[] default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb;
begin
  if p_richtung = 'ein' then
    select coalesce(jsonb_agg(jsonb_build_object('wd', wd, 'std', std, 'n', n, 'ok', ok)), '[]'::jsonb) into r
    from (select extract(isodow from e.beginn at time zone 'Europe/Berlin')::int wd,
                 extract(hour from e.beginn at time zone 'Europe/Berlin')::int std,
                 count(*) n, count(*) filter (where e.angenommen) ok
          from telefonie.eingehend e
          where e.gruppe in (select nummer from telefonie.sales_gruppen)
            and e.beginn >= telefonie.r_zeit(p_von) and e.beginn < telefonie.r_zeit(p_bis + 1)
            and (p_nst is null or e.angenommen_von = any (p_nst) or not e.angenommen)
          group by 1, 2) x;
  else
    select coalesce(jsonb_agg(jsonb_build_object('wd', wd, 'std', std, 'n', n, 'ok', ok)), '[]'::jsonb) into r
    from (select extract(isodow from v.beginn at time zone 'Europe/Berlin')::int wd,
                 extract(hour from v.beginn at time zone 'Europe/Berlin')::int std,
                 count(*) n, count(*) filter (where v.err) ok
          from telefonie.r_lead(p_von, p_bis, p_grenze, p_fenster, p_nst) v
          where p_versuch = 'alle' or (p_versuch = '4' and v.n >= 4) or v.n::text = p_versuch
          group by 1, 2) x;
  end if;
  return r;
end;
$$;

revoke all on function telefonie.r_zeit(date), telefonie.r_kernzeit(timestamptz),
  telefonie.r_agenten(date, date, int), telefonie.r_lead(date, date, int, int, text[]),
  telefonie.r_versuche(date, date, int, int, text[]), telefonie.r_trichter(date, date, int, int),
  telefonie.r_eingang(date, date, text), telefonie.r_eingang_kacheln(date, date, int),
  telefonie.r_heatmap(date, date, text, text, int, int, text[]) from public, anon, authenticated;

-- =====================  Für DEV (Peter führt aus): Lese-Login darf nur die fertigen Auswertungen aufrufen  =====
-- grant execute on function telefonie.r_agenten(date, date, int), telefonie.r_versuche(date, date, int, int, text[]),
--   telefonie.r_trichter(date, date, int, int), telefonie.r_eingang(date, date, text),
--   telefonie.r_eingang_kacheln(date, date, int), telefonie.r_heatmap(date, date, text, text, int, int, text[])
--   to telefonie_dev_leser;
