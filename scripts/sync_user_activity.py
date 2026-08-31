#!/usr/bin/env python3
"""
FTP -> Supabase Sync für user_activity.csv (Sales OS / DEV)
Läuft als geplanter GitHub-Actions-Workflow (siehe .github/workflows/ftp-sync.yml).

Ablauf:
1. Datei per SFTP von ftp.ampertecnet.de laden
2. Zeilen parsen (Semikolon-getrennt, deutsche Dezimalkommas/Prozentwerte)
3. Mitarbeiter anhand des Namens (ohne Rollenkürzel) den employees-IDs zuordnen
4. In die performance-Tabelle upserten (employee_id, date) - überschreibt bestehende
   Zeilen für den gleichen Tag/Mitarbeiter, dupliziert nichts
5. Unbekannte Mitarbeiter werden übersprungen und am Ende aufgelistet (kein Absturz)
"""
import os
import sys
import csv
import io
import re
import paramiko
import requests

SFTP_HOST = os.environ["SFTP_HOST"]
SFTP_PORT = int(os.environ.get("SFTP_PORT", "22"))
SFTP_USER = os.environ["SFTP_USER"]
SFTP_PASSWORD = os.environ["SFTP_PASSWORD"]
SFTP_REMOTE_FILE = os.environ.get("SFTP_REMOTE_FILE", "user_activity.csv")

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
}


def log(msg):
    print(msg, flush=True)


def fetch_csv_via_sftp():
    log(f"Verbinde zu {SFTP_HOST}:{SFTP_PORT} …")
    transport = paramiko.Transport((SFTP_HOST, SFTP_PORT))
    transport.connect(username=SFTP_USER, password=SFTP_PASSWORD)
    sftp = paramiko.SFTPClient.from_transport(transport)
    log(f"Verbunden. Lade {SFTP_REMOTE_FILE} …")
    buf = io.BytesIO()
    sftp.getfo(SFTP_REMOTE_FILE, buf)
    sftp.close()
    transport.close()
    raw = buf.getvalue()
    # BOM behandeln, sonst wie das bestehende App-CSV-Handling: UTF-8 mit BOM, sonst Windows-1252
    if raw[:3] == b"\xef\xbb\xbf":
        text = raw.decode("utf-8-sig")
    else:
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            text = raw.decode("windows-1252")
    log(f"Datei geladen ({len(raw)} Bytes).")
    return text


def parse_de_number(s):
    """'1.234,56' oder '58,33%' -> float. Leer/None -> 0."""
    if s is None:
        return 0.0
    s = s.strip().replace("%", "").replace(".", "").replace(",", ".")
    if s == "" or s == "-":
        return 0.0
    try:
        return float(s)
    except ValueError:
        return 0.0


def parse_de_int(s):
    return int(round(parse_de_number(s)))


def parse_de_date(s):
    """'17.08.2026' -> '2026-08-17'"""
    parts = s.strip().split(".")
    if len(parts) != 3:
        return None
    d, m, y = parts
    return f"{y}-{m.zfill(2)}-{d.zfill(2)}"


def strip_role_prefix(name):
    """'SE - Johann Breuer' -> 'Johann Breuer' (auch mit Leerzeichen-Resten robust)"""
    name = name.strip()
    m = re.match(r"^[A-Z]{2,4}\s*-\s*(.+)$", name)
    return (m.group(1) if m else name).strip()


def load_employees():
    log("Lade Mitarbeiterliste aus Supabase …")
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/employees",
        headers=HEADERS,
        params={"select": "id,name"},
    )
    r.raise_for_status()
    rows = r.json()
    # Name (kleingeschrieben, getrimmt) -> id
    by_name = {row["name"].strip().lower(): row["id"] for row in rows}
    log(f"{len(by_name)} Mitarbeiter geladen.")
    return by_name


# Spalten-Index (0-basiert) gemäß user_activity.csv Kopfzeile
COL = {
    "datum": 0, "mitarbeiter": 2,
    "oem_akt": 3, "oem_ne": 4, "oem_nerf": 5, "oem_nm": 6, "oem_storniert": 7, "oem_kein": 8,
    "oem_tw": 9, "oem_yes": 10, "oem_sy": 11, "oem_my": 12, "oem_gesamt": 13,
    "oem_tw_cr": 14, "oem_yes_cr": 15, "oem_sy_cr": 16, "oem_my_cr": 17, "oem_symy_cr": 18, "oem_cr": 19,
    "oem_marge": 20, "oem_umsatz": 21, "oem_kompa": 22,
    "oem_rab_summe": 23, "oem_rab_anzahl": 24, "oem_shop_rab_summe": 25, "oem_shop_rab_anzahl": 26,
    "oem_widerrufen": 27,
    "ups_akt": 28, "ups_ne": 29, "ups_nerf": 30, "ups_nm": 31, "ups_storniert": 32,
    "ups_yes": 33, "ups_gesamt": 34, "ups_cr": 35, "ups_marge": 36, "ups_umsatz": 37, "ups_kompa": 38,
    "ups_rab_summe": 39, "ups_rab_anzahl": 40, "ups_shop_rab_summe": 41, "ups_shop_rab_anzahl": 42,
    "ups_widerrufen": 43,
    "wo_akt": 44, "wo_ne": 45, "wo_nerf": 46, "wo_beendet": 47, "wo_tw": 48, "wo_yes": 49,
    "wo_sy": 50, "wo_my": 51, "wo_gesamt": 52, "wo_cr": 53, "wo_marge": 54, "wo_umsatz": 55,
    "wo_kompa": 56, "wo_rab_summe": 57, "wo_rab_anzahl": 58, "wo_widerrufen": 59,
    "wu_akt": 60, "wu_ne": 61, "wu_nerf": 62, "wu_beendet": 63, "wu_yes": 64, "wu_gesamt": 65,
    "wu_cr": 66, "wu_marge": 67, "wu_umsatz": 68, "wu_kompa": 69, "wu_rab_summe": 70,
    "wu_rab_anzahl": 71, "wu_widerrufen": 72,
}


def row_to_payload(row, employee_id):
    g = lambda key: row[COL[key]] if COL[key] < len(row) else ""
    wka_gesamt = parse_de_int(g("wo_gesamt")) + parse_de_int(g("wu_gesamt"))
    wka_marge = parse_de_number(g("wo_marge")) + parse_de_number(g("wu_marge"))
    marge_oem = parse_de_number(g("oem_marge"))
    marge_upsell = parse_de_number(g("ups_marge"))
    gesamt_optimierungen = (parse_de_int(g("oem_gesamt")) + parse_de_int(g("ups_gesamt"))
                  + parse_de_int(g("wo_gesamt")) + parse_de_int(g("wu_gesamt")))
    return {
        "employee_id": employee_id,
        "date": parse_de_date(g("datum")),
        "wochentag": row[1].strip() if len(row) > 1 else None,
        # bestehende Felder (OEM-Bereich, 1:1 kompatibel mit dem manuellen CSV-Import)
        "oem_aktivitaeten": parse_de_int(g("oem_akt")),
        "oem_nicht_erreicht": parse_de_int(g("oem_ne")),
        "oem_nicht_erfolgreich": parse_de_int(g("oem_nerf")),
        "oem_nicht_moeglich": parse_de_int(g("oem_nm")),
        "oem_gesamt": parse_de_int(g("oem_gesamt")),
        "oem_tw": parse_de_int(g("oem_tw")),
        "oem_yes": parse_de_int(g("oem_yes")),
        "oem_sy": parse_de_int(g("oem_sy")),
        "oem_my": parse_de_int(g("oem_my")),
        "ups_yes": parse_de_int(g("ups_yes")),
        "wka_gesamt_yes": wka_gesamt,
        "gesamt_optimierungen": gesamt_optimierungen,
        "oem_margenerhoehung": marge_oem,
        "ups_margenerhoehung": marge_upsell,
        "wka_margenerhoehung": wka_marge,
        "gesamt_margenerhoehung": marge_oem + marge_upsell + wka_marge,
        "oem_cr": parse_de_number(g("oem_cr")),
        "oem_tw_cr": parse_de_number(g("oem_tw_cr")),
        "oem_yes_cr": parse_de_number(g("oem_yes_cr")),
        "oem_sy_cr": parse_de_number(g("oem_sy_cr")),
        "oem_my_cr": parse_de_number(g("oem_my_cr")),
        # neue Detailfelder (siehe migration_ups_wka_columns.sql)
        "oem_storniert": parse_de_int(g("oem_storniert")),
        "oem_kein": parse_de_int(g("oem_kein")),
        "oem_sy_my_cr": parse_de_number(g("oem_symy_cr")),
        "oem_umsatz": parse_de_number(g("oem_umsatz")),
        "oem_kompa_umsatzerhoehung": parse_de_number(g("oem_kompa")),
        "oem_rabatte_summe": parse_de_number(g("oem_rab_summe")),
        "oem_rabatte_anzahl": parse_de_int(g("oem_rab_anzahl")),
        "oem_shop_rabatte_summe": parse_de_number(g("oem_shop_rab_summe")),
        "oem_shop_rabatte_anzahl": parse_de_int(g("oem_shop_rab_anzahl")),
        "oem_widerrufen": parse_de_int(g("oem_widerrufen")),
        "ups_aktivitaeten": parse_de_int(g("ups_akt")),
        "ups_nicht_erreicht": parse_de_int(g("ups_ne")),
        "ups_nicht_erfolgreich": parse_de_int(g("ups_nerf")),
        "ups_nicht_moeglich": parse_de_int(g("ups_nm")),
        "ups_storniert": parse_de_int(g("ups_storniert")),
        "ups_gesamt": parse_de_int(g("ups_gesamt")),
        "ups_cr": parse_de_number(g("ups_cr")),
        "ups_umsatz": parse_de_number(g("ups_umsatz")),
        "ups_kompa_umsatzerhoehung": parse_de_number(g("ups_kompa")),
        "ups_rabatte_summe": parse_de_number(g("ups_rab_summe")),
        "ups_rabatte_anzahl": parse_de_int(g("ups_rab_anzahl")),
        "ups_shop_rabatte_summe": parse_de_number(g("ups_shop_rab_summe")),
        "ups_shop_rabatte_anzahl": parse_de_int(g("ups_shop_rab_anzahl")),
        "ups_widerrufen": parse_de_int(g("ups_widerrufen")),
        "wka_oem_aktivitaeten": parse_de_int(g("wo_akt")),
        "wka_oem_nicht_erreicht": parse_de_int(g("wo_ne")),
        "wka_oem_nicht_erfolgreich": parse_de_int(g("wo_nerf")),
        "wka_oem_beendet": parse_de_int(g("wo_beendet")),
        "wka_oem_tw": parse_de_int(g("wo_tw")),
        "wka_oem_yes": parse_de_int(g("wo_yes")),
        "wka_oem_super_yes": parse_de_int(g("wo_sy")),
        "wka_oem_mega_yes": parse_de_int(g("wo_my")),
        "wka_oem_gesamt": parse_de_int(g("wo_gesamt")),
        "wka_oem_cr": parse_de_number(g("wo_cr")),
        "wka_oem_margenerhoehung": parse_de_number(g("wo_marge")),
        "wka_oem_umsatz": parse_de_number(g("wo_umsatz")),
        "wka_oem_kompa_umsatzerhoehung": parse_de_number(g("wo_kompa")),
        "wka_oem_rabatte_summe": parse_de_number(g("wo_rab_summe")),
        "wka_oem_rabatte_anzahl": parse_de_int(g("wo_rab_anzahl")),
        "wka_oem_widerrufen": parse_de_int(g("wo_widerrufen")),
        "wka_ups_aktivitaeten": parse_de_int(g("wu_akt")),
        "wka_ups_nicht_erreicht": parse_de_int(g("wu_ne")),
        "wka_ups_nicht_erfolgreich": parse_de_int(g("wu_nerf")),
        "wka_ups_beendet": parse_de_int(g("wu_beendet")),
        "wka_ups_yes": parse_de_int(g("wu_yes")),
        "wka_ups_gesamt": parse_de_int(g("wu_gesamt")),
        "wka_ups_cr": parse_de_number(g("wu_cr")),
        "wka_ups_margenerhoehung": parse_de_number(g("wu_marge")),
        "wka_ups_umsatz": parse_de_number(g("wu_umsatz")),
        "wka_ups_kompa_umsatzerhoehung": parse_de_number(g("wu_kompa")),
        "wka_ups_rabatte_summe": parse_de_number(g("wu_rab_summe")),
        "wka_ups_rabatte_anzahl": parse_de_int(g("wu_rab_anzahl")),
        "wka_ups_widerrufen": parse_de_int(g("wu_widerrufen")),
        # Gesamt-Bereich: OEM + UPS + WKA OEM + WKA UPS zusammengezaehlt
        "gesamt_aktivitaeten": (parse_de_int(g("oem_akt")) + parse_de_int(g("ups_akt"))
                                 + parse_de_int(g("wo_akt")) + parse_de_int(g("wu_akt"))),
        "gesamt_nicht_erreicht": (parse_de_int(g("oem_ne")) + parse_de_int(g("ups_ne"))
                                    + parse_de_int(g("wo_ne")) + parse_de_int(g("wu_ne"))),
        "gesamt_nicht_erfolgreich": (parse_de_int(g("oem_nerf")) + parse_de_int(g("ups_nerf"))
                                       + parse_de_int(g("wo_nerf")) + parse_de_int(g("wu_nerf"))),
        # Gesamt-nicht-moeglich: nur OEM+UPS, WKA kennt kein "nicht moeglich"
        "gesamt_nicht_moeglich": parse_de_int(g("oem_nm")) + parse_de_int(g("ups_nm")),
        # Gesamt-storniert: nur OEM+UPS, WKA kennt "beendet" statt "storniert" (bewusst nicht mitgezaehlt)
        "gesamt_storniert": parse_de_int(g("oem_storniert")) + parse_de_int(g("ups_storniert")),
        "gesamt_widerrufen": (parse_de_int(g("oem_widerrufen")) + parse_de_int(g("ups_widerrufen"))
                                + parse_de_int(g("wo_widerrufen")) + parse_de_int(g("wu_widerrufen"))),
    }


def upsert_batch(rows, batch_size=300):
    total = 0
    for i in range(0, len(rows), batch_size):
        chunk = rows[i:i + batch_size]
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/performance?on_conflict=employee_id,date",
            headers=HEADERS,
            json=chunk,
        )
        if not r.ok:
            log(f"FEHLER beim Schreiben von Paket {i // batch_size + 1}: {r.status_code} {r.text[:500]}")
            r.raise_for_status()
        total += len(chunk)
        log(f"  Paket {i // batch_size + 1}: {len(chunk)} Zeilen geschrieben (gesamt {total}/{len(rows)}).")
    return total


def main():
    text = fetch_csv_via_sftp()
    reader = csv.reader(io.StringIO(text), delimiter=";")
    header = next(reader)
    log(f"Header erkannt: {len(header)} Spalten.")

    employees_by_name = load_employees()

    payload_rows = []
    not_found = set()
    for row in reader:
        if not row or not row[0].strip():
            continue
        raw_name = row[COL["mitarbeiter"]]
        clean_name = strip_role_prefix(raw_name)
        emp_id = employees_by_name.get(clean_name.lower())
        if not emp_id:
            not_found.add(raw_name.strip())
            continue
        date = parse_de_date(row[COL["datum"]])
        if not date:
            continue
        payload_rows.append(row_to_payload(row, emp_id))

    log(f"{len(payload_rows)} Zeilen zuordenbar, {len(not_found)} Mitarbeiter nicht gefunden.")
    if not_found:
        log("Nicht zugeordnet (bitte prüfen, ob diese Personen im System fehlen):")
        for n in sorted(not_found):
            log(f"  - {n}")

    if not payload_rows:
        log("Keine Zeilen zum Schreiben. Beende.")
        return

    written = upsert_batch(payload_rows)
    log(f"Fertig. {written} Zeilen erfolgreich synchronisiert.")

    # Zeitstempel für die "zuletzt synchronisiert"-Anzeige in der App zurückschreiben
    import datetime
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/settings?on_conflict=key",
        headers=HEADERS,
        json=[{"key": "ftpLastSync", "value": now_iso}],
    )
    if r.ok:
        log(f"Zeitstempel aktualisiert: {now_iso}")
    else:
        log(f"Hinweis: Zeitstempel konnte nicht geschrieben werden: {r.status_code} {r.text[:200]}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        log(f"ABBRUCH: {exc}")
        sys.exit(1)
