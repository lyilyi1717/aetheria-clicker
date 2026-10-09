// R57: a Chronicle's Pages are full at the 9th Transcend, where the x3 Transcend gates begin
import assert from 'node:assert/strict';
import { GameState } from './js/systems/GameState.js';
import {
  getPendingPages, CHRONICLE_PAGES_MAX_TRANSCENDS, CHRONICLE_TRANSCEND_GATE, CHRONICLE_BASE_PAGES,
  CHRONICLE_PAGES_STEP, GILDED_EXTRA_PAGES
} from './js/systems/ChronicleSystem.js';
import { PrestigeSystem, TRANSCEND_SLOW_FROM, TRANSCEND_GATE_GROWTH, TRANSCEND_GATE_GROWTH_LATE } from './js/systems/PrestigeSystem.js';

console.log('--- R57: the Page cap sits where the slow Transcend gates begin ---');
{
  assert.equal(CHRONICLE_PAGES_MAX_TRANSCENDS, TRANSCEND_SLOW_FROM);
  const ps = new PrestigeSystem(new GameState());
  const k = CHRONICLE_PAGES_MAX_TRANSCENDS - 1;   // Transcends done before the capped one
  // the capped Transcend is the first whose gate grows x3, the one before it x1.6
  assert.equal(ps.getTranscendGate(k).div(ps.getTranscendGate(k - 1)).toNumber().toFixed(3), TRANSCEND_GATE_GROWTH_LATE.toFixed(3));
  assert.equal(ps.getTranscendGate(k - 1).div(ps.getTranscendGate(k - 2)).toNumber().toFixed(3), TRANSCEND_GATE_GROWTH.toFixed(3));
}

console.log('--- R57: Pages grow up to the cap and stay there ---');
{
  const gs = new GameState();
  const full = CHRONICLE_BASE_PAGES + Math.floor((CHRONICLE_PAGES_MAX_TRANSCENDS - CHRONICLE_TRANSCEND_GATE) / CHRONICLE_PAGES_STEP);
  let prev = 0;
  for (let n = 0; n <= 20; n++) {
    const p = getPendingPages(gs, n);
    assert.ok(p >= prev, `never fewer Pages for more Transcends (${n})`);
    if (n >= CHRONICLE_PAGES_MAX_TRANSCENDS) assert.equal(p, full, `${n} Transcends pay the full ${full}`);
    prev = p;
  }
  // Bonuses on top of the cap still pay
  gs.chronicle.upgrades.gilded_edges = true;
  assert.equal(getPendingPages(gs, 20), full + GILDED_EXTRA_PAGES);
}

console.log('test_r57_late_year: ok');
