// Dig worldmap: where everything sits on the map. Pure (no DOM, no drawing): the state and the deal go in, a list of
// nodes, paths and lands comes out. Read-only: it never changes the state (dealCards is the one call that may fill
// `road.deal`, as the card modal did).
import * as G from '../../game.js';

export const PW = 720;          // one land is this wide
export const HH = 490;          // the map is this tall
export const SKYY = 175;        // the horizon line

// four hand-placed stones per land; odd lands run the other way round
const SLOTS_A = [[0.13, 345], [0.37, 280], [0.62, 355], [0.87, 290]];
const SLOTS_B = [[0.13, 290], [0.37, 355], [0.62, 285], [0.87, 345]];
const BEYOND_X = 0.17, BEYOND_Y = 325;                      // the crossroads, in the Beyond panel
const FAN = [[0.6, 228], [0.64, 322], [0.6, 416]];        // where the three paths of the deal end
const ISLAND_Y = 222;


export function buildMap(s) {
  const ROAD = G.ROAD, ZONES = G.ZONES, fixed = G.FIXED;
  const nx = G.fixedNext(s);
  const nextIdx = nx ? nx.level - 1 : ROAD.length;
  const cards = G.dealCards(s).slice();
  const stamps = s.road.stamps;
  const nodes = [], edges = [];
  const panels = ZONES.map((zone, i) => {
    const lv = ROAD.map((f, k) => (f.zone === zone ? k + 1 : 0)).filter(Boolean);
    return { zone, x: i * PW, first: lv[0], last: lv[lv.length - 1] };
  });
  panels.push({ zone: 'beyond', x: ZONES.length * PW, first: 0, last: 0 });

  // the road
  ROAD.forEach((f, i) => {
    const zi = ZONES.indexOf(f.zone), inZ = ROAD.slice(0, i).filter(g => g.zone === f.zone).length;
    const [fx, y] = ((zi % 2) ? SLOTS_B : SLOTS_A)[inZ % 4];
    const st = stamps[G.siteKey(f.site, f.floor)] || null;
    nodes.push({ id: 'r' + i, type: 'road', i, level: i + 1, site: f.site, floor: f.floor, zone: f.zone, prove: !!f.prove, twist: '',
      x: panels[zi].x + fx * PW, y, r: f.prove ? 27 : 23, state: i < nextIdx ? 'done' : i === nextIdx ? 'next' : 'locked', stamp: st, card: null });
  });
  const hub = { id: 'hub', type: 'hub', i: ROAD.length, level: 0, site: '', floor: 0, zone: 'beyond', twist: '', prove: false,
    x: panels[ZONES.length].x + BEYOND_X * PW, y: BEYOND_Y, r: 26, state: nx ? 'locked' : 'done', stamp: null, card: null };
  nodes.push(hub);
  const road = nodes.filter(n => n.type === 'road');
  road.forEach((n, i) => edges.push({ id: 'e' + i, from: n, to: i + 1 < road.length ? road[i + 1] : hub, open: i < nextIdx, kind: 'road' }));

  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
  const clampY = y => Math.max(225, Math.min(420, y));
  const used = new Set();
  const give = (n, c) => { n.card = c; used.add(c.key); };

  // the Museum's places that are open: islands off the Arabian coast
  const islands = G.siteList(s).filter(id => !fixed.some(f => f.site === id)).map((id, k) => {
    const n = { id: 'm' + k, type: 'island', i: -1, level: 0, site: id, floor: 0, zone: 'arabia', twist: '', prove: false,
      x: 150 + k * 190, y: ISLAND_Y, r: 20, state: 'closed', stamp: null, card: null };
    nodes.push(n); edges.push({ id: 'em' + k, from: byId.r1, to: n, open: true, kind: 'sea' });
    return n;
  });

  if (nx) {
    // the road level is the one card of kind 'fixed'
    const fc = cards.find(c => c.kind === 'fixed');
    if (fc) give(byId['r' + nextIdx], fc);
    // side cards hang off the level you are stuck on; a card for a Museum place lands on that place's island
    const home = byId['r' + nextIdx];
    let slot = 0;
    for (const c of cards) {
      if (used.has(c.key)) continue;
      const isl = islands.find(n => n.site === c.site && !n.card);
      if (isl) { give(isl, c); isl.state = 'open'; continue; }
      const dx = (home.x - panels[ZONES.indexOf(home.zone)].x) > PW * 0.8 ? -50 : 50;
      let dy = slot % 2 ? 88 : -88;
      if (home.y + dy < 225 || home.y + dy > 420) dy = -dy;
      const y = clampY(home.y + dy);
      const n = { id: 'c' + slot, type: 'side', i: -1, level: 0, site: c.site, floor: c.floor, zone: home.zone, twist: c.twist, prove: false,
        x: home.x + dx, y, r: 19, state: 'open', stamp: stamps[c.key] || null, card: null, kind: c.kind };
      give(n, c); nodes.push(n); edges.push({ id: 'es' + slot, from: home, to: n, open: true, kind: 'side' });
      slot++;
    }
  } else {
    cards.forEach((c, k) => {
      const [fx, y] = FAN[k % FAN.length];
      const n = { id: 'b' + k, type: 'beyond', i: -1, level: 0, site: c.site, floor: c.floor, zone: 'beyond', twist: c.twist, prove: false,
        x: panels[ZONES.length].x + fx * PW, y, r: 25, state: 'open', stamp: stamps[c.key] || null, card: null, kind: c.kind };
      give(n, c); nodes.push(n); edges.push({ id: 'eb' + k, from: hub, to: n, open: true, kind: 'side' });
    });
    // the paths of a deal you have not been dealt yet are not drawn; three faint stones show where they go (none needed)
  }

  const go = nodes.find(n => n.card && n.card.kind === 'fixed') || nodes.find(n => n.card) || null;
  return { PW, HH, SKYY, width: PW * panels.length, panels, nodes, edges, nextIdx, go, hub };
}

// the points of a path from a to b (a gentle bend), spaced about `gap` apart
export function pathPoints(e, gap = 15) {
  const a = e.from, b = e.to;
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const bend = (e.kind === 'road' ? (parseInt(e.id.slice(1), 10) % 2 ? 1 : -1) * Math.min(34, len * 0.16) : 0);
  const cx = mx - dy / len * bend, cy = my + dx / len * bend;
  const steps = Math.max(4, Math.round(len / gap)), pts = [];
  for (let k = 0; k <= steps; k++) {
    const u = k / steps, v = 1 - u;
    pts.push({ x: v * v * a.x + 2 * v * u * cx + u * u * b.x, y: v * v * a.y + 2 * v * u * cy + u * u * b.y });
  }
  return pts;
}

// the node the player is told to go to, by its card key (for tests and the info panel)
