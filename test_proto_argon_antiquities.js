// Test for Issue ARGON-17: Month 4: Antiquity Restoration Lab (proto/features/antiquities/)
// Run: node test_proto_antiquities.js

import * as G from './digger-argon/game.js';
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
} from './digger-argon/features/antiquities/rules.js';
import strings from './digger-argon/features/antiquities/strings.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };

console.log('Testing ARGON-17: Antiquity Restoration Lab...');

// 1. Verify bilingual strings parity and structure
{
  const required = [
    'antiquities_title', 'antiquities_sub', 'antiquity_slot', 'antiquity_empty',
    'antiquity_equip', 'antiquity_unequip', 'antiquity_restore', 'antiquity_locked',
    'ant_scarab_compass', 'ant_scarab_compass_d',
    'ant_obsidian_siphon', 'ant_obsidian_siphon_d',
    'ant_golden_mortar', 'ant_golden_mortar_d',
  ];
  for (const k of required) {
    ok(typeof strings.en[k] === 'string' && strings.en[k].length > 0, `EN string for ${k} exists`);
    ok(typeof strings.ar[k] === 'string' && strings.ar[k].length > 0, `AR string for ${k} exists`);
  }
}

// 2. Verify museum set completion & antiquity restoration
{
  const s = G.newState();
  s.wingDone = {};
  s.antiquities = { unlocked: [], equipped: [null, null, null], mortarBoost: 0 };

  ok(!canRestoreAntiquity(s, 'scarab_compass'), 'Cannot restore scarab_compass before scarab set is done');
  ok(!restoreAntiquity(s, 'scarab_compass'), 'restoreAntiquity fails without completed set');

  // Complete the scarab set
  s.wingDone.scarab = true;
  ok(canRestoreAntiquity(s, 'scarab_compass'), 'Can restore scarab_compass once scarab set is done');

  const events = [];
  const ev = (k, d) => events.push({ k, d });
  ok(restoreAntiquity(s, 'scarab_compass', ev), 'Restores scarab_compass successfully');
  ok(s.antiquities.unlocked.includes('scarab_compass'), 'scarab_compass is in unlocked list');
  ok(events.some(e => e.k === 'antiquityRestored' && e.d.id === 'scarab_compass'), 'antiquityRestored event emitted');

  // Already unlocked -> cannot restore again
  ok(!canRestoreAntiquity(s, 'scarab_compass'), 'Cannot restore already-unlocked antiquity');
}

// 3. Verify loadout equipping into 3 slots
{
  const s = G.newState();
  s.wingDone = { scarab: true, whale: true, camel: true };
  s.antiquities = { unlocked: [], equipped: [null, null, null], mortarBoost: 0 };

  restoreAntiquity(s, 'scarab_compass');
  restoreAntiquity(s, 'obsidian_siphon');
  restoreAntiquity(s, 'golden_mortar');

  ok(s.antiquities.unlocked.length === 3, 'All 3 antiquities restored');

  // Equip into slot 0
  ok(equipAntiquity(s, 'scarab_compass', 0), 'Equipped scarab_compass to slot 0');
  ok(isAntiquityEquipped(s, 'scarab_compass'), 'scarab_compass is equipped');
  ok(s.antiquities.equipped[0] === 'scarab_compass', 'Slot 0 holds scarab_compass');

  // Equip into auto empty slot (should pick slot 1)
  ok(equipAntiquity(s, 'obsidian_siphon'), 'Equipped obsidian_siphon auto');
  ok(s.antiquities.equipped[1] === 'obsidian_siphon', 'Slot 1 holds obsidian_siphon');

  // Equip into slot 2
  ok(equipAntiquity(s, 'golden_mortar', 2), 'Equipped golden_mortar to slot 2');
  ok(s.antiquities.equipped[2] === 'golden_mortar', 'Slot 2 holds golden_mortar');

  // All 3 slots full
  ok(equippedAntiquities(s).filter(Boolean).length === 3, 'All 3 slots filled');

  // Re-equipping golden_mortar into slot 0 moves it and clears previous slot
  equipAntiquity(s, 'golden_mortar', 0);
  ok(s.antiquities.equipped[0] === 'golden_mortar', 'Slot 0 now has golden_mortar');
  ok(s.antiquities.equipped[2] === null, 'Slot 2 was cleared when item moved');

  // Unequip slot 0
  unequipAntiquity(s, 0);
  ok(s.antiquities.equipped[0] === null, 'Slot 0 is unequipped');
  ok(!isAntiquityEquipped(s, 'golden_mortar'), 'golden_mortar no longer equipped');
}

// 4. Verify Scarab Compass: highlights hidden chests
{
  const s = G.newState();
  s.top = 0;
  s.rows = [];
  for (let i = 0; i < 5; i++) {
    s.rows[i] = [];
    for (let c = 0; c < G.COLS; c++) {
      s.rows[i][c] = { t: 'dirt', hp: 2, max: 2 };
    }
  }

  // Place hidden chests at (1, 2) and (3, 4)
  s.rows[1][2] = { t: 'chest', hp: 4, max: 4, shown: 0 };
  s.rows[3][4] = { t: 'chest', hp: 4, max: 4, shown: 0 };

  s.antiquities = {
    unlocked: ['scarab_compass'],
    equipped: ['scarab_compass', null, null],
  };

  const found = highlightHiddenChests(s);
  ok(found.length === 2, 'Found exactly 2 hidden chests');
  ok(s.rows[1][2].shown === 1 && s.rows[1][2].revealed === true, 'Chest 1 is shown');
  ok(s.rows[3][4].shown === 1 && s.rows[3][4].revealed === true, 'Chest 2 is shown');
}

// 5. Verify Obsidian Siphon: channels 5% of TNT damage to the Gate
{
  const s = G.newState();
  s.boss = { row: 10, hp: 1000, max: 1000, gate: 1, you: 0 };
  s.antiquities = {
    unlocked: ['obsidian_siphon'],
    equipped: ['obsidian_siphon', null, null],
  };

  const events = [];
  const ev = (k, d) => events.push({ k, d });

  const dealt = channelSiphonDamage(s, 500, ev); // 500 TNT damage * 0.05 = 25 damage to Gate
  ok(dealt === 25, 'Channels exactly 25 damage (5% of 500)');
  ok(s.boss.hp === 975, 'Gate HP reduced from 1000 to 975');
  ok(s.boss.you === 25, 'Player damage recorded for Gate');
  ok(events.some(e => e.k === 'siphonDamage' && e.d.dmg === 25), 'siphonDamage event emitted');

  // When unequipped, channels 0
  unequipAntiquity(s, 0);
  const dealtNone = channelSiphonDamage(s, 500, ev);
  ok(dealtNone === 0, 'Unequipped siphon channels 0 damage');
  ok(s.boss.hp === 975, 'Gate HP remains 975');
}

// 6. Verify Golden Mortar: doubles crew speed after Big Rocks
{
  const s = G.newState();
  s.top = 0;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;
  s.diggers = [G.newRafeeq(s, 0)];
  s.antiquities = {
    unlocked: ['golden_mortar'],
    equipped: ['golden_mortar', null, null],
    mortarBoost: 0,
  };

  ok(!hasMortarBoost(s), 'No mortar boost initially');
  const baseCrewRate = G.crewRate(s);

  // Trigger boost
  triggerGoldenMortar(s, 30);
  ok(hasMortarBoost(s), 'Mortar boost active');
  const boostedRate = G.crewRate(s);
  ok(boostedRate === baseCrewRate * 2, `Crew rate doubled: ${boostedRate} = 2 * ${baseCrewRate}`);

  // Stepping advances boost countdown
  G.step(s, 10);
  ok(s.antiquities.mortarBoost === 20, 'Mortar boost decreased by 10s: ' + s.antiquities.mortarBoost);

  // Expire boost
  G.step(s, 25);
  ok(s.antiquities.mortarBoost === 0, 'Mortar boost fully expired');
  ok(!hasMortarBoost(s), 'Mortar boost inactive');
  ok(G.crewRate(s) === baseCrewRate, 'Crew rate returned to normal');
}

if (failed) {
  console.error(`${failed} assertion(s) failed in test_proto_antiquities.js`);
  process.exit(1);
}
console.log('test_proto_antiquities: ok');
