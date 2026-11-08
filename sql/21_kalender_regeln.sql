-- 21_kalender_regeln.sql  ·  Sales OS · Kalender
-- Halber Tag: Vormittag oder Nachmittag. Erst DEV, Live nach Freigabe. Kann mehrfach ausgeführt werden.
alter table public.absences add column if not exists halb_teil text;
alter table public.absences drop constraint if exists absences_halb_teil_check;
alter table public.absences add constraint absences_halb_teil_check check (halb_teil is null or halb_teil in ('vm','nm'));
-- Die Kalender-Regeln (Einstellungen › Kalender) liegen in der bestehenden Tabelle settings (Schlüssel kalenderRules).
