// Test Workstream D (M9 & M12): Hydraulic Sluices, Thermal Basalt Kilns & Celestial Astrolabe Engine
// Verifies Sunken Aquifers, Geothermal Kiln, Cosmic Cradle & Astral Inversion
// Run: node test_proto_argon_hydraulic_celestial.js

import * as G from './digger-argon/game.js';
import {
  SILT,
  PRESSURE_WELL,
  hasWaterAt,
  hydroPickUse,
  flowAquifer,
  triggerAquiferFlow,
  erodeSiltAt,
} from './digger-argon/features/aquifers/rules.js';
import {
  quenchLavaWater,
  quenchLavaCell,
  shatterObsidianRow,
  addHeat,
  triggerMagmaBurst,
  hasGreatSiphon,
  unlockGreatSiphon,
  greatSiphonRate,
} from './digger-argon/features/geothermal/rules.js';
import {
  ERA_KEYSTONES,
  ASTROLABE_COMPONENTS,
  NARRATIVE_MILESTONES,
  checkNarrativeMilestones,
  findAstrolabeComponent,
  hasAstrolabeComponent,
  addKeystone,
  hasAllKeystones,
  assembleCelestialEngine,
  getMasterArchitectToken,
  generateEndlessContract,
} from './digger-argon/features/cradle/rules.js';
import {
  ASTRAL_GRAVITY_DOWN,
  ASTRAL_GRAVITY_UP,
  getGravityDir,
  setGravityDir,
  stepGravity,
  useMagneticPick,
  CHRONO_BLOCK,
  recordPlayerSwing,
  replayChronoSwings,
  triggerAllChronoReplays,
} from './digger-argon/features/astral/rules.js';

import aquiferStrings from './digger-argon/features/aquifers/strings.js';
import geoStrings from './digger-argon/features/geothermal/strings.js';
import cradleStrings from './digger-argon/features/cradle/strings.js';
import astralStrings from './digger-argon/features/astral/strings.js';

let failed = 0;
const ok = (cond, msg) => {
  if (!cond) {
    failed++;
    console.error('FAIL: ' + msg);
  }
};
const A = (s, r, c) => G.cellAt(s, r, c);
const D = (t, hp = 2) => ({ t, hp, max: hp, s: 0 });

console.log('Testing Workstream D: Hydraulic Sluices, Thermal Basalt Kilns & Celestial Astrolabe Engine...');

function ground(seed = 42) {
  G.seedRng(seed);
  const s = G.newState();
  s.top = 50;
  s.best = 60;
  s.rows = [];
  for (let i = 0; i < G.KEEP_ROWS; i++) {
    s.rows.push(Array.from({ length: G.COLS }, () => D('dirt', 20)));
  }
  s.rows[5] = s.rows[5].map(() => D('hard', 999));
  s.queue = [];
  s.pools = {};
  return s;
}

const runSim = (s, secs, ev) => {
  for (let i = 0; i < secs / 0.05; i++) G.step(s, 0.05, ev);
};
const collect = () => {
  const log = [];
  const ev = (k, d) => log.push([k, d]);
  ev.log = log;
  return ev;
};
const hasEvent = (ev, k) => ev.log.some(x => x[0] === k);

// =========================================================================
// 1. Content Registration & Bilingual String Parity (EN & AR)
// =========================================================================
{
  console.log('--- 1. Registration & Bilingual Strings ---');
  ok(G.BLOCKS.pressureWell, 'pressureWell block registered in BLOCKS');
  ok(G.BLOCKS.silt, 'silt block registered in BLOCKS');
  ok(G.BLOCKS.basalt, 'basalt block registered in BLOCKS');
  ok(G.BLOCKS.obsidian, 'obsidian block registered in BLOCKS');
  ok(G.TOOLS.hydroPick, 'hydroPick tool registered in TOOLS');
  ok(G.TOOLS.magneticPick, 'magneticPick tool registered in TOOLS');

  // Verify Aquifer Strings
  const aquiferKeys = ['b_pressureWell', 'b_silt', 'tool_hydroPick', 'waterwheel'];
  for (const k of aquiferKeys) {
    ok(typeof aquiferStrings.en[k] === 'string' && aquiferStrings.en[k].length > 0, `EN aquifer string ${k} present`);
    ok(typeof aquiferStrings.ar[k] === 'string' && aquiferStrings.ar[k].length > 0, `AR aquifer string ${k} present`);
  }

  // Verify Geothermal Strings
  const geoKeys = ['b_basalt', 'b_obsidian', 'heat_meter', 'magma_burst', 'great_siphon'];
  for (const k of geoKeys) {
    ok(typeof geoStrings.en[k] === 'string' && geoStrings.en[k].length > 0, `EN geo string ${k} present`);
    ok(typeof geoStrings.ar[k] === 'string' && geoStrings.ar[k].length > 0, `AR geo string ${k} present`);
  }

  // Verify Cradle Strings
  const cradleKeys = ['cradle_title', 'engine_active', 'eternal_horizon', 'grandpa_bell', 'abandoned_outpost', 'master_architect_token'];
  for (const k of cradleKeys) {
    ok(typeof cradleStrings.en[k] === 'string' && cradleStrings.en[k].length > 0, `EN cradle string ${k} present`);
    ok(typeof cradleStrings.ar[k] === 'string' && cradleStrings.ar[k].length > 0, `AR cradle string ${k} present`);
  }

  // Verify Astral Strings
  const astralKeys = ['astral_title', 'gravity_inverted', 'tool_magnetic_pick', 'magnet_pull'];
  for (const k of astralKeys) {
    ok(typeof astralStrings.en[k] === 'string' && astralStrings.en[k].length > 0, `EN astral string ${k} present`);
    ok(typeof astralStrings.ar[k] === 'string' && astralStrings.ar[k].length > 0, `AR astral string ${k} present`);
  }
}

// =========================================================================
// 2. Issue D1 (M9): Sunken Aquifers - Cellular Automaton Fluid Propagation
// =========================================================================
{
  console.log('--- 2. Cellular Automaton Fluid Pressure Propagation ---');
  const s = ground(101), ev = collect();
  // Place pressure well at (50, 4)
  s.rows[0][4] = D('pressureWell', 1);
  // Clear downward flow path (51, 4) and (52, 4)
  s.rows[1][4] = null;
  s.rows[2][4] = null;
  // Block downward path at (53, 4) with indestructible hard rock
  s.rows[3][4] = D('hard', 999);
  // Open spaces horizontally to the left (52, 3) and right (52, 5)
  s.rows[2][3] = null;
  s.rows[2][5] = null;

  G.swing(s, 50, 4, ev);
  ok(A(s, 50, 4) === null, 'pressure well breached');
  ok(hasEvent(ev, 'wellBurst') || hasEvent(ev, 'burst'), 'wellBurst event emitted');

  // Let fluid automaton simulate
  runSim(s, 1.0, ev);
  ok(s.pools['50,4'] !== undefined, 'water flows at well origin (50, 4)');
  ok(s.pools['51,4'] !== undefined, 'water flows down into empty space (51, 4)');
  ok(s.pools['52,4'] !== undefined, 'water reaches blocked boundary at (52, 4)');
  ok(s.pools['52,3'] !== undefined || s.pools['52,5'] !== undefined, 'water spreads horizontally when blocked below');
}

// =========================================================================
// 3. Issue D1 (M9): Silt Block Instant Erosion on Water Contact
// =========================================================================
{
  console.log('--- 3. Silt Instant Erosion ---');
  const s = ground(102), ev = collect();
  s.rows[0][4] = D('pressureWell', 1);
  // Place silt directly adjacent and below
  s.rows[1][4] = D('silt', 10);
  s.rows[0][5] = D('silt', 10);

  ok(A(s, 1 + s.top, 4).t === 'silt', 'silt block placed at (51, 4)');
  G.swing(s, 50, 4, ev);
  runSim(s, 1.0, ev);

  ok(A(s, 51, 4) === null, 'silt block at (51, 4) instantly eroded by flowing water');
  ok(A(s, 50, 5) === null, 'silt block at (50, 5) instantly eroded by lateral water contact');
  ok(hasEvent(ev, 'siltErode'), 'siltErode event emitted');
}

// =========================================================================
// 4. Issue D1 (M9): Waterwheel Sieve 3x Multiplier
// =========================================================================
{
  console.log('--- 4. Waterwheel Sieve Rubble Multiplier ---');
  const s = ground(103);
  const basePay = G.rubblePay(s, 50, 2);
  ok(basePay > 0, 'base rubble pay calculated');

  // Add water stream to column 2
  s.pools['52,2'] = s.t + 10;
  ok(hasWaterAt(s, 50, 2), 'hasWaterAt identifies water in column 2');
  const waterPay = G.rubblePay(s, 50, 2);
  ok(waterPay === basePay * 3, `waterwheel sieve applies 3x coin multiplier: got ${waterPay}, expected ${basePay * 3}`);

  // Dry column 6
  const dryPay = G.rubblePay(s, 50, 6);
  ok(dryPay === basePay, `dry column receives 1x standard pay: got ${dryPay}, expected ${basePay}`);
}

// =========================================================================
// 5. Issue D1 (M9): Hydro-Pick Piercing 5 Vertical Blocks
// =========================================================================
{
  console.log('--- 5. Hydro-Pick Piercing Column Blast ---');
  const s = ground(104), ev = collect();
  const initialPower = G.pickPower(s);
  for (let k = 0; k < 5; k++) {
    s.rows[k][1] = D('dirt', 100);
  }
  s.rows[5][1] = D('dirt', 100); // 6th block out of range

  ok(G.canUseTool(s, 'hydroPick', 50, 1), 'hydroPick tool usable at (50, 1)');
  const used = G.useTool(s, 'hydroPick', 50, 1, ev);
  ok(used === true, 'hydroPick tool executed successfully');
  ok(hasEvent(ev, 'hydroPick'), 'hydroPick event emitted');
  const hydroEv = ev.log.find(x => x[0] === 'hydroPick');
  ok(hydroEv && hydroEv[1].struck && hydroEv[1].struck.length === 5, `hydroPick pierced 5 blocks in column: count = ${hydroEv?.[1]?.struck?.length}`);


  // Verify damage dealt to 5 vertical blocks
  for (let k = 0; k < 5; k++) {
    const expectedHp = 100 - (initialPower * 5);
    ok(A(s, 50 + k, 1).hp === expectedHp, `block at row ${50 + k} took 5x pick power: got ${A(s, 50 + k, 1).hp}, expected ${expectedHp}`);
  }
  ok(A(s, 55, 1).hp === 100, '6th block at row 55 remained untouched');
}

// =========================================================================
// 6. Issue D1 (M9): Geothermal Kiln - Thermal Quenching into Obsidian Glass
// =========================================================================
{
  console.log('--- 6. Thermal Quenching into Obsidian Glass ---');
  const s = ground(105), ev = collect();
  s.rows[0][3] = D('lava', 1);
  s.pools['50,4'] = s.t + 10; // Adjacent water stream

  ok(A(s, 50, 3).t === 'lava', 'lava block placed at (50, 3)');
  const quenched = quenchLavaWater(s, ev);
  ok(quenched >= 1, `lava quenched into obsidian count: ${quenched}`);
  ok(A(s, 50, 3).t === 'obsidian', 'lava quenched into brittle obsidian block');
  ok(hasEvent(ev, 'obsidianFormed') || hasEvent(ev, 'lavaQuenched'), 'obsidianFormed event emitted');
}

// =========================================================================
// 7. Issue D1 (M9): Obsidian Glass Cleaves Entire Horizontal Row
// =========================================================================
{
  console.log('--- 7. Obsidian Cleaving Entire Horizontal Row ---');
  const s = ground(106), ev = collect();
  for (let c = 0; c < G.COLS; c++) {
    s.rows[0][c] = D('dirt', 100);
  }
  s.rows[0][3] = D('obsidian', 1);

  G.damage(s, 50, 3, 10, 'you', ev);
  ok(A(s, 50, 3) === null, 'obsidian block broken');
  ok(hasEvent(ev, 'obsidianShatter'), 'obsidianShatter event emitted');

  let remaining = 0;
  for (let c = 0; c < G.COLS; c++) {
    if (A(s, 50, c) !== null) remaining++;
  }
  ok(remaining === 0, `entire horizontal row 50 cleaved: ${remaining} blocks remaining`);
}

// =========================================================================
// 8. Issue D1 (M9): Heat Accumulation Meter & 10 Magma Burst Swings (3x3 Area)
// =========================================================================
{
  console.log('--- 8. Heat Accumulation & Magma Burst 3x3 Cleaving ---');
  const s = ground(107), ev = collect();
  ok(s.geothermal && s.geothermal.heat === 0, 'initial heat meter is 0');
  ok(s.geothermal.burstSwings === 0, 'initial magma burst swings is 0');

  // Accumulate heat: strike 19 hot basalt blocks (+5 each = 95)
  for (let i = 0; i < 19; i++) {
    s.rows[0][0] = D('basalt', 1);
    G.damage(s, 50, 0, 10, 'you', ev);
  }
  ok(s.geothermal.heat === 95, `heat meter reached 95: got ${s.geothermal.heat}`);
  ok(s.geothermal.burstSwings === 0, 'Magma Burst inactive under 100 Heat');

  // 20th block: reaches 100 Heat -> activates 10 Magma Burst swings
  s.rows[0][0] = D('basalt', 1);
  G.damage(s, 50, 0, 10, 'you', ev);
  ok(s.geothermal.heat === 100, `heat meter reached 100: got ${s.geothermal.heat}`);
  ok(s.geothermal.burstSwings === 10, `Magma Burst activated with 10 swings: got ${s.geothermal.burstSwings}`);
  ok(hasEvent(ev, 'magmaBurstReady'), 'magmaBurstReady event emitted');

  // Test 3x3 cleaving damage
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      s.rows[1 + dr][4 + dc] = D('dirt', 100);
    }
  }
  s.rows[0][4] = null; // Open above (51, 4)
  s.rows[1][4] = D('dirt', 100); // Centre block

  const pwr = G.pickPower(s);
  G.swing(s, 51, 4, ev);
  ok(s.geothermal.burstSwings === 9, `burst swings decremented to 9: got ${s.geothermal.burstSwings}`);
  ok(hasEvent(ev, 'magmaBurst'), 'magmaBurst event emitted');

  // Verify surrounding 3x3 cells sustained cleave damage (3x pick power)
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const cell = A(s, 51 + dr, 4 + dc);
      if (!cell) continue;
      ok(cell.hp === 100 - pwr * 3, `surrounding cell at (${51 + dr}, ${4 + dc}) took 3x pick power cleave damage: hp = ${cell.hp}`);
    }
  }

  // Consume remaining 9 swings
  for (let k = 0; k < 9; k++) {
    s.rows[0][k % G.COLS] = D('dirt', 100);
    G.swing(s, 50, k % G.COLS, ev);
  }
  ok(s.geothermal.burstSwings === 0, 'all 10 Magma Burst swings consumed');
  ok(s.geothermal.heat === 0, 'heat meter reset to 0 after Magma Burst ends');
  ok(hasEvent(ev, 'magmaBurstEnd'), 'magmaBurstEnd event emitted');
}

// =========================================================================
// 9. Issue D1 (M9): The Great Siphon Wonder (+1% Passive Stars/hr)
// =========================================================================
{
  console.log('--- 9. The Great Siphon Wonder ---');
  const s = G.newState();
  ok(!hasGreatSiphon(s), 'Great Siphon is locked at start');
  ok(greatSiphonRate(s) === 0, 'passive star rate is 0 before unlock');

  // Complete Chapter 4 climax (Level 80)
  const f80 = G.ROAD[79];
  const key80 = G.roadKey(f80);
  s.road.stamps[key80] = { fin: 1, n: 1, best: 320 };
  s.road.reach = 350;

  ok(hasGreatSiphon(s), 'Great Siphon unlocked upon completing Chapter 4 (Level 80)');
  const rate = greatSiphonRate(s);
  ok(rate > 0, `greatSiphonRate produces positive passive star rate: ${rate} stars/hr`);

  const initialStars = s.stars || 0;
  for (let i = 0; i < 3600 / 0.05; i++) {
    G.step(s, 0.05);
  }
  const starsGained = (s.stars || 0) - initialStars;
  ok(starsGained >= Math.floor(rate), `accumulated passive stars over 1 hr: got ${starsGained}, expected >= ${Math.floor(rate)}`);
}

// =========================================================================
// 10. Issue D2 (M12): Year-Long Narrative Progression (Bell, Outpost, 12 Components)
// =========================================================================
{
  console.log('--- 10. Narrative Progression & 12 Astrolabe Components ---');
  const s = G.newState(), ev = collect();

  ok(ASTROLABE_COMPONENTS.length === 12, '12 Astrolabe Engine components defined');
  ok(ASTROLABE_COMPONENTS.includes('mater_plate'), 'Component 1 (mater_plate) present');
  ok(ASTROLABE_COMPONENTS.includes('celestial_cradle_crown'), 'Component 12 (celestial_cradle_crown) present');

  // Verify Narrative Milestones at Level 20 and Level 40
  checkNarrativeMilestones(s, 10, ev);
  ok(!s.cradle.milestones.grandpaBell, 'Grandpa Bell not discovered at level 10');

  checkNarrativeMilestones(s, 20, ev);
  ok(s.cradle.milestones.grandpaBell === true, 'Grandpa’s Brass Camel Bell discovered at Level 20');
  ok(hasEvent(ev, 'grandpaBellFound'), 'grandpaBellFound event emitted');

  checkNarrativeMilestones(s, 40, ev);
  ok(s.cradle.milestones.abandonedOutpost === true, 'Abandoned Outpost discovered at Level 40');
  ok(hasEvent(ev, 'abandonedOutpostFound'), 'abandonedOutpostFound event emitted');

  // Discover dispersed Astrolabe Engine components
  for (const comp of ASTROLABE_COMPONENTS) {
    findAstrolabeComponent(s, comp, ev);
    ok(hasAstrolabeComponent(s, comp), `Component ${comp} discovered and registered in cradle`);
  }
  ok(s.cradle.components.length === 12, 'All 12 Astrolabe Engine components recovered');
  ok(hasEvent(ev, 'astrolabeComponentFound'), 'astrolabeComponentFound event emitted');
}

// =========================================================================
// 11. Issue D2 (M12): Inverted Gravity Mechanics & Magnetic Pick
// =========================================================================
{
  console.log('--- 11. Inverted Gravity & Magnetic Pick ---');
  const s = G.newState(), ev = collect();
  s.top = 0;
  for (let i = 0; i < G.KEEP_ROWS; i++) {
    s.rows[i] = Array.from({ length: G.COLS }, () => null);
  }

  ok(getGravityDir(s) === ASTRAL_GRAVITY_DOWN, 'Initial gravity direction is DOWN (1)');
  setGravityDir(s, ASTRAL_GRAVITY_UP, ev);
  ok(getGravityDir(s) === ASTRAL_GRAVITY_UP, 'Gravity inverted to UP (-1)');
  ok(hasEvent(ev, 'gravityInverted'), 'gravityInverted event emitted');

  // Place loose rubble at row 4, col 2
  s.rows[4][2] = { t: 'dirt', hp: 20, max: 20, loose: true };
  // Cell above at row 3, col 2 is empty
  const floated = stepGravity(s, 0.1, ev);
  ok(floated === 1, '1 rubble block floated upward');
  ok(s.rows[4][2] === null, 'source cell (4, 2) is now empty');
  ok(s.rows[3][2] !== null && s.rows[3][2].loose === true, 'rubble floated up to cell (3, 2)');
  ok(hasEvent(ev, 'rubbleFloated'), 'rubbleFloated event emitted');

  // Place floating ore and use magnetic pick
  s.rows[3][5] = { t: 'gem', hp: 10, max: 10, floating: true, ore: true };
  const pulled = useMagneticPick(s, ev);
  ok(pulled >= 1, `magnetic pick pulled ${pulled} floating ores`);
  ok(s.rows[3][5] === null, 'floating ore at (3, 5) drawn directly into hold');
  ok(hasEvent(ev, 'magneticPull'), 'magneticPull event emitted');
}

// =========================================================================
// 12. Issue D2 (M12): Chrono-Mining Swing Replay
// =========================================================================
{
  console.log('--- 12. Chrono-Mining Swing Replay ---');
  const s = G.newState(), ev = collect();
  s.top = 0;
  for (let i = 0; i < G.KEEP_ROWS; i++) {
    s.rows[i] = Array.from({ length: G.COLS }, () => ({ t: 'dirt', hp: 500, max: 500 }));
  }

  // Record 12 swings; echo blocks retain last 10
  for (let i = 1; i <= 12; i++) {
    recordPlayerSwing(s, { r: 1, c: 2, dmg: i * 10 });
  }
  ok(s.void.recordedSwings.length === 10, `Echo buffer capped at 10 swings: got ${s.void.recordedSwings.length}`);
  ok(s.void.recordedSwings[0].dmg === 30, 'Oldest swings dropped; swing 3 (dmg 30) is at head');
  ok(s.void.recordedSwings[9].dmg === 120, 'Latest swing (dmg 120) is at tail');

  // Replay swings
  s.rows[1][2] = { t: CHRONO_BLOCK, hp: 3, max: 3, chrono: true };
  const initialHp = s.rows[2][2].hp;
  const replayed = replayChronoSwings(s, 2, ev);
  ok(replayed === 10, 'All 10 recorded swings replayed in column 2');
  ok(s.rows[2][2].hp < initialHp, `Target block sustained replay damage: HP went from ${initialHp} to ${s.rows[2][2].hp}`);
  ok(hasEvent(ev, 'chronoReplayed'), 'chronoReplayed event emitted');

  // Automatic replay cadence every 2.0s
  s.void.replayTimer = 0;
  G.step(s, 2.1, ev);
  ok(s.void.replayTimer < 0.5, 'step advanced past 2.0s and reset replayTimer cleanly');
}

// =========================================================================
// 13. Issue D2 (M12): Earth's Core (Level 240) - Cosmic Cradle, Token & Eternal Horizon
// =========================================================================
{
  console.log('--- 13. Earth’s Core Climax: Cosmic Cradle, Token & Eternal Horizon ---');
  const s = G.newState(), ev = collect();

  ok(ERA_KEYSTONES.length === 12, '12 Era Keystones defined');
  ok(!hasAllKeystones(s), 'Player starts with 0 Keystones');
  ok(!assembleCelestialEngine(s), 'Cannot assemble Celestial Engine without all 12 Keystones');

  // Collect all 12 Keystones
  for (const k of ERA_KEYSTONES) {
    addKeystone(s, k, ev);
  }
  ok(hasAllKeystones(s), 'All 12 Era Keystones verified');
  ok(hasEvent(ev, 'keystoneAcquired'), 'keystoneAcquired event emitted');

  // Perform Grand Engine Assembly Ritual at Level 240
  const assembled = assembleCelestialEngine(s, ev);
  ok(assembled === true, 'Celestial Engine successfully assembled and awakened');
  ok(s.cradle.engineActive === true, 'engineActive state is true');
  ok(s.cradle.eternalHorizonUnlocked === true, 'eternalHorizonUnlocked state is true');
  ok(s.eternalHorizon === true, 'global s.eternalHorizon flag is true');

  // Verify Master Architect Token
  const token = getMasterArchitectToken(s);
  ok(token !== null, 'Master Architect Token issued');
  ok(token.id === '#0042', `Numbered token awarded with id #0042: got ${token.id}`);
  ok(token.title === 'Master Astrolabe Architect', `Token title matches: got ${token.title}`);
  ok(hasEvent(ev, 'engineAwakened'), 'engineAwakened event emitted');
  ok(hasEvent(ev, 'masterArchitectAwarded'), 'masterArchitectAwarded event emitted');

  // Generate procedural Eternal Horizon starlight vault contract
  const contract = generateEndlessContract(s, 42);
  ok(contract.id === 'endless_42', 'Procedural contract generated with id endless_42');
  ok(contract.depth >= 250, `Contract depth is deep into the vault: ${contract.depth}m`);
  ok(contract.eternal === true, 'Contract is marked eternal');
  ok(contract.starlightVault === true, 'Contract is marked starlightVault');
  ok(Array.isArray(contract.modifiers) && contract.modifiers.length >= 1, `Dynamic modifiers attached: ${contract.modifiers.join(', ')}`);
  ok(contract.starsPayout > 500, `High star payout awarded: ${contract.starsPayout}`);
}

// =========================================================================
// Final Results
// =========================================================================
if (failed) {
  console.error(`\nFAILED: ${failed} check(s) failed in test_proto_argon_hydraulic_celestial.js`);
  process.exit(1);
}
console.log('\ntest_proto_argon_hydraulic_celestial: ALL CHECKS PASSED (100% OK)');
