-- 62_telefonate_dev_proxy.sql  ·  Sales OS · Menü „Telefonate“ in DEV (kjlkneodyvfqgaukdjvb)
-- DEV hat keine Einzelanrufe. Diese Stellvertreter rufen die gleichnamigen Rechenfunktionen in Live auf
-- (Login telefonie_dev_leser, Verbindung aus dem DEV-Vault-Eintrag telefonie_live_tageszahlen aus 57).
-- Danach in DEV 63_telefonate_board.sql ausführen.
--
-- VORHER in LIVE (einmalig, Peter):
--   grant execute on function telefonie.r_agenten(date, date, int), telefonie.r_versuche(date, date, int, int, text[]),
--     telefonie.r_trichter(date, date, int, int), telefonie.r_eingang(date, date, text),
--     telefonie.r_eingang_kacheln(date, date, int), telefonie.r_heatmap(date, date, text, text, int, int, text[])
--     to telefonie_dev_leser;
--   grant usage on schema extensions to telefonie_dev_leser;

create extension if not exists dblink with schema extensions;
create schema if not exists telefonie;
revoke all on schema telefonie from public, anon, authenticated;

create or replace function telefonie.r_live(p_sql text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v text; r jsonb;
begin
  select decrypted_secret into v from vault.decrypted_secrets where name = 'telefonie_live_tageszahlen' limit 1;
  if v is null then raise exception 'Vault-Eintrag telefonie_live_tageszahlen fehlt'; end if;
  select t.x into r from extensions.dblink(v, p_sql) as t(x jsonb);
  return r;
end;
$$;

create or replace function telefonie.r_agenten(p_von date, p_bis date, p_grenze int default 10) returns jsonb
language sql security definer set search_path = '' as $$
  select telefonie.r_live(format('select telefonie.r_agenten(%L::date, %L::date, %s)', p_von, p_bis, p_grenze)) $$;

create or replace function telefonie.r_versuche(p_von date, p_bis date, p_grenze int default 10, p_fenster int default 3,
                                                p_nst text[] default null) returns jsonb
language sql security definer set search_path = '' as $$
  select telefonie.r_live(format('select telefonie.r_versuche(%L::date, %L::date, %s, %s, %L::text[])',
                                 p_von, p_bis, p_grenze, p_fenster, p_nst)) $$;

create or replace function telefonie.r_trichter(p_von date, p_bis date, p_grenze int default 10, p_fenster int default 3) returns jsonb
language sql security definer set search_path = '' as $$
  select telefonie.r_live(format('select telefonie.r_trichter(%L::date, %L::date, %s, %s)', p_von, p_bis, p_grenze, p_fenster)) $$;

create or replace function telefonie.r_eingang(p_von date, p_bis date, p_gruppierung text default 'tag') returns jsonb
language sql security definer set search_path = '' as $$
  select telefonie.r_live(format('select telefonie.r_eingang(%L::date, %L::date, %L)', p_von, p_bis, p_gruppierung)) $$;

create or replace function telefonie.r_eingang_kacheln(p_von date, p_bis date, p_fenster int default 3) returns jsonb
language sql security definer set search_path = '' as $$
  select telefonie.r_live(format('select telefonie.r_eingang_kacheln(%L::date, %L::date, %s)', p_von, p_bis, p_fenster)) $$;

create or replace function telefonie.r_heatmap(p_von date, p_bis date, p_richtung text default 'aus',
  p_versuch text default 'alle', p_grenze int default 10, p_fenster int default 3, p_nst text[] default null) returns jsonb
language sql security definer set search_path = '' as $$
  select telefonie.r_live(format('select telefonie.r_heatmap(%L::date, %L::date, %L, %L, %s, %s, %L::text[])',
                                 p_von, p_bis, p_richtung, p_versuch, p_grenze, p_fenster, p_nst)) $$;

revoke all on function telefonie.r_live(text), telefonie.r_agenten(date, date, int),
  telefonie.r_versuche(date, date, int, int, text[]), telefonie.r_trichter(date, date, int, int),
  telefonie.r_eingang(date, date, text), telefonie.r_eingang_kacheln(date, date, int),
  telefonie.r_heatmap(date, date, text, text, int, int, text[]) from public, anon, authenticated;
