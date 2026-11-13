-- 35_provision_optional.sql
-- Spalte „Optional“ der Provisionsübersicht: Zusatzbetrag je Mitarbeiter und Monat, ohne Abzug auf die Provision.
-- Eigene Tabelle statt Einstellungs-Block: lesen nach der Gehaltsregel (can_see_salary), schreiben nur Admins.
-- Übernimmt vorhandene Werte aus settings.provisionExtra und entfernt danach den Block.
-- In DEV und Live ausführen, mehrfach unbedenklich.

begin;

do $$
declare t text;
begin
  select format_type(atttypid, atttypmod) into t from pg_attribute
  where attrelid = 'public.employees'::regclass and attname = 'id';
  execute format('create table if not exists public.provision_extra (
      employee_id %s not null references public.employees(id) on delete cascade,
      monat text not null check (monat ~ ''^\d{4}-\d{2}$''),
      betrag numeric not null check (betrag >= 0),
      geaendert_von text,
      geaendert_am timestamptz not null default now(),
      primary key (employee_id, monat))', t);
end $$;

alter table public.provision_extra enable row level security;
grant select, insert, update, delete on public.provision_extra to authenticated;
revoke all on public.provision_extra from anon;

drop policy if exists pe_select on public.provision_extra;
drop policy if exists pe_write  on public.provision_extra;
create policy pe_select on public.provision_extra for select to authenticated
  using (public.can_see_salary(employee_id::text));
create policy pe_write on public.provision_extra for all to authenticated
  using ((select public.board_role()) = 'admin')
  with check ((select public.board_role()) = 'admin');

-- Übernahme aus dem bisherigen Einstellungs-Block
insert into public.provision_extra (employee_id, monat, betrag, geaendert_von)
select e.id, m.key, (v.value)::text::numeric, 'Übernahme aus Einstellungen'
from public.settings s
cross join lateral jsonb_each((s.value)::jsonb) m
cross join lateral jsonb_each(m.value) v
join public.employees e on e.id::text = v.key
where s.key = 'provisionExtra' and (v.value)::text::numeric > 0
on conflict (employee_id, monat) do nothing;

delete from public.settings where key = 'provisionExtra';

commit;

select (select count(*) from public.provision_extra) as betraege_gespeichert,
       (select count(*) from public.settings where key = 'provisionExtra') as alter_block_noch_da
