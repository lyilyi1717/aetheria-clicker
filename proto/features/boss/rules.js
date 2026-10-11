// Dig feature: the Big Rock. One guards the first row of every layer but the first. It is one block
// as wide as the ground, with its own hp and a glowing crack that moves; hits on the crack count more.
import { use, emit, run, layersOf } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';
import { COLS, VIEW_ROWS, LAYER, layerOf, dirtHp, dirtVal, setCell } from '../../core/grid.js';
import { addCoins, coinMult } from '../../core/rules.js';
import strings from './strings.js';

const p = {
  hp: 20,                         // Big Rock hp, in dirt blocks of its row
  layerHp: 0.25,                  // and this much more per layer
  pay: 120,                       // Big Rock coins, in dirt blocks of its row
  weakMult: 3, weakSeconds: 1.7,  // the crack: hits on it count 3 times, and it moves
};

export const isBossRow = r => r > 0 && r % LAYER === 0;

function ensureBoss(s, r) {
  if (!s.boss || s.boss.row !== r) {
    const hp = Math.round(dirtHp(r) * p.hp * (1 + p.layerHp * layerOf(r - 1)));
    s.boss = { row: r, hp, max: hp, weak: Math.floor(rnd() * COLS), wt: p.weakSeconds };
  }
  return s.boss;
}
export function bossInView(s) {
  for (let i = 0; i < VIEW_ROWS; i++) if (isBossRow(s.top + i) && s.rows[i].some(x => x)) return ensureBoss(s, s.top + i);
  return null;
}

function bossDown(s, r, src, ev) {
  const pay = Math.round(dirtVal(r) * p.pay * coinMult(s));
  addCoins(s, pay, src);
  s.bossesDown = Math.max(s.bossesDown, layerOf(r));
  run('bossDown', s, r);          // what else a broken Big Rock gives (a chest)
  for (let c = 0; c < COLS; c++) setCell(s, r, c, null);
  if (r + 1 > s.best) s.best = r + 1;
  emit(s, ev, 'bossDown', { r, coins: pay, layer: layerOf(r) });
}

export const boss = use({
  id: 'boss',
  params: p,
  legacy: { bossHp: 'hp', bossPay: 'pay', weakMult: 'weakMult', weakSeconds: 'weakSeconds' },
  strings,
  state: {
    boss:       { init: () => null, perSite: true },   // { row, hp, max, weak, wt }
    bossesDown: { init: () => 0, perSite: true },
  },
  blocks: {
    // wall: blasts stop at it and spill-over hits do not pass it. damage(): it keeps its own hp.
    boss: { at: 120, hp: 1, val: 0, wall: true, damage(s, r, c, cell, dmg, src, ev, info) {
      const b = ensureBoss(s, r);
      if (b.hp <= 0) return false;
      const weak = src === 'you' && c === b.weak;       // the glowing crack: aim for it
      if (weak) dmg *= p.weakMult;
      b.hp -= dmg;
      emit(s, ev, 'hit', { r, c, t: 'boss', dmg, src, crit: info.crit, weak, frac: Math.max(0, b.hp / b.max) });
      if (b.hp <= 0) bossDown(s, r, src, ev);
      return b.hp <= 0;
    } },
  },
  gen: { whole: [{ at: 10, fn(s, r) {
    if (!isBossRow(r)) return null;
    const row = [];
    for (let c = 0; c < COLS; c++) row.push({ t: 'boss', hp: 1, max: 1, s: c });
    return row;
  } }] },
  hooks: {
    step: { at: 300, fn(s, dt) {
      const b = bossInView(s);
      if (b && b.hp > 0) {
        b.wt = (b.wt === undefined ? p.weakSeconds : b.wt) - dt;
        if (b.wt <= 0) {
          b.wt = p.weakSeconds;
          let c; do { c = Math.floor(rnd() * COLS); } while (c === b.weak);
          b.weak = c;
        }
      }
    } },
    // the crew stops at a Big Rock and waits for you
    awayStop(s, r, out) {
      if (bossInView(s) || isBossRow(r + VIEW_ROWS - 2)) { out.atBoss = true; return true; }
      return false;
    },
  },
  unlocks: () => {
    const out = [];
    for (let i = 1; i < layersOf('desert').length; i++) out.push({ id: 'boss:L' + i, group: 'Big Rocks' });
    return out;
  },
  firsts: { bossDown: d => ['boss:L' + d.layer, 'type:boss'] },
});
