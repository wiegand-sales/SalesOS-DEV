-- Kommentare zu Mitarbeitern dauerhaft speichern (Coaching-Historie, Verlauf im Mitarbeiterprofil)
-- Zuerst im DEV-Projekt ausführen, nach Freigabe im Live-Projekt.
-- Rechte wie bei allen anderen Tabellen: Staff liest, Admins und Coaches schreiben, Betrachter nur lesen, Agents gar nicht.
begin;

create table if not exists public.employee_comments (
  id            uuid primary key default gen_random_uuid(),
  employee_id   text not null,
  date          date not null default current_date,
  comment_type  text not null default 'diverses' check (comment_type in ('skill','will','result','diverses')),
  note          text not null,
  author        text,
  created_by    uuid default auth.uid(),
  created_at    timestamptz not null default now()
);
create index if not exists employee_comments_employee_idx on public.employee_comments (employee_id, date desc);

alter table public.employee_comments enable row level security;
drop policy if exists staff_read   on public.employee_comments;
drop policy if exists editor_write on public.employee_comments;
create policy staff_read   on public.employee_comments for select to authenticated using (public.is_staff());
create policy editor_write on public.employee_comments for all    to authenticated using (public.is_editor()) with check (public.is_editor());

commit;

-- Kontrolle: sollte eine leere Tabelle mit 0 Zeilen zeigen
select count(*) as kommentare from public.employee_comments;
