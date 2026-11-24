// Liefert alle Skripte des Boards in Ladereihenfolge: Inline-<script> aus index.html und lokale <script src>-Dateien
// (ohne ?v=…). CDN-Skripte (http/https) werden übersprungen.
import fs from 'node:fs'; import path from 'node:path';

export function quellen(htmlDatei) {
  const html = fs.readFileSync(htmlDatei, 'utf8'), dir = path.dirname(htmlDatei), liste = [];
  for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    const src = (m[1].match(/\bsrc="([^"]+)"/) || [])[1];
    if (!src) { liste.push({ datei: path.basename(htmlDatei) + ' (inline)', code: m[2] }); continue; }
    if (/^(https?:)?\/\//.test(src)) continue;
    const rel = src.replace(/[?#].*$/, '');
    liste.push({ datei: rel, code: fs.readFileSync(path.join(dir, rel), 'utf8') });
  }
  return liste;
}

// Gesamter Quelltext (HTML + alle lokalen Skripte) für Textprüfungen
export function gesamtText(htmlDatei) {
  return fs.readFileSync(htmlDatei, 'utf8') + '\n' + quellen(htmlDatei).filter(q => !q.datei.includes('(inline)')).map(q => q.code).join('\n');
}
