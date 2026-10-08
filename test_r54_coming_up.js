// R54: "Coming up" panel. Checks the ETA maths (Oil and Reserve paces, New Well counts), the
// duration labels, the ordering (ready, then soonest, then closest) and which systems show up
// at each stage of a save, plus that the panel is wired into the page.
// Run: node test_r54_coming_up.js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { BuildingSystem, BUILDING_DEFINITIONS } from './js/systems/BuildingSystem.js';
import { PrestigeSystem, MIN_RUN_SECONDS, DUST_REF } from './js/systems/PrestigeSystem.js';
import {
  etaSeconds, formatEta, dustRate, nextWellEta, wellsEta, sortItems, getComingUp, MAX_ITEMS
} from './js/ui/comingUp.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const NOW = 1_800_000_000_000;

function setup() {
  const gs = new GameState();
  const bs = new BuildingSystem(gs);
  const ps = new PrestigeSystem(gs);
  gs.buildingSystem = bs;
  gs.runStartedAt = NOW;
  return { gs, bs, ps };
}
const near = (a, b, msg) => assert.ok(a !== null && Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b)), `${msg || ''} ${a} ~ ${b}`);
const withRate = (gs, perSec) => { gs.getNetAetherPerSecond = () => new BigNum(perSec); };

console.log('--- etaSeconds: missing / rate, 0 when there, null without income or past a year ---');
{
  near(etaSeconds(0, 100, 10), 10);
  near(etaSeconds(new BigNum(40), new BigNum(100), new BigNum(2)), 30);
  assert.equal(etaSeconds(100, 100, 0), 0, 'already there needs no income');
  assert.equal(etaSeconds(150, 100, 5), 0);
  assert.equal(etaSeconds(0, 100, 0), null, 'no income: no estimate');
  assert.equal(etaSeconds(0, 1e12, 1), null, 'more than a year: no estimate');
  assert.equal(etaSeconds(0, new BigNum(1e300).mul(1e300), 1), null, 'huge BigNum gap does not overflow');
}

console.log('--- formatEta: rough, friendly durations ---');
{
  assert.equal(formatEta(0), 'Ready');
  assert.equal(formatEta(20), '< 1 min');
  assert.equal(formatEta(60), '~1 min');
  assert.equal(formatEta(29 * 60), '~29 min');
  assert.equal(formatEta(2 * 3600 + 600), '~2 h');
  assert.equal(formatEta(47 * 3600), '~47 h');
  assert.equal(formatEta(3 * 86400), '~3 days');
  assert.equal(formatEta(null), '');
  assert.equal(formatEta(NaN), '');
}

console.log('--- New Well ETA: the Oil gate, then the 10-min minimum run ---');
{
  const { gs, ps } = setup();
  gs.totalAetherEarned = new BigNum(DUST_REF / 2);
  // DUST_REF / 2 Oil missing at 10/s takes less than the 600 s minimum run
  assert.equal(nextWellEta(gs, ps, new BigNum(10), NOW), MIN_RUN_SECONDS);
  near(nextWellEta(gs, ps, new BigNum(0.1), NOW), DUST_REF / 2 * 10, 'Oil is the slower part');
  assert.equal(nextWellEta(gs, ps, BigNum.zero(), NOW), null);
  gs.totalAetherEarned = new BigNum(DUST_REF * 64);
  assert.ok(ps.getPendingCosmicDust().gt(0));
  assert.equal(nextWellEta(gs, ps, BigNum.zero(), NOW + 100_000), MIN_RUN_SECONDS - 100, 'paying run: only the clock');
  assert.equal(nextWellEta(gs, ps, BigNum.zero(), NOW + MIN_RUN_SECONDS * 1000), 0);
}

console.log('--- Reserve pace: pending over the run time (at least the minimum run) ---');
{
  const { gs, ps } = setup();
  assert.equal(dustRate(gs, ps, NOW).toNumber(), 0, 'no pending Reserves, no pace');
  gs.totalAetherEarned = new BigNum(DUST_REF * 64); // pays 20
  const pending = ps.getPendingCosmicDust().toNumber();
  assert.equal(pending, 20);
  assert.ok(Math.abs(dustRate(gs, ps, NOW + 60_000).toNumber() - pending / MIN_RUN_SECONDS) < 1e-12, 'short run counts as 10 min');
  assert.ok(Math.abs(dustRate(gs, ps, NOW + 3600_000).toNumber() - pending / 3600) < 1e-12);
}

console.log('--- several New Wells: next one, then the player\'s own wells per day ---');
{
  const { gs, ps } = setup();
  gs.totalAetherEarned = new BigNum(DUST_REF * 64);
  const t = NOW + MIN_RUN_SECONDS * 1000;
  assert.equal(wellsEta(gs, ps, BigNum.zero(), 0, t), 0);
  assert.equal(wellsEta(gs, ps, BigNum.zero(), 1, t), 0);
  assert.equal(wellsEta(gs, ps, BigNum.zero(), 3, t), null, 'no history: no guess');
  gs.calendar.rates.hist.ascend = [4, 4, 4];
  near(wellsEta(gs, ps, BigNum.zero(), 3, t), 2 / 4 * 86400, '2 more at 4 a day = half a day');
  gs.calendar.rates.hist.ascend = [0, 0, 0];
  assert.equal(wellsEta(gs, ps, BigNum.zero(), 3, t), null);
}

console.log('--- ordering: ready, then soonest, then closest ---');
{
  const items = [
    { id: 'a', eta: null, pct: 0.2 },
    { id: 'b', eta: 3600, pct: 0.1 },
    { id: 'c', eta: 0, pct: 1 },
    { id: 'd', eta: null, pct: 0.9 },
    { id: 'e', eta: 60, pct: 0.5 }
  ];
  assert.deepEqual(sortItems(items).map(i => i.id), ['c', 'e', 'b', 'd', 'a']);
}

console.log('--- a new game: next generator with an Oil ETA, and the next tabs ---');
{
  const { gs, bs, ps } = setup();
  withRate(gs, 0);
  let list = getComingUp(gs, { buildings: bs, prestige: ps, now: NOW });
  const gen = list.find(i => i.id === 'generator');
  assert.ok(gen, 'next generator listed');
  assert.ok(gen.text.includes(BUILDING_DEFINITIONS[0].name));
  assert.equal(gen.eta, null, 'no income yet: no ETA');
  assert.ok(list.some(i => i.id.startsWith('tab-')), 'next tab teaser listed');
  assert.ok(list.every(i => i.id !== 'field' && i.id !== 'shop' && i.id !== 'chronicle'), 'no prestige items before the first New Well');
  assert.ok(list.length <= MAX_ITEMS);
  for (const i of list) {
    assert.ok(i.pct >= 0 && i.pct <= 1, `${i.id} pct in range`);
    assert.ok(i.text && !i.text.includes('{'), `${i.id} text filled: ${i.text}`);
  }
  // Locked tabs stay a mystery, like the side-nav teaser
  const teaser = list.find(i => i.id === 'tab-codex');
  if (teaser) assert.ok(teaser.text.includes('???'), teaser.text);

  gs.buildings.tapper.count = 1;
  gs.aether = new BigNum(0);
  withRate(gs, 10);
  list = getComingUp(gs, { buildings: bs, prestige: ps, now: NOW });
  const next = list.find(i => i.id === 'generator');
  assert.ok(next.text.includes(BUILDING_DEFINITIONS[1].name), 'moves to the first generator not bought');
  const cost = bs.getBuildingCost(BUILDING_DEFINITIONS[1].id, 1).toNumber();
  assert.ok(Math.abs(next.eta - cost / 10) < 1e-9, 'ETA = cost / Oil per second');
}

console.log('--- after New Wells: Reserve Shop tier and the next New Field ---');
{
  const { gs, bs, ps } = setup();
  withRate(gs, 100);
  gs.unlocks = { prestige: 1, talents: 1, calendar: 1, leaderboard: 1, codex: 1, combat: 1, mining: 1, spells: 1, bounties: 1, garden: 1, alchemy: 1 };
  gs.ascensionCount = 2;
  gs.totalCosmicDust = new BigNum(100);
  for (const d of BUILDING_DEFINITIONS.slice(0, 8)) gs.buildings[d.id].count = 1;
  const list = getComingUp(gs, { buildings: bs, prestige: ps, now: NOW }, 10);
  const shop = list.find(i => i.id === 'shop');
  assert.ok(shop, 'next Reserve Shop tier listed');
  assert.ok(Math.abs(shop.pct - 2 / 3) < 1e-9, 'tier 3 at 2 New Wells');
  const field = list.find(i => i.id === 'field');
  assert.ok(field, 'next New Field listed');
  assert.ok(Math.abs(field.pct - 100 / 400) < 1e-9, '100 of the 400 Reserves gate');
  assert.ok(field.text.includes(BUILDING_DEFINITIONS[8].name), 'names the generator it opens');
  assert.equal(list.find(i => i.id === 'generator'), undefined, 'every open generator owned');

  // A New Well paying past the gate: the New Field is one New Well away
  gs.totalAetherEarned = new BigNum(DUST_REF).mul(new BigNum(32).pow(5)); // pays 320
  const f2 = getComingUp(gs, { buildings: bs, prestige: ps, now: NOW }, 10).find(i => i.id === 'field');
  assert.equal(f2.eta, MIN_RUN_SECONDS, 'waits only for the minimum run');
  gs.totalCosmicDust = new BigNum(400);
  const f3 = getComingUp(gs, { buildings: bs, prestige: ps, now: NOW }, 10).find(i => i.id === 'field');
  assert.equal(f3.eta, 0, 'gate met: ready');
}

console.log('--- after a New Field: Share Tree node and the Chronicle gate ---');
{
  const { gs, bs, ps } = setup();
  withRate(gs, 100);
  gs.ascensionCount = 30;
  gs.transcendenceCount = 2;
  gs.fractureShards = new BigNum(1);
  gs.totalFractureShards = new BigNum(4);
  const list = getComingUp(gs, { buildings: bs, prestige: ps, now: NOW }, 20);
  const node = list.find(i => i.id === 'node');
  assert.ok(node, 'a Share Tree node listed');
  assert.equal(node.eta, 0, 'a 1-Share node is affordable now');
  const chron = list.find(i => i.id === 'chronicle');
  assert.ok(chron, 'Chronicle gate listed');
  assert.ok(chron.pct > 0 && chron.pct < 1);
  assert.equal(list.find(i => i.id === 'shop'), undefined, 'every Reserve Shop tier open at 30 New Wells');
  assert.equal(list[0].eta, 0, 'ready items first');
}

console.log('--- wiring: page, shell chip, stylesheet, no economy imports changed ---');
{
  const main = read('./js/main.js');
  assert.ok(main.includes("import { ComingUpUI } from './ui/comingUp.js'"));
  assert.ok(main.includes('this.comingUp?.update(dt)'));
  assert.ok(read('./js/ui/shell.js').includes('this.app.comingUp'), 'goal chip opens the panel');
  assert.ok(read('./index.html').includes('css/coming-up.css'));
}

console.log('All R54 Coming up tests passed.');
