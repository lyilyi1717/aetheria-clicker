// R23: responsive app shell. Checks the shell helpers (header currencies, first-visit guides,
// next-goal chip), that saves from before R23 start with every guide collapsed, and that the
// shell markup in index.html stays wired (5-slot bottom bar, More sheet holds every other tab).
// Run: node test_r23_shell.js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { BuildingSystem, BUILDING_DEFINITIONS } from './js/systems/BuildingSystem.js';
import { PrestigeSystem, MIN_RUN_SECONDS } from './js/systems/PrestigeSystem.js';
import { headerCurrencies, isGuideFirstVisit, markGuideSeen, getNextGoal } from './js/ui/shell.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

console.log('--- header: hero currency first, Aether/Gold/Dust always, extras only where used ---');
{
  assert.deepEqual(headerCurrencies('monolith'), ['aether', 'gold', 'dust', 'mana']);
  assert.deepEqual(headerCurrencies('combat').slice(0, 3), ['gold', 'aether', 'dust']);
  assert.equal(headerCurrencies('prestige')[0], 'dust');
  assert.ok(headerCurrencies('bounties').includes('seals'));
  assert.ok(headerCurrencies('alchemy').includes('sand'));
  assert.ok(!headerCurrencies('codex').includes('mana'), 'no Mana where no spell is cast');
  for (const tab of ['monolith', 'combat', 'mining', 'garden', 'codex', 'settings']) {
    const list = headerCurrencies(tab);
    for (const c of ['aether', 'gold', 'dust']) assert.ok(list.includes(c), `${tab} shows ${c}`);
    assert.equal(new Set(list).size, list.length, `${tab}: no duplicates`);
  }
}

console.log('--- guides: expanded on a first visit only ---');
{
  const gs = new GameState();
  assert.deepEqual(gs.settings.guidesSeen, {}, 'a new game has seen no guide');
  assert.equal(isGuideFirstVisit(gs.settings, 'monolith'), true);
  markGuideSeen(gs.settings, 'monolith');
  assert.equal(isGuideFirstVisit(gs.settings, 'monolith'), false);
  assert.equal(isGuideFirstVisit(gs.settings, 'combat'), true);

  // The seen set is saved with the settings and survives a round trip
  const loaded = new GameState();
  loaded.deserialize(JSON.parse(JSON.stringify(gs.serialize())));
  assert.equal(isGuideFirstVisit(loaded.settings, 'monolith'), false);
  assert.equal(isGuideFirstVisit(loaded.settings, 'combat'), true);
  assert.equal(isGuideFirstVisit({}, 'combat'), false, 'missing settings never auto-expand');
}

console.log('--- a save from before R23 starts with every guide collapsed ---');
{
  const old = new GameState().serialize();
  old.settings = { notation: 'engineering' }; // pre-R23 shape: no guidesSeen
  const gs = new GameState();
  gs.deserialize(JSON.parse(JSON.stringify(old)));
  assert.equal(gs.settings.notation, 'engineering', 'other settings kept');
  for (const tab of ['monolith', 'combat', 'mining', 'prestige']) {
    assert.equal(isGuideFirstVisit(gs.settings, tab), false, `${tab} collapsed`);
  }
  const noSettings = new GameState().serialize();
  delete noSettings.settings;
  const gs2 = new GameState();
  gs2.deserialize(JSON.parse(JSON.stringify(noSettings)));
  assert.equal(isGuideFirstVisit(gs2.settings, 'monolith'), false);
}

console.log('--- next goal: first generator, then Ascension gate, run timer, Ascend ---');
{
  const gs = new GameState();
  const bs = new BuildingSystem(gs);
  const ps = new PrestigeSystem(gs);
  const now = Date.now();
  gs.runStartedAt = now;

  let g = getNextGoal(gs, bs, ps, now);
  assert.equal(g.tab, 'monolith');
  assert.match(g.text, new RegExp(BUILDING_DEFINITIONS[0].name));
  assert.ok(g.pct >= 0 && g.pct <= 1);

  // Every unlocked tier bought once: the goal moves to Ascension's 1e9 gate
  for (const d of BUILDING_DEFINITIONS) if (bs.isTierUnlocked(d.id)) gs.buildings[d.id].count = 1;
  gs.totalAetherEarned = new BigNum(1e6);
  g = getNextGoal(gs, bs, ps, now);
  assert.equal(g.tab, 'prestige');
  assert.match(g.text, /Ascension at/);
  assert.ok(Math.abs(g.pct - 6 / 9) < 1e-9, 'log-scale progress to 1e9');

  // Past the gate but the run is too short: count down the minimum run
  gs.totalAetherEarned = new BigNum(1e12);
  g = getNextGoal(gs, bs, ps, now + 60_000);
  assert.match(g.text, /Ascension in 9:00/);
  assert.ok(Math.abs(g.pct - 60 / MIN_RUN_SECONDS) < 1e-9);

  // Ready: Ascend with the pending dust
  g = getNextGoal(gs, bs, ps, now + MIN_RUN_SECONDS * 1000 + 1);
  assert.match(g.text, /^Ascend for \+/);
  assert.equal(g.pct, 1);

  // Huge numbers don't produce NaN
  gs.totalAetherEarned = new BigNum(1, 400);
  gs.buildings[BUILDING_DEFINITIONS[0].id].count = 0;
  gs.aether = new BigNum(1, 500);
  g = getNextGoal(gs, bs, ps, now - MIN_RUN_SECONDS * 1000);
  assert.ok(Number.isFinite(g.pct));
}

console.log('--- index.html: bottom bar, More sheet, guide hints, no art panels ---');
{
  const html = read('./index.html');
  const tabsIn = (re) => [...(html.match(re)?.[1] || '').matchAll(/data-tab="(\w+)"/g)].map(m => m[1]);
  const side = tabsIn(/<nav id="side-nav"[^>]*>([\s\S]*?)<\/nav>/);
  const bottom = tabsIn(/<nav id="bottom-nav"[^>]*>([\s\S]*?)<\/nav>/);
  const sheet = tabsIn(/<div class="more-grid">([\s\S]*?)<\/div>/);
  const sections = [...html.matchAll(/<section id="tab-(\w+)" class="tab-view/g)].map(m => m[1]);

  assert.deepEqual(bottom, ['monolith', 'combat', 'mining', 'prestige'], 'Falafel · Tower · Dig · Ascension (+ More)');
  assert.match(html, /id="btn-more"/);
  assert.deepEqual([...side].sort(), [...sections].sort(), 'side nav reaches every tab');
  assert.deepEqual([...bottom, ...sheet].sort(), [...sections].sort(), 'bottom bar + More sheet reach every tab once');

  const banners = [...html.matchAll(/<div class="tab-guide-banner"([^>]*)>/g)];
  assert.ok(banners.length >= 11);
  for (const b of banners) assert.match(b[1], /data-hint="[^"]{10,}"/, 'every guide has a one-line hint');

  for (const img of ['cosmic_shovel.webp', 'ascension.webp', 'merchant.webp']) {
    assert.ok(!html.includes(img), `${img} art panel removed`);
  }
  // Ids main.js writes every frame are still there
  for (const id of ['stat-aether', 'stat-aether-rate', 'stat-gold', 'stat-mana', 'bar-mana-fill', 'stat-chrono',
    'stat-guild-seals', 'stat-cosmic-dust', 'btn-time-warp', 'ff-cost', 'ff-info', 'btn-mute', 'volume-slider', 'game-version']) {
    assert.match(html, new RegExp(`id="${id}"`), `#${id} present`);
  }
}

console.log('--- CSS: toasts below the header, buff bar above the bottom nav ---');
{
  const rewards = read('./css/rewards.css');
  const style = read('./css/style.css');
  assert.ok(!/\.reward-toasts\s*\{[^}]*top:\s*(72|8)px/.test(rewards), 'no fixed toast top');
  assert.equal((rewards.match(/top:\s*calc\(var\(--header-h\) \+ 8px\)/g) || []).length, 2, 'desktop and phone');
  assert.match(style, /bottom:\s*calc\(var\(--bottom-nav-h\) \+ env\(safe-area-inset-bottom\)\)/, 'buff bar sits on the bottom nav');
}

console.log('All R23 shell tests passed.');
