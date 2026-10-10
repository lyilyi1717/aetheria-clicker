// The one tree's arithmetic over a plain `{ bank: { reserves, shares, pages }, ranks: { id: n } }`
// object. The game (Tree.js, on state.tree) and the model (sim/redesign, on s.tree) both call
// these, so a node means the same thing in both. The nodes are P.tree (params.js).
import { P } from './params.js';

export const RINGS = Object.freeze(['reserves', 'shares', 'pages']);
const BY_ID = new Map(P.tree.map(n => [n.id, n]));
// Kinds that multiply as (1 + sum); the others add up; a flag is on from rank 1
const MULT = new Set(['crude', 'hand', 'reserves', 'awayWell', 'fieldPower', 'rig', 'gusherRate', 'heat']);

export const newTree = () => ({ bank: { reserves: 0, shares: 0, pages: 0 }, ranks: {} });
export const nodeOf = (id) => BY_ID.get(id) || null;
export const rankOf = (tree, id) => tree.ranks[id] || 0;
// Price of the next rank of a node (Infinity at its top rank)
export function nodeCost(tree, id) {
  const n = BY_ID.get(id);
  if (!n) return Infinity;
  const r = rankOf(tree, id);
  return r >= n.max ? Infinity : Math.round(n.cost * Math.pow(n.growth, r));
}
export const canBuyNode = (tree, id) => tree.bank[BY_ID.get(id)?.ring] >= nodeCost(tree, id);

// Sums are asked for many times a tick; they only change on a buy or a reset, which replace
// `tree.ranks` with a new object
const cache = new WeakMap();
function sums(tree) {
  let c = cache.get(tree.ranks);
  if (c) return c;
  c = new Map();
  for (const [id, rank] of Object.entries(tree.ranks)) {
    const n = BY_ID.get(id);
    if (!n || !(rank > 0)) continue;
    const keys = n.field === undefined ? [n.kind, `${n.kind}:0`, `${n.kind}:1`, `${n.kind}:2`] : [`${n.kind}:${n.field}`];
    for (const key of keys) c.set(key, (c.get(key) || 0) + n.value * Math.min(rank, n.max));
  }
  cache.set(tree.ranks, c);
  return c;
}

// What the tree gives for `kind` (for a Field with `field`): a multiplier (1 = nothing) for the
// multiplying kinds, an amount (0 = nothing) for the rest
export function treeBonus(tree, kind, field) {
  const v = sums(tree).get(field === undefined ? kind : `${kind}:${field}`) || 0;
  return MULT.has(kind) ? 1 + v : v;
}
export const treeHas = (tree, id) => rankOf(tree, id) > 0;

export function buyNode(tree, id) {
  if (!canBuyNode(tree, id)) return false;
  const n = BY_ID.get(id);
  tree.bank[n.ring] -= nodeCost(tree, id);
  tree.ranks = { ...tree.ranks, [id]: rankOf(tree, id) + 1 };
  return true;
}
export function earn(tree, ring, amount) {
  if (amount > 0 && RINGS.includes(ring)) tree.bank[ring] += amount;
}
// A New Field empties the inner ring and its bank; a Chronicle the middle ring and its bank
export function resetRing(tree, ring) {
  const ranks = { ...tree.ranks };
  for (const n of P.tree) if (n.ring === ring) delete ranks[n.id];
  tree.ranks = ranks;
  tree.bank[ring] = 0;
}
// The model's policy and the "buy all" button: the cheapest affordable node, again and again,
// until nothing more can be bought. Returns the ids bought, in order.
export function buyAffordable(tree) {
  const bought = [];
  for (let guard = 0; guard < 500; guard++) {
    let best = null, bestCost = Infinity;
    for (const n of P.tree) {
      const c = nodeCost(tree, n.id);
      if (c <= tree.bank[n.ring] && c < bestCost) { best = n.id; bestCost = c; }
    }
    if (!best) break;
    buyNode(tree, best);
    bought.push(best);
  }
  return bought;
}
