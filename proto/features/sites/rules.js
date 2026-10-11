// Dig feature: sites and the first reset. A site is where you dig; each one bends the rules of the
// ground. Moving to a New Site starts the dig over and pays Stars, which last for ever.
import { use, SITES, emit } from '../../core/registry.js';
import { reset } from '../../core/state.js';
import strings from './strings.js';

const p = {
  starCoin: 0.2, starPick: 0.1,   // each Star: coins and hits
  needBosses: 2,                  // Big Rocks to break before you may move
};

export const canNewSite = s => s.bossesDown >= p.needBosses;
export const starsFor = s => Math.max(1, Math.floor(s.best / 10) - 2);

export function newSite(s, site, ev = () => {}) {
  if (!canNewSite(s) || !SITES[site]) return false;
  const gain = starsFor(s);
  s.stars += gain; s.sites += 1; s.site = site;
  reset(s, 'site');               // every slice that does not declare `survives: ['site']` starts over
  emit(s, ev, 'newSite', { gain, stars: s.stars });
  return true;
}

export const sites = use({
  id: 'sites',
  params: p,
  legacy: { starCoin: 'starCoin', starPick: 'starPick' },
  strings,
  state: {
    stars: { init: () => 0, survives: ['site', 'land'] },
    sites: { init: () => 0, survives: ['site', 'land'] },          // how many times you have moved
    site:  { init: () => 'dunes', perSite: true, survives: ['site'] },
  },
  // multipliers on what the ground holds (tnt, ore, bone, chest) and on its hardness (hp).
  // A site may also carry `hooks` and `mods` (its own rules) and `blocks` (multipliers on a layer's block table).
  sites: {
    dunes: { at: 10, start: true, tnt: 1, ore: 1, bone: 1, chest: 1, hp: 1 },
    boom:  { at: 20, tnt: 3.2, ore: 1, bone: 1, chest: 1, hp: 1.25 },     // Powder Valley
    gold:  { at: 30, tnt: 1, ore: 2.2, bone: 1, chest: 0.8, hp: 1.35 },   // Golden Wadi
    bones: { at: 40, tnt: 1, ore: 1, bone: 4, chest: 1.6, hp: 1.2 },      // Valley of Beasts
  },
  mods: {
    coinMult:  { at: 20, fn: (v, s) => v * (1 + p.starCoin * s.stars) },
    pickPower: { at: 20, fn: (v, s) => v * (1 + p.starPick * s.stars) },
    crewPower: { at: 20, fn: (v, s) => v * (1 + p.starPick * s.stars) },
  },
  hooks: {
    reset(s, name) { if (name === 'site') { s.seen.siteToast = false; s.seen.bossToast = true; } },
  },
});
