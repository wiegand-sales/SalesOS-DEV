-- SCHRITT 2 (Test, ändert nichts): simuliert einen Agent-Login.
-- <AGENT-USER-ID> durch die User-ID des Test-Agents aus Authentication → Users ersetzen.
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','<AGENT-USER-ID>','role','authenticated')::text, true);
select 'employees'        as tabelle, count(*) from public.employees
union all select 'performance (Mitarbeiter)', count(distinct employee_id) from public.performance
union all select 'zielvereinbarung', count(*) from public.zielvereinbarung
union all select 'protocols',  count(*) from public.protocols
union all select 'app_users',  count(*) from public.app_users
union all select 'admin_secrets', count(*) from public.admin_secrets;
rollback;
-- Erwartet: employees 1, performance 1 Mitarbeiter, zielvereinbarung nur eigene Zeilen, alles andere 0.
