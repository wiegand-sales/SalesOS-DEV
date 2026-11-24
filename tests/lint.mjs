// Prueft alle Skripte des Boards (Inline-Bloecke und lokale <script src>-Dateien in Ladereihenfolge) auf Syntaxfehler,
// unbekannte Funktionen/Variablen und auf die Aufteilungsregeln:
//  - Bereichsdateien js/*.js (ausser js/start.js) enthalten nur Funktionen (sie fuehren beim Laden nichts aus),
//  - shared/figuren.js nur Funktionen und feste Konstanten,
//  - die Supabase-Zugangszeilen stehen nur in config.js.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { ESLint } from 'eslint';
import * as acorn from 'acorn';
import { quellen } from './quellen.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const htmlDatei = process.argv[2] || path.join(here, '..', 'index.html');
const teile = quellen(htmlDatei);

// Zeilen im Gesamttext auf Datei + Zeile zurueckrechnen
const starts = []; let zeile = 1;
for (const t of teile) { starts.push({ datei: t.datei, ab: zeile }); zeile += t.code.split('\n').length; }
const code = teile.map(t => t.code).join(';\n');
const wo = z => { let s = starts[0]; for (const x of starts) if (x.ab <= z) s = x; return `${s.datei}:${z - s.ab + 1}`; };

const eslint = new ESLint({ useEslintrc: false, overrideConfig: { env: { browser: true, es2020: true }, parserOptions: { ecmaVersion: 2020 },
  globals: { supabase: 'readonly', Chart: 'readonly', selectedEmpId: 'readonly' }, rules: { 'no-undef': 'error', 'no-dupe-keys': 'error', 'no-unreachable': 'error', 'no-dupe-else-if': 'error', 'no-duplicate-case': 'error' } } });
const [res] = await eslint.lintText(code);
const errs = res.messages.filter(m => m.severity === 2).map(m => `${wo(m.line)}: ${m.message}`);

// Aufteilungsregeln
const fest = n => !n || ['Literal'].includes(n.type) || (n.type === 'TemplateLiteral' && !n.expressions.length)
  || (n.type === 'ArrayExpression' && n.elements.every(fest))
  || (n.type === 'ObjectExpression' && n.properties.every(p => p.type === 'Property' && !p.computed && fest(p.value)))
  || (n.type === 'UnaryExpression' && fest(n.argument)) || (n.type === 'BinaryExpression' && fest(n.left) && fest(n.right));
const hatConfig = teile.some(t => t.datei === 'config.js');
for (const t of teile) {
  let ast; try { ast = acorn.parse(t.code, { ecmaVersion: 2020, locations: true }); } catch { continue; } // Syntaxfehler meldet ESLint
  const nurFunktionen = /^js\/(?!start\.js$)/.test(t.datei), figuren = t.datei === 'shared/figuren.js';
  for (const s of ast.body) {
    if (s.type === 'EmptyStatement' || s.type === 'FunctionDeclaration') continue;
    if (nurFunktionen) errs.push(`${t.datei}:${s.loc.start.line}: Bereichsdatei darf nur Funktionen enthalten (Lade-Code/Variablen gehoeren nach js/start.js)`);
    else if (figuren && !(s.type === 'VariableDeclaration' && s.declarations.every(d => fest(d.init))))
      errs.push(`${t.datei}:${s.loc.start.line}: shared/figuren.js darf nur Funktionen und feste Konstanten enthalten`);
  }
  if (hatConfig && t.datei !== 'config.js' && /\bvar\s+SUPABASE_(URL|ANON_KEY)\s*=/.test(t.code))
    errs.push(`${t.datei}: Zugangszeile SUPABASE_URL/SUPABASE_ANON_KEY gehoert nur in config.js`);
}

errs.forEach(m => console.log(`✗ ${m}`));
console.log(errs.length ? `\n${errs.length} Problem(e) im Code` : `✓ Code-Prüfung ohne Fehler (${teile.length} Skriptteile)`);
process.exit(errs.length ? 1 : 0);
