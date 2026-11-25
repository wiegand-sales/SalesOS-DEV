-- 58_telefonie_eingang_live.sql  ·  Sales OS · Eingehende Anrufe je Anruf (nicht je Klingeln) – nur Live
-- Peter, 25.11.2026: „wieviele reingekommen sind in den sales verteiler oder in die sales gruppe und wieviele davon
-- angenommen wurden … einverstanden, dass aus den 15 bis 20 zeilen nur eine wird.“
--
--   · telefonie.eingehend: je eingehendem Anruf über eine Warteschleife/Rufgruppe eine Zeile
--     (Gruppe, angenommen ja/nein, von welcher Nebenstelle, Wartezeit, Gesprächsdauer, Nummern-Code).
--   · telefonie.sales_gruppen: welche Gruppen als „Sales“ zählen (800 Sales Rückruf, 831 Sales Warteschleife).
--   · Rohdaten werden erst gelöscht, wenn BEIDE Aufbereitungen (ausgehend/Agent und eingehend/Anruf) durch sind.
--   · public.telefonie_eingang(von, bis): Tageszahlen je Sales-Gruppe fürs Board, nur Staff.
-- Geprüft am 24.11.2026 gegen den 3CX-Bericht: 816=118, 817=224, 831=8 Anrufe; 800+831 angenommen = 249+4 = 253.

create table if not exists telefonie.eingehend (
  call_history_id uuid primary key,
  beginn          timestamptz not null,
  gruppe          text,
  gruppe_name     text,
  angenommen      boolean not null,
  angenommen_von  text,
  angenommen_um   timestamptz,
  ende            timestamptz,
  warte_sek       int,
  gespraech_sek   int,
  nummer_hash     text,
  nummer_klar     text,
  verarbeitet_am  timestamptz not null default now()
);
create index if not exists eingehend_beginn        on telefonie.eingehend (beginn);
create index if not exists eingehend_gruppe_beginn on telefonie.eingehend (gruppe, beginn);
alter table telefonie.eingehend enable row level security;
revoke all on telefonie.eingehend from public, anon, authenticated, threecx_writer;

create table if not exists telefonie.sales_gruppen (nummer text primary key, name text);
insert into telefonie.sales_gruppen values ('800', 'Sales Rückruf'), ('831', 'Sales Warteschleife')
  on conflict (nummer) do nothing;
alter table telefonie.sales_gruppen enable row level security;
revoke all on telefonie.sales_gruppen from public, anon, authenticated, threecx_writer;

create or replace function telefonie.eingehend_aufbereiten(p_paket int default 20000)
returns text language plpgsql security definer set search_path = '' as $$
declare v_ab timestamptz; v_n int;
begin
  select coalesce(max(beginn) - interval '1 day', timestamptz '2026-01-01 00:00:00+01') into v_ab from telefonie.eingehend;

  insert into telefonie.eingehend as a
    (call_history_id, beginn, gruppe, gruppe_name, angenommen, angenommen_von, angenommen_um, ende,
     warte_sek, gespraech_sek, nummer_hash, nummer_klar)
  select r.call_history_id, r.beginn, r.gruppe, r.gruppe_name, r.angenommen, r.angenommen_von, r.angenommen_um, r.ende,
         extract(epoch from coalesce(r.angenommen_um, r.ende) - r.beginn)::int, r.gespraech_sek,
         telefonie.nummer_code(r.nummer), telefonie.nummer_norm(r.nummer)
  from extensions.dblink(telefonie.tcx_verbindung(), format($q$
    with k as (
      select distinct call_history_id from public.cdroutput
      where source_entity_type = 'external_line'
        and destination_entity_type in ('queue','ring_group_ring_all','ring_group_hunt')
        and cdr_started_at > %L)
    select c.call_history_id,
           min(c.cdr_started_at),
           (array_agg(c.destination_dn_number order by c.cdr_started_at)
              filter (where c.destination_entity_type in ('queue','ring_group_ring_all','ring_group_hunt')))[1],
           (array_agg(c.destination_dn_name order by c.cdr_started_at)
              filter (where c.destination_entity_type in ('queue','ring_group_ring_all','ring_group_hunt')))[1],
           coalesce(bool_or(c.destination_entity_type = 'extension' and c.cdr_answered_at is not null), false),
           (array_agg(c.destination_dn_number order by c.cdr_answered_at)
              filter (where c.destination_entity_type = 'extension' and c.cdr_answered_at is not null))[1],
           min(c.cdr_answered_at) filter (where c.destination_entity_type = 'extension'),
           max(c.cdr_ended_at),
           max(extract(epoch from c.cdr_ended_at - c.cdr_answered_at))
              filter (where c.destination_entity_type = 'extension' and c.cdr_answered_at is not null)::int,
           max(c.source_participant_phone_number) filter (where c.source_entity_type = 'external_line'),
           bool_and(c.cdr_ended_at is not null)
    from public.cdroutput c join k using (call_history_id)
    group by c.call_history_id
    order by 2
    limit %s
  $q$, v_ab, p_paket))
    as r(call_history_id uuid, beginn timestamptz, gruppe text, gruppe_name text, angenommen boolean,
         angenommen_von text, angenommen_um timestamptz, ende timestamptz, gespraech_sek int, nummer text, fertig boolean)
  where r.fertig
  on conflict (call_history_id) do update set
    gruppe = excluded.gruppe, gruppe_name = excluded.gruppe_name, angenommen = excluded.angenommen,
    angenommen_von = excluded.angenommen_von, angenommen_um = excluded.angenommen_um, ende = excluded.ende,
    warte_sek = excluded.warte_sek, gespraech_sek = excluded.gespraech_sek;

  get diagnostics v_n = row_count;
  return v_n || ' eingehende Anrufe verarbeitet';
end;
$$;

-- Ausgehend/Agent: wie in 55, aber OHNE das Löschen der Rohdaten (macht jetzt rohdaten_aufraeumen)
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
              and cdr_answered_at is not null))
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
  return v_sum || ' Abschnitte verarbeitet';
end;
$$;

-- Rohdaten erst löschen, wenn beide Aufbereitungen so weit sind
create or replace function telefonie.rohdaten_aufraeumen() returns text
language plpgsql security definer set search_path = '' as $$
declare v_ab timestamptz;
begin
  select least((select max(beginn) from telefonie.anrufe), (select max(beginn) from telefonie.eingehend))
         - interval '1 day' into v_ab;
  if v_ab is null then return 'nichts gelöscht'; end if;
  return extensions.dblink_exec(telefonie.tcx_verbindung(),
    format('delete from public.cdroutput where cdr_started_at < %L', v_ab));
end;
$$;

-- Klarnummern nach 3 Arbeitstagen löschen – jetzt in beiden Tabellen
create or replace function telefonie.klarnummern_loeschen() returns int
language plpgsql security definer set search_path = '' as $$
declare d date := (now() at time zone 'Europe/Berlin')::date; n int := 0; v int; w int;
begin
  while n < 3 loop
    d := d - 1;
    if extract(isodow from d) < 6 then n := n + 1; end if;
  end loop;
  update telefonie.anrufe set nummer_klar = null
   where nummer_klar is not null and beginn < (d::timestamp at time zone 'Europe/Berlin');
  get diagnostics v = row_count;
  update telefonie.eingehend set nummer_klar = null
   where nummer_klar is not null and beginn < (d::timestamp at time zone 'Europe/Berlin');
  get diagnostics w = row_count;
  return v + w;
end;
$$;

revoke all on function telefonie.eingehend_aufbereiten(int), telefonie.aufbereiten(int, int),
  telefonie.rohdaten_aufraeumen(), telefonie.klarnummern_loeschen() from public, anon, authenticated;

-- Tageszahlen je Gruppe (ohne Nummern)
create or replace view telefonie.eingang_tageszahlen as
select (beginn at time zone 'Europe/Berlin')::date             as datum,
       gruppe,
       max(gruppe_name)                                         as gruppe_name,
       count(*)                                                 as eingegangen,
       count(*) filter (where angenommen)                       as angenommen,
       coalesce(sum(warte_sek) filter (where angenommen), 0)    as warte_sek_angenommen,
       coalesce(sum(gespraech_sek), 0)                          as gespraech_sek
from telefonie.eingehend
group by 1, 2;
revoke all on telefonie.eingang_tageszahlen from public, anon, authenticated;

create or replace function public.telefonie_eingang(p_von date, p_bis date)
returns table (datum date, gruppe text, gruppe_name text, eingegangen bigint, angenommen bigint,
               warte_sek_angenommen bigint, gespraech_sek bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'Keine Berechtigung'; end if;
  return query
    select t.datum, t.gruppe, t.gruppe_name, t.eingegangen, t.angenommen, t.warte_sek_angenommen, t.gespraech_sek
    from telefonie.eingang_tageszahlen t
    join telefonie.sales_gruppen s on s.nummer = t.gruppe
    where t.datum between p_von and p_bis;
end;
$$;
revoke all on function public.telefonie_eingang(date, date) from public, anon;
grant execute on function public.telefonie_eingang(date, date) to authenticated;

-- Zeitplan: alle 5 Minuten beide Aufbereitungen, danach aufräumen
select cron.unschedule(jobid) from cron.job where jobname = 'telefonie_aufbereiten';
select cron.schedule('telefonie_aufbereiten', '*/5 * * * *',
  $$select telefonie.aufbereiten(3, 20000); select telefonie.eingehend_aufbereiten(20000); select telefonie.rohdaten_aufraeumen();$$);
