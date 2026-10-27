-- SCHRITT 1: Rolle "Agent" + Datenbank-Absicherung
-- Staff (Admins & Betrachter aus app_users, Coaches SC/SDM, reine Coaches): alles wie bisher.
-- Agents (Mitarbeiter mit Login, sonst nichts): lesen NUR ihre eigenen Zeilen, schreiben nichts.
-- Nicht eingeloggt (anon): gar nichts. Der Daten-Sync nutzt den Service-Key und ist nicht betroffen.

begin;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    exists (select 1 from public.app_users a
            where a.auth_user_id::text = auth.uid()::text
               or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    or exists (select 1 from public.employees e
               where e.auth_user_id::text = auth.uid()::text
                 and (coalesce(e.is_pure_coach, false) or e.role in ('SC','SDM')))
  );
$$;

-- Agent = eingeloggter Mitarbeiter, der kein Staff ist
create or replace function public.is_agent() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and not public.is_staff()
     and exists (select 1 from public.employees e where e.auth_user_id::text = auth.uid()::text);
$$;

-- Gehört dieser Mitarbeiter-Datensatz dem eingeloggten Agent? (typunabhängig über ::text)
create or replace function public.owns_employee(eid text) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.employees e
    where e.id::text = eid and e.auth_user_id::text = auth.uid()::text);
$$;

revoke all on function public.is_staff() from public;
revoke all on function public.is_agent() from public;
revoke all on function public.owns_employee(text) from public;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_agent() to authenticated;
grant execute on function public.owns_employee(text) to authenticated;

-- Alle bisherigen Regeln der public-Tabellen entfernen (sie erlaubten jedem Login alles,
-- bei zielvereinbarung sogar ohne Login)
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Staff: voller Zugriff auf jede Tabelle (wie bisher)
do $$
declare t text;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy staff_all on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
end $$;

-- Agents: nur lesen, nur eigene Daten
create policy agent_select_own on public.employees            for select to authenticated using (public.is_agent() and public.owns_employee(id::text));
create policy agent_select_own on public.performance          for select to authenticated using (public.is_agent() and public.owns_employee(employee_id::text));
create policy agent_select_own on public.zielvereinbarung     for select to authenticated using (public.is_agent() and public.owns_employee(employee_id::text));
create policy agent_select_own on public.employee_kpi_targets for select to authenticated using (public.is_agent() and public.owns_employee(employee_id::text));
-- Globale KPI-Ziele sind keine personenbezogenen Daten
create policy agent_select     on public.kpi_targets          for select to authenticated using (public.is_agent());
-- Aus den Einstellungen nur der Zeitpunkt des letzten Syncs
create policy agent_select_sync on public.settings            for select to authenticated using (public.is_agent() and key = 'ftpLastSync');

commit;
