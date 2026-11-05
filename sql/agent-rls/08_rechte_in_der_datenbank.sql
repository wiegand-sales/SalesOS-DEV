-- Sales OS · Punkt 4: Rechte auch in der Datenbank durchsetzen
-- Bisher: Die Datenbank kannte nur „Staff darf lesen“, „Admin/Coach dürfen alles schreiben“, „Betrachter nichts“.
-- Neu:
--   1. Die Rolle kommt aus EINER Quelle: app_users (Admin/Betrachter) oder employees.board_role,
--      sonst wie bisher aus der Position (SC/SDM bzw. „reiner Coach“ = Coach, sonst Sales Agent).
--      → wichtig für Punkt 2: Ohne diese Datei behandelt die Datenbank z. B. einen SE mit Board-Rolle „Coach“ noch als Agent.
--   2. Was ein Coach schreiben darf, richtet sich nach „Rollen & Rechte“ im Board (settings.rolePermissions).
--   3. Bewertungen/Kommentare/Calls nachträglich ändern oder löschen nur mit dem Recht
--      „Bewertungen & Kommentare nachträglich ändern oder löschen“.
-- Voraussetzung: 04_betrachter_nur_lesen.sql und 07_board_rolle.sql sind ausgeführt.
-- ERST IM DEV-PROJEKT ausführen und mit einem Coach-Login testen, dann im Live-Projekt.
-- Rückgängig machen: 04_betrachter_nur_lesen.sql erneut ausführen (stellt die bisherigen Regeln wieder her).

begin;

-- 1) Eine Rolle pro Login
create or replace function public.board_role() returns text
language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then null
    when exists (select 1 from public.app_users a
                 where a.auth_user_id::text = auth.uid()::text
                    or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
      then (select case when a.role = 'admin' then 'admin' else 'viewer' end
            from public.app_users a
            where a.auth_user_id::text = auth.uid()::text
               or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
            order by (a.role = 'admin') desc limit 1)
    else (select coalesce(e.board_role,
                          case when coalesce(e.is_pure_coach, false) or e.role in ('SC','SDM') then 'coach' else 'agent' end)
          from public.employees e where e.auth_user_id::text = auth.uid()::text limit 1)
  end;
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.board_role() in ('admin','coach','viewer'), false);
$$;

create or replace function public.is_editor() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.board_role() in ('admin','coach'), false);
$$;

-- 2) Darf der Login in diesem Bereich schreiben? (Admin immer, Coach laut „Rollen & Rechte“, Standard „Bearbeiten“)
create or replace function public.can_write(area text) returns boolean
language sql stable security definer set search_path = public as $$
  select case public.board_role()
    when 'admin' then true
    when 'coach' then coalesce(
      (select (case when jsonb_typeof(s.value::jsonb) = 'string' then (s.value::jsonb #>> '{}')::jsonb else s.value::jsonb end) -> 'coach' ->> area
       from public.settings s where s.key = 'rolePermissions' limit 1),
      'E') = 'E'
    else false
  end;
$$;

-- 3) Darf der Login Bewertungen/Kommentare nachträglich ändern oder löschen?
create or replace function public.can_edit_history() returns boolean
language sql stable security definer set search_path = public as $$
  select public.can_write('histEdit');
$$;

revoke all on function public.board_role() from public;
revoke all on function public.can_write(text) from public;
revoke all on function public.can_edit_history() from public;
grant execute on function public.board_role() to authenticated;
grant execute on function public.can_write(text) to authenticated;
grant execute on function public.can_edit_history() to authenticated;

-- Schreibregeln je Bereich. Lesen (staff_read) bleibt unverändert.
-- Tabellen ohne Zuordnung behalten editor_write (Admin + Coach).
do $$
declare m record;
begin
  for m in select * from (values
      ('zielvereinbarung','ziel',false), ('goals','ziel',false), ('kpi_targets','ziel',false), ('employee_kpi_targets','ziel',false),
      ('protocols','coaching',false), ('tasks','coaching',false),
      ('call_ratings','qa',true), ('call_rating_scores','qa',false),
      ('reviews','dev',true), ('review_kpis','dev',false), ('employee_comments','dev',true),
      ('employees','stammdaten',false), ('employee_history','stammdaten',false)
    ) as t(tbl, area, hist)
  loop
    if to_regclass('public.'||m.tbl) is null then continue; end if;
    execute format('drop policy if exists editor_write on public.%I', m.tbl);
    execute format('drop policy if exists area_insert on public.%I', m.tbl);
    execute format('drop policy if exists area_update on public.%I', m.tbl);
    execute format('drop policy if exists area_delete on public.%I', m.tbl);
    execute format('create policy area_insert on public.%I for insert to authenticated with check (public.can_write(%L))', m.tbl, m.area);
    if m.hist then
      -- Neu anlegen: Bereichsrecht. Nachträglich ändern/löschen: zusätzlich das Historien-Recht.
      execute format('create policy area_update on public.%I for update to authenticated using (public.can_write(%L) and public.can_edit_history()) with check (public.can_write(%L) and public.can_edit_history())', m.tbl, m.area, m.area);
      execute format('create policy area_delete on public.%I for delete to authenticated using (public.can_write(%L) and public.can_edit_history())', m.tbl, m.area);
    else
      execute format('create policy area_update on public.%I for update to authenticated using (public.can_write(%L)) with check (public.can_write(%L))', m.tbl, m.area, m.area);
      execute format('create policy area_delete on public.%I for delete to authenticated using (public.can_write(%L))', m.tbl, m.area);
    end if;
  end loop;
end $$;

commit;

-- Kontrolle: welche Rolle hat der aktuelle Login? (im SQL Editor ist das „null“, im Board die echte Rolle)
select public.board_role() as rolle_im_sql_editor;
