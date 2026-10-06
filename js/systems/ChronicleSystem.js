// Chronicle: prestige layer 3 (docs/redesign-proposal.md §4, §6.6, roadmap R20).
//
// Three parts, all in this file so the rules live next to their data:
//
//   1. Chronicle reset and Pages. At 12 Transcends (plus Seal set I, see getSealGate) the player
//      may begin a Chronicle: the run, dust, the dust shop, Fracture Shards, the shard tree and the
//      Transcend count start again (tiers back to 14), and Chronicle Pages are paid. Pages are
//      the layer-3 currency: every Page ever earned multiplies Aether and Cosmic Dust gain
//      (spending never lowers it, same rule as dust and shards), and spent Pages buy permanent
//      Page upgrades. What resets and what is kept is listed in CHRONICLE_RESETS /
//      CHRONICLE_KEEPS and shown before the confirm.
//
//   2. Challenge runner. A challenge is a side run with rule overrides. Starting one stashes the
//      current run (Aether, run Aether, generators, shop upgrades, combo) inside the challenge record and starts
//      a fresh run; finishing or abandoning it puts the stashed run back exactly. The overrides
//      themselves are never written into GameState fields: every hook reads getActiveRules(gs),
//      which derives them from two saved ids (the running challenge and the current Chapter). So
//      a save taken mid-challenge holds only those ids and the stash, a reload re-derives the same
//      rules, and clearing the id removes every override at once. Nothing can leak.
//
//   3. Chapters. Data-driven (CHAPTERS): a Chapter is a season with world rules, its own
//      challenges and a stamp. Chapter 1 ("Sand") begins with the player's first Chronicle and
//      lasts 10 weeks of real time; a new Chapter is a new entry in CHAPTERS, nothing else.
//
// No DOM or audio imports: GameState, the sim and node tests load this on its own. Toasts and
// ceremonies are raised by js/ui/chronicle.js.
import { BigNum } from '../engine/BigNum.js';
import { resetDustShop } from './DustShopSystem.js';

const DAY_MS = 86400 * 1000;
const WEEK_MS = 7 * DAY_MS;

// ---- Gate and payout ------------------------------------------------------------------------

// Transcends (this Chronicle) needed to begin a Chronicle
export const CHRONICLE_TRANSCEND_GATE = 12;
// The doc's gate also needs Seal set I (R15). A first Chronicle also opens without the Seals at
// this many Transcends, so a Seal the player can't reach (a Tower floor, the Codex) never locks
// the layer away; the sim, which doesn't model Seals, takes this path (~day 90 casual, about when
// the doc's calendar completes Seal set I). After the first Chronicle the Seal half is met for good.
export const SEAL_STANDIN_TRANSCENDS = 24;
// Pages paid by a Chronicle: base + 1 per PAGES_STEP Transcends past the gate
export const CHRONICLE_BASE_PAGES = 3;
export const CHRONICLE_PAGES_STEP = 2;
// Every Page ever earned: x PAGE_AETHER_MULT Aether (sim-tuned: x1.5 or a dust-gain bonus
// bunched Transcends into storms after the second Chronicle; see the doc §6.6)
export const PAGE_AETHER_MULT = 1.4;
// Fracture Shards a Chronicle starts with when Ink of Memory is owned
export const INK_SHARDS = 2;
// Gilded Edges: extra Pages on every Chronicle
export const GILDED_EXTRA_PAGES = 1;
// Margin Notes: +25% Aether per challenge ever cleared (one additive category)
export const MARGIN_NOTES_PER_CLEAR = 0.25;

// What a Chronicle resets and keeps. The preview and the confirm print these; test_chronicle.js
// checks the reset does exactly this.
export const CHRONICLE_RESETS = [
  'The run: Aether, generators and shop upgrades',
  'Cosmic Dust, lifetime dust and every Dust Shop feature',
  'Fracture Shards (balance and earned) and the shard tree',
  'Transcends: the count starts again at 0, so the ladder is back to 14 generator tiers'
];
export const CHRONICLE_KEEPS = [
  'Pages, Page upgrades, Chapter stamps and challenge records',
  'Ascension count, talents and talent points, records',
  'Codex, collections and achievements',
  'Tower (floors, gear, Warden trophies), Excavation, Garden, Alchemy, Guild and Bazaar',
  'Wardens and Garden breeding stay unlocked',
  'Gold, Mana, Chrono Sand and settings'
];

// ---- Page upgrades (permanent, bought with spendable Pages) -----------------------------------

export const PAGE_UPGRADES = [
  { id: 'bookmark', name: 'Bookmark', icon: '🔖', cost: 3,
    desc: 'A Chronicle keeps Auto-Ascend and your rule: no Ascending by hand after the reset.' },
  { id: 'ink', name: 'Ink of Memory', icon: '🖋️', cost: 4,
    desc: `Begin every Chronicle with ${INK_SHARDS} Fracture Shards (×2.25 Aether and dust gain from the start).` },
  { id: 'second_reading', name: 'Second Reading', icon: '📖', cost: 5,
    desc: 'Challenges pay their Pages twice on the first clear.' },
  { id: 'margin_notes', name: 'Margin Notes', icon: '✍️', cost: 6,
    desc: `+${Math.round(MARGIN_NOTES_PER_CLEAR * 100)}% Aether for every challenge you have cleared.` },
  { id: 'dog_ear', name: 'Dog-Ear', icon: '📑', cost: 5, requires: ['bookmark'],
    desc: 'A Chronicle also keeps Long Sleep and Hourglass from the shard tree.' },
  { id: 'gilded_edges', name: 'Gilded Edges', icon: '✨', cost: 8,
    desc: `+${GILDED_EXTRA_PAGES} Page from every Chronicle.` }
];
const UPGRADE_BY_ID = new Map(PAGE_UPGRADES.map(u => [u.id, u]));
export function getPageUpgrade(id) { return UPGRADE_BY_ID.get(id) || null; }

// ---- Rules -----------------------------------------------------------------------------------
// Every override a Chapter or challenge may set. Hooks read the merged result of getActiveRules.
//   aetherMult       x Aether production (multiplies across sources)
//   excavationMult   x pickaxe power (and so Auto-Drills)
//   layerBonusesOff  dust, shard and Page multipliers count as x1 on Aether
//   comboCap         the click combo multiplier is capped at this (x1 .. x5)
//   noFrenzy         Frenzy never starts
//   noSpells         spells can't be cast (Automated Leylines rests too)
//   maxTiers         only the first n generator tiers are open
export const RULE_KEYS = {
  aetherMult: 'mult', excavationMult: 'mult', layerBonusesOff: 'flag', comboCap: 'cap',
  noFrenzy: 'flag', noSpells: 'flag', maxTiers: 'cap'
};
export const NO_RULES = Object.freeze({
  aetherMult: 1, excavationMult: 1, layerBonusesOff: false, comboCap: Infinity,
  noFrenzy: false, noSpells: false, maxTiers: Infinity
});

// Short player-facing chips for a rule set (Chapter poster, challenge cards)
export function describeRules(rules) {
  const out = [];
  for (const [k, v] of Object.entries(rules || {})) {
    if (k === 'aetherMult') out.push({ text: v >= 1 ? `🧆 Aether ×${v}` : `🧆 Aether ÷${Math.round(1 / v)}`, good: v >= 1 });
    else if (k === 'excavationMult') out.push({ text: `⛏ Excavation ×${v}`, good: v >= 1 });
    else if (k === 'layerBonusesOff' && v) out.push({ text: '🌌 Dust, shard and Page bonuses off', good: false });
    else if (k === 'comboCap') out.push({ text: `🔥 Combo caps at ×${v}`, good: false });
    else if (k === 'noFrenzy' && v) out.push({ text: '🧯 No Frenzy', good: false });
    else if (k === 'noSpells' && v) out.push({ text: '🌑 No spells', good: false });
    else if (k === 'maxTiers') out.push({ text: `🏪 Only ${v} generator tiers`, good: false });
  }
  return out;
}

// ---- Chapters (data) ----------------------------------------------------------------------------
// A new Chapter is one more entry here. validateChapters() (run by the tests) checks the shape.
// Challenge goal: run Aether (this challenge run) to reach. requires: challenges of this Chapter
// that must be cleared before this one opens.
export const CHAPTERS = [
  {
    id: 'sand', number: 1, name: 'Chapter of Sand', icon: '⏳', weeks: 10, stampPages: 3,
    blurb: 'Excavation is the engine for ten weeks: the dig hits three times as hard and the Falafel pays half. Its four challenges stay open after the Chapter ends.',
    rules: { excavationMult: 3, aetherMult: 0.5 },
    challenges: [
      { id: 'sand_dry_well', name: 'Dry Well', icon: '🧯', pages: 3, requires: 0,
        desc: 'Combo caps at ×2 and Frenzy never starts.',
        rules: { layerBonusesOff: true, comboCap: 2, noFrenzy: true }, goal: { runAether: 1e11 } },
      { id: 'sand_lights_out', name: 'Lights Out', icon: '🌑', pages: 3, requires: 0,
        desc: 'Spells can\'t be cast, and Automated Leylines rests.',
        rules: { layerBonusesOff: true, noSpells: true }, goal: { runAether: 1e11 } },
      { id: 'sand_small_souq', name: 'Small Souq', icon: '🐪', pages: 4, requires: 1,
        desc: 'Only the first 6 generators open.',
        rules: { layerBonusesOff: true, maxTiers: 6 }, goal: { runAether: 1e10 } },
      { id: 'sand_sandstorm', name: 'Sandstorm', icon: '🌪️', pages: 5, requires: 3,
        desc: 'The storm takes nine tenths of all Aether.',
        rules: { layerBonusesOff: true, aetherMult: 0.1 }, goal: { runAether: 1e10 } }
    ]
  }
];

// Merged rule sets, built once (getActiveRules runs on every production call)
function buildRuleSet(rules) {
  const r = { ...NO_RULES };
  mergeRules(r, rules);
  return Object.freeze(r);
}
const CHAPTER_BY_ID = new Map(CHAPTERS.map(c => [c.id, { ...c, ruleSet: buildRuleSet(c.rules) }]));
const CHALLENGE_BY_ID = new Map();
for (const ch of CHAPTERS) for (const c of ch.challenges) CHALLENGE_BY_ID.set(c.id, { ...c, chapter: ch.id, ruleSet: buildRuleSet(c.rules) });
export function getChapter(id) { return CHAPTER_BY_ID.get(id) || null; }
export function getChallenge(id) { return CHALLENGE_BY_ID.get(id) || null; }

// Returns a list of problems (empty = valid)
export function validateChapters(chapters = CHAPTERS) {
  const errs = [];
  const ids = new Set();
  const checkRules = (where, rules) => {
    if (!rules || typeof rules !== 'object') { errs.push(`${where}: rules missing`); return; }
    for (const [k, v] of Object.entries(rules)) {
      const kind = RULE_KEYS[k];
      if (!kind) errs.push(`${where}: unknown rule ${k}`);
      else if (kind === 'flag' && typeof v !== 'boolean') errs.push(`${where}: ${k} must be true/false`);
      else if (kind !== 'flag' && !(typeof v === 'number' && Number.isFinite(v) && v > 0)) errs.push(`${where}: ${k} must be a positive number`);
    }
  };
  chapters.forEach((ch, i) => {
    const w = `chapter ${ch?.id ?? i}`;
    if (!ch || typeof ch.id !== 'string' || !ch.id) { errs.push(`${w}: id missing`); return; }
    if (ids.has(ch.id)) errs.push(`${w}: duplicate id`);
    ids.add(ch.id);
    if (ch.number !== i + 1) errs.push(`${w}: number should be ${i + 1}`);
    if (!ch.name || !ch.icon || !ch.blurb) errs.push(`${w}: name, icon and blurb are required`);
    if (!(Number.isInteger(ch.weeks) && ch.weeks >= 1 && ch.weeks <= 26)) errs.push(`${w}: weeks must be 1-26`);
    if (!(Number.isInteger(ch.stampPages) && ch.stampPages >= 0)) errs.push(`${w}: stampPages must be a whole number`);
    checkRules(w, ch.rules);
    if (!Array.isArray(ch.challenges) || ch.challenges.length === 0) { errs.push(`${w}: no challenges`); return; }
    ch.challenges.forEach((c, j) => {
      const cw = `${w} challenge ${c?.id ?? j}`;
      if (!c || typeof c.id !== 'string' || !c.id) { errs.push(`${cw}: id missing`); return; }
      if (ids.has(c.id)) errs.push(`${cw}: duplicate id`);
      ids.add(c.id);
      if (!c.name || !c.icon || !c.desc) errs.push(`${cw}: name, icon and desc are required`);
      if (!(Number.isInteger(c.pages) && c.pages >= 1)) errs.push(`${cw}: pages must be a whole number >= 1`);
      if (!(Number.isInteger(c.requires) && c.requires >= 0 && c.requires < ch.challenges.length)) errs.push(`${cw}: requires out of range`);
      checkRules(cw, c.rules);
      const g = c.goal?.runAether;
      if (!(typeof g === 'number' && Number.isFinite(g) && g >= 1e9)) errs.push(`${cw}: goal.runAether must be a number >= 1e9`);
    });
    // At least one challenge must be open from the start
    if (!ch.challenges.some(c => c.requires === 0)) errs.push(`${w}: no challenge is open from the start`);
  });
  return errs;
}

// ---- Clock (the sim and tests swap it for virtual time) --------------------------------------
export const chronicleClock = { now: () => Date.now() };

// ---- State ------------------------------------------------------------------------------------

export function defaultChronicleState() {
  return {
    count: 0,             // Chronicles begun
    pages: 0,             // spendable
    totalPages: 0,        // every Page ever earned (the multipliers read this)
    pastTranscends: 0,    // Transcends made in earlier Chronicles (lifetime = this + transcendenceCount)
    upgrades: {},         // Page upgrade id -> true
    chapter: null,        // { id, startedAt } of the current Chapter, null before Chronicle I
    stamps: {},           // chapter id -> true once its weeks have passed
    challenges: {},       // challenge id -> { done, best (s), clears }
    active: null,         // running challenge: { id, startedAt, stash }
    lastChronicleAt: 0
  };
}

const nonNegInt = (v) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n > 0 ? n : 0; };
const posTime = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };

// The run fields a challenge stashes and restores (JSON shapes so the stash saves as-is)
function isBigJson(v) { return v && typeof v === 'object' && Number.isFinite(Number(v.m)) && Number.isFinite(Number(v.e)); }
function sanitizeStash(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!isBigJson(raw.aether) || !isBigJson(raw.totalAetherEarned)) return null;
  const buildings = {};
  if (raw.buildings && typeof raw.buildings === 'object') {
    for (const [id, n] of Object.entries(raw.buildings)) buildings[id] = nonNegInt(n);
  }
  return {
    aether: { m: Number(raw.aether.m), e: Number(raw.aether.e) },
    totalAetherEarned: { m: Number(raw.totalAetherEarned.m), e: Number(raw.totalAetherEarned.e) },
    clickPower: isBigJson(raw.clickPower) ? { m: Number(raw.clickPower.m), e: Number(raw.clickPower.e) } : { m: 1, e: 0 },
    buildings,
    // Upgrade shop ids (R5); stashes from before the shop have none
    upgrades: Array.isArray(raw.upgrades) ? raw.upgrades.filter(id => typeof id === 'string') : [],
    comboCount: nonNegInt(raw.comboCount),
    runStartedAt: posTime(raw.runStartedAt)
  };
}

// Cleans a loaded (missing, old or edited) save slice. A running challenge whose id is unknown
// (data removed) or whose stash is broken is dropped here; GameState.deserialize then restores the
// stash if there is one (see restoreOrphanStash).
export function sanitizeChronicleState(raw) {
  const s = defaultChronicleState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return s;
  s.count = nonNegInt(raw.count);
  s.pages = nonNegInt(raw.pages);
  s.totalPages = Math.max(nonNegInt(raw.totalPages), s.pages);
  s.pastTranscends = nonNegInt(raw.pastTranscends);
  if (raw.upgrades && typeof raw.upgrades === 'object') {
    for (const id of Object.keys(raw.upgrades)) if (raw.upgrades[id] === true && UPGRADE_BY_ID.has(id)) s.upgrades[id] = true;
  }
  if (raw.chapter && typeof raw.chapter === 'object' && CHAPTER_BY_ID.has(raw.chapter.id)) {
    s.chapter = { id: raw.chapter.id, startedAt: posTime(raw.chapter.startedAt) };
  }
  if (raw.stamps && typeof raw.stamps === 'object') {
    for (const id of Object.keys(raw.stamps)) if (raw.stamps[id] === true && CHAPTER_BY_ID.has(id)) s.stamps[id] = true;
  }
  if (raw.challenges && typeof raw.challenges === 'object') {
    for (const [id, r] of Object.entries(raw.challenges)) {
      if (!CHALLENGE_BY_ID.has(id) || !r || typeof r !== 'object') continue;
      const best = Number(r.best);
      s.challenges[id] = { done: r.done === true, best: Number.isFinite(best) && best > 0 ? best : null, clears: nonNegInt(r.clears) };
    }
  }
  if (raw.active && typeof raw.active === 'object') {
    const stash = sanitizeStash(raw.active.stash);
    if (stash) {
      // Unknown id: keep only the stash so the run comes back (active.id null = orphan)
      s.active = { id: CHALLENGE_BY_ID.has(raw.active.id) ? raw.active.id : null, startedAt: posTime(raw.active.startedAt), stash };
    }
  }
  s.lastChronicleAt = posTime(raw.lastChronicleAt);
  return s;
}

function stateOf(gs) {
  if (!gs.chronicle || typeof gs.chronicle !== 'object') gs.chronicle = defaultChronicleState();
  return gs.chronicle;
}

// ---- Reads used across the game (pure, cheap) ------------------------------------------------

export function getLifetimeTranscends(gs) {
  return (nonNegInt(gs?.chronicle?.pastTranscends)) + nonNegInt(gs?.transcendenceCount);
}

export function hasPageUpgrade(gs, id) { return gs?.chronicle?.upgrades?.[id] === true; }

export function getActiveChallenge(gs) {
  const id = gs?.chronicle?.active?.id;
  return id ? getChallenge(id) : null;
}

export function isChallengeActive(gs) { return !!gs?.chronicle?.active; }

// Current Chapter and whether its weeks are still running
export function getChapterStatus(gs, now = chronicleClock.now()) {
  const c = gs?.chronicle?.chapter;
  const ch = c ? getChapter(c.id) : null;
  if (!ch) return null;
  const endsAt = c.startedAt + ch.weeks * WEEK_MS;
  const elapsed = Math.max(0, now - c.startedAt);
  return {
    chapter: ch, startedAt: c.startedAt, endsAt,
    running: now < endsAt,
    week: Math.min(ch.weeks, Math.floor(elapsed / WEEK_MS) + 1),
    msLeft: Math.max(0, endsAt - now),
    pct: Math.max(0, Math.min(1, elapsed / (ch.weeks * WEEK_MS)))
  };
}

function mergeRules(into, rules) {
  for (const [k, v] of Object.entries(rules || {})) {
    const kind = RULE_KEYS[k];
    if (kind === 'mult') into[k] *= v;
    else if (kind === 'cap') into[k] = Math.min(into[k], v);
    else if (kind === 'flag') into[k] = into[k] || v === true;
  }
}

// The rule set in force right now: a running challenge's own rules, else the running Chapter's
// world rules. A challenge replaces the Chapter's rules (its goal is sized for its rules alone).
// Derived every call from saved ids; nothing here is ever written back into GameState.
export function getActiveRules(gs, now = chronicleClock.now()) {
  const c = gs?.chronicle;
  if (!c || (!c.chapter && !c.active)) return NO_RULES;
  const ch = c.active?.id ? getChallenge(c.active.id) : null;
  if (ch) return ch.ruleSet;
  const st = c.chapter ? getChapterStatus(gs, now) : null;
  return st && st.running ? st.chapter.ruleSet : NO_RULES;
}

export function getClearedCount(gs) {
  let n = 0;
  for (const r of Object.values(gs?.chronicle?.challenges || {})) if (r?.done) n++;
  return n;
}

function pagesEarned(gs) { return nonNegInt(gs?.chronicle?.totalPages); }

// x1.4 Aether per Page ever earned, x(1 + 0.25 per clear) with Margin Notes
export function getPageAetherMult(gs) {
  let m = new BigNum(PAGE_AETHER_MULT).pow(pagesEarned(gs));
  if (hasPageUpgrade(gs, 'margin_notes')) m = m.mul(1 + MARGIN_NOTES_PER_CLEAR * getClearedCount(gs));
  return m;
}

// ---- Gate ---------------------------------------------------------------------------------------

// Seal set I half of the gate, from the calendar system's getSealSetProgress(1) -> { lit, total }
// (R15). Without it (sim, tests) only the Transcend path counts. Either way SEAL_STANDIN_TRANSCENDS
// Transcends also meet it. Met for good after the first Chronicle.
export function getSealGate(gs) {
  const c = gs?.chronicle;
  if (c && c.count > 0) return { source: 'done', met: true, text: 'Seal set I' };
  const t = nonNegInt(gs?.transcendenceCount);
  const byTranscends = t >= SEAL_STANDIN_TRANSCENDS;
  const cal = gs?.calendarSystem;
  if (cal && typeof cal.getSealSetProgress === 'function') {
    const p = cal.getSealSetProgress(1) || {};
    const lit = nonNegInt(p.lit), total = Math.max(1, nonNegInt(p.total));
    return { source: 'seals', met: lit >= total || byTranscends, sealsMet: lit >= total, lit, total, need: SEAL_STANDIN_TRANSCENDS,
      text: `Seal set I (${lit}/${total} lit) or ${SEAL_STANDIN_TRANSCENDS} Transcends` };
  }
  return { source: 'standin', met: byTranscends, sealsMet: false, need: SEAL_STANDIN_TRANSCENDS,
    text: `${SEAL_STANDIN_TRANSCENDS} Transcends for the first Chronicle (stands in for Seal set I)` };
}

// Transcends needed for the next Chronicle (without Seal set I the first one needs more)
export function getChronicleTranscendsNeeded(gs) {
  const seal = getSealGate(gs);
  return seal.source === 'done' || seal.sealsMet ? CHRONICLE_TRANSCEND_GATE : Math.max(CHRONICLE_TRANSCEND_GATE, SEAL_STANDIN_TRANSCENDS);
}

export function getPendingPages(gs, transcends = gs?.transcendenceCount || 0) {
  const t = nonNegInt(transcends);
  if (t < CHRONICLE_TRANSCEND_GATE) return 0;
  return CHRONICLE_BASE_PAGES + Math.floor((t - CHRONICLE_TRANSCEND_GATE) / CHRONICLE_PAGES_STEP) +
    (hasPageUpgrade(gs, 'gilded_edges') ? GILDED_EXTRA_PAGES : 0);
}

// Why a Chronicle can't begin now (null = it can)
export function getChronicleBlockReason(gs) {
  if (isChallengeActive(gs)) return 'finish or abandon the running challenge first';
  const t = nonNegInt(gs?.transcendenceCount);
  if (t < CHRONICLE_TRANSCEND_GATE) return `needs ${CHRONICLE_TRANSCEND_GATE} Transcends (you: ${t})`;
  const seal = getSealGate(gs);
  if (!seal.met) {
    return seal.source === 'seals' ? `needs ${seal.text} (you: ${t})` : `the first Chronicle needs ${SEAL_STANDIN_TRANSCENDS} Transcends (you: ${t})`;
  }
  return null;
}

export function canChronicle(gs) { return getChronicleBlockReason(gs) === null; }

// ---- The system ------------------------------------------------------------------------------

export class ChronicleSystem {
  constructor(gameState, prestigeSystem, now = () => chronicleClock.now()) {
    this.gameState = gameState;
    this.prestigeSystem = prestigeSystem;
    this.now = now;
    stateOf(gameState);
  }

  get state() { return stateOf(this.gameState); }

  // --- Chronicle reset ---

  getBlockReason() { return getChronicleBlockReason(this.gameState); }
  canChronicle() { return canChronicle(this.gameState); }

  // Numbers for the preview panel and the confirm
  getPreview() {
    const gs = this.gameState;
    const c = this.state;
    const pages = getPendingPages(gs);
    const shardsAfter = hasPageUpgrade(gs, 'ink') ? INK_SHARDS : 0;
    const treeNodes = Object.keys(gs.shardTree?.owned || {}).filter(id => gs.shardTree.owned[id] && !gs.shardTree.granted?.[id]).length;
    return {
      number: c.count + 1,
      pages, pagesBefore: c.totalPages, pagesAfter: c.totalPages + pages,
      aetherMultBefore: new BigNum(PAGE_AETHER_MULT).pow(c.totalPages),
      aetherMultAfter: new BigNum(PAGE_AETHER_MULT).pow(c.totalPages + pages),
      transcends: gs.transcendenceCount || 0,
      transcendsNeeded: getChronicleTranscendsNeeded(gs),
      shards: gs.getShardCount ? gs.getShardCount() : 0,
      shardsAfter,
      treeNodes,
      dust: gs.totalCosmicDust,
      keepsAutoAscend: hasPageUpgrade(gs, 'bookmark') && gs.shardTree?.owned?.chronos_auto_ascend === true,
      startsChapter: !c.chapter ? CHAPTERS[0] : null,
      resets: CHRONICLE_RESETS,
      keeps: CHRONICLE_KEEPS,
      blockReason: this.getBlockReason()
    };
  }

  // Begins the next Chronicle. Returns { pages, number } or null.
  chronicle(now = this.now()) {
    const gs = this.gameState;
    if (!this.canChronicle()) return null;
    const c = this.state;
    const pages = getPendingPages(gs);
    const transcends = gs.transcendenceCount || 0;
    const tree = gs.shardTree || {};
    const hadAutoAscend = tree.owned?.chronos_auto_ascend === true;
    const hadWardens = tree.owned?.tower_wardens === true || gs.hero?.wardensUnlocked === true;
    const hadBreeding = transcends >= 1 || c.pastTranscends > 0 || gs.garden?.breedingUnlocked === true;

    // Run (like an Ascension, quietly: the epic ceremony is the Chronicle's own)
    if (this.prestigeSystem) this.prestigeSystem.ascend(true, { quiet: true });
    // Layer 1
    gs.cosmicDust = BigNum.zero();
    gs.totalCosmicDust = BigNum.zero();
    resetDustShop(gs);   // the Auto-Buy on/off preference stays, as on Transcend
    // Upgrade shop: nothing kept (Blueprint Memory is a dust-shop feature, gone with the dust)
    gs.upgrades = {};
    // Layer 2
    const startShards = new BigNum(hasPageUpgrade(gs, 'ink') ? INK_SHARDS : 0);
    gs.fractureShards = startShards;
    gs.totalFractureShards = startShards;
    c.pastTranscends += transcends;
    gs.transcendenceCount = 0;
    const fresh = {
      owned: {}, granted: {},
      autoAscend: { ...(tree.autoAscend || { enabled: true, rule: 'x2', timerMin: 30 }) },
      longWarpAt: tree.longWarpAt || 0
    };
    // Tower content stays: Wardens come back as a free node (Second Wind is bought again)
    if (hadWardens) { fresh.owned.tower_wardens = true; fresh.granted.tower_wardens = true; }
    // Bookmark keeps Auto-Ascend (free, not counted as spent shards)
    if (hadAutoAscend && hasPageUpgrade(gs, 'bookmark')) { fresh.owned.chronos_auto_ascend = true; fresh.granted.chronos_auto_ascend = true; }
    // Dog-Ear keeps the rest of the Chronos chain (free); Long Sleep needs Auto-Ascend before it,
    // so it is kept only together with it
    if (hasPageUpgrade(gs, 'dog_ear') && fresh.owned.chronos_auto_ascend) {
      for (const id of ['chronos_offline', 'chronos_long_warp']) {
        if (tree.owned?.[id] === true) { fresh.owned[id] = true; fresh.granted[id] = true; }
        else break;
      }
    }
    gs.shardTree = fresh;
    // Garden breeding was a first-Transcend unlock; keep it open
    if (hadBreeding && gs.garden) gs.garden.breedingUnlocked = true;
    // Perk-raised caps dropped (same as Transcend)
    if (typeof gs.clampLoadedTimers === 'function') gs.clampLoadedTimers();
    const hero = gs.hero;
    if (hero && gs.combatSystem?.getTotalMaxHp) hero.hp = Math.min(hero.hp, gs.combatSystem.getTotalMaxHp());

    // Layer 3
    c.count++;
    c.pages += pages;
    c.totalPages += pages;
    c.lastChronicleAt = now;
    if (!c.chapter) c.chapter = { id: CHAPTERS[0].id, startedAt: now };
    gs.runStartedAt = now;
    return { pages, number: c.count, startedChapter: c.chapter.startedAt === now ? getChapter(c.chapter.id) : null };
  }

  // --- Page upgrades ---

  getUpgradeBlockReason(id) {
    const u = getPageUpgrade(id);
    if (!u) return 'unknown upgrade';
    if (hasPageUpgrade(this.gameState, id)) return 'owned';
    for (const req of u.requires || []) if (!hasPageUpgrade(this.gameState, req)) return `needs ${getPageUpgrade(req).name}`;
    if (this.state.pages < u.cost) return `needs ${u.cost} Pages`;
    return null;
  }

  buyUpgrade(id) {
    if (this.getUpgradeBlockReason(id) !== null) return false;
    const u = getPageUpgrade(id);
    this.state.pages -= u.cost;
    this.state.upgrades[id] = true;
    return true;
  }

  // --- Chapters ---

  getChapterStatus(now = this.now()) { return getChapterStatus(this.gameState, now); }

  // Moves past finished Chapters: stamps each (paying its stampPages) and starts the next one
  // that exists right where the last ended. Returns the stamps given (for the toast).
  advanceChapters(now = this.now()) {
    const c = this.state;
    const given = [];
    for (let guard = 0; guard < CHAPTERS.length + 1; guard++) {
      const st = getChapterStatus(this.gameState, now);
      if (!st || st.running) break;
      const ch = st.chapter;
      if (!c.stamps[ch.id]) {
        c.stamps[ch.id] = true;
        c.pages += ch.stampPages;
        c.totalPages += ch.stampPages;
        given.push(ch);
      }
      const next = CHAPTERS[ch.number];   // number is 1-based: CHAPTERS[number] is the next one
      if (!next) break;                   // no newer Chapter shipped yet: stay between Chapters
      c.chapter = { id: next.id, startedAt: st.endsAt };
    }
    return given;
  }

  // --- Challenges ---

  // Challenges of every Chapter reached so far (past Chapters stay playable: no missable content)
  getAvailableChapters() {
    const st = this.state.chapter ? getChapter(this.state.chapter.id) : null;
    if (!st) return [];
    return CHAPTERS.filter(ch => ch.number <= st.number);
  }

  getChallengeBlockReason(id) {
    const ch = getChallenge(id);
    if (!ch) return 'unknown challenge';
    if (!this.getAvailableChapters().some(x => x.id === ch.chapter)) return 'opens with its Chapter';
    if (isChallengeActive(this.gameState)) return this.state.active.id === id ? 'running' : 'another challenge is running';
    const chapter = getChapter(ch.chapter);
    const cleared = chapter.challenges.filter(x => this.state.challenges[x.id]?.done).length;
    if (cleared < ch.requires) return `opens after ${ch.requires} challenge${ch.requires === 1 ? '' : 's'} of this Chapter`;
    return null;
  }

  // Stashes the current run and starts a fresh one under the challenge's rules
  startChallenge(id, now = this.now()) {
    if (this.getChallengeBlockReason(id) !== null) return false;
    const gs = this.gameState;
    const buildings = {};
    for (const [bid, b] of Object.entries(gs.buildings || {})) buildings[bid] = nonNegInt(b?.count);
    const stash = {
      aether: gs.aether.toJSON(),
      totalAetherEarned: gs.totalAetherEarned.toJSON(),
      clickPower: gs.clickPower.toJSON(),
      buildings,
      upgrades: Object.keys(gs.upgrades || {}).filter(k => gs.upgrades[k] === true),
      comboCount: nonNegInt(gs.comboCount),
      runStartedAt: posTime(gs.runStartedAt)
    };
    this.state.active = { id, startedAt: now, stash };
    resetRun(gs, now);
    return true;
  }

  // Ends the running challenge and puts the stashed run back. Returns the restored stash or null.
  abandonChallenge() {
    return restoreStash(this.gameState);
  }

  getChallengeProgress() {
    const ch = getActiveChallenge(this.gameState);
    if (!ch) return null;
    const goal = new BigNum(ch.goal.runAether);
    const have = this.gameState.totalAetherEarned;
    return { challenge: ch, goal, have, pct: Math.max(0, Math.min(1, have.div(goal).toNumber())), done: have.gte(goal) };
  }

  // Completes the running challenge if its goal is met. Returns { challenge, pages, seconds, first, best } or null.
  checkChallenge(now = this.now()) {
    const p = this.getChallengeProgress();
    if (!p || !p.done) return null;
    const c = this.state;
    const ch = p.challenge;
    const seconds = Math.max(0, (now - c.active.startedAt) / 1000);
    const rec = c.challenges[ch.id] || (c.challenges[ch.id] = { done: false, best: null, clears: 0 });
    const first = !rec.done;
    let pages = 0;
    if (first) {
      pages = ch.pages * (hasPageUpgrade(this.gameState, 'second_reading') ? 2 : 1);
      c.pages += pages;
      c.totalPages += pages;
    }
    const best = rec.best === null || seconds < rec.best;
    rec.done = true;
    rec.clears++;
    if (best) rec.best = seconds;
    restoreStash(this.gameState);
    return { challenge: ch, pages, seconds, first, best };
  }

  // Once per frame/second: Chapter turnover and challenge goal
  tick(now = this.now()) {
    const stamps = this.advanceChapters(now);
    const cleared = this.checkChallenge(now);
    return { stamps, cleared };
  }
}

// Fresh run: what an Ascension resets, without paying dust or counting an Ascension
function resetRun(gs, now) {
  gs.aether = BigNum.zero();
  gs.totalAetherEarned = BigNum.zero();
  gs.clickPower = new BigNum(1);
  gs.comboCount = 0;
  gs.comboTimer = 0;
  gs.frenzyActive = false;
  gs.frenzyTimer = 0;
  for (const b of Object.values(gs.buildings || {})) if (b) b.count = 0;
  gs.upgrades = {};
  gs.runStartedAt = now;
}

// Puts the stashed run back and clears the running challenge (also for an orphan stash whose
// challenge no longer exists). Returns the stash or null.
export function restoreStash(gs) {
  const a = gs?.chronicle?.active;
  if (!a) return null;
  const s = a.stash;
  gs.chronicle.active = null;
  if (!s) return null;
  gs.aether = BigNum.fromJSON(s.aether);
  gs.totalAetherEarned = BigNum.fromJSON(s.totalAetherEarned);
  gs.clickPower = BigNum.fromJSON(s.clickPower);
  for (const [id, b] of Object.entries(gs.buildings || {})) if (b) b.count = s.buildings?.[id] || 0;
  gs.upgrades = {};
  for (const id of s.upgrades || []) gs.upgrades[id] = true;
  gs.comboCount = s.comboCount || 0;
  gs.comboTimer = 0;
  gs.frenzyActive = false;
  gs.frenzyTimer = 0;
  gs.runStartedAt = s.runStartedAt || 0;
  return s;
}
