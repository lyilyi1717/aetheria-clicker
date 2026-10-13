// The Foreman: jobs for the Rafeeqs. Run: node test_proto_foreman.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const dirt = () => ({ t: 'dirt', hp: 5, max: 5, s: 0 });
// a plain 8-row pit: all dirt, open sky above row 0, one digger in the middle
function pit() {
  G.seedRng(1);
  const s = G.newState();
  for (let i = 0; i < G.VIEW_ROWS; i++) for (let c = 0; c < G.COLS; c++) s.rows[i][c] = dirt();
  s.foremanHere = true;
  s.diggers.push({ c: 4, r: s.top, tc: -1, tr: -1, cd: 0.3, swing: 0 });
  return s;
}
const pol = (s, id) => G.POLICIES[id](s, s.diggers[0]);

{ // he arrives with the third Rafeeq, not before
  G.seedRng(1);
  const s = G.newState();
  const seen = [];
  s.up.crew = G.PARAMS.foreman.needCrew - 1; G.step(s, 0.05, k => seen.push(k));
  ok(!s.foremanHere && !G.foremanSet(s, 'down'), 'no Foreman with two Rafeeqs, and no orders');
  s.up.crew = G.PARAMS.foreman.needCrew; G.step(s, 0.05, k => seen.push(k));
  ok(s.foremanHere && seen.includes('foremanArrives'), 'the third Rafeeq brings him, with an event');
  const u = G.unlocks().list.map(x => x.id);
  ok(u.includes('foreman') && G.foremanJobs.every(j => u.includes('job:' + j)), 'his content is counted');
}
{ // or the second Big Rock
  const s = G.newState(); s.bossesDown = G.PARAMS.foreman.needBoss; G.step(s, 0.05, () => {});
  ok(s.foremanHere, 'the second Big Rock brings him');
}
{ // follow me: next to the pick
  const s = pit();
  s.foremanAim = [s.top + 0, 7];
  ok(pol(s, 'follow')[1] === 7, 'follow goes to the column the pick hit');
  s.foremanAim = [s.top, 1];
  ok(pol(s, 'follow')[1] === 1, 'and moves when the pick moves');
  G.swing(s, s.top, 6);
  ok(s.foremanAim[1] === 6, 'a swing records where the pick is');
}
{ // clear the top is today's job; down goes for depth
  const s = pit();
  for (let c = 0; c < G.COLS; c++) { s.rows[0][c] = null; s.rows[1][c] = null; }
  s.rows[1][2] = null;
  ok(pol(s, 'nearest')[0] === s.top + 2 || pol(s, 'nearest')[0] === s.top, 'clear the top works on the top of the hole');
  s.rows[3][6] = null;                                    // a shaft: row 3, col 6 open, row 4 col 6 reachable
  const dn = pol(s, 'down');
  ok(dn[0] === s.top + 4 && dn[1] === 6, 'dig down picks the deepest block it can hit: ' + dn);
}
{ // go for ore: the ore itself if open, else the block that leads toward it
  const s = pit();
  for (let c = 0; c < G.COLS; c++) s.rows[0][c] = null;
  s.rows[2][7] = { t: 'copper', hp: 2, max: 2, s: 0 };
  ok(G.visibleMask(s)[2][7], 'the test ore is in sight');
  const tg = pol(s, 'ore');
  ok(tg[0] === s.top + 1 && tg[1] === 7, 'ore job tunnels toward ore in sight: ' + tg);
  s.rows[1][7] = null;
  const tg2 = pol(s, 'ore');
  ok(tg2[0] === s.top + 2 && tg2[1] === 7, 'an open ore is the target: ' + tg2);
  const s2 = pit();
  for (let c = 0; c < G.COLS; c++) s2.rows[0][c] = null;
  ok(pol(s2, 'ore') !== null, 'no ore in sight still gives work (digs down)');
  s2.rows[2][3] = { t: 'tnt', hp: 1, max: 1, s: 0 };
  ok(pol(s2, 'ore')[1] !== 3 || pol(s2, 'ore')[0] !== s2.top + 2, 'the ore job does not walk into TNT');
}
{ // changing job is instant and the Rafeeqs turn to the new work
  const s = pit();
  const d = s.diggers[0];
  d.tr = 0; d.tc = 4;
  const seen = [];
  ok(G.foremanSet(s, 'down', k => seen.push(k)) && s.crewJob === 'down' && s.foremanPick === 'down', 'the job is set');
  ok(d.tr === -1 && seen.includes('job'), 'the Rafeeq drops the old work and a job event is sent');
  ok(!G.foremanSet(s, 'nonsense'), 'an unknown job is refused');
  G.step(s, 0.05);
  ok(d.tr >= 0, 'he picks new work on the next step');
}
{ // tea break: sits, then digs double; break-even
  const s = pit();
  s.coins = 0; G.foremanSet(s, 'tea');
  const d = s.diggers[0];
  const base = G.crewRate(s);
  let hits = 0, t = 0;
  while (t < 6 - 0.2) { G.step(s, 0.05); t += 0.05; }
  ok(d.tr === -1 && s.foreTea.ph === 'break', 'during the break he does not pick work');
  ok(s.total === 0, 'and earns nothing');
  while (t < 6.3) { G.step(s, 0.05); t += 0.05; }
  ok(s.foreTea.ph === 'rush' && G.crewRate(s) === base * 2, 'then he digs at double speed');
  t = 0; while (t < 8.1) { G.step(s, 0.05); t += 0.05; }
  ok(s.foreTea.ph === 'break' && G.crewRate(s) === base, 'then sits again: no permanent boost');
  G.foremanSet(s, 'nearest');
  ok(G.crewRate(s) === base, 'leaving tea is a normal rate');
}
{ // New Site keeps him and the job; saves round-trip; an old save has defaults
  const s = pit();
  G.foremanSet(s, 'ore');
  G.newSite(s, 'dunes', () => {});
  ok(s.foremanHere && s.crewJob === 'ore', 'New Site keeps the Foreman and his job');
  const s2 = G.deserialize(G.serialize(s));
  ok(s2.foremanHere && s2.crewJob === 'ore' && s2.foremanPick === 'ore', 'save round trip');
  const o = JSON.parse(G.serialize(s));
  delete o.foremanHere; delete o.foremanPick; delete o.foreTea;
  const s3 = G.deserialize(JSON.stringify(o));
  ok(s3.foremanHere === false && s3.crewJob !== undefined && s3.foreTea.ph === 'break', 'an old save loads with defaults');
}
{ // away: the settlement does not depend on the job (the tea job pays its break-and-rush average, tested in test_proto_away.js)
  const a = pit(), b = pit();
  a.up.crew = 1; b.up.crew = 1;
  G.foremanSet(b, 'follow');
  ok(G.settleAway(a, 3600).coins === G.settleAway(b, 3600).coins, 'away pays the same whichever job is set');
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('foreman ok');
