// Dig feature: the crew (the player reads "Rafeeq"; the code says digger and crew). Hired in the
// coin shop, each one walks to a block and hits it. Which block is a policy, so a Foreman can
// register more policies and set `s.crewJob` (or one digger's `job`) to switch.
import { use, PARAMS, POLICIES, fold } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';
import { COLS, VIEW_ROWS, cellAt, reachable } from '../../core/grid.js';
import { damage } from '../../core/rules.js';
import strings from './strings.js';

const p = {
  rate: 4,          // digger hits per second
  walk: 6,          // blocks per second
  karakStep: 0.5,   // Karak Tea: faster per level
};

export const crewPower = s => fold('crewPower', s, 1);
export const crewRate = s => fold('crewRate', s, p.rate);

// the default job: the nearest block that can be hit, top rows first, not one a mate is on
function nearest(s, d) {
  let best = null, bestScore = 1e9;
  for (let i = 0; i < VIEW_ROWS; i++) {
    for (let c = 0; c < COLS; c++) {
      const r = s.top + i;
      const cell = s.rows[i][c];
      if (!cell || !reachable(s, r, c)) continue;
      let score = i * 12 + Math.abs(c - d.c);
      if (s.diggers.some(o => o !== d && o.tr === r && o.tc === c)) score += 30;
      if (score < bestScore) { bestScore = score; best = [r, c]; }
    }
  }
  return best;
}
function chooseTarget(s, d) {
  const policy = POLICIES[d.job || s.crewJob] || nearest;
  const best = policy(s, d);
  if (best) { d.tr = best[0]; d.tc = best[1]; } else { d.tr = -1; d.tc = -1; }
}

export const diggers = use({
  id: 'diggers',
  params: p,
  legacy: { crewRate: 'rate' },
  strings,
  state: {
    diggers:   { init: () => [], perSite: true },        // { c, r, tc, tr, cd, swing, job? }
    crewJob:   { init: () => 'nearest' },                // the policy every digger follows unless he has his own
    crewCps:   { init: () => 0, perSite: true },         // what the crew earns a second, smoothed
    _acc:      { init: () => 0, perSite: true, transient: true },
    _crewEarn: { init: () => 0, perSite: true, transient: true },
  },
  items: {
    crew: { at: 20, shop: 'coin', base: 30, grow: 4.2, max: 8, levels: 'core', open: s => s.total >= 60 || s.up.crew > 0,
      bought(s) { s.diggers.push({ c: Math.floor(rnd() * COLS), r: s.top, tc: -1, tr: -1, cd: 0.3, swing: 0 }); } },
    crewPow: { at: 30, shop: 'coin', base: 12, grow: 1.5, open: s => s.up.crew > 0 },
  },
  policies: { nearest },
  relics: {
    karak: { at: 80, max: 3, when: s => s.up.crew > 0, mods: { crewRate: (v, s) => v * (1 + p.karakStep * s.relics.karak) } },   // faster diggers
  },
  mods: {
    crewPower: { at: 10, fn: (v, s) => v * Math.pow(PARAMS.core.powGrow, s.up.crewPow) },
    awayDps: (v, s) => v + s.diggers.length * crewRate(s) * crewPower(s),
  },
  hooks: {
    step: [
      { at: 600, fn(s, dt, ev) {
        const rate = crewRate(s);
        for (const d of s.diggers) {
          if (d.tr < 0 || !cellAt(s, d.tr, d.tc)) chooseTarget(s, d);
          if (d.tr < 0) continue;
          const dc = d.tc - d.c, drr = d.tr - d.r;
          const moving = Math.abs(dc) > 0.05 || Math.abs(drr) > 0.05;
          d.c += Math.sign(dc) * Math.min(Math.abs(dc), dt * p.walk);
          d.r += Math.sign(drr) * Math.min(Math.abs(drr), dt * p.walk);
          if (moving) continue;
          d.cd -= dt;
          if (d.cd <= 0) {
            d.cd += 1 / rate;
            if (d.cd < 0) d.cd = 0;
            d.swing = 1;
            damage(s, d.tr, d.tc, crewPower(s), 'crew', ev);
          }
        }
      } },
      // what the crew earns by itself, for the time-away estimate
      { at: 950, fn(s, dt) {
        s._acc = (s._acc || 0) + dt;
        if (s._acc >= 5) {
          const cps = (s._crewEarn || 0) / s._acc;
          s.crewCps = s.crewCps ? s.crewCps * 0.7 + cps * 0.3 : cps;
          s._acc = 0; s._crewEarn = 0;
        }
      } },
    ],
    earned(s, n, src) { if (src === 'crew') s._crewEarn = (s._crewEarn || 0) + n; },
    scrolled(s) { for (const d of s.diggers) if (d.tr < s.top) { d.tr = -1; d.tc = -1; } },
    awayEnd: { at: 20, fn(s) { for (const d of s.diggers) { d.tr = -1; d.tc = -1; d.r = s.top; } } },
  },
});
