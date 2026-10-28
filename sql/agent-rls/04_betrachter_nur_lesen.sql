-- Betrachter duerfen alles sehen, aber nichts aendern – durchgesetzt in der Datenbank, nicht nur im Board.
-- Admins und Coaches: lesen und schreiben wie bisher. Agents: unveraendert (nur eigene Zeilen lesen).
-- Ausnahme: Zugriffe (activity_log) darf jeder eingeloggte Staff-Nutzer protokollieren, auch Betrachter.
begin;

create or replace function public.is_editor() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_staff() and not exists (
    select 1 from public.app_users a
    where (a.auth_user_id::text = auth.uid()::text or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
      and a.role = 'viewer');
$$;
revoke all on function public.is_editor() from public;
grant execute on function public.is_editor() to authenticated;

do $$
declare t text;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' loop
    execute format('drop policy if exists staff_all on public.%I', t);
    execute format('drop policy if exists staff_read on public.%I', t);
    execute format('drop policy if exists editor_write on public.%I', t);
    execute format('create policy staff_read on public.%I for select to authenticated using (public.is_staff())', t);
    execute format('create policy editor_write on public.%I for all to authenticated using (public.is_editor()) with check (public.is_editor())', t);
  end loop;
end $$;

drop policy if exists staff_log_insert on public.activity_log;
create policy staff_log_insert on public.activity_log for insert to authenticated with check (public.is_staff());

commit;
