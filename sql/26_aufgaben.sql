-- 26_aufgaben.sql  ·  Sales OS · Aufgaben
-- Erst DEV, Live nach Freigabe. Kann mehrfach ausgeführt werden. Bestehende Tabellen bleiben unverändert.

-- Zuständigkeit je Aufgabe (wenn per Kanban neu zugewiesen). Schlüssel = Aufgaben-Schlüssel aus dem Board.
create table if not exists public.aufgaben_meta (
  key         text primary key,
  assignee    text,            -- 'emp:<id>' oder 'admin'
  updated_at  timestamptz not null default now(),
  updated_by  text
);
alter table public.aufgaben_meta enable row level security;
drop policy if exists am_select on public.aufgaben_meta;
create policy am_select on public.aufgaben_meta for select using ( public.is_staff() );
drop policy if exists am_write on public.aufgaben_meta;
create policy am_write on public.aufgaben_meta for all using ( public.is_editor() ) with check ( public.is_editor() );

-- Kommentare zu Aufgaben
create table if not exists public.aufgaben_kommentare (
  id    uuid primary key default gen_random_uuid(),
  key   text not null,
  text  text not null,
  von   text,
  am    timestamptz not null default now()
);
create index if not exists aufgaben_kommentare_key_idx on public.aufgaben_kommentare(key);
alter table public.aufgaben_kommentare enable row level security;
drop policy if exists ak_select on public.aufgaben_kommentare;
create policy ak_select on public.aufgaben_kommentare for select using ( public.is_staff() );
drop policy if exists ak_insert on public.aufgaben_kommentare;
create policy ak_insert on public.aufgaben_kommentare for insert with check ( public.is_editor() );
