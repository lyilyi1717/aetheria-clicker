// The one tree (docs/core-loop-plan.md CL-24): the old Reserve shop, Shard tree, talents, Page
// upgrades and Quartermaster as three rings of one tree. Inner ring: bought with the Reserves
// earned this New Field layer, reset by a New Field. Middle ring: bought with the Shares New Fields
// pay, reset by a Chronicle. Outer ring: bought with Pages, never reset. Writes state.tree (and, for the Head Start Kit, well.amount[1]).
// The nodes are P.tree; the arithmetic is treeMath.js, which the model (sim/redesign) shares.
import { BigNum } from '../../engine/BigNum.js';
import { P } from './params.js';
import * as M from './treeMath.js';

export const RINGS = M.RINGS;

// What the tree gives the other systems: a multiplier (1 = nothing) for crude, reserves, awayWell,
// fieldPower, rig, gusherRate, heat; an amount (0 = nothing) for offlineHours, gusherWindow,
// startShares, pageBank, startKit, keepPressure, handsWell. `field` for fieldPower and rig.
export const bonus = (state, kind, field) => M.treeBonus(state.tree, kind, field);
// A flag node (an unlock a later system reads): on from rank 1
export const has = (state, id) => M.treeHas(state.tree, id);

export const bank = (state, ring) => state.tree.bank[ring] || 0;
export const rank = (state, id) => M.rankOf(state.tree, id);
// Price of a node's next rank in its ring's currency (Infinity at the top rank)
export const cost = (state, id) => M.nodeCost(state.tree, id);
export const canBuy = (state, id) => M.canBuyNode(state.tree, id);
// Buying the Head Start Kit while this run has no Buckets drops them in at once (the kit would
// otherwise wait for the next New Well and the purchase would change nothing the player can see).
export function buy(state, id) {
  if (!M.buyNode(state.tree, id)) return false;
  const node = P.tree.find(n => n.id === id);
  const w = state.well;
  if (node && node.kind === 'startKit' && w && w.amount && w.amount[1] && w.amount[1].lte(0)) {
    w.amount[1] = new BigNum(bonus(state, 'startKit'));
  }
  return true;
}
// Buys the cheapest affordable node again and again (the model's policy). Returns the ids bought.
export const buyAll = (state) => M.buyAffordable(state.tree);

// For the UI: every node of a ring with its rank, price and whether it can be bought now.
// `pending` names the item that will give a flag node its effect; `from` the old ids it replaces.
export function nodes(state, ring) {
  return P.tree.filter(n => n.ring === ring).map(n => ({
    id: n.id, ring: n.ring, kind: n.kind, field: n.field, value: n.value, max: n.max,
    rank: rank(state, n.id), cost: cost(state, n.id), canBuy: canBuy(state, n.id),
    pending: n.pending || null, from: n.from
  }));
}

// --- called by Prestige.js -----------------------------------------------------------------------
// A New Well banks its Reserves; a New Field banks its Shares and empties the inner ring; a
// Chronicle banks its Pages (plus the tree's own extra) and empties the inner and middle rings.
export const earn = (state, ring, amount) => M.earn(state.tree, ring, amount);
export const resetRing = (state, ring) => M.resetRing(state.tree, ring);
