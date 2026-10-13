// Sites with a bottom, the road, the deal, medals and Stars. Run: node test_proto_sites.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const NO = () => {};
const P = G.PARAMS.sites;
const fresh = (seed = 1) => { G.seedRng(seed); return G.newState(); };
const run = (s, secs, ev = NO) => { for (let i = 0; i < secs * 20; i++) G.step(s, 0.05, ev); };
const rows = s => { for (const row of s.rows) for (const c of row) if (c) return true; return false; };

{ // a site has a floor, a par time and a stopwatch that counts up (attended steps only)
  const s = fresh();
  const r = G.siteRun(s);
  ok(r.floor === 50 && r.par === P.parBase && r.key === 'dunes:50' && !r.done, 'the first site: floor 50, par, not done');
  run(s, 2);
  ok(Math.abs(s.run.clock - 2) < 0.01, 'the stopwatch counts seconds up');
  s.run.clock = 0;
  s.bossesDown = 1; run(s, 1);
  ok(!s.run.done, 'one Big Rock down is not the Gate');
}
{ // breaking the Gate finishes the site: stamp, Stars, event, reach; once only
  const s = fresh(); const seen = [];
  G.siteRun(s); s.run.clock = 100;
  s.bossesDown = 2;
  G.step(s, 0.05, (k, d) => seen.push([k, d]));
  const f = seen.find(([k]) => k === 'siteFinished');
  ok(f && f[1].site === 'dunes' && f[1].floor === 50 && f[1].first && f[1].fast, 'siteFinished: first time, fast');
  ok(s.run.done && s.road.stamps['dunes:50'].fin === 1 && s.road.stamps['dunes:50'].fast === 1 && s.road.reach === 50, 'stamped Finished and Fast');
  ok(s.stars === G.starsAt(50) + G.medalPay(50) && f[1].stars === s.stars, 'pays the floor and the Fast medal: 3 + 2');
  const stars = s.stars; run(s, 1);
  ok(s.stars === stars && seen.filter(([k]) => k === 'siteFinished').length === 1, 'finishes once');
  const t = s.run.time; run(s, 2);
  ok(s.run.time === t && s.run.clock === t, 'the stopwatch stops at the finish');
}
{ // slow: no Fast medal; a replay pays less; the best time is kept
  const s = fresh();
  G.siteRun(s); s.run.clock = s.run.par + 60; s.bossesDown = 2; run(s, 0.1);
  ok(s.road.stamps['dunes:50'].fin === 1 && !s.road.stamps['dunes:50'].fast && s.stars === G.starsAt(50), 'slow: Finished only, 3 Stars');
  ok(G.newSite(s, 'dunes', NO, undefined, { site: 'dunes', floor: 50, twist: '', hard: '' }) && s.run.key === 'dunes:50' && s.run.clock === 0 && !s.run.done, 'the same version again: a fresh stopwatch');
  const stars = s.stars; s.bossesDown = 2; s.run.clock = s.run.par - 1; run(s, 0.1);
  ok(s.stars - stars === G.replayPay(50) + G.medalPay(50) && G.replayPay(50) < G.starsAt(50) && s.road.stamps['dunes:50'].fast === 1, 'a replay pays less, and the Fast medal now');
  ok(Math.abs(s.road.stamps['dunes:50'].best - (s.run.par - 1)) < 0.2, 'the best time is kept');
}
{ // leaving before the Gate pays a little, never zero; below a finished Gate pays by depth
  const s = fresh();
  G.siteRun(s); s.bossesDown = 2; s.best = 60;
  ok(!s.run.done && G.starsFor(s) >= 1, 'not finished yet: leaving pays at least 1');
  s.run.floor = 75;
  ok(G.starsFor(s) === Math.max(1, Math.floor(P.leaveShare * G.starsAt(60))), 'leaving pays a share of the depth reached');
  const s2 = fresh(); G.siteRun(s2); s2.bossesDown = 2; run(s2, 0.1);
  ok(s2.run.done && G.starsFor(s2) === 0, 'a finished site that was not dug deeper pays nothing more');
  s2.best = 120;
  ok(G.starsFor(s2) === Math.floor(P.deepShare * (G.starsAt(120) - G.starsAt(50))), 'digging below the Gate pays by depth');
  ok(G.canNewSite(s2) && !G.canNewSite(fresh()), 'moving needs the second Big Rock');
}
{ // Stars are small numbers: worth of a floor grows by a fixed step, never millions in the first months' depths
  ok(G.starsAt(50) === 3 && G.starsAt(75) === Math.round(3 * G.PARAMS.core.starGrow), 'a floor is worth 3 Stars at 50 m, then x starGrow per 25 m');
  ok(G.starsAt(200) < 1e6, 'the deepest floor dealt is not worth millions');
}
{ // the road: four fixed sites, in order, then a deal of three
  const s = fresh();
  ok(G.fixedNext(s).site === 'dunes', 'the road starts at the Dunes');
  G.siteRun(s); s.bossesDown = 2; run(s, 0.1);
  const c1 = G.dealCards(s);
  ok(c1.length === 1 && c1[0].kind === 'fixed' && c1[0].site === 'boom' && c1[0].floor === 50, 'then Powder Valley (one card)');
  ok(G.pickCard(s, c1[0], NO) && s.site === 'boom' && s.run.floor === 50 && s.road.deal === null, 'taking it moves there');
  s.bossesDown = 2; run(s, 0.1);
  const c2 = G.dealCards(s);
  ok(c2[0].site === 'bones' && c2[0].floor === 75, 'then the Valley of Beasts at 75 m');
  G.pickCard(s, c2[0], NO);
  ok(s.run.floor === 75 && s.run.par > G.sitePar(50), 'a deeper floor has a longer par');
  // a fixed site given up twice is passed
  s.bossesDown = 2; s.best = 60; s.run.clock = 0;
  ok(G.fixedNext(s).site === 'bones', 'not yet passed');
  G.newSite(s, 'bones', NO, undefined, { site: 'bones', floor: 75, twist: '', hard: '' });
  ok(G.fixedNext(s).site === 'gold', 'tried twice: the road goes on');
}
{ // the deal: three distinct cards from a road that is done; it is kept until you pick; mixes kinds
  const s = fresh();
  for (const f of G.ROAD) s.road.stamps[G.siteKey(f.site, f.floor)] = { site: f.site, floor: f.floor, twist: '', fin: 1, fast: 0, hard: 0, best: 400, n: 1 };
  s.road.reach = 200; s.bossesDown = 2; G.siteRun(s); s.run.done = true;
  const d = G.dealCards(s);
  ok(d.length === 3 && new Set(d.map(c => c.key)).size === 3, 'three different cards');
  ok(d.some(c => c.kind === 'stretch' && c.floor === 225), 'one is a stretch: the next floor');
  ok(d.every(c => c.par > 0 && c.stars >= 1 && c.medals && G.SITES[c.site]), 'each shows its par, its reward and its medals');
  ok(G.dealCards(s) === d, 'the deal is kept until you pick');
  ok(d.some(c => c.twist || c.kind === 'medal' || c.kind === 'new'), 'it mixes a new place, a medal or a twist with the stretch');
  const pick = d.find(c => c.twist) || d[0];
  ok(G.pickCard(s, pick, NO) && s.run.key === pick.key && s.run.twist === pick.twist && s.road.deal === null && s.road.stamps[pick.key].n >= 1, 'picking starts that version and clears the deal');
}
{ // the Museum's sites join the deal when their set is done
  const s = fresh();
  for (const f of G.ROAD) s.road.stamps[G.siteKey(f.site, f.floor)] = { site: f.site, floor: f.floor, twist: '', fin: 1, fast: 1, hard: 1, best: 400, n: 1 };
  s.road.reach = 75; G.siteRun(s);
  G.SITES.sharks.open_ = G.SITES.sharks.open; G.SITES.sharks.open = () => true;
  let seen = false;
  for (let i = 0; i < 12 && !seen; i++) { s.road.deal = null; seen = G.dealCards(s).some(c => c.site === 'sharks'); }
  ok(seen && G.siteList(s).includes('sharks'), 'a new place: Shark Dunes is dealt once it is open');
  G.SITES.sharks.open = G.SITES.sharks.open_;
  s.road.deal = null;
  ok(!G.dealCards(s).some(c => c.site === 'sharks') && !G.siteList(s).includes('sharks'), 'and not before');
}
{ // twists: harder ground, dim, barrels
  const base = fresh(3); const a = base.rows.slice(0, 8).flat().filter(c => c && c.t === 'dirt').map(c => c.hp);
  const s = fresh(3); s.run = { ...G.siteRun(s), twist: 'heavy' }; G.reset(s, 'site', { run: { ...s.run, twist: 'heavy' } });
  const b = s.rows.slice(0, 8).flat().filter(c => c && c.t === 'dirt').map(c => c.hp);
  ok(a.length && b.length && b.reduce((x, y) => x + y, 0) / b.length > 1.2 * a.reduce((x, y) => x + y, 0) / a.length, 'heavy: the ground is harder');
  ok(G.fold('sight', s, 2) === 2, 'no dim twist: sight as before');
  const d = fresh(); d.run = { ...G.siteRun(d), twist: 'dim' };
  ok(G.fold('sight', d, 2) === 1, 'dim: one block of sight');
  const br = fresh(4); G.reset(br, 'site', { run: { ...G.siteRun(br), twist: 'barrels' } });
  ok(br.rows.some((row, i) => i > 2 && i % P.twistBarrel === 0 && row.some(c => c && c.t === 'tnt')), 'barrels: a TNT every few rows');
}
{ // the Hard medal: a card with a hard rule starts the dig under its contract; winning it is the third medal
  const s = fresh();
  for (const f of G.ROAD) s.road.stamps[G.siteKey(f.site, f.floor)] = { site: f.site, floor: f.floor, twist: '', fin: 1, fast: 0, hard: 0, best: 400, n: 1 };
  s.road.reach = 50; s.bossesDown = 2; G.siteRun(s);
  ok(G.hardOf('dunes', 50) === 'bare' && G.hardOf('dunes', 75) === 'rising' && G.hardOf('boom', 50) === 'tntOnly', 'each site has its hard rule: a contract, deeper floors the next one');
  ok(G.pickCard(s, { site: 'dunes', floor: 50, twist: '', hard: 'bare' }, NO) && s.contract === 'bare' && s.run.hard === 'bare', 'the dig starts under the contract');
  const stars = s.stars, seen = [];
  s.best = 40; G.step(s, 0.05, (k, d) => seen.push([k, d]));
  ok(s.road.stamps['dunes:50'].hard === 1 && s.run.medals.hard === 1 && seen.some(([k, d]) => k === 'siteMedal' && d.medal === 'hard'), 'winning the contract is the Hard medal');
  ok(s.stars - stars === G.PARAMS.contracts.tierStars[1] + G.medalPay(50), 'it pays the medal and the contract own Star, once');
  const again = s.stars; s.best = 41; run(s, 1);
  ok(s.stars === again, 'only once');
}
{ // old boards still work: a contract taken from the board is a site at its base floor with the Hard medal on it
  const s = fresh(); s.bossesDown = 2; s.sites = G.PARAMS.contracts.openSites; G.siteRun(s);
  ok(G.startContract(s, 'bare', NO) && s.contract === 'bare' && s.run.floor === 50 && s.run.hard === 'bare', 'taking a contract from the board starts a run at the base floor');
}
{ // save round trip, and an old save without run or road
  const s = fresh(); G.siteRun(s); s.run.clock = 33; s.bossesDown = 2; run(s, 0.1);
  const back = G.deserialize(G.serialize(s));
  ok(back && back.run.done && back.road.reach === 50 && back.road.stamps['dunes:50'].fin === 1 && back.run.time === s.run.time, 'run and road survive a save');
  const o = JSON.parse(G.serialize(fresh()));
  delete o.run; delete o.road; delete o.fv;
  o.site = 'boom'; o.sites = 6; o.bossesDown = 3; o.best = 80; o.stars = 40; o.unlocked = { 'site:boom': 1, 'site:gold': 1 };
  const old = G.deserialize(JSON.stringify(o));
  ok(old && old.stars === 40 && old.site === 'boom' && old.best === 80 && old.run === null, 'an old save loads, keeps its dig and its Stars');
  const r = G.siteRun(old);
  ok(r.floor === 100 && !r.done && r.site === 'boom', 'its dig gets the next Big Rock as its floor');
  ok(old.road.stamps['boom:50'] && old.road.stamps['boom:50'].fin === 0 && old.road.stamps['gold:75'] && old.road.stamps['gold:75'].fin === 0, 'sites it had visited are stamps, not finished');
  ok(G.fixedNext(old).site === 'dunes' || G.fixedNext(old).site === 'bones', 'the visited ones are past their lesson');
}
{ // the cards are drawn from rules only: no DOM, nothing random outside the core source
  const a = fresh(7), b = fresh(7);
  for (const s of [a, b]) { for (const f of G.ROAD) s.road.stamps[G.siteKey(f.site, f.floor)] = { site: f.site, floor: f.floor, twist: '', fin: 1, fast: 0, hard: 0, best: 400, n: 1 }; s.road.reach = 75; G.siteRun(s); }
  G.seedRng(5); const da = G.dealCards(a).map(c => c.key).join();
  G.seedRng(5); const db = G.dealCards(b).map(c => c.key).join();
  ok(da === db, 'the same seed deals the same cards');
}

{ // the road: fourteen levels in order; a level stays until it is finished; stuck brings side cards
  const s = fresh();
  const fin = (f, n = 1) => { s.road.stamps[G.siteKey(f.site, f.floor)] = { site: f.site, floor: f.floor, twist: '', fin: 1, fast: 0, hard: 0, best: 400, n }; };
  ok(G.ROAD.length === 20 && G.ROAD[19].floor === 275 && G.ZONES.every(z => G.ROAD.filter(f => f.zone === z).length === 4) && G.ROAD.slice(0, 4).every((f, i) => f.site === G.FIXED[i].site && f.floor === G.FIXED[i].floor) && G.ROAD.every(f => G.ZONES.includes(f.zone)), 'twenty levels, four in each land, the first four as before');
  ok([50, 75, 100, 125, 150, 175, 200, 225, 250, 275].every(fl => G.ROAD.filter(f => f.floor === fl).length === 2), 'every depth is met twice');
  for (const f of G.FIXED) fin(f);
  s.road.reach = 75;
  let d = G.dealCards(s);
  ok(d.length === 1 && d[0].kind === 'fixed' && d[0].level === 5 && d[0].of === 20 && d[0].site === 'dunes' && d[0].floor === 100, 'after the four: level 5 of 20, one card');
  ok(G.roadLevel(s).level === 5, 'the road knows the level');
  s.road.stamps[G.siteKey('dunes', 100)] = { site: 'dunes', floor: 100, twist: '', fin: 0, fast: 0, hard: 0, best: 0, n: 1 };
  s.road.deal = null; d = G.dealCards(s);
  ok(d.length === 1, 'one failed try: still one card');
  s.road.stamps[G.siteKey('dunes', 100)].n = 2;
  s.road.deal = null; d = G.dealCards(s);
  ok(d.length > 1 && d[0].kind === 'fixed' && d[0].level === 5 && d.slice(1).every(c => c.kind !== 'fixed' && c.floor <= 75), 'two failed tries: the level stays first, side cards on finished floors beside it');
  ok(G.fixedNext(s).level === 5, 'a level past the fourth is never skipped');
  for (const f of G.ROAD) fin(f);
  ok(G.fixedNext(s) === null && G.roadLevel(s).level === 21, 'the road ends');
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('sites: ok');
