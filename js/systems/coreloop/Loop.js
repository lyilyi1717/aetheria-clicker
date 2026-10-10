// One tick of the core loop (README.md "One tick of the loop"), for the game. The proof sim
// (sim/core-loop.mjs) plays the same order with its own player policy in between.
import { BigNum } from '../../engine/BigNum.js';
import { P } from './params.js';
import { PRESENCE, NO_CONTEXT } from './shared.js';
import * as Presence from './Presence.js';
import * as Well from './Well.js';
import * as Rigs from './Rigs.js';
import * as Refinery from './Refinery.js';
import * as Collection from './Collection.js';
import * as Cauldrons from './Cauldrons.js';
import * as Seals from './Seals.js';
import * as Prestige from './Prestige.js';
import * as Tree from './Tree.js';

// Advances every system by dt seconds in `presence`, runs the automation the player has won,
// and moves the clock. Returns the Crude the Well made.
export function advance(state, dt, presence, ctx = NO_CONTEXT) {
  if (!(dt > 0)) return BigNum.zero();
  const auto = (id) => Prestige.hasAutomation(state, id);
  Presence.step(state, dt, presence, ctx);
  const made = Well.step(state, dt, presence, ctx);
  Rigs.step(state, dt, presence, ctx);
  Cauldrons.step(state, dt, presence, ctx);
  Seals.step(state, dt, presence, ctx);
  Collection.step(state, dt, presence, ctx);
  Refinery.step(state, dt, presence, ctx);
  if (auto('autoWell') && auto('autoBuy')) Prestige.newWell(state, ctx);
  if (auto('autoBuy')) Well.buyMax(state);
  if (auto('autoFlare')) Well.flare(state, false, ctx);
  state.t += dt;
  return made;
}

// The player taps a Gusher: P.gusherSeconds of Watching-rate Crude and Rig output.
// Returns { crude, units } or null when none is up.
export function catchGusher(state, ctx = NO_CONTEXT) {
  const pay = Presence.catchGusher(state, ctx);
  if (!pay) return null;
  const crude = Well.crudePerSecond(state, pay.presence).mul(pay.seconds);
  Well.addCrude(state, crude, ctx);
  const units = Rigs.haul(state, pay.seconds, ctx);
  return { crude, units };
}

// Time the game was closed, played as Away in P.offlineStep steps, at most P.offlineMaxHours.
// Returns what the return screen shows: seconds settled, Crude made, Material units gained.
export function settleAway(state, seconds, ctx = NO_CONTEXT) {
  const hours = P.offlineMaxHours + Tree.bonus(state, 'offlineHours');
  const total = Math.min(Math.max(0, Number(seconds) || 0), hours * 3600);
  const units0 = state.fields.reduce((n, f) => n + f.inventory.reduce((a, b) => a + b, 0), 0);
  let crude = BigNum.zero(), left = total;
  while (left > 1e-9) {
    const dt = Math.min(P.offlineStep, left);
    crude = crude.add(advance(state, dt, PRESENCE.AWAY, ctx));
    left -= dt;
  }
  const units = state.fields.reduce((n, f) => n + f.inventory.reduce((a, b) => a + b, 0), 0) - units0;
  return { seconds: total, crude, units, capped: seconds > total, capHours: hours };
}
