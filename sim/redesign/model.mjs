// Core-loop redesign model (docs/core-loop-redesign.md). Pure functions over a plain, cloneable
// state object; all numbers come from params.mjs. run.mjs drives it through a profile's schedule.
import { P } from './params.mjs';

const LOG10 = Math.log10;
export const FRAC = { gas: 0, naphtha: 1, kerosene: 2, diesel: 3, bitumen: 4 };
const FIELD_FRAC = [FRAC.kerosene, FRAC.diesel, FRAC.bitumen];   // tower, mine, oasis
const OASIS = 2;
const NF = P.fields.length;

// --- RNG (mulberry32, state lives in s.rng so a cloned state replays identically) ---------------
export function rand(s) {
  s.rng = (s.rng + 0x6D2B79F5) | 0;
  let a = s.rng;
  a = Math.imul(a ^ (a >>> 15), a | 1);
  a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
  return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
}

// Mixer recipes: pairs of Fields cycle (tower+mine, mine+oasis, oasis+tower); grades spread from
// `from` up to `from + span` over the batch
function buildRecipes(count, from, span) {
  const pairs = [[0, 1], [1, 2], [2, 0]];
  const out = [];
  for (let i = 0; i < count; i++) {
    const [fa, fb] = pairs[i % 3];
    const ga = from + Math.floor((i * span) / count);
    out.push({ fa, ga, fb, gb: Math.max(0, ga - 1 - (i % 2)), found: false, made: 0, tier: 0 });
  }
  return out;
}

export function newState(profile, seed = 1) {
  return {
    t: 0, rng: seed | 0, charter: profile.charter, gusherCatch: profile.gusherCatch,
    crude: P.startCrude, runCrude: 0, probeCrude: 0, runStart: 0, bestRunChron: 0, recordAtChron: 0, monthBest: [],
    b: new Array(P.slots + 1).fill(0), a: new Array(P.slots + 1).fill(0),
    pressure: 0, pressureBest: 0, flare: 1, gens: P.slots, recordMark: 0,
    wells: 0, resLife: 0, newFields: 0, totalFields: 0, shares: 0, chronicles: 0, pages: 0,
    lastResetAt: 0,
    trials: Object.fromEntries(P.trials.map(([id]) => [id, { unlocked: null, won: false }])),
    fields: P.fields.map(() => ({
      F: 0, bestGrade: 0, inv: [0], rig: 0, rigBest: 0,
      hours: new Array(P.actionsPerField).fill(0), ranks: new Array(P.actionsPerField).fill(0)
    })),
    frac: Object.keys(FRAC).map(() => ({ level: 0, bub: 0, vial: 0, extra: 0 })),
    orders: new Array(P.orderSlots).fill(null).map(() => ({ empty: true, refillAt: 0 })),
    caul: P.cauldrons.map(() => ({ fill: 0, n: 0, bars: 0, speed: 1 })),
    bubbles: [],
    vials: {}, vialOffers: 0, vialDay: -1,
    recipes: buildRecipes(P.recipes, 0, P.recipeGradeMax),
    seals: { hours: new Array(P.seals).fill(0), tier: new Array(P.seals).fill(0) }, crew: 0,
    heatT: 0, handField: 0,
    events: [], log: true,
    orderStats: { posted: 0, filledIn24h: 0, postedTimes: {} },
    weekly: { week: -1, need: null }, bestEver: 0, recordTimes: [],
    flags: { overflow: false }
  };
}

// --- multipliers --------------------------------------------------------------------------------
export const fracVal = (s, i) => (1 + s.frac[i].bub + s.frac[i].vial + s.frac[i].extra) * Math.pow(P.orderMult, s.frac[i].level);
const layerMult = (s) => (1 + P.resPer * s.resLife) * Math.pow(P.shareMult, s.shares) * Math.pow(P.pageMult, s.pages);
const heatOf = (s) => 1 + Math.min(1, s.heatT / P.heatRamp);
const charter = (s) => P.charter[s.charter] || {};
export const openTiers = (s) => s.gens;
const topTier = (s) => { for (let k = P.slots; k >= 1; k--) if (s.b[k] > 0) return k; return 0; };
// Upgrades in slot k: generators g in 9..gens with ((g - 9) % slots) + 1 === k
const slotLevel = (s, k) => (s.gens - P.slots >= k ? Math.floor((s.gens - P.slots - k) / P.slots) + 1 : 0);
function unlockGenerators(s) {
  const best = s.bestEver > 0 ? LOG10(s.bestEver) : -Infinity;
  let want = P.slots;
  while (want < P.generators && best >= P.genLog0 + P.genLogStep * (want + 1 - (P.slots + 1))) want++;
  while (s.gens < want) { s.gens++; event(s, 'tier', 3, { tier: s.gens }); }
}

function event(s, k, lvl, extra) {
  if (s.log) s.events.push({ t: s.t, k, lvl, ...(extra || {}) });
}

// Well output multiplier in a presence state
function wellMult(s, st) {
  let m = layerMult(s) * Math.pow(P.pMult, s.pressure) * fracVal(s, FRAC.naphtha);
  if (st === 'away') m *= P.awayWell;
  else if (st === 'hands') m *= 1 + P.handsWell * (heatOf(s) - 1);
  return m;
}
function tierRate(s, k, top, wm) {
  return P.tierRate * Math.pow(P.genMult, slotLevel(s, k)) * Math.pow(P.buyTenMult, Math.floor(s.b[k] / 10)) * (k === top ? s.flare : 1) * (k === 1 ? wm : 1);
}
export function crudePerSec(s, st = 'watch') {
  const top = topTier(s);
  return s.a[1] * tierRate(s, 1, top, wellMult(s, st));
}

// --- Well: exact cascade over dt (constant rates within the step) -------------------------------
// new a_j = Σ_m a_{j+m} · Π_{i=j+1..j+m} r_i · dt^m / m!, with a_0 = Crude made
function wellStep(s, dt, st) {
  const N = topTier(s);
  if (N === 0) return 0;
  const wm = wellMult(s, st);
  const r = new Array(N + 1);
  for (let k = 1; k <= N; k++) r[k] = tierRate(s, k, N, wm);
  const a = s.a, next = new Array(N + 1);
  for (let j = 0; j <= N; j++) {
    let sum = j === 0 ? 0 : a[j], coef = 1;
    for (let m = 1; j + m <= N; m++) {
      coef *= (r[j + m] * dt) / m;
      if (coef === 0) break;
      sum += a[j + m] * coef;
    }
    next[j] = sum;
  }
  for (let j = 1; j <= N; j++) a[j] = next[j];
  return next[0];
}

const tierCostLog = (s, k) => P.costA * k + P.costB * k * k + (P.stepA + P.stepB * k) * Math.floor(s.b[k] / 10);
const pressureCostLog = (s) => P.pA + P.pB * s.pressure;

// "Max all": tiers top-down in 10-packs (or what fits), then Pressure
function buyAll(s) {
  for (let k = P.slots; k >= 1; k--) {
    for (let guard = 0; guard < 40; guard++) {
      if (s.crude <= 0) return;
      const cl = tierCostLog(s, k), lc = LOG10(s.crude);
      if (lc < cl) break;
      const want = 10 - (s.b[k] % 10);
      const n = Math.min(want, Math.floor(Math.pow(10, lc - cl) + 1e-9));
      if (n <= 0) break;
      s.crude -= n * Math.pow(10, cl);
      s.b[k] += n; s.a[k] += n;
      if (n < want) break;
    }
  }
  for (let guard = 0; guard < 200 && s.crude > 0 && LOG10(s.crude) >= pressureCostLog(s); guard++) {
    s.crude -= Math.pow(10, pressureCostLog(s));
    s.pressure++;
  }
  if (s.pressure > s.pressureBest) s.pressureBest = s.pressure;
  if (s.crude < 0) s.crude = 0;
}

function maybeFlare(s, manual) {
  const top = topTier(s);
  if (top < 2 || s.a[1] <= 1) return;
  const m = Math.pow(LOG10(s.a[1]) / P.flareDiv, 2);
  if (m < s.flare * P.flareMinGain) return;
  s.flare = m;
  for (let k = 1; k < top; k++) s.a[k] = s.b[k];
  if (manual) event(s, 'flare', 2);
}

// --- prestige ------------------------------------------------------------------------------------
const pendingReserves = (s) => (s.runCrude < P.wellMin ? 0 : Math.floor(P.resBase * Math.pow(LOG10(s.runCrude / P.wellMin), P.resPow)));

function resetRun(s) {
  s.crude = P.startCrude; s.runCrude = 0; s.runStart = s.t;
  s.a.fill(0); s.b.fill(0); s.pressure = 0; s.flare = 1;
}

function maybeNewWell(s) {
  const p = pendingReserves(s);
  if (p < Math.max(5, P.wellGain * s.resLife) || s.t - s.runStart < P.wellMinRunSec) return false;
  s.resLife += p; s.wells++;
  for (const [id, kind, n] of P.trials) if (kind === 'well' && s.wells === n) s.trials[id].unlocked = s.t;
  resetRun(s);
  return true;
}

export const fieldGateLog = (s) => P.fieldLog0 + P.fieldLogStep * s.newFields + P.fieldLogPerChronicle * s.chronicles;

function maybeNewField(s) {
  if (!(s.bestRunChron > 0) || LOG10(s.bestRunChron) < fieldGateLog(s)) return false;
  s.newFields++; s.totalFields++; s.shares += P.sharesPerField; s.resLife = 0;
  s.lastResetAt = s.t;
  resetRun(s);
  // Choice: a Rig in each Field first, then alternate Crew and the lowest Rig's level
  const noRig = s.fields.findIndex(f => f.rig === 0);
  if (noRig >= 0) s.fields[noRig].rig = 1;
  else if (s.crew < P.crewBase + s.chronicles) s.crew++;
  else s.fields.reduce((lo, f) => (f.rig < lo.rig ? f : lo)).rig++;
  for (const [id, kind, n] of P.trials) if (kind === 'field' && s.totalFields === n) s.trials[id].unlocked = s.t;
  event(s, 'field', 3, { n: s.totalFields });
  return true;
}

function maybeChronicle(s) {
  const need = s.chronicles === 0 ? P.chronFirstFields : P.chronFields;
  if (s.newFields < need) return false;
  if (s.chronicles > 0 && s.bestRunChron < P.chronRecord * s.recordAtChron) return false;
  const slowed = s.t - s.lastResetAt >= P.chronSlowDays * 86400;
  if (s.newFields < P.chronFullFields && !slowed) return false;
  const pages = P.pageBase + Math.floor((Math.min(s.newFields, P.chronFullFields) - P.chronFields) / P.pageStep);
  s.pages += pages; s.chronicles++;
  s.recordAtChron = Math.max(s.recordAtChron, s.bestRunChron); s.bestRunChron = 0;
  s.newFields = 0; s.shares = Math.floor(s.pages * P.startSharesPerPage); s.resLife = 0; s.lastResetAt = s.t;
  for (const f of s.fields) if (f.rig > 1) f.rig = 1;
  const top = Math.max(...s.fields.map(f => f.bestGrade));
  s.recipes.push(...buildRecipes(P.recipesPerChronicle, top, 4));
  resetRun(s);
  event(s, 'chronicle', 4, { pages });
  return true;
}

// --- Fields --------------------------------------------------------------------------------------
export const rankSum = (f) => f.ranks.reduce((x, y) => x + Math.min(y, P.rankHours.length), 0);
const fieldSpeed = (s) => Math.pow(P.pFieldMult, s.pressureBest);
export function fieldPower(s, i, st) {
  let p = P.fieldBase[i] * fracVal(s, FIELD_FRAC[i]) * (1 + P.schoolPower * rankSum(s.fields[i]) / P.actionsPerField);
  if (st === 'hands') p *= heatOf(s) * fracVal(s, FRAC.gas);
  return p;
}
const gradeOf = (F) => Math.floor(F / P.gradeSpan);
export const rigGrade = (f) => gradeOf(Math.min(P.rigReachMax, P.rigReach0 + P.rigReachStep * (f.rig - 1)) * f.F);
export const rigEff = (f) => P.rigEffBase + P.rigEffMastery * (rankSum(f) / P.actionsPerField) / P.rankHours.length;
export function rigRate(s, i, st) {
  const f = s.fields[i];
  if (f.rig === 0) return 0;
  const c = charter(s);
  let pr = P[st];
  if (st === 'watch') pr *= c.watch || 1;
  if (st === 'away') pr = Math.min(P.awayCap * P.watch, pr * (c.away || 1) * Math.pow(fracVal(s, FRAC.bitumen), P.awayBitumenExp));
  return P.rigBase * f.rig * rigEff(f) * fieldSpeed(s) * pr;
}
// Hand farming in Field i: handMult x that Field's Rig rate (Watching), at least handFloor; no Heat
// One hour of a Field's farming at the Watching rate (the unit Essence prices are quoted in)
const fieldHour = (s, i) => 3600 * Math.max(rigRate(s, i, 'watch'), P.handFloor);
// Hand farming (any Field): handMult x the average Rig rate (Watching), at least handFloor; no Heat.
// Tied to the average, not the Field in hand, so Hands-on stays ~3x Watching whatever the Rig mix
export const handRateBase = (s) => {
  let m = 0;
  for (let i = 0; i < NF; i++) m += rigRate(s, i, 'watch') / NF;
  return P.handMult * Math.max(m, P.handFloor) * (charter(s).hand || 1);
};

function addInv(f, g, units) {
  while (f.inv.length <= g) f.inv.push(0);
  f.inv[g] += units;
}
const invAtLeast = (f, g) => { let n = 0; for (let k = g; k < f.inv.length; k++) n += f.inv[k]; return n; };
function takeAtLeast(f, g, units) {
  for (let k = g; k < f.inv.length && units > 0; k++) {
    const x = Math.min(f.inv[k], units); f.inv[k] -= x; units -= x;
  }
}

// Hours on an action needed for rank r+1: the named ranks, then Legend II, III, ... every legendHours
export const rankThreshold = (r) => (r < P.rankHours.length ? P.rankHours[r] : P.rankHours[P.rankHours.length - 1] + P.legendHours * (r - P.rankHours.length + 1));
export function addMastery(s, i, hours) {
  const f = s.fields[i];
  for (let a = 0; a < P.actionsPerField; a++) {
    f.hours[a] += hours * P.actionShare[a];
    while (f.hours[a] >= rankThreshold(f.ranks[a])) {
      f.ranks[a]++;
      const past = f.ranks[a] - P.rankHours.length;   // ranks past Legend
      event(s, 'rank', past === 0 || (past > 0 && (past + 1) % P.legendTitleEvery === 0) ? 4 : 2, { field: i, rank: f.ranks[a] });
    }
  }
}

function fieldsStep(s, dt, st) {
  const out = { units: 0, rigs: 0 };
  for (let i = 0; i < NF; i++) {
    const f = s.fields[i];
    if (st === 'hands' && s.handField === i) {
      const x = (LOG10(fieldPower(s, i, st)) - f.F / P.levelsPerDecade[i]) * P.sigK;
      f.F += (P.vMax / (1 + Math.exp(-x))) * dt;
      const g = gradeOf(f.F);
      if (g > f.bestGrade) { f.bestGrade = g; event(s, 'grade', 3, { field: i, grade: g }); }
      const u = handRateBase(s) * heatOf(s) * dt;
      addInv(f, g, u); out.units += u;
      addMastery(s, i, dt / 3600);
    }
    const rr = rigRate(s, i, st) * dt;
    if (rr > 0) {
      const rg = rigGrade(f);
      // A Rig reaching a new grade brings a Material it has never hauled before
      if (rg > f.rigBest) { f.rigBest = rg; event(s, 'rigGrade', 3, { field: i, grade: rg }); }
      addInv(f, rg, rr); out.units += rr; out.rigs++;
      addMastery(s, i, (P.rigMasteryShare * dt) / 3600);
    }
  }
  return out;
}

// --- Refinery ------------------------------------------------------------------------------------
const bubbleCost = (c, i) => P.cauldronC0[P.cauldrons[i]] * Math.pow(c.n + 1, P.bubbleExp);
const bubbleEffect = (L) => (P.bubbleA * L) / (P.bubbleB + L);
function recomputeBubbles(s) {
  for (const fr of s.frac) fr.bub = 0;
  for (const b of s.bubbles) s.frac[b.f].bub += bubbleEffect(b.level);
}

// Fill-seconds per Cauldron, scale-free (raw Material units grow with Pressure and would run away)
function cauldronFill(s, dt, st, rigs) {
  const add = [st === 'hands' ? dt : 0, st === 'watch' ? dt : 0, (st === 'hands' ? dt : 0) + rigs * P.sandsPerRig * dt, st === 'away' ? dt : 0];
  s.caul.forEach((c, i) => { c.fill += add[i] * c.speed; });
}
// Brewing is a tap, so it happens while the player is there
function brew(s) {
  s.caul.forEach((c, i) => {
    for (let guard = 0; guard < 50 && c.fill >= bubbleCost(c, i); guard++) {
      c.fill -= bubbleCost(c, i);
      c.bars++;
      if (c.bars % P.upgradeEvery === 0) { c.speed += P.cauldronSpeed; continue; }
      c.n++;
      s.bubbles.push({ f: s.bubbles.length % 5, level: 1 });
      event(s, 'bubble', 2, { cauldron: i });
      if (s.bubbles.length % P.bubbleFamily === 0) event(s, 'bubbleFamily', 3, { n: s.bubbles.length / P.bubbleFamily });
    }
  });
  recomputeBubbles(s);
}

function orderField(s, src) {
  if (src !== 'any') return P.fields.indexOf(src);
  let best = 0, most = -1;
  s.fields.forEach((f, i) => { const n = invAtLeast(f, 0); if (n > most) { most = n; best = i; } });
  return best;
}
function postOrders(s) {
  for (const o of s.orders) {
    if (!o.empty || s.t < o.refillAt) continue;
    const taken = new Set(s.orders.filter(x => !x.empty).map(x => x.frac));
    let frac = 0, lo = Infinity;
    s.frac.forEach((fr, i) => { if (!taken.has(i) && fr.level < lo) { lo = fr.level; frac = i; } });
    const fi = orderField(s, P.orderSource[Object.keys(FRAC)[frac]]);
    const f = s.fields[fi];
    const grade = f.rig > 0 ? rigGrade(f) : Math.max(0, gradeOf(f.F) - 1);
    const qty = P.orderSeconds * (rigRate(s, fi, 'watch') + P.orderHandShare * handRateBase(s));
    Object.assign(o, { empty: false, frac, field: fi, grade, qty, posted: s.t });
    s.orderStats.posted++;
  }
}
function fillOrders(s) {
  for (const o of s.orders) {
    if (o.empty) continue;
    const f = s.fields[o.field];
    if (invAtLeast(f, o.grade) < o.qty) continue;
    takeAtLeast(f, o.grade, o.qty);
    s.frac[o.frac].level++;
    s.vialOffers++;
    if (s.t - o.posted <= 86400) s.orderStats.filledIn24h++;
    event(s, 'order', 2, { frac: o.frac });
    Object.assign(o, { empty: true, refillAt: s.t + P.orderRefill });
  }
}
// Units of a Field that open Orders still need
function reserved(s, fi) {
  let n = 0;
  for (const o of s.orders) if (!o.empty && o.field === fi) n += o.qty;
  return n;
}
function surplus(s, fi) { return Math.max(0, invAtLeast(s.fields[fi], 0) - reserved(s, fi)); }

// The weekly big Order: every Field's Materials at its Rig grade, sized to weeklyHours of Rig output
function weeklyOrder(s) {
  const week = Math.floor(s.t / (7 * 86400));
  const w = s.weekly;
  if (week !== w.week && s.fields.every(f => f.rig > 0)) {
    w.week = week;
    w.need = s.fields.map((f, i) => ({ grade: rigGrade(f), qty: P.weeklyHours * 3600 * rigRate(s, i, 'watch') }));
  }
  if (!w.need) return;
  if (!w.need.every((n, i) => invAtLeast(s.fields[i], n.grade) >= n.qty + reserved(s, i))) return;
  w.need.forEach((n, i) => takeAtLeast(s.fields[i], n.grade, n.qty));
  for (const fr of s.frac) fr.level++;
  w.need = null;
  event(s, 'weekly', 4);
}

function vials(s) {
  const day = Math.floor(s.t / 86400);
  if (day !== s.vialDay) { s.vialDay = day; s.vialOffers += P.vialOffersPerDay; }
  s.fields.forEach((f, i) => {
    for (let g = 0; g <= f.bestGrade; g++) {
      const key = i + ':' + g;
      const v = s.vials[key] || (s.vials[key] = { tier: 0, pity: 0 });
      if (v.tier > 0 || s.vialOffers <= 0 || (f.inv[g] || 0) < 1) continue;
      s.vialOffers--; f.inv[g] -= 1;
      if (rand(s) < P.vialChance || v.pity >= P.vialPity - 1) {
        v.tier = 1; s.frac[FIELD_FRAC[i]].vial += P.vialPerTier;
        event(s, 'vial', 2, { key });
      } else v.pity++;
    }
  });
  // Tier-ups with surplus Essence (Oasis units)
  for (const [key, v] of Object.entries(s.vials)) {
    if (v.tier === 0 || v.tier >= P.vialTiers) continue;
    const cost = P.vialTierHours[v.tier - 1] * fieldHour(s, OASIS);
    if (surplus(s, OASIS) < cost) continue;
    takeAtLeast(s.fields[OASIS], 0, cost);
    v.tier++; s.frac[FIELD_FRAC[+key.split(':')[0]]].vial += P.vialPerTier;
    event(s, 'vialTier', 3, { key, tier: v.tier });
  }
}

function bubbleLevels(s) {
  for (let guard = 0; guard < 200; guard++) {
    let best = null;
    for (const b of s.bubbles) if (!best || b.level < best.level) best = b;
    if (!best) return;
    const cost = P.bubbleLevelHours * Math.pow(P.bubbleCostGrowth, best.level - 1) * fieldHour(s, OASIS);
    if (surplus(s, OASIS) < cost) return;
    takeAtLeast(s.fields[OASIS], 0, cost);
    best.level++;
  }
}

function mixer(s) {
  let remade = false;
  for (const r of s.recipes) {
    const A = s.fields[r.fa], B = s.fields[r.fb];
    if (invAtLeast(A, r.ga) < 1 || invAtLeast(B, r.gb) < 1) continue;
    if (!r.found) {
      if (rand(s) >= P.mixerChance) continue;
      r.found = true; r.made = 1;
      takeAtLeast(A, r.ga, 1); takeAtLeast(B, r.gb, 1);
      s.frac[FIELD_FRAC[r.fa]].extra += 0.02;
      event(s, 'compound', 3);
      continue;
    }
    // Re-make toward Gilded / Royal with surplus
    if (remade || r.tier >= P.compoundTiers.length) continue;
    const ca = P.remakeHours * fieldHour(s, r.fa), cb = P.remakeHours * fieldHour(s, r.fb);
    if (surplus(s, r.fa) < ca || surplus(s, r.fb) < cb || invAtLeast(A, r.ga) < ca || invAtLeast(B, r.gb) < cb) continue;
    takeAtLeast(A, r.ga, ca); takeAtLeast(B, r.gb, cb);
    remade = true;
    r.made++;
    if (r.made >= P.compoundTiers[r.tier]) {
      r.tier++;
      if (r.tier >= 2) { s.frac[FIELD_FRAC[r.fa]].extra += 0.02; event(s, r.tier === 2 ? 'gilded' : 'royal', r.tier === 2 ? 3 : 4); }
    }
  }
}

function sealsStep(s, dt) {
  if (s.crew <= 0) return;
  const { hours, tier } = s.seals;
  const open = [];
  for (let i = 0; i < P.seals; i++) if (tier[i] < P.sealHours.length && s.t >= i * P.sealEveryDays * 86400) open.push(i);
  // Every open Seal advances on time, faster with more Crew; Seals open a month apart, so tiers stay staggered
  for (const i of open) {
    hours[i] += ((1 + P.sealCrewBonus * s.crew) * dt) / 3600;
    while (tier[i] < P.sealHours.length && hours[i] >= P.sealHours[tier[i]]) {
      tier[i]++;
      s.frac[i % 5].extra += 0.03 * tier[i];
      event(s, 'seal', tier[i] >= P.sealBigTier ? 4 : 3, { seal: i, tier: tier[i] });
    }
  }
}

// Which Field to work by hand: the one an open Order is shortest on, else the lowest frontier
export function chooseField(s) {
  let best = -1, need = 0;
  for (let i = 0; i < NF; i++) {
    let d = 0;
    for (const o of s.orders) if (!o.empty && o.field === i) d += Math.max(0, o.qty - invAtLeast(s.fields[i], o.grade));
    if (d > need) { need = d; best = i; }
  }
  if (best >= 0) return best;
  let lo = 0;
  s.fields.forEach((f, i) => { if (f.F < s.fields[lo].F) lo = i; });
  return lo;
}

// Everything the player does with a tap while there: brew, Orders, Vials, Mixer, levels
export function refineryActions(s, { resets = true } = {}) {
  brew(s);
  postOrders(s);
  fillOrders(s);
  weeklyOrder(s);
  vials(s);
  mixer(s);
  bubbleLevels(s);
  if (resets) maybeChronicle(s) || maybeNewField(s);
}

// Trials: won at the first Hands-on stretch long enough, some time after unlock
export function trials(s, stretchSec) {
  for (const [id] of P.trials) {
    const tr = s.trials[id];
    if (tr.won || tr.unlocked === null || s.t - tr.unlocked < P.trialDelay || stretchSec < P.trialMinSec) continue;
    tr.won = true;
    event(s, 'trial', 4, { id });
  }
}

// --- one step ------------------------------------------------------------------------------------
export function advance(s, dt, st) {
  if (st === 'hands') s.heatT += dt; else s.heatT = 0;
  const made = wellStep(s, dt, st);
  s.crude += made; s.runCrude += made; s.probeCrude += made;
  // Gushers while Watching: a catch pays gusherSeconds of Crude and Rig output
  if (st === 'watch') {
    const x = (dt / P.gusherEvery) * s.gusherCatch * (charter(s).gusher || 1);
    const n = Math.floor(x) + (rand(s) < x - Math.floor(x) ? 1 : 0);
    if (n > 0) {
      const c = crudePerSec(s, 'watch') * P.gusherSeconds * n;
      s.crude += c; s.runCrude += c; s.probeCrude += c;
      for (let i = 0; i < NF; i++) {
        const u = rigRate(s, i, 'watch') * P.gusherSeconds * n;
        if (u > 0) addInv(s.fields[i], rigGrade(s.fields[i]), u);
      }
      event(s, 'gusher', 1);
      // A catch is a tap: the player is at the screen and checks the Refinery too
      if (!s.probe) refineryActions(s, { resets: false });
    }
  }
  const { rigs } = fieldsStep(s, dt, st);
  cauldronFill(s, dt, st, rigs);
  sealsStep(s, dt);
  postOrders(s);
  const here = st === 'hands';
  if (here || (s.trials.autoWell.won && s.trials.autoBuy.won)) maybeNewWell(s);
  if (here || s.trials.autoBuy.won) buyAll(s);
  if (here || s.trials.autoFlare.won) maybeFlare(s, here && !s.trials.autoFlare.won);
  if (s.runCrude > s.bestRunChron) s.bestRunChron = s.runCrude;
  // A new all-time best run by at least x10 (an order of magnitude): tracked for the ceiling target
  if (s.runCrude > s.bestEver) {
    // a new all-time best by x10 over the last marked record (tracked for the ceiling target)
    if (s.runCrude > 10 * s.recordMark && !s.probe) { s.recordMark = s.runCrude; s.recordTimes.push(s.t); }
    s.bestEver = s.runCrude;
    unlockGenerators(s);
  }
  const m = Math.floor(s.t / (30 * 86400));
  if (!(s.monthBest[m] >= s.runCrude)) s.monthBest[m] = s.runCrude;
  if (!Number.isFinite(s.crude) || s.crude > 1e300 || s.a.some(x => !Number.isFinite(x))) s.flags.overflow = true;
  s.t += dt;
}

// Material value of a state: Σ units x (grade + 1), for presence probes
export function materialValue(s) {
  let v = 0;
  for (const f of s.fields) f.inv.forEach((u, g) => { v += u * (g + 1); });
  return v;
}
