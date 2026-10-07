// Progressive tab unlocking (R7, docs/gamification-roadmap.md §2). Pure logic, no DOM: the UI
// (js/ui/unlocks.js) calls checkUnlocks a few times a second and reveals each new tab once.
//
// State on GameState: unlocks = { [tabId]: unlockedAtMs }, unlockSeen = { [tabId]: true }.
// Unlocks never re-lock: nothing (Ascension, Transcend, Chronicle) ever removes an entry.

import { BigNum } from '../engine/BigNum.js';
import { RECIPES, HYBRID_RECIPES } from './AlchemySystem.js';

// Always open, never stored. Community (R40) too: a new player can hit a bug on day one.
export const ALWAYS_UNLOCKED = ['monolith', 'settings', 'about', 'community'];

// Run Aether at which Ascension starts paying dust (PrestigeSystem's 1e9 gate)
export const ASCEND_AETHER_GATE = 1e9;

const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const maxFloor = (gs) => n(gs.hero?.maxFloor);
const maxDepth = (gs) => n(gs.miningGrid?.maxDepth);
const ascensions = (gs) => n(gs.ascensionCount);
const achievementCount = (gs) => (gs.achievementSystem?.getUnlockedCount
  ? gs.achievementSystem.getUnlockedCount()
  : Object.keys(gs.achievements || {}).length);

// Floor-N boss beaten = the hero has climbed past floor N
const bossTrigger = (floor) => (gs) => ({ have: Math.min(floor, Math.max(0, maxFloor(gs) - 1)), need: floor, done: maxFloor(gs) > floor });

function canBrewAny(gs) {
  const alc = gs.alchemySystem;
  if (n(gs.stats?.totalPotionsBrewed) > 0) return true;
  return !!alc?.canBrew && [...RECIPES, ...HYBRID_RECIPES].some(r => alc.canBrew(r.id));
}

function pendingDust(gs) {
  try {
    const d = gs.prestigeSystem?.getPendingCosmicDust?.();
    return d ? d.gt(0) : false;
  } catch {
    return false;
  }
}

function log10(b) {
  return b && b.m > 0 ? Math.log10(b.m) + b.e : 0;
}

// The unlock table, in reveal order. The teaser shows the first locked entry.
// trigger(gs) -> { have, need, done, pct? }; label(p) is the teaser line; gift(gs) the starter gift
export const UNLOCKS = [
  {
    tab: 'codex', icon: '🏆', name: 'Codex',
    trigger: (gs) => ({ have: Math.min(3, achievementCount(gs)), need: 3, done: achievementCount(gs) >= 3 }),
    label: (p) => `Unlock 3 achievements · ${p.have}/3`,
    flavour: 'Your Teta started a scrapbook. Each achievement is +1.5% Oil.'
  },
  {
    tab: 'combat', icon: '🩴', name: 'Void Tower',
    trigger: (gs) => { const c = n(gs.buildings?.tapper?.count); return { have: Math.min(10, c), need: 10, done: c >= 10 }; },
    label: (p) => `Own 10 Shawarma Stalls · ${p.have}/10`,
    flavour: 'Your 10th stall hired a bouncer. He wants a fight.'
  },
  {
    tab: 'mining', icon: '🛻', name: 'Excavation',
    trigger: bossTrigger(20),
    label: (p) => `Defeat the floor-20 boss · floor ${p.have}/20`,
    flavour: "Grandpa's old shovel fell from the boss!",
    gift: (gs) => { gs.inventory.stone = n(gs.inventory.stone) + 30; return '+30 stone'; }
  },
  {
    tab: 'spells', icon: '🦅', name: 'Grimoire',
    trigger: bossTrigger(40),
    label: (p) => `Defeat the floor-40 boss · floor ${p.have}/40`,
    flavour: 'The floor-40 boss dropped a dusty grimoire.',
    gift: (gs) => { gs.mana = Math.max(n(gs.mana), n(gs.maxMana)); return 'Mana refilled'; }
  },
  {
    tab: 'bounties', icon: '📜', name: 'Bounties',
    trigger: (gs) => ({ have: Math.min(10, maxDepth(gs)), need: 10, done: maxDepth(gs) >= 10 }),
    label: (p) => `Reach depth 10 in Excavation · ${p.have}/10`,
    flavour: 'The guild noticed your digging. They have chores.'
  },
  {
    tab: 'garden', icon: '🌴', name: 'Garden',
    trigger: (gs) => ({ have: Math.min(15, maxDepth(gs)), need: 15, done: maxDepth(gs) >= 15 }),
    label: (p) => `Reach depth 15 in Excavation · ${p.have}/15`,
    flavour: 'Hasawi seeds in the sand!',
    gift: (gs) => {
      if (!gs.garden?.inventory) return null;
      gs.garden.inventory.spore = n(gs.garden.inventory.spore) + 2;
      return '+2 Mint seeds';
    }
  },
  {
    tab: 'alchemy', icon: '☕', name: 'Alchemy',
    trigger: (gs) => { const ok = canBrewAny(gs); return { have: ok ? 1 : 0, need: 1, done: ok }; },
    label: () => 'Hold a gem and 2 essences of one recipe',
    flavour: 'Khalti found her old Vimto pot. Time to brew.'
  },
  {
    tab: 'prestige', icon: '🚀', name: 'New Well',
    // Gate decided in R7: open when Ascension pays dust (or after one), not the roadmap's
    // floor 100 + depth 25, which would push a casual first Ascension past the 30-min target
    trigger: (gs) => {
      const done = ascensions(gs) >= 1 || pendingDust(gs);
      const pct = done ? 1 : Math.max(0, Math.min(1, log10(gs.totalAetherEarned) / Math.log10(ASCEND_AETHER_GATE)));
      return { have: pct, need: 1, pct, done };
    },
    label: () => `Earn ${new BigNum(ASCEND_AETHER_GATE).format('standard', 0)} Oil in one run`,
    flavour: 'Cap the well, drill a new one and bank Crude Reserves.'
  },
  {
    tab: 'talents', icon: '🌙', name: 'Constellations',
    trigger: (gs) => ({ have: Math.min(1, ascensions(gs)), need: 1, done: ascensions(gs) >= 1 }),
    label: () => 'Drill a New Well once',
    flavour: 'Your first Talent Point is waiting in the stars.'
  },
  {
    tab: 'leaderboard', icon: '🏅', name: 'Leaderboard',
    trigger: (gs) => ({ have: Math.min(1, ascensions(gs)), need: 1, done: ascensions(gs) >= 1 }),
    label: () => 'Drill a New Well once',
    flavour: 'The whole diwaniya wants to know your floor.'
  },
  {
    tab: 'calendar', icon: '☕', name: 'Dallah',
    // R7 pick (not in the roadmap table): with the first Ascension, as the day-2 return hook
    trigger: (gs) => ({ have: Math.min(1, ascensions(gs)), need: 1, done: ascensions(gs) >= 1 }),
    label: () => 'Drill a New Well once',
    flavour: 'Teta poured you a cup. Come back tomorrow for another.'
  },
  {
    tab: 'market', icon: '🐪', name: 'Bazaar',
    trigger: (gs) => {
      const a = Math.min(2, ascensions(gs)), f = Math.min(150, maxFloor(gs));
      return { have: a + f / 75, need: 4, pct: (a / 2 + f / 150) / 2, done: ascensions(gs) >= 2 && maxFloor(gs) >= 150 };
    },
    label: (gs) => `Drill a New Well twice (${Math.min(2, ascensions(gs))}/2) and reach floor 150 (${Math.min(150, maxFloor(gs))}/150)`,
    labelUsesState: true,
    flavour: 'The camel traders let you into the souq.'
  },
  {
    tab: 'chronicle', icon: '📖', name: 'Chronicle',
    // R7 pick: shown from the first Transcend (the next layer up), like Transcend from Ascension 1
    trigger: (gs) => {
      const done = n(gs.transcendenceCount) >= 1 || n(gs.chronicle?.count) > 0;
      return { have: done ? 1 : 0, need: 1, done };
    },
    label: () => 'Open a New Oil Field once',
    flavour: 'An old book opens itself. The third layer begins.'
  }
];

export const UNLOCK_BY_TAB = new Map(UNLOCKS.map(u => [u.tab, u]));
export const ALL_TABS = [...ALWAYS_UNLOCKED, ...UNLOCKS.map(u => u.tab)];

export function isTabUnlocked(gs, tab) {
  if (ALWAYS_UNLOCKED.includes(tab)) return true;
  if (!UNLOCK_BY_TAB.has(tab)) return true; // unknown ids (old content, tests) are never gated
  return !!gs?.unlocks?.[tab];
}

// Live progress for a locked tab: { have, need, done, pct, text }
export function getUnlockProgress(gs, tab) {
  const def = UNLOCK_BY_TAB.get(tab);
  if (!def) return null;
  let p;
  try { p = def.trigger(gs); } catch { p = { have: 0, need: 1, done: false }; }
  const pct = p.pct ?? (p.need > 0 ? Math.max(0, Math.min(1, p.have / p.need)) : 1);
  const text = def.labelUsesState ? def.label(gs) : def.label(p);
  return { ...p, pct, text };
}

// Marks every met trigger as unlocked. Returns the newly unlocked defs, in table order.
export function checkUnlocks(gs, now = Date.now()) {
  if (!gs.unlocks || typeof gs.unlocks !== 'object') gs.unlocks = {};
  const fresh = [];
  for (const def of UNLOCKS) {
    if (gs.unlocks[def.tab]) continue;
    let done = false;
    try { done = !!def.trigger(gs).done; } catch { done = false; }
    if (!done) continue;
    gs.unlocks[def.tab] = now;
    fresh.push(def);
  }
  return fresh;
}

// Credits a newly revealed tab's starter gift; returns its text (or null)
export function grantStarterGift(gs, def) {
  if (!def?.gift) return null;
  try { return def.gift(gs) || null; } catch { return null; }
}

// Tabs shown as teasers: the first locked tab in table order, plus the Ascension teaser (the
// session-1 goal) once the Tower is open. The tab after the first teaser stays hidden.
export function getTeasers(gs) {
  const out = [];
  const first = UNLOCKS.find(u => !isTabUnlocked(gs, u.tab));
  if (first) out.push(first.tab);
  if (!isTabUnlocked(gs, 'prestige') && isTabUnlocked(gs, 'combat') && !out.includes('prestige')) out.push('prestige');
  return out;
}

export function isUnlockNew(gs, tab) {
  return UNLOCK_BY_TAB.has(tab) && isTabUnlocked(gs, tab) && !gs.unlockSeen?.[tab];
}

export function markUnlockSeen(gs, tab) {
  if (!UNLOCK_BY_TAB.has(tab) || !isTabUnlocked(gs, tab)) return;
  if (!gs.unlockSeen || typeof gs.unlockSeen !== 'object') gs.unlockSeen = {};
  gs.unlockSeen[tab] = true;
}

// Load-time cleanup: keep only known tab ids with sane values
export function sanitizeUnlocks(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const def of UNLOCKS) {
    const v = Number(raw[def.tab]);
    if (raw[def.tab] && Number.isFinite(v) && v > 0) out[def.tab] = v;
    else if (raw[def.tab] === true) out[def.tab] = 1;
  }
  return out;
}

export function sanitizeUnlockSeen(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const def of UNLOCKS) if (raw[def.tab]) out[def.tab] = true;
  return out;
}
