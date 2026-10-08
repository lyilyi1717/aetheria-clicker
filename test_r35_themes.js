// R35: switchable themes. Checks that every theme block in css/tokens.css overrides the same
// colour tokens, that every theme passes the contrast check (docs/ui-style-guide.md §8), that
// the setting defaults to Night and old saves load, and that css/*.css has no hard-coded colours.
// Run: node test_r35_themes.js
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { GameState } from './js/systems/GameState.js';
import {
  THEMES, THEME_IDS, DEFAULT_THEME, normalizeTheme, applyThemeSetting, themeVar, themeColor, HEX_TOKEN
} from './js/ui/theme.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const tokensCss = read('./css/tokens.css');

// Colour tokens every theme must set (sizes, fonts and motion are shared).
const COLOUR_TOKENS = [
  'bg-0', 'bg-1', 'bg-2', 'bg-3', 'bg-4', 'line-1', 'line-2', 'line-brand',
  'text-1', 'text-2', 'text-3', 'text-on-accent',
  'aether', 'gold', 'dust', 'shard', 'life', 'mana', 'sand', 'danger', 'ok', 'warn', 'bad',
  'rarity-common', 'rarity-rare', 'rarity-epic', 'rarity-legendary', 'rarity-cosmic', 'tint', 'shade'
];

function block(selector) {
  const start = tokensCss.indexOf(selector + ' {');
  assert.ok(start >= 0, `${selector} block exists`);
  const body = tokensCss.slice(start, tokensCss.indexOf('\n}', start));
  const vars = {};
  for (const m of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return vars;
}

const night = block(':root');
const themeVars = { night };
for (const id of THEME_IDS.filter(t => t !== 'night')) themeVars[id] = { ...night, ...block(`:root[data-theme="${id}"]`) };

console.log('--- every theme block defines the same colour tokens ---');
for (const id of THEME_IDS) {
  const own = id === 'night' ? night : block(`:root[data-theme="${id}"]`);
  for (const tok of COLOUR_TOKENS) assert.ok(own[tok], `${id} sets --${tok}`);
}
assert.ok(!/:root\[data-theme="night"\]/.test(tokensCss), 'Night is the plain :root block');

// WCAG relative luminance and contrast
function rgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
}
function lum(hex) {
  const [r, g, b] = rgb(hex).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

console.log('--- contrast: text and accents >= 4.5:1 on cards (bg-2, bg-3) in every theme ---');
const TEXT_TOKENS = ['text-1', 'text-2', 'text-3', 'aether', 'gold', 'dust', 'shard', 'life', 'mana', 'sand', 'danger',
  'rarity-common', 'rarity-rare', 'rarity-epic', 'rarity-legendary'];
const lowContrast = [];
for (const id of THEME_IDS) {
  const v = themeVars[id];
  for (const bg of ['bg-1', 'bg-2', 'bg-3']) {
    for (const tok of TEXT_TOKENS) {
      const c = contrast(v[tok], v[bg]);
      if (c < 4.5) lowContrast.push(`${id}: --${tok} on --${bg} is ${c.toFixed(2)}:1`);
    }
  }
  // Gold is the filled button: its label must read on it
  const onGold = contrast(v['text-on-accent'], v.gold);
  if (onGold < 4.5) lowContrast.push(`${id}: text-on-accent on gold is ${onGold.toFixed(2)}:1`);
  // Sand is light-ish but not plain white
  if (id === 'sand') for (const bg of ['bg-0', 'bg-1', 'bg-2']) assert.notEqual(v[bg].toLowerCase(), '#ffffff');
}

assert.deepEqual(lowContrast, [], 'every theme passes the contrast check');

console.log('--- setting: Night by default, unknown values fall back, old saves load ---');
{
  assert.equal(THEMES.length, 3);
  assert.equal(DEFAULT_THEME, 'night');
  for (const bad of [undefined, null, '', 'light', 1]) assert.equal(normalizeTheme(bad), 'night');
  for (const id of THEME_IDS) assert.equal(normalizeTheme(id), id);

  const gs = new GameState();
  assert.equal(gs.settings.theme, 'night');
  gs.settings.theme = 'sand';
  const loaded = new GameState();
  loaded.deserialize(JSON.parse(JSON.stringify(gs.serialize())));
  assert.equal(loaded.settings.theme, 'sand', 'theme round-trips through a save');

  const old = new GameState().serialize();
  delete old.settings.theme;
  const fromOld = new GameState();
  fromOld.deserialize(JSON.parse(JSON.stringify(old)));
  assert.equal(fromOld.settings.theme, 'night', 'a save without a theme gets Night');
  old.settings.theme = 'neon';
  const fromBad = new GameState();
  fromBad.deserialize(JSON.parse(JSON.stringify(old)));
  assert.equal(fromBad.settings.theme, 'night', 'an unknown theme gets Night');

  const s = { theme: 'bogus' };
  assert.equal(applyThemeSetting(s), 'night');
  assert.equal(s.theme, 'night');
}

console.log('--- JS colours: Night passes through, mapped hex values name real tokens ---');
{
  assert.equal(themeVar('#38bdf8'), '#38bdf8');
  assert.equal(themeColor('#fbbf24'), '#fbbf24');
  for (const tok of Object.values(HEX_TOKEN)) assert.ok(COLOUR_TOKENS.includes(tok), `--${tok} is a theme token`);
}

console.log('--- picker and early-paint script are wired up ---');
{
  const html = read('./index.html');
  assert.ok(html.includes('id="settings-theme"'), 'Settings has a Theme block');
  assert.ok(html.indexOf("localStorage.getItem('AETHERIA_THEME')") < html.indexOf('css/tokens.css'),
    'data-theme is set before the CSS loads');
}

console.log('--- no hard-coded colours left in css/*.css (outside tokens.css) ---');
{
  const ALLOWED = [/mask-image/, /radial-gradient\(circle, #fde047/, /box-shadow|text-shadow|drop-shadow/];
  for (const f of readdirSync(new URL('./css/', import.meta.url)).filter(f => f.endsWith('.css') && f !== 'tokens.css')) {
    read(`./css/${f}`).split('\n').forEach((line, i) => {
      if (!/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(line)) return;
      assert.ok(ALLOWED.some(r => r.test(line)), `${f}:${i + 1} has a hard-coded colour: ${line.trim()}`);
    });
  }
}

console.log('R35 theme tests passed');
