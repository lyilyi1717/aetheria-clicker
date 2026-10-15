// Test for Issue C2 (M11): Global Subterranean Borehole Tracker
// Run: node test_proto_argon_borehole.js

import * as G from './digger-argon/game.js';
import {
  MILESTONES,
  BOREHOLE_BASE_DEPTH,
  getCommunityDepth,
  getGlobalDepth,
  getNextMilestone,
  isMilestoneUnlocked,
  isFestivalActive,
  contributeMetres,
  syncBorehole,
} from './digger-argon/features/borehole/rules.js';
import strings from './digger-argon/features/borehole/strings.js';

let failed = 0;
const ok = (cond, msg) => {
  if (!cond) {
    failed++;
    console.error('FAIL: ' + msg);
  }
};
const dummyEv = () => {};

console.log('Testing Issue C2 (M11): Global Subterranean Borehole Tracker...');

// 1. Verify Bilingual Strings Parity
{
  const required = [
    'borehole_title', 'borehole_sub', 'borehole_depth', 'borehole_pending',
    'borehole_contributed', 'borehole_sync_btn', 'borehole_synced',
    'borehole_contributors', 'borehole_milestone_unlocked',
    'borehole_m1m_title', 'borehole_m1m_desc',
    'borehole_m10m_title', 'borehole_m10m_desc',
    'borehole_m100m_title', 'borehole_m100m_desc',
    'borehole_festival_active',
  ];

  for (const k of required) {
    ok(typeof strings.en[k] === 'string' && strings.en[k].length > 0, `EN string for ${k} exists`);
    ok(typeof strings.ar[k] === 'string' && strings.ar[k].length > 0, `AR string for ${k} exists`);
  }
}

// 2. Global Depth Telemetry & Mathematical Progression
{
  const epoch = 1760000000000;
  const d0 = getCommunityDepth(epoch);
  ok(d0 === BOREHOLE_BASE_DEPTH, `Initial base depth at epoch is ${BOREHOLE_BASE_DEPTH}m (got ${d0})`);

  // After 1000 seconds, depth increases by 1000 * 3.5 = 3500m
  const d1000 = getCommunityDepth(epoch + 1000 * 1000);
  ok(d1000 === BOREHOLE_BASE_DEPTH + 3500, `Depth after 1000s is base + 3500m (got ${d1000})`);

  // Global depth includes player pending and contributed metres
  const s = G.newState();
  s.borehole.pendingMetres = 50;
  s.borehole.totalContributed = 200;
  const total = getGlobalDepth(s, epoch);
  ok(total === BOREHOLE_BASE_DEPTH + 250, `Global depth includes 250m player contributions: ${total}`);
}

// 3. Local Contribution Accumulator and Offline Buffering
{
  const s = G.newState();
  ok(s.borehole.pendingMetres === 0, 'Pending metres start at 0');
  ok(s.borehole.totalContributed === 0, 'Total contributed starts at 0');

  // Breaking blocks increments pendingMetres
  const dummyEv = () => {};
  G.damage(s, 1, 0, 10, 'you', dummyEv);
  G.step(s, 0.05, dummyEv);

  contributeMetres(s, 75);
  ok(s.borehole.pendingMetres >= 75, 'contributeMetres added 75m');

  const beforeSyncPending = s.borehole.pendingMetres;
  const evs = [];
  const ev = (k, d) => evs.push({ k, d });

  const res = syncBorehole(s, ev);
  ok(res !== null, 'syncBorehole returns result object');
  ok(s.borehole.pendingMetres === 0, 'Pending metres flushed to 0 after sync');
  ok(s.borehole.totalContributed === beforeSyncPending, 'totalContributed increased by flushed metres');
  ok(evs.some(e => e.k === 'boreholeSync'), 'boreholeSync event emitted');
}

// 4. Universal Milestone Celebrations:
//    1,000,000m: Unlocks The Lantern of the Deep pick skin
{
  const s = G.newState();
  s.contractLook = { skin: 'none', hat: '' };
  s.borehole.pendingMetres = 0;
  s.borehole.totalContributed = 0;

  // Milestone not yet unlocked below 1M
  ok(!isMilestoneUnlocked(s, 'm1m'), '1M milestone not unlocked initially');

  // Push total contributions over 1,000,000m threshold
  const needed = 1000000 - BOREHOLE_BASE_DEPTH + 500;
  contributeMetres(s, needed);

  const evs = [];
  const ev = (k, d) => evs.push({ k, d });

  syncBorehole(s, ev);

  ok(isMilestoneUnlocked(s, 'm1m'), '1M milestone unlocked after reaching 1,000,000m');
  ok(s.borehole.skinUnlocked === true, 'The Lantern of the Deep skin flag unlocked');
  ok(s.contractLook.skin === 'lantern_deep', 'Equipped lantern_deep pick skin');
  ok(evs.some(e => e.k === 'boreholeMilestone' && e.d.id === 'm1m'), 'Emitted boreholeMilestone event for m1m');
}

// 5. Milestone 10,000,000m: The Golden Sieve Festival (+20% coins)
{
  const s = G.newState();
  ok(!isMilestoneUnlocked(s, 'm10m'), '10M milestone initially locked');
  ok(!isFestivalActive(s), 'Festival initially inactive');

  // Push to 10,000,000m
  contributeMetres(s, 10000000);
  const evs = [];
  const ev = (k, d) => evs.push({ k, d });
  syncBorehole(s, ev);

  ok(isMilestoneUnlocked(s, 'm10m'), '10M milestone unlocked');
  ok(isFestivalActive(s), 'The Golden Sieve Festival is active');
  ok(s.borehole.festivalTimer === 3600, 'Festival timer initialized to 3600s (1h)');
  ok(evs.some(e => e.k === 'boreholeMilestone' && e.d.id === 'm10m'), 'Emitted boreholeMilestone event for m10m');

  // Verify coin multiplier modifier (+20% coins during festival)
  const mult = G.coinMult(s);
  ok(Math.abs(mult - 1.2) < 1e-6, `Coin multiplier boosted by +20%: ${mult}`);

  // Stepping advances and eventually expires festival
  G.step(s, 3601, dummyEv);
  ok(!isFestivalActive(s), 'Festival expires when timer reaches 0');
  ok(Math.abs(G.coinMult(s) - 1.0) < 1e-6, 'Coin multiplier returns to baseline after festival expires');
}

// 6. Milestone 100,000,000m: The Lost Scroll of the Core Chronicle
{
  const s = G.newState();
  ok(!isMilestoneUnlocked(s, 'm100m'), '100M milestone initially locked');

  // Push to 100,000,000m
  contributeMetres(s, 100000000);
  const evs = [];
  const ev = (k, d) => evs.push({ k, d });
  syncBorehole(s, ev);

  ok(isMilestoneUnlocked(s, 'm100m'), '100M milestone unlocked');
  ok(s.borehole.chronicleUnlocked === true, 'The Lost Scroll of the Core chronicle unlocked');
  ok(evs.some(e => e.k === 'boreholeMilestone' && e.d.id === 'm100m'), 'Emitted boreholeMilestone event for m100m');
}

// 7. Contributors Ticker and Next Milestone Calculation
{
  const s = G.newState();
  contributeMetres(s, 120);
  syncBorehole(s);

  ok(s.borehole.contributors.length > 0, 'Contributors ticker populated');
  ok(s.borehole.contributors[0].name === 'You', 'Local player listed in recent contributors');
  ok(s.borehole.contributors[0].metres === 120, 'Local player metres recorded in ticker');

  const next = getNextMilestone(960000);
  ok(next !== null, 'Found next milestone');
  ok(next.id === 'm1m', 'Next milestone is 1M');
  ok(next.pct >= 90 && next.pct <= 100, `Progress percentage calculated accurately: ${next.pct}%`);
}

// 8. Save/Load and Backward Compatibility
{
  const s = G.newState();
  s.borehole.pendingMetres = 42;
  s.borehole.totalContributed = 840;
  s.borehole.unlockedMilestones.m1m = true;

  const raw = G.serialize(s);
  const loaded = G.deserialize(raw);

  ok(loaded.borehole.pendingMetres === 42, 'Deserialized pendingMetres');
  ok(loaded.borehole.totalContributed === 840, 'Deserialized totalContributed');
  ok(loaded.borehole.unlockedMilestones.m1m === true, 'Deserialized unlockedMilestones');

  // Legacy save without borehole
  const oldRaw = JSON.parse(G.serialize(G.newState()));
  delete oldRaw.borehole;
  const migrated = G.deserialize(JSON.stringify(oldRaw));
  ok(migrated.borehole && migrated.borehole.pendingMetres === 0, 'Legacy save initializes default borehole slice');
}

if (failed) {
  console.error(`${failed} assertion(s) failed in test_proto_argon_borehole.js`);
  process.exit(1);
}
console.log('test_proto_argon_borehole: ok');
