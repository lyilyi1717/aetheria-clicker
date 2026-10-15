// Test for Lead Hardmode & Chili Replay Systems Architect (Argon)
// Run: node test_proto_argon_chili_hardmode.js

import * as G from './digger-argon/game.js';
import siteStrings from './digger-argon/features/sites/strings.js';
import contractStrings from './digger-argon/features/contracts/strings.js';

let failed = 0;
const ok = (cond, msg) => {
  if (!cond) {
    failed++;
    console.error('FAIL: ' + msg);
  } else {
    console.log('PASS: ' + msg);
  }
};

console.log('=== test_proto_argon_chili_hardmode.js ===');

// 1. Bilingual Strings Parity
{
  console.log('--- 1. Bilingual Strings Parity ---');
  const contractKeys = ['c_chili1', 'c_chili1_d', 'c_chili2', 'c_chili2_d', 'c_chili3', 'c_chili3_d', 'c_chili4', 'c_chili4_d', 'c_chili5', 'c_chili5_d', 'hud_chili'];
  for (const k of contractKeys) {
    ok(typeof contractStrings.en[k] === 'string' && contractStrings.en[k].length > 0, `EN contract string exists: ${k}`);
    ok(typeof contractStrings.ar[k] === 'string' && contractStrings.ar[k].length > 0, `AR contract string exists: ${k}`);
  }

  const siteKeys = [
    'chili_replay_title', 'chili_replay_sub', 'chili_toggle_all', 'chili_clear_all',
    'chili_mod_depth', 'chili_mod_stars', 'chili_mod_hit', 'chili_mod_best', 'chili_mod_none',
    'chili_nightmare_perk', 'chili_start_run', 'chili_start_nightmare', 'chili_replay_btn'
  ];
  for (const k of siteKeys) {
    ok(typeof siteStrings.en[k] === 'string' && siteStrings.en[k].length > 0, `EN site string exists: ${k}`);
    ok(typeof siteStrings.ar[k] === 'string' && siteStrings.ar[k].length > 0, `AR site string exists: ${k}`);
  }
}

// 2. Multi-Chili Selection & Helpers
{
  console.log('--- 2. Multi-Chili Selection & Helpers ---');
  const run1 = { chili: 3 };
  ok(G.runChilis(run1).length === 3, 'runChilis converts integer 3 to [1, 2, 3]');
  ok(G.hasChili(run1, 1) && G.hasChili(run1, 2) && G.hasChili(run1, 3), 'hasChili returns true for 1, 2, 3 on legacy chili=3');
  ok(!G.hasChili(run1, 4) && !G.hasChili(run1, 5), 'hasChili returns false for 4, 5 on legacy chili=3');

  const runCustom = { chilis: [1, 4, 5], chili: 3 };
  ok(G.hasChili(runCustom, 1) && G.hasChili(runCustom, 4) && G.hasChili(runCustom, 5), 'hasChili matches custom array [1, 4, 5]');
  ok(!G.hasChili(runCustom, 2) && !G.hasChili(runCustom, 3), 'hasChili returns false for unselected 2, 3');

  const runAll5 = { chilis: [1, 2, 3, 4, 5], chili: 5 };
  ok(G.runChilis(runAll5).length === 5, 'runChilis returns 5 chilis for All 5');
  for (let k = 1; k <= 5; k++) {
    ok(G.hasChili(runAll5, k), `All 5 run has chili ${k}`);
  }
}

// 3. Hardmode Gate Depth (125m+ always)
{
  console.log('--- 3. Hardmode Gate Depth (125m+ always) ---');
  const s = G.newState();
  // Mark dunes 50m as finished
  s.road.stamps['dunes:50'] = { site: 'dunes', floor: 50, twist: '', ch: 1, fin: 1, fast: 1, hard: 0, chili: 0 };

  // Replay without hardmode keeps base floor 50
  const plainCard = G.replayCard(s, 'dunes:50', false);
  ok(plainCard.floor === 50, 'Plain replay card keeps 50m floor');

  // Hardmode chili card enforces at least 125m depth
  const chili1Card = G.chiliCard(s, 'dunes:50', [1]);
  ok(chili1Card.floor === 125, 'Chili replay card scales 50m stage up to 125m Gate depth');
  ok(chili1Card.originFloor === 50, 'Chili replay card preserves originFloor=50');
  ok(chili1Card.originKey === 'dunes:50', 'Chili replay card preserves originKey=dunes:50');

  // Multi-chili card with all 5 chilis
  const chili5Card = G.chiliCard(s, 'dunes:50', [1, 2, 3, 4, 5]);
  ok(chili5Card.floor === 125, '5-Chili card has 125m Gate depth');
  ok(chili5Card.chili === 5, '5-Chili card has chili=5');
  ok(chili5Card.chilis.length === 5, '5-Chili card has 5 active chilis array');

  // Deep site (e.g. 175m) remains 175m (Math.max(125, 175))
  s.road.stamps['bones:175'] = { site: 'bones', floor: 175, twist: '', ch: 1, fin: 1, fast: 0, hard: 0, chili: 0 };
  const deepCard = G.chiliCard(s, 'bones:175', [1, 2]);
  ok(deepCard.floor === 175, 'Stage deeper than 125m retains its depth (175m)');

  // Starting a site with chili card sets run floor to 125
  s.bossesDown = 2; // can move
  G.pickCard(s, chili5Card);
  ok(s.run.floor === 125, 'Active run has floor 125m');
  ok(s.run.originKey === 'dunes:50', 'Active run tracks originKey=dunes:50');
  ok(s.run.chilis.length === 5, 'Active run has 5 active chilis');

  const legs = G.siteLegs(s.run);
  ok(legs.length === 5, '125m Gate run has exactly 5 legs (25m, 50m, 75m, 100m, 125m)');
}

// 4. Chili Modifiers: Hard Rock, Tough Ground, Dim Cavern, Unstable Fault, Furious Gate
{
  console.log('--- 4. The 5 Chili Modifiers ---');

  // Modifier 1: Hard Rock (+50% Boss & Big Rock HP: chiliRock = 1.5)
  {
    const s1 = G.newState();
    s1.run = { site: 'dunes', floor: 125, twist: '', ch: 1, chilis: [], chili: 0 };
    const baseBossHp = G.fold('bossHp', s1, 1000, 25);

    const s1Chili = G.newState();
    s1Chili.run = { site: 'dunes', floor: 125, twist: '', ch: 1, chilis: [1], chili: 1 };
    const hardBossHp = G.fold('bossHp', s1Chili, 1000, 25);
    ok(Math.abs(hardBossHp / baseBossHp - 1.5) < 1e-4, 'Chili 1 multiplies Boss & Big Rock HP by 1.5 (+50%)');
  }

  // Modifier 2: Tough Ground (+40% Dirt/Stone HP: chiliGround = 1.4)
  {
    const s2 = G.newState();
    s2.run = { site: 'dunes', floor: 125, twist: '', ch: 1, chilis: [], chili: 0 };
    const baseGroundMul = G.groundMul(s2);

    const s2Chili = G.newState();
    s2Chili.run = { site: 'dunes', floor: 125, twist: '', ch: 1, chilis: [2], chili: 1 };
    const hardGroundMul = G.groundMul(s2Chili);
    ok(Math.abs(hardGroundMul / baseGroundMul - 1.4) < 1e-4, 'Chili 2 multiplies Dirt/Stone HP by 1.4 (+40%)');
  }

  // Modifier 3: Dim Cavern (Reduced lantern sight radius)
  {
    const s3 = G.newState();
    s3.run = { site: 'dunes', floor: 125, twist: '', ch: 1, chilis: [], chili: 0 };
    const baseSight = G.fold('sight', s3, 3);
    ok(baseSight === 3, 'Normal sight radius is 3');

    const s3Chili = G.newState();
    s3Chili.run = { site: 'dunes', floor: 125, twist: '', ch: 1, chilis: [3], chili: 1 };
    const dimSight = G.fold('sight', s3Chili, 3);
    ok(dimSight === 1, 'Chili 3 (Dim Cavern) clamps sight radius to 1');
  }

  // Modifier 4: Unstable Fault (TNT requires double-hits & reduced blast radius)
  {
    const s4 = G.newState();
    s4.run = { site: 'dunes', floor: 125, twist: '', ch: 1, chilis: [4], chili: 1 };
    const radNormal = G.fold('tntRadius', { run: null }, 2);
    const radChili = G.fold('tntRadius', s4, 2);
    ok(radChili < radNormal, 'Chili 4 reduces TNT blast radius');

    // Test double-hit requirement on TNT cell
    const tntCell = { t: 'tnt', hp: 2, max: 2 };
    const strikeDmg = G.fold('damage', s4, 50, tntCell, 'you', {}, 5);
    ok(strikeDmg === 1, 'Chili 4 restricts single hit to half max HP (1 dmg), requiring double-hits');
  }

  // Modifier 5: Furious Gate (Aggressive cracks, 25% damage resistance & HP regeneration)
  {
    const s5 = G.newState();
    s5.run = { site: 'dunes', floor: 125, twist: '', ch: 1, chilis: [5], chili: 1 };

    // Crack speed: halved (twice as fast shifting)
    const normalCrack = G.fold('crackSeconds', { run: null }, 1.7);
    const furiousCrack = G.fold('crackSeconds', s5, 1.7);
    ok(Math.abs(furiousCrack - 0.85) < 1e-4, 'Chili 5 halves crackSeconds (aggressive shifting)');

    // 25% Damage resistance on the Gate Boss
    const gateCell = { t: 'boss', hp: 1000, max: 1000 };
    const normalState = G.newState();
    normalState.run = { floor: 125, chilis: [] };
    const normalGateDmg = G.fold('damage', normalState, 100, gateCell, 'you', {}, 125);
    const furiousGateDmg = G.fold('damage', s5, 100, gateCell, 'you', {}, 125);
    ok(furiousGateDmg === 75, 'Chili 5 applies 25% damage resistance to the 125m Gate Boss');

    // Regeneration on Gate Boss
    s5.boss = { row: 125, hp: 500, max: 1000 };
    s5.run.started = true;
    G.sites.hooks.step.fn(s5, 1.0, () => {});
    ok(s5.boss.hp > 500, 'Chili 5 Gate Boss regenerates HP during combat');
  }

  // Stacking all 5 Chilis: all modifiers active simultaneously
  {
    const sAll = G.newState();
    sAll.run = { site: 'dunes', floor: 125, twist: '', ch: 1, chilis: [1, 2, 3, 4, 5], chili: 5 };
    ok(Math.abs(G.groundMul(sAll) - 1.4) < 1e-4, '5-Chili run has +40% Ground HP');
    ok(Math.abs(G.fold('bossHp', sAll, 1000, 25) - 1500) < 1e-4, '5-Chili run has +50% Boss HP');
    ok(G.fold('sight', sAll, 3) === 1, '5-Chili run has Dim Cavern sight=1');
    ok(G.fold('tntRadius', sAll, 2) === 1, '5-Chili run has reduced TNT blast radius');
    ok(G.fold('crackSeconds', sAll, 1.7) === 0.85, '5-Chili run has furious crack shift speed');
  }
}

// 5. Compelling Rewards: Star Scaling, Permanent Hit Bonus, Time Attack, Nightmare Loot
{
  console.log('--- 5. Compelling Rewards & Replayability ---');

  // Star Scaling: 1 chili = 2x, 5 chilis = 10x
  ok(G.chiliStarMult(1) === 2, '1 chili = 2x Stars');
  ok(G.chiliStarMult(2) === 3.5, '2 chilis = 3.5x Stars');
  ok(G.chiliStarMult(3) === 5, '3 chilis = 5x Stars');
  ok(G.chiliStarMult(4) === 7.5, '4 chilis = 7.5x Stars');
  ok(G.chiliStarMult(5) === 10, '5 chilis = 10x Stars (exponential scaling)');

  const s = G.newState();
  s.road.stamps['dunes:50'] = { site: 'dunes', floor: 50, twist: '', ch: 1, fin: 1, fast: 1, hard: 0, chili: 0 };
  const card5 = G.chiliCard(s, 'dunes:50', [1, 2, 3, 4, 5]);

  s.bossesDown = 2;
  G.pickCard(s, card5);
  s.run.clock = 45.2; // 45.2s clear time

  // Simulate beating 125m Gate
  s.bossesDown = 5; // 5 * 25 = 125m
  const events = [];
  const ev = (k, d) => events.push({ k, d });
  G.sites.hooks.step.fn(s, 0.1, ev);

  ok(s.run.done, 'Run is marked done upon defeating 125m Gate');

  // Permanent hit power bonus
  ok(s.road.chiliHit > 0, `Permanent chiliHit bonus awarded: +${(s.road.chiliHit * 100).toFixed(1)}%`);
  const initialPickPower = G.pickPower({ ...s, road: { ...s.road, chiliHit: 0 } });
  const boostedPickPower = G.pickPower(s);
  ok(boostedPickPower > initialPickPower, 'pickPower scales with s.road.chiliHit permanent bonus');

  // Time Attack tracking
  const origStamp = s.road.stamps['dunes:50'];
  ok(origStamp && origStamp.chiliBestTime && origStamp.chiliBestTime[5] > 0, 'Origin stamp recorded 5-chili Best Time');
  ok(origStamp.chiliTrophies && origStamp.chiliTrophies[5] === true, 'Origin stamp awarded 5-Chili Trophy');
  ok(origStamp.chili >= 5, 'Origin stamp updated to chili tier 5');

  // 5-Chili Nightmare Loot: Guaranteed 2x Keystones + Antiquity / Rare Fossils
  ok(events.some(e => e.k === 'chili5Loot'), 'chili5Loot event emitted');
  const lootEv = events.find(e => e.k === 'chili5Loot').d;
  ok(lootEv.keystone && lootEv.count === 2, `Awarded 2x ${lootEv.keystone} Keystones`);
  ok(s.keystones[lootEv.keystone] >= 2, 'Keystones added to player state');
  ok(s.bones >= 10, 'Awarded at least 10 rare bones/fossils');
  ok(s.chests >= 5, 'Awarded at least 5 treasure chests');

  console.log(`Loot verified: 2x ${lootEv.keystone} keystones, ${s.bones} bones, ${s.chests} chests.`);
}

console.log(`\n========================================`);
if (failed > 0) {
  console.error(`FAILED: ${failed} tests failed.`);
  process.exit(1);
} else {
  console.log(`ALL TESTS PASSED!`);
}
