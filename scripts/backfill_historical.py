#!/usr/bin/env python3
"""
Einmaliges Backfill der historischen Performance-Daten (Jan-Sep 2026), die durch das
rollierende FTP-Zeitfenster nie automatisch synchronisiert wurden.
Liest historical_backfill_source.csv (Original-Spaltennamen, siehe user_activity.csv),
berechnet alle Felder identisch zum regulaeren Sync (inkl. gesamt_*), matched Mitarbeiter
per Name und upserted in die performance-Tabelle. Schreibt am Ende einen Bericht
(backfill_report.txt) mit Match-Statistik zurueck ins Repo.
"""
import os
import re
import sys
import pandas as pd
import requests

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


def strip_role_prefix(name):
    """Entfernt beliebig viele 'WORT - '-Praefixe, z.B. 'Inaktiv - SR - Alexander Widmann' -> 'Alexander Widmann'."""
    name = name.strip()
    while True:
        m = re.match(r"^[A-Za-zÄÖÜäöü]{2,10}\s*-\s*(.+)$", name)
        if not m:
            break
        name = m.group(1).strip()
    return name


def load_employees():
    log("Lade Mitarbeiterliste aus Supabase …")
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/employees",
        headers=HEADERS,
        params={"select": "id,name"},
    )
    r.raise_for_status()
    rows = r.json()
    by_name = {row["name"].strip().lower(): row["id"] for row in rows}
    log(f"{len(by_name)} Mitarbeiter geladen.")
    return by_name


def n(row, col):
    v = row.get(col)
    if pd.isna(v):
        return 0
    return v


def to_int(v):
    try:
        return int(round(float(v)))
    except (TypeError, ValueError):
        return 0


def to_num(v):
    try:
        f = float(v)
        return f
    except (TypeError, ValueError):
        return 0.0


def cr_to_pct(v):
    """CR-Werte liegen in der Quelle als Bruch (0.4545) vor, DB erwartet Prozentzahl (45.45)."""
    try:
        return round(float(v) * 100, 2)
    except (TypeError, ValueError):
        return 0.0


def row_to_payload(row, employee_id):
    oem_gesamt = to_int(n(row, "OEM - Gesamt"))
    ups_gesamt = to_int(n(row, "UPS - Gesamt"))
    wo_gesamt = to_int(n(row, "WKA OEM - Gesamt"))
    wu_gesamt = to_int(n(row, "WKA UPS - Gesamt"))
    wka_gesamt = wo_gesamt + wu_gesamt
    marge_oem = to_num(n(row, "OEM Warenkorbausgang Margenerhöhung"))
    marge_upsell = to_num(n(row, "UPS Warenkorbausgang Margenerhöhung"))
    wka_marge = to_num(n(row, "WKA OEM Warenkorbausgang Margenerhöhung")) + to_num(n(row, "WKA UPS Warenkorbausgang Margenerhöhung"))
    gesamt_optimierungen = oem_gesamt + ups_gesamt + wo_gesamt + wu_gesamt

    oem_akt = to_int(n(row, "OEM - Aktivitäten"))
    ups_akt = to_int(n(row, "UPS - Aktivitäten"))
    wo_akt = to_int(n(row, "WKA OEM Aktivitäten"))
    wu_akt = to_int(n(row, "WKA UPS Aktivitäten"))
    oem_ne = to_int(n(row, "OEM nicht erreicht"))
    ups_ne = to_int(n(row, "UPS nicht erreicht"))
    wo_ne = to_int(n(row, "WKA OEM nicht erreicht"))
    wu_ne = to_int(n(row, "WKA UPS nicht erreicht"))
    oem_nerf = to_int(n(row, "OEM nicht erfolgreich"))
    ups_nerf = to_int(n(row, "UPS nicht erfolgreich"))
    wo_nerf = to_int(n(row, "WKA OEM nicht erfolgreich"))
    wu_nerf = to_int(n(row, "WKA UPS nicht erfolgreich"))
    oem_nm = to_int(n(row, "OEM nicht möglich"))
    ups_nm = to_int(n(row, "UPS nicht möglich"))
    oem_storniert = to_int(n(row, "OEM storniert"))
    ups_storniert = to_int(n(row, "UPS storniert"))
    oem_widerrufen = to_int(n(row, "OEM Widerrufen"))
    ups_widerrufen = to_int(n(row, "UPS Widerrufen"))
    wo_widerrufen = to_int(n(row, "WKA OEM Widerrufen"))
    wu_widerrufen = to_int(n(row, "WKA UPS Widerrufen"))

    return {
        "employee_id": employee_id,
        "date": row["Datum"],
        "wochentag": str(row.get("Wochentag") or "").strip(),
        "oem_aktivitaeten": oem_akt,
        "oem_nicht_erreicht": oem_ne,
        "oem_nicht_erfolgreich": oem_nerf,
        "oem_nicht_moeglich": oem_nm,
        "oem_gesamt": oem_gesamt,
        "oem_tw": to_int(n(row, "OEM - TW")),
        "oem_yes": to_int(n(row, "OEM - YES")),
        "oem_sy": to_int(n(row, "OEM - SY")),
        "oem_my": to_int(n(row, "OEM - MY")),
        "ups_yes": to_int(n(row, "UPS - YES")),
        "wka_gesamt_yes": wka_gesamt,
        "gesamt_optimierungen": gesamt_optimierungen,
        "oem_margenerhoehung": marge_oem,
        "ups_margenerhoehung": marge_upsell,
        "wka_margenerhoehung": wka_marge,
        "gesamt_margenerhoehung": marge_oem + marge_upsell + wka_marge,
        "oem_cr": cr_to_pct(n(row, "OEM CR")),
        "oem_tw_cr": cr_to_pct(n(row, "OEM TW CR")),
        "oem_yes_cr": cr_to_pct(n(row, "OEM YES CR")),
        "oem_sy_cr": cr_to_pct(n(row, "OEM SY CR")),
        "oem_my_cr": cr_to_pct(n(row, "OEM MY CR")),
        "oem_storniert": oem_storniert,
        "oem_kein": to_int(n(row, "OEM - kein")),
        "oem_sy_my_cr": cr_to_pct(n(row, "OEM SY/MY CR")),
        "oem_umsatz": to_num(n(row, "OEM Umsatz")),
        "oem_kompa_umsatzerhoehung": to_num(n(row, "OEM Kompa Umsatzerhöhung")),
        "oem_rabatte_summe": to_num(n(row, "OEM Summe tatsächliche Rabatte")),
        "oem_rabatte_anzahl": to_int(n(row, "OEM Anzahl tatsächliche Rabatte")),
        "oem_shop_rabatte_summe": to_num(n(row, "OEM Summe Shop-Rabatte")),
        "oem_shop_rabatte_anzahl": to_int(n(row, "OEM Anzahl Shop-Rabatte")),
        "oem_widerrufen": oem_widerrufen,
        "ups_aktivitaeten": ups_akt,
        "ups_nicht_erreicht": ups_ne,
        "ups_nicht_erfolgreich": ups_nerf,
        "ups_nicht_moeglich": ups_nm,
        "ups_storniert": ups_storniert,
        "ups_gesamt": ups_gesamt,
        "ups_cr": cr_to_pct(n(row, "UPS CR")),
        "ups_umsatz": to_num(n(row, "UPS Umsatz")),
        "ups_kompa_umsatzerhoehung": to_num(n(row, "UPS Kompa Umsatzerhöhung")),
        "ups_rabatte_summe": to_num(n(row, "UPS Summe tatsächliche Rabatte")),
        "ups_rabatte_anzahl": to_int(n(row, "UPS Anzahl tatsächliche Rabatte")),
        "ups_shop_rabatte_summe": to_num(n(row, "UPS Summe Shop-Rabatte")),
        "ups_shop_rabatte_anzahl": to_int(n(row, "UPS Anzahl Shop-Rabatte")),
        "ups_widerrufen": ups_widerrufen,
        "wka_oem_aktivitaeten": wo_akt,
        "wka_oem_nicht_erreicht": wo_ne,
        "wka_oem_nicht_erfolgreich": wo_nerf,
        "wka_oem_beendet": to_int(n(row, "WKA OEM beendet")),
        "wka_oem_tw": to_int(n(row, "WKA OEM TW")),
        "wka_oem_yes": to_int(n(row, "WKA OEM YES")),
        "wka_oem_super_yes": to_int(n(row, "WKA OEM SUPER YES")),
        "wka_oem_mega_yes": to_int(n(row, "WKA OEM MEGA YES")),
        "wka_oem_gesamt": wo_gesamt,
        "wka_oem_cr": cr_to_pct(n(row, "WKA OEM CR")),
        "wka_oem_margenerhoehung": to_num(n(row, "WKA OEM Warenkorbausgang Margenerhöhung")),
        "wka_oem_umsatz": to_num(n(row, "WKA OEM Umsatz")),
        "wka_oem_kompa_umsatzerhoehung": to_num(n(row, "WKA OEM Kompa Umsatzerhöhung")),
        "wka_oem_rabatte_summe": to_num(n(row, "WKA OEM Summe tatsächliche Rabatte")),
        "wka_oem_rabatte_anzahl": to_int(n(row, "WKA OEM Anzahl tatsächliche Rabatte")),
        "wka_oem_widerrufen": wo_widerrufen,
        "wka_ups_aktivitaeten": wu_akt,
        "wka_ups_nicht_erreicht": wu_ne,
        "wka_ups_nicht_erfolgreich": wu_nerf,
        "wka_ups_beendet": to_int(n(row, "WKA UPS beendet")),
        "wka_ups_yes": to_int(n(row, "WKA UPS YES")),
        "wka_ups_gesamt": wu_gesamt,
        "wka_ups_cr": cr_to_pct(n(row, "WKA UPS CR")),
        "wka_ups_margenerhoehung": to_num(n(row, "WKA UPS Warenkorbausgang Margenerhöhung")),
        "wka_ups_umsatz": to_num(n(row, "WKA UPS Umsatz")),
        "wka_ups_kompa_umsatzerhoehung": to_num(n(row, "WKA UPS Kompa Umsatzerhöhung")),
        "wka_ups_rabatte_summe": to_num(n(row, "WKA UPS Summe tatsächliche Rabatte")),
        "wka_ups_rabatte_anzahl": to_int(n(row, "WKA UPS Anzahl tatsächliche Rabatte")),
        "wka_ups_widerrufen": wu_widerrufen,
        "gesamt_aktivitaeten": oem_akt + ups_akt + wo_akt + wu_akt,
        "gesamt_nicht_erreicht": oem_ne + ups_ne + wo_ne + wu_ne,
        "gesamt_nicht_erfolgreich": oem_nerf + ups_nerf + wo_nerf + wu_nerf,
        "gesamt_nicht_moeglich": oem_nm + ups_nm,
        "gesamt_storniert": oem_storniert + ups_storniert,
        "gesamt_widerrufen": oem_widerrufen + ups_widerrufen + wo_widerrufen + wu_widerrufen,
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
        if r.status_code >= 300:
            log(f"FEHLER beim Upsert (Batch {i}-{i+len(chunk)}): {r.status_code} {r.text[:500]}")
            raise SystemExit(1)
        total += len(chunk)
        log(f"  … {total}/{len(rows)} Zeilen hochgeladen")
    return total


def main():
    employees_by_name = load_employees()
    df = pd.read_csv("historical_backfill_source.csv", encoding="utf-8")
    log(f"{len(df)} Zeilen aus historical_backfill_source.csv gelesen.")

    payloads = []
    unmatched = {}
    for _, row in df.iterrows():
        raw_name = str(row["Mitarbeiter"])
        clean_name = strip_role_prefix(raw_name)
        emp_id = employees_by_name.get(clean_name.strip().lower())
        if not emp_id:
            unmatched[raw_name] = unmatched.get(raw_name, 0) + 1
            continue
        payloads.append(row_to_payload(row, emp_id))

    log(f"{len(payloads)} Zeilen zugeordnet, {sum(unmatched.values())} Zeilen ohne Mitarbeiter-Treffer.")

    uploaded = 0
    if payloads:
        uploaded = upsert_batch(payloads)

    report_lines = [
        f"Backfill-Bericht — historical_backfill_source.csv",
        f"Gesamtzeilen in Quelldatei: {len(df)}",
        f"Erfolgreich zugeordnet und hochgeladen: {uploaded}",
        f"Nicht zugeordnete Zeilen: {sum(unmatched.values())}",
        "",
        "Nicht zugeordnete Namen (Rohtext aus Datei, Anzahl Zeilen):",
    ]
    for name, cnt in sorted(unmatched.items(), key=lambda x: -x[1]):
        report_lines.append(f"  - {name}: {cnt}")

    report = "\n".join(report_lines)
    log("\n" + report)
    with open("backfill_report.txt", "w", encoding="utf-8") as f:
        f.write(report)


if __name__ == "__main__":
    main()
