// Talent point economy (roadmap R9, docs/gamification-roadmap.md section 3).
// Points come from three sources, all tracked in `gameState.records` (lifetime: neither Ascension
// nor Transcend resets it):
//   S1 Milestone Stars   one-off, finite, log-paced (STAR_DEFS + the Transcend ladder)
//   S2 Record Ascension  magnitudeStars = max(0, floor(log10(bestRunDust)) - 3), grant the difference
//   S3 Guild Rank        rank = floor((C / 8)^(1/1.4)), C = lifetime contracts claimed
//                        (BountySystem.claimBounty calls recordContractClaim once per claim)
// Pure data and functions, no audio or particle imports, so GameState can import it.
import { BigNum } from '../engine/BigNum.js';
import { getLifetimeTranscends } from './ChronicleSystem.js';

export const RECORD_DUST_OFFSET = 3;     // S2 calibration knob
export const GUILD_EXPONENT = 1.4;       // S3 calibration knob (lower is faster)
export const GUILD_BASE = 8;             // contracts for rank 1
export const GUILD_SEALS_PER_RANK = 5;
export const TRANSCEND_FIRST_STAR = 3;   // first Transcend pays 3, each later one pays 1
export const FIRST_ASCENSION_STARS = 2;

const STRATUM_DEPTHS = [26, 51, 76, 101, 126, 151];
const TOWER_ZONE_FLOORS = [51, 151, 301, 501, 751, 1001];
const CATALYST_MARKS = [10, 25, 50];
const HARVEST_STARS = [
  { seed: 'frost_petal', name: 'Rose of Taif' },
  { seed: 'void_orchid', name: 'Date Palm' },
  { seed: 'star_lotus', name: 'Sidr Tree' }
];

// One-off S1 stars. `value(gs)` is the player's current progress, `goal` the threshold; a star is
// earned when value >= goal. Codex sets (wave 2, roadmap 5.3) add more entries when they exist.
export const STAR_DEFS = [
  { id: 'first_ascension', group: 'New Well', label: 'First New Well', tp: FIRST_ASCENSION_STARS, goal: 1,
    value: gs => gs.ascensionCount || 0 },
  ...STRATUM_DEPTHS.map(d => ({ id: `depth_${d}`, group: 'Excavation', label: `Depth ${d}`, tp: 1, goal: d,
    value: gs => gs.miningGrid?.maxDepth || 0 })),
  ...TOWER_ZONE_FLOORS.map(f => ({ id: `floor_${f}`, group: 'Tower', label: `Tower floor ${f}`, tp: 1, goal: f,
    value: gs => gs.hero?.maxFloor || 0 })),
  ...HARVEST_STARS.map(h => ({ id: `harvest_${h.seed}`, group: 'Garden', label: `First ${h.name} harvest`, tp: 1, goal: 1,
    value: gs => (gs.records?.harvested?.[h.seed] ? 1 : 0) })),
  ...CATALYST_MARKS.map(c => ({ id: `catalysts_${c}`, group: 'Alchemy', label: `${c} Catalysts`, tp: 1, goal: c,
    value: gs => gs.alchemy?.catalysts || 0 }))
];

export const SOURCE_LABELS = { stars: 'Milestone Stars', record: 'Record New Well', guild: 'Guild Rank' };

export function defaultRecords() {
  return {
    bestRunDust: BigNum.zero(),   // largest pending dust of any single Ascension (S2)
    magnitudeStars: 0,            // stars already paid for that record
    stars: {},                    // S1 star ids already paid
    transcendPaid: 0,             // Transcends already paid (S1)
    harvested: {},                // seed ids harvested at least once
    contractsClaimed: 0,          // lifetime contracts that counted toward Guild Rank (S3)
    guildRank: 0,
    contractBucket: null,         // unused since R10 (the board paces claims); kept so saves round-trip
    earned: { stars: 0, record: 0, guild: 0 } // points granted per source (header)
  };
}

// log10 of a BigNum (0 for <= 0)
export function bigLog10(b) {
  if (!b || !(b.m > 0)) return 0;
  return b.e + Math.log10(b.m);
}

export function magnitudeStarsFor(bestRunDust) {
  return Math.max(0, Math.floor(bigLog10(bestRunDust) + 1e-9) - RECORD_DUST_OFFSET);
}

export function guildRankFor(contracts) {
  const c = Math.max(0, Math.floor(Number(contracts) || 0));
  // tiny epsilon so exact thresholds (8 -> rank 1) are not lost to float error
  return Math.floor(Math.pow(c / GUILD_BASE, 1 / GUILD_EXPONENT) + 1e-9);
}
export function contractsForRank(rank) {
  return Math.ceil(GUILD_BASE * Math.pow(rank, GUILD_EXPONENT) - 1e-9);
}
export function guildTitle(rank) {
  const titles = [[0, 'Unranked'], [1, 'Errand Runner'], [3, 'Courier'], [6, 'Journeyman'], [10, 'Contractor'],
    [15, 'Veteran'], [20, 'Warden of the Guild'], [30, 'Master Contractor'], [40, 'Guildmaster']];
  let t = titles[0][1];
  for (const [r, name] of titles) if (rank >= r) t = name;
  return t;
}

// ---- grants -------------------------------------------------------------------------------

const listeners = [];
// UI hook: fn({ amount, source, reason }) after every grant
export function onTalentGrant(fn) { listeners.push(fn); }

export function ensureRecords(gs) {
  if (!gs.records || typeof gs.records !== 'object') gs.records = defaultRecords();
  return gs.records;
}

// The one place talent points enter the economy. source: 'stars' | 'record' | 'guild'
export function grantTalentPoints(gs, amount, source, reason = '') {
  amount = Math.floor(amount);
  if (amount <= 0) return 0;
  const rec = ensureRecords(gs);
  gs.talentPoints += amount;
  rec.earned[source] = (rec.earned[source] || 0) + amount;
  for (const fn of listeners) {
    try { fn({ amount, source, reason }); } catch (e) { console.error(e); }
  }
  return amount;
}

// S1: pays every star whose goal is met and that is not paid yet. Cheap; safe to poll.
export function checkMilestones(gs) {
  const rec = ensureRecords(gs);
  let total = 0;
  for (const def of STAR_DEFS) {
    if (rec.stars[def.id]) continue;
    if (def.value(gs) >= def.goal) {
      rec.stars[def.id] = true;
      total += grantTalentPoints(gs, def.tp, 'stars', def.label);
    }
  }
  // Transcend ladder: first +3, then +1 each
  const t = getLifetimeTranscends(gs);
  while (rec.transcendPaid < t) {
    rec.transcendPaid++;
    total += grantTalentPoints(gs, rec.transcendPaid === 1 ? TRANSCEND_FIRST_STAR : 1, 'stars',
      rec.transcendPaid === 1 ? 'First New Field' : `New Field ${rec.transcendPaid}`);
  }
  return total;
}

export function recordHarvest(gs, seedId) {
  const rec = ensureRecords(gs);
  if (!rec.harvested[seedId]) rec.harvested[seedId] = true;
}

// S2: call on every Ascension with the dust that Ascension pays. Returns points granted.
export function recordAscensionDust(gs, pendingDust) {
  const rec = ensureRecords(gs);
  const dust = pendingDust instanceof BigNum ? pendingDust : new BigNum(pendingDust || 0);
  if (dust.gt(rec.bestRunDust)) rec.bestRunDust = dust;
  const stars = magnitudeStarsFor(rec.bestRunDust);
  if (stars <= rec.magnitudeStars) return 0;
  const gained = stars - rec.magnitudeStars;
  rec.magnitudeStars = stars;
  return grantTalentPoints(gs, gained, 'record', `Record New Well 1e${stars + RECORD_DUST_OFFSET}`);
}

// S3: BountySystem.claimBounty calls this once per claimed contract that should count toward Guild Rank.
// Each rank-up pays +1 talent point and +5 Guild Seals. Returns { rank, ranksGained, points }.
export function recordContractClaim(gs, count = 1) {
  const rec = ensureRecords(gs);
  rec.contractsClaimed += Math.max(0, Math.floor(count));
  const rank = guildRankFor(rec.contractsClaimed);
  const gained = Math.max(0, rank - rec.guildRank);
  if (gained > 0) {
    rec.guildRank = rank;
    gs.guildSeals = (gs.guildSeals || 0) + GUILD_SEALS_PER_RANK * gained;
    grantTalentPoints(gs, gained, 'guild', `Guild Rank ${rank}`);
  }
  return { rank: rec.guildRank, ranksGained: gained, points: gained };
}

// ---- loading ------------------------------------------------------------------------------

// Reads a saved records object; anything missing or junk falls back to the default
export function sanitizeRecords(raw) {
  const d = defaultRecords();
  if (!raw || typeof raw !== 'object') return d;
  const num = (v) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 0 ? n : 0; };
  const rec = {
    bestRunDust: BigNum.fromJSON(raw.bestRunDust),
    magnitudeStars: num(raw.magnitudeStars),
    stars: raw.stars && typeof raw.stars === 'object' ? { ...raw.stars } : {},
    transcendPaid: num(raw.transcendPaid),
    harvested: raw.harvested && typeof raw.harvested === 'object' ? { ...raw.harvested } : {},
    contractsClaimed: num(raw.contractsClaimed),
    guildRank: num(raw.guildRank),
    contractBucket: raw.contractBucket && typeof raw.contractBucket === 'object' ? { ...raw.contractBucket } : null,
    earned: { ...d.earned }
  };
  for (const k of Object.keys(d.earned)) rec.earned[k] = num(raw.earned?.[k]);
  return rec;
}

export function serializeRecords(rec) {
  if (!rec) return null;
  return { ...rec, bestRunDust: rec.bestRunDust.toJSON(), stars: { ...rec.stars }, harvested: { ...rec.harvested },
    earned: { ...rec.earned }, contractBucket: rec.contractBucket ? { ...rec.contractBucket } : null };
}

// Saves from before R9 have no records. Mark everything the save already shows as paid, without
// granting: those players got their points from the old rules (+3 per Ascension, 20% bounty roll)
// and their talentPoints / spentTalentPoints are kept as saved.
//  - S1: every star whose goal is already met; Transcends so far
//  - Harvest stars: seeds the save still holds or has planted (the old save logged no first harvest)
//  - S2: bestRunDust = lifetime dust, an upper bound on any single run, so nothing is paid twice
//  - S3: contracts claimed = stats.totalBountiesCompleted (the rank is already earned)
export function seedRecords(gs) {
  const rec = defaultRecords();
  gs.records = rec;
  const garden = gs.garden;
  if ((gs.stats?.totalPlantsHarvested || 0) > 0 && garden) {
    for (const h of HARVEST_STARS) {
      const planted = (garden.plots || []).some(p => p && p.seed === h.seed);
      if ((garden.inventory?.[h.seed] || 0) > 0 || planted) rec.harvested[h.seed] = true;
    }
  }
  for (const def of STAR_DEFS) {
    if (def.value(gs) >= def.goal) rec.stars[def.id] = true;
  }
  rec.transcendPaid = getLifetimeTranscends(gs);
  rec.bestRunDust = gs.totalCosmicDust instanceof BigNum ? gs.totalCosmicDust : BigNum.zero();
  rec.magnitudeStars = magnitudeStarsFor(rec.bestRunDust);
  rec.contractsClaimed = Math.max(0, Math.floor(gs.stats?.totalBountiesCompleted || 0));
  rec.guildRank = guildRankFor(rec.contractsClaimed);
  return rec;
}

// ---- header: nearest sources -------------------------------------------------------------

const clamp01 = x => Math.max(0, Math.min(1, x));

// Up to `limit` unpaid sources, nearest first. { id, source, label, tp, progress 0..1, text }
// transcendGate: BigNum lifetime dust needed for the next Transcend (optional, adds that row)
export function getNextStars(gs, limit = 3, transcendGate = null) {
  const rec = ensureRecords(gs);
  const out = [];
  const nextOf = group => STAR_DEFS.filter(d => d.group === group && !rec.stars[d.id])
    .sort((a, b) => a.goal - b.goal)[0];
  for (const group of ['New Well', 'Excavation', 'Tower', 'Alchemy']) {
    const d = nextOf(group);
    if (!d) continue;
    const v = Math.min(d.goal, d.value(gs));
    out.push({ id: d.id, source: 'stars', label: d.label, tp: d.tp, progress: v / d.goal,
      text: group === 'New Well' ? 'not yet' : `${Math.floor(v)}/${d.goal}` });
  }
  const seed = HARVEST_STARS.find(h => !rec.harvested[h.seed] && !rec.stars[`harvest_${h.seed}`]);
  if (seed) out.push({ id: `harvest_${seed.seed}`, source: 'stars', label: `First ${seed.name} harvest`, tp: 1, progress: 0, text: 'not yet' });

  if (transcendGate) {
    const t = getLifetimeTranscends(gs);
    const p = clamp01(bigLog10(gs.totalCosmicDust) / Math.max(1, bigLog10(transcendGate)));
    out.push({ id: 'transcend_next', source: 'stars', label: t === 0 ? 'First New Field' : `New Field ${t + 1}`,
      tp: t === 0 ? TRANSCEND_FIRST_STAR : 1, progress: p, text: `${Math.round(p * 100)}%` });
  }

  // S2: progress through the next order of magnitude of the best run
  const nextExp = rec.magnitudeStars + RECORD_DUST_OFFSET + 1;
  const best = bigLog10(rec.bestRunDust);
  const p2 = clamp01(best - (nextExp - 1));
  out.push({ id: 'record', source: 'record', label: `Record New Well 1e${nextExp}`, tp: 1,
    progress: p2, text: `${Math.round(p2 * 100)}%` });

  // S3
  const nextRank = rec.guildRank + 1;
  const need = contractsForRank(nextRank);
  const prev = contractsForRank(rec.guildRank);
  out.push({ id: 'guild', source: 'guild', label: `Guild Rank ${nextRank}`, tp: 1,
    progress: clamp01((rec.contractsClaimed - prev) / Math.max(1, need - prev)), text: `${rec.contractsClaimed}/${need}` });

  return out.sort((a, b) => b.progress - a.progress).slice(0, limit);
}
