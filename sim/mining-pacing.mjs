// Excavation pacing simulator: drives the real GameState / MiningSystem classes and reports how
// fast a player digs. See docs/redesign-proposal.md §2.3 / §6.5 for the targets.
//
//   node sim/mining-pacing.mjs            # print the report
//   npm run sim:mining
//
// Excavation only runs while the game is open (no offline digging), so the profiles are:
//   active : two 45-min sessions a day with the Excavation tab in front; the player clicks the
//            tile the drills are on 5/s and throws dynamite whenever it is off cooldown
//   idle   : plays the first 45-min session like active, then leaves the game open 24/7 and only
//            buys upgrades; the drills dig alone, plus Auto-Blast once it is bought
//            (AUTO_BLAST_DAY, the casual core sim's second Transcend) if the game has it
// Both buy a pickaxe level or an Auto-Drill as soon as one is affordable, whichever adds more
// digging speed per stone. Outside boosts (Excavation talent, Tower bosses, Chapter of Sand) are
// left out so the report isolates Excavation's own curves; Strata Relics are real.
import { GameState } from '../js/systems/GameState.js';
import { MiningSystem, STRATA_SPAN } from '../js/systems/MiningSystem.js';
import { particles } from '../js/engine/ParticleEngine.js';

globalThis.window = globalThis.window || { innerWidth: 1000, innerHeight: 800 };
particles.suppressed = true;

const H = 3600;
const DAY = 24 * H;
const CLICKS_PER_SEC = 5;
const SESSION = 45 * 60;
// Casual core sim (`npm run sim`): first Transcend day 3.5 buys Auto-Ascend, the second (day 4.4)
// leaves a shard for Auto-Blast
export const AUTO_BLAST_DAY = 4.4;

// Seeded Math.random so before/after runs see the same grids
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

// Throughput gain per stone: a pickaxe level doubles power, a drill adds 1/n of the drill rate
function buyBest(ms, gs) {
  for (let k = 0; k < 50; k++) {
    const stone = gs.inventory.stone || 0;
    const grid = gs.miningGrid;
    const pick = ms.getPickaxeCost(), drill = ms.getAutoDrillCost();
    const n = grid.autoDrills;
    const pickGain = Math.log(2) / pick;
    const drillGain = Math.log(n > 0 ? (n + 1) / n : 2) / drill;
    const want = pickGain >= drillGain ? 'pick' : 'drill';
    if (want === 'pick' && stone >= pick) ms.upgradePickaxe();
    else if (want === 'drill' && stone >= drill) ms.buyAutoDrill();
    else break;
  }
}

// Window reports: [label, start day, end day]
const WINDOWS = [['new (first 2 h of digging)', 0, 0], ['week 2 (days 7-14)', 7, 14], ['month 2 (days 30-60)', 30, 60]];
const CHECKPOINTS = [1, 7, 14, 30, 60];

function run(profile, endDay = 60) {
  seedRandom(4242);
  const gs = new GameState();
  const ms = new MiningSystem(gs);
  ms.random = Math.random;
  gs.miningSystem = ms;
  const grid = gs.miningGrid;
  const active = profile === 'active';
  const inSession = t => (t % DAY) < SESSION || ((t % DAY) >= 12 * H && (t % DAY) < 12 * H + SESSION);
  const isOpen = t => !active || inSession(t);
  const isPlaying = t => (active ? inSession(t) : t < SESSION);
  const dt = 1;
  let t = 0, openSecs = 0, clickAcc = 0, blasts = 0;
  const marks = [];        // samples every 10 min of open time (first 2 h), then hourly
  const strataAt = [0];    // open seconds when each stratum was entered
  const at = {};           // day -> { depth, open, tiles }
  const autoBlastOn = () => !active && t >= AUTO_BLAST_DAY * DAY;
  const hasAuto = typeof ms.autoBlastTick === 'function';
  if (hasAuto) ms.autoBlastOwned = autoBlastOn;
  let ci = 0;
  const endT = endDay * DAY;
  while (t < endT) {
    if (isOpen(t)) {
      if (isPlaying(t)) {
        if (ms.useDynamite(true)) blasts++;
        clickAcc += CLICKS_PER_SEC * dt;
        while (clickAcc >= 1) {
          clickAcc -= 1;
          const target = ms.pickDrillTarget();
          if (target) ms.mineBlock(target.id, undefined, undefined, true);
        }
      }
      ms.update(dt);
      buyBest(ms, gs);
      openSecs += dt;
      const s = Math.floor((grid.depth - 1) / STRATA_SPAN);
      while (strataAt.length <= s) strataAt.push(openSecs);
      if (openSecs % H === 0 || (openSecs <= 2 * H && openSecs % 600 === 0)) {
        marks.push({ t, open: openSecs, depth: grid.depth, tiles: gs.stats.totalBlocksMined });
      }
    }
    t += dt;
    if (ci < CHECKPOINTS.length && t >= CHECKPOINTS[ci] * DAY) {
      at[CHECKPOINTS[ci]] = { depth: grid.depth, open: openSecs, tiles: gs.stats.totalBlocksMined, pick: grid.pickaxeTier, drills: grid.autoDrills };
      ci++;
    }
  }
  const sample = (day) => {
    if (day === 0) return { depth: 1, open: 0, tiles: 0 };
    return at[day];
  };
  const firstTwoHours = marks.find(m => m.open === 2 * H);
  const windows = WINDOWS.map(([label, d0, d1]) => {
    const a = d0 === 0 ? { depth: 1, open: 0, tiles: 0 } : sample(d0);
    const b = d0 === 0 ? firstTwoHours : sample(d1);
    const hours = (b.open - a.open) / H;
    return { label, depthPerHour: (b.depth - a.depth) / hours, tilesPerMin: (b.tiles - a.tiles) / (hours * 60) };
  });
  const strataHours = strataAt.slice(1).map((s, i) => (s - strataAt[i]) / H);
  return { at, windows, strataHours, blasts };
}

function fmt(n, d = 1) {
  return Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d }) : '-';
}

const out = ['## Excavation pacing (`npm run sim:mining`)', ''];
for (const profile of ['active', 'idle']) {
  const r = run(profile);
  out.push(`### profile: ${profile}`, '');
  out.push('| day | depth | pickaxe lv | drills | tiles broken | hours open |', '|---|---|---|---|---|---|');
  for (const d of CHECKPOINTS) {
    const a = r.at[d];
    out.push(`| ${d} | ${a.depth} | ${a.pick} | ${a.drills} | ${a.tiles.toLocaleString('en-US')} | ${fmt(a.open / H, 0)} |`);
  }
  out.push('', '| window | depth / hour open | tiles / min |', '|---|---|---|');
  for (const w of r.windows) out.push(`| ${w.label} | ${fmt(w.depthPerHour, 2)} | ${fmt(w.tilesPerMin, 1)} |`);
  out.push('', `- hours open per stratum (25 depth): ${r.strataHours.map(h => fmt(h, 1)).join(', ')}`, '');
}
console.log(out.join('\n'));
