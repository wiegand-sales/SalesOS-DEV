-- 57_telefonie_dev_kopie.sql  ·  Sales OS · DEV bekommt die Telefon-Tageszahlen aus Live (ohne Rufnummern)
-- Grund: Die 3CX-Rohdaten liegen nur in Live (zu groß für den kostenlosen DEV-Tarif). DEV holt sich alle 15 Minuten
-- nur die fertigen Tageszahlen je Nebenstelle – damit lässt sich die Board-Anzeige auf DEV testen.
-- Passwörter stehen NICHT in dieser Datei.

-- ===================================================================================================
-- A) LIVE  (Projekt SalesOS, nhudrbulfyampyyxhosv)
-- ===================================================================================================

-- A1 (zusammen): Nur-Lese-Login, der ausschließlich die Tageszahlen sieht
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'telefonie_dev_leser') then
    create role telefonie_dev_leser login noinherit connection limit 2;
  end if;
end $$;
alter role telefonie_dev_leser set statement_timeout = '2min';
grant usage on schema telefonie to telefonie_dev_leser;
grant select on telefonie.tageszahlen_nebenstelle to telefonie_dev_leser;
grant select on telefonie.eingang_tageszahlen      to telefonie_dev_leser;   -- aus 58
grant select on telefonie.sales_gruppen            to telefonie_dev_leser;

-- A2 (allein, NICHT speichern; nur Buchstaben und Ziffern):
-- alter role telefonie_dev_leser password 'PASSWORT-B';

-- ===================================================================================================
-- B) DEV  (Projekt SalesOS DEV, kjlkneodyvfqgaukdjvb)  –  vorher 56_telefonie_nebenstellen.sql in DEV ausführen
-- ===================================================================================================

-- B1 (allein, NICHT speichern; PASSWORT-B von oben):
-- select vault.create_secret(
--   'host=aws-0-eu-central-1.pooler.supabase.com port=5432 dbname=postgres user=telefonie_dev_leser.nhudrbulfyampyyxhosv password=PASSWORT-B sslmode=require',
--   'telefonie_live_tageszahlen',
--   'Nur-Lese-Zugang auf die Telefon-Tageszahlen in Live');

-- B2 (zusammen):
create extension if not exists dblink with schema extensions;
create extension if not exists pg_cron;
create schema if not exists telefonie;
revoke all on schema telefonie from public, anon, authenticated;

create table if not exists telefonie.tageszahlen_nebenstelle (
  datum             date not null,
  nebenstelle       text not null,
  wahlversuche      bigint not null,
  erreicht          bigint not null,
  gespraech_sek_aus bigint not null,
  ein_angenommen    bigint not null,
  gespraech_sek_ein bigint not null,
  primary key (datum, nebenstelle)
);
alter table telefonie.tageszahlen_nebenstelle enable row level security;
revoke all on telefonie.tageszahlen_nebenstelle from public, anon, authenticated;

-- Eingehende Anrufe je Sales-Gruppe und Tag (in Live schon auf Sales-Gruppen gefiltert)
create table if not exists telefonie.eingang_tageszahlen (
  datum                date not null,
  gruppe               text not null,
  gruppe_name          text,
  eingegangen          bigint not null,
  angenommen           bigint not null,
  warte_sek_angenommen bigint not null,
  gespraech_sek        bigint not null,
  primary key (datum, gruppe)
);
alter table telefonie.eingang_tageszahlen enable row level security;
revoke all on telefonie.eingang_tageszahlen from public, anon, authenticated;

create or replace function public.telefonie_eingang(p_von date, p_bis date)
returns table (datum date, gruppe text, gruppe_name text, eingegangen bigint, angenommen bigint,
               warte_sek_angenommen bigint, gespraech_sek bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'Keine Berechtigung'; end if;
  return query
    select t.datum, t.gruppe, t.gruppe_name, t.eingegangen, t.angenommen, t.warte_sek_angenommen, t.gespraech_sek
    from telefonie.eingang_tageszahlen t where t.datum between p_von and p_bis;
end;
$$;
revoke all on function public.telefonie_eingang(date, date) from public, anon;
grant execute on function public.telefonie_eingang(date, date) to authenticated;

create or replace function telefonie.aus_live_holen() returns int
language plpgsql security definer set search_path = '' as $$
declare v text; n int;
begin
  select decrypted_secret into v from vault.decrypted_secrets where name = 'telefonie_live_tageszahlen' limit 1;
  if v is null then raise exception 'Vault-Eintrag telefonie_live_tageszahlen fehlt'; end if;
  delete from telefonie.tageszahlen_nebenstelle;
  insert into telefonie.tageszahlen_nebenstelle
  select * from extensions.dblink(v,
    'select datum, nebenstelle, wahlversuche, erreicht, gespraech_sek_aus, ein_angenommen, gespraech_sek_ein
       from telefonie.tageszahlen_nebenstelle where nebenstelle is not null')
    as t(datum date, nebenstelle text, wahlversuche bigint, erreicht bigint, gespraech_sek_aus bigint,
         ein_angenommen bigint, gespraech_sek_ein bigint);
  get diagnostics n = row_count;

  delete from telefonie.eingang_tageszahlen;
  insert into telefonie.eingang_tageszahlen
  select * from extensions.dblink(v,
    'select t.datum, t.gruppe, t.gruppe_name, t.eingegangen, t.angenommen, t.warte_sek_angenommen, t.gespraech_sek
       from telefonie.eingang_tageszahlen t join telefonie.sales_gruppen s on s.nummer = t.gruppe')
    as t(datum date, gruppe text, gruppe_name text, eingegangen bigint, angenommen bigint,
         warte_sek_angenommen bigint, gespraech_sek bigint);
  return n;
end;
$$;
revoke all on function telefonie.aus_live_holen() from public, anon, authenticated;

-- Gleiche Board-Abfrage wie in Live (nur Staff)
create or replace function public.telefonie_tageszahlen(p_von date, p_bis date)
returns table (employee_id uuid, datum date, wahlversuche bigint, erreicht bigint, gespraech_sek_aus bigint,
               ein_angenommen bigint, gespraech_sek_ein bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'Keine Berechtigung'; end if;
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

select cron.unschedule(jobid) from cron.job where jobname = 'telefonie_aus_live';
select cron.schedule('telefonie_aus_live', '*/15 * * * *', $$select telefonie.aus_live_holen()$$);

-- B3 (Test): sollte eine Zahl > 0 liefern
-- select telefonie.aus_live_holen();
