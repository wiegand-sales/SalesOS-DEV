-- 59_telefonie_nachladen_live.sql  ·  Sales OS · 3CX-Verlauf erneut übernehmen (nur Live) – Protokoll vom 25.11.2026
-- Anlass: Eingehende Anrufe je Anruf (58) gab es erst ab 23.11.; die Rohdaten davor waren schon gelöscht.
-- Erkenntnis: Die 3CX schickt ihren GESAMTEN Verlauf erneut, sobald sie auf eine neue, leere Datenbank zeigt
-- (Hinweis der 3CX: „Dadurch werden alle Ihre Daten in Ihre konfigurierte Remote-Datenbank übertragen.“).
--
-- Ablauf (so am 25.11.2026 gemacht):
--   1. cron-Job telefonie_aufbereiten anhalten (sonst löscht rohdaten_aufraeumen die neuen alten Zeilen)
--        select cron.alter_job(jobid, active := false) from cron.job where jobname = 'telefonie_aufbereiten';
--   2. neue Datenbank:  create database telefonie_3cx_b owner threecx_writer;   (allein)
--        revoke connect on database telefonie_3cx_b from public; grant connect on database telefonie_3cx_b to threecx_writer;
--   3. Vault-Verbindung umstellen (Passwort bleibt unsichtbar):
--        select vault.update_secret(id, replace(decrypted_secret, 'dbname=telefonie_3cx ', 'dbname=telefonie_3cx_b '))
--          from vault.decrypted_secrets where name = 'telefonie_3cx_verbindung';
--   4. 3CX › Datenkonnektoren: Datenbankname telefonie_3cx_b, Speichern, TEST, „Daten jetzt übertragen“
--   5. sobald die Tabellen da sind: Filter + Index aus 54 erneut anlegen, Zeilen vor 2026 löschen
--   6. eingehend_nachladen() monatsweise für 2026 aufrufen (Funktion unten)
--   7. cron-Job wieder aktivieren; alte Datenbank telefonie_3cx löschen:  drop database telefonie_3cx with (force);
-- Ergebnis 25.11.2026: erledigt. Die 3CX-Datenbank heißt seitdem dauerhaft telefonie_3cx_b (Peter: Name egal,
-- Umbenennen würde einen weiteren Komplett-Versand auslösen). Eingehend nachgeladen: 01.01.–25.11.2026.

create or replace function telefonie.eingehend_nachladen(p_von timestamptz, p_bis timestamptz)
returns text language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  insert into telefonie.eingehend as a
    (call_history_id, beginn, gruppe, gruppe_name, angenommen, angenommen_von, angenommen_um, ende,
     warte_sek, gespraech_sek, nummer_hash, nummer_klar)
  select r.call_history_id, r.beginn, r.gruppe, r.gruppe_name, r.angenommen, r.angenommen_von, r.angenommen_um, r.ende,
         extract(epoch from coalesce(r.angenommen_um, r.ende) - r.beginn)::int, r.gespraech_sek,
         telefonie.nummer_code(r.nummer), telefonie.nummer_norm(r.nummer)
  from extensions.dblink(telefonie.tcx_verbindung(), format($q$
    with k as (
      select distinct call_history_id from public.cdroutput
      where source_entity_type = 'external_line'
        and destination_entity_type in ('queue','ring_group_ring_all','ring_group_hunt')
        and cdr_started_at >= %L and cdr_started_at < %L)
    select c.call_history_id,
           min(c.cdr_started_at),
           (array_agg(c.destination_dn_number order by c.cdr_started_at)
              filter (where c.destination_entity_type in ('queue','ring_group_ring_all','ring_group_hunt')))[1],
           (array_agg(c.destination_dn_name order by c.cdr_started_at)
              filter (where c.destination_entity_type in ('queue','ring_group_ring_all','ring_group_hunt')))[1],
           coalesce(bool_or(c.destination_entity_type = 'extension' and c.cdr_answered_at is not null), false),
           (array_agg(c.destination_dn_number order by c.cdr_answered_at)
              filter (where c.destination_entity_type = 'extension' and c.cdr_answered_at is not null))[1],
           min(c.cdr_answered_at) filter (where c.destination_entity_type = 'extension'),
           max(c.cdr_ended_at),
           max(extract(epoch from c.cdr_ended_at - c.cdr_answered_at))
              filter (where c.destination_entity_type = 'extension' and c.cdr_answered_at is not null)::int,
           max(c.source_participant_phone_number) filter (where c.source_entity_type = 'external_line'),
           bool_and(c.cdr_ended_at is not null)
    from public.cdroutput c join k using (call_history_id)
    group by c.call_history_id
  $q$, p_von, p_bis))
    as r(call_history_id uuid, beginn timestamptz, gruppe text, gruppe_name text, angenommen boolean,
         angenommen_von text, angenommen_um timestamptz, ende timestamptz, gespraech_sek int, nummer text, fertig boolean)
  where r.fertig
  on conflict (call_history_id) do update set
    gruppe = excluded.gruppe, gruppe_name = excluded.gruppe_name, angenommen = excluded.angenommen,
    angenommen_von = excluded.angenommen_von, angenommen_um = excluded.angenommen_um, ende = excluded.ende,
    warte_sek = excluded.warte_sek, gespraech_sek = excluded.gespraech_sek;
  get diagnostics v_n = row_count;
  return v_n || ' eingehende Anrufe nachgeladen';
end;
$$;
revoke all on function telefonie.eingehend_nachladen(timestamptz, timestamptz) from public, anon, authenticated;
