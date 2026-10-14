// Unit test for ARGON-13: Buried Environmental Wonders (Authored Landmarks)
// Run: node test_proto_landmarks.js
import * as G from './digger-argon/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };

console.log('Testing ARGON-13: Buried Environmental Wonders (Authored Landmarks)...');

// 1. Blocks registered
ok(G.BLOCKS.fuse, 'fuse block registered');
ok(G.BLOCKS.dhab, 'dhab block registered');
ok(G.BLOCKS.lighthouse, 'lighthouse block registered');
ok(G.BLOCKS.aqueduct, 'aqueduct block registered');
ok(G.BLOCKS.lava, 'lava block registered');
ok(G.BLOCKS.obsidian, 'obsidian block registered');

// Helper to generate rows for a state at a specific level
function makeLevelGrid(level, totalRows = 30) {
  const s = G.newState();
  s.level = level;
  // Initialize rows using genRow
  s.rows = [];
  s.top = 0;
  for (let r = 0; r < totalRows; r++) {
    s.rows.push(G.genRow(s, r));
  }
  return s;
}

// 2. Level 2: 15m continuous powder fuse running straight down (rows 10..24, col 4)
{
  G.seedRng(100);
  const s = makeLevelGrid(2, 30);
  for (let r = 10; r < 25; r++) {
    const cell = G.cellAt(s, r, 4);
    ok(cell && cell.t === 'fuse', `Level 2 row ${r} col 4 has continuous fuse block (is ${cell ? cell.t : 'null'})`);
  }

  // Trigger fuse ignition chain
  let detonations = 0;
  const evHandler = (kind, d) => {
    if (kind === 'fuseDetonate') detonations++;
  };
  G.damage(s, 10, 4, 10, 'you', evHandler);
  ok(detonations >= 15, `fuse chain fully propagated down 15m (detonations: ${detonations})`);
  for (let r = 10; r < 25; r++) {
    ok(G.cellAt(s, r, 4) === null, `fuse row ${r} cleared after detonation`);
  }
}

// 3. Level 3: Sleeping Dhab lizard carving an 8-row tunnel when excavated
{
  G.seedRng(200);
  const s = makeLevelGrid(3, 30);
  // Check Dhab cave placed at rows 12..13, cols 4..5
  ok(G.cellAt(s, 12, 4).t === 'dhab', 'Dhab present at row 12 col 4');
  ok(G.cellAt(s, 12, 5).t === 'dhab', 'Dhab present at row 12 col 5');

  // Verify solid ground below Dhab before excavation
  for (let dr = 1; dr <= 8; dr++) {
    ok(G.cellAt(s, 12 + dr, 4) !== null, `Ground below Dhab at row ${12 + dr} col 4 is solid before awakening`);
  }

  // Excavate Dhab
  let dhabAwakeFired = false;
  let dhabTunnelFired = false;
  const evHandler = (kind, d) => {
    if (kind === 'dhabAwake') dhabAwakeFired = true;
    if (kind === 'dhabTunnel') dhabTunnelFired = true;
  };

  G.breakCell(s, 12, 4, 'you', evHandler);
  ok(dhabAwakeFired, 'dhabAwake event emitted when excavated');
  ok(dhabTunnelFired, 'dhabTunnel event emitted');

  // Verify 8-row tunnel carved straight down
  for (let dr = 1; dr <= 8; dr++) {
    ok(G.cellAt(s, 12 + dr, 4) === null, `Row ${12 + dr} col 4 cleared by Dhab tunnel`);
    ok(G.cellAt(s, 12 + dr, 5) === null, `Row ${12 + dr} col 5 cleared by Dhab tunnel`);
  }
}

// 4. Level 7: Subterranean lighthouse generator permanently illuminating dark caverns
{
  G.seedRng(300);
  const s = makeLevelGrid(7, 30);
  ok(G.cellAt(s, 16, 4).t === 'lighthouse', 'Lighthouse generator at row 16 col 4');
  ok(G.fold('sight', s, 3) === 3, 'initial cavern sight is normal');

  let lighthouseLit = false;
  const evHandler = (kind, d) => {
    if (kind === 'lighthouseLit') lighthouseLit = true;
  };

  G.breakCell(s, 16, 4, 'you', evHandler);
  ok(lighthouseLit, 'lighthouseLit event emitted');
  ok(s.landmarks && s.landmarks.lighthouseLit, 'lighthouseLit state flag recorded');
  ok(G.fold('sight', s, 3) === 99, 'sight permanently boosted to 99, illuminating dark caverns');
}

// 5. Level 13: Aqueduct quenching lava pockets into obsidian crystal lines
{
  G.seedRng(400);
  const s = makeLevelGrid(13, 30);
  // Verify aqueduct at row 20
  for (let c = 2; c < 8; c++) {
    ok(G.cellAt(s, 20, c).t === 'aqueduct', `Aqueduct present at row 20 col ${c}`);
  }
  // Verify lava pockets in rows 21..24
  for (let r = 21; r <= 24; r++) {
    for (let c = 2; c < 8; c++) {
      ok(G.cellAt(s, r, c).t === 'lava', `Lava present at row ${r} col ${c} before breach`);
    }
  }

  // Breach the aqueduct
  let quenchFired = false;
  let obsidianFormed = false;
  const evHandler = (kind, d) => {
    if (kind === 'aqueductQuench') quenchFired = true;
    if (kind === 'obsidianFormed') obsidianFormed = true;
  };

  G.breakCell(s, 20, 4, 'you', evHandler);
  ok(quenchFired, 'aqueductQuench event emitted');
  ok(obsidianFormed, 'obsidianFormed event emitted');

  // Verify lava transformed into obsidian
  let obsidianCount = 0;
  for (let r = 21; r <= 24; r++) {
    for (let c = 2; c < 8; c++) {
      if (G.cellAt(s, r, c).t === 'obsidian') obsidianCount++;
    }
  }
  ok(obsidianCount === 24, `all 24 lava cells quenched into obsidian crystals (got ${obsidianCount})`);
}

// 6. Deterministic & RNG Seeded Verification
{
  G.seedRng(999);
  const s1 = makeLevelGrid(2, 30);
  G.seedRng(999);
  const s2 = makeLevelGrid(2, 30);
  ok(JSON.stringify(s1.rows.map(r => r.map(c => c.t))) === JSON.stringify(s2.rows.map(r => r.map(c => c.t))),
    'Landmarks generation is 100% deterministic with identical seed');
}

if (failed) {
  console.error(`FAIL: ${failed} check(s) failed in test_proto_landmarks.js`);
  process.exit(1);
}
console.log('test_proto_landmarks: ok');
