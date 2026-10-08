// R27 naming cleanup: one names table for every player-facing item, no leftover old names.
// Run: node test_r27_names.js
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { GameState } from './js/systems/GameState.js';
import { ITEM_NAMES, TILE_ITEM_KEY, itemName } from './js/data/names.js';
import { GardenSystem, HYBRIDS, ESSENCE_NAMES } from './js/systems/GardenSystem.js';
import { RECIPES, HYBRID_RECIPES, GEM_LADDER } from './js/systems/AlchemySystem.js';
import { MONSTER_NAMES } from './js/systems/CombatSystem.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };

let failed = 0;
const check = (cond, msg) => { if (!cond) { failed++; console.error('FAIL:', msg); } };

const gs = new GameState();
new GardenSystem(gs); // fills gs.garden with its defaults
for (const k of Object.keys(gs.inventory)) check(ITEM_NAMES[k], `inventory key ${k} has a names entry`);
for (const k of Object.keys(gs.garden.essences)) check(ITEM_NAMES[k], `essence key ${k} has a names entry`);
for (const k of Object.keys(HYBRIDS)) check(ITEM_NAMES[k], `hybrid key ${k} has a names entry`);
for (const r of [...RECIPES, ...HYBRID_RECIPES]) {
  for (const k of Object.keys(r.cost || {})) check(ITEM_NAMES[k], `recipe ${r.id} ingredient ${k} has a names entry`);
}
for (const k of GEM_LADDER) check(ITEM_NAMES[k], `gem ${k} has a names entry`);
for (const k of Object.values(TILE_ITEM_KEY)) check(ITEM_NAMES[k], `tile item ${k} has a names entry`);
for (const [k, e] of Object.entries(ITEM_NAMES)) {
  check(e.name && e.plural && e.icon && /^#[0-9a-f]{6}$/i.test(e.color), `${k} entry is complete`);
}

// Systems read the table rather than keeping their own copy
check(ESSENCE_NAMES.manaSap === ITEM_NAMES.manaSap.name, 'garden essence names come from the table');
check(HYBRIDS.limonana.name === ITEM_NAMES.limonana.name, 'hybrid names come from the table');
check(itemName('sapphires') === 'Dallah' && itemName('rubies', 3) === 'Fawanees' && itemName('rubies', 1) === 'Fanoos', 'itemName singular/plural');
check(itemName('unknownKey') === 'unknownKey', 'itemName falls back to the key');

// The boss list no longer carries the removed name
check(!MONSTER_NAMES.some(n => /mutawa/i.test(n)), 'Mutawa removed from the boss list');

// No leftover old names in player-facing text. Save keys (rubies, sapphires, manaSap, ...) are
// lower-case identifiers, so the case-sensitive pattern looks for the old display words only.
const OLD = /\b(Sapphire|Ruby|Emerald|Diamond|Void Amethyst|Mana Sap|Mutawa|Spore Powder|Solar Dew|Cryo Essence|Void Pollen|Celestial Nectar)\b/;
const files = ['index.html'];
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.js') && !p.endsWith('version.js')) files.push(p);
  }
};
walk('js');
for (const f of files) {
  readFileSync(f, 'utf8').replace(/\r/g, '').split('\n').forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, '').replace(/<!--.*?-->/g, '');
    if (OLD.test(code)) check(false, `old name in ${f}:${i + 1}: ${line.trim().slice(0, 100)}`);
  });
}

if (failed) { console.error(`${failed} R27 names test(s) failed`); process.exit(1); }
console.log('All R27 names tests passed.');
