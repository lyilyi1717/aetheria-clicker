// Daily and weekly structure (R15, docs/redesign-proposal.md §4.1, §8; roadmap §5.4).
// Daily Dallah, Weekly Ledger, Souq Rotation and the Seven Seals of Transcendence.
//
// No dark patterns: nothing here ever takes progress away. A missed day banks (up to 3, there is
// no streak and "days visited" is a lifetime count), a missed week just rotates and the Ledger
// loses nothing permanent, lit Seals never go dark, and Souq modifiers are always positive and
// come back. The clock only ever moves these forward: every "now" is clamped to the highest day
// and week already seen, so setting the clock back neither re-pays a day nor loses one.
//
// This module has no audio/DOM imports so GameState (and node tests) can load it on its own.
// Notices go out through `system.notify`, which js/ui/calendar.js points at rewards.notify.
import { bigLog10 } from './TalentSources.js';

const DAY_MS = 86400000;

// ---- calendar helpers (local time zone, weeks Monday to Sunday) -------------------------------

// Local calendar day number (days since 1970-01-01 in the player's own time zone)
export function dayIndexOf(ms) {
  const d = new Date(ms);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
}

// Day 4 (1970-01-05) was a Monday, so a week starts when (day + 3) is a multiple of 7
export function weekIndexOfDay(day) {
  return Math.floor((day + 3) / 7);
}

export function weekIndexOf(ms) {
  return weekIndexOfDay(dayIndexOf(ms));
}

// Local-time ms of the next Monday 00:00 after `ms`
export function nextMondayMs(ms) {
  const d = new Date(ms);
  const sinceMonday = (dayIndexOf(ms) + 3) % 7; // 0 on Monday
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (7 - sinceMonday)).getTime();
}

// ---- rules and rewards ----------------------------------------------------------------------

export const DALLAH_BANK_MAX = 3;             // unclaimed days that can wait
export const DALLAH_SAND = 60;                // Chrono Sand per day claimed
export const DALLAH_COFFEE_SECONDS = 3600;    // "fresh coffee" buff length
export const DALLAH_COFFEE_MULT = 1.25;       // +25% Aether (additive with other Aether buffs)
export const COFFEE_BUFF_ID = 'dallah_coffee';
export const LEDGER_GOAL_COUNT = 3;
export const LEDGER_GOAL_SEALS = 6;           // Guild Seals per Ledger goal
export const SEAL_SHARD_BONUS_MAX = 3;        // +1 shard per lit Seal at each Transcend, up to +3

// Ledger goals: progress is "how much the lifetime counter has grown since the week began", so
// nothing here needs a hook in the system that owns the counter. `ok(gs)` keeps a goal out of the
// draw until the player has met the system it asks about ("goals drawn from unlocked tabs").
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
export const LEDGER_GOALS = [
  { id: 'bosses', icon: '💀', label: 'Defeat 2 Tower bosses', target: 2, stat: gs => n(gs.stats?.totalBossesSlain), ok: gs => n(gs.hero?.maxFloor) >= 10 },
  { id: 'fiends', icon: '⚔️', label: 'Slay 60 Tower fiends', target: 60, stat: gs => n(gs.stats?.totalMonstersSlain), ok: gs => true },
  { id: 'depths', icon: '⛏️', label: 'Descend 3 depths', target: 3, stat: gs => n(gs.miningGrid?.maxDepth), ok: gs => n(gs.miningGrid?.maxDepth) >= 1 && n(gs.miningGrid?.maxDepth) < 150 },
  { id: 'blocks', icon: '🧱', label: 'Excavate 150 blocks', target: 150, stat: gs => n(gs.stats?.totalBlocksMined), ok: gs => !!gs.miningGrid },
  { id: 'harvest', icon: '🌱', label: 'Harvest 12 plants', target: 12, stat: gs => n(gs.stats?.totalPlantsHarvested), ok: gs => !!gs.garden },
  { id: 'brew', icon: '🧪', label: 'Brew 5 potions or Catalysts', target: 5, stat: gs => n(gs.stats?.totalPotionsBrewed), ok: gs => !!gs.alchemy },
  { id: 'spells', icon: '✨', label: 'Cast 15 spells', target: 15, stat: gs => n(gs.stats?.totalSpellsCast), ok: gs => n(gs.stats?.totalSpellsCast) > 0 || n(gs.ascensionCount) > 0 },
  { id: 'contracts', icon: '📜', label: 'Complete 5 contracts', target: 5, stat: gs => n(gs.stats?.totalBountiesCompleted), ok: gs => true },
  { id: 'ascend', icon: '🚀', label: 'Ascend 3 times', target: 3, stat: gs => n(gs.ascensionCount), ok: gs => n(gs.ascensionCount) >= 1 },
  { id: 'clicks', icon: '🧆', label: 'Click the Monolith 300 times', target: 300, stat: gs => n(gs.totalClicks), ok: gs => true }
];
const GOAL_BY_ID = new Map(LEDGER_GOALS.map(g => [g.id, g]));

// Seals of Transcendence (roadmap §5.1, tier I). Lifetime flags: a lit Seal never goes dark.
// `value` is the player's progress, `goal` the bar; `pct` for the progress bar is value / goal.
export const SEALS = [
  { id: 'deep', icon: '🪨', name: 'Deep', short: 'd100', desc: 'Reach depth 100 in Excavation', goal: 100, value: gs => n(gs.miningGrid?.maxDepth) },
  { id: 'tower', icon: '🏢', name: 'Tower', short: 'f501', desc: 'Reach Tower floor 501 (Kingdom Centre)', goal: 501, value: gs => n(gs.hero?.maxFloor) },
  { id: 'oasis', icon: '🌳', name: 'Oasis', short: '25 cat.', desc: 'Brew 25 Catalysts', goal: 25, value: gs => n(gs.alchemy?.catalysts) },
  { id: 'rebirth', icon: '🔮', name: 'Rebirth', short: '15 asc.', desc: 'Ascend 15 times', goal: 15, value: gs => n(gs.ascensionCount) },
  { id: 'guild', icon: '📜', name: 'Guild', short: 'rank 7', desc: 'Reach Guild Rank 7', goal: 7, value: gs => n(gs.records?.guildRank) },
  { id: 'stars', icon: '✨', name: 'Stars', short: '1e8 dust', desc: 'Pay 1e8 Cosmic Dust in one Ascension', goal: 8, value: gs => bigLog10(gs.records?.bestRunDust) },
  { id: 'memory', icon: '📖', name: 'Memory', short: '40% codex', desc: 'Fill 40% of the Codex', goal: 40, value: gs => n(gs.collectionSystem?.getCodexPercent?.()) }
];

// Souq Rotation: one gentle modifier a week, always positive, cycling so each one returns
export const SOUQ_ROTATION = [
  { id: 'truffle', icon: '🍄', name: 'Truffle Season', desc: 'Desert Truffle grows ×1.5.' },
  { id: 'falcon', icon: '🦅', name: 'Falcon Week', desc: 'Tower boss gold ×1.5.' },
  { id: 'hourglass', icon: '⏳', name: 'Hourglass Week', desc: 'Chrono Sand gained ×1.5.' },
  { id: 'rosewater', icon: '🌹', name: 'Rosewater Week', desc: 'Every Garden plant grows ×1.25.' }
];

// ---- saved state (additive; saves without it get defaults) ------------------------------------

export function defaultCalendarState() {
  return {
    daily: { lastDay: null, bank: 0, visits: 0, claimedDays: 0 },
    weekly: { week: null, firstWeek: null, goals: [], stamps: [] },
    seals: {}                                  // id -> true once lit
  };
}

const int = (v, min = 0) => {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null;
  const x = Math.floor(Number(v));
  return Number.isFinite(x) && x >= min ? x : null;
};

export function sanitizeCalendarState(raw) {
  const s = defaultCalendarState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return s;
  const d = raw.daily || {};
  s.daily.lastDay = int(d.lastDay, -1e9);
  s.daily.bank = Math.min(DALLAH_BANK_MAX, int(d.bank) ?? 0);
  s.daily.visits = int(d.visits) ?? 0;
  s.daily.claimedDays = int(d.claimedDays) ?? 0;
  const w = raw.weekly || {};
  s.weekly.week = int(w.week, -1e9);
  s.weekly.firstWeek = int(w.firstWeek, -1e9);
  if (Array.isArray(w.goals)) {
    for (const g of w.goals.slice(0, LEDGER_GOAL_COUNT)) {
      if (!g || !GOAL_BY_ID.has(g.id)) continue;
      s.weekly.goals.push({ id: g.id, base: n(g.base), done: g.done === true });
    }
  }
  if (Array.isArray(w.stamps)) {
    s.weekly.stamps = [...new Set(w.stamps.map(x => int(x, 1)).filter(x => x !== null))].sort((a, b) => a - b);
  }
  if (raw.seals && typeof raw.seals === 'object') {
    for (const seal of SEALS) if (raw.seals[seal.id] === true) s.seals[seal.id] = true;
  }
  return s;
}

// Small seeded PRNG so a week's goals are the same on every device and reload
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class CalendarSystem {
  // clock: () => ms, injectable for tests
  constructor(gameState, clock = () => Date.now()) {
    this.gameState = gameState;
    this.clock = clock;
    this.notify = () => {};            // js/ui/calendar.js points this at rewards.notify
    if (!gameState.calendar) gameState.calendar = defaultCalendarState();
    gameState.calendarSystem = this;
  }

  get state() {
    const gs = this.gameState;
    if (!gs.calendar || typeof gs.calendar !== 'object') gs.calendar = defaultCalendarState();
    return gs.calendar;
  }

  // ---- clock ----------------------------------------------------------------------------------

  // Today, never earlier than the latest day already counted (clock rollback cannot re-pay a
  // day or move the Ledger back a week)
  getToday() {
    const day = dayIndexOf(this.clock());
    const last = this.state.daily.lastDay;
    return last !== null && last > day ? last : day;
  }

  getWeek() {
    const week = weekIndexOfDay(this.getToday());
    const cur = this.state.weekly.week;
    return cur !== null && cur > week ? cur : week;
  }

  // ms until the Ledger rotates (Monday 00:00 local); 0 while the clock is behind the high-water mark
  getMsToRotation() {
    const now = this.clock();
    if (weekIndexOf(now) < this.getWeek()) return 0;
    return Math.max(0, nextMondayMs(now) - now);
  }

  // Run about once a second: new day, new week, Seals, Ledger progress
  tick() {
    this.updateDaily();
    this.updateWeekly();
    this.updateSeals();
    this.updateLedger();
  }

  // ---- Daily Dallah ---------------------------------------------------------------------------

  updateDaily() {
    const d = this.state.daily;
    const day = dayIndexOf(this.clock());
    if (d.lastDay === null) {
      d.lastDay = day; d.bank = 1; d.visits = 1;
      return true;
    }
    if (day <= d.lastDay) return false;                 // same day, or the clock went back
    d.bank = Math.min(DALLAH_BANK_MAX, d.bank + (day - d.lastDay));
    d.visits += 1;                                      // visits count days seen, not days elapsed
    d.lastDay = day;
    return true;
  }

  getDaily() {
    const d = this.state.daily;
    return { bank: d.bank, visits: d.visits, claimedDays: d.claimedDays, canClaim: d.bank > 0, max: DALLAH_BANK_MAX };
  }

  // Claims every banked day at once: 60 sand and one bonus contract per day, one fresh-coffee
  // buff (a longer bank does not stack the buff). Returns { days, sand, contracts } or null.
  claimDaily() {
    this.updateDaily();
    const d = this.state.daily;
    const gs = this.gameState;
    const days = d.bank;
    if (days <= 0) return null;
    d.bank = 0;
    d.claimedDays += days;

    const sand = gs.addChronoSand(DALLAH_SAND * days);
    let contracts = 0;
    for (let i = 0; i < days; i++) {
      if (gs.bountySystem?.grantBonusContract?.()) contracts++;
    }
    this.giveCoffee();
    this.notify({
      tier: 'medium', kind: 'dallah', icon: '☕', color: '#e7c38a',
      title: days > 1 ? `Dallah poured: ${days} days` : 'Dallah poured',
      detail: `+${sand} Chrono Sand${contracts ? ` · +${contracts} contract${contracts > 1 ? 's' : ''}` : ''} · +25% Aether for 1 h`
    });
    return { days, sand, contracts };
  }

  // Fresh coffee: +25% Aether for 1 h. Tagged `fixed` so the 10-minute buff cap leaves it alone.
  giveCoffee() {
    const buffs = this.gameState.activeBuffs;
    const existing = buffs.find(b => b.id === COFFEE_BUFF_ID);
    if (existing) {
      existing.duration = DALLAH_COFFEE_SECONDS;
      existing.maxDuration = DALLAH_COFFEE_SECONDS;
      return existing;
    }
    const buff = {
      id: COFFEE_BUFF_ID, name: 'Fresh Coffee', type: 'aether_mult', value: DALLAH_COFFEE_MULT,
      duration: DALLAH_COFFEE_SECONDS, maxDuration: DALLAH_COFFEE_SECONDS, fixed: true
    };
    buffs.push(buff);
    return buff;
  }

  // ---- Weekly Ledger --------------------------------------------------------------------------

  updateWeekly() {
    const w = this.state.weekly;
    const week = weekIndexOfDay(dayIndexOf(this.clock()));
    if (w.week !== null && week <= w.week) return false;  // same week, or the clock went back
    if (w.firstWeek === null) w.firstWeek = week;
    w.week = week;
    w.goals = this.drawGoals(week).map(def => ({ id: def.id, base: def.stat(this.gameState), done: false }));
    return true;
  }

  // Three distinct goals from those the player can already do, the same for a given week
  drawGoals(week) {
    const rand = mulberry32(Math.imul(week, 2654435761) ^ 0x9e3779b9);
    const pool = LEDGER_GOALS.filter(g => { try { return g.ok(this.gameState); } catch { return false; } });
    const picked = [];
    while (picked.length < LEDGER_GOAL_COUNT && pool.length) {
      picked.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
    }
    return picked;
  }

  // Credits finished goals (6 Guild Seals each) and the week's stamp when all are done
  updateLedger() {
    const w = this.state.weekly;
    const gs = this.gameState;
    if (w.week === null) return;
    for (const g of w.goals) {
      const def = GOAL_BY_ID.get(g.id);
      const cur = def.stat(gs);
      if (cur < g.base) g.base = cur;                    // a counter that was reset: start over from here
      if (g.done || cur - g.base < def.target) continue;
      g.done = true;
      gs.guildSeals = (gs.guildSeals || 0) + LEDGER_GOAL_SEALS;
      this.notify({
        tier: 'medium', kind: 'ledger-goal', icon: def.icon, color: '#fbbf24',
        title: 'Ledger goal done', batchTitle: '{n} Ledger goals done', detail: `${def.label} · +${LEDGER_GOAL_SEALS} Guild Seals`
      });
    }
    const number = this.getWeekNumber();
    if (w.goals.length === LEDGER_GOAL_COUNT && w.goals.every(g => g.done) && !w.stamps.includes(number)) {
      w.stamps.push(number);
      this.notify({
        tier: 'medium', kind: 'ledger-stamp', icon: '🖋️', color: '#fbbf24',
        title: `Ledger stamp: Week ${number}`, detail: 'All three goals done'
      });
    }
  }

  // 1 for the first week the Ledger was seen, then 2, 3 ... (calendar weeks, gaps included)
  getWeekNumber() {
    const w = this.state.weekly;
    return w.week === null || w.firstWeek === null ? 1 : w.week - w.firstWeek + 1;
  }

  getLedger() {
    const w = this.state.weekly;
    const gs = this.gameState;
    const goals = w.goals.map(g => {
      const def = GOAL_BY_ID.get(g.id);
      const have = Math.max(0, Math.min(def.target, def.stat(gs) - g.base));
      return { id: g.id, icon: def.icon, label: def.label, target: def.target, have: g.done ? def.target : have, done: g.done, seals: LEDGER_GOAL_SEALS };
    });
    const number = this.getWeekNumber();
    return {
      number, goals, stamps: [...w.stamps], stamped: w.stamps.includes(number),
      weeksSeen: number, msToRotation: this.getMsToRotation()
    };
  }

  // ---- Souq Rotation --------------------------------------------------------------------------

  getSouq() {
    const week = this.getWeek();
    const i = ((week % SOUQ_ROTATION.length) + SOUQ_ROTATION.length) % SOUQ_ROTATION.length;
    return SOUQ_ROTATION[i];
  }

  getSouqId() { return this.getSouq().id; }

  // Garden growth for a plot's seed (R15 hook in GardenSystem.update)
  getGardenGrowthMult(seedId) {
    const id = this.getSouqId();
    if (id === 'rosewater') return 1.25;
    if (id === 'truffle' && seedId === 'solar_fern') return 1.5;
    return 1;
  }

  // Tower boss gold (CombatSystem.onMonsterDefeated)
  getBossGoldMult() { return this.getSouqId() === 'falcon' ? 1.5 : 1; }

  // Chrono Sand gained from any source (GameState.getChronoSandGainMult)
  getSandGainMult() { return this.getSouqId() === 'hourglass' ? 1.5 : 1; }

  // ---- Seals of Transcendence -----------------------------------------------------------------

  isSealLit(id) { return this.state.seals[id] === true; }

  getLitSealCount() { return SEALS.filter(s => this.state.seals[s.id] === true).length; }

  // Extra shards each Transcend pays: +1 per lit Seal, at most +3 (§6.1)
  getSealShardBonus() { return Math.min(SEAL_SHARD_BONUS_MAX, this.getLitSealCount()); }

  // Lights every Seal whose condition is met. Lit Seals never go dark. Returns the ids lit now.
  updateSeals() {
    const lit = [];
    const gs = this.gameState;
    for (const seal of SEALS) {
      if (this.state.seals[seal.id]) continue;
      let v = 0;
      try { v = seal.value(gs); } catch { v = 0; }
      if (v >= seal.goal) {
        this.state.seals[seal.id] = true;
        lit.push(seal.id);
        const count = this.getLitSealCount();
        const bonus = this.getSealShardBonus();
        this.notify({
          tier: 'medium', kind: 'seal-lit', icon: seal.icon, color: '#fbbf24',
          title: `Seal of the ${seal.name} lit`, batchTitle: '{n} Seals lit',
          detail: `${count} / ${SEALS.length} lit · +${bonus} shard${bonus === 1 ? '' : 's'} at each Transcend`
        });
      }
    }
    return lit;
  }

  getSeals() {
    const gs = this.gameState;
    return SEALS.map(seal => {
      const lit = this.isSealLit(seal.id);
      let v = 0;
      try { v = seal.value(gs); } catch { v = 0; }
      return { id: seal.id, icon: seal.icon, name: seal.name, short: seal.short, desc: seal.desc, lit, pct: lit ? 1 : Math.max(0, Math.min(1, v / seal.goal)) };
    });
  }
}
