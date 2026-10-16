// Unit tests for Survivor-Excavator Buildcraft Engine & Chest Interruption Removal
// Run: node test_proto_argon_buildcraft.js

import * as G from './digger-argon/game.js';
import {
  ensureBuildcraft,
  canFuseCollab,
  fuseCollab,
  canAscendRig,
  ascendRig,
  socketRuneStamp,
  unsocketRuneStamp,
  hasRuneStamp,
  openGildedVault,
  addTool,
  levelUpTool,
  addRelic,
  levelUpRelic,
  activeToolCount,
  activeRelicCount,
  canDraftTool,
  MAX_TOOL_LEVEL,
  MAX_RELIC_LEVEL,
} from './digger-argon/features/buildcraft/rules.js';

let failed = 0;
const ok = (cond, msg) => {
  if (!cond) {
    failed++;
    console.error('FAIL: ' + msg);
  } else {
    console.log('PASS: ' + msg);
  }
};

console.log('=== Testing Survivor-Excavator Buildcraft Engine (HoloCure x Vampire Survivors) ===\n');

// 1. Elimination of Chest Modal Fatigue & Auto-Pause Interruptions
console.log('--- 1. Elimination of Chest Auto-Modals & HUD Badge Token Accumulation ---');
{
  const s = G.newState();
  s.top = 0; s.best = 1;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;

  // Place a chest block
  s.rows[1] = [G.makeCell(1, 'chest')];
  s.rows[1][0].hp = 4;
  s.rows[1][0].max = 4;

  const events = [];
  const ev = (k, d) => events.push({ k, d });

  ok(s.chests === 0, 'Initial chest count in state is 0');

  // Break the chest block
  G.damage(s, 1, 0, 4, 'you', ev);
  ok(s.chests === 1, 'Breaking chest block increments s.chests without auto-opening modal');

  const chestEv = events.find(e => e.k === 'chest');
  ok(chestEv !== undefined, 'chest event emitted with block coordinates for particle arc');
  ok(chestEv.d.r === 1 && chestEv.d.c === 0, 'Event contains (r, c) coordinates for arc trajectory');

  // Additional chest breaks accumulate tokens on HUD badge
  s.rows[2] = [G.makeCell(2, 'chest')];
  s.rows[2][0].hp = 4;
  G.damage(s, 2, 0, 4, 'you', ev);
  ok(s.chests === 2, 'Second chest accumulated on HUD badge: s.chests is 2');

  // Boss down also awards chest directly to s.chests without opening modal
  G.run('bossDown', s, 10, 'you', ev);
  ok(s.chests >= 3, 'Boss defeat awards chest directly into vault balance: s.chests is ' + s.chests);
}

// 2. Loadout Matrix & Slot Constraints
console.log('\n--- 2. Loadout Matrix & Slot Dynamic ---');
{
  const s = G.newState();
  const b = ensureBuildcraft(s);

  ok(b.signaturePick.sockets.length === 3, 'Signature Pick has exactly 3 Rune Stamp Sockets');
  ok(b.toolSlots === 3, 'Initial Rig Tool slots = 3');
  ok(b.relicSlots === 4, 'Initial Deep Strata Relic slots = 4');

  // Add 3 tools to fill all 3 initial slots
  ok(addTool(s, 'chisel') === true, 'Added Naqqab Pneumatic Chisel');
  ok(addTool(s, 'mortar') === true, 'Added Baroodi Blast Mortar');
  ok(addTool(s, 'hydrojet') === true, 'Added Aquifer Hydro-Jet');

  ok(activeToolCount(s) === 3, 'Tool inventory has 3 active tools (3/3 slots full)');
  ok(canDraftTool(s) === false, 'Cannot draft additional tool: slots are full');

  // Attempting to add 4th tool fails due to slot cap
  ok(addTool(s, 'augur') === false, 'Adding 4th tool correctly rejected by slot cap');
}

// 3. Tier 2 Rig Collabs (Tool + Tool Fusion) & Slot Compression
console.log('\n--- 3. Tier 2 Rig Collabs & Crucial Slot Compression ---');
{
  const s = G.newState();
  ensureBuildcraft(s);

  addTool(s, 'chisel');
  addTool(s, 'mortar');

  ok(canFuseCollab(s, 'collab_jackhammer') === false, 'Cannot fuse Collab before tools reach Lv 7');

  // Level up both tools to Max Level (Lv 7)
  for (let lv = 1; lv < MAX_TOOL_LEVEL; lv++) {
    levelUpTool(s, 'chisel');
    levelUpTool(s, 'mortar');
  }

  ok(s.buildcraft.tools.chisel.level === 7, 'Chisel is at Max Level 7');
  ok(s.buildcraft.tools.mortar.level === 7, 'Mortar is at Max Level 7');
  ok(canFuseCollab(s, 'collab_jackhammer') === true, 'Collab fusion now available at Bedrock Forge!');

  const events = [];
  const ev = (k, d) => events.push({ k, d });

  const preToolCount = activeToolCount(s);
  ok(preToolCount === 2, 'Before fusion: 2 tool slots occupied');

  // Execute Collab Fusion: Demolition Jackhammer
  const fused = fuseCollab(s, 'collab_jackhammer', ev);
  ok(fused === true, 'Successfully fused Demolition Jackhammer');

  ok(s.buildcraft.tools.chisel === undefined, 'Component Chisel consumed in fusion');
  ok(s.buildcraft.tools.mortar === undefined, 'Component Mortar consumed in fusion');
  ok(s.buildcraft.tools.collab_jackhammer !== undefined, 'Demolition Jackhammer created');
  ok(s.buildcraft.tools.collab_jackhammer.collab === true, 'Jackhammer flagged as Collab');
  ok(s.buildcraft.tools.collab_jackhammer.level === 7, 'Jackhammer starts at Lv 7');

  // Crucial Slot Dynamic: Two tools compressed into 1 slot, freeing up an empty tool slot!
  const postToolCount = activeToolCount(s);
  ok(postToolCount === 1, 'Crucial Slot Dynamic: Two tools compressed into 1 slot (1/3 slots occupied)');
  ok(canDraftTool(s) === true, 'Empty tool slot is freed up! Can draft a new tool deeper in the run');

  // Draft new tool into the freed slot
  ok(addTool(s, 'augur') === true, 'Drafted Sand-Screw Augur into the newly freed tool slot');
  ok(activeToolCount(s) === 2, 'Active tool count is now 2/3');
}

// 4. Tier 3 Ascended Rigs (Collab + Relic Fusion at Deep Core Geodes)
console.log('\n--- 4. Tier 3 Ascended Rigs & Relic Slot Freeing ---');
{
  const s = G.newState();
  ensureBuildcraft(s);

  // Setup collab tool
  addTool(s, 'chisel');
  addTool(s, 'mortar');
  for (let i = 1; i < MAX_TOOL_LEVEL; i++) {
    levelUpTool(s, 'chisel');
    levelUpTool(s, 'mortar');
  }
  fuseCollab(s, 'collab_jackhammer');

  // Add and max out a relic (Lv 5)
  addRelic(s, 'fossil_amber');
  for (let i = 1; i < MAX_RELIC_LEVEL; i++) levelUpRelic(s, 'fossil_amber');

  ok(s.buildcraft.relics.fossil_amber === 5, 'Fossil Amber relic is at max level 5');
  ok(activeRelicCount(s) === 1, 'Relic inventory has 1 active relic');

  ok(canAscendRig(s, 'collab_jackhammer', 'fossil_amber') === true, 'Ascension available at Deep Core Geode');

  const events = [];
  const ev = (k, d) => events.push({ k, d });

  // Execute Ascension
  const ascended = ascendRig(s, 'collab_jackhammer', 'fossil_amber', ev);
  ok(ascended === true, 'Demolition Jackhammer ascended into Mythic Excavation Overdrive');

  // Relic was consumed, freeing 1 relic slot
  ok(s.buildcraft.relics.fossil_amber === undefined, 'Fossil Amber relic was consumed');
  ok(activeRelicCount(s) === 0, 'Relic slot freed up (0/4 relics occupied)');

  // Tool has Overdrive enabled
  ok(s.buildcraft.tools.collab_jackhammer.ascended === true, 'Jackhammer is ascended');
  ok(s.buildcraft.tools.collab_jackhammer.overdrive === true, 'Mythic Excavation Overdrive active');

  const ascEv = events.find(e => e.k === 'rigAscended');
  ok(ascEv !== undefined, 'rigAscended event emitted');
}

// 5. Rune Stamp Socketing
console.log('\n--- 5. Rune Stamp Socketing on Signature Pick ---');
{
  const s = G.newState();
  const b = ensureBuildcraft(s);

  b.stamps.push('darbuka_cadence', 'shrapnel_gouge', 'glint_magnetism', 'thermal_fracturing');

  // Socket 3 stamps into the 3 pick sockets
  ok(socketRuneStamp(s, 0, 'darbuka_cadence') === true, 'Socketed Darbuka Cadence into socket 0');
  ok(socketRuneStamp(s, 1, 'shrapnel_gouge') === true, 'Socketed Shrapnel Gouge into socket 1');
  ok(socketRuneStamp(s, 2, 'thermal_fracturing') === true, 'Socketed Thermal Fracturing into socket 2');

  ok(hasRuneStamp(s, 'darbuka_cadence') === true, 'Pick has Darbuka Cadence');
  ok(hasRuneStamp(s, 'shrapnel_gouge') === true, 'Pick has Shrapnel Gouge');
  ok(hasRuneStamp(s, 'thermal_fracturing') === true, 'Pick has Thermal Fracturing');
  ok(hasRuneStamp(s, 'glint_magnetism') === false, 'Glint Magnetism is in inventory, not socketed');

  // Thermal fracturing provides +100% damage vs hard rock
  s.top = 0; s.best = 1;
  for (let i = 0; i < G.KEEP_ROWS; i++) s.rows[i] = [];
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;
  s.rows[1] = [G.makeCell(1, 'hard')];

  const swData = { r: 1, c: 0, dmg: 10 };
  G.run('swingDmg', s, swData);
  ok(swData.dmg === 20, 'Thermal Fracturing doubles damage against hard rock (+100%): ' + swData.dmg);

  // Unsocketing
  ok(unsocketRuneStamp(s, 0) === true, 'Unsocketed socket 0');
  ok(hasRuneStamp(s, 'darbuka_cadence') === false, 'Darbuka Cadence no longer socketed');
  ok(b.stamps.includes('darbuka_cadence'), 'Returned to stamp inventory');
}

// 6. Vampire Survivors-Style Gilded Vaults (1/3/5 Item Batch Jackpots)
console.log('\n--- 6. Vampire Survivors-Style Gilded Vaults (1/3/5 Batch Rolls) ---');
{
  const s = G.newState();
  ensureBuildcraft(s);

  // Tier 1 Vault: 1 reward
  const res1 = openGildedVault(s, 1);
  ok(res1.count === 1, 'Tier 1 Gilded Vault rolled 1 reward');
  ok(res1.rewards.length === 1, 'Contains 1 reward item');

  // Tier 2 Vault: 3 rewards batch jackpot
  const res3 = openGildedVault(s, 3);
  ok(res3.count === 3, 'Tier 2 Gilded Vault rolled 3 rewards');
  ok(res3.rewards.length === 3, 'Contains 3 reward items in batch');

  // Tier 3 Vault: 5 rewards mega jackpot
  const events = [];
  const ev = (k, d) => events.push({ k, d });
  const res5 = openGildedVault(s, 5, ev);
  ok(res5.count === 5, 'Tier 3 Gilded Vault rolled 5 rewards (Mega Jackpot)');
  ok(res5.rewards.length === 5, 'Contains 5 reward items in batch');

  const vaultEv = events.find(e => e.k === 'gildedVaultOpen');
  ok(vaultEv !== undefined, 'gildedVaultOpen event emitted with batch items');
  ok(vaultEv.d.count === 5, 'Event reports 5-item batch jackpot');
  ok(s.buildcraft.vaultsOpened === 3, 'Total vaults opened tracked: 3');
}

if (failed) {
  console.error('\n' + failed + ' test(s) failed.');
  process.exit(1);
} else {
  console.log('\n======================================================');
  console.log('ALL BUILDCRAFT & SURVIVOR EXCAVATOR TESTS PASSED 100%!');
  console.log('======================================================');
}
