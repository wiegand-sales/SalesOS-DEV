-- 20_kalender_abwesenheiten.sql  ·  Sales OS · Kalender
-- NUR im DEV-Projekt (kjlkneodyvfqgaukdjvb) ausführen. Live erst nach Freigabe.
-- Kann mehrfach ausgeführt werden.

-- 1) Abwesenheiten -------------------------------------------------------------
create table if not exists public.absences (
  id               uuid primary key default gen_random_uuid(),
  employee_id      uuid not null references public.employees(id) on delete cascade,
  art              text not null check (art in ('urlaub','flex','ausgleich','krank')),
  von              date not null,
  bis              date not null,
  halb             boolean not null default false,
  status           text not null default 'offen'
                   check (status in ('offen','genehmigt','abgelehnt','storniert')),
  verschoben_von   text,              -- z. B. '30.11.–04.12.' bei Verschiebungen
  notiz            text,
  eingereicht_am   timestamptz not null default now(),
  eingereicht_von  text,              -- Name der Person, die eingetragen/beantragt hat
  entschieden_von  text,
  entschieden_am   timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (bis >= von),
  check (not halb or von = bis)
);
create index if not exists absences_emp_idx  on public.absences(employee_id);
create index if not exists absences_von_idx  on public.absences(von, bis);

-- 2) Urlaubskonto je Mitarbeiter (pro Jahr) ------------------------------------
-- Beispiel: {"2026":{"anspruch":28,"flex":5,"uebertrag":1,"vorher_genommen":15}}
-- vorher_genommen = Urlaubstage 2026, die vor dem Start des Kalenders genommen wurden
alter table public.employees add column if not exists urlaub jsonb not null default '{}'::jsonb;

-- 3) Rechte (RLS) ---------------------------------------------------------------
alter table public.absences enable row level security;

-- eigener Mitarbeiter-Datensatz des angemeldeten Agents
create or replace function public.my_employee_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.employees where auth_user_id = auth.uid() limit 1
$$;

drop policy if exists abs_select on public.absences;
create policy abs_select on public.absences for select
  using ( public.is_editor() or employee_id = public.my_employee_id() );

drop policy if exists abs_insert on public.absences;
create policy abs_insert on public.absences for insert
  with check (
    public.is_editor()
    or ( employee_id = public.my_employee_id()
         and art in ('urlaub','flex') and status = 'offen' )
  );

drop policy if exists abs_update on public.absences;
create policy abs_update on public.absences for update
  using ( public.is_editor() ) with check ( public.is_editor() );

-- Agents dürfen eigene, noch offene Anträge zurückziehen
drop policy if exists abs_delete on public.absences;
create policy abs_delete on public.absences for delete
  using ( public.is_editor()
          or ( employee_id = public.my_employee_id() and status = 'offen' ) );

-- 4) Team-Sicht ohne Grund (für Agents und Betrachter) -------------------------
-- Krank und Ausgleichstag erscheinen nur als „abwesend“, keine Notizen.
create or replace function public.absences_team(p_von date, p_bis date)
returns table (employee_id uuid, art text, von date, bis date, halb boolean, status text)
language sql stable security definer set search_path = public as $$
  select a.employee_id,
         case when a.art in ('krank','ausgleich') then 'abwesend'
              when a.art = 'flex' then 'urlaub' else a.art end,
         a.von, a.bis, a.halb, a.status
  from public.absences a
  where a.status in ('offen','genehmigt')
    and a.bis >= p_von and a.von <= p_bis
    and auth.uid() is not null
$$;
grant execute on function public.absences_team(date, date) to authenticated;

-- 5) updated_at automatisch -----------------------------------------------------
create or replace function public.absences_touch() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists absences_touch on public.absences;
create trigger absences_touch before update on public.absences
  for each row execute function public.absences_touch();
