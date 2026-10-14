// The 14 October screen fixes: the leg clock starts at the first hit, the finish card's Stars equal what was paid,
// and the finish card waits for the pip-cleared banner. Run: node test_proto_screenfix.js
import * as G from './proto/game.js';
import { readFileSync } from 'node:fs';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const NO = () => {};
const P = G.PARAMS.sites;
const run = (s, secs, ev = NO) => { for (let i = 0; i < secs * 20; i++) G.step(s, 0.05, ev); };

{ // the clock waits for the first hit
  G.seedRng(3); const s = G.newState(); const r = G.siteRun(s);
  ok(r.started === false, 'a fresh dig has not started');
  run(s, 5);
  ok(r.clock === 0 && G.legLeft(r, 0).left === G.siteLegs(r)[0].len, 'five idle seconds before the first hit cost nothing');
  G.swing(s, 0, 0, NO);
  ok(r.started === true, 'the first swing starts the clock');
  run(s, 2);
  ok(Math.abs(r.clock - 2) < 0.01, 'then it counts');
  // the Fast medal uses the same clock: idle time before the hit is not on it
  G.seedRng(3); const f = G.newState(); const fr = G.siteRun(f);
  run(f, 10000 / 20); f.bossesDown = 2; G.swing(f, 0, 0, NO); G.step(f, 0.05, NO);
  ok(fr.done && fr.time < 1 && fr.time <= G.runPar(fr), 'a long wait before the first hit does not lose the Fast medal');
}

{ // an old save with a dig in play and no started flag keeps counting
  G.seedRng(4); const s = G.newState(); G.siteRun(s);
  const back = G.deserialize(JSON.parse(JSON.stringify(G.serialize(s))));
  delete back.run.started;
  run(back, 3);
  ok(Math.abs(back.run.clock - 3) < 0.01, 'a run saved before the flag runs its clock');
  const again = G.deserialize(JSON.parse(JSON.stringify(G.serialize(s))));
  ok(again.run.started === false, 'a saved fresh dig stays unstarted');
}

{ // the finish card's Stars equal the pip's pay (and a Fast medal on top, nothing else)
  G.seedRng(2); const s = G.newState();
  const mk = (i, v) => { const f = G.ROAD[i]; s.road.stamps[G.siteKey(f.site, f.floor)] = { site: f.site, floor: f.floor, twist: '', fin: 1, fast: 0, hard: 0, best: 500, n: 1, ...v }; };
  for (let i = 0; i < 3; i++) mk(i, {});
  s.road.reach = G.ROAD[2].floor; s.bossesDown = 2; G.siteRun(s);
  const k0 = G.siteKey(G.ROAD[0].site, G.ROAD[0].floor);
  for (const quick of [false, true]) {
    const card = G.replayCard(s, k0, true);
    ok(G.pickCard(s, card, NO), 'the chili card starts');
    const evs = {}; const ev = (n, d) => { evs[n] = d; };
    const before = s.stars; s.bossesDown = 2; s.run.started = true; s.run.clock = quick ? 1 : 9999; G.step(s, 0.05, ev);
    const gained = s.stars - before;
    ok(evs.chiliWon && evs.chiliWon.stars === G.chiliPay(s.run.floor, card.chili), 'the banner pays the pip');
    ok(evs.siteFinished && evs.siteFinished.stars === gained, 'the finish card Stars equal what the header gained (' + (quick ? 'quick' : 'slow') + ')');
    if (!quick) ok(gained === G.chiliPay(s.run.floor, card.chili), 'a slow clear pays the pip alone');
    ok(gained >= 1, 'a pip never pays 0');
  }
}

{ // the finish card holds for the banner, and the card never opens on a zero
  ok(P.chiliHoldMs >= 1000 && P.chiliHoldMs <= 2500, 'the hold is about 1.5 s');
  const ui = readFileSync('./proto/features/sites/ui.js', 'utf8');
  ok(/chiliHoldMs/.test(ui) && /holdUntil/.test(ui), 'the finish card waits on the hold');
  ok(!/earn\.textContent = t\('fin_stars', \{ n: 0 \}\)/.test(ui), 'the Stars line never starts at 0');
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('screenfix: ok');
