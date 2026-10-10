// CL-1 Presence: Hands-on / Watching / Away, Heat and Gushers (docs/core-loop-redesign.md §3.3).
// Port of `heatOf` and the gusher block of `advance` in sim/redesign/model.mjs. Writes only
// `state.presence`. It does not pay a Gusher: a catch emits `gusher` and returns what the loop
// driver needs (P.gusherSeconds of Watching-rate Crude and Rig output); Well.js / Fields.js are
// the writers of Crude and Materials.
//
// Clock: `state.t` is the start of the step (a step covers [t, t + dt)); the driver adds dt to it
// after every system has stepped. A Gusher is up while nextGusherAt <= t < nextGusherAt + P.gusherWindow.
import { P } from './params.js';
import { PRESENCE, HIT, rand, NO_CONTEXT } from './shared.js';

const charterOf = (state) => P.charter[state.prestige.charter] || {};

// Seconds of Watching between Gushers (the charter's `gusher` multiplier makes them more frequent)
export const gusherInterval = (state) => P.gusherEvery / (charterOf(state).gusher || 1);

// The state from input age. lastInputAt is -Infinity after a load, so that reads as Watching.
export function presenceOf(state) {
  return state.t - state.presence.lastInputAt <= P.handsWindow ? PRESENCE.HANDS : PRESENCE.WATCH;
}

// Any tap, click or key. Hands-on from this moment.
export function noteInput(state) {
  state.presence.lastInputAt = state.t;
  state.presence.state = PRESENCE.HANDS;
}

// The Field the player works by hand (Rigs.step pushes its frontier while Hands-on)
export function setHandField(state, field) {
  if (!Number.isInteger(field) || field < 0 || field >= P.fields.length) return false;
  state.presence.handField = field;
  return true;
}

// Heat 1..2 over P.heatRamp seconds of continuous Hands-on (the sim's heatOf)
export const heat = (state) => 1 + Math.min(1, state.presence.heatSeconds / P.heatRamp);

export function gusherUp(state) {
  const at = state.presence.nextGusherAt;
  return at > 0 && state.t >= at && state.t < at + P.gusherWindow;
}

// Seconds left to tap the Gusher that is up (0 when none)
export const gusherLeft = (state) => (gusherUp(state) ? state.presence.nextGusherAt + P.gusherWindow - state.t : 0);

// Next Gusher after `P.gusherEvery` Watching seconds on average (x0.5..1.5, from the state's RNG)
function schedule(state) {
  state.presence.nextGusherAt = state.t + gusherInterval(state) * (0.5 + rand(state));
}

// Advance presence by dt seconds spent in `presence` (PRESENCE.*). Returns nothing.
export function step(state, dt, presence, ctx = NO_CONTEXT) {
  const p = state.presence;
  p.state = presence;
  if (presence === PRESENCE.HANDS) p.heatSeconds += dt; else p.heatSeconds = 0;

  if (p.nextGusherAt <= 0) schedule(state);                       // first step, or a fresh load
  else if (presence !== PRESENCE.WATCH && state.t < p.nextGusherAt) p.nextGusherAt += dt; // the wait counts Watching time only
  else if (state.t >= p.nextGusherAt + P.gusherWindow) schedule(state); // missed one: the next wait starts
}

export const canCatchGusher = (state) => state.presence.state !== PRESENCE.AWAY && gusherUp(state);

// Tap the Gusher. Emits `gusher` and returns the payout for the driver, or false if none is up.
export function catchGusher(state, ctx = NO_CONTEXT) {
  if (!canCatchGusher(state)) return false;
  ctx.emit('gusher', HIT.MINOR);
  schedule(state);
  return { seconds: P.gusherSeconds, presence: PRESENCE.WATCH };
}
