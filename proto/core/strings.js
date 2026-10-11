// Dig: every word the player reads goes through t(). Each feature brings its own table:
//   addStrings({ en: { key: 'Text {n}' }, ar: { key: '...' } })
// English is the fallback, so an Arabic table can arrive later, feature by feature.
const TABLES = { en: {} };
let lang = 'en';

export function addStrings(tables, owner = '?') {
  for (const [lg, table] of Object.entries(tables || {})) {
    const T = TABLES[lg] || (TABLES[lg] = {});
    for (const [k, v] of Object.entries(table)) {
      if (k in T) throw new Error(`Dig: string "${k}" (${lg}) is defined twice (second time by ${owner})`);
      T[k] = v;
    }
  }
}
export function setLang(l) { lang = TABLES[l] ? l : 'en'; }
export const getLang = () => lang;
export const hasString = key => key in TABLES.en;
// keys of `from` that `lang` lacks (for a test that fails on missing Arabic, once there is Arabic)
export const missingStrings = (l, from = 'en') => Object.keys(TABLES[from]).filter(k => !(TABLES[l] && k in TABLES[l]));

export function t(key, vars) {
  let s = TABLES[lang][key];
  if (s === undefined) s = TABLES.en[key];
  if (s === undefined) return key;
  if (vars) for (const k of Object.keys(vars)) s = s.replace(`{${k}}`, vars[k]);
  return s;
}

export function fmt(n) {
  if (!isFinite(n)) return '0';
  if (n < 1000) return String(Math.floor(n));
  const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi'];
  let u = -1;
  while (n >= 1000 && u < units.length - 1) { n /= 1000; u++; }
  return (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)) + units[u];
}
