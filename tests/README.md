# Tests für Sales OS

Automatischer Testlauf, der bei jeder Änderung an `index.html` in GitHub Actions läuft (Reiter „Actions“, Workflow „Tests“).

- `lint.mjs` – prüft alle Skripte (Inline-Blöcke und lokale `<script src>`-Dateien in Ladereihenfolge, gemeinsam über `quellen.mjs`) auf Syntaxfehler und unbekannte Funktionen/Variablen, dazu die Aufteilungsregeln: `js/*.js` (außer `js/start.js`) nur Funktionen, Zugangszeilen nur in `config.js`.
- `smoke.mjs` – öffnet das Board im Browser mit **Testdaten** (nie mit der echten Datenbank) und prüft u. a. Dashboard, Ziele aus der Provisionsvereinbarung, Performance-Tabelle, Popup, Zurück-Navigation, Dokumente und paralleles Laden.

Lokal ausführen: `cd tests && npm install && npx playwright install chromium && npm test`

Regel: Live wird nur aktualisiert, wenn der Testlauf auf DEV grün ist. Jeder gefundene Fehler bekommt eine eigene Prüfung in `smoke.mjs`.
