// R7: progressive tab unlocking. Fresh save shows only the Monolith; each tab opens at its
// trigger, once, with a starter gift where there is one; unlocks survive Ascension and a reload;
// only the next locked tab is a teaser; contracts and Ledger goals only come from open tabs.
// Run: node test_unlocks.js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { BuildingSystem } from './js/systems/BuildingSystem.js';
import { PrestigeSystem, MIN_RUN_SECONDS, DUST_REF } from './js/systems/PrestigeSystem.js';
import { AlchemySystem } from './js/systems/AlchemySystem.js';
import { BountySystem } from './js/systems/BountySystem.js';
import { CalendarSystem, LEDGER_GOALS } from './js/systems/CalendarSystem.js';
import { particles } from './js/engine/ParticleEngine.js';
import {
  UNLOCKS, ALWAYS_UNLOCKED, ASCEND_AETHER_GATE, ALL_TABS, checkUnlocks, getTeasers, getUnlockProgress, grantStarterGift,
  isUnlockNew, markUnlockSeen, sanitizeUnlocks, UNLOCK_BY_TAB
} from './js/systems/UnlockSystem.js';
import { shortProgress } from './js/ui/unlocks.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
particles.suppressed = true;

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const ids = (defs) => defs.map(d => d.tab);
const fresh = () => {
  const gs = new GameState();
  gs.buildingSystem = new BuildingSystem(gs);
  gs.prestigeSystem = new PrestigeSystem(gs);
  gs.alchemySystem = new AlchemySystem(gs);
  gs.hero = { floor: 1, maxFloor: 1 };
  gs.miningGrid = { maxDepth: 0 };
  return gs;
};

console.log('--- every nav tab is covered; Monolith, Settings, About always open ---');
{
  const html = read('./index.html');
  const sections = [...html.matchAll(/<section id="tab-(\w+)" class="tab-view/g)].map(m => m[1]);
  assert.deepEqual([...ALL_TABS].sort(), [...sections].sort(), 'the unlock table names every tab once');
  const gs = new GameState();
  for (const t of ALWAYS_UNLOCKED) assert.equal(gs.isTabUnlocked(t), true, `${t} is never gated`);
  assert.equal(gs.isTabUnlocked('some_future_tab'), true, 'unknown ids are not gated');
}

console.log('--- a fresh save shows only the Monolith (+ Settings/About) and one teaser ---');
{
  const gs = fresh();
  for (const u of UNLOCKS) assert.equal(gs.isTabUnlocked(u.tab), false, `${u.tab} starts locked`);
  assert.deepEqual(checkUnlocks(gs), [], 'nothing unlocks at time 0');
  assert.deepEqual(getTeasers(gs), ['codex'], 'only the next tab is a teaser');
  assert.match(getUnlockProgress(gs, 'codex').text, /0\/3/);
}

console.log('--- triggers open tabs once, in the roadmap order ---');
{
  const gs = fresh();
  gs.achievements = { a: {}, b: {} };
  assert.deepEqual(checkUnlocks(gs, 100), []);
  gs.achievements.c = {};
  // Without the achievement system the raw count is read
  assert.deepEqual(ids(checkUnlocks(gs, 100)), ['codex']);
  assert.equal(gs.unlocks.codex, 100);
  assert.deepEqual(checkUnlocks(gs, 200), [], 'never twice');

  gs.buildings.tapper.count = 9;
  assert.equal(getUnlockProgress(gs, 'combat').have, 9);
  assert.deepEqual(getTeasers(gs), ['combat']);
  gs.buildings.tapper.count = 10;
  assert.deepEqual(ids(checkUnlocks(gs)), ['combat']);
  assert.deepEqual(getTeasers(gs), ['mining', 'prestige'], 'next tab + the Ascension teaser once the Tower is open');

  gs.hero.maxFloor = 20;
  assert.deepEqual(checkUnlocks(gs), [], 'standing on floor 20 is not beating its boss');
  assert.match(getUnlockProgress(gs, 'mining').text, /19\/20/);
  gs.hero.maxFloor = 21;
  assert.deepEqual(ids(checkUnlocks(gs)), ['mining']);
  gs.hero.maxFloor = 41;
  assert.deepEqual(ids(checkUnlocks(gs)), ['spells']);
  gs.miningGrid.maxDepth = 10;
  assert.deepEqual(ids(checkUnlocks(gs)), ['bounties']);
  gs.miningGrid.maxDepth = 15;
  assert.deepEqual(ids(checkUnlocks(gs)), ['garden']);
  assert.equal(gs.isTabUnlocked('alchemy'), false);

  // Alchemy opens when some recipe can be brewed (real AlchemySystem.canBrew)
  for (const k of Object.keys(gs.inventory)) gs.inventory[k] = 1e6;
  gs.garden = { essences: new Proxy({}, { get: () => 1e6 }), inventory: {} };
  assert.deepEqual(ids(checkUnlocks(gs)), ['alchemy']);
}

console.log('--- Ascension: opens when it pays dust or after one; no floor/depth gate ---');
{
  const gs = fresh();
  gs.runStartedAt = Date.now() - MIN_RUN_SECONDS * 1000;
  gs.totalAetherEarned = new BigNum(100);
  const p = getUnlockProgress(gs, 'prestige');
  assert.ok(Math.abs(p.pct - 2 / 4) < 1e-9, 'log progress to 1e4 Aether');
  assert.equal(shortProgress(p), '50%');
  assert.equal(ASCEND_AETHER_GATE, DUST_REF, 'the unlock gate is the Ascension gate (R31)');
  assert.deepEqual(checkUnlocks(gs), []);
  gs.totalAetherEarned = new BigNum(1e12);
  assert.ok(gs.prestigeSystem.getPendingCosmicDust().gt(0));
  assert.ok(ids(checkUnlocks(gs)).includes('prestige'), 'pending dust opens it at floor 1, depth 0');

  const asc = fresh();
  asc.ascensionCount = 1;
  const opened = ids(checkUnlocks(asc));
  for (const t of ['prestige', 'talents', 'leaderboard', 'calendar']) assert.ok(opened.includes(t), `${t} at Ascension 1`);
  assert.ok(!opened.includes('market'), 'Bazaar needs Ascension 2 and floor 150');
  asc.ascensionCount = 2;
  asc.hero.maxFloor = 149;
  assert.deepEqual(ids(checkUnlocks(asc)), ['mining', 'spells'], 'no Bazaar below floor 150');
  asc.hero.maxFloor = 150;
  assert.deepEqual(ids(checkUnlocks(asc)), ['market']);
  asc.transcendenceCount = 1;
  assert.deepEqual(ids(checkUnlocks(asc)), ['chronicle']);
}

console.log('--- unlocks never re-lock: Ascension, and a save/load round trip ---');
{
  const gs = fresh();
  gs.buildings.tapper.count = 10;
  gs.hero.maxFloor = 21;
  checkUnlocks(gs, 5);
  gs.totalAetherEarned = new BigNum(1e12);
  gs.runStartedAt = 0;
  checkUnlocks(gs, 6);
  assert.ok(gs.isTabUnlocked('prestige'));
  assert.equal(gs.prestigeSystem.ascend(true), true);
  assert.equal(gs.buildings.tapper?.count || 0, 0, 'the run reset');
  checkUnlocks(gs, 7);
  for (const t of ['combat', 'mining', 'prestige', 'talents']) assert.ok(gs.isTabUnlocked(t), `${t} still open after Ascending`);

  markUnlockSeen(gs, 'combat');
  const loaded = new GameState();
  loaded.deserialize(JSON.parse(JSON.stringify(gs.serialize())));
  assert.equal(loaded.unlocks.combat, 5);
  assert.equal(loaded.isTabUnlocked('mining'), true);
  assert.equal(isUnlockNew(loaded, 'combat'), false, 'visited stays visited');
  assert.equal(isUnlockNew(loaded, 'mining'), true, 'unvisited keeps its NEW tag');
}

console.log('--- NEW tag until the first visit; starter gifts ---');
{
  const gs = fresh();
  assert.equal(isUnlockNew(gs, 'combat'), false, 'locked tabs are not new');
  gs.unlocks.combat = 1;
  assert.equal(isUnlockNew(gs, 'combat'), true);
  markUnlockSeen(gs, 'combat');
  assert.equal(isUnlockNew(gs, 'combat'), false);
  markUnlockSeen(gs, 'mining');
  assert.equal(gs.unlockSeen.mining, undefined, 'a locked tab cannot be marked seen');

  const stone = gs.inventory.stone;
  assert.equal(grantStarterGift(gs, UNLOCK_BY_TAB.get('mining')), '+30 stone');
  assert.equal(gs.inventory.stone, stone + 30);
  gs.mana = 3; gs.maxMana = 100;
  grantStarterGift(gs, UNLOCK_BY_TAB.get('spells'));
  assert.equal(gs.mana, 100);
  gs.garden = { inventory: { spore: 1 } };
  grantStarterGift(gs, UNLOCK_BY_TAB.get('garden'));
  assert.equal(gs.garden.inventory.spore, 3, '2 extra Mint seeds');
  assert.equal(grantStarterGift(gs, UNLOCK_BY_TAB.get('codex')), null, 'no gift');
}

console.log('--- junk unlock state loads clean ---');
{
  assert.deepEqual(sanitizeUnlocks(null), {});
  assert.deepEqual(sanitizeUnlocks({ combat: 5, mining: 'x', bogus: 3, garden: true, spells: -1 }), { combat: 5, garden: 1 });
  const data = new GameState().serialize();
  data.unlocks = 'nope';
  data.unlockSeen = [1, 2];
  const gs = new GameState();
  gs.deserialize(data);
  assert.deepEqual(gs.unlocks, {});
  assert.deepEqual(gs.unlockSeen, {});
}

console.log('--- contracts and Ledger goals only come from open tabs ---');
{
  const gs = fresh();
  const bs = new BountySystem(gs);
  gs.contracts = { lastClickAt: Date.now() };
  const seen = new Set();
  for (let i = 0; i < 200; i++) seen.add(bs.generateBounty(Date.now()).tab);
  assert.deepEqual([...seen], ['monolith'], 'fresh save: Monolith contracts only');

  for (const g of LEDGER_GOALS) assert.ok(ALL_TABS.includes(g.tab), `${g.id} names its tab`);
  let now = Date.now();
  const cal = new CalendarSystem(gs, () => now);
  cal.notify = () => {};
  cal.tick();
  const goals = () => cal.state.weekly.goals.map(g => LEDGER_GOALS.find(d => d.id === g.id).tab);
  assert.deepEqual(goals(), ['monolith'], 'a week drawn on day 0 has only what is open');
  gs.unlocks.combat = 1;
  gs.hero.maxFloor = 30;
  gs.miningGrid.maxDepth = 3;
  cal.tick();
  assert.equal(cal.state.weekly.goals.length, 3, 'it fills up as tabs open');
  for (const t of goals()) assert.ok(gs.isTabUnlocked(t), `${t} is open`);
}

console.log('--- markup and CSS: teaser styles, no endless pulse, main.js gates switchTab ---');
{
  const html = read('./index.html');
  assert.match(html, /css\/unlocks\.css/);
  const css = read('./css/unlocks.css');
  assert.match(css, /\.nav-tab\[hidden\][^{]*\.quick-cast-bar\[hidden\] \{ display: none !important; \}/);
  assert.match(css, /unlock-new-pulse 1\.6s ease-in-out 3;/, 'NEW tag pulses 3 times');
  assert.ok(!/infinite/.test(css));
  const main = read('./js/main.js');
  assert.match(main, /switchTab\(tabName\) \{\s*if \(!this\.gameState\.isTabUnlocked\(tabName\)\) return;/);
  // Side nav: every button closes before the next opens (a missing </button> nests them)
  const side = html.match(/<nav id="side-nav"[^>]*>([\s\S]*?)<\/nav>/)[1];
  assert.equal((side.match(/<button/g) || []).length, (side.match(/<\/button>/g) || []).length);
}

console.log('All R7 unlock tests passed.');
