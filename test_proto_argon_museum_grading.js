// Test for Master Parallel Execution Plan - Workstream B (Issues B1 & B2 / M6 & M8)
// PSA-Style Museum Grading, Restoration Lab, Rafeeq Callings & Lifetime Ledgers
// Run: node test_proto_argon_museum_grading.js

import * as G from './digger-argon/game.js';
import {
  GRADES,
  evaluateFossilGrade,
  ensureMuseumSpecimens,
  getSpecimen,
  allSpecimens,
  specimenGrade,
  recordSpecimen,
  canRestoreSpecimen,
  brushSpecimen,
  restoreSpecimen,
} from './digger-argon/features/museum/rules.js';
import museumStrings from './digger-argon/features/museum/strings.js';

import {
  ANTIQUITIES,
  canRestoreAntiquity,
  restoreAntiquity,
  isAntiquityEquipped,
  equippedAntiquities,
  equipAntiquity,
  unequipAntiquity,
  highlightHiddenChests,
  channelSiphonDamage,
  triggerGoldenMortar,
  hasMortarBoost,
  brushMinigameStroke,
} from './digger-argon/features/antiquities/rules.js';
import antiquitiesStrings from './digger-argon/features/antiquities/strings.js';

import {
  CALLINGS,
  assignCalling,
  getCalling,
  activeCallings,
  hasCalling,
  countCalling,
  hasGuildSynergy,
  baroodiBlastVectors,
  dropRateMultiplier,
  triggerCoordinatedBlast,
  triggerDeepDredge,
} from './digger-argon/features/guilds/rules.js';
import guildsStrings from './digger-argon/features/guilds/strings.js';

import {
  MAX_CREW_SEATS,
  ensureRoster,
  rafeeqSeats,
  rafeeqRoster,
  rafeeqSeat,
  rafeeqName,
  rafeeqTrait,
  rafeeqCalling,
  rafeeqLifetimeLedger,
  rafeeqCampfireDialogue,
  rafeeqStats,
} from './digger-argon/features/rafeeqs/rules.js';
import rafeeqsStrings from './digger-argon/features/rafeeqs/strings.js';
import rafeeqsStringsAr from './digger-argon/features/rafeeqs/strings.ar.js';

let failed = 0;
const ok = (cond, msg) => {
  if (!cond) {
    failed++;
    console.error('FAIL: ' + msg);
  } else {
    console.log('PASS: ' + msg);
  }
};

console.log('====================================================');
console.log('Testing Workstream B: Layer 3 Living Caravan & Antiquity Asset Engine');
console.log('Issues B1 (M6: Museum PSA Grading & Lab) & B2 (M8: Rafeeq Callings)');
console.log('====================================================');

// ============================================================================
// 1. Bilingual String Parity for Workstream B Features
// ============================================================================
console.log('\n--- 1. Bilingual String Parity ---');
{
  // Museum strings
  const musKeys = [
    'grade_10', 'grade_9', 'grade_9_restored', 'grade_8', 'grade_7',
    'slab_gold', 'slab_silver', 'slab_bronze', 'velvet_case_title',
    'specimen_restored_toast',
  ];
  for (const k of musKeys) {
    ok(typeof museumStrings.en[k] === 'string' && museumStrings.en[k].length > 0, `Museum EN: ${k}`);
    ok(typeof museumStrings.ar[k] === 'string' && museumStrings.ar[k].length > 0, `Museum AR: ${k}`);
  }

  // Antiquities strings
  const antKeys = [
    'antiquities_title', 'antiquities_sub', 'antiquity_slot', 'antiquity_empty',
    'ant_scarab_compass', 'ant_obsidian_siphon', 'ant_golden_mortar',
    'restoration_lab_title', 'restoration_brush_btn', 'restoration_cleared', 'restoration_done',
  ];
  for (const k of antKeys) {
    ok(typeof antiquitiesStrings.en[k] === 'string' && antiquitiesStrings.en[k].length > 0, `Antiquities EN: ${k}`);
    ok(typeof antiquitiesStrings.ar[k] === 'string' && antiquitiesStrings.ar[k].length > 0, `Antiquities AR: ${k}`);
  }

  // Guilds strings
  const guildKeys = [
    'guilds_title', 'calling_naqqab', 'calling_baroodi', 'calling_ghawwas', 'calling_muhandis',
    'synergy_coordinated_blast', 'synergy_deep_dredge',
  ];
  for (const k of guildKeys) {
    ok(typeof guildsStrings.en[k] === 'string' && guildsStrings.en[k].length > 0, `Guilds EN: ${k}`);
    ok(typeof guildsStrings.ar[k] === 'string' && guildsStrings.ar[k].length > 0, `Guilds AR: ${k}`);
  }

  // Rafeeqs strings
  const rqKeys = [
    'rq_blocks_broken', 'rq_relics_found', 'rq_joined_level', 'rq_favorite_tea',
    'rq_campfire_title', 'rq_campfire_naqqab', 'rq_campfire_baroodi', 'rq_campfire_ghawwas', 'rq_campfire_muhandis',
  ];
  for (const k of rqKeys) {
    ok(typeof rafeeqsStrings.en[k] === 'string' && rafeeqsStrings.en[k].length > 0, `Rafeeqs EN: ${k}`);
    ok(typeof rafeeqsStringsAr.ar[k] === 'string' && rafeeqsStringsAr.ar[k].length > 0, `Rafeeqs AR: ${k}`);
  }
}

// ============================================================================
// 2. Issue B1 (M6): Museum PSA-Style Condition Grading Physics
// ============================================================================
console.log('\n--- 2. Excavation Condition Physics & Grading ---');
{
  const s = G.newState();

  // Test 2.1: Broken with fine pick tip on accented beat (Good Hit) -> Grade 10 (Gem Mint)
  const bGoodHit = {
    src: 'you',
    byHand: true,
    cell: { hits: 0 },
    info: { goodHit: true, fineTip: true },
  };
  const g10 = evaluateFossilGrade(s, bGoodHit);
  ok(g10.grade === 10, 'Fine pick tip on accented beat awards Grade 10');
  ok(g10.label.includes('Gem Mint'), 'Grade 10 is labeled Gem Mint');
  ok(g10.slab === 'gold', 'Grade 10 slab is gold');
  ok(g10.clean === true, 'Grade 10 specimen is clean');

  // Test 2.2: Broken with standard pick swing -> Grade 9 (Mint)
  const bStandard = {
    src: 'you',
    byHand: true,
    cell: { hits: 0 },
    info: {},
  };
  const g9 = evaluateFossilGrade(s, bStandard);
  ok(g9.grade === 9, 'Standard pick swing awards Grade 9');
  ok(g9.label.includes('Mint'), 'Grade 9 is labeled Mint');
  ok(g9.slab === 'silver', 'Grade 9 slab is silver');
  ok(g9.clean === true, 'Grade 9 specimen is clean');

  // Test 2.3: Chipped swings (> 2 hits) -> Grade 8 (Near Mint)
  const bChipped = {
    src: 'you',
    byHand: true,
    cell: { hits: 2 }, // cell previously survived 2 hits, now breaking on hit 3 (> 2 hits)
    info: {},
  };
  const g8 = evaluateFossilGrade(s, bChipped);
  ok(g8.grade === 8, 'Chipped swings (> 2 hits) awards Grade 8');
  ok(g8.label.includes('Near Mint'), 'Grade 8 is labeled Near Mint');
  ok(g8.clean === true, 'Grade 8 specimen is clean');

  // Test 2.4: Obliterated by collateral TNT shockwaves -> Grade 7 (Weathered / Fractured)
  const bTnt = {
    src: 'tnt',
    cell: { tntDamaged: true },
    info: { tnt: true },
  };
  const g7 = evaluateFossilGrade(s, bTnt);
  ok(g7.grade === 7, 'Obliterated by collateral TNT shockwave awards Grade 7');
  ok(g7.label.includes('Weathered'), 'Grade 7 is labeled Weathered');
  ok(g7.slab === 'bronze', 'Grade 7 slab is bronze');
  ok(g7.clean === false, 'Grade 7 specimen is marked clean: false (damaged)');
}

// ============================================================================
// 3. Specimen Data Structure & Excavation Recording
// ============================================================================
console.log('\n--- 3. Specimen Ledger & Event Emission ---');
{
  const s = G.newState();
  s.top = 10;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;

  // Place a fossil cell at row 15, col 2
  s.rows[5] = [];
  for (let c = 0; c < G.COLS; c++) {
    s.rows[5][c] = { t: 'dirt', hp: 1, max: 1 };
  }
  const fossilCell = G.makeCell(15, 'fossil');
  fossilCell.hp = 1;
  fossilCell.max = 1;
  s.rows[5][2] = fossilCell;

  const events = [];
  const ev = (k, d) => events.push({ k, d });

  // Break with fine pick tip / goodHit
  s._goodHit = true;
  G.damage(s, 15, 2, 10, 'you', ev, { goodHit: true });
  s._goodHit = false;

  const gradedEv = events.find(e => e.k === 'fossilGraded');
  ok(gradedEv !== undefined, 'fossilGraded event was emitted');
  ok(gradedEv.d.grade === 10, 'Excavation recorded Grade 10 specimen');
  ok(gradedEv.d.slab === 'gold', 'Excavation recorded Gold slab');

  // Verify specimen structure in s.museum.specimens
  const spec = getSpecimen(s, gradedEv.d.id);
  ok(spec !== null, 'Specimen exists in museum repository');
  ok(spec.grade === 10, 'Specimen grade is 10');
  ok(spec.clean === true, 'Specimen clean is true');
  ok(spec.restored === false, 'Specimen initially not restored');
  ok(typeof spec.excavatedAt === 'number', 'excavatedAt timestamp recorded');
}

// ============================================================================
// 4. Alqahwa Restoration Lab: Interactive Tactile Brush Minigame
// ============================================================================
console.log('\n--- 4. Alqahwa Restoration Lab Minigame ---');
{
  const s = G.newState();

  // Create a Grade 7 Weathered specimen
  const specId = 'camel.0';
  recordSpecimen(s, specId, { grade: 7, clean: false, restored: false });

  ok(canRestoreSpecimen(s, specId) === true, 'Grade 7 specimen can be restored in lab');

  const events = [];
  const ev = (k, d) => events.push({ k, d });

  // 5 interactive tactile brush strokes: each clears 20% debris
  const s1 = brushSpecimen(s, specId, ev);
  ok(s1.strokes === 1 && s1.debrisPercent === 80, 'Stroke 1 clears 20% debris (80% remaining)');
  ok(s1.done === false, 'Minigame not done after stroke 1');

  const s2 = brushSpecimen(s, specId, ev);
  ok(s2.strokes === 2 && s2.debrisPercent === 60, 'Stroke 2 clears 20% debris (60% remaining)');

  const s3 = brushSpecimen(s, specId, ev);
  ok(s3.strokes === 3 && s3.debrisPercent === 40, 'Stroke 3 clears 20% debris (40% remaining)');

  const s4 = brushSpecimen(s, specId, ev);
  ok(s4.strokes === 4 && s4.debrisPercent === 20, 'Stroke 4 clears 20% debris (20% remaining)');

  const s5 = brushSpecimen(s, specId, ev);
  ok(s5.strokes === 5 && s5.debrisPercent === 0, 'Stroke 5 clears all debris (0% remaining)');
  ok(s5.done === true, 'Minigame marks specimen restored');
  ok(s5.grade === 9, 'Specimen condition elevated from Grade 7 to Grade 9 (Restored Mint)');

  const restoredSpec = getSpecimen(s, specId);
  ok(restoredSpec.grade === 9, 'Specimen grade in state is now 9');
  ok(restoredSpec.restored === true, 'Specimen restored flag is true');
  ok(canRestoreSpecimen(s, specId) === false, 'Already restored specimen cannot be restored again');

  ok(events.some(e => e.k === 'specimenRestored' && e.d.grade === 9), 'specimenRestored event emitted');

  // Test minigame stroke via antiquities brushMinigameStroke
  const specId2 = 'whale.1';
  recordSpecimen(s, specId2, { grade: 8, clean: true, restored: false });
  const labRes = brushMinigameStroke(s, specId2);
  ok(labRes.stroke === 1 && labRes.clearedPercent === 20, 'brushMinigameStroke stroke 1 clears 20%');
  for (let i = 2; i <= 5; i++) brushMinigameStroke(s, specId2);
  const spec2Done = getSpecimen(s, specId2);
  ok(spec2Done.grade === 9 && spec2Done.restored === true, 'Lab brush elevates Grade 8 to Grade 9');
}

// ============================================================================
// 5. Active Antiquity Powers (Scarab Compass, Obsidian Siphon, Golden Mortar)
// ============================================================================
console.log('\n--- 5. Active Antiquity Powers & Loadout Sockets ---');
{
  const s = G.newState();
  s.wingDone = { scarab: true, whale: true, camel: true };
  s.antiquities = { unlocked: [], equipped: [null, null, null], mortarBoost: 0, mortarMult: 2 };

  // Unlock all 3 antiquities
  ok(restoreAntiquity(s, 'scarab_compass'), 'Restored Scarab Compass');
  ok(restoreAntiquity(s, 'obsidian_siphon'), 'Restored Obsidian Siphon');
  ok(restoreAntiquity(s, 'golden_mortar'), 'Restored Golden Mortar');

  // Equip into 3 active sockets
  equipAntiquity(s, 'scarab_compass', 0);
  equipAntiquity(s, 'obsidian_siphon', 1);
  equipAntiquity(s, 'golden_mortar', 2);
  ok(equippedAntiquities(s).filter(Boolean).length === 3, 'All 3 loadout sockets filled');

  // 5.1 Scarab Compass: reveals hidden chests AND rare ores
  s.top = 0;
  s.rows = [];
  for (let i = 0; i < 4; i++) {
    s.rows[i] = [];
    for (let c = 0; c < G.COLS; c++) s.rows[i][c] = { t: 'dirt', hp: 1, max: 1 };
  }
  s.rows[1][2] = { t: 'chest', hp: 4, max: 4, shown: 0 };
  s.rows[2][4] = { t: 'gem', hp: 3, max: 3, shown: 0 };
  s.rows[3][1] = { t: 'gold', hp: 3, max: 3, shown: 0 };

  const highlighted = highlightHiddenChests(s);
  ok(highlighted.length === 3, 'Scarab Compass reveals chest, gem ore, and gold ore');
  ok(s.rows[1][2].revealed && s.rows[2][4].revealed && s.rows[3][1].revealed, 'All 3 blocks revealed');

  // 5.2 Obsidian Siphon: 5% of TNT explosion damage directly to Gate
  s.boss = { row: 30, hp: 2000, max: 2000, gate: 1, you: 0 };
  const siphoned = channelSiphonDamage(s, 1000); // 1000 * 0.05 = 50
  ok(siphoned === 50, 'Obsidian Siphon diverts exactly 50 damage (5% of 1000 TNT damage)');
  ok(s.boss.hp === 1950, 'Gate HP reduced to 1950');

  // 5.3 Golden Mortar: 3x Rafeeq speed boost for 15 seconds
  s.diggers = [G.newRafeeq(s, 0)];
  const baseCrewRate = G.crewRate(s);
  triggerGoldenMortar(s, 15, () => {}, 3); // 3x boost for 15s
  ok(hasMortarBoost(s) === true, 'Mortar boost is active');
  ok(s.antiquities.mortarBoost === 15, 'Mortar duration is 15s');
  ok(G.crewRate(s) === baseCrewRate * 3, 'Golden Mortar triples crew rate to 3x');
}

// ============================================================================
// 6. Issue B2 (M8): Rafeeq 8 Persistent Crew Seats & Lifetime Ledgers
// ============================================================================
console.log('\n--- 6. Rafeeq 8 Persistent Crew Seats & Lifetime Ledgers ---');
{
  const s = G.newState();
  s.diggers = [G.newRafeeq(s, 0), G.newRafeeq(s, 1)];

  // Ensure 8 persistent crew seats
  const roster = ensureRoster(s);
  ok(roster.length === 8, 'Roster contains exactly 8 persistent crew seats');
  ok(s.rafeeqs.roster.length === 8, 's.rafeeqs.roster has 8 seats');

  // Verify seat data structure
  for (let i = 0; i < 8; i++) {
    const seat = roster[i];
    ok(typeof seat.name === 'string', `Seat ${i} has individual name: ${seat.name}`);
    ok(typeof seat.trait === 'string', `Seat ${i} has trait: ${seat.trait}`);
    ok(typeof seat.favoriteTea === 'string', `Seat ${i} has favorite tea: ${seat.favoriteTea}`);
    ok(typeof seat.blocksBroken === 'number', `Seat ${i} tracks blocksBroken`);
    ok(typeof seat.relicsFound === 'number', `Seat ${i} tracks relicsFound`);
    ok(typeof seat.joinedAtLevel === 'number', `Seat ${i} tracks joinedAtLevel`);
  }

  // Simulate digging: increment lifetime ledger
  roster[0].life.broke += 150;
  roster[0].blocksBroken = roster[0].life.broke;
  roster[0].lifetimeBlocks = roster[0].life.broke;
  roster[0].relicsFound = 3;
  roster[0].relicsDiscovered = 3;

  const ledger0 = rafeeqLifetimeLedger(s, 0);
  ok(ledger0.blocksBroken === 150, 'Lifetime ledger tracks 150 blocks broken');
  ok(ledger0.lifetimeBlocks === 150, 'Lifetime ledger tracks lifetimeBlocks alias');
  ok(ledger0.relicsFound === 3, 'Lifetime ledger tracks 3 relics found');
  ok(ledger0.relicsDiscovered === 3, 'Lifetime ledger tracks relicsDiscovered alias');
}

// ============================================================================
// 7. 4 Architectural Callings at Alqahwa Guild Hall
// ============================================================================
console.log('\n--- 7. 4 Architectural Callings & Modifiers ---');
{
  const s = G.newState();
  s.diggers = [G.newRafeeq(s, 0), G.newRafeeq(s, 1), G.newRafeeq(s, 2), G.newRafeeq(s, 3)];

  // Calling 1: Naqqab (The Breaker) - +100% crack critical damage on Big Rock glowing cracks
  assignCalling(s, 0, 'naqqab');
  ok(getCalling(s, 0) === 'naqqab', 'Seat 0 assigned Naqqab');
  const naqqabMult = G.fold('weakCrackMult', s, 3);
  ok(naqqabMult === 6, 'Naqqab doubles glowing crack multiplier from 3 to 6 (+100% damage)');

  // Calling 2: Baroodi (The Pyrotechnician) - Doubles TNT radius and forces downward blast
  assignCalling(s, 1, 'baroodi');
  ok(getCalling(s, 1) === 'baroodi', 'Seat 1 assigned Baroodi');
  ok(G.fold('tntRadius', s, 1) === 2, 'Baroodi doubles TNT radius from 1 to 2');
  ok(G.fold('tntDownward', s, false) === true, 'Baroodi forces downward blast vector');
  const blastVecs = baroodiBlastVectors(2);
  ok(blastVecs.every(([dr]) => dr >= 0), 'All Baroodi blast vectors propagate downward (dr >= 0)');

  // Calling 3: Ghawwas (The Prospector) - +50% fossil/gem drop rate
  assignCalling(s, 2, 'ghawwas');
  ok(getCalling(s, 2) === 'ghawwas', 'Seat 2 assigned Ghawwas');
  ok(Math.abs(G.fold('fossilRate', s, 1.0) - 1.5) < 1e-6, 'Ghawwas increases fossil rate by +50%');
  ok(Math.abs(G.fold('oreRate', s, 1.0) - 1.5) < 1e-6, 'Ghawwas increases ore/gem rate by +50%');
  ok(dropRateMultiplier(s, 'gem') === 1.5, 'dropRateMultiplier returns 1.5 for gems');

  // Calling 4: Muhandis (The Engineer) - Scaffolding prevents living rock regrowth
  assignCalling(s, 3, 'muhandis');
  ok(getCalling(s, 3) === 'muhandis', 'Seat 3 assigned Muhandis');
  ok(G.fold('preventRegrowth', s, false) === true, 'Muhandis scaffolding prevents living rock regrowth');

  // Calling swap: easily reassignable
  assignCalling(s, 0, 'ghawwas');
  ok(getCalling(s, 0) === 'ghawwas', 'Seat 0 successfully swapped to Ghawwas');
  assignCalling(s, 0, 'naqqab');
}

// ============================================================================
// 8. Synergy Calling Combos
// ============================================================================
console.log('\n--- 8. Synergy Calling Combos ---');
{
  const s = G.newState();
  s.diggers = [G.newRafeeq(s, 0), G.newRafeeq(s, 1), G.newRafeeq(s, 2), G.newRafeeq(s, 3)];

  assignCalling(s, 0, 'naqqab');
  assignCalling(s, 1, 'baroodi');
  assignCalling(s, 2, 'ghawwas');
  assignCalling(s, 3, 'muhandis');

  // Synergy 1: Naqqab + Baroodi -> Coordinated Blast (10% Gate pre-damage on arrival)
  ok(hasGuildSynergy(s, 'coordinated_blast') === true, 'Naqqab + Baroodi triggers Coordinated Blast');

  s.boss = { row: 50, hp: 5000, max: 5000, gate: 1, you: 0 };
  const blastEvents = [];
  const blastDmg = triggerCoordinatedBlast(s, (k, d) => blastEvents.push({ k, d }), { percent: true });
  ok(blastDmg === 500, 'Coordinated blast deals exactly 500 damage (10% of 5000 Gate HP)');
  ok(s.boss.hp === 4500, 'Gate HP reduced from 5000 to 4500');
  ok(blastEvents.some(e => e.k === 'coordinatedBlast'), 'coordinatedBlast event emitted');

  // Synergy 2: Ghawwas + Muhandis -> Deep Dredge (reveals fossils within 4 blocks of lanterns)
  ok(hasGuildSynergy(s, 'deep_dredge') === true, 'Ghawwas + Muhandis triggers Deep Dredge');

  s.top = 20;
  s.deep = { glows: [{ r: 25, c: 3, rad: 3, until: 100 }], bc: 10 };
  s.rows = [];
  for (let i = 0; i < 10; i++) {
    s.rows[i] = [];
    for (let c = 0; c < G.COLS; c++) s.rows[i][c] = { t: 'dirt', hp: 1, max: 1 };
  }
  // Place fossils within 4 blocks of lantern at (25, 3) -> row index 5
  s.rows[5][1] = { t: 'fossil', hp: 3, max: 3, shown: 0 };
  s.rows[6][4] = { t: 'fossil', hp: 3, max: 3, shown: 0 };

  const dredgeEvents = [];
  const dredged = triggerDeepDredge(s, (k, d) => dredgeEvents.push({ k, d }));
  ok(dredged.length === 2, 'Deep Dredge revealed 2 fossils near lantern');
  ok(s.rows[5][1].revealed === true && s.rows[6][4].revealed === true, 'Fossils revealed');
}

// ============================================================================
// 9. Companion Dossier & Campfire Dialogue
// ============================================================================
console.log('\n--- 9. Campfire Banter & Cultural Lore ---');
{
  const s = G.newState();
  s.diggers = [G.newRafeeq(s, 0), G.newRafeeq(s, 1)];
  ensureRoster(s);

  assignCalling(s, 0, 'naqqab');
  assignCalling(s, 1, 'baroodi');

  const naqqabLine = rafeeqCampfireDialogue(s, 0);
  ok(typeof naqqabLine === 'string' && naqqabLine.includes('basalt'), 'Naqqab campfire dialogue contains architectural wisdom');

  const baroodiLine = rafeeqCampfireDialogue(s, 1);
  ok(typeof baroodiLine === 'string' && baroodiLine.includes('fuse'), 'Baroodi campfire dialogue contains pyrotechnic wisdom');

  const name0 = rafeeqName(s, 0);
  ok(typeof name0 === 'string' && name0.length > 0, `Rafeeq 0 has name: ${name0}`);
}

// ============================================================================
// Summary
// ============================================================================
console.log('\n====================================================');
if (failed) {
  console.error(`FAILED: ${failed} assertion(s) failed in Workstream B verification!`);
  process.exit(1);
} else {
  console.log('ALL WORKSTREAM B (ISSUES B1 & B2) TESTS PASSED 100% GREEN!');
  console.log('====================================================');
}
