// Dig Alqahwa: the pure parts of the after-dig flow and of the coffee house (no DOM, no drawing), so a test can run them.
import * as G from '../../game.js';

// The two big buttons on the finish card, in order: 'alqahwa' (buy upgrades) and 'next' (the next town, the next level).
// Moving on needs the same thing it always needed (G.canNewSite); the coffee house is always open.
export function finishChoices(s) {
  const out = ['alqahwa'];
  if (G.canNewSite(s)) out.push('next');
  return out;
}

// After "Next town": walk on the map and enter by itself only when the road shows ONE card. With side cards or a deal
// the player chooses on the map. cards: what G.dealCards gave. Returns the card to enter, or null.
export function autoEnterCard(cards, walked) {
  if (!walked || !cards || cards.length !== 1) return null;
  return cards[0];
}

// Who is in the coffee house: every hired Rafeeq (by seat) and the manager once he or she is hired.
export function qahwaGuests(s) {
  const rafeeqs = s.diggers.map((d, i) => i);
  return { rafeeqs, manager: G.chatterBossShown(s) ? (G.chatterBossFem(s) ? 'f' : 'm') : null };
}

// The cushions and spots of the room, as fractions of its width (the scene picks the free ones in this order).
export const QAHWA_SPOTS = [0.14, 0.27, 0.4, 0.55, 0.68, 0.82, 0.92, 0.07];
// a stable, spread-out pick of spots for n guests
export function qahwaSpots(n) { return Array.from({ length: n }, (_, i) => QAHWA_SPOTS[(i * 3) % QAHWA_SPOTS.length]); }

// What a guest does next: the loop is sit, sip, chat, walk. Pure over a random number r in [0,1).
export const QAHWA_ACTS = ['sit', 'sip', 'chat', 'walk'];
export function qahwaNextAct(prev, r) {
  const w = prev === 'walk' ? [0.5, 0.3, 0.2, 0] : prev === 'sit' ? [0, 0.4, 0.3, 0.3] : prev === 'sip' ? [0.3, 0, 0.3, 0.4] : [0.3, 0.3, 0, 0.4];
  let a = 0;
  for (let i = 0; i < w.length; i++) { a += w[i]; if (r < a) return QAHWA_ACTS[i]; }
  return 'sit';
}
