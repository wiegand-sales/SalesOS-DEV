-- 55_telefonie_aufbereitung_live.sql  ·  Sales OS · 3CX-Anrufe aufbereiten (nur Live, nhudrbulfyampyyxhosv)
-- Voraussetzung: 53 und 54 sind gelaufen (Datenbank telefonie_3cx, Vault-Eintrag, Filter ab 2026).
--
--   · telefonie.anrufe: je Anrufabschnitt eine schlanke Zeile – nur ausgehende Wahlversuche (Nebenstelle → extern)
--     und eingehende Anrufe bei einer Nebenstelle. Rufnummer als Code (HMAC); Klarnummer nur 3 Arbeitstage.
--   · telefonie.aufbereiten(): holt neue Abschnitte aus telefonie_3cx, löscht dort danach die Rohzeilen (> 1 Tag alt).
--   · telefonie.tageszahlen_nebenstelle: Tageszahlen je Nebenstelle (ohne Nummern) – Grundlage für Board und DEV.
--   · public.telefonie_tageszahlen(von, bis): für das Board, nur Staff, je Mitarbeiter und Tag.
--   · pg_cron: Aufbereitung alle 5 Minuten, Klarnummern löschen täglich 02:00 UTC.
-- Kann mehrfach ausgeführt werden.

create extension if not exists pg_cron;

-- Index in der 3CX-Datenbank, damit die Abfrage nach Beginn schnell ist
select telefonie.tcx_exec('create index if not exists cdroutput_beginn on public.cdroutput (cdr_started_at)');

-- ---------------------------------------------------------------- Tabelle
create table if not exists telefonie.anrufe (
  cdr_id          uuid primary key,
  call_history_id uuid,
  richtung        text not null check (richtung in ('aus','ein')),
  nebenstelle     text,
  beginn          timestamptz not null,
  angenommen_um   timestamptz,
  ende            timestamptz,
  angenommen      boolean not null,
  ende_grund      text,
  entstehung      text,
  klingel_sek     int,
  gespraech_sek   int,
  nummer_hash     text,
  nummer_klar     text,
  verarbeitet_am  timestamptz not null default now()
);
create index if not exists anrufe_beginn       on telefonie.anrufe (beginn);
create index if not exists anrufe_nst_beginn   on telefonie.anrufe (nebenstelle, beginn);
create index if not exists anrufe_hash_beginn  on telefonie.anrufe (nummer_hash, beginn);
alter table telefonie.anrufe enable row level security;   -- keine Regel: kein Zugriff über die API
revoke all on telefonie.anrufe from public, anon, authenticated, threecx_writer;

-- ---------------------------------------------------------------- Rufnummern
-- Einheitliche Form +49…; Namen, Kurzwahlen und Unsinn → null
create or replace function telefonie.nummer_norm(x text) returns text
language sql immutable set search_path = '' as $$
  select case
    when x is null or x ~ '[A-Za-z]' then null
    else (select case
            when d ~ '^\+[0-9]{7,}$'  then d
            when d ~ '^00[0-9]{7,}$'  then '+' || substr(d, 3)
            when d ~ '^0[1-9][0-9]{5,}$' then '+49' || substr(d, 2)
            else null end
          from (select regexp_replace(x, '[^0-9+]', '', 'g') as d) s)
  end;
$$;

create or replace function telefonie.nummer_code(x text) returns text
language sql stable security definer set search_path = '' as $$
  select case when telefonie.nummer_norm(x) is null then null
    else encode(extensions.hmac(convert_to(telefonie.nummer_norm(x), 'UTF8'),
                                (select schluessel from telefonie.geheimnis where id = 1), 'sha256'), 'hex') end;
$$;

-- ---------------------------------------------------------------- Aufbereitung
create or replace function telefonie.aufbereiten(p_pakete int default 5, p_paket int default 50000)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_ab   timestamptz;
  v_n    int;
  v_sum  int := 0;
  i      int;
begin
  for i in 1..p_pakete loop
    select coalesce(max(beginn) - interval '1 day', timestamptz '2026-01-01 00:00:00+01') into v_ab from telefonie.anrufe;

    insert into telefonie.anrufe as a
      (cdr_id, call_history_id, richtung, nebenstelle, beginn, angenommen_um, ende, angenommen, ende_grund, entstehung,
       klingel_sek, gespraech_sek, nummer_hash, nummer_klar)
    select r.cdr_id, r.call_history_id, r.richtung, r.nebenstelle, r.beginn, r.angenommen_um, r.ende,
           r.angenommen_um is not null, r.ende_grund, r.entstehung,
           extract(epoch from coalesce(r.angenommen_um, r.ende) - r.beginn)::int,
           case when r.angenommen_um is not null then extract(epoch from r.ende - r.angenommen_um)::int end,
           telefonie.nummer_code(r.nummer), telefonie.nummer_norm(r.nummer)
    from extensions.dblink(telefonie.tcx_verbindung(), format($q$
      select cdr_id, call_history_id,
             case when source_entity_type = 'extension' then 'aus' else 'ein' end,
             case when source_entity_type = 'extension' then source_dn_number else destination_dn_number end,
             cdr_started_at, cdr_answered_at, cdr_ended_at, termination_reason,
             coalesce(creation_method,'') || '|' || coalesce(creation_forward_reason,''),
             case when source_entity_type = 'extension' then destination_participant_phone_number
                  else source_participant_phone_number end
      from public.cdroutput
      where cdr_ended_at is not null
        and cdr_started_at > %L
        and ((source_entity_type = 'extension' and destination_entity_type = 'external_line')
          or (source_entity_type = 'external_line' and destination_entity_type = 'extension'
              and cdr_answered_at is not null))   -- eingehend nur angenommene (sonst je Klingeln bei jedem Agent eine Zeile)
      order by cdr_started_at
      limit %s
    $q$, v_ab, p_paket))
      as r(cdr_id uuid, call_history_id uuid, richtung text, nebenstelle text, beginn timestamptz,
           angenommen_um timestamptz, ende timestamptz, ende_grund text, entstehung text, nummer text)
    on conflict (cdr_id) do update set
      angenommen_um = excluded.angenommen_um, ende = excluded.ende, angenommen = excluded.angenommen,
      ende_grund = excluded.ende_grund, klingel_sek = excluded.klingel_sek, gespraech_sek = excluded.gespraech_sek;

    get diagnostics v_n = row_count;
    v_sum := v_sum + v_n;
    exit when v_n < p_paket;
  end loop;

  -- Rohzeilen in der 3CX-Datenbank löschen, sobald sie verarbeitet und älter als 1 Tag sind
  select max(beginn) - interval '1 day' into v_ab from telefonie.anrufe;
  if v_ab is not null then
    perform extensions.dblink_exec(telefonie.tcx_verbindung(),
      format('delete from public.cdroutput where cdr_started_at < %L', v_ab));
  end if;

  return v_sum || ' Abschnitte verarbeitet';
end;
$$;

-- Klarnummern nach 3 Arbeitstagen (Mo–Fr) löschen
create or replace function telefonie.klarnummern_loeschen() returns int
language plpgsql security definer set search_path = '' as $$
declare d date := (now() at time zone 'Europe/Berlin')::date; n int := 0; v int;
begin
  while n < 3 loop
    d := d - 1;
    if extract(isodow from d) < 6 then n := n + 1; end if;
  end loop;
  update telefonie.anrufe set nummer_klar = null
   where nummer_klar is not null and beginn < (d::timestamp at time zone 'Europe/Berlin');
  get diagnostics v = row_count;
  return v;
end;
$$;

revoke all on function telefonie.nummer_norm(text), telefonie.nummer_code(text),
  telefonie.aufbereiten(int, int), telefonie.klarnummern_loeschen() from public, anon, authenticated;

-- ---------------------------------------------------------------- Tageszahlen
create or replace view telefonie.tageszahlen_nebenstelle as
select (beginn at time zone 'Europe/Berlin')::date                           as datum,
       nebenstelle,
       count(*) filter (where richtung = 'aus')                              as wahlversuche,
       count(*) filter (where richtung = 'aus' and angenommen)               as erreicht,
       coalesce(sum(gespraech_sek) filter (where richtung = 'aus'), 0)       as gespraech_sek_aus,
       count(*) filter (where richtung = 'ein' and angenommen)               as ein_angenommen,
       coalesce(sum(gespraech_sek) filter (where richtung = 'ein'), 0)       as gespraech_sek_ein
from telefonie.anrufe
group by 1, 2;
revoke all on telefonie.tageszahlen_nebenstelle from public, anon, authenticated;

create or replace function public.telefonie_tageszahlen(p_von date, p_bis date)
returns table (employee_id uuid, datum date, wahlversuche bigint, erreicht bigint, gespraech_sek_aus bigint,
               ein_angenommen bigint, gespraech_sek_ein bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'Keine Berechtigung'; end if;
  -- Zuordnung Nebenstelle → Mitarbeiter mit Zeitraum (Tabelle aus 56_telefonie_nebenstellen.sql)
  return query
    select e.id, t.datum,
           sum(t.wahlversuche)::bigint, sum(t.erreicht)::bigint, sum(t.gespraech_sek_aus)::bigint,
           sum(t.ein_angenommen)::bigint, sum(t.gespraech_sek_ein)::bigint
    from telefonie.tageszahlen_nebenstelle t
    join public.telefonie_nebenstellen m on m.nebenstelle = t.nebenstelle
         and t.datum >= m.gueltig_ab and (m.gueltig_bis is null or t.datum <= m.gueltig_bis)
    join public.employees e on e.id = m.employee_id
         and (e.start_date is null or t.datum >= e.start_date)
         and (e.end_date   is null or t.datum <= e.end_date)
    where t.datum between p_von and p_bis
    group by e.id, t.datum;
end;
$$;
revoke all on function public.telefonie_tageszahlen(date, date) from public, anon;
grant execute on function public.telefonie_tageszahlen(date, date) to authenticated;

-- ---------------------------------------------------------------- Zeitplan
select cron.unschedule(jobid) from cron.job where jobname in ('telefonie_aufbereiten', 'telefonie_klarnummern');
-- kleine Pakete: 3 × 20.000 je Lauf (größere liefen über das Zeitlimit)
select cron.schedule('telefonie_aufbereiten', '*/5 * * * *', $$select telefonie.aufbereiten(3, 20000)$$);
select cron.schedule('telefonie_klarnummern', '0 2 * * *',  $$select telefonie.klarnummern_loeschen()$$);
