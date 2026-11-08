-- 25_ziel_festschreiben.sql  ·  Sales OS · Zielvereinbarung
-- Erst DEV (kjlkneodyvfqgaukdjvb), Live erst nach Freigabe. Kann mehrfach ausgeführt werden.
-- Bestehende Tabellen werden NICHT verändert oder gelöscht. Es kommen nur Sicherungen und neue Tabellen dazu.

-- 1) Sicherung des heutigen Stands (vollständige Kopie, bleibt dauerhaft liegen)
create table if not exists public.zielvereinbarung_backup_20261108 as select * from public.zielvereinbarung;
create table if not exists public.settings_ziel_nl_backup_20261108 as select * from public.settings where key like 'ziel_nl_%';
alter table public.zielvereinbarung_backup_20261108 enable row level security;   -- ohne Policy: nur im Supabase-Dashboard lesbar
alter table public.settings_ziel_nl_backup_20261108 enable row level security;

-- Kontrolle: beide Zahlen müssen gleich sein
select (select count(*) from public.zielvereinbarung) as zielvereinbarung,
       (select count(*) from public.zielvereinbarung_backup_20261108) as sicherung;

-- 2) Festgeschriebene Monate (Stand zum Zeitpunkt des Festschreibens)
create table if not exists public.ziel_festschreibung (
  month               text primary key,          -- 'YYYY-MM'
  festgeschrieben_am  timestamptz not null default now(),
  festgeschrieben_von text,
  ziel_nl             numeric,
  ziel_marge          numeric,
  ziel_os             numeric,
  snapshot            jsonb not null default '{}'::jsonb   -- je Mitarbeiter: Tage je KW, Opt./Tag, Marge/Opt., Ziel, Ziel OS
);
alter table public.ziel_festschreibung enable row level security;
drop policy if exists zf_select on public.ziel_festschreibung;
create policy zf_select on public.ziel_festschreibung for select using ( public.is_staff() );
drop policy if exists zf_write on public.ziel_festschreibung;
create policy zf_write on public.ziel_festschreibung for all using ( public.is_admin() ) with check ( public.is_admin() );

-- 3) Protokoll: jede Änderung an einem festgeschriebenen Monat und an Ziel NL
create table if not exists public.ziel_protokoll (
  id          uuid primary key default gen_random_uuid(),
  month       text not null,
  employee_id uuid,
  feld        text not null,
  alt         text,
  neu         text,
  grund       text,
  von         text,
  am          timestamptz not null default now()
);
create index if not exists ziel_protokoll_month_idx on public.ziel_protokoll(month);
alter table public.ziel_protokoll enable row level security;
drop policy if exists zp_select on public.ziel_protokoll;
create policy zp_select on public.ziel_protokoll for select using ( public.is_staff() );
drop policy if exists zp_insert on public.ziel_protokoll;
create policy zp_insert on public.ziel_protokoll for insert with check ( public.is_editor() );
-- kein Update und kein Löschen: das Protokoll bleibt, wie es geschrieben wurde

-- 4) Sperre in der Datenbank: festgeschriebene Monate dürfen nur Admins ändern
create or replace function public.ziel_lock_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare m text;
begin
  m := coalesce(new.month, old.month);
  if exists (select 1 from public.ziel_festschreibung f where f.month = m) and not public.is_admin() then
    raise exception 'Der Monat % ist festgeschrieben. Nur Admins dürfen ihn ändern.', m;
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists ziel_lock_guard on public.zielvereinbarung;
create trigger ziel_lock_guard before insert or update or delete on public.zielvereinbarung
  for each row execute function public.ziel_lock_guard();
