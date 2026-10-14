// Dig: every word the player reads goes through t(). Each feature brings its own table:
//   addStrings({ en: { key: 'Text {n}' }, ar: { key: '...' } })
// English is the fallback, so an Arabic table can arrive later, feature by feature.
const TABLES = { en: {} };
let lang = 'en';

// `extra` is the optional sibling file's default export ({ ar: {...} }): a feature with a big Arabic table keeps it in strings.ar.js
export function addStrings(tables, owner = '?', extra = null) {
  for (const [lg, table] of [...Object.entries(tables || {}), ...Object.entries(extra || {})]) {
    const T = TABLES[lg] || (TABLES[lg] = {});
    for (const [k, v] of Object.entries(table)) {
      if (k in T) throw new Error(`Dig: string "${k}" (${lg}) is defined twice (second time by ${owner})`);
      T[k] = v;
    }
  }
}
// the table list may not hold the language yet (tables arrive feature by feature), so accept any known language name
export function setLang(l) { lang = l === 'ar' ? 'ar' : 'en'; if (!TABLES[lang]) TABLES[lang] = {}; }
// one key in a named language, no fallback (null if absent): for text that shows both scripts
export const tIn = (lg, key) => (TABLES[lg] && TABLES[lg][key]) ?? null;
export const hasString = key => key in TABLES.en;
// keys of `from` that `lang` lacks (for a test that fails on missing Arabic, once there is Arabic)
export const missingStrings = (l, from = 'en') => Object.keys(TABLES[from]).filter(k => !(TABLES[l] && k in TABLES[l]));

export function t(key, vars) {
  let s = TABLES[lang][key];
  if (s === undefined) s = TABLES.en[key];
  if (s === undefined) return key;
  if (vars) for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(lang === 'ar' && /^[\d.,]+[A-Za-z]*$/.test(String(vars[k])) ? `⁦${vars[k]}⁩` : vars[k]);
  return s;
}

// "a, b, c" in the language's own way (Arabic joins with its own comma and "and"): use it for any list of words
export function listOf(items) {
  try { return new Intl.ListFormat(lang, { style: 'short', type: 'unit' }).format(items); }
  catch (e) { return items.join(', '); }
}

export function fmt(n) {
  if (!isFinite(n)) return '0';
  if (n < 1000) return String(Math.floor(n));
  const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  // past the last name: three figures and a power of ten ("4.30e55"), never a raw float
  if (n >= 9.995e35) { const e = Math.floor(Math.log10(n)); return (n / Math.pow(10, e)).toFixed(2) + 'e' + e; }
  let u = -1;
  while (n >= 1000 && u < units.length - 1) { n /= 1000; u++; }
  if (n >= 999.5 && u < units.length - 1) { n /= 1000; u++; }   // 999.6K reads 1.00M, not 1000K
  return (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)) + units[u];
}
