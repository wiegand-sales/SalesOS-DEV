-- 63_telefonate_board.sql  ·  Sales OS · Menü „Telefonate“: Abfrage fürs Board (DEV UND Live, gleich)
-- Eine Abfrage public.telefonate_daten(art, von, bis, param) für alle Boxen. Sie prüft die Rechte (nur Staff),
-- schränkt SDL auf sein Team ein, übersetzt Nebenstelle ↔ Mitarbeiter über public.telefonie_nebenstellen und ruft
-- die Rechenfunktionen telefonie.r_* auf (Live: 61, DEV: Stellvertreter aus 62).
-- param (jsonb): grenze (Mailbox-Grenze s, Standard 10), fenster (Rückruf-Fenster Tage, 3), gruppierung
-- (tag|woche|monat), richtung (aus|ein), versuch (alle|1|2|3|4), employee_ids (Liste, optional).
-- Kann mehrfach ausgeführt werden.

-- Nebenstellen der gewählten Mitarbeiter (gültig im Zeitraum); null = alle
create or replace function telefonie.b_nst(p_emp uuid[], p_von date, p_bis date) returns text[]
language sql stable security definer set search_path = '' as $$
  select case when p_emp is null then null else
    coalesce((select array_agg(distinct m.nebenstelle) from public.telefonie_nebenstellen m
              where m.employee_id = any (p_emp) and m.gueltig_ab <= p_bis
                and (m.gueltig_bis is null or m.gueltig_bis >= p_von)), array['-']) end
$$;

-- SDL: eigene Person + sdl_team; sonst null (= alle)
create or replace function telefonie.b_sdl_team() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select case when e.role = 'SDL' and public.board_role() = 'coach' then
    array(select e.id union select x::uuid from jsonb_array_elements_text(coalesce(e.sdl_team, '[]'::jsonb)) x)
  end
  from public.employees e where e.auth_user_id::text = auth.uid()::text limit 1
$$;

create or replace function public.telefonate_daten(p_art text, p_von date, p_bis date, p_param jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  g int := coalesce((p_param->>'grenze')::int, 10);
  f int := coalesce((p_param->>'fenster')::int, 3);
  sdl uuid[] := telefonie.b_sdl_team();
  emp uuid[];
  r jsonb;
begin
  if not public.is_staff() then raise exception 'Keine Berechtigung'; end if;
  if p_param ? 'employee_ids' and jsonb_typeof(p_param->'employee_ids') = 'array' then
    emp := array(select x::uuid from jsonb_array_elements_text(p_param->'employee_ids') x);
  end if;
  if sdl is not null then
    emp := case when emp is null then sdl else array(select unnest(emp) intersect select unnest(sdl)) end;
  end if;

  if p_art = 'agenten' then
    -- je Mitarbeiter (mehrere Nebenstellen werden addiert)
    with roh as (select jsonb_array_elements(telefonie.r_agenten(p_von, p_bis, g)) j),
    z as (
      select m.employee_id id, (j->>'wv')::int wv, (j->>'err')::int err, (j->>'mb')::int mb, (j->>'ne')::int ne,
             (j->>'wg')::int wg, (j->>'klingel_ne')::numeric klingel, (j->>'gz_aus')::int gz_aus,
             (j->>'ein_ang')::int ein_ang, (j->>'gz_ein')::int gz_ein
      from roh join public.telefonie_nebenstellen m on m.nebenstelle = roh.j->>'nst'
        and m.gueltig_ab <= p_bis and (m.gueltig_bis is null or m.gueltig_bis >= p_von)
      where emp is null or m.employee_id = any (emp))
    select coalesce(jsonb_agg(jsonb_build_object('employee_id', id, 'wv', wv, 'err', err, 'mb', mb, 'ne', ne, 'wg', wg,
             'klingel_ne', klingel, 'gz_aus', gz_aus, 'ein_ang', ein_ang, 'gz_ein', gz_ein)), '[]'::jsonb) into r
    from (select id, sum(wv) wv, sum(err) err, sum(mb) mb, sum(ne) ne, sum(wg) wg,
                 round(sum(klingel * ne) / nullif(sum(ne) filter (where klingel is not null), 0)) klingel,
                 sum(gz_aus) gz_aus, sum(ein_ang) ein_ang, sum(gz_ein) gz_ein
          from z group by id) x;

  elsif p_art = 'versuche' then
    r := telefonie.r_versuche(p_von, p_bis, g, f, telefonie.b_nst(emp, p_von, p_bis));
  elsif p_art = 'trichter' then
    r := telefonie.r_trichter(p_von, p_bis, g, f);
  elsif p_art = 'eingang' then
    r := telefonie.r_eingang(p_von, p_bis, coalesce(p_param->>'gruppierung', 'tag'));
  elsif p_art = 'eingang_kacheln' then
    r := telefonie.r_eingang_kacheln(p_von, p_bis, f);
    -- „angenommen von“: Nebenstelle → Mitarbeiter
    r := jsonb_set(r, '{von}', coalesce((
      select jsonb_agg(jsonb_build_object('employee_id', m.employee_id, 'n', (v->>'n')::int))
      from jsonb_array_elements(r->'von') v
      join public.telefonie_nebenstellen m on m.nebenstelle = v->>'nst'
        and m.gueltig_ab <= p_bis and (m.gueltig_bis is null or m.gueltig_bis >= p_von)), '[]'::jsonb));
  elsif p_art = 'heatmap' then
    r := telefonie.r_heatmap(p_von, p_bis, coalesce(p_param->>'richtung', 'aus'), coalesce(p_param->>'versuch', 'alle'),
                             g, f, telefonie.b_nst(emp, p_von, p_bis));
  else
    raise exception 'Unbekannte Auswertung: %', p_art;
  end if;
  return r;
end;
$$;

revoke all on function telefonie.b_nst(uuid[], date, date), telefonie.b_sdl_team() from public, anon, authenticated;
revoke all on function public.telefonate_daten(text, date, date, jsonb) from public, anon;
grant execute on function public.telefonate_daten(text, date, date, jsonb) to authenticated;
