// Void Tower pacing simulator: drives the real GameState / CombatSystem classes and reports
// how fast the hero climbs over time. See docs/redesign-proposal.md §2.2 / §6.5 and
// docs/gamification-roadmap.md §0.2 for what these numbers mean.
//
//   node sim/tower-pacing.mjs            # print the report
//   npm run sim:tower
//
// Profiles (the Tower only advances while the game is open; there is no offline combat):
//   open   : the game is left open 24/7 and the hero auto-battles, never touched
//            (the assumption behind the roadmap's "1 floor per second" measurement)
//   casual : two 45-min sessions a day; while present the player clicks the monster 2/s and
//            casts every hero skill on cooldown
//
// Hero power from outside the Tower is a fixed schedule, identical before and after a change,
// so the report isolates the Tower's own curves:
//   - Aether Forge: the highest level whose cost (1e5 x 5^L) fits one hour of casual income,
//     with income interpolated (log-linear) from the `npm run sim` casual CPS checkpoints
//   - Gladiator Vigour talent rank and Quartermaster Hunter's Edge rank: see POWER below
// Gear levels (R34): once a minute the hero spends Monster Bones on the cheapest level-up
// (ties: weapon, armor, amulet, relic). `--no-gear-levels` turns that off (the pre-R34 game).
// Hero level, gear and floor come from the real CombatSystem (loot RNG is seeded).
import { GameState } from '../js/systems/GameState.js';
import { CombatSystem, GEAR_SLOTS } from '../js/systems/CombatSystem.js';
import { particles } from '../js/engine/ParticleEngine.js';

globalThis.window = globalThis.window || { innerWidth: 1000, innerHeight: 800 };
particles.suppressed = true;

const GEAR_LEVELS = !process.argv.includes('--no-gear-levels');
const H = 3600;
const DAY = 24 * H;

// Casual CPS from `npm run sim` (sim/core-pacing.mjs) at the time this script was written
const CPS = [[0, 1], [600, 10], [H, 3.6e4], [DAY, 1.19e19], [7 * DAY, 7.45e19], [30 * DAY, 1.78e20]];
// [time, Gladiator Vigour rank (max 10), Hunter's Edge rank (max 50)], linear in between
const POWER = [[0, 0, 0], [H, 2, 0], [DAY, 10, 5], [7 * DAY, 10, 15], [30 * DAY, 10, 30]];

const lerp = (table, t, col, log = false) => {
  let i = 1;
  while (i < table.length - 1 && table[i][0] < t) i++;
  const [t0, t1] = [table[i - 1][0], table[i][0]];
  const u = Math.max(0, Math.min(1, (t - t0) / (t1 - t0)));
  const [a, b] = [table[i - 1][col], table[i][col]];
  return log ? Math.exp(Math.log(a) + u * (Math.log(b) - Math.log(a))) : a + u * (b - a);
};
const forgeLevel = t => Math.max(0, Math.floor(Math.log(lerp(CPS, t, 1, true) * H / 1e5) / Math.log(5)));

// Seeded Math.random so before/after runs see the same loot rolls
function seedRandom(seed) {
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CHECKPOINTS = [
  ['10 min', 600], ['1 h', H], ['6 h', 6 * H], ['1 d', DAY], ['3 d', 3 * DAY],
  ['1 w', 7 * DAY], ['2 w', 14 * DAY], ['30 d', 30 * DAY]
];

function run(profile, endT) {
  seedRandom(12345);
  const gs = new GameState();
  const cs = new CombatSystem(gs);
  gs.combatSystem = cs;
  const h = gs.hero;
  const isOpen = t => profile === 'open' || (t % DAY) < 45 * 60 || ((t % DAY) >= 12 * H && (t % DAY) < 12 * H + 45 * 60);
  const dt = 0.25;
  const rows = [];
  let ci = 0, t = 0, towerSecs = 0, lastFloor = 1, lastTowerSecs = 0;
  let bosses = 0, timeouts = 0, deaths = 0, clickAcc = 0;

  const applyPower = () => {
    h.aetherForgeLevel = forgeLevel(t);
    gs.talents.warlord_might = { rank: Math.round(lerp(POWER, t, 1)) };
    gs.quartermaster = { hunters_edge: { rank: Math.round(lerp(POWER, t, 2)) } };
    if (!GEAR_LEVELS) return;
    for (;;) {
      const next = GEAR_SLOTS.map(s => cs.getGearLevelInfo(s)).filter(i => !i.blocked).sort((a, b) => a.cost - b.cost)[0];
      if (!next || !cs.levelUpGear(next.slot)) break;
    }
  };
  applyPower();

  while (t < endT) {
    if (isOpen(t)) {
      if (Math.floor(t / 60) !== Math.floor((t - dt) / 60)) applyPower();
      const floorBefore = h.floor;
      const wasBoss = cs.monster.isBoss;
      const timerBefore = cs.monster.timer;
      if (profile === 'casual') {
        for (const k of Object.keys(h.skills)) if (h.skills[k].cd <= 0) cs.castHeroSkill(k);
        clickAcc += 2 * dt;
        while (clickAcc >= 1) { clickAcc--; cs.activeClickAttack(1, 1); }
      }
      cs.update(dt);
      if (wasBoss && h.floor > floorBefore) bosses++;
      if (h.floor < floorBefore) {
        if (wasBoss && timerBefore - dt <= 0) timeouts++;
        else deaths++;
      }
      towerSecs += dt;
      t += dt;
    } else {
      // Skip the closed stretch in one jump to the next session
      const d = t % DAY;
      t += d < 12 * H ? 12 * H - d : DAY - d;
      t = Math.min(t, endT);
    }
    while (ci < CHECKPOINTS.length && t >= CHECKPOINTS[ci][1] && CHECKPOINTS[ci][1] <= endT) {
      const hrs = (towerSecs - lastTowerSecs) / H;
      rows.push({
        label: CHECKPOINTS[ci][0],
        floor: h.maxFloor,
        perHour: hrs > 0 ? (h.maxFloor - lastFloor) / hrs : 0,
        towerH: towerSecs / H,
        forge: h.aetherForgeLevel,
        level: h.level,
        gearLv: GEAR_SLOTS.map(s => h.gear[s]?.level || 0).join('/'),
        gold: gs.gold.format('scientific', 2),
        bosses, timeouts, deaths
      });
      lastFloor = h.maxFloor; lastTowerSecs = towerSecs;
      ci++;
    }
  }
  return rows;
}

const fmt = n => Math.round(n).toLocaleString('en-US');
const out = [`## Void Tower pacing report (sim/tower-pacing.mjs)${GEAR_LEVELS ? '' : ', gear levels off'}`];
for (const [profile, endT] of [['open', 30 * DAY], ['casual', 30 * DAY]]) {
  const rows = run(profile, endT);
  out.push(`\n### profile: ${profile}\n`);
  out.push('| time | Tower hours | best floor | floors/hour (since last row) | Forge | hero lvl | gear lvl (W/A/Am/R) | gold | bosses beaten | boss timeouts | deaths |');
  out.push('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    out.push(`| ${r.label} | ${r.towerH.toFixed(1)} | ${fmt(r.floor)} | ${fmt(r.perHour)} | ${r.forge} | ${r.level} | ${r.gearLv} | ${r.gold} | ${fmt(r.bosses)} | ${fmt(r.timeouts)} | ${fmt(r.deaths)} |`);
  }
}
console.log(out.join('\n'));
