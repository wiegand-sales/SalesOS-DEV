// Prueft den Skriptteil von index.html auf Syntaxfehler und unbekannte Funktionen/Variablen.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { ESLint } from 'eslint';
const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(process.argv[2] || path.join(here, '..', 'index.html'), 'utf8');
const code = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join(';\n');
const eslint = new ESLint({ useEslintrc: false, overrideConfig: { env: { browser: true, es2020: true }, parserOptions: { ecmaVersion: 2020 },
  globals: { supabase: 'readonly', Chart: 'readonly', selectedEmpId: 'readonly' }, rules: { 'no-undef': 'error', 'no-dupe-keys': 'error', 'no-unreachable': 'error', 'no-dupe-else-if': 'error', 'no-duplicate-case': 'error' } } });
const [res] = await eslint.lintText(code);
const errs = res.messages.filter(m => m.severity === 2);
errs.forEach(m => console.log(`✗ Zeile ${m.line}: ${m.message}`));
console.log(errs.length ? `\n${errs.length} Problem(e) im Code` : '✓ Code-Prüfung ohne Fehler');
process.exit(errs.length ? 1 : 0);
