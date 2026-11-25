-- 60_telefonie_nur_sales_live.sql  ·  Sales OS · Nur Anrufe von Sales-OS-Mitarbeitern behalten (nur Live)
-- Peter, 25.11.2026: „am ende bruachen wir nämlich nur die daten zudenen auch eine name im sales os existiert.
-- alle anderen können eignetlich weg.“ – ohne Puffer: „bei preboarding wird einem mitarbeiter immer eine
-- nebenstelle zugeordnet.“
--
--   · telefonie.anrufe: nur Zeilen, deren Nebenstelle am Anruftag in public.telefonie_nebenstellen zugeordnet ist.
--   · telefonie.eingehend: nur Anrufe in Sales-Gruppen (telefonie.sales_gruppen: 800, 831).
--   · Täglich 02:30 UTC per pg_cron. Neuer Mitarbeiter: nur Zuordnung Nebenstelle → Mitarbeiter eintragen
--     (gueltig_ab = Eintrittstag). Fehlt die Zuordnung, werden seine Anrufe beim nächsten Lauf gelöscht.

create or replace function telefonie.fremde_loeschen() returns text
language plpgsql security definer set search_path = '' as $$
declare a int; e int;
begin
  delete from telefonie.anrufe x
  where not exists (
    select 1 from public.telefonie_nebenstellen m
    where m.nebenstelle = x.nebenstelle
      and (x.beginn at time zone 'Europe/Berlin')::date >= m.gueltig_ab
      and (m.gueltig_bis is null or (x.beginn at time zone 'Europe/Berlin')::date <= m.gueltig_bis));
  get diagnostics a = row_count;

  delete from telefonie.eingehend x
  where x.gruppe is null or x.gruppe not in (select nummer from telefonie.sales_gruppen);
  get diagnostics e = row_count;

  return a || ' Agent-Zeilen, ' || e || ' eingehende Anrufe gelöscht';
end;
$$;
revoke all on function telefonie.fremde_loeschen() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'telefonie_fremde_loeschen';
select cron.schedule('telefonie_fremde_loeschen', '30 2 * * *', $$select telefonie.fremde_loeschen()$$);
