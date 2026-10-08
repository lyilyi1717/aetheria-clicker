// Arabic version (R37): every key in js/i18n/en.js and every data-table key registered with
// localize() has Arabic text in js/i18n/ar.js, with the same placeholders and the same element
// ids; every key the code and index.html ask for exists; t() fills params and game terms and
// keeps numbers left to right in Arabic; old saves load and keep a language setting.
// Run: node test_r37_i18n.js
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import EN from './js/i18n/en.js';
import AR, { AR_TERMS, AR_ITEMS } from './js/i18n/ar.js';
import { t, tOr, localizedKeys, bidi } from './js/i18n/index.js';
import { setLangForTests, normalizeLang, LANG_IDS } from './js/i18n/lang.js';
import { TERMS_EN } from './js/data/strings.js';
import { ITEM_NAMES } from './js/data/names.js';

function jsFiles(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...jsFiles(p));
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}

// Import every module so data tables register their localize() keys
const files = jsFiles('js').map(f => f.replace(/\\/g, '/'));
// (main.js only wires the page and is skipped: it needs a browser window)
for (const f of files) {
  if (f.startsWith('js/i18n/') || f === 'js/main.js') continue;
  await import('./' + f);
}

let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };

const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
const ids = (s) => [...String(s).matchAll(/\bid="([^"]+)"/g)].map(m => m[1]).sort();
const tags = (s) => [...String(s).matchAll(/<(\w+)[\s>]/g)].map(m => m[1]).sort();

console.log('--- every English key has Arabic, with the same placeholders and element ids ---');
const DATA = localizedKeys();
const missing = [];
const all = { ...EN };
for (const [k, d] of Object.entries(DATA)) all[k] = d.text;
for (const [k, en] of Object.entries(all)) {
  if (!(k in AR)) { missing.push(k); continue; }
  const ar = AR[k];
  ok(typeof ar === 'string' && ar.trim() !== '', `ar.js ${k} is empty`);
  // Arabic may drop a {n} that the grammar makes redundant ("one bonus"), never add one.
  // Data rows (already filled in English) offer the params they registered with localize().
  const enP = new Set([...placeholders(en), ...Object.keys(DATA[k]?.params || {})]);
  for (const p of placeholders(ar)) ok(enP.has(p) || p in TERMS_EN, `ar.js ${k} has {${p}}, which English doesn't`);
  assert.deepEqual(ids(ar), ids(en), `ar.js ${k}: element ids differ from English`);
  assert.deepEqual(tags(ar), tags(en), `ar.js ${k}: markup differs from English`);
}
assert.deepEqual(missing, [], `keys missing from js/i18n/ar.js:\n  ${missing.join('\n  ')}`);

console.log('--- no Arabic key without an English one (stale keys) ---');
const stale = Object.keys(AR).filter(k => !(k in EN) && !(k in DATA));
assert.deepEqual(stale, [], `ar.js keys no longer used:\n  ${stale.join('\n  ')}`);

console.log('--- Arabic text has no English words left (outside markup and placeholders) ---');
// Number notation letters, units and brand names that stay Latin on purpose
// "Create" is the label of GitHub's own button (GitHub has no Arabic interface)
const LATIN_OK = /^(K|M|B|T|Qa|Qi|aa|ab|ac|ad|e|x|XP|HP|CPS|GitHub|Google|Discord|v|ID|Supabase|Lv|Create)$/;
for (const [k, ar] of Object.entries(AR)) {
  const text = ar.replace(/<[^>]*>/g, ' ').replace(/\{\w+\}/g, ' ').replace(/&\w+;/g, ' ');
  for (const w of text.match(/[A-Za-z]{2,}/g) || []) ok(LATIN_OK.test(w), `ar.js ${k} has an English word "${w}": ${ar.slice(0, 80)}`);
}

console.log('--- terms and item names have Arabic ---');
for (const k of Object.keys(TERMS_EN)) if (!/Icon$/.test(k)) ok(typeof AR_TERMS[k] === 'string' && AR_TERMS[k], `AR_TERMS.${k} missing`);
for (const k of Object.keys(ITEM_NAMES)) ok(AR_ITEMS[k]?.name && AR_ITEMS[k]?.plural, `AR_ITEMS.${k} missing`);

console.log('--- every key the code asks for exists ---');
const used = new Set();
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\bt\(\s*'([^'$]+)'/g)) used.add(m[1]);
  for (const m of src.matchAll(/\bt\(\s*`([^`$]+)`/g)) used.add(m[1]);
}
const html = readFileSync('index.html', 'utf8');
for (const m of html.matchAll(/data-i18n(?:-[\w-]+)?="([^"]+)"/g)) used.add(m[1]);
const unknown = [...used].filter(k => !(k in EN));
assert.deepEqual(unknown, [], `keys used but missing from js/i18n/en.js:\n  ${unknown.join('\n  ')}`);

console.log('--- t(): params, game terms, fallbacks, number isolation ---');
setLangForTests('en');
assert.equal(t('bld.buy', { n: 5 }), 'Buy +5');
assert.equal(t('prestige.pending', { n: '12' }), 'Pending Crude Reserves: +12');
assert.equal(t('no.such.key'), 'no.such.key');
assert.equal(tOr('no.such.key', 'fallback'), 'fallback');
assert.equal(bidi('1.5M'), '1.5M');
setLangForTests('ar');
assert.equal(t('bld.buy', { n: 5 }), 'اشترِ \u2068+5\u2069', 'numbers are isolated in Arabic, with their sign');
assert.equal(t('tb.titan', { hp: 100, atk: 25 }), '\u2068+100\u2069 صحة، \u2068+25\u2069 هجوم');
assert.equal(t('coll.complete_detail', { n: 1 }), '\u2068+1%\u2069 نفط', 'a percent sign stays with its number');
assert.equal(t('m.rule.golden'), '\u2068+5%\u2069 لكل مستوى', 'literal signed numbers are isolated too');
assert.equal(t('market.buy', { n: 'ten' }), 'اشترِ ten', 'text params are not isolated');
assert.equal(bidi('1.5M'), '⁨1.5M⁩');
assert.ok(t('prestige.pending', { n: '1' }).startsWith('احتياطي الخام'), 'game terms come from AR_TERMS in Arabic');
setLangForTests('en');
checks += 9;

console.log('--- language setting: default, old saves, unknown values ---');
assert.deepEqual(LANG_IDS, ['en', 'ar']);
assert.equal(normalizeLang('fr'), null);
const { GameState } = await import('./js/systems/GameState.js');
const gs = new GameState();
assert.ok(LANG_IDS.includes(gs.settings.language), 'a new game has a language');
const old = new GameState();
const data = old.serialize();
delete data.settings.language;
const loaded = new GameState();
loaded.deserialize(JSON.parse(JSON.stringify(data)));
assert.ok(LANG_IDS.includes(loaded.settings.language), 'a save without a language gets the default');
data.settings.language = 'xx';
const bad = new GameState();
bad.deserialize(JSON.parse(JSON.stringify(data)));
assert.ok(LANG_IDS.includes(bad.settings.language), 'an unknown language falls back');
data.settings.language = 'ar';
const ar = new GameState();
ar.deserialize(JSON.parse(JSON.stringify(data)));
assert.equal(ar.settings.language, 'ar', 'a saved language survives a load');
checks += 6;

console.log(`R37 i18n tests passed (${checks} checks, ${Object.keys(EN).length} keys, ${Object.keys(DATA).length} data keys).`);
