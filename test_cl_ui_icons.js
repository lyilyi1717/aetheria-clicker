// CL-33: the preview's icons are drawn in the game. No emoji is left in the preview's files, every
// icon the screens name exists, and every drawing is valid, self-contained SVG.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { icon, ICON_NAMES, SLOT_ICONS, TAB_ICONS, FIELD_ICONS, hasIcon, iconToken, fromToken } from './js/ui/coreloop/icons.js';
import { SCREENS } from './js/ui/coreloop/shell.js';
import { P } from './js/systems/coreloop/params.js';

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };

// --- no emoji in the preview's files -------------------------------------------------------------
const files = [];
for (const dir of ['js/ui/coreloop', 'js/i18n/coreloop']) {
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.js')) files.push(path.join(dir, f));
}
for (const f of fs.readdirSync('css')) if (/^coreloop.*\.css$/.test(f)) files.push(path.join('css', f));
const PICTO = /[\p{Extended_Pictographic}‍️]/u;
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => ok(!PICTO.test(line), `${f}:${i + 1} has an emoji or pictographic character: ${line.trim().slice(0, 60)}`));
  // \u{1F6E2}-style escapes sneak an emoji in without showing it
  ok(!/\\u\{?1F[0-9A-F]{3}/i.test(fs.readFileSync(f, 'utf8')), `${f} has an escaped emoji`);
}

// --- every named icon exists ---------------------------------------------------------------------
ok(SLOT_ICONS.length === P.slots, 'one icon per pump');
for (const n of SLOT_ICONS) ok(hasIcon(n), `pump icon ${n}`);
eqSet(Object.keys(TAB_ICONS), SCREENS.map(s => s.id), 'a tab icon per screen');
for (const s of SCREENS) ok(hasIcon(s.icon), `screen ${s.id} icon ${s.icon} exists`);
for (const f of P.fields) ok(hasIcon(FIELD_ICONS[f]), `field ${f} has an icon`);
for (const n of Object.values(TAB_ICONS)) ok(hasIcon(n), `tab icon ${n}`);
function eqSet(a, b, m) { assert.deepEqual([...a].sort(), [...b].sort(), m); checks++; }

// Names used as icon('...') or iconToken('...') in the preview exist
for (const f of files.filter(x => x.endsWith('.js'))) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\b(?:icon|iconToken)\(\s*'([\w-]+)'/g)) ok(hasIcon(m[1]), `${f}: icon('${m[1]}') exists`);
  for (const m of src.matchAll(/icon: iconToken\('([\w-]+)'\)/g)) ok(hasIcon(m[1]), `${f}: toast icon ${m[1]} exists`);
}

// --- every drawing is valid, self-contained SVG --------------------------------------------------
const allNames = [...ICON_NAMES, 'well', 'gusher'];
for (const name of allNames) {
  for (const size of [undefined, 'hero', 24]) {
    const svg = icon(name, { size });
    const where = `${name}/${size}`;
    ok(svg.startsWith('<svg ') && svg.endsWith('</svg>'), where + ' is one svg');
    ok(svg.includes('viewBox="0 0 24 24"') && svg.includes('class="cl-icon'), where + ' viewBox and class');
    ok(svg.includes('aria-hidden="true"'), where + ' hidden from screen readers without a label');
    ok(!/<script|<image|<foreignObject|<style|href=|xlink|javascript:|on\w+=|url\(http/i.test(svg), where + ' is self-contained');
    ok(!PICTO.test(svg) && !svg.includes('NaN') && !svg.includes('undefined'), where + ' has no stray text');
    // tags balance (the drawings are hand-written)
    const open = (svg.match(/<(path|circle|ellipse|rect)\b[^>]*[^/]>/g) || []).length;
    ok(open === 0, where + ' has every shape self-closed');
    const colours = new Set([...svg.matchAll(/var\((--[\w-]+)\)/g)].map(m => m[1]));
    for (const c of colours) ok(['--gold', '--life', '--aether', '--bg-2'].includes(c), `${where} uses token ${c}`);
    ok(colours.size <= 3, where + ' stays within two accents');
  }
}
ok(icon('well', { label: 'Barrel' }).includes('role="img" aria-label="Barrel"'), 'a label is announced');
ok(!icon('well', { label: 'Barrel' }).includes('aria-hidden'), 'a labelled icon is not hidden');
ok(icon('well', { label: 'A "B" <c>' }).includes('aria-label="A &quot;B&quot; &lt;c>"'), 'labels are escaped');
ok(icon('nope').includes('cl-icon-dot') && icon('nope').includes('<circle'), 'unknown name draws a dot');
ok(!hasIcon('nope') && !hasIcon('constructor') && !hasIcon('__proto__'), 'only drawn names exist');
ok(icon('well', { size: 40 }).includes('inline-size:40px'), 'numeric size');
ok(icon('well', { size: 'hero' }) !== icon('well'), 'the hero barrel is its own drawing');
ok(icon('gusher', { size: 'hero' }) !== icon('gusher'), 'the hero gusher is its own drawing');
ok(new Set(SLOT_ICONS.map(n => icon(n))).size === SLOT_ICONS.length, 'the eight pumps all look different');
ok(fromToken(iconToken('crown')) === 'crown' && fromToken('x') === null && fromToken(undefined) === null, 'icon tokens round-trip');

console.log(`test_cl_ui_icons: ${checks} checks passed`);
