// Test for Issue ARGON-18: Month 5: The Guilds of Alqahwa (proto/features/guilds/)
// Run: node test_proto_guilds.js

import * as G from './digger-argon/game.js';
import {
  CALLINGS,
  assignCalling,
  getCalling,
  activeCallings,
  hasCalling,
  countCalling,
  hasGuildSynergy,
  triggerCoordinatedBlast,
  baroodiBlastVectors,
  dropRateMultiplier,
} from './digger-argon/features/guilds/rules.js';
import strings from './digger-argon/features/guilds/strings.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };

console.log('Testing ARGON-18: The Guilds of Alqahwa...');

// 1. Verify bilingual strings parity
{
  const required = [
    'guilds_title', 'guilds_sub', 'guild_seat', 'guild_assign',
    'calling_naqqab', 'calling_naqqab_d',
    'calling_baroodi', 'calling_baroodi_d',
    'calling_ghawwas', 'calling_ghawwas_d',
    'calling_muhandis', 'calling_muhandis_d',
    'synergy_coordinated_blast', 'synergy_coordinated_blast_d',
  ];
  for (const k of required) {
    ok(typeof strings.en[k] === 'string' && strings.en[k].length > 0, `EN string for ${k} exists`);
    ok(typeof strings.ar[k] === 'string' && strings.ar[k].length > 0, `AR string for ${k} exists`);
  }
}

// 2. Calling assignment and active squad seats
{
  const s = G.newState();
  s.diggers = [G.newRafeeq(s, 0), G.newRafeeq(s, 1)]; // 2 hired Rafeeqs (seats 0 and 1)

  ok(getCalling(s, 0) === null, 'Seat 0 is initially unassigned');
  ok(getCalling(s, 1) === null, 'Seat 1 is initially unassigned');

  // Assign Naqqab to seat 0
  const events = [];
  const ev = (k, d) => events.push({ k, d });
  ok(assignCalling(s, 0, 'naqqab', ev), 'Assigned naqqab to seat 0');
  ok(getCalling(s, 0) === 'naqqab', 'Seat 0 has naqqab');
  ok(hasCalling(s, 'naqqab'), 'Squad has naqqab calling');
  ok(countCalling(s, 'naqqab') === 1, 'Squad has exactly 1 naqqab');

  // Assign Baroodi to seat 3 (which is not yet hired because diggers.length === 2)
  assignCalling(s, 3, 'baroodi');
  ok(getCalling(s, 3) === 'baroodi', 'Seat 3 calling recorded');
  ok(!hasCalling(s, 'baroodi'), 'Seat 3 baroodi is NOT active because digger 3 is not hired');

  // Hire 2 more diggers -> seat 3 becomes active
  s.diggers.push(G.newRafeeq(s, 2));
  s.diggers.push(G.newRafeeq(s, 3));
  ok(hasCalling(s, 'baroodi'), 'Seat 3 baroodi is now active with 4 diggers hired');

  const active = activeCallings(s);
  ok(active.includes('naqqab') && active.includes('baroodi'), 'Active callings include naqqab and baroodi');
}

// 3. Naqqab: +100% damage on Big Rock glowing cracks
{
  const s = G.newState();
  s.diggers = [G.newRafeeq(s, 0)];

  // Without Naqqab: base weak crack multiplier is 3
  const baseCrackMult = G.fold('weakCrackMult', s, 3);
  ok(baseCrackMult === 3, `Default weak crack mult is 3 (got ${baseCrackMult})`);

  // Assign Naqqab to seat 0: crack multiplier doubles (+100% damage -> 6x)
  assignCalling(s, 0, 'naqqab');
  const naqqabCrackMult = G.fold('weakCrackMult', s, 3);
  ok(naqqabCrackMult === 6, `Naqqab doubles weak crack mult to 6 (got ${naqqabCrackMult})`);
}

// 4. Baroodi: doubles TNT explosion radius and forces downward blast
{
  const s = G.newState();
  s.diggers = [G.newRafeeq(s, 0)];

  // Without Baroodi
  ok(G.fold('tntRadius', s, 1) === 1, 'Default TNT radius unmodified');
  ok(G.fold('tntDownward', s, false) === false, 'Default TNT blast goes all directions');

  // Assign Baroodi
  assignCalling(s, 0, 'baroodi');
  ok(G.fold('tntRadius', s, 1) === 2, 'Baroodi doubles TNT radius to 2');
  ok(G.fold('tntRadius', s, 2) === 4, 'Baroodi doubles TNT radius 2 to 4');
  ok(G.fold('tntDownward', s, false) === true, 'Baroodi forces downward blast');

  // Downward vectors check
  const vectors = baroodiBlastVectors(2);
  ok(vectors.length > 0, 'Generated downward blast vectors');
  ok(vectors.every(([dr]) => dr >= 0), 'All Baroodi blast vectors have dr >= 0 (downward/horizontal)');
}

// 5. Ghawwas: +50% fossil and ore drop rates
{
  const s = G.newState();
  s.diggers = [G.newRafeeq(s, 0)];

  // Without Ghawwas
  ok(G.fold('oreRate', s, 1.0) === 1.0, 'Default ore rate is 1.0');
  ok(G.fold('fossilRate', s, 1.0) === 1.0, 'Default fossil rate is 1.0');
  ok(dropRateMultiplier(s, 'ore') === 1.0, 'dropRateMultiplier is 1.0');

  // Assign Ghawwas
  assignCalling(s, 0, 'ghawwas');
  ok(Math.abs(G.fold('oreRate', s, 1.0) - 1.5) < 1e-6, 'Ghawwas increases ore rate to 1.5x');
  ok(Math.abs(G.fold('fossilRate', s, 1.0) - 1.5) < 1e-6, 'Ghawwas increases fossil rate to 1.5x');
  ok(dropRateMultiplier(s, 'fossil') === 1.5, 'dropRateMultiplier for fossil is 1.5');
}

// 6. Muhandis: prevents living rock regrowth and places auto-lanterns in dark layers
{
  const s = G.newState();
  s.diggers = [G.newRafeeq(s, 0)];

  // Without Muhandis
  ok(G.fold('preventRegrowth', s, false) === false, 'Regrowth occurs normally');

  // Assign Muhandis
  assignCalling(s, 0, 'muhandis');
  ok(G.fold('preventRegrowth', s, false) === true, 'Muhandis prevents living rock regrowth');

  // Auto-lantern in dark layer
  s.deep.glows = [];
  s.deep.bc = 0;
  s.top = 100;
  for (let i = 0; i < G.KEEP_ROWS; i++) {
    s.rows[i] = [];
    for (let c = 0; c < G.COLS; c++) s.rows[i][c] = { t: 'dirt', hp: 100, max: 100 };
  }
  G.step(s, 0.1);
  ok(s.deep.glows.length > 0, 'Muhandis auto-placed a lantern in dark layer');
  ok(s.deep.glows[0].rad === 3 && s.deep.glows[0].r === 100, 'Auto-lantern has radius 3 at top row');
}

// 7. Pair synergy: Naqqab + Baroodi triggers Coordinated Blast
{
  const s = G.newState();
  s.diggers = [G.newRafeeq(s, 0), G.newRafeeq(s, 1)];

  assignCalling(s, 0, 'naqqab');
  ok(!hasGuildSynergy(s, 'coordinated_blast'), 'Only naqqab -> no coordinated blast synergy');

  assignCalling(s, 1, 'baroodi');
  ok(hasGuildSynergy(s, 'coordinated_blast'), 'Naqqab + Baroodi unlocks coordinated blast synergy');

  // Test Coordinated Blast trigger on Gate
  s.boss = { row: 40, hp: 1200, max: 1200, gate: 1, you: 0 };
  const events = [];
  const ev = (k, d) => events.push({ k, d });

  const blastDmg = triggerCoordinatedBlast(s, ev);
  ok(blastDmg === 500, 'Coordinated blast deals exactly 500 damage');
  ok(s.boss.hp === 700, 'Gate HP reduced from 1200 to 700');
  ok(s.boss.you === 500, 'Player dealt 500 pre-emptive damage');
  ok(events.some(e => e.k === 'coordinatedBlast' && e.d.dmg === 500), 'coordinatedBlast event emitted');

  // Firing again does not double-dip on the same boss
  const second = triggerCoordinatedBlast(s, ev);
  ok(second === 0, 'Coordinated blast triggers only once per Gate');
  ok(s.boss.hp === 700, 'Gate HP remains 700');
}

if (failed) {
  console.error(`${failed} assertion(s) failed in test_proto_guilds.js`);
  process.exit(1);
}
console.log('test_proto_guilds: ok');
