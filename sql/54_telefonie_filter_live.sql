-- 54_telefonie_filter_live.sql  ·  Sales OS · Nur Anrufe ab 01.01.2026 behalten
-- NUR im Live-Projekt (nhudrbulfyampyyxhosv), nachdem die 3CX ihre Tabellen in telefonie_3cx angelegt hat.
--
--   · Verbindung zur 3CX-Datenbank verschlüsselt im Supabase-Vault ablegen (Passwort steht nie in einer Datei).
--   · telefonie.tcx_exec(): führt Befehle in telefonie_3cx aus – nur für die Datenbank selbst, nicht über die API.
--   · Filter in telefonie_3cx: Anrufabschnitte vor dem 01.01.2026 werden beim Eintreffen verworfen,
--     die Gebührentabelle (cdrbilling) wird gar nicht gespeichert (brauchen wir nicht).
--   · Schon angekommene alte Zeilen löschen und Platz freigeben.

-- =====================  TEIL 1  (allein, Passwort einsetzen, NICHT speichern)  =====================
-- select vault.create_secret(
--   'host=aws-0-eu-central-1.pooler.supabase.com port=5432 dbname=telefonie_3cx user=threecx_writer.nhudrbulfyampyyxhosv password=PASSWORT sslmode=require',
--   'telefonie_3cx_verbindung',
--   '3CX-Datenbank, nur für die Aufbereitung im Bereich telefonie');

-- =====================  TEIL 2  (zusammen ausführen)  =====================
create extension if not exists dblink with schema extensions;

create or replace function telefonie.tcx_verbindung() returns text
language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'telefonie_3cx_verbindung' limit 1;
$$;

create or replace function telefonie.tcx_exec(befehl text) returns text
language plpgsql security definer set search_path = '' as $$
declare v text := telefonie.tcx_verbindung();
begin
  if v is null then raise exception 'Vault-Eintrag telefonie_3cx_verbindung fehlt'; end if;
  return extensions.dblink_exec(v, befehl);
end;
$$;

revoke all on function telefonie.tcx_verbindung() from public, anon, authenticated;
revoke all on function telefonie.tcx_exec(text)   from public, anon, authenticated;

-- Filter in der 3CX-Datenbank anlegen
select telefonie.tcx_exec($f$
  create or replace function public.nur_ab_2026() returns trigger language plpgsql as $t$
  begin
    return null;   -- Zeile verwerfen (Aufruf nur, wenn die WHEN-Bedingung des Triggers zutrifft)
  end;
  $t$;
$f$);
select telefonie.tcx_exec('drop trigger if exists nur_ab_2026 on public.cdroutput');
select telefonie.tcx_exec($f$
  create trigger nur_ab_2026 before insert on public.cdroutput
  for each row when (new.cdr_started_at < timestamptz '2026-01-01 00:00:00+01')
  execute function public.nur_ab_2026();
$f$);
select telefonie.tcx_exec('drop trigger if exists keine_gebuehren on public.cdrbilling');
select telefonie.tcx_exec($f$
  create trigger keine_gebuehren before insert on public.cdrbilling
  for each row execute function public.nur_ab_2026();
$f$);

-- Schon angekommene alte Zeilen löschen
select telefonie.tcx_exec($$delete from public.cdroutput where cdr_started_at < timestamptz '2026-01-01 00:00:00+01'$$);
select telefonie.tcx_exec('truncate public.cdrbilling');

-- =====================  TEIL 3  (allein ausführen, gibt den Platz frei)  =====================
-- select telefonie.tcx_exec('vacuum full public.cdroutput');

-- =====================  KONTROLLE  =====================
-- select pg_size_pretty(pg_database_size('telefonie_3cx'));
-- select * from extensions.dblink(telefonie.tcx_verbindung(),
--   'select min(cdr_started_at)::text, max(cdr_started_at)::text, count(*)::text from public.cdroutput')
--   as t(von text, bis text, zeilen text);
