// Dig feature: the Foreman. He arrives when the player has a small crew (or has beaten the second
// Big Rock) and gives the Rafeeqs a job: a digger policy picked by `s.crewJob` (README, "Digger jobs").
//   Follow me      dig next to where the player's pick last hit
//   Go for ore     walk to the nearest ore or chest in sight; dig a tunnel to it if it is buried
//   Beside me      the default (id `nearest`): next to where the pick last hit, and the rows under it (diggers)
//   Dig down       race for the deepest block that can be hit
//   Tea break      sit for a while, then dig at double speed for as long: a trade, never a gate
// Away: the away rules do not ask which job runs (the crew is always spent straight down), so the
// choice does not change the settlement. Tea counts as normal speed there (it is break-even).
// Opens no mod; folds `crewRate` while a tea rush is on. Exports: foremanSet, foremanJobs, foremanGlad.
import { use, emit, fold, POLICIES, BLOCKS } from '../../core/registry.js';
import { COLS, VIEW_ROWS, reachable, visibleMask } from '../../core/grid.js';
import strings from './strings.js';

const p = {
  needCrew: 7,        // the Foreman comes when the player owns this many Rafeeqs ...
  needBoss: 3,        // ... or has broken this many Big Rocks
  mate: 3,            // a block a mate is already on counts as this many blocks farther away
  rowWeight: 1.5,     // follow: a row away is this many columns away
  downPull: 4,        // dig down: how much one row deeper is worth
  teaBreak: 6,        // seconds they sit
  teaRush: 8,         // seconds they dig fast
  teaMult: 2,         // how fast
  botJob: 'smart',    // the sim player: 'smart' tries each job once then goes for ore; or a job id; or 'none'
};

export const foremanJobs = ['nearest', 'follow', 'ore', 'down', 'tea'];

const taken = (s, d, r, c) => s.diggers.some(o => o !== d && o.tr === r && o.tc === c);

function best(s, d, score) {
  let bs = 1e9, out = null;
  for (let i = 0; i < VIEW_ROWS; i++) for (let c = 0; c < COLS; c++) {
    if (!s.rows[i][c]) continue;
    const r = s.top + i;
    if (!reachable(s, r, c)) continue;
    const v = score(i, c, r) + (taken(s, d, r, c) ? p.mate : 0) + Math.abs(c - d.c) * 0.01;
    if (v < bs) { bs = v; out = [r, c]; }
  }
  return out;
}

function follow(s, d) {
  const a = s.foremanAim || [s.top + 1, COLS >> 1];
  const ar = Math.max(a[0], s.top);
  return best(s, d, (i, c, r) => Math.abs(r - ar) * p.rowWeight + Math.abs(c - a[1]));
}

function down(s, d) {
  return best(s, d, (i, c) => -i * p.downPull + Math.abs(c - d.c) * 0.5);
}

function ore(s, d) {
  const vis = visibleMask(s);
  let goal = null, gs = 1e9;
  for (let i = 0; i < VIEW_ROWS; i++) for (let c = 0; c < COLS; c++) {
    const cell = s.rows[i][c];
    if (!cell || !vis[i][c]) continue;
    const B = BLOCKS[cell.t];
    if (!B || !B.notice || B.chain) continue;                 // shiny things; not TNT
    const r = s.top + i;
    const v = Math.abs(r - d.r) * 2 + Math.abs(c - d.c) + (s.diggers.some(o => o !== d && o.goal && o.goal[0] === r && o.goal[1] === c) ? p.mate * 2 : 0);
    if (v < gs) { gs = v; goal = [r, c]; }
  }
  d.goal = goal;
  if (!goal) return down(s, d);                               // nothing in sight: dig down to find some
  return best(s, d, (i, c, r) => Math.abs(r - goal[0]) + Math.abs(c - goal[1]));
}

// the tea job: sit, then work (the work itself is the default job)
function tea(s, d) {
  if (s.foreTea.ph === 'break') return null;
  return POLICIES.nearest(s, d);
}

export function foremanSet(s, id, ev = () => {}) {
  if (!s.foremanHere || !foremanJobs.includes(id)) return false;
  s.crewJob = id; s.foremanPick = id;
  s.foreTea = { ph: 'break', t: 0 };
  for (const d of s.diggers) { d.tr = -1; d.tc = -1; d.goal = null; }     // they turn and walk to the new work
  emit(s, ev, 'job', { id });
  return true;
}
export const foremanGlad = s => s.foremanHere && s.crewJob === 'tea' && s.foreTea.ph === 'rush';

export const foreman = use({
  id: 'foreman',
  params: p,
  strings,
  state: {
    foremanHere: { init: () => false, survives: ['site', 'land'] },
    foremanPick: { init: () => 'nearest', survives: ['site', 'land'] },
    foreTea:     { init: () => ({ ph: 'break', t: 0 }) },
    foremanAim:  { init: () => null, transient: true },
  },
  policies: { follow, ore, down, tea },
  mods: {
    crewRate: (v, s) => foremanGlad(s) ? v * p.teaMult : v,
  },
  hooks: {
    swung(s, sw) { s.foremanAim = [sw.r, sw.c]; },
    step: { at: 590, fn(s, dt, ev) {
      if (!s.foremanHere) {
        if (s.up.crew >= p.needCrew || s.bossesDown >= p.needBoss) {
          s.foremanHere = true;
          emit(s, ev, 'foremanArrives', {});
        }
        return;
      }
      if (s.crewJob !== 'tea') return;
      const T = s.foreTea;
      T.t += dt;
      const len = T.ph === 'break' ? fold('teaBreak', s, p.teaBreak) : p.teaRush;
      if (T.t >= len) {
        T.t = 0; T.ph = T.ph === 'break' ? 'rush' : 'break';
        if (T.ph === 'break') for (const d of s.diggers) { d.tr = -1; d.tc = -1; }   // sit down
      }
    } },
    reset(s) { if (s.foremanHere) { s.crewJob = foremanJobs.includes(s.foremanPick) ? s.foremanPick : 'nearest'; s.foreTea = { ph: 'break', t: 0 }; } },
  },
  unlocks: [
    { id: 'foreman', cat: 'core', group: 'Foreman' },
    ...foremanJobs.map(j => ({ id: 'job:' + j, cat: 'core', group: 'Foreman jobs' })),
  ],
  firsts: { foremanArrives: () => 'foreman', job: d => 'job:' + d.id },
  bot: {
    shop(s, api) {
      if (!s.foremanHere || p.botJob === 'none') return 0;
      let want = p.botJob;
      if (want === 'smart') {
        const tried = (api.ctx.foreTried || (api.ctx.foreTried = []));
        want = foremanJobs.find(j => !tried.includes(j)) || 'ore';
        if (!tried.includes(want)) tried.push(want);
      }
      return s.crewJob !== want && foremanSet(s, want, api.ev) ? 1 : 0;
    },
  },
});
