// Dig feature: the Big Rock. One guards the first row of every layer but the first. It is one block
// as wide as the ground, with its own hp and a glowing crack that moves; hits on the crack count more.
import { use, emit, run, fold, layersOf, BLOCKS, PARAMS } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';
import { COLS, VIEW_ROWS, LAYER, layerOf, dirtHp, dirtVal, setCell, chapter1BossHp } from '../../core/grid.js';
import { addCoins, coinMult, pickPower, canBuy, upgradeCost } from '../../core/rules.js';
import { canNewSite, starsFor, dealCards, roadIndex, FIXED } from '../sites/rules.js';
import { t } from '../../core/strings.js';
import strings from './strings.js';
import { SWING, swingEstimate, crewWorking, swingsLeft, friendly } from './swings.js';
export { friendly as bossFriendly } from './swings.js';

const p = {
  hp: 20,                         // Big Rock hp, in dirt blocks of its row
  layerHp: 0.5,                   // and this much more per layer
  pay: 120,                       // Big Rock coins, in dirt blocks of its row
  weakMult: 3, weakSeconds: 1.7,  // the crack: hits on it count 3 times, and it moves
  blastShare: 0.02, blastCap: 0.3, // a plain TNT blast that reaches a Rock takes this share of its bar (bigger blasts more); blasts take at most this share in all
  chainCap: 12,                   // a blast or a thrown thing does at most this many of your hits to a Big Rock
  // Rubble: at every tenth of the bar (1 to 9; the tenth is the break itself) the Rock sheds some.
  // In total the nine pay this many times the Rock's own break pay (0.5: half again; tuned so the first ten minutes move less than 15%).
  rubble: 0.5, tenths: 10,
  rubbleChest: 0.06,              // the chance that a tenth also drops a chest (about half a chest a Rock)
  rubbleBone: 0.18,               // and a bone (about one and a half a Rock)
  stuckWindow: 60, stuckShare: 0.1, stuckTries: 2, stuckIdle: 2,   // the hint: a minute of pick-on-Rock play that took under a tenth of its health, or the 2nd try of the level; the pick is "on it" for 2 s after a hit
  gateShare: 0.6, gateCap: 0.9,   // the Gate remembers: a try that does not finish banks this share of the damage it dealt; the bank never takes the Gate below 1 - cap of its health
  recordMin: 10,                  // a record under this many metres is not worth a banner
};

// ---------- the hint: when the Rock will not break, say what to do ----------
// Stuck = the Gate Rock of this level stands, you have hit it, and either the level has been tried twice, or a minute of play
// with the pick on it took less than a tenth of its health. Counted in play time (the step), never the clock outside play.
export function bossStuck(s) {
  const b = s.boss, r = s.run;
  if (!b || b.hp <= 0 || !r || r.done || b.row !== r.floor || !(b.you > 0)) return false;
  const st = s.road && s.road.stamps && s.road.stamps[r.key];
  return !!((st && st.n >= p.stuckTries) || b.slow);
}
// The best next step: { kind: 'spend' | 'side' | 'leave' | 'more', n } (n: the cost, the pay, or the Stars)
// How many swings of yours the Rock has left, and about how many seconds: { n, time: { n, unit }, raw, measured }
export function bossSwings(s, b = s.boss) {
  const dg = PARAMS.diggers || {}, share = fold('crewShare', s, dg.rafeeqShare === undefined ? 0.6 : dg.rafeeqShare);
  const est = swingEstimate(pickPower(s), share, crewWorking((s.diggers || []).length, dg.sieveEvery));
  return swingsLeft(Math.max(0, b.hp), b.sw, est);
}
// What the layer's law does to THIS Rock right now, so the bar can say it: null, or { kind, pct, r, c } with kind 'dark' | 'grow' | 'hot'
// (also 'lit' for the Black once a light is on) and (r, c) where the cure sits above the Rock (a lantern, a torch crate, water), if any.
// The laws answer through the `rockTell` mod (deep/rules.js), so this file knows no law.
export function bossTell(s, b = s.boss) {
  return b && b.hp > 0 ? fold('rockTell', s, null, b) : null;
}
export function bossAdvice(s) {
  // the next Pick step makes your hit x(step): say what that does to the Rock in the bar's own unit, your swings
  const b = s.boss, step = (PARAMS.starshop && PARAMS.starshop.step) || 1.5;
  const sw = b && b.hp > 0 ? bossSwings(s, b) : null;
  const hits = sw ? sw.n : 0, after = sw ? Math.min(Math.max(1, hits - 1), friendly(sw.raw / step)) : 0;
  const out = (kind, n) => ({ kind, n, hits, after });
  // the law first: a Rock in the dark, growing or hot is not a Pick problem while the cure is one block away
  const tell = bossTell(s, b);
  if (tell && tell.kind !== 'lit' && tell.r !== undefined) return { ...out(tell.kind, tell.pct || 0), cure: [tell.r, tell.c] };
  if (canBuy(s, 'tr_pick')) return out('spend', upgradeCost(s, 'tr_pick'));
  const need = upgradeCost(s, 'tr_pick') - s.stars;
  const side = dealCards(s).filter(c => c.kind !== 'fixed' && c.stars >= need).sort((a, b) => b.stars - a.stars)[0];
  if (side) return out('side', side.stars);
  if (canNewSite(s)) return out('leave', starsFor(s));
  return out('more', 0);
}

export const isBossRow = r => r > 0 && r % LAYER === 0;

function ensureBoss(s, r) {
  if (!s.boss || s.boss.row !== r) {
    const isGate = s.run ? r === s.run.floor : false;
    const isCh1 = s.run ? (s.run.ch === 1 && (roadIndex(s) < FIXED.length || s.run.floor <= 75)) : r <= 75;
    let base = dirtHp(r) * p.hp * (1 + p.layerHp * layerOf(r - 1));
    if (isCh1 && r <= 75 && typeof chapter1BossHp === 'function') {
      base = chapter1BossHp(r, isGate);
    }
    const hp = Math.round(fold('bossHp', s, base, r));
    s.boss = { row: r, hp, max: hp, weak: Math.floor(rnd() * COLS), wt: p.weakSeconds, rub: 0, you: 0, crew: 0 };
    gateOpen(s, s.boss);
  }
  return s.boss;
}

// ---------- the Gate remembers ----------
// The Gate Rock of a road level (learn or prove) that is not finished keeps part of the damage a try did, in the level's stamp
// (stamp.bank: the share of its health that is already cracked). The next try starts with the Gate cracked by the bank.
// Banked as the hits land (so closing the page loses nothing), by try, never by time. Not for replays, side levels or the deal.
function gateStamp(s, r) {
  const run = s.run;
  if (!run || run.twist || run.done || run.floor !== r || roadIndex(s) < FIXED.length) return null;
  const st = s.road && s.road.stamps && s.road.stamps[run.key];
  return st && !st.fin ? st : null;
}
function gateOpen(s, b) {
  const st = gateStamp(s, b.row);
  if (!st) return;
  b.gate = 1; b.dealt = 0;
  const bank = Math.max(0, Math.min(p.gateCap, st.bank || 0));
  b.bank0 = bank;
  if (bank > 0) { b.hp = Math.max(1, Math.round(b.max * (1 - bank))); b.rub = bossTenths(b); }   // no rubble paid again for the part already cracked
  const prevBest = st.gateBestPct || (s.run && s.run.gateBestPct) || 0;
  if (prevBest > 0) {
    b.gateBestPct = prevBest;
    if (s.run) s.run.gateBestPct = prevBest;
  }
  run('gateOpened', s, b);
}
function gateBank(s, b, done) {
  if (!b.gate || !(done > 0)) return;
  b.dealt += done;
  const pct = Math.max(0, Math.min(100, Math.round((1 - b.hp / b.max) * 100)));
  b.gateBestPct = Math.max(b.gateBestPct || 0, pct);
  if (s.run) s.run.gateBestPct = Math.max(s.run.gateBestPct || 0, pct);
  const st = s.road && s.road.stamps && s.road.stamps[s.run && s.run.key];
  if (st && !st.fin) {
    const share = fold('gateBankShare', s, p.gateShare);
    st.bank = Math.min(p.gateCap, b.bank0 + share * b.dealt / b.max);
    st.gateBestPct = Math.max(st.gateBestPct || 0, pct);
  }
}

// compute and record the deepest HP percentage damage achieved before a Gate try ended
export function recordGateFail(s) {
  const b = s.boss;
  if (!b || !b.gate || b.hp <= 0) return 0;
  const pct = Math.max(0, Math.min(100, Math.round((1 - b.hp / b.max) * 100)));
  b.gateBestPct = Math.max(b.gateBestPct || 0, pct);
  if (s.run) s.run.gateBestPct = Math.max(s.run.gateBestPct || 0, pct);
  const st = gateStamp(s, b.row);
  if (st) st.gateBestPct = Math.max(st.gateBestPct || 0, pct);
  return pct;
}
export const gateGhostX = (barWidth, pct) => barWidth * (pct / 100);

// what the Gate has cracked already (0 to 1) for the arrival line, and the leave line
export const bossGateBank = b => (b && b.gate && b.hp > 0 ? b.bank0 || 0 : 0);
// the share (in percent) of your damage the Gate keeps for next time, while it is being hit; 0 otherwise
export function bossGateKeepsPct(s) {
  const b = s.boss;
  const share = fold('gateBankShare', s, p.gateShare);
  return b && b.gate && b.hp > 0 && b.dealt > 0 && s.run && !s.run.done ? Math.round(share * 100) : 0;
}
export function bossGateKeeps(s) {
  const n = bossGateKeepsPct(s);
  return n ? t('gate_keeps', { n }) : '';
}
export function bossInView(s) {
  for (let i = 0; i < VIEW_ROWS; i++) if (isBossRow(s.top + i) && s.rows[i].some(x => x)) return ensureBoss(s, s.top + i);
  return null;
}

// How much of the bar is gone, in whole tenths (never the last one: that is the break).
export const bossTenths = b => Math.min(p.tenths - 1, Math.floor((1 - Math.max(0, b.hp) / b.max) * p.tenths + 1e-9));
// The Rock's pay for one tenth of rubble: scaled to the depth like the break pay. Nine of them add up to `rubble` times it.
export const rubblePay = (s, r, c) => dirtVal(r) * p.pay * p.rubble / (p.tenths - 1) * coinMult(s) * fold('rubbleMult', s, 1, r, c);
// Each tenth pays once per Rock: b.rub counts the ones paid, and the Rock is new for every dig.
function shed(s, r, b, c, src, ev) {
  const to = bossTenths(b);
  while ((b.rub || 0) < to) {
    b.rub = (b.rub || 0) + 1;
    const coins = Math.max(1, Math.round(rubblePay(s, r, c)));
    addCoins(s, coins, src);
    const d = { r, c, n: b.rub, coins, src, chest: 0, bone: 0 };
    if (typeof s.chests === 'number' && rnd() < p.rubbleChest) { s.chests++; d.chest = 1; }
    if (BLOCKS.fossil && rnd() < p.rubbleBone) {
      const before = s.coins;
      BLOCKS.fossil.broke(s, { r: r - 1, c, cell: null, t: 'fossil', B: BLOCKS.fossil, src, byHand: false, chain: 0, info: {}, coins: 0 }, ev);
      d.bone = 1; d.boneCoins = Math.round(s.coins - before);
    }
    emit(s, ev, 'rubble', d);
  }
}

function bossDown(s, r, src, ev) {
  const gs = s.boss && s.boss.gate && s.run ? s.road.stamps[s.run.key] : null;
  if (gs) { gs.bank = 0; delete gs.gateBestPct; } // the Gate is down: nothing left to remember
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
  version: 2,
  // v2: the Gate-memory lesson used to write seen['gate:<key>:<bank>'] once per try; it is one flag now ('gatemem'). Drop the old ones.
  migrate(s) { for (const k of Object.keys(s.seen || {})) if (/^gate:.*:\d+$/.test(k)) delete s.seen[k]; },
  state: {
    boss:       { init: () => null, perSite: true },   // { row, hp, max, weak, wt }
    bossesDown: { init: () => 0, perSite: true },
    // The record: the deepest metre ever, in any site (s.best is this site's). It survives New Site.
    // recMark is the record this dig started with (the flag in the ground); recPassed: the moment came.
    bestEver:   { init: () => 0, survives: ['site', 'land'] },
    recMark:    { init: () => -1, perSite: true },
    recPassed:  { init: () => false, perSite: true },
  },
  blocks: {
    // wall: blasts stop at it and spill-over hits do not pass it. damage(): it keeps its own hp.
    boss: { at: 120, hp: 1, val: 0, wall: true, damage(s, r, c, cell, dmg, src, ev, info) {
      const b = ensureBoss(s, r);
      if (b.hp <= 0) return false;
      // A blast, a thrown rock, a tool: strong by the ground's measure, so capped by yours. The Rock is
      // the wall of the pacing curve (docs/dig-pacing.md) and only your own strength brings it down.
      let blast = false;
      if (info.blast && dmg > 0) {                      // TNT: a share of the bar, so you see it; a cap per Rock, so TNT alone never skips it
        const room = Math.max(0, p.blastCap * b.max - (b.blasted || 0));
        dmg = Math.min(b.max * p.blastShare * info.blast, room, b.hp);
        if (!(dmg > 0)) return false;
        b.blasted = (b.blasted || 0) + dmg; blast = true;
      } else if (info.chain && !info.tool) dmg = Math.min(dmg, pickPower(s) * p.chainCap);   // a Forge tool is counted in your hits already
      const weak = (src === 'you' || src === 'crew') && c === b.weak;       // the glowing crack: aim for it
      if (weak) {
        const crackMult = fold('weakCrackMult', s, p.weakMult);
        dmg *= crackMult;
      }
      const done = Math.min(dmg, b.hp);                 // who did how much, for the two-colour bar
      if (src === 'you') { b.idle = 0; if (b.w0hp === undefined) b.w0hp = b.hp; }
      if (src === 'crew') b.crew = (b.crew || 0) + done; else b.you = (b.you || 0) + done;
      b.hp -= dmg;
      if (src === 'you' && !info.blast && !info.chain && !info.tool) {   // one of your swings: the rolling window of what the team does per swing
        (b.sw = b.sw || []).push({ t: b.clk || 0, d: (b.you || 0) + (b.crew || 0) });
        if (b.sw.length > SWING.keep) b.sw.shift();
      }
      gateBank(s, b, done);
      emit(s, ev, 'hit', { r, c, t: 'boss', dmg, src, crit: info.crit, weak, blast, share: dmg / b.max, frac: Math.max(0, b.hp / b.max) });
      if (b.hp <= 0) bossDown(s, r, src, ev); else shed(s, r, b, c, src, ev);
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
    step: [{ at: 301, fn(s, dt) {
      const b = bossInView(s);
      if (!b || b.hp <= 0 || b.w0hp === undefined) return;
      b.idle = (b.idle === undefined ? 99 : b.idle) + dt;
      if (b.idle > p.stuckIdle) return;                // the pick is not on it: no play time counts
      b.pt = (b.pt || 0) + dt;
      if (b.pt - (b.w0t || 0) >= p.stuckWindow) {
        if (b.w0hp - b.hp < p.stuckShare * b.max) b.slow = true;
        b.w0t = b.pt; b.w0hp = b.hp;
      }
    } }, { at: 305, fn(s, dt, ev) {
      if (s.recMark < 0) s.recMark = s.bestEver;                       // what this dig has to beat
      if (s.best > s.bestEver) {
        if (!s.recPassed && s.recMark >= p.recordMin && s.best > s.recMark) {
          s.recPassed = true;
          emit(s, ev, 'record', { n: s.best, old: s.recMark });
        }
        s.bestEver = s.best;
      }
    } }, { at: 300, fn(s, dt) {
      const b = bossInView(s);
      if (b && b.hp > 0) {
        b.clk = (b.clk || 0) + dt;
        if (b.sw && b.sw.length && b.clk - b.sw[b.sw.length - 1].t > SWING.stale) b.sw = [];
        b.wt = (b.wt === undefined ? p.weakSeconds : b.wt) - dt;
        if (b.wt <= 0) {
          b.wt = fold('crackSeconds', s, p.weakSeconds);
          let c; do { c = Math.floor(rnd() * COLS); } while (c === b.weak);
          b.weak = c;
        }
      }
    } }],
    // the view stops following the dig while a standing Big Rock is in the lower rows of the stage: the Rock stays down
    // there (the third row from the bottom), the dig above it stays on screen, and the two rows under it stay clear for
    // the tool buttons and the hint. It moves the picture only (a view rule).
    holdView(s) {
      for (let i = 0; i < VIEW_ROWS; i++) if (isBossRow(s.top + i) && s.rows[i].some(x => x)) return i <= VIEW_ROWS - 3;
      return false;
    },
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
