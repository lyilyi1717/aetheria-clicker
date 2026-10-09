// R64 gear wave 1: item model, drops and pity, the bag, re-temper, boss signatures, Kashta, the
// Void Cataclysm cap and the v10 -> v11 save migration.
// Run: node test_r64_gear.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { SpellSystem } from './js/systems/SpellSystem.js';
import {
  CombatSystem, GEAR_FLOOR_BASE, KASHTA_SECONDS, BOSS_TIMER_SECONDS, MONSTER_NAMES, gearStat
} from './js/systems/CombatSystem.js';
import {
  mainStat, makeItem, rollAffixes, sanitizeItem, sanitizeBag, affixTotals, signatureForBoss, UNIQUES, AFFIXES,
  LEGENDARY_PITY, MOB_DROP_CHANCE, withItemLevel, RARITY_NAMES
} from './js/systems/gearItems.js';
import { migrateSave, MIGRATIONS, SAVE_VERSION } from './js/engine/migrations.js';
import { particles } from './js/engine/ParticleEngine.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
particles.suppressed = true;

const clone = o => JSON.parse(JSON.stringify(o));
const fresh = () => {
  const gs = new GameState();
  const cs = new CombatSystem(gs);
  gs.combatSystem = cs;
  return { gs, cs, g: cs.gear, h: gs.hero };
};
// Math.random from a list (then the last value for ever)
function withRandom(values, fn) {
  const orig = Math.random;
  let i = 0;
  Math.random = () => values[Math.min(i++, values.length - 1)];
  try { return fn(); } finally { Math.random = orig; }
}
// Put an item straight into a slot / the bag
const give = (g, opts) => { const it = makeItem(opts); it.uid = g.bag.nextUid++; g.bag.items.push(it); return it; };

console.log('--- item model: rarity multipliers 1/2/3/4/5, bounded Amulet and Relic ---');
{
  const base = Math.pow(GEAR_FLOOR_BASE, 99);
  assert.equal(mainStat('weapon', 'Common', 100).attack, Math.floor(10 * base));
  assert.equal(mainStat('weapon', 'Rare', 100).attack, Math.floor(10 * base * 2));
  assert.equal(mainStat('weapon', 'Epic', 100).attack, Math.floor(10 * base * 3));
  assert.equal(mainStat('armor', 'Legendary', 100).hp, Math.floor(40 * base * 4));
  assert.equal(mainStat('armor', 'Cosmic', 100).hp, Math.floor(40 * base * 5));
  assert.ok(Math.abs(mainStat('amulet', 'Epic', 100).crit - (0.05 + 0.10 + 0.02)) < 1e-12);
  assert.equal(mainStat('amulet', 'Cosmic', 5000).crit, 0.5, 'crit capped');
  assert.equal(mainStat('relic', 'Cosmic', 9e5).lifesteal, 0.3, 'drain capped');
  // Power does not blow up at absurd item levels
  assert.ok(Number.isFinite(mainStat('weapon', 'Cosmic', 9e6).attack));
}

console.log('--- affixes: count by rarity, one of each, value = roll x tier ---');
{
  const want = { Common: 0, Rare: 1, Epic: 2, Legendary: 2, Cosmic: 3, Mythic: 3 };
  for (const r of RARITY_NAMES) {
    for (let i = 0; i < 40; i++) {
      const list = rollAffixes(r);
      assert.equal(list.length, want[r]);
      assert.equal(new Set(list.map(a => a.id)).size, list.length, 'no duplicate affix');
    }
  }
  const tier = { Rare: 1, Epic: 2, Legendary: 3, Cosmic: 4 };
  for (const r of Object.keys(tier)) {
    for (const a of rollAffixes(r, () => 0)) assert.ok(Math.abs(a.v - AFFIXES[a.id].lo * tier[r]) < 1e-3, 'lowest roll');
    for (const a of rollAffixes(r, () => 0.999999)) assert.ok(a.v <= AFFIXES[a.id].hi * tier[r] + 1e-9, 'highest roll');
  }
  // Sums over the kit are capped
  const gear = { weapon: { affixes: [{ id: 'might', v: 0.9 }] }, armor: { affixes: [{ id: 'might', v: 0.9 }] } };
  assert.equal(affixTotals(gear).might, AFFIXES.might.cap);
}

console.log('--- sanitize: junk items and bags do not throw ---');
{
  assert.equal(sanitizeItem(null), null);
  assert.equal(sanitizeItem({ rarity: 'Cosmic' }), null, 'no slot');
  const it = sanitizeItem({ slot: 'weapon', rarity: 'Mythic?', ilvl: 'x', attack: -5, affixes: [{ id: 'nope', v: 1 }, { id: 'might', v: 'z' }], uniqueId: 'rukbah_can' }, 'weapon', 7);
  assert.equal(it.rarity, 'Common');
  assert.equal(it.ilvl, 7);
  assert.ok(it.attack > 0);
  assert.deepEqual(it.affixes, []);
  assert.equal(it.uniqueId, null, 'a unique in the wrong slot is dropped');
  const bag = sanitizeBag({ cap: 999, items: [{ slot: 'relic', rarity: 'Rare', uid: 5 }, { slot: 'relic', uid: 5 }, 'x', null], autoSalvage: 'bogus', wakeel: 1 });
  assert.equal(bag.cap, 60);
  assert.equal(bag.items.length, 2);
  assert.notEqual(bag.items[0].uid, bag.items[1].uid, 'duplicate uids are fixed');
  assert.equal(bag.autoSalvage, 'Common');
  assert.equal(bag.wakeel, false);
}

console.log('--- drops: 8% per kill, boss always, rarity table, boss +5 ilvl ---');
{
  const { gs, cs, g } = fresh();
  assert.equal(MOB_DROP_CHANCE, 0.08);
  // drop roll 0.079 passes, 0.081 does not
  assert.ok(g.rollDrop(50, false, () => 0.079));
  assert.equal(g.rollDrop(50, false, () => 0.081), null);
  // Rarity: roll sequences [drop, rarity, slot, ...]
  const seq = (...v) => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };
  assert.equal(g.rollDrop(50, false, seq(0, 0.99, 0)).item.rarity, 'Common');
  assert.equal(g.rollDrop(50, false, seq(0, 0.10, 0)).item.rarity, 'Rare');       // 10 < 24
  assert.equal(g.rollDrop(50, false, seq(0, 0.27, 0)).item.rarity, 'Epic');       // 27 in [24, 29.7)
  assert.equal(g.rollDrop(50, false, seq(0, 0.2985, 0)).item.rarity, 'Legendary');
  assert.equal(g.rollDrop(50, false, seq(0, 0.29975, 0)).item.rarity, 'Cosmic');
  // Boss: guaranteed, ilvl floor+5, never Common, a Core and a Token every time
  gs.inventory.voidCores = 0; gs.inventory.bossTokens = 0;
  const b = g.rollDrop(100, true, seq(0.99, 0.2, 0));
  assert.equal(b.item.ilvl, 105);
  assert.notEqual(b.item.rarity, 'Common');
  assert.equal(gs.inventory.voidCores >= 1 && gs.inventory.bossTokens === 1, true);
  void cs;
}

console.log('--- Fortune raises the drop chance, capped at +100% ---');
{
  const { gs, g, h } = fresh();
  assert.equal(g.getFortune(), 0);
  gs.talents.loot_fortune = { rank: 2 };
  assert.ok(Math.abs(g.getFortune() - 0.3) < 1e-12);
  h.gear.relic.affixes = [{ id: 'fortune', v: 0.9 }];
  assert.equal(g.getFortune(), 1, 'capped');
  // 0.12 would miss at 8% but passes at 16%
  assert.ok(g.rollDrop(50, false, () => 0.12));
}

console.log('--- Legendary pity at 600 drops ---');
{
  const { gs, g } = fresh();
  gs.bag.autoSalvage = 'Epic';
  let n = 0;
  const rng = () => 0;    // roll 0: drop, then "Rare"
  gs.loot.legDry = LEGENDARY_PITY - 1;
  const r1 = g.rollDrop(80, false, (() => { let i = 0; return () => [0, 0.5, 0][Math.min(i++, 2)]; })());
  assert.notEqual(r1.item.rarity, 'Legendary');
  assert.equal(gs.loot.legDry, LEGENDARY_PITY);
  const r2 = g.rollDrop(80, false, (() => { let i = 0; return () => [0, 0.5, 0][Math.min(i++, 2)]; })());
  assert.equal(r2.item.rarity, 'Legendary', 'the 601st drop is Legendary');
  assert.equal(gs.loot.legDry, 0);
  void n; void rng;
}

console.log('--- boss signatures ---');
{
  const { g } = fresh();
  assert.equal(signatureForBoss('Rukbah Soda'), 'rukbah_can');
  assert.equal(signatureForBoss('Desert Dhabb'), null);
  // Every boss floor 10..60 maps to a distinct signature in the right slot
  const seen = new Set();
  for (let f = 10; f <= 60; f += 10) {
    const id = signatureForBoss(MONSTER_NAMES[(f - 1) % MONSTER_NAMES.length]);
    assert.ok(id, `floor ${f} has a signature`);
    seen.add(id);
  }
  assert.equal(seen.size, 6);
  // Floor 10 boss: Legendary roll, then the 50% signature roll passes
  const seq = (...v) => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };
  // Rolls: [drop chance (boss: always), rarity, slot, signature]. Boss table: Rare 50, Epic 38,
  // Legendary 10 -> a rarity roll of 0.90 is Legendary (88..98)
  const rare = g.rollDrop(10, true, seq(0, 0.2, 0, 0.1)).item;
  assert.equal(rare.rarity, 'Rare');
  assert.equal(rare.uniqueId, null, 'only Legendaries can be signatures');
  const leg = g.rollDrop(10, true, seq(0, 0.90, 0.1, 0.9)).item;
  assert.equal(leg.rarity, 'Legendary');
  assert.equal(leg.uniqueId, null, 'the 50% signature roll failed');
  const sig2 = g.rollDrop(10, true, seq(0, 0.90, 0.1, 0.2)).item;
  assert.equal(sig2.uniqueId, 'rukbah_can');
  assert.equal(sig2.slot, 'relic');
  assert.equal(sig2.rarity, 'Legendary');
  assert.equal(sig2.ilvl, 15);
  assert.equal(UNIQUES[sig2.uniqueId].slot, sig2.slot);
}

console.log('--- the bag: auto-salvage, upgrades stay, nothing equips itself ---');
{
  const { gs, g, h } = fresh();
  gs.inventory.gearScrap = 0;
  // A Common at floor 1 is no upgrade over the starter kit -> salvaged for 1 Bone
  const junk = makeItem({ slot: 'weapon', rarity: 'Common', ilvl: 1 });
  junk.attack = 1;
  const r = g.receive(junk);
  assert.equal(r.kept, false);
  assert.equal(gs.inventory.gearScrap, 1);
  assert.equal(gs.loot.salvaged, 1);
  // An upgrade stays, however common
  const up = makeItem({ slot: 'weapon', rarity: 'Common', ilvl: 50 });
  assert.equal(g.receive(up).kept, true);
  assert.equal(gs.bag.items.length, 1);
  assert.equal(h.gear.weapon.name, 'Rusty Shortsword', 'not equipped automatically');
  // Auto-salvage off keeps a non-upgrade
  gs.bag.autoSalvage = 'Off';
  const keep = makeItem({ slot: 'armor', rarity: 'Common', ilvl: 1 });
  keep.hp = 1;
  assert.equal(g.receive(keep).kept, true);
  // Legendary+ is never auto-salvaged
  gs.bag.autoSalvage = 'Epic';
  const leg = makeItem({ slot: 'amulet', rarity: 'Legendary', ilvl: 1 });
  leg.crit = 0;
  assert.equal(g.receive(leg).kept, true);
}

console.log('--- equip: swap, equipBest ---');
{
  const { gs, g, h } = fresh();
  const w = give(g, { slot: 'weapon', rarity: 'Rare', ilvl: 60 });
  const old = h.gear.weapon;
  assert.ok(g.ratingDelta(w) > 0, 'a floor-60 Rare beats the starter sword');
  assert.ok(g.equip(w.uid));
  assert.equal(h.gear.weapon, w);
  assert.ok(gs.bag.items.includes(old), 'old weapon is in the bag');
  assert.equal(g.equip(99999), false);
  // equipBest equips each upgrade
  give(g, { slot: 'armor', rarity: 'Epic', ilvl: 70 });
  give(g, { slot: 'amulet', rarity: 'Rare', ilvl: 70 });
  assert.equal(g.equipBest(), 2);
  assert.equal(g.equipBest(), 0);
  assert.equal(h.gear.armor.rarity, 'Epic');
}

console.log('--- rating: HP counts for more than Attack (the idle wall is survival) ---');
{
  const { g, h } = fresh();
  const base = mainStat('weapon', 'Common', 40).attack;
  // Same-sized swing in each stat: ATK x3 vs HP x3 -> HP is worth more
  const wpn = makeItem({ slot: 'weapon', rarity: 'Common', ilvl: 40 }); wpn.attack = Math.floor(h.baseAttack * 2 + 5 * 3 * 1);   // gentle
  const dAtk = (() => { const w = { ...makeItem({ slot: 'weapon', rarity: 'Common', ilvl: 1 }), attack: 5 + 3 * (h.baseAttack + 5 - 5) * 2 }; return g.ratingDelta(w); })();
  const dHp = (() => { const a = { ...makeItem({ slot: 'armor', rarity: 'Common', ilvl: 1 }), hp: 20 + 3 * (h.maxHp + 20) * 2 }; return g.ratingDelta(a); })();
  assert.ok(dHp > dAtk, `HP swing ${dHp} should beat the Attack swing ${dAtk}`);
  void base; void wpn;
}

console.log('--- salvage, sell, lock, bulk ---');
{
  const { gs, g } = fresh();
  gs.inventory.gearScrap = 0; gs.inventory.voidCores = 0;
  gs.gold = new BigNum(0);
  const epic = give(g, { slot: 'relic', rarity: 'Epic', ilvl: 1 }); epic.lifesteal = 0.001;
  const leg = give(g, { slot: 'relic', rarity: 'Legendary', ilvl: 1 }); leg.lifesteal = 0.001;
  assert.deepEqual(g.salvage(epic.uid), { scrap: 4, cores: 1 });
  assert.equal(gs.inventory.gearScrap, 4);
  assert.equal(gs.inventory.voidCores, 1);
  g.toggleLock(leg.uid);
  assert.equal(g.salvage(leg.uid), null, 'locked items cannot be salvaged');
  assert.equal(g.sell(leg.uid), null, 'or sold');
  g.toggleLock(leg.uid);
  const gold = g.sellValue(leg);
  assert.ok(gold.gte(new BigNum(0.5)));
  assert.ok(g.sell(leg.uid));
  assert.ok(gs.gold.gte(gold));
  // Bulk: unlocked, non-upgrade, up to Epic; Legendary never goes in bulk
  gs.bag.items.length = 0;
  const a = give(g, { slot: 'weapon', rarity: 'Common', ilvl: 1 }); a.attack = 1;
  const b = give(g, { slot: 'weapon', rarity: 'Rare', ilvl: 1 }); b.attack = 1; b.locked = true;
  const c = give(g, { slot: 'weapon', rarity: 'Legendary', ilvl: 1 }); c.attack = 1;
  const preview = g.salvageBulk('Epic', false);
  assert.equal(preview.count, 1);
  assert.equal(gs.bag.items.length, 3, 'a preview changes nothing');
  g.salvageBulk('Epic', true);
  assert.deepEqual(gs.bag.items.map(i => i.uid).sort(), [b.uid, c.uid].sort());
}

console.log('--- bag full: worst is salvaged, Legendary protected, toast not silent ---');
{
  const { gs, g } = fresh();
  gs.bag.autoSalvage = 'Off';
  gs.inventory.gearScrap = 0;
  for (let i = 0; i < gs.bag.cap; i++) { const it = give(g, { slot: 'armor', rarity: 'Rare', ilvl: 1 }); it.hp = 1; }
  assert.equal(gs.bag.items.length, 30);
  // A worse (Common non-upgrade) incoming item is the one salvaged
  const worst = makeItem({ slot: 'armor', rarity: 'Common', ilvl: 1 }); worst.hp = 1;
  const r = g.receive(worst);
  assert.equal(r.kept, false);
  assert.equal(gs.bag.items.length, 30);
  assert.equal(gs.inventory.gearScrap, 1);
  // A Legendary arrives: the oldest unlocked non-Legendary goes
  const oldest = gs.bag.items[0];
  const leg = makeItem({ slot: 'armor', rarity: 'Legendary', ilvl: 1 }); leg.hp = 1;
  assert.equal(g.receive(leg).kept, true);
  assert.equal(gs.bag.items.length, 30);
  assert.ok(!gs.bag.items.includes(oldest));
  assert.ok(gs.bag.items.includes(leg));
  // Everything locked: the incoming item is salvaged, never a silent loss
  for (const it of gs.bag.items) it.locked = true;
  const leg2 = makeItem({ slot: 'armor', rarity: 'Cosmic', ilvl: 1 }); leg2.hp = 1;
  const before = gs.inventory.gearScrap;
  assert.equal(g.receive(leg2).kept, false);
  assert.ok(gs.inventory.gearScrap > before);
}

console.log('--- re-temper: Legendary+ only, gold + Void Cores, heirloom is free ---');
{
  const { gs, g, h } = fresh();
  h.maxFloor = 400; h.indexFloor = 400;
  const rare = give(g, { slot: 'weapon', rarity: 'Rare', ilvl: 10 });
  assert.equal(g.retemperInfo(rare).eligible, false);
  const leg = give(g, { slot: 'weapon', rarity: 'Legendary', ilvl: 100 });
  const info = g.retemperInfo(leg);
  assert.ok(info.eligible);
  assert.equal(info.target, 399, 'brought to the Index floor - 1');
  assert.equal(info.cores, 2);
  gs.gold = new BigNum(0); gs.inventory.voidCores = 5;
  assert.equal(info.canAfford, false);
  assert.equal(g.retemper(leg.uid), false, 'cannot afford');
  gs.gold = info.gold.mul(2).add(1);
  assert.ok(g.retemper(leg.uid));
  assert.equal(leg.ilvl, 399);
  assert.equal(leg.attack, mainStat('weapon', 'Legendary', 399).attack);
  assert.equal(gs.inventory.voidCores, 3);
  assert.equal(g.retemperInfo(leg).eligible, false, 'already current');
  // Cost grows with the gap: the same gold per kill, sqrt(levels) factor
  const cosmic = give(g, { slot: 'armor', rarity: 'Cosmic', ilvl: 399 - 100 });
  const far = give(g, { slot: 'armor', rarity: 'Cosmic', ilvl: 399 - 400 + 1 });
  assert.ok(g.retemperInfo(far).gold.gt(g.retemperInfo(cosmic).gold));
  assert.equal(g.retemperInfo(cosmic).cores, 4);
  // Heirloom free re-temper
  const heir = give(g, { slot: 'armor', rarity: 'Legendary', ilvl: 50 }); heir.freeTemper = true;
  gs.gold = new BigNum(0); gs.inventory.voidCores = 0;
  assert.ok(g.retemperInfo(heir).free && g.retemperInfo(heir).canAfford);
  assert.ok(g.retemper(heir.uid));
  assert.equal(heir.freeTemper, undefined);
  assert.equal(heir.ilvl, 399);
  // An equipped item can be re-tempered in place
  const eq = h.gear.weapon; Object.assign(eq, { rarity: 'Legendary', ilvl: 10 });
  gs.gold = new BigNum(1e60); gs.inventory.voidCores = 9;
  assert.ok(g.retemper(eq.uid));
  assert.equal(h.gear.weapon.ilvl, 399);
  assert.equal(withItemLevel(eq, 5).ilvl, 5);
}

console.log('--- affixes feed Attack, Max HP, crit, gold ---');
{
  const { cs, h, g } = fresh();
  const atk0 = cs.getTotalAttack(), hp0 = cs.getTotalMaxHp();
  h.gear.weapon.affixes = [{ id: 'might', v: 0.5 }];
  h.gear.armor.affixes = [{ id: 'vigor', v: 0.5 }];
  assert.equal(cs.getTotalAttack(), Math.floor(atk0 * 1.5));
  assert.equal(cs.getTotalMaxHp(), Math.floor(hp0 * 1.5));
  h.gear.amulet.affixes = [{ id: 'precision', v: 0.3 }];
  assert.ok(Math.abs(g.critMult(1) - 2.3) < 1e-12);
  assert.ok(Math.abs(g.critMult(2) - 4.3) < 1e-12);
  assert.equal(g.critMult(0), 1);
  h.gear.relic.affixes = [{ id: 'slayer', v: 0.4 }];
  cs.monster.isBoss = true; cs.monster.hp = 1000; cs.monster.maxHp = 1000;
  cs.dealDamageToMonster(100);
  assert.equal(cs.monster.hp, 1000 - 140, 'Slayer: +40% to bosses');
  cs.monster.isBoss = false; cs.monster.hp = 1000;
  cs.dealDamageToMonster(100);
  assert.equal(cs.monster.hp, 900, 'but not to ordinary monsters');
}

console.log('--- boss signatures: effects ---');
{
  const { cs, h, g } = fresh();
  const put = (id, slot) => { h.gear[slot] = { ...makeItem({ slot, rarity: 'Legendary', ilvl: 50, uniqueId: id }), affixes: [], uid: 900 + slot.length }; };
  // Wasta Stamp: boss timers +5 s
  put('wasta_stamp', 'amulet');
  h.floor = 10; cs.initMonster();
  assert.equal(cs.monster.timer, BOSS_TIMER_SECONDS + 5);
  // Camry Door Buckler: the first monster hit of a fight is blocked
  put('camry_buckler', 'armor');
  h.floor = 3; cs.initMonster();
  assert.equal(cs.monster.blocksFirstHit, true);
  h.hp = cs.getTotalMaxHp(); cs.monster.attackCooldown = 0;
  const hp = h.hp;
  cs.update(0.01);
  assert.equal(h.hp >= hp - 1, true, 'first hit blocked');
  assert.equal(cs.monster.blocksFirstHit, false);
  // Sacred Fanila: +20% Max HP
  put('sacred_fanila', 'armor');
  const withFanila = cs.getTotalMaxHp();
  h.gear.armor.uniqueId = null;
  assert.equal(withFanila, Math.floor(cs.getTotalMaxHp() * 1.2));
  put('sacred_fanila', 'armor');
  // Ladle: kills stack +2% Attack
  put('kabsa_ladle', 'weapon');
  const a0 = cs.getTotalAttack();
  g.onKill(); g.onKill();
  assert.ok(cs.getTotalAttack() > a0 * 1.03 && cs.getTotalAttack() <= a0 * 1.05);
  for (let i = 0; i < 30; i++) g.onKill();
  assert.ok(cs.getTotalAttack() <= Math.floor(a0 * 1.2) + 1, 'stacks cap at 10');
  g.tick(25);
  assert.equal(cs.getTotalAttack(), a0, 'stacks expire after 20 s');
  // Stick of Discipline: +25% to bosses
  put('stick_of_discipline', 'weapon');
  assert.ok(Math.abs(g.bossDamageMult() - 1.25) < 1e-12);
  // Rukbah Can: lifesteal overheal becomes Shield
  put('rukbah_can', 'relic');
  h.gear.relic.lifesteal = 0.3;
  h.shield = 0; h.hp = cs.getTotalMaxHp();
  cs.monster.isBoss = false; cs.monster.hp = 1e9; cs.monster.maxHp = 1e9;
  cs.dealDamageToMonster(1000);
  assert.ok(h.shield > 0 && h.shield <= cs.getTotalMaxHp() * 0.25 + 1);
}

console.log('--- Void Cataclysm: capped at 10 x Attack in the Tower ---');
{
  const { gs, cs } = fresh();
  const spells = new SpellSystem(gs, {});
  gs.combatSystem = cs;
  gs.mana = 1e6;
  cs.monster.hp = cs.monster.maxHp = 1e15;
  const atk = cs.getTotalAttack();
  const before = cs.monster.hp;
  assert.ok(spells.castSpell('void_strike'));
  const dealt = before - cs.monster.hp;
  assert.equal(dealt, 10 * atk, `capped at 10 x Attack (${atk}), dealt ${dealt}`);
  // A weak monster still takes only its 40%
  gs.spells.void_strike.cd = 0;
  cs.monster.hp = cs.monster.maxHp = 100;
  spells.castSpell('void_strike');
  assert.equal(cs.monster.hp <= 60, true);
}

console.log('--- Kashta: camp after two losses, never on a boss floor, retry after 5 min ---');
{
  const { gs, cs, h } = fresh();
  h.floor = 41; cs.initMonster();
  cs.retreatFrom(41);
  assert.equal(h.floor, 40, 'first loss: one floor back');
  assert.equal(cs.kashta.active, false);
  h.floor = 41; cs.initMonster();
  cs.retreatFrom(41);
  assert.equal(cs.kashta.active, true, 'second loss at the same gate starts a camp');
  assert.equal(h.floor, 39, 'floor 40 is a boss floor: camp one lower');
  assert.equal(cs.kashta.gate, 41);
  // A kill in camp keeps the floor
  cs.dealDamageToMonster(cs.monster.maxHp + 1);
  assert.equal(h.floor, 39);
  // Dying in camp steps down but skips boss floors, and stays camping
  h.floor = 39; cs.retreatFrom(39);
  assert.equal(cs.kashta.active, true);
  assert.equal(h.floor, 38);
  // The camp ends after five minutes and retries the gate
  h.hp = 1e300; cs.getTotalAttack = () => 1;
  for (let t = 0; t < KASHTA_SECONDS - 1; t++) cs.tickKashta(1);
  assert.equal(cs.kashta.active, true);
  cs.tickKashta(2);
  assert.equal(cs.kashta.active, false);
  assert.equal(h.floor, 41, 'back at the gate');
  // Different floors in a row are not "the same gate"
  const k = cs.kashta;
  k.fails = 0; k.lastFail = 0;
  cs.retreatFrom(60); h.floor = 59; cs.retreatFrom(59);
  assert.equal(cs.kashta.active, false);
  // Auto camping can be switched off; manual camp still works and is endless
  gs.settings.kashtaAuto = false;
  cs.retreatFrom(70); cs.retreatFrom(70);
  assert.equal(cs.kashta.active, false);
  h.floor = 70; cs.initMonster();
  assert.ok(cs.toggleKashta());
  assert.equal(cs.kashta.active && cs.kashta.manual, true);
  assert.equal(h.floor, 69, 'a boss floor camps one below');
  cs.tickKashta(1e6);
  assert.equal(cs.kashta.active, true, 'a manual camp does not time out');
  assert.ok(cs.toggleKashta());
  assert.equal(h.floor, 70);
  // Never below the minimum floor
  gs.settings.kashtaAuto = true;
  h.floor = 5; cs.retreatFrom(5); cs.retreatFrom(5);
  assert.equal(cs.kashta.active, false);
}

console.log('--- migration v10 -> v11: gear becomes items, Heirlooms, Welcome Bag, levels kept ---');
{
  assert.ok(MIGRATIONS.some(s => s.to === 11));
  assert.equal(SAVE_VERSION >= 11, true);
  const oldHero = () => ({
    level: 40, xp: 0, xpNeeded: 1e9, floor: 350, maxFloor: 400, indexFloor: 350, hp: 1e9, maxHp: 100, hpRegen: 3,
    baseAttack: 15, attackCooldown: 0, attackSpeed: 1, shield: 0, aetherForgeLevel: 12,
    gear: {
      weapon: { name: 'Cosmic WEAPON', attack: Math.floor(10 * 18 * Math.pow(1.11, 299)), rarity: 'Cosmic', level: 12 },
      armor: { name: 'Legendary ARMOR', hp: Math.floor(40 * 8 * Math.pow(1.11, 199)), rarity: 'Legendary', level: 4 },
      amulet: { name: 'Epic AMULET', crit: 0.5, rarity: 'Epic', level: 0 },
      relic: { name: 'Ancient Shard', lifesteal: 0.02, rarity: 'Common', level: 0 }
    },
    skills: { strike: { name: 'Heavy Strike', cd: 0, maxCd: 4, dmgMult: 2.5 } }
  });
  const v10 = () => ({ version: 10, savedAt: 1760000000000, aether: { m: 1, e: 30 }, gold: { m: 1, e: 46 }, hero: oldHero(), inventory: { monsterBones: 50, voidCores: 2 } });
  const data = migrateSave(v10());
  assert.equal(data.version, SAVE_VERSION);
  const w = data.hero.gear.weapon, a = data.hero.gear.armor, am = data.hero.gear.amulet, rel = data.hero.gear.relic;
  assert.equal(w.rarity, 'Cosmic');
  assert.ok(Math.abs(w.ilvl - 300) <= 1, `ilvl inferred from the old stat: ${w.ilvl}`);
  // no power lost: the old effective stat (level bonus included) is kept exactly
  assert.equal(w.attack, Math.floor(10 * 18 * Math.pow(1.11, 299)) * 1.48);
  assert.equal(w.keep, w.attack);
  assert.equal(w.bake, 1.48);
  assert.equal(w.level, undefined, 'gear levels are gone');
  assert.equal(a.hp, Math.floor(40 * 8 * Math.pow(1.11, 199)) * 1.16);
  assert.equal(w.heirloom, true);
  assert.equal(w.affixes.length, 1, 'Heirloom: one affix');
  assert.equal(w.freeTemper, true, 'Legendary+ get a free re-temper');
  assert.equal(a.freeTemper, true);
  assert.equal(am.heirloom, true);
  assert.equal(am.freeTemper, undefined, 'Epic does not');
  assert.equal(am.ilvl, 400, 'a capped Amulet reads as the record floor');
  assert.equal(rel.heirloom, undefined, 'the starter kit is left alone');
  assert.equal(rel.lifesteal, 0.02);
  assert.equal(data.hero.pendingFloorRebase, true);
  // Welcome Bag: one Rare per slot at the Index floor; Al-Wakeel for 301+; loot counters
  assert.equal(data.bag.items.length, 4);
  assert.deepEqual(data.bag.items.map(i => i.slot), ['weapon', 'armor', 'amulet', 'relic']);
  assert.ok(data.bag.items.every(i => i.rarity === 'Rare' && i.ilvl === 350 && i.affixes.length === 1));
  assert.equal(new Set([...data.bag.items.map(i => i.uid), w.uid, a.uid, am.uid, rel.uid]).size, 8, 'unique ids');
  assert.equal(data.bag.wakeel, true);
  assert.equal(data.bag.autoEquip, true);
  assert.equal(data.loot.legDry, 0);
  // Bones: spent 5*12*13 + 5*4*5 = 880 -> 88 scrap, plus 50 banked; none become extra items (880 < 1200)
  assert.equal(data.inventory.monsterBones, 0, 'bones are gone');
  assert.equal(data.inventory.gearScrap, 138);
  assert.equal(data.inventory.voidCores, 2);
  assert.deepEqual(data.loot.notice, { scrap: 138, items: 0, cores: 0 });
  // A fully levelled kit (30 on each slot = 18,600 bones) is capped at 8 Rare finds and 18 Cores
  const maxed = oldHero();
  for (const s of ['weapon', 'armor', 'amulet', 'relic']) maxed.gear[s].level = 30;
  const rich = migrateSave({ version: 10, hero: maxed, inventory: { monsterBones: 1000 } });
  assert.equal(rich.bag.items.length, 4 + 8);
  assert.equal(rich.inventory.gearScrap, 1860 + 1000);
  assert.equal(rich.inventory.voidCores, 18);
  assert.equal(rich.hero.gear.weapon.bake, 2.2);
  // A save that never levelled gets no notice
  const plain = migrateSave({ version: 10, hero: { ...oldHero(), gear: { ...oldHero().gear, weapon: { name: 'Rusty Shortsword', attack: 5, rarity: 'Common' } } } });
  void plain;

  // Loads into the game, rebases, round-trips unchanged
  const gs = new GameState();
  gs.deserialize(clone(v10()));
  const cs = new CombatSystem(gs);
  assert.equal(gs.hero.maxFloor, 400, 'record floor kept');
  assert.ok(gs.hero.floor >= 1 && gs.hero.floor <= 350);
  assert.equal(gs.bag.items.length, 4);
  assert.equal(gs.hero.gear.weapon.bake, 1.48);
  assert.equal(gs.hero.gear.weapon.level, undefined);
  assert.ok(cs.canClearBossFloor(gs.hero.floor));
  const out = clone(gs.serialize());
  const gs2 = new GameState();
  gs2.deserialize(clone(out));
  new CombatSystem(gs2);
  assert.deepEqual(clone(gs2.bag), clone(gs.bag), 'the bag round-trips');
  assert.deepEqual(clone(gs2.hero.gear), clone(gs.hero.gear), 'equipped items round-trip');
  assert.equal(gs2.hero.floor, gs.hero.floor, 'not rebased twice');

  // A save below 301 gets the bag but not Al-Wakeel
  const young = migrateSave({ version: 10, hero: { ...oldHero(), floor: 50, maxFloor: 60, indexFloor: 50 } });
  assert.equal(young.bag.wakeel, false);
  // Junk or missing gear does not throw; GearSystem fills the gap with a Common
  const junk = migrateSave({ version: 10, hero: { floor: 20, maxFloor: 20, gear: { weapon: { attack: 'x' }, armor: null } } });
  const gj = new GameState();
  gj.deserialize(clone(junk));
  const cj = new CombatSystem(gj);
  for (const s of ['weapon', 'armor', 'amulet', 'relic']) assert.ok(gj.hero.gear[s] && gj.hero.gear[s].uid > 0, `${s} filled`);
  void cj;
  assert.equal(migrateSave({ version: 10 }).bag.items.length, 4, 'no hero: still seeds the bag');
}

console.log('--- a fresh game and old saves without a bag load ---');
{
  const { gs } = fresh();
  assert.equal(gs.bag.items.length, 0);
  assert.equal(gs.bag.cap, 30);
  assert.ok(Object.values(gs.hero.gear).every(i => i.uid > 0 && i.slot));
  // A v10-shaped save with no bag/loot keys
  const gs2 = new GameState();
  gs2.deserialize({ version: SAVE_VERSION, hero: clone(gs.hero) });
  assert.equal(gs2.bag.items.length, 0);
  new CombatSystem(gs2);
}

console.log('--- migration loses no power: Legendary and Cosmic kits keep Attack, HP, crit and drain ---');
{
  const gearOf = (rarity, lv) => ({
    weapon: { name: rarity + ' WEAPON', attack: Math.floor(10 * (rarity === 'Cosmic' ? 18 : 8) * Math.pow(1.11, 399)), rarity, level: lv },
    armor: { name: rarity + ' ARMOR', hp: Math.floor(40 * (rarity === 'Cosmic' ? 18 : 8) * Math.pow(1.11, 399)), rarity, level: lv },
    amulet: { name: rarity + ' AMULET', crit: 0.5, rarity, level: lv },
    relic: { name: rarity + ' RELIC', lifesteal: 0.3, rarity, level: lv }
  });
  for (const rarity of ['Legendary', 'Cosmic']) {
    for (const lv of [0, 30]) {
      const hero = { level: 40, xp: 0, xpNeeded: 1e9, floor: 400, maxFloor: 400, indexFloor: 400, hp: 1e9, maxHp: 100, hpRegen: 3,
        baseAttack: 15, attackCooldown: 0, attackSpeed: 1, shield: 0, aetherForgeLevel: 0, gear: gearOf(rarity, lv), skills: {} };
      const save = () => ({ version: 10, hero: clone(hero) });
      const before = {
        attack: hero.gear.weapon.attack * (1 + 0.04 * lv), hp: hero.gear.armor.hp * (1 + 0.04 * lv),
        crit: Math.min(0.5, hero.gear.amulet.crit * (1 + 0.04 * lv)), drain: Math.min(0.3, hero.gear.relic.lifesteal * (1 + 0.04 * lv))
      };
      const gs = new GameState();
      gs.deserialize(clone(migrateSave(save())));
      const g = gs.hero.gear;
      // Main stats are identical to the old effective stats (a Heirloom's bonus affix comes on top)
      assert.equal(gearStat('weapon', g.weapon), before.attack, rarity + ' attack ' + lv);
      assert.equal(gearStat('armor', g.armor), before.hp, rarity + ' hp ' + lv);
      assert.equal(gearStat('amulet', g.amulet), before.crit, rarity + ' crit ' + lv);
      assert.equal(gearStat('relic', g.relic), before.drain, rarity + ' drain ' + lv);
      // And a re-temper never takes an Heirloom below its preserved value
      const cs = new CombatSystem(gs);
      for (const slot of ['weapon', 'armor']) {
        const keep = gearStat(slot, g[slot]);
        cs.gear.retemper(g[slot].uid);
        assert.ok(gearStat(slot, g[slot]) >= keep, slot + ' not lowered by re-temper');
      }
    }
  }
}

console.log('--- the conversion notice shows once ---');
{
  const gs = new GameState();
  gs.deserialize(clone(migrateSave({ version: 10, hero: { floor: 20, maxFloor: 20, gear: { weapon: { name: 'Rare WEAPON', attack: 500, rarity: 'Rare', level: 10 } } }, inventory: { monsterBones: 30 } })));
  const cs = new CombatSystem(gs);
  assert.ok(gs.loot.notice && gs.loot.notice.scrap === 30 + 55);
  cs.gear.flushNotice();
  assert.equal(gs.loot.notice, null);
  assert.equal(clone(gs.serialize()).loot.notice, null, 'cleared in the save');
  // An old save that still carries the retired fields loads without complaint
  const old = new GameState();
  old.deserialize({ version: SAVE_VERSION, inventory: { monsterBones: 99 }, hero: { floor: 5, maxFloor: 5, gear: { weapon: { name: 'Rare WEAPON', attack: 50, rarity: 'Rare', level: 9 } } } });
  new CombatSystem(old);
  assert.equal(old.hero.gear.weapon.level, undefined);
}

console.log('test_r64_gear: OK');
