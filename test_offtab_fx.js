// Effects stay on their own tab: a geode found by the drills (no tap position) gets a quiet toast
// and no sound, instead of a full-screen ceremony over whatever tab the player is on.
// Run: node test_offtab_fx.js
import assert from 'node:assert/strict';
import { GameState } from './js/systems/GameState.js';
import { MiningSystem } from './js/systems/MiningSystem.js';
import { particles } from './js/engine/ParticleEngine.js';
import { rewards } from './js/ui/rewards.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
particles.suppressed = true;

console.log('--- a drill-found geode is a quiet toast; a tapped one is a ceremony ---');
{
  const log = [];
  const orig = rewards.notify;
  rewards.notify = (ev) => log.push(ev);
  try {
    const ms = new MiningSystem(new GameState());
    ms.revealReward({ content: 'geode_pocket' }, undefined, undefined);
    assert.equal(log.at(-1).kind, 'geode');
    assert.equal(log.at(-1).tier, 'small');
    ms.revealReward({ content: 'geode_pocket' }, 100, 100);
    assert.equal(log.at(-1).tier, 'big');
  } finally {
    rewards.notify = orig;
  }
}

console.log('All off-tab effect tests passed!');
