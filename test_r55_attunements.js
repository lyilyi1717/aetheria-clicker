// R55: Ascension attunements. Each effect (Idle, Steady, Focus), the "best is at most +40%" rule,
// the pick lock (first generator) and the next-run pick, Auto-Ascend keeping the pick, Auto-tap not
// counting as a tap, old saves loading as Idle, and the panel being wired into the page.
// Run: node test_r55_attunements.js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { BuildingSystem } from './js/systems/BuildingSystem.js';
import { PrestigeSystem } from './js/systems/PrestigeSystem.js';
import { ClickerSystem } from './js/systems/ClickerSystem.js';
import { UpgradeSystem, TIER_UPGRADE_MULT, getTierUpgradeMult } from './js/systems/UpgradeSystem.js';
import { buyShopItem } from './js/systems/DustShopSystem.js';
import { particles } from './js/engine/ParticleEngine.js';
import {
  ATTUNEMENT_IDS, DEFAULT_ATTUNEMENT, IDLE_BONUS, IDLE_AFTER_SECONDS, STEADY_UPGRADE_BOOST, FOCUS_PER_MILESTONE,
  FOCUS_CAP, getAttunement, getAttunementBonus, setAttunement, canChangeAttunement, getNextAttunement,
  getFocusMilestones, sanitizeAttunementState
} from './js/systems/AttunementSystem.js';

globalThis.window = globalThis.window || { innerWidth: 1000, innerHeight: 800 };
particles.suppressed = true;
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b)), `${msg || ''}: ${a} vs ${b}`);

// A state with a flat 1000 Oil/s base, after its first New Well
function make({ asc = 1, cps = 1000 } = {}) {
  const gs = new GameState();
  gs.buildingSystem = { getTotalProduction: () => new BigNum(cps), getTotalBuildingsCount: () => 0 };
  gs.ascensionCount = asc;
  gs.critChance = 0;
  return gs;
}
const prod = (gs) => gs.getNetAetherPerSecond().toNumber();

console.log('--- defaults: Idle, open from the first New Well ---');
{
  assert.deepEqual(ATTUNEMENT_IDS, ['idle', 'steady', 'focus']);
  assert.equal(DEFAULT_ATTUNEMENT, 'idle');
  const fresh = make({ asc: 0 });
  assert.equal(fresh.attunement.id, 'idle');
  assert.equal(getAttunement(fresh), null, 'no attunement before the first New Well');
  assert.equal(prod(fresh), 1000);
  assert.equal(setAttunement(fresh, 'steady'), false);
  assert.equal(getAttunement(make()), 'idle');
}

console.log('--- the best attunement is at most +40% ---');
{
  assert.ok(IDLE_BONUS <= 0.4 && FOCUS_CAP <= 0.4);
  // Steady with all 6 upgrades of a tier bought
  const steadyMax = ((1 + (TIER_UPGRADE_MULT - 1) * (1 + STEADY_UPGRADE_BOOST)) / TIER_UPGRADE_MULT) ** 6 - 1;
  assert.ok(steadyMax <= 0.4, `Steady max +${(steadyMax * 100).toFixed(1)}%`);
}

console.log('--- Idle: +30% while the last tap is at least 60 s old ---');
{
  const gs = make();
  near(prod(gs), 1300, 'never tapped (fresh load)');
  gs.secondsSinceTap = 10;
  assert.equal(prod(gs), 1000, 'tapped 10 s ago');
  gs.secondsSinceTap = IDLE_AFTER_SECONDS;
  near(prod(gs), 1300, 'exactly 60 s');

  // A manual tap resets it; Auto-tap does not
  const c = new ClickerSystem(gs);
  c.handleClick(0, 0);
  assert.equal(gs.secondsSinceTap, 0);
  assert.equal(getAttunementBonus(gs), 0);
  gs.cosmicDust = new BigNum(5);
  assert.ok(buyShopItem(gs, 'auto_tap'));
  let taps = 0;
  c.onAutoTap = () => { taps++; };
  for (let i = 0; i < 70; i++) c.update(1, 1);
  assert.ok(taps >= 60, 'Auto-tap ran');
  assert.ok(gs.secondsSinceTap >= 60);
  near(getAttunementBonus(gs), IDLE_BONUS, 'Auto-tap is not a tap: Idle is back after 60 s');
  // Auto-tap's own taps (0.5 s of production) include the bonus
  near(gs.getAutoTapPerSecond().toNumber(), 1300 * 0.5);
}

console.log('--- Steady: each tier upgrade x1.26 instead of x1.2 ---');
{
  const gs = make();
  const bs = new BuildingSystem(gs);
  gs.buildingSystem = bs;
  new UpgradeSystem(gs);
  gs.upgrades = { tapper_u1: true, tapper_u2: true };
  const idle = getTierUpgradeMult(gs, 'tapper');
  near(idle, 1.2 * 1.2, 'Idle: plain upgrades');
  gs.attunement.id = 'steady';
  near(getTierUpgradeMult(gs, 'tapper'), 1.26 * 1.26, 'Steady: x1.26 each');
  assert.equal(getAttunementBonus(gs), 0, 'no flat production bonus');
  gs.ascensionCount = 0;
  near(getTierUpgradeMult(gs, 'tapper'), 1.44, 'nothing before the first New Well');
}

console.log('--- Focus: +15% per subgame milestone this run, at most +40% ---');
{
  const gs = make();
  gs.stats.totalBlocksMined = 500;   // lifetime counts before the run don't count
  gs.stats.totalBossesSlain = 8;    // under 10: no Dungeon Mastery link in the numbers
  gs.stats.totalPlantsHarvested = 90;
  const ps = new PrestigeSystem(gs);
  gs.attunement.id = 'focus';
  ps.ascend(true, { quiet: true });
  assert.equal(getFocusMilestones(gs).total, 0);
  assert.equal(prod(gs), 1000);
  gs.stats.totalBlocksMined += 25;
  near(getAttunementBonus(gs), FOCUS_PER_MILESTONE, '25 blocks');
  gs.stats.totalBossesSlain += 1;
  near(prod(gs), 1300, 'two milestones');
  gs.stats.totalPlantsHarvested += 10;   // both Garden steps
  assert.equal(getFocusMilestones(gs).total, 4);
  near(getAttunementBonus(gs), FOCUS_CAP, 'capped at +40%');
  const harvest = getFocusMilestones(gs).list.find(m => m.id === 'harvests');
  assert.deepEqual([harvest.since, harvest.done, harvest.next], [10, 2, null]);
  // The next run counts from zero again
  ps.ascend(true, { quiet: true });
  assert.equal(getFocusMilestones(gs).total, 0);
  assert.equal(gs.attunement.id, 'focus', 'the pick carries over');
}

console.log('--- the pick locks with the first generator; a new pick waits for the next run ---');
{
  const gs = make();
  const bs = new BuildingSystem(gs);
  const ps = new PrestigeSystem(gs);
  gs.buildingSystem = bs;
  bs.buyAmount = 1;
  assert.equal(setAttunement(gs, 'steady'), 'now');
  assert.equal(setAttunement(gs, 'focus'), 'now');
  assert.equal(gs.attunement.id, 'focus');
  gs.aether = new BigNum(1e6);
  assert.ok(bs.buyBuilding('tapper', { quiet: true }));
  assert.equal(canChangeAttunement(gs), false);
  assert.equal(setAttunement(gs, 'idle'), 'next');
  assert.equal(getAttunement(gs), 'focus', 'this run keeps Focus');
  assert.equal(getNextAttunement(gs), 'idle');
  assert.equal(setAttunement(gs, 'focus'), 'next', 'picking the current one again clears the queued pick');
  assert.equal(gs.attunement.next, null);
  setAttunement(gs, 'steady');
  // Auto-Ascend (and a manual New Well) start the next run with the queued pick, unlocked
  ps.ascend(true, { quiet: true });
  assert.equal(getAttunement(gs), 'steady');
  assert.equal(canChangeAttunement(gs), true);
  ps.ascend(true, { quiet: true });
  assert.equal(getAttunement(gs), 'steady', 'Auto-Ascend keeps the last pick');

  // Cosmic Genesis grants generators at the run start: that is not a purchase, so no lock
  gs.cosmicDust = new BigNum(100);
  assert.ok(buyShopItem(gs, 'genesis'));
  ps.ascend(true, { quiet: true });
  assert.ok(gs.buildings.tapper.count > 0, 'Genesis granted generators');
  assert.equal(canChangeAttunement(gs), true);
}

console.log('--- saves: round trip, old saves get Idle, junk is cleaned ---');
{
  const gs = make();
  gs.attunement.id = 'focus';
  gs.attunement.locked = true;
  gs.attunement.next = 'steady';
  gs.stats.totalBlocksMined = 30;
  const data = JSON.parse(JSON.stringify(gs.serialize()));
  const back = new GameState();
  back.deserialize(JSON.parse(JSON.stringify(data)));
  assert.deepEqual([back.attunement.id, back.attunement.locked, back.attunement.next], ['focus', true, 'steady']);
  assert.equal(back.secondsSinceTap, Infinity, 'tap clock is runtime only');

  // A save from before R55 (no field): Idle, unlocked, milestones from the moment it loads
  const old = JSON.parse(JSON.stringify(data));
  delete old.attunement;
  old.stats.totalBlocksMined = 400;
  const loaded = new GameState();
  loaded.deserialize(old);
  assert.equal(loaded.attunement.id, 'idle');
  assert.equal(loaded.attunement.locked, false);
  assert.equal(loaded.attunement.next, null);
  assert.equal(loaded.attunement.runStart.blocks, 400, 'old lifetime blocks are not this run\'s');
  loaded.buildingSystem = { getTotalProduction: () => new BigNum(1000), getTotalBuildingsCount: () => 0 };
  assert.equal(getAttunement(loaded), 'idle');

  // Junk values
  const junk = sanitizeAttunementState({ id: 'turbo', next: 'nope', locked: 'yes', runStart: { blocks: -5, bosses: 'x' } }, { stats: { totalBossesSlain: 3 } });
  assert.deepEqual(junk, { id: 'idle', next: null, locked: false, runStart: { blocks: 0, bosses: 3, harvests: 0 } });
  // A runStart above the current stats (hand edit) can't hide milestones forever
  assert.equal(sanitizeAttunementState({ id: 'focus', runStart: { blocks: 9e9 } }, { stats: { totalBlocksMined: 10 } }).runStart.blocks, 10);
}

console.log('--- wired into the page and the sim ---');
{
  const main = read('./js/main.js');
  assert.ok(main.includes("from './ui/attunements.js'") && main.includes('this.attunementUI.init()') && main.includes('this.attunementUI?.update()'));
  const ui = read('./js/ui/attunements.js');
  assert.ok(ui.includes("role=\"radiogroup\"") && ui.includes('css/attunements.css'));
  assert.ok(read('./css/attunements.css').includes('@media (max-width: 639px)'), 'phone layout: one card per row');
  assert.ok(read('./sim/core-pacing.mjs').includes('DEFAULT_ATTUNEMENT'), 'the sim plays the default pick');
}

console.log('All R55 attunement tests passed.');
