// Dig language plumbing and Arabic completeness. Run: node test_dig_i18n.js
// COMPLETE lists the folders whose Arabic must be whole (every pass adds its folders). Other folders
// are only checked for stale keys, placeholders and Latin words in what Arabic they already have.
import { readFileSync, readdirSync } from 'node:fs';
import { loadAll, check } from './scripts/dig-i18n.mjs';
import { addStrings, setLang, t, tIn, missingStrings } from './proto/core/strings.js';
import { LANG, DIR, dirOf, textDir } from './proto/core/lang.js';

// pass 1 (14 Oct 2026): the first five minutes. pass 2: away, settings, telemetry and the first hour
// (sites and starshop wait for a later pass: other work is open in those folders). pass 3: chatter, moods, story
const COMPLETE = ['ui', 'shop', 'picks', 'boss', 'foreman', 'look', 'chest', 'diggers', 'water', 'crystal', 'relics', 'ground', 'track', 'combo', 'crits', 'ores', 'tnt', 'oil',
  'away', 'settings', 'telemetry', 'worldmap', 'rafeeqs', 'wardrobe', 'contracts',
  'chatter', 'moods', 'story',    // pass 3: the crew's voices and the hakawati
  'sites', 'starshop',            // pass 2b: the finish card and the Star tracks; the switch goes live
  'wing2', 'relics2', 'fusion', 'deep', 'forge', 'museum'];   // pass 4: the Museum, the deep, relics and the Forge

let failed = 0;
const ok = (c, m) => { if (!c) { failed++; console.error('FAIL: ' + m); } };

// ---------- the real tables ----------
const all = await loadAll();
ok(Object.keys(all).length >= 30, 'found the string folders');
for (const [name, tb] of Object.entries(all)) {
  const p = check(tb);
  if (COMPLETE.includes(name)) ok(p.missing.length === 0, `${name}: ${p.missing.length} keys lack Arabic, e.g. ${p.missing.slice(0, 3)}`);
  ok(p.stale.length === 0, `${name}: Arabic keys with no English: ${p.stale.slice(0, 3)}`);
  ok(p.placeholders.length === 0, `${name}: placeholders differ: ${p.placeholders.slice(0, 3)}`);
  ok(p.latin.length === 0, `${name}: Latin words in Arabic: ${p.latin.slice(0, 3)}`);
  // generated lines: "<base>_n" counts must agree
  for (const k of Object.keys(tb.ar)) if (/_n$/.test(k) && typeof tb.en[k] === 'number') ok(tb.ar[k] === tb.en[k], `${name}: ${k} count differs`);
}
for (const f of COMPLETE) ok(f in all, `COMPLETE names a folder that does not exist: ${f}`);
// every folder is whole since pass 4: a new folder ships with its Arabic (add it to COMPLETE)
for (const f of Object.keys(all)) ok(COMPLETE.includes(f), `${f}: a new string folder must have Arabic and be in COMPLETE`);
{ // tables registered outside a strings.js (inline G.addStrings) need their Arabic too
  const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name]);
  for (const f of walk('proto').filter(f => f.endsWith('.js') && !/strings(\.ar)?\.js$/.test(f))) {
    const src = readFileSync(f, 'utf8');
    if (/addStrings\(\{\s*en:/.test(src)) ok(/\bar:\s*\{/.test(src), `${f}: an inline string table has no Arabic`);
  }
}
ok(!/[\u0600-\u06FF]/.test(JSON.stringify(Object.values(all).map(x => x.en))), 'no Arabic left in an English table');

// ---------- t() ----------
{
  addStrings({ en: { tk_a: 'Hello {n}', tk_b: 'Only English' }, ar: { tk_a: 'مرحبا {n}' } }, 'test');
  ok(t('tk_a', { n: 5 }) === 'Hello 5', 'English by default');
  setLang('ar');
  ok(t('tk_a', { n: '12.5K' }) === 'مرحبا \u206612.5K\u2069', 'Arabic with the number in an isolate');
  ok(t('tk_a', { n: 'Sam' }) === 'مرحبا Sam', 'a name is not isolated');
  ok(t('tk_b') === '⁨Only English⁩', 'a missing Arabic key falls back to English, in an isolate');
  ok(t('tk_a', { n: '1:40' }) === 'مرحبا ⁦1:40⁩' && t('tk_a', { n: '+12%' }) === 'مرحبا ⁦+12%⁩'
    && t('tk_a', { n: '-0:25' }) === 'مرحبا ⁦-0:25⁩', 'a clock and a signed share are isolated too');
  ok(t('no_such_key') === 'no_such_key', 'an unknown key shows itself');
  ok(tIn('ar', 'tk_b') === null && tIn('ar', 'tk_a') === 'مرحبا {n}', 'tIn has no fallback');
  ok(missingStrings('ar').includes('tk_b'), 'missingStrings sees it');
  setLang('fr'); ok(t('tk_a', { n: 5 }) === 'Hello 5', 'an unknown language is English');
  addStrings({ en: { tk_c: 'C' } }, 'test', { ar: { tk_c: 'ج' } });
  setLang('ar'); ok(t('tk_c') === 'ج', 'addStrings loads the sibling file table'); setLang('en');
}

// ---------- lang.js (no browser here: English) ----------
ok(LANG === 'en' && DIR === 'ltr', 'no ?lang= and no stored choice: English, ltr');
{ // the page's inline script and lang.js pick the same way
  const html = readFileSync('proto.html', 'utf8');
  ok(/DIG_PROTO_LANG/.test(html) && /h\.dir = l === 'ar' \? 'rtl' : 'ltr'/.test(html), 'proto.html sets lang and dir before first paint');
  ok(html.indexOf('DIG_PROTO_LANG') < html.indexOf('proto/proto.css'), 'and does it before the stylesheet');
  ok(/setLang\(LANG\)/.test(readFileSync('proto/main.js', 'utf8')), 'main.js calls setLang(LANG)');
  ok(!/^import .*(\.\.\/)+js\//m.test(readFileSync('proto/core/lang.js', 'utf8')) && !/^import/m.test(readFileSync('proto/core/lang.js', 'utf8')), 'lang.js imports nothing');
}
{ // canvas lines: Arabic words draw right to left, a bare number keeps left to right (#451)
  ok(dirOf('وجدت ⁦0⁩ من ⁦4⁩', 'rtl') === 'rtl', 'an Arabic line with numbers draws rtl');
  ok(dirOf('بووم -50%', 'rtl') === 'rtl', 'an Arabic shout with a signed share draws rtl');
  ok(dirOf('-12.5K', 'rtl') === 'ltr' && dirOf('1:40', 'rtl') === 'ltr', 'a bare number or clock stays ltr in Arabic');
  ok(dirOf('رفيق 3', 'ltr') === 'ltr' && textDir('رفيق 3') === 'ltr', 'English pages never change direction');
  const files = ['proto/features/sites/ui.js', 'proto/features/boss/ui.js', 'proto/ui/render.js', 'proto/features/worldmap/draw.js', 'proto/features/worldmap/alqahwa.js'];
  for (const f of files) ok(/direction = textDir\(/.test(readFileSync(f, 'utf8')), `${f} sets the canvas direction from its words`);
  ok(/#stage :is\([^)]*span[^)]*\) \{ unicode-bidi: plaintext; \}/.test(readFileSync('proto/proto.css', 'utf8')), 'words on the ltr stage take their own direction');
}
{ // physical CSS is gone
  const css = readFileSync('proto/proto.css', 'utf8');
  ok(!/(margin|padding)-(left|right)|text-align: *(left|right)|(^|[ ;{])(left|right) *:/m.test(css), 'proto.css uses logical properties');
}

if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log('test_dig_i18n: ok');
