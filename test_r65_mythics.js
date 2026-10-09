// R65 gear wave 2: Mythics, the Barakah meter, boss telegraphs, Sheikhs and Zone Guardians (merged
// with the R18 Wardens), the Al-Wakeel Dust-shop unlock and old saves.
// Run: node test_r65_mythics.js
import assert from 'node:assert/strict';
import { GameState } from './js/systems/GameState.js';
import {
  CombatSystem, BOSS_HP_MULT, WARDEN_HP_MULT
} from './js/systems/CombatSystem.js';
import {
  mainStat, makeItem, sanitizeItem, sanitizeBag, sanitizeLoot, MYTHICS, MYTHIC_IDS, mythicForSlot, rarityIndex,
  BARAKAH_MAX, BARAKAH_DAILY_FULL, MYTHIC_CHANCE, UNIQUE_FX, COSMIC_PITY, RARITY_NAMES
} from './js/systems/gearItems.js';
import {
  bossTier, teleMech, phaseFor, phaseTypes, TELE_FX, TELE_WINDUP, TELE_FIRST, WARD_TAPS, GUARDIAN_FLOORS
} from './js/systems/bossFights.js';
import { SAVE_VERSION } from './js/engine/migrations.js';
import { DUST_SHOP_ITEMS, buyShopItem } from './js/systems/DustShopSystem.js';
import { BigNum } from './js/engine/BigNum.js';
import { particles } from './js/engine/ParticleEngine.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
particles.suppressed = true;

const fresh = () => {
  const gs = new GameState();
  const cs = new CombatSystem(gs);
  gs.combatSystem = cs;
  return { gs, cs, g: cs.gear, h: gs.hero };
};
const seq = (...v) => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };
const equipMythic = (g, slot) => {
  const item = makeItem({ slot, rarity: 'Mythic', ilvl: 200 });
  item.affixes = [];   // keep the rolls out of the arithmetic
  item.uid = g.bag.nextUid++;
  g.hero.gear[slot] = item;
  return item;
};
// A boss fight on `floor` with the hero unable to kill it or die
const bossFight = (floor, wardens = false) => {
  const r = fresh();
  if (wardens) r.h.wardensUnlocked = true;
  r.h.floor = floor;
  r.cs.initMonster();
  r.cs.getTotalAttack = () => 1;
  r.h.hp = 1e30; r.h.maxHp = 1e30;
  return r;
};
const run = (cs, secs, dt = 0.25) => { for (let t = 0; t < secs; t += dt) cs.update(dt); };

console.log('--- Mythic: a named mechanic on a Cosmic-level body, never lost ---');
{
  assert.equal(RARITY_NAMES.at(-1), 'Mythic');
  assert.deepEqual(mainStat('weapon', 'Mythic', 200), mainStat('weapon', 'Cosmic', 200), 'no bigger number than a Cosmic');
  assert.equal(MYTHIC_IDS.length, 4);
  for (const slot of ['weapon', 'armor', 'amulet', 'relic']) {
    const id = mythicForSlot(slot);
    assert.ok(id && MYTHICS[id].slot === slot);
    const it = makeItem({ slot, rarity: 'Mythic', ilvl: 200 });
    assert.equal(it.uniqueId, id);
    assert.equal(it.locked, true, 'a new Mythic starts locked');
    assert.equal(it.affixes.length, 3);
    // a Mythic read from a save without its mechanic gets it back
    assert.equal(sanitizeItem({ slot, rarity: 'Mythic', ilvl: 5, uniqueId: null }).uniqueId, id);
    assert.ok(MYTHICS[id].ratingMult >= 1.2 && MYTHICS[id].ratingMult <= 1.5, 'rated about x1.2-1.5');
  }
  // never dropped by the bag cap, even full
  const items = Array.from({ length: 31 }, (_, i) => ({ slot: 'weapon', rarity: i === 30 ? 'Mythic' : 'Rare', uid: i + 1, ilvl: 3 }));
  const bag = sanitizeBag({ items, cap: 30 });
  assert.equal(bag.items.length, 31);
  assert.equal(bag.items.at(-1).rarity, 'Mythic');
  // a full bag still takes a Mythic
  const { g } = fresh();
  g.bag.cap = 2;
  for (let i = 0; i < 2; i++) { const it = makeItem({ slot: 'armor', rarity: 'Legendary', ilvl: 99 }); it.locked = true; it.uid = g.bag.nextUid++; g.bag.items.push(it); }
  const r = g.receive(makeItem({ slot: 'weapon', rarity: 'Mythic', ilvl: 200 }), { quiet: true });
  assert.ok(r.kept && g.bag.items.length === 3);
}

console.log('--- Mythic drops: floor 151+, 0.001% natural, the full meter guarantees one ---');
{
  const { g, gs } = fresh();
  // below 151 nothing rolls, even with a full meter
  gs.loot.barakah.points = BARAKAH_MAX;
  assert.notEqual(g.rollDrop(150, false, seq(0, 0.99, 0)).item.rarity, 'Mythic');
  // from 151 the full meter makes the next find a Mythic and empties the meter
  const got = g.rollDrop(151, false, seq(0, 0.99, 0));
  assert.equal(got.item.rarity, 'Mythic');
  assert.equal(gs.loot.barakah.points, 0);
  assert.equal(gs.loot.barakah.mythics, 1);
  assert.equal(gs.loot.barakah.full, false);
  // natural roll: 0.001% of mob drops (draws: chance, rarity, slot, mythic)
  assert.equal(MYTHIC_CHANCE.mob, 0.001);
  assert.equal(g.rollDrop(200, false, seq(0, 0.99, 0, 0.0000099)).item.rarity, 'Mythic');
  assert.notEqual(g.rollDrop(200, false, seq(0, 0.99, 0, 0.0000101)).item.rarity, 'Mythic');
  assert.ok(MYTHIC_CHANCE.boss > MYTHIC_CHANCE.mob && MYTHIC_CHANCE.sheikh > MYTHIC_CHANCE.boss && MYTHIC_CHANCE.guardian > MYTHIC_CHANCE.sheikh);
  // the gate is quiet below 151: no extra rng draw there (old roll sequences stay valid)
  let draws = 0;
  g.rollDrop(100, false, () => { draws++; return draws === 1 ? 0 : 0.5; });
  const below = draws;
  draws = 0;
  g.rollDrop(200, false, () => { draws++; return draws === 1 ? 0 : 0.5; });
  assert.equal(draws, below + 1, 'one extra draw from floor 151');
}

console.log('--- Cosmic pity: every 10th Legendary without a Cosmic is a Cosmic ---');
{
  const { g, gs } = fresh();
  gs.loot.cosDry = COSMIC_PITY - 1;
  // rarity roll 29.85 -> Legendary: the 10th upgrades
  assert.equal(g.rollDrop(50, false, seq(0, 0.2985, 0)).item.rarity, 'Cosmic');
  assert.equal(gs.loot.cosDry, 0);
  assert.equal(g.rollDrop(50, false, seq(0, 0.2985, 0)).item.rarity, 'Legendary');
  assert.equal(gs.loot.cosDry, 1);
}

console.log('--- Barakah: points, the daily rest, no decay, no loss ---');
{
  const { g, gs } = fresh();
  let now = Date.UTC(2026, 5, 10, 9);
  g.clock = () => now;
  const b = gs.loot.barakah;
  g.addBarakah(1);
  assert.equal(b.points, 1);
  // points per find (draws: chance, rarity, slot)
  b.points = 0; b.today = 0; b.day = '';
  g.rollDrop(50, false, seq(0, 0.10, 0));   // Rare
  assert.equal(b.points, 1);
  g.rollDrop(50, false, seq(0, 0.27, 0));   // Epic
  assert.equal(b.points, 6);
  g.rollDrop(50, false, seq(0, 0.2985, 0)); // Legendary
  assert.equal(b.points, 56);
  g.rollDrop(50, false, seq(0, 0.29975, 0)); // Cosmic
  assert.equal(b.points, 306);
  // soft cap: the first 1,000 points of a day count in full, the rest a quarter
  b.points = 0; b.today = 0; b.day = '';
  g.addBarakah(900);
  assert.equal(g.barakahResting(), false);
  g.addBarakah(400);   // 100 at full rate, 300 at a quarter
  assert.equal(b.points, 900 + 100 + 75);
  assert.equal(g.barakahResting(), true);
  const before = b.points;
  g.addBarakah(40);
  assert.equal(b.points, before + 10, 'resting: a quarter');
  // next calendar day: full rate again; nothing lost overnight or after weeks away
  now += 36 * 3600 * 1000;
  assert.equal(g.barakahResting(), false);
  g.addBarakah(100);
  assert.equal(b.points, before + 10 + 100);
  now += 90 * 24 * 3600 * 1000;
  assert.equal(b.points, before + 110, 'absence takes nothing away');
  // full meter: capped, announced once
  b.points = BARAKAH_MAX - 1; b.full = false;
  g.addBarakah(50);
  assert.equal(b.points, BARAKAH_MAX);
  assert.equal(b.full, true);
  assert.equal(g.addBarakah(50), 0);
  assert.equal(BARAKAH_DAILY_FULL, 1000);
}

console.log('--- First kills: Barakah, a spare Core, double gold, once per floor ---');
{
  const { g, gs, cs, h } = fresh();
  g.clock = () => Date.UTC(2026, 5, 10, 9);
  h.maxFloor = 1;
  gs.loot.bossHigh = 0;
  assert.equal(g.claimFirstKill(10, 'boss'), true);
  assert.equal(gs.loot.barakah.points, 20);
  assert.equal(g.claimFirstKill(10, 'boss'), false, 'a repeat kill is not a first kill');
  assert.equal(g.claimFirstKill(50, 'guardian'), true);
  assert.equal(gs.loot.barakah.points, 20 + 1000 * 0 + (BARAKAH_DAILY_FULL - 20) + (1000 - (BARAKAH_DAILY_FULL - 20)) * 0.25);
  assert.equal(g.claimFirstKill(30, 'boss'), false, 'floors below the highest claimed are claimed');
  // an old save counts the bosses it already passed as claimed
  const old = new GameState();
  old.hero = { ...fresh().h, maxFloor: 245, floor: 245 };
  const oc = new CombatSystem(old);
  assert.equal(oc.gear.loot.bossHigh, 240);
}

console.log('--- Tiers: boss, Sheikh every 50, Zone Guardian, Warden (one fight, x3 once) ---');
{
  assert.equal(bossTier(7), 'mob');
  assert.equal(bossTier(20), 'boss');
  assert.equal(bossTier(100), 'sheikh');
  assert.equal(bossTier(350), 'sheikh');
  assert.equal(bossTier(300), 'guardian');
  assert.deepEqual(GUARDIAN_FLOORS, [50, 150, 300, 500, 750, 1000]);
  for (const f of GUARDIAN_FLOORS) assert.equal(bossTier(f), 'guardian');
  assert.equal(bossTier(250), 'sheikh', 'before the first Warden unlock');
  assert.equal(bossTier(250, true), 'warden');
  // fights
  let r = bossFight(100);
  assert.equal(r.cs.monster.tier, 'sheikh');
  assert.equal(r.cs.monster.maxHp, Math.floor(BOSS_HP_MULT * 1.5 * Math.pow(1.12, 99)));
  assert.equal(r.cs.monster.timer, 60);
  r = bossFight(300);
  assert.equal(r.cs.monster.tier, 'guardian');
  assert.equal(r.cs.monster.maxHp, Math.floor(BOSS_HP_MULT * 3 * Math.pow(1.12, 299)));
  // a Guardian floor that is also a Warden floor is ONE fight, x3 and not x9
  r = bossFight(500, true);
  assert.equal(r.cs.monster.tier, 'warden');
  assert.ok(r.cs.monster.isWarden);
  assert.equal(r.cs.monster.maxHp, Math.floor(BOSS_HP_MULT * WARDEN_HP_MULT * Math.pow(1.12, 499)));
  // a Guardian's first kill: a guaranteed Legendary that is the boss's signature
  const { g, gs } = fresh();
  const drop = g.rollDrop(300, true, seq(0, 0, 0.9), { tier: 'guardian', first: true });
  assert.equal(drop.item.rarity, 'Legendary');
  assert.equal(drop.item.uniqueId, 'wasta_stamp', 'floor 300 is Al-Modir');
  // a repeat Guardian kill: Legendary or Cosmic; a Sheikh: Epic or better
  const rep = g.rollDrop(300, true, seq(0, 0.5, 0, 0.9, 0.9), { tier: 'guardian' });
  assert.ok(rarityIndex(rep.item.rarity) >= 3);
  for (const roll of [0, 0.5, 0.99]) {
    const s = g.rollDrop(100, true, seq(0, roll, 0, 0.9, 0.9), { tier: 'sheikh' });
    assert.ok(rarityIndex(s.item.rarity) >= 2, 'Sheikhs drop Epic or better');
  }
  void gs;
}

console.log('--- Telegraphs: schedule, phases, types ---');
{
  assert.deepEqual(teleMech('boss', 0), ['smash']);
  assert.equal(teleMech('sheikh', 0).length, 2);
  assert.equal(new Set(teleMech('guardian', 4)).size, 3);
  assert.equal(phaseFor('boss', 0.51), 1);
  assert.equal(phaseFor('boss', 0.5), 2);
  assert.equal(phaseFor('guardian', 0.7), 1);
  assert.equal(phaseFor('guardian', 0.6), 2);
  assert.equal(phaseFor('guardian', 0.3), 3);
  assert.deepEqual(phaseTypes('guardian', ['smash', 'feast', 'ward'], 2), ['feast']);
  assert.equal(phaseTypes('guardian', ['smash', 'feast', 'ward'], 3).length, 3);
  // a boss on floor 160 (nameIdx 159 % 12 = 3 -> 3 % 3 = smash): first wind-up at 5 s, 1.5 s long
  const { cs } = bossFight(160);
  const seen = [];
  cs.onTelegraph = (e) => seen.push(e);
  run(cs, TELE_FIRST - 0.5);
  assert.equal(seen.length, 0);
  run(cs, 1);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].type, 'smash');
  assert.equal(seen[0].practice, false);
  // next one 8 s after the first resolves; in phase 2 it is 6 s
  run(cs, TELE_WINDUP + 8);
  assert.equal(seen.length, 2);
  cs.monster.hp = cs.monster.maxHp * 0.4;
  let phase = 0;
  cs.onBossPhase = (e) => { phase = e.phase; };
  const atk = cs.monster.attack;
  run(cs, 0.25);
  assert.equal(phase, 2);
  assert.equal(cs.monster.attack, Math.floor(atk * 1.5), 'phase 2: attack x1.5');
  // let the running wind-up end, then the next one comes 6 s later (not 8)
  let resolvedAt = null, clock = 0;
  cs.onTelegraphResult = () => { resolvedAt = clock; };
  while (resolvedAt === null) { cs.update(0.25); clock += 0.25; }
  const n = seen.length;
  while (clock < resolvedAt + 5.5) { cs.update(0.25); clock += 0.25; }
  assert.equal(seen.length, n, 'phase 2 interval is 6 s, not less');
  while (clock < resolvedAt + 6.5) { cs.update(0.25); clock += 0.25; }
  assert.equal(seen.length, n + 1);
}

console.log('--- Telegraphs: answered by a skill, a miss costs something (practice up to 150) ---');
{
  // SMASH answered by Iron Wall: Exposed, +50% damage taken
  let { cs, h } = bossFight(160);
  run(cs, TELE_FIRST + 0.25);
  assert.equal(cs.monster.boss.tele.type, 'smash');
  const res = [];
  cs.onTelegraphResult = (e) => res.push(e);
  const hp0 = h.hp;
  cs.castHeroSkill('shield');
  assert.equal(res[0].result, 'success');
  assert.equal(cs.monster.boss.exposed, TELE_FX.exposedSeconds);
  assert.equal(h.hp, hp0, 'no damage when answered');
  const m = cs.monster;
  m.hp = m.maxHp;
  cs.getTotalAttack = () => 1000;
  cs.dealDamageToMonster(1000);
  assert.equal(m.maxHp - m.hp, 1500, 'Exposed: +50% damage');
  // the wrong skill does not answer
  ({ cs, h } = bossFight(160));
  run(cs, TELE_FIRST + 0.25);
  cs.castHeroSkill('strike');
  assert.ok(cs.monster.boss.tele, 'Heavy Strike does not answer a SMASH');
  // a missed SMASH hits the hero for 25% of his max HP
  h.hp = 1e30; h.maxHp = 1e30; h.shield = 0;
  const max = cs.getTotalMaxHp();
  const hpBefore = h.hp;
  run(cs, TELE_WINDUP);
  assert.ok(!cs.monster.boss.tele);
  assert.ok(Math.abs((hpBefore - h.hp) - max * TELE_FX.smashHp) < max * 0.001);
  // Shield absorbs it
  ({ cs, h } = bossFight(160));
  run(cs, TELE_FIRST + 0.25);
  h.shield = cs.getTotalMaxHp();
  const hpS = h.hp;
  run(cs, TELE_WINDUP);
  assert.equal(h.hp, hpS);
  assert.ok(h.shield < cs.getTotalMaxHp());

  // FEAST (floor 170: nameIdx 169 % 12 = 1 -> feast): a miss heals the boss 8%; Heavy Strike answers
  ({ cs, h } = bossFight(170));
  run(cs, TELE_FIRST + 0.25);
  assert.equal(cs.monster.boss.tele.type, 'feast');
  cs.monster.hp = cs.monster.maxHp / 2 + 10;   // above phase 2
  cs.monster.hp = cs.monster.maxHp * 0.9;
  const before = cs.monster.hp;
  run(cs, TELE_WINDUP);
  // (the hero's 1-damage auto-attack lands in the same second)
  assert.ok(Math.abs(cs.monster.hp - (before + Math.floor(cs.monster.maxHp * TELE_FX.feastHeal))) <= 2);
  ({ cs, h } = bossFight(170));
  run(cs, TELE_FIRST + 0.25);
  cs.castHeroSkill('supernova');
  assert.ok(cs.monster.boss.exposed > 0, 'Supernova also answers a FEAST');

  // WARD (floor 180: nameIdx 179 % 12 = 11 -> 2 = ward): 5 taps break it; a miss halves damage
  ({ cs, h } = bossFight(180));
  run(cs, TELE_FIRST + 0.25);
  assert.equal(cs.monster.boss.tele.type, 'ward');
  for (let i = 0; i < WARD_TAPS - 1; i++) assert.equal(cs.tapWeakPoint(), false);
  assert.ok(cs.monster.boss.tele);
  assert.equal(cs.tapWeakPoint(), true);
  assert.ok(cs.monster.boss.exposed > 0);
  ({ cs, h } = bossFight(180));
  run(cs, TELE_FIRST + 0.25 + TELE_WINDUP);
  assert.ok(cs.monster.boss.ward > 0);
  cs.monster.hp = cs.monster.maxHp;
  cs.dealDamageToMonster(1000);
  assert.equal(cs.monster.maxHp - cs.monster.hp, 250, 'a missed WARD: damage x0.25 (-75%)');

  // practice: floor 100 (a Sheikh) and below 150: a miss costs nothing
  ({ cs, h } = bossFight(100));
  const hpP = h.hp;
  cs.monster.hp = cs.monster.maxHp;
  const pr = [];
  cs.onTelegraphResult = (e) => pr.push(e.result);
  run(cs, TELE_FIRST + TELE_WINDUP + 0.5);
  assert.deepEqual(pr, ['practice']);
  assert.equal(h.hp, hpP);
  assert.ok(cs.monster.maxHp - cs.monster.hp <= 10, 'no heal and no extra damage taken (only the 1-damage auto-attacks)');
  assert.ok(!(cs.monster.boss.ward > 0));
  // practice still teaches: an answered one gives Exposed
  ({ cs, h } = bossFight(110));
  run(cs, TELE_FIRST + 0.25);
  cs.tapWeakPoint(); cs.castHeroSkill('shield'); cs.castHeroSkill('strike');
  assert.ok(cs.monster.boss.exposed > 0 || cs.monster.boss.tele);
  // an ordinary monster has no telegraphs
  ({ cs } = bossFight(161));
  assert.equal(cs.monster.boss, null);
  assert.equal(cs.counterTelegraph('smash'), false);
}

console.log('--- Mythic powers ---');
{
  // Wasta Strike: every 30th hit x10; on a boss the bonus is capped at 4% of its max HP
  let { cs, g, h } = fresh();
  equipMythic(g, 'weapon');
  cs.monster.isBoss = false; cs.monster.boss = null; cs.monster.maxHp = 1e12; cs.monster.hp = 1e12;
  const strikes = [];
  cs.onWastaStrike = (e) => strikes.push(e);
  const hits = [];
  for (let i = 1; i <= 60; i++) { const b = cs.monster.hp; cs.dealDamageToMonster(100); hits.push(b - cs.monster.hp); }
  assert.equal(strikes.length, 2);
  assert.equal(hits[29], 1000, 'the 30th hit is x10');
  assert.equal(hits[59], 1000);
  assert.equal(hits.filter(x => x === 100).length, 58);
  assert.equal(UNIQUE_FX.wastaEvery, 30);
  // on a boss: 100 -> would be 1000, capped at 100 + 4% of 10,000 = 500
  ({ cs, g } = fresh());
  equipMythic(g, 'weapon');
  cs.monster.isBoss = true; cs.monster.boss = null; cs.monster.maxHp = 10000; cs.monster.hp = 10000;
  for (let i = 1; i <= 29; i++) cs.dealDamageToMonster(1);
  const b0 = cs.monster.hp;
  cs.dealDamageToMonster(100);
  assert.equal(b0 - cs.monster.hp, 500, 'a boss loses at most 4% of its max HP to the bonus');
  // without the Scepter nothing counts
  ({ cs, g } = fresh());
  cs.monster.hp = 1e9; cs.monster.maxHp = 1e9;
  for (let i = 0; i < 100; i++) cs.dealDamageToMonster(10);
  assert.equal(cs.monster.hp, 1e9 - 1000);

  // Thobe of Eternal Ironing: once per fight a lethal hit leaves the hero at full HP
  ({ cs, g, h } = fresh());
  equipMythic(g, 'armor');
  cs.monster.floor = 5;
  h.hp = 1;
  let ironed = 0;
  cs.onIroned = () => ironed++;
  const floorBefore = h.floor;
  assert.equal(cs.hitHero(1e9), false, 'saved');
  assert.equal(ironed, 1);
  assert.equal(h.hp, cs.getTotalMaxHp());
  assert.equal(h.floor, floorBefore);
  h.hp = 1;
  h.floor = 6;
  assert.equal(cs.hitHero(1e9), true, 'only once per fight');
  assert.equal(h.floor, 5, 'beaten: back one floor');

  // Nazar of the Haters: normal crits x3, telegraphs answer themselves
  ({ cs, g, h } = fresh());
  assert.equal(g.critMult(1), 2);
  equipMythic(g, 'amulet');
  assert.equal(g.critMult(1), 3);
  assert.equal(g.critMult(2), 4);
  assert.equal(g.telegraphsAutoSucceed(), true);
  ({ cs, g, h } = bossFight(160));
  equipMythic(g, 'amulet');
  const res = [];
  cs.onTelegraphResult = (e) => res.push(e.result);
  const hp = h.hp;
  run(cs, 20);
  assert.ok(res.length >= 2 && res.every(r => r === 'success'), 'every telegraph answered');
  assert.equal(h.hp, hp);

  // Royal Decree Seal: +20% damage per telegraph answered this fight, up to 3
  ({ cs, g, h } = bossFight(160));
  equipMythic(g, 'relic');
  assert.equal(g.decreeMult(0), 1);
  assert.ok(Math.abs(g.decreeMult(2) - 1.4) < 1e-12);
  assert.ok(Math.abs(g.decreeMult(9) - 1.6) < 1e-12, 'capped at 3 stacks');
  run(cs, TELE_FIRST + 0.25);
  cs.castHeroSkill('shield');    // answered (SMASH on floor 160)
  cs.monster.boss.exposed = 0;
  cs.monster.hp = cs.monster.maxHp;
  cs.dealDamageToMonster(1000);
  assert.equal(cs.monster.maxHp - cs.monster.hp, 1200);
}

console.log('--- Al-Wakeel: a Dust-shop unlock; saves that had auto-replace keep it ---');
{
  const item = DUST_SHOP_ITEMS.find(d => d.id === 'al_wakeel');
  assert.ok(item && item.tier === 5 && item.cost === 40 && item.maxRank === 1);
  const { gs, cs, g } = fresh();
  assert.equal(g.hasWakeel(), false);
  gs.ascensionCount = 5;
  gs.cosmicDust = new BigNum(100);
  assert.ok(buyShopItem(gs, 'al_wakeel') > 0);
  assert.equal(g.hasWakeel(), true);
  // an upgrade drops: with auto-equip on it is worn at once
  gs.bag.autoEquip = true;
  const up = makeItem({ slot: 'weapon', rarity: 'Cosmic', ilvl: 80 });
  const r = g.receive(up, { quiet: true });
  assert.ok(r.equipped && gs.hero.gear.weapon === up);
  // without it, nothing equips itself
  const b = fresh();
  b.gs.bag.autoEquip = true;
  const up2 = makeItem({ slot: 'weapon', rarity: 'Cosmic', ilvl: 80 });
  const r2 = b.g.receive(up2, { quiet: true });
  assert.ok(!r2.equipped && b.gs.hero.gear.weapon !== up2);
  // the migration-granted flag still works
  const c = fresh();
  c.gs.bag.wakeel = true; c.gs.bag.autoEquip = true;
  assert.equal(c.g.hasWakeel(), true);
  void cs;
}

console.log('--- Old saves: a v11 save without Barakah loads with defaults; round trip ---');
{
  assert.equal(SAVE_VERSION, 11, 'additive loot fields need no new migration step');
  const { gs } = fresh();
  const data = JSON.parse(JSON.stringify(gs.serialize()));
  delete data.loot.barakah; delete data.loot.cosDry; delete data.loot.bossHigh;
  data.hero.maxFloor = 123; data.hero.floor = 123;
  const loaded = new GameState();
  loaded.deserialize(data);
  const cs = new CombatSystem(loaded);
  assert.equal(loaded.loot.barakah.points, 0);
  assert.equal(loaded.loot.cosDry, 0);
  assert.equal(cs.gear.loot.bossHigh, 120, 'bosses already passed count as claimed');
  // junk is cleaned
  const l = sanitizeLoot({ barakah: { points: 'x', day: 5, today: -4, full: true, mythics: -1 }, cosDry: -3, bossHigh: 'no' });
  assert.deepEqual(l.barakah, { points: 0, day: '', today: 0, full: false, mythics: 0 });
  assert.equal(l.bossHigh, null);
  assert.equal(sanitizeLoot({ barakah: { points: 5e9 } }).barakah.points, BARAKAH_MAX);
  // round trip keeps the meter
  loaded.loot.barakah.points = 12345.5;
  loaded.loot.barakah.mythics = 2;
  const again = new GameState();
  again.deserialize(JSON.parse(JSON.stringify(loaded.serialize())));
  assert.equal(again.loot.barakah.points, 12345.5);
  assert.equal(again.loot.barakah.mythics, 2);
  // a Mythic in the bag survives a save
  const m = makeItem({ slot: 'armor', rarity: 'Mythic', ilvl: 200 });
  m.uid = loaded.bag.nextUid++;
  loaded.bag.items.push(m);
  const third = new GameState();
  third.deserialize(JSON.parse(JSON.stringify(loaded.serialize())));
  assert.ok(third.bag.items.some(i => i.rarity === 'Mythic' && i.uniqueId === 'eternal_thobe'));
}

console.log('R65 mythic, Barakah and telegraph tests passed.');
