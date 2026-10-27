# Sales OS – Chrome-Erweiterung (Testversion DEV)

Zeigt einem Sales Agent seine eigenen Kennzahlen (heute / Monat) und seine vorläufige Provision.
Rechenlogik 1:1 aus Sales OS übernommen (CR = erst summieren, dann teilen; Provision wie im Provisions-Tab).

## Testen
1. Ordner `extension/` herunterladen (oder ZIP entpacken).
2. Chrome → `chrome://extensions` → oben rechts **Entwicklermodus** an → **Entpackte Erweiterung laden** → Ordner wählen.
3. Icon anpinnen (Puzzle-Symbol → Pin), anklicken, mit Sales-OS-Zugang (E-Mail + Passwort) anmelden.

Admins ohne eigenen Mitarbeiter-Datensatz sehen einen **Testmodus** mit Auswahl „Vorschau als“.

## Umgebung
`config.js` legt fest, gegen welche Datenbank die Erweiterung läuft (aktuell DEV).
