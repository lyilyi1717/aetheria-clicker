// R42: Boss and Warden kills feel like a win. Checks the enrage urgency rules and ticks, the
// boss-kill hook (gold, Warden flag, the blip sound kept for normal kills), the new voices, the
// CSS (flash, callout, reduced-motion guards) and the wiring in main.js / index.html.
// Run: node test_r42_boss_fx.js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { CombatSystem } from './js/systems/CombatSystem.js';
import { sound, SOUND_IDS } from './js/engine/AudioEngine.js';
import {
  enrageState, shouldTick, bossDownLabel, renderBossTimer, playBossDown, initCombatFx,
  ENRAGE_URGENT_S, ENRAGE_CRITICAL_S, HITSTOP_MS, FLASH_MS, CALLOUT_MS
} from './js/ui/combatFx.js';
import { budgetFor } from './js/ui/feedbackBudget.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

console.log('--- enrage: red at <= 10 s, bigger at <= 3 s ---');
{
  assert.equal(ENRAGE_URGENT_S, 10);
  assert.equal(ENRAGE_CRITICAL_S, 3);
  assert.deepEqual(enrageState(45), { urgent: false, critical: false, second: null });
  assert.deepEqual(enrageState(10), { urgent: true, critical: false, second: 10 });
  assert.deepEqual(enrageState(9.2), { urgent: true, critical: false, second: 10 });
  assert.deepEqual(enrageState(3), { urgent: true, critical: true, second: 3 });
  assert.deepEqual(enrageState(0), { urgent: true, critical: true, second: null });
  assert.deepEqual(enrageState(NaN), { urgent: false, critical: false, second: null });
  assert.equal(shouldTick(11, 10), true);
  assert.equal(shouldTick(10, 9.5), false, 'same second');
  assert.equal(shouldTick(10, 9), true);
  assert.equal(shouldTick(null, 20), false, 'outside the window');
  assert.equal(bossDownLabel(false), 'BOSS DOWN!');
  assert.equal(bossDownLabel(true), 'WARDEN DOWN!');
  assert.equal(HITSTOP_MS, 90);
  assert.equal(FLASH_MS, 150);
  assert.equal(CALLOUT_MS, 900);
}

// A fake element: enough for renderBossTimer
function fakeEl() {
  const classes = new Set();
  return {
    classes, style: {}, dataset: {}, textContent: '', offsetParent: {},
    classList: {
      toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)),
      contains: (c) => classes.has(c)
    }
  };
}

console.log('--- the countdown ticks once a second from 10 to 1 (max 10) ---');
{
  const played = [];
  const realPlay = sound.play;
  sound.play = (id) => played.push(id);
  try {
    const el = fakeEl();
    const m = { isBoss: true, timer: 45 };
    for (let s = 45; s > 0; s -= 0.1) { m.timer = s; renderBossTimer(el, m); }
    assert.equal(played.filter(id => id === 'tick').length, 10, 'ticks at 10, 9, ... 1');
    assert.ok(el.classes.has('enrage-urgent'));
    assert.ok(el.classes.has('enrage-critical'));
    assert.equal(el.style.visibility, 'visible');

    // A boss that is already inside the window when first shown doesn't tick at once
    played.length = 0;
    const el2 = fakeEl();
    renderBossTimer(el2, { isBoss: true, timer: 5 });
    assert.equal(played.length, 0);
    renderBossTimer(el2, { isBoss: true, timer: 3.9 });
    assert.equal(played.length, 1, 'the next second does');

    // Hidden tab: no ticks
    played.length = 0;
    const el3 = fakeEl();
    el3.offsetParent = null;
    for (let s = 12; s > 0; s -= 0.5) renderBossTimer(el3, { isBoss: true, timer: s });
    assert.equal(played.length, 0);

    // Normal floor: hidden, no urgency classes; after a boss it shows the last boss's gold
    const el4 = fakeEl();
    renderBossTimer(el4, { isBoss: true, timer: 2 });
    renderBossTimer(el4, { isBoss: false, timer: 0 });
    assert.equal(el4.style.visibility, 'hidden');
    assert.ok(!el4.classes.has('enrage-urgent') && !el4.classes.has('enrage-critical'));
    el4.dataset.lastReward = 'Last boss: +5 gold';
    renderBossTimer(el4, { isBoss: false, timer: 0 });
    assert.equal(el4.style.visibility, 'visible');
    assert.equal(el4.textContent, 'Last boss: +5 gold');
    assert.ok(el4.classes.has('boss-timer-last'));
    renderBossTimer(el4, { isBoss: true, timer: 45 });
    assert.match(el4.textContent, /45\.0/, 'the next boss shows its timer again');
    assert.ok(!el4.classes.has('boss-timer-last'));
  } finally {
    sound.play = realPlay;
  }
}

console.log('--- boss kills call the hook with the gold; normal kills keep the blip ---');
{
  const gs = new GameState();
  const cs = new CombatSystem(gs);
  const events = [];
  cs.onBossDefeated = (ev) => events.push(ev);
  gs.hero.floor = 11;
  cs.initMonster();
  cs.dealDamageToMonster(cs.monster.hp + 1);
  assert.equal(events.length, 0, 'a normal monster is not a boss moment');
  gs.hero.floor = 20;
  cs.initMonster();
  assert.ok(cs.monster.isBoss);
  const before = gs.gold;
  cs.dealDamageToMonster(cs.monster.hp + 1);
  assert.equal(events.length, 1);
  assert.equal(events[0].isWarden, false);
  assert.equal(events[0].floor, 20);
  assert.ok(events[0].gold instanceof BigNum);
  const paid = gs.gold.sub(before).toNumber();
  assert.ok(Math.abs(events[0].gold.toNumber() - paid) <= 1e-9 * paid, 'the gold that was paid');

  // No window in node: the boss blip still plays (the T2 sound is only for a boss on screen)
  let defeat = 0;
  const realDefeat = sound.playDefeat;
  sound.playDefeat = () => { defeat++; };
  try {
    gs.hero.floor = 30;
    cs.initMonster();
    cs.dealDamageToMonster(cs.monster.hp + 1);
    assert.equal(defeat, 1);
  } finally { sound.playDefeat = realDefeat; }
}

console.log('--- no DOM: the moment is a no-op ---');
{
  assert.equal(playBossDown(null, null, { gold: 1 }), false);
  assert.equal(playBossDown({ isConnected: true, offsetParent: null }, {}, { gold: 1 }), false, 'Tower hidden');
  const cs = {};
  initCombatFx(cs, null, null);
  assert.equal(cs.onBossDefeated, undefined, 'nothing hooked without the elements');
}

console.log('--- T2 budget: shake and hit-stop only with motion on ---');
{
  assert.equal(budgetFor(2).shake, true);
  assert.equal(budgetFor(2, { reduced: true }).shake, false);
  assert.equal(budgetFor(2, { reduced: true }).hitStop, false);
}

console.log('--- sounds, CSS and wiring ---');
{
  assert.equal(SOUND_IDS['boss-down'], 'playBossDown');
  assert.equal(SOUND_IDS.tick, 'playTick');
  assert.equal(typeof sound.playBossDown, 'function');
  assert.equal(typeof sound.playTick, 'function');

  const css = read('./css/style.css');
  assert.match(css, /\.boss-timer\.enrage-urgent\s*\{\s*color: var\(--danger\)/);
  assert.match(css, /\.boss-timer\.enrage-critical\s*\{\s*transform: scale\(1\.15\)/);
  assert.match(css, /:root\[data-motion="reduced"\] \.boss-timer\.enrage-critical\s*\{\s*transform: none/);
  assert.match(css, /\.monster-avatar\.fx-flash::after/);
  assert.match(css, /:root\[data-motion="reduced"\] \.monster-avatar\.fx-flash::after\s*\{\s*display: none/);
  assert.match(css, /\.boss-down-callout\s*\{[^}]*pointer-events: none/, 'the callout never blocks a tap');

  const html = read('./index.html');
  assert.match(html, /id="boss-timer" class="boss-timer"/);
  assert.doesNotMatch(html, /id="boss-timer"[^>]*color: var\(--danger\)/, 'red only when urgent');

  const main = read('./js/main.js');
  assert.match(main, /initCombatFx\(this\.combatSystem, monsterCard/);
  assert.match(main, /renderBossTimer\(bossTimerEl, m\)/);
  const combat = read('./js/systems/CombatSystem.js');
  assert.match(combat, /if \(isBoss\) this\.onBossDefeated\?\.\(\{ isWarden, gold: goldEarned, floor \}\)/);
}

console.log('test_r42_boss_fx: all passed');
