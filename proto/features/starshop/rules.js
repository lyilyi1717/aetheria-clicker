// Dig feature: the Star shop. Stars (paid at each New Site) buy perks that last for ever and change
// how a new site starts and plays. Spending a Star never lowers the Star bonus (coins, hits):
// the bonus is worked out from the Stars you have EVER earned, so a purse that goes down costs nothing.
//
// Perk list (id: what it does, Stars per level). Every one shows in the first minute of the next site,
// except "wake", which shows when you come back from time away.
//   sp_head    a Rafeeq is hired when you arrive (1, 2, 3 Rafeeqs)              1 / 2 / 3
//   sp_keep    one relic you choose crosses the move (up to level 1, 2, 3)       2 / 3 / 4
//   sp_cards   chests show one more card                                        3
//   sp_reroll  a free re-roll of a chest's cards, once per site                 2
//   sp_map     the first chest of a site is close to the surface               1
//   sp_eyes    TNT is outlined through the dark (page side)                     2
//   sp_wake    away, Rafeeqs walk past a Big Rock you have beaten at that depth  4
//   sp_warm    the pick starts at half (then 70%) of your best level           3 / 6
//   sp_bone    a bone sits close to the surface                                  1
//   sp_oil     an oil well sits close to the surface                             1
//   sp_gift    a chest is waiting in your pocket                                 2 / 4
import { use, PARAMS, fold, RELICS } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';
import { COLS, VIEW_ROWS, LAYER, dirtHp, dirtVal, shiftRow, layerOf } from '../../core/grid.js';
import { coinMult, buy } from '../../core/rules.js';
import strings from './strings.js';

const p = {
  chestRow: 3, boneRow: 5, oilRow: 7,       // how close to the surface (metres)
  warmFrac: [0.5, 0.7],                     // the share of your best pick level a new site starts with, by perk level
  giftChests: 1,                            // chests in your pocket per perk level
};

// id -> { at, costs: Stars for level 1, 2, 3 }
export const STARSHOP_PERKS = {
  sp_head:   { at: 10, costs: [1, 2, 3] },
  sp_keep:   { at: 20, costs: [2, 3, 4] },
  sp_cards:  { at: 30, costs: [3] },
  sp_reroll: { at: 40, costs: [2] },
  sp_map:    { at: 50, costs: [1] },
  sp_eyes:   { at: 60, costs: [2] },
  sp_wake:   { at: 70, costs: [4] },
  sp_warm:   { at: 80, costs: [3, 6] },
  sp_bone:   { at: 90, costs: [1] },
  sp_oil:    { at: 100, costs: [1] },
  sp_gift:   { at: 110, costs: [2, 4] },
};

export const starshopLevel = (s, id) => (s.starUp && s.starUp[id]) || 0;
const lv = starshopLevel;

// ---------- keep one relic ----------
export const starshopKeepOptions = s => Object.keys(s.relics).filter(id => s.relics[id] > 0);
export function starshopSetKeep(s, id) {
  if (id && !(s.relics[id] > 0)) return false;
  s.starKeep = id || null;
  return true;
}
// the relic that would cross the move now, and the level it keeps (null: none)
export function starshopKeepNow(s) {
  const n = lv(s, 'sp_keep');
  const held = starshopKeepOptions(s);
  if (!n || !held.length) return null;
  let id = s.starKeep && s.relics[s.starKeep] > 0 ? s.starKeep : null;
  if (!id) { id = held[0]; for (const h of held) if (s.relics[h] > s.relics[id]) id = h; }   // else the best one you hold
  return { id, level: Math.min(s.relics[id], n) };
}

// ---------- free re-roll ----------
export const starshopRerollsLeft = s => Math.max(0, lv(s, 'sp_reroll') - (s.starRerolls || 0));
export function starshopReroll(s) {
  if (!starshopRerollsLeft(s)) return false;
  s.starRerolls = (s.starRerolls || 0) + 1;
  return true;
}

// ---------- away: past a Big Rock you have beaten ----------
const passable = (s, R) => lv(s, 'sp_wake') > 0 && layerOf(R) <= s.starBoss;
// is a Big Rock you cannot pass in view of the crew standing at row r?
function blocked(s, r) {
  for (let R = r; R <= r + VIEW_ROWS - 1; R++) if (R > 0 && R % LAYER === 0 && !passable(s, R)) return true;
  return false;
}
const trail = new WeakMap();      // an away's `out` -> what its rows have cost so far

export const starshop = use({
  id: 'starshop',
  params: p,
  strings,
  state: {
    starSpent:    { init: () => 0, survives: ['site', 'land'] },     // Stars spent, ever: the bonus counts them still
    starKeep:     { init: () => null, survives: ['site', 'land'] },  // the relic you chose to carry over
    starBestPick: { init: () => 0, survives: ['site', 'land'] },     // your best pick level, ever
    starBoss:     { init: () => 0, survives: ['site', 'land'] },     // the deepest Big Rock you ever broke
    starRerolls:  { init: () => 0, perSite: true },                  // free re-rolls used at this site
  },
  shops: { star: { wallet: 'stars', levels: 'starUp', survives: ['site', 'land'] } },
  items: Object.fromEntries(Object.entries(STARSHOP_PERKS).map(([id, d]) => [id, {
    at: d.at, shop: 'star', base: d.costs[0], grow: 1, max: d.costs.length, levels: d.costs.length > 1 ? 'core' : 'grind',
    cost: (s, l) => d.costs[l],
    open: s => s.stars > 0 || s.starSpent > 0,
    bought(s, level) { s.starSpent += d.costs[level - 1]; },
  }])),
  mods: {
    // the bonus of every Star ever earned stays: put back what was spent
    coinMult:  { at: 21, fn: (v, s) => v * (1 + PARAMS.sites.starCoin * (s.stars + s.starSpent)) / (1 + PARAMS.sites.starCoin * s.stars) },
    pickPower: { at: 21, fn: (v, s) => v * (1 + PARAMS.sites.starPick * (s.stars + s.starSpent)) / (1 + PARAMS.sites.starPick * s.stars) },
    crewPower: { at: 21, fn: (v, s) => v * (1 + PARAMS.sites.starPick * (s.stars + s.starSpent)) / (1 + PARAMS.sites.starPick * s.stars) },
    draftCards: (v, s) => v + lv(s, 'sp_cards'),
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
      const k = starshopKeepNow(s);
      if (k) keep.starshop = k;
    },
    reset(s, name, keep) {
      const k = keep && keep.starshop;
      if (k && RELICS[k.id]) s.relics[k.id] = Math.min(k.level, RELICS[k.id].max);
      const crew = lv(s, 'sp_head');
      for (let i = 0; i < crew; i++) s.diggers.push({ c: Math.floor(rnd() * COLS), r: s.top, tc: -1, tr: -1, cd: 0.3, swing: 0 });
      if (crew) s.up.crew = Math.max(s.up.crew, crew);     // so the next Rafeeq costs what it would after these
      const w = lv(s, 'sp_warm');
      if (w) s.up.pick = Math.max(s.up.pick, Math.floor(s.starBestPick * p.warmFrac[w - 1]));
      s.chests += lv(s, 'sp_gift') * p.giftChests;
    },
    awayRow(s, r, out) { trail.set(out, (trail.get(out) || 0) + dirtHp(r) * COLS * PARAMS.away.rowCost); },
    // the crew was held at a Big Rock: with the perk it walks on past the ones you have beaten
    awayEnd: { at: 5, fn(s, out) {
      if (!out.atBoss || !lv(s, 'sp_wake')) return;
      const A = PARAMS.away;
      let budget = fold('awayDps', s, 0) * out.seconds - (trail.get(out) || 0);
      let rows = 0, coins = 0, chests = 0;
      while (out.metres + rows < A.maxRows && !blocked(s, s.top)) {
        const cost = dirtHp(s.top) * COLS * A.rowCost;
        if (budget < cost) break;
        budget -= cost;
        coins += dirtVal(s.top) * COLS * A.rowPay * coinMult(s);
        if (rnd() < PARAMS.chest.chance * fold('chestChance', s, 1)) chests++;
        shiftRow(s); rows++;
      }
      coins = Math.round(coins);
      out.coins += coins; out.metres += rows; out.chests += chests; out.passed = rows;
      s.coins += coins; s.total += coins;
      if (s.top + 1 > s.best) s.best = s.top + 1;
      // a Rock they walked past counts as down in this dig too: the next Rock can be fought and a move made
      s.bossesDown = Math.max(s.bossesDown, layerOf(Math.max(0, s.top - 1)));
      out.atBoss = blocked(s, s.top);
    } },
  },
  // the scripted player: one perk a look, in this order, like a player who chooses
  bot: { shop(s, api) {
    const order = ['sp_head', 'sp_warm', 'sp_gift', 'sp_keep', 'sp_wake', 'sp_cards', 'sp_map', 'sp_reroll', 'sp_bone', 'sp_oil', 'sp_eyes'];
    for (const id of order) if (buy(s, id, api && api.ev)) return 1;
    return 0;
  } },
});
