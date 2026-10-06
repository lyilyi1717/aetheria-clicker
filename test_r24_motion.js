// R24: reduced motion and touch tooltips. Checks the "Reduce motion" setting (modes, default,
// old saves), that the particle engine and CSS honour data-motion="reduced", that nothing
// "ready" pulses forever, and that bonus chips, gear and buffs carry tooltip text for the tap sheet.
// Run: node test_r24_motion.js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GameState } from './js/systems/GameState.js';
import {
  MOTION_MODES, normalizeMotionMode, resolveReducedMotion, isReducedMotion
} from './js/ui/motion.js';
import { tipHtml, tipAttr, TAP_TIP_SELECTOR } from './js/ui/tooltip.js';
import { gearCard } from './js/ui/rarity.js';
import { BONUS_KIND_LABELS } from './js/tabBonuses.js';
import { ParticleEngine } from './js/engine/ParticleEngine.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

console.log('--- setting: auto follows the device, on/off override it ---');
{
  assert.deepEqual(MOTION_MODES, ['auto', 'on', 'off']);
  assert.equal(resolveReducedMotion('auto', true), true);
  assert.equal(resolveReducedMotion('auto', false), false);
  assert.equal(resolveReducedMotion('on', false), true);
  assert.equal(resolveReducedMotion('off', true), false);
  for (const bad of [undefined, null, '', 'yes', true, 1]) {
    assert.equal(normalizeMotionMode(bad), 'auto', `${String(bad)} -> auto`);
    assert.equal(resolveReducedMotion(bad, true), true, 'unknown follows the device');
  }
}

console.log('--- saves: new game defaults to auto, value round-trips, old saves load ---');
{
  const gs = new GameState();
  assert.equal(gs.settings.reduceMotion, 'auto');
  gs.settings.reduceMotion = 'on';
  const loaded = new GameState();
  loaded.deserialize(JSON.parse(JSON.stringify(gs.serialize())));
  assert.equal(loaded.settings.reduceMotion, 'on');

  const old = new GameState().serialize();
  old.settings = { notation: 'engineering', guidesSeen: { monolith: true } }; // pre-R24 shape
  const gsOld = new GameState();
  gsOld.deserialize(JSON.parse(JSON.stringify(old)));
  assert.equal(gsOld.settings.reduceMotion, 'auto', 'pre-R24 save follows the device');
  assert.equal(gsOld.settings.notation, 'engineering', 'other settings kept');
  assert.deepEqual(gsOld.settings.guidesSeen, { monolith: true });

  const noSettings = new GameState().serialize();
  delete noSettings.settings;
  const gs2 = new GameState();
  gs2.deserialize(JSON.parse(JSON.stringify(noSettings)));
  assert.equal(gs2.settings.reduceMotion, 'auto');

  const junk = new GameState().serialize();
  junk.settings.reduceMotion = 'sometimes';
  const gs3 = new GameState();
  gs3.deserialize(JSON.parse(JSON.stringify(junk)));
  assert.equal(gs3.settings.reduceMotion, 'auto', 'unknown value falls back to auto');
}

console.log('--- particles: no sparks and no drift under data-motion="reduced" ---');
{
  const hadDocument = 'document' in globalThis;
  const saved = globalThis.document;
  try {
    globalThis.document = { documentElement: { dataset: { motion: 'full' } } };
    const p = new ParticleEngine();
    assert.equal(isReducedMotion(), false);
    p.spawnClickSparks(10, 10, 5);
    assert.equal(p.particles.length, 5, 'full motion: sparks');
    p.spawnFloatingText(10, 10, '+1');
    assert.notEqual(p.texts[0].vy, 0, 'full motion: text drifts up');

    globalThis.document.documentElement.dataset.motion = 'reduced';
    assert.equal(isReducedMotion(), true);
    const q = new ParticleEngine();
    q.spawnClickSparks(10, 10, 5);
    assert.equal(q.particles.length, 0, 'reduced: no sparks');
    q.spawnFloatingText(10, 10, '+1', '#fff', true);
    assert.equal(q.texts.length, 1, 'reduced: the number still shows');
    assert.equal(q.texts[0].vy, 0);
    assert.equal(q.texts[0].vx, 0);
  } finally {
    if (hadDocument) globalThis.document = saved; else delete globalThis.document;
  }
}

console.log('--- CSS: reduced motion stops animations, ambient effects and shake ---');
{
  const tokens = read('./css/tokens.css');
  assert.match(tokens, /:root\[data-motion="reduced"\] \*[\s\S]*?animation: none !important; transition: none !important;/);
  assert.match(tokens, /prefers-reduced-motion: reduce\)[\s\S]*?:root:not\(\[data-motion="full"\]\)/,
    'device setting applies unless the player chose full motion');
  const anim = read('./css/animations.css');
  assert.match(anim, /:root\[data-motion="reduced"\] body::before \{ display: none; \}/, 'background dust hidden');
  assert.match(anim, /:root\[data-motion="reduced"\] \.monster-arena-box\.hit-shake/, 'no screen shake');
  const rewards = read('./css/rewards.css');
  assert.match(rewards, /:root\[data-motion="reduced"\] \.reward-toast\.is-leaving \{ opacity: 0; \}/);
}

console.log('--- CSS: nothing "ready" pulses forever; infinite loops are ambient only ---');
{
  // Ambient motion (orb ring, background dust, floating anomaly, ceremony burst) may loop; it
  // all stops under reduced motion. Everything else runs a fixed number of times.
  const AMBIENT = new Set(['spin', 'desertDust', 'floatWobble', 'floatSmooth', 'reward-spin']);
  for (const file of ['animations', 'style', 'rewards', 'components', 'garden-breeding', 'wardens-relics', 'unlocks']) {
    const css = read(`./css/${file}.css`);
    for (const m of css.matchAll(/animation:\s*([^;]+);/g)) {
      for (const part of m[1].split(',')) {
        if (!/\binfinite\b/.test(part)) continue;
        const name = part.trim().split(/\s+/)[0];
        assert.ok(AMBIENT.has(name), `${file}.css: ${name} loops forever`);
      }
    }
  }
  const style = read('./css/style.css');
  assert.match(style, /notif-pulse 1\.6s ease-in-out 3;/, 'red dot pulses 3 times');
  // pulseGlow on Frenzy: 6 half-cycles of 0.5 s = 3 pulses at 1 per second (<= 3 flashes/s)
  assert.match(style, /pulseGlow 0\.5s 6 alternate;/);
}

console.log('--- tooltips: chips, gear and buffs carry tip text for the tap sheet ---');
{
  assert.equal(TAP_TIP_SELECTOR, '.tab-bonus-chip, .gear, .bb-chip');
  assert.equal(tipHtml('A <b>', 'x & y', '', null), '<strong>A &lt;b&gt;</strong><br>x &amp; y');
  assert.equal(tipAttr('<strong>A</strong>'), 'data-tip="&lt;strong&gt;A&lt;/strong&gt;"');

  const card = gearCard('Weapon', { name: 'Epic <WEAPON>', rarity: 'Epic', attack: 5 }, '+5 Atk');
  const tip = card.match(/data-tip="([^"]*)"/);
  assert.ok(tip, 'gear card has a data-tip');
  assert.ok(!card.includes('<WEAPON>'), 'item name escaped');
  assert.match(tip[1], /&lt;strong&gt;Epic &amp;lt;WEAPON&amp;gt;&lt;\/strong&gt;/, 'name escaped inside the tip HTML');
  assert.match(tip[1], /Weapon · Epic/);
  assert.match(tip[1], /\+5 Atk/);
  assert.match(gearCard('Relic', null, '+0% Drain'), /data-tip="[^"]*Relic: empty/);

  for (const kind of ['talent', 'perk', 'mastery', 'buff']) assert.ok(BONUS_KIND_LABELS[kind], kind);
  const main = read('./js/main.js');
  assert.match(main, /tab-bonus-chip \$\{i\.kind\}" \$\{tipAttr\(tipHtml\(/, 'bonus chips carry a tip');
  assert.ok(!/function setupTooltips/.test(main), 'old hover-only tooltip system moved to js/ui/tooltip.js');
  const buff = read('./js/buffBar.js');
  assert.match(buff, /el\.dataset\.tip = tipHtml\(/);
  assert.match(buff, /dataset\.goLabel/);
}

console.log('--- markup: Settings has the Reduce motion group ---');
{
  const html = read('./index.html');
  assert.match(html, /<div id="settings-motion" class="settings-group"><\/div>/);
  assert.ok(!html.includes('buff-bar-tip'), 'buff bar uses the shared tap sheet');
}

console.log('\nAll R24 motion and tooltip tests passed.');
