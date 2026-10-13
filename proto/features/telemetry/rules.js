// Dig feature: anonymous play data, RULES SIDE. Pure: it only reads the state and reports what it saw as events.
//  - the pace counter: every `sampleSecs` attended seconds of a dig it emits `telemetryPace` (depth gained, coins/s, blocks/s,
//    hits/s). The state it keeps is transient (a few numbers, never saved).
//  - `telemetryAway` when a welcome-back card is settled (seconds away, coins found).
//  - the row builders the page uses: `telemetryTryRow` (one road try that ends) and `telemetryBuyPrice` (what a purchase cost).
// Nothing here sends anything, reads a clock or touches the random stream. The page side (ui.js, queue.js) sends.
import { use, emit, ITEMS, SHOPS } from '../../core/registry.js';
import { pickPower, itemLevel } from '../../core/rules.js';
import { siteRun, siteStamp, roadIndex } from '../sites/rules.js';
import strings from './strings.js';

const p = {
  sampleSecs: 60,       // one pace sample per this many attended seconds of a dig
  maxSamples: 600,      // per site; a dig longer than ten hours stops sampling
};

const num = (x, d = 0) => (Number.isFinite(x) ? x : d);

// one row for a try that ends: 'finished' (the Gate broke), 'left' (moved on before it) or 'newsite' (moved on after it).
// Called while the site is still the one in play. Wall-clock seconds, version, player and days are added by the page.
export function telemetryTryRow(s, outcome) {
  const r = siteRun(s), b = s.boss;
  return {
    site: String(r.site), floor: Math.round(num(r.floor)), twist: String(r.twist || ''), level: roadIndex(s) + 1,
    try_n: Math.round(num(siteStamp(s).n, 1)), outcome,
    att_s: Math.round(num(r.clock) * 10) / 10, par_s: Math.round(num(r.par)),
    depth: Math.round(num(s.best)),
    gate_left: outcome === 'finished' ? 0 : (b && b.max > 0 ? Math.round(Math.max(0, Math.min(1, b.hp / b.max)) * 1000) / 1000 : null),
    rocks: Math.round(num(s.bossesDown)), stars: Math.round(num(s.stars) + num(s.starSpent)),
    coins: num(s.total), pick: num(pickPower(s)), rafeeqs: s.diggers ? s.diggers.length : 0,
    drill: Math.round(num(itemLevel(s, 'drill'))), dynamite: Math.round(num(itemLevel(s, 'dynamite'))), magnet: Math.round(num(itemLevel(s, 'magnet'))),
  };
}

// What a purchase cost, worked out after it was paid (the level is already raised): the price of the level below.
export function telemetryBuyPrice(s, id, level, upgradeCost) {
  const u = ITEMS[id]; if (!u) return 0;
  const lv = SHOPS[u.shop].levels;
  const held = s[lv][id];
  s[lv][id] = level - 1;
  try { return num(upgradeCost(s, id)); } finally { s[lv][id] = held; }
}

export const telemetry = use({
  id: 'telemetry', params: p, strings,
  state: { tel: { init: () => ({ c0: -1, depth0: 0, coin0: 0, blocks: 0, hits: 0, n: 0 }), transient: true } },
  hooks: {
    step(s, dt0, ev) {
      const r = s.run, t = s.tel;
      if (!r || !t) return;
      if (t.c0 < 0 || r.clock < t.c0) { t.c0 = r.clock; t.depth0 = s.best; t.coin0 = s.total; t.blocks = 0; t.hits = 0; return; }
      const dt = r.clock - t.c0;
      if (dt < p.sampleSecs) return;
      if (t.n < p.maxSamples) {
        t.n++;
        emit(s, ev, 'telemetryPace', { n: t.n, att_s: Math.round(r.clock), depth: Math.round(s.best), gain: Math.max(0, Math.round(s.best - t.depth0)), dt,
          coins_s: Math.max(0, (s.total - t.coin0) / dt), blocks_s: t.blocks / dt, hits_s: t.hits / dt, key: r.key });
      }
      t.c0 = r.clock; t.depth0 = s.best; t.coin0 = s.total; t.blocks = 0; t.hits = 0;
    },
    broke(s) { if (s.tel) s.tel.blocks++; },
    swung(s) { if (s.tel) s.tel.hits++; },
    awayEnd(s, out, ev) { emit(s, ev, 'telemetryAway', { coins: num(out && out.coins), secs: num(out && (out.secs ?? out.seconds)) }); },
  },
});
