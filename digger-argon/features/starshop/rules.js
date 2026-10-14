// Dig feature: the Star tracks. Stars (paid at each New Site) give NOTHING until you spend them. You spend
// them on three tracks, one step at a time, in order inside a track; you choose the track:
//   The Pick  every step: your hit x1.5; a new pick material every 4 steps (stone, copper, bronze, iron, steel,
//             silver, gold, crystal, sky-iron, star); some steps bring a rule
//   The Camp  every step: the share of your hit a Rafeeq has goes up; the old Rafeeq perks are steps
//   The Bag   every step: coins x1.5; the old chest and luck perks are steps
// A step costs cost0 * costGrow^(steps you already have on that track): 2, 3, 5, 7, 10, 15, 23, 34, ...
// The 29 named steps (STARSHOP_STEPS) hold every perk the old Star Shop had, with every level.
// The old names stay as derived levels (starshopLevel(s, 'sp_eyes') ...) so other code and the page read them as before.
// A save from before gets every Star it ever earned back to spend (once, in `migrate`).
//
// Folds `crackSeconds` (boss), `crewWalk` (diggers) and `teaBreak` (foreman) for three of its steps. Exports:
//   starshopPunch(s)      0 none; 1, 2, 3 blocks of reach; Infinity: Punch-through (strength left over goes into the block below)
//   starshopCrackSlow(s)  true: the Big Rock's crack moves half as often (Crack Finder)
//   starshopFalling(s)    true: the first swing at a new site falls to the first Big Rock (Falling Star)
//   starshopShoes(s)      true: Rafeeqs walk twice as fast (Good Shoes)
//   starshopKettle(s)     true: the Foreman's tea break gives its rush with no sitting (Second Kettle)
import { use, emit, PARAMS, fold, RELICS, ITEMS } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';
import { COLS, VIEW_ROWS, LAYER, groundHp, dirtVal, shiftRow, layerOf, cellAt } from '../../core/grid.js';
import { coinMult, damage, pickPower, buy, grantFree } from '../../core/rules.js';
import { fmt, t } from '../../core/strings.js';
import '../shop/rules.js';
import { newRafeeq } from '../diggers/rules.js';
import strings from './strings.js';

const p = {
  step: 1.5,                                // every step of the Pick and Bag tracks: x1.5 (the Camp adds to the Rafeeq share instead)
  campShare: 0,                              // every Camp step: a Rafeeq's share of your hit, in points of 1 (0.05 = 5 points)
  cost0: 2, costGrow: 1.5,                  // the first step costs 2 Stars, each next one x1.5
  perMaterial: 4,                           // steps of The Pick per material
  chestRow: 3, boneRow: 5, oilRow: 7,       // how close to the surface (metres)
  warmFrac: [0.5, 0.7],                     // the share of your best pick level a new site starts with, by perk level
  giftChests: 1,                            // chests in your pocket per perk level
  cardsCap: 5,                              // a chest never shows more cards than this (Wide Hands + Pearl Eye + a prize)
  wholeCamp: 8,                             // Rafeeqs waiting with the camp's capstone
  heavyReach: 1,                            // Heavy Hand: a big hit also strikes this many blocks left and right
  oldFriend: 0.5,                           // the first Big Rock of a site starts with this share of its hp
  crackSlow: 2,                             // Crack Finder: the crack stays this many times longer
  shoes: 2,                                 // Good Shoes: Rafeeqs walk this many times faster
};

// track -> step number -> the rule that comes with it
export const STARSHOP_STEPS = {
  pick: { 1: 'punch1', 5: 'warm1', 9: 'punch2', 13: 'warm2', 17: 'crack', 21: 'punch3', 25: 'heavy', 29: 'punchAll', 33: 'old', 37: 'falling' },
  camp: { 1: 'head1', 2: 'head2', 3: 'head3', 5: 'wake', 7: 'shoes', 9: 'kettle', 12: 'whole' },
  bag:  { 1: 'map', 2: 'bone', 3: 'oil', 4: 'keep1', 5: 'gift1', 6: 'reroll', 7: 'keep2', 8: 'cards', 9: 'eyes', 10: 'gift2', 11: 'keep3', 14: 'pocket2' },
};
export const STARSHOP_TRACKS = ['pick', 'camp', 'bag'];
export const STARSHOP_MATERIALS = ['stone', 'copper', 'bronze', 'iron', 'steel', 'silver', 'gold', 'crystal', 'skyiron', 'star'];
// the old perk ids, as levels derived from steps: id -> { track, at: the steps of level 1, 2, 3 }
export const STARSHOP_PERKS = {
  sp_head:    { track: 'camp', at: [1, 2, 3] },
  sp_keep:    { track: 'bag', at: [4, 7, 11] },
  sp_cards:   { track: 'bag', at: [8] },
  sp_reroll:  { track: 'bag', at: [6] },
  sp_map:     { track: 'bag', at: [1] },
  sp_eyes:    { track: 'bag', at: [9] },
  sp_wake:    { track: 'camp', at: [5] },
  sp_warm:    { track: 'pick', at: [5, 13] },
  sp_bone:    { track: 'bag', at: [2] },
  sp_oil:     { track: 'bag', at: [3] },
  sp_gift:    { track: 'bag', at: [5, 10] },
  sp_pocket2: { track: 'bag', at: [14] },
};

export const starshopSteps = (s, track) => (s.starUp && s.starUp['tr_' + track]) || 0;
export function starshopLevel(s, id) {
  const d = STARSHOP_PERKS[id];
  if (!d) return 0;
  const n = starshopSteps(s, d.track);
  if (id === 'sp_head' && n >= 12) return p.wholeCamp;
  let l = 0;
  for (const a of d.at) if (n >= a) l++;
  return l;
}
const lv = starshopLevel;
const hasStep = (s, track, rule) => {
  const n = starshopSteps(s, track), T = STARSHOP_STEPS[track];
  for (const k of Object.keys(T)) if (T[k] === rule && n >= +k) return true;
  return false;
};

export function starStepCost(n) {
  if (n <= 20) return Math.round(2 * Math.pow(1.5, n));
  if (n <= 50) return Math.round(starStepCost(20) * Math.pow(1.25, n - 20));
  return Math.round(starStepCost(50) * Math.pow(1 + 0.15 * (n - 50), 2.2));
}
export const starshopStepCost = starStepCost;
export const starshopRule = (track, n) => STARSHOP_STEPS[track][n] || null;
// the pick on `steps` steps: { mat, n: 1..4 inside the material (0: the wooden start), plus: steps beyond the Star Pick's four }
export function starshopPickAt(steps) {
  if (steps <= 0) return { idx: -1, mat: 'wood', n: 0, plus: 0 };
  const per = p.perMaterial, last = STARSHOP_MATERIALS.length - 1;
  const idx = Math.min(last, Math.floor((steps - 1) / per));
  return { idx, mat: STARSHOP_MATERIALS[idx], n: idx < last ? ((steps - 1) % per) + 1 : Math.min(per, steps - last * per), plus: Math.max(0, steps - (last + 1) * per) };
}
// how far Punch-through reaches (0: not at all)
export function starshopPunch(s) {
  const n = starshopSteps(s, 'pick');
  return n >= 29 ? Infinity : n >= 21 ? 3 : n >= 9 ? 2 : n >= 1 ? 1 : 0;
}
export const starshopCrackSlow = s => hasStep(s, 'pick', 'crack');
export const starshopFalling = s => hasStep(s, 'pick', 'falling');
export const starshopShoes = s => hasStep(s, 'camp', 'shoes');
export const starshopKettle = s => hasStep(s, 'camp', 'kettle');
// a number of hits for the page: one decimal while small
export const starshopNum = x => (x < 10 ? String(Math.round(x * 10) / 10) : fmt(x));
const ROMAN = ['', 'I', 'II', 'III', 'IV'];
// "Stone II", "Wooden", "Star +3"
export const starshopPickName = pk => (pk.mat === 'wood' ? t('pick_wood') : pk.plus > 0 ? t('pick_star_plus', { n: pk.plus }) : t('pick_name', { mat: t('mat_' + pk.mat), n: ROMAN[pk.n] }));
// the level a new site starts with, by the Warm Pick steps, from your best pick
const warmLevel = s => { const w = lv(s, 'sp_warm'); return w ? Math.floor(Math.max(s.starBestPick, s.up.pick || 0) * p.warmFrac[w - 1]) : 0; };
// your first hit at the next site (the pick track and the warm start only)
export const starshopNextHit = s => Math.pow(p.step, starshopSteps(s, 'pick')) * Math.pow(PARAMS.core.powGrow, warmLevel(s));
// the line of the New Site card: the pick this site started with -> the pick the next one starts with
export function starshopLine(s) {
  const cur = s.starLine && s.starLine.cur;
  const a = cur ? cur.steps : 0, b = starshopSteps(s, 'pick');
  return { from: starshopPickAt(a), to: starshopPickAt(b), hitFrom: cur ? cur.hit : 1, hitTo: starshopNextHit(s), changed: a !== b };
}

// "Stone II -> Stone III. Your first hit: 2.2 -> 3.4." (one name and one hit when nothing changed)
export function starshopLineText(s) {
  const L = starshopLine(s);
  if (!L.changed && Math.abs(L.hitTo - L.hitFrom) < 1e-9) return t('site_line_same', { a: starshopPickName(L.to), y: starshopNum(L.hitTo) });
  return t('site_line', { a: starshopPickName(L.from), b: starshopPickName(L.to), x: starshopNum(L.hitFrom), y: starshopNum(L.hitTo) });
}

// the same line after a move: the pick the last site started with -> the pick this one started with
export function starshopMovedText(s) {
  const L = s.starLine || {}, prev = L.prev || { steps: 0, hit: 1 }, cur = L.cur || prev;
  return t('site_line', { a: starshopPickName(starshopPickAt(prev.steps)), b: starshopPickName(starshopPickAt(cur.steps)), x: starshopNum(prev.hit), y: starshopNum(cur.hit) });
}

// Warm Pick sets the pick level, so the next level used to cost what it costs at that level: for the first
// minute Stronger Pick could not be bought. The price ramps back onto the old curve (3 levels of price per
// level bought, until you have bought half as many as the warm start gave you). Free pick levels as a flat
// discount were tried and made every level about 5 times faster: strength grows 1.25 a level, price 1.5, and the
// deep ground pays so much that cheap levels never run out. So this one perk keeps its ramp.
if (ITEMS.pick && !ITEMS.pick.cost) {
  const it = ITEMS.pick;
  it.cost = (s, l) => {
    const w = s.starWarm || 0;
    const idx = w > 0 && l >= w ? l - Math.max(0, w - 2 * (l - w)) : l;
    return Math.ceil(it.base * Math.pow(it.grow, idx));
  };
}

// ---------- keep relics ----------
export const starshopKeepOptions = s => Object.keys(s.relics).filter(id => s.relics[id] > 0);
export function starshopSetKeep(s, id) {
  if (id && !(s.relics[id] > 0)) return false;
  s.starKeep = id || null;
  return true;
}
// the relics that would cross the move now, with the level each keeps (empty: none). The one you chose first,
// then (with Second Pocket) the best of the rest.
export function starshopKeepList(s) {
  const n = lv(s, 'sp_keep');
  const held = starshopKeepOptions(s);
  if (!n || !held.length) return [];
  const best = list => { let id = list[0]; for (const h of list) if (s.relics[h] > s.relics[id]) id = h; return id; };
  const first = s.starKeep && s.relics[s.starKeep] > 0 ? s.starKeep : best(held);
  const out = [{ id: first, level: Math.min(s.relics[first], n) }];
  const rest = held.filter(h => h !== first);
  if (lv(s, 'sp_pocket2') && rest.length) { const id = best(rest); out.push({ id, level: Math.min(s.relics[id], n) }); }
  return out;
}

// ---------- free re-roll ----------
export const starshopRerollsLeft = s => Math.max(0, lv(s, 'sp_reroll') - (s.starRerolls || 0));
export function starshopReroll(s) {
  if (!starshopRerollsLeft(s)) return false;
  s.starRerolls = (s.starRerolls || 0) + 1;
  return true;
}

// ---------- away: past a Big Rock you have beaten ----------
// never the Gate of the level in play: the `awayPassable` mod (sites) says no to it, on every kind of run
const passable = (s, R) => lv(s, 'sp_wake') > 0 && layerOf(R) <= s.starBoss && fold('awayPassable', s, true, R);
// is a Big Rock you cannot pass in view of the crew standing at row r?
function blocked(s, r) {
  for (let R = r; R <= r + VIEW_ROWS - 1; R++) if (R > 0 && R % LAYER === 0 && !passable(s, R)) return true;
  return false;
}

// what this site started with, for the line on the New Site card
function noteStart(s) {
  const line = s.starLine || { prev: null, cur: null };
  s.starLine = { prev: line.cur, cur: { steps: starshopSteps(s, 'pick'), hit: pickPower(s) } };
}

export const starshop = use({
  id: 'starshop',
  params: p,
  strings,
  version: 2,
  // v1 -> v2: the Star Shop became three tracks. Every Star ever spent on the OLD shop comes back, once; the old perks are gone.
  //   Stars paid for the third and fourth pick (picks feature, counted in starSpent) are not refunded: those picks stay owned.
  migrate(s, from) {
    {
      const old = Object.keys(s.starUp || {}).filter(k => k.startsWith('sp_'));
      const costs = PARAMS.picks ? PARAMS.picks.starCosts : [];
      let kept = 0;
      for (let i = 0; i < ((s.picksUp && s.picksUp.pick3) || 0); i++) kept += costs[Math.min(i, costs.length - 1)] || 0;
      const spent = s.starSpent || 0, back = spent >= kept ? spent - kept : spent;
      if (back > 0) { s.starRefund = back; s.stars += back; }
      s.starSpent = spent - back;
      for (const k of old) delete s.starUp[k];
    }
  },
  state: {
    starSpent:    { init: () => 0, survives: ['site', 'land'] },     // Stars spent, ever (the pacing counts Stars earned: stars + starSpent)
    starKeep:     { init: () => null, survives: ['site', 'land'] },  // the relic you chose to carry over
    starBestPick: { init: () => 0, survives: ['site', 'land'] },     // your best pick level, ever
    starBoss:     { init: () => 0, survives: ['site', 'land'] },     // the deepest Big Rock you ever broke
    starRefund:   { init: () => 0, survives: ['site', 'land'] },     // Stars that came back from the old Star Shop; shown until you spend
    starLine:     { init: () => ({ prev: null, cur: null }), survives: ['site', 'land'] },   // { steps, hit } of the pick at the start of this and the last site
    starRerolls:  { init: () => 0, perSite: true },                  // free re-rolls used at this site
    starWarm:     { init: () => 0, perSite: true },                  // the pick level this site started with (Warm Pick)
    starOld:      { init: () => false, perSite: true },              // Old Friend has cracked this site's first Big Rock
    starFell:     { init: () => false, perSite: true },              // Falling Star has dropped this site's first swing
  },
  shops: { star: { wallet: 'stars', levels: 'starUp', survives: ['site', 'land'] } },
  items: Object.fromEntries(STARSHOP_TRACKS.map((tr, i) => ['tr_' + tr, {
    at: 10 + i * 10, shop: 'star', base: p.cost0, grow: p.costGrow, levels: 'grind',
    cost: (s, l) => starshopStepCost(l),
    open: s => s.stars > 0 || s.starSpent > 0,
    bought(s, level) { s.starSpent += starshopStepCost(level - 1); s.starRefund = 0; },
  }])),
  unlocks: STARSHOP_TRACKS.flatMap(tr => Object.keys(STARSHOP_STEPS[tr]).map(n => ({ id: `tr:${tr}:${n}`, cat: 'grind', group: 'Star track steps' }))),
  firsts: { buy: d => (d.shop === 'star' && d.id.startsWith('tr_') && STARSHOP_STEPS[d.id.slice(3)][d.level] ? `tr:${d.id.slice(3)}:${d.level}` : null) },
  mods: {
    pickPower: { at: 21, fn: (v, s) => v * Math.pow(p.step, starshopSteps(s, 'pick')) },
    crewShare: { at: 21, fn: (v, s) => v + p.campShare * starshopSteps(s, 'camp') },     // every Camp step: a Rafeeq hits a little closer to your own hit (not a second multiplier)
    coinMult:  { at: 21, fn: (v, s) => v * Math.pow(p.step, starshopSteps(s, 'bag')) },
    // Wide Hands adds a card; the cap comes last, so Wide Hands + Pearl Eye + a prize never show more than cardsCap
    draftCards: { at: 9999, fn: (v, s) => Math.min(p.cardsCap, v + lv(s, 'sp_cards')) },
    crackSeconds: (v, s) => (starshopCrackSlow(s) ? v * p.crackSlow : v),      // Crack Finder
    crewWalk: (v, s) => (starshopShoes(s) ? v * p.shoes : v),                  // Good Shoes
    teaBreak: (v, s) => (starshopKettle(s) ? 0 : v),                           // Second Kettle
  },
  gen: { row: [{ at: 15, fn(c) {
    const s = c.s;
    if (c.r === p.chestRow && lv(s, 'sp_map')) c.put('chest');
    if (c.r === p.boneRow && lv(s, 'sp_bone')) c.put('fossil');
    if (c.r === p.oilRow && lv(s, 'sp_oil')) c.put('oil');
  } }] },
  hooks: {
    bossDown(s, r) { s.starBoss = Math.max(s.starBoss, layerOf(r)); },
    resetting(s, name, keep) {
      s.starBestPick = Math.max(s.starBestPick, s.up.pick || 0);
      const k = starshopKeepList(s);
      if (k.length) keep.starshop = k;
    },
    reset: { at: 100, fn(s, name, keep) {
      const k = keep && keep.starshop;
      if (k) for (const x of [].concat(k)) if (RELICS[x.id]) s.relics[x.id] = Math.min(x.level, RELICS[x.id].max);
      const crew = lv(s, 'sp_head');
      for (let i = 0; i < crew; i++) s.diggers.push(newRafeeq(s));
      grantFree(s, 'crew', crew);                          // free seats: the next Rafeeq still costs the first price
      const w = warmLevel(s);                              // Warm Pick: priced by the ramp above, which brings the cost back onto the curve
      if (w) { s.up.pick = Math.max(s.up.pick, w); s.starWarm = s.up.pick; }
      s.chests += lv(s, 'sp_gift') * p.giftChests;
      noteStart(s);
    } },
    // Heavy Hand: a big hit also strikes the blocks beside it
    swung(s, sw, ev) {
      // Falling Star: the first swing at a site drops the dig to its first Big Rock; the ground it passes pays as it does while away
      if (!s.starFell && s.bossesDown === 0 && starshopFalling(s)) {
        s.starFell = true;
        let coins = 0, rows = 0;
        while (rows < LAYER && !blocked(s, s.top)) { coins += dirtVal(s.top) * COLS * PARAMS.away.rowPay * coinMult(s); shiftRow(s); rows++; }
        coins = Math.round(coins);
        s.coins += coins; s.total += coins;
        if (s.top + 1 > s.best) s.best = s.top + 1;
        for (const d of s.diggers) { d.r = Math.max(d.r, s.top); d.tr = -1; d.tc = -1; }
        emit(s, ev, 'starFell', { rows, coins });
        return;
      }
      if (!sw.crit || !hasStep(s, 'pick', 'heavy')) return;
      for (let k = 1; k <= p.heavyReach; k++) for (const dc of [-k, k]) if (cellAt(s, sw.r, sw.c + dc)) damage(s, sw.r, sw.c + dc, sw.dmg, 'you', ev, { chain: 1 });
    },
    // Old Friend: the first Big Rock of a site is already cracked
    step(s) {
      if (s.starOld || !s.boss || s.bossesDown > 0 || !hasStep(s, 'pick', 'old')) return;
      s.starOld = true;
      s.boss.hp = Math.min(s.boss.hp, s.boss.max * p.oldFriend);
    },
    awayWalk: { at: 5, fn(s, out) {
      if (!out.atBoss || !lv(s, 'sp_wake')) return;
      const A = PARAMS.away;
      let budget = out.budget;
      let rows = 0, coins = 0, chests = 0;
      while (out.metres + rows < A.maxRows && !blocked(s, s.top)) {
        const cost = groundHp(s, s.top) * COLS * A.rowCost;      // the ground as it is in this dig
        if (budget < cost) break;
        budget -= cost;
        coins += dirtVal(s.top) * COLS * A.rowPay * coinMult(s);
        if (rnd() < PARAMS.chest.chance * fold('chestChance', s, 1)) chests++;
        shiftRow(s); rows++;
      }
      out.budget = budget;
      out.coins += coins; out.metres += rows; out.chests += chests; out.passed = rows;
      if (s.top + 1 > s.best) s.best = s.top + 1;
      // a Rock they walked past counts as down in this dig too: the next Rock can be fought and a move made
      s.bossesDown = Math.max(s.bossesDown, layerOf(Math.max(0, s.top - 1)));
      out.atBoss = blocked(s, s.top);
    } },
  },
  // the scripted player: the cheapest step, the Pick first, then Bag, Camp, Pick ... (an even spend)
  bot: { shop(s, api) {
    let best = 'pick', bn = Infinity;
    for (const tr of ['pick', 'bag', 'camp']) { const n = starshopSteps(s, tr); if (n < bn) { bn = n; best = tr; } }
    return buy(s, 'tr_' + best, api && api.ev) ? 1 : 0;
  } },
});
