-- Sales OS · Lücke schließen: Einstellungen und Benutzerliste darf nur ein Admin ändern
-- Bisher durften Coaches (über die Datenbank) in „settings“ und „app_users“ schreiben – damit hätte sich
-- jemand per direkter Datenbank-Verbindung selbst Admin-Rechte geben können. Im Board ging das nie.
-- Ausnahme: Die NL-Marge-Ziele der Zielplanung (Schlüssel „ziel_nl_…“) dürfen Coaches mit Recht „Zielvereinbarung & Ziele“ weiter speichern.
-- Voraussetzung: 08_rechte_in_der_datenbank.sql ist ausgeführt. Erst DEV, dann Live.
begin;

-- Benutzerliste (Admins/Betrachter): schreiben nur Admins
drop policy if exists editor_write on public.app_users;
drop policy if exists admin_write on public.app_users;
create policy admin_write on public.app_users for all to authenticated
  using (public.board_role() = 'admin') with check (public.board_role() = 'admin');

-- Einstellungen: schreiben nur Admins – außer den NL-Marge-Zielen der Zielplanung
drop policy if exists editor_write on public.settings;
drop policy if exists admin_write on public.settings;
drop policy if exists coach_ziel_write on public.settings;
create policy admin_write on public.settings for all to authenticated
  using (public.board_role() = 'admin') with check (public.board_role() = 'admin');
create policy coach_ziel_write on public.settings for all to authenticated
  using (key like 'ziel\_nl\_%' and public.can_write('ziel'))
  with check (key like 'ziel\_nl\_%' and public.can_write('ziel'));

commit;

-- Kontrolle: Regeln auf den beiden Tabellen
select tablename, policyname, cmd from pg_policies where schemaname='public' and tablename in ('app_users','settings') order by 1,2;
