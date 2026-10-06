// R26: the Dynamite 3x3 blast stays on the grid, and its effects spawn on the tiles it hit.
import assert from 'node:assert/strict';
import { GameState } from './js/systems/GameState.js';
import { MiningSystem, getBlastArea } from './js/systems/MiningSystem.js';
import { particles } from './js/engine/ParticleEngine.js';

console.log('--- R26: blast area is clipped to the grid ---');
const N = 6;
for (let id = 0; id < N * N; id++) {
  const area = getBlastArea(id, N);
  const cx = id % N, cy = Math.floor(id / N);
  const edgeX = cx === 0 || cx === N - 1, edgeY = cy === 0 || cy === N - 1;
  const expected = (edgeX ? 2 : 3) * (edgeY ? 2 : 3);
  assert.equal(area.length, expected, `tile ${id}`);
  assert.equal(new Set(area).size, area.length);
  for (const i of area) {
    assert.ok(Number.isInteger(i) && i >= 0 && i < N * N, `tile ${id} blasts off-grid index ${i}`);
    // never wraps to the other side of the grid
    assert.ok(Math.abs((i % N) - cx) <= 1 && Math.abs(Math.floor(i / N) - cy) <= 1);
  }
  assert.ok(area.includes(id));
}
assert.deepEqual(getBlastArea(0, N), [0, 1, 6, 7]);
assert.deepEqual(getBlastArea(35, N), [28, 29, 34, 35]);
assert.deepEqual(getBlastArea(6, N), [0, 1, 6, 7, 12, 13]); // left edge, no wrap to tile 5/11

console.log('--- R26: Dynamite effects spawn on the blasted tiles ---');
// A fake grid on screen: tile i sits in a 50px cell at (100 + col*50, 200 + row*50).
const flashed = new Set();
const fakeTile = (i) => ({
  getBoundingClientRect: () => ({ left: 100 + (i % N) * 50, top: 200 + Math.floor(i / N) * 50, width: 50, height: 50 }),
  classList: { add: (c) => c === 'blast-flash' && flashed.add(i), remove: () => {} },
  offsetWidth: 50
});
globalThis.document = {
  getElementById: (id) => {
    const m = /^mine-tile-(\d+)$/.exec(id);
    return m && Number(m[1]) < N * N ? fakeTile(Number(m[1])) : null;
  }
};
const spawned = [];
const origSparks = particles.spawnClickSparks, origText = particles.spawnFloatingText;
particles.spawnClickSparks = (x, y) => spawned.push({ x, y });
particles.spawnFloatingText = (x, y) => spawned.push({ x, y });
try {
  const inGrid = ({ x, y }) => x >= 100 && x <= 100 + N * 50 && y >= 200 && y <= 200 + N * 50;
  for (const corner of [0, N - 1, N * (N - 1), N * N - 1]) {
    const gs = new GameState();
    const ms = new MiningSystem(gs);
    // only the corner is unrevealed, so the blast is centred there
    gs.miningGrid.blocks.forEach(b => { b.revealed = b.id !== corner; });
    gs.miningGrid.blocks[corner].content = 'stone';
    gs.miningGrid.blocks[corner].hp = 1;
    spawned.length = 0;
    flashed.clear();
    assert.equal(ms.useDynamite(), true);
    assert.ok(gs.miningGrid.blocks[corner].revealed);
    assert.ok(spawned.length > 0, 'blast shows effects');
    for (const p of spawned) assert.ok(inGrid(p), `effect at (${p.x}, ${p.y}) is outside the grid`);
    assert.deepEqual([...flashed].sort((a, b) => a - b), getBlastArea(corner, N), 'flash outlines the clipped 3x3');
  }
} finally {
  particles.spawnClickSparks = origSparks;
  particles.spawnFloatingText = origText;
  delete globalThis.document;
}

console.log('--- R26: no grid on screen falls back to the given point ---');
{
  const gs = new GameState();
  const ms = new MiningSystem(gs);
  const b = gs.miningGrid.blocks.find(x => !x.revealed && x.content !== 'stairs');
  b.content = 'stone';
  b.hp = 1;
  ms.blastBlocks([b], 10, 20);
  assert.ok(b.revealed);
}

console.log('R26 blast tests passed');
