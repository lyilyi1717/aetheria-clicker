// Dig Arabic progress: `node scripts/dig-i18n.mjs` (or `npm run dig:i18n`) prints one line per folder: "folder  ar/en".
// Also the library behind test_dig_i18n.js.
import { readdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'proto');

// folder -> { en, ar } (both tables; ar merges strings.js's ar with strings.ar.js)
export async function loadAll() {
  const out = {};
  const dirs = [['ui', join(root, 'ui')], ...readdirSync(join(root, 'features'), { withFileTypes: true })
    .filter(d => d.isDirectory()).map(d => [d.name, join(root, 'features', d.name)])];
  for (const [name, dir] of dirs) {
    const f = join(dir, 'strings.js');
    if (!existsSync(f)) continue;
    const m = (await import(pathToFileURL(f).href)).default || {};
    const en = { ...(m.en || {}) }, ar = { ...(m.ar || {}) };
    const sib = join(dir, 'strings.ar.js');
    if (existsSync(sib)) Object.assign(ar, (await import(pathToFileURL(sib).href)).default?.ar || {});
    out[name] = { en, ar };
  }
  return out;
}

export const placeholders = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');

// problems in one folder's Arabic: missing keys, stale keys, placeholder mismatch, Latin words
export function check({ en, ar }) {
  const p = { missing: [], stale: [], placeholders: [], latin: [] };
  for (const k of Object.keys(en)) if (!(k in ar)) p.missing.push(k);
  for (const k of Object.keys(ar)) {
    if (!(k in en)) { p.stale.push(k); continue; }
    if (typeof en[k] === 'string' && placeholders(en[k]) !== placeholders(ar[k])) p.placeholders.push(k);
    if (typeof ar[k] === 'string') {
      const words = ar[k].replace(/\{\w+\}/g, '').replace(/\b\d+(\.\d+)?[KMB]?\b/g, '').match(/[A-Za-z]{2,}/g) || [];
      if (words.length) p.latin.push(k + ': ' + words.join(' '));
    }
  }
  return p;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const all = await loadAll();
  const w = Math.max(...Object.keys(all).map(k => k.length));
  let a = 0, e = 0;
  for (const [name, t] of Object.entries(all)) {
    const n = Object.keys(t.en).length, d = Object.keys(t.ar).filter(k => k in t.en).length;
    a += d; e += n;
    console.log(`${name.padEnd(w)}  ${d}/${n}`);
  }
  console.log(`${'total'.padEnd(w)}  ${a}/${e}`);
}
