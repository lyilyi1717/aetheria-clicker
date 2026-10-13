// Dig: more picks that play a rhythm (proto/features/picks). Run: node test_proto_picks.js
// Nobody who works on this can hear it, so the rhythm is proved here: the scheduler is run frame by
// frame at every pick count and tempo and the times it hands out are checked against the grid.
// `node test_proto_picks.js --table` also prints the bars as text.
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const P = G.PARAMS.picks;
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;
const cell = (t, hp = 10) => ({ t, hp, max: hp, s: 0 });
function field(hp = 10) {
  G.seedRng(7);
  const s = G.newState();
  for (let i = 0; i < s.rows.length; i++) for (let c = 0; c < G.COLS; c++) s.rows[i][c] = cell('dirt', hp);
  return s;
}
// the pointer rests on column c: the pick lands on the first block down that column
const aimCol = (s, c) => () => { for (let i = 0; i < G.VIEW_ROWS; i++) if (s.rows[i][c]) return G.reachable(s, s.top + i, c) ? [s.top + i, c] : null; return null; };
const log = () => { const L = []; const ev = (k, d) => L.push([k, d]); ev.of = k => L.filter(x => x[0] === k).map(x => x[1]); return ev; };
const TEMPOS = P.tempos.slice(), COUNTS = [1, 2, 3, 4], TOP = Math.max(...TEMPOS);

// ---------- rules ----------
{ // a fresh dig: one pick, the first tempo, the old pace
  const s = G.newState();
  ok(G.picksCount(s) === 1 && G.picksBpm(s) === 100, 'a new dig has one pick at 100 beats a minute');
  ok(near(G.picksHps(s), 100 / 30) && near(G.picksPace(s), 1), 'one pick at the first tempo swings as much as the old held mouse (3.33 strikes x 2 swings = 6.67 a second)');
  ok(!G.itemOpen(s, 'pick2') && !G.itemOpen(s, 'pick3') && !G.itemOpen(s, 'tempo'), 'nothing of it is in the shop at the start');
}

{ // extra picks are real extra hits of your own pick
  const undo = G.setParam('crits.chance', 0);
  const s = field(1000), ev = log();
  const one = G.pickPower(s);
  const done = G.picksStrike(s, 3, aimCol(s, 4), ev);
  ok(done === 3 * P.heft && s.hits === 3 * P.heft, 'a note of three picks is three strikes, each ' + P.heft + ' swings of the rules');
  ok(near(1000 - s.rows[0][4].hp, 3 * P.heft * one), 'each of them hits as hard as your pick');
  ok(ev.of('swing').length === 3 * P.heft && ev.of('hit').every(d => d.src === 'you'), 'and each is a swing of yours (big hits, Echo, Boom Pick count every one)');
  const s1 = field(1000); G.picksStrike(s1, 1, aimCol(s1, 4));
  ok(near((1000 - s.rows[0][4].hp) / (1000 - s1.rows[0][4].hp), 3), 'three picks: three times one pick');
  // Boom Pick counts every swing of every pick
  const s2 = field(1000); s2.relics.boom = 3;
  G.picksStrike(s2, 3, aimCol(s2, 4));
  ok(s2.queue.filter(q => q.kind === 'blast').length === Math.floor(3 * P.heft / G.boomEvery(s2)), 'Boom Pick counts the hits of every pick');
  undo();
}

{ // the rest of a note goes on to the next block
  const undo = G.setParam('crits.chance', 0);
  const s = field(1), ev = log();            // every block breaks in one swing
  for (let i = 0; i < 6; i++) s.rows[i][4].hp = s.rows[i][4].max = G.pickPower(s);
  const done = G.picksStrike(s, 2, aimCol(s, 4), ev);
  const broke = ev.of('break').filter(d => d.c === 4 && d.src === 'you');
  ok(done === 2 * P.heft && broke.length === 2 * P.heft, 'when a block breaks the rest of the note lands on the next one: no hit is wasted');
  ok(broke.map(d => d.r).join() === [0, 1, 2, 3].slice(0, 2 * P.heft).join(), 'it sweeps down the column under the pointer');
  // a block that takes three swings: the fourth goes to the block below
  const s2 = field(1000);
  s2.rows[0][4].hp = s2.rows[0][4].max = 3 * G.pickPower(s2);
  G.picksStrike(s2, 2, aimCol(s2, 4));
  ok(s2.rows[0][4] === null && near(1000 - s2.rows[1][4].hp, (2 * P.heft - 3) * G.pickPower(s2)), 'left-over swings carry on, they are not lost');
  // nothing to hit: the note stops
  const s3 = field(10);
  ok(G.picksStrike(s3, 4, () => null) === 0 && s3.hits === 0, 'a note with nothing under the pick does nothing');
  undo();
}

{ // the shop: Second Pick, One More Pick, Faster Hands
  const s = field(10), ev = log();
  s.coins = 1e9;
  ok(!G.itemOpen(s, 'pick2'), 'Second Pick is closed before the first Big Rock');
  ok(!G.buy(s, 'pick3', ev), 'One More Pick cannot be bought without Stars');
  s.bossesDown = P.secondRock;
  ok(G.itemOpen(s, 'pick2') && G.upgradeCost(s, 'pick2') === P.secondCost, 'it opens when the first Big Rock is down, at its price');
  ok(G.buy(s, 'pick2', ev) && G.picksCount(s) === 2 && s.picks.second, 'bought: two picks');
  ok(ev.of('picksMore').length === 1 && ev.of('picksMore')[0].n === 2, 'the page is told');
  ok(!G.itemOpen(s, 'pick2') && !G.canBuy(s, 'pick2') && !G.buy(s, 'pick2'), 'it leaves the shop: once, for ever');
  ok(near(G.picksPace(s), 2), 'two picks: twice the swings');
  s.total = P.tempoOpen;
  ok(G.itemOpen(s, 'tempo') && G.upgradeCost(s, 'tempo') === P.tempoBase, 'Faster Hands opens early');
  const seen = [G.picksBpm(s)];
  while (G.buy(s, 'tempo', ev)) seen.push(G.picksBpm(s));
  ok(seen.join() === TEMPOS.join() && s.up.tempo === TEMPOS.length - 1, 'each step is the next tempo, and it stops at the last (' + seen.join(', ') + ')');
  ok(near(G.picksStep(s), 15 / TOP) && near(G.picksHps(s), 2 * 8 * TOP / 240), 'the step and the hits a second follow the tempo');
  // a New Site: the picks stay, the tempo starts again
  s.stars = P.starCosts[0] + P.starCosts[1]; s.starSpent = 0;
  G.reset(s, 'site');
  ok(G.picksCount(s) === 2 && s.up.tempo === 0 && G.picksBpm(s) === 100, 'a New Site keeps the Second Pick and starts the tempo again');
  ok(!G.itemOpen(s, 'pick2') && G.upgradeCost(s, 'pick2') === Infinity, 'and the Second Pick is not sold twice');
  ok(!G.itemOpen(s, 'pick3'), 'One More Pick waits for Big Rock ' + P.starRocks[0]);
  s.starBoss = P.starRocks[0];
  ok(G.itemOpen(s, 'pick3') && G.upgradeCost(s, 'pick3') === P.starCosts[0] && G.ITEMS.pick3.shop === 'picks' && G.SHOPS.picks.wallet === 'stars', 'One More Pick is sold for Stars');
  const had = s.stars;
  ok(G.buy(s, 'pick3', ev) && G.picksCount(s) === 3 && s.stars === had - P.starCosts[0] && s.starSpent === P.starCosts[0], 'the third pick costs Stars, and they count as spent (the Star bonus stays)');
  ok(!G.itemOpen(s, 'pick3'), 'the fourth pick waits for Big Rock ' + P.starRocks[1]);
  s.starBoss = P.starRocks[1];
  ok(G.itemOpen(s, 'pick3') && G.buy(s, 'pick3', ev) && G.picksCount(s) === 4 && !G.canBuy(s, 'pick3'), 'the fourth pick, and that is all');
  ok(near(G.picksPace(s), 4), 'four picks: four times the swings');
  G.reset(s, 'site'); G.reset(s, 'land');
  ok(G.picksCount(s) === 4, 'four picks cross a New Site and a new land');
  // the scripted player buys the Star picks
  const b = field(10); b.picks.second = true; b.stars = P.starCosts[0]; b.starBoss = 9;
  const bot = G.BOTS.find(x => x.id === 'picks');
  ok(bot && bot.shop(b, {}) === 1 && G.picksCount(b) === 3 && bot.shop(b, {}) === 0, 'the sim player buys a pick when it has the Stars');
}

{ // content, words, saves
  const u = G.unlocks();
  ok(['shop:pick2', 'shop:pick3', 'pick3:2', 'shop:tempo', 'tempo:5'].every(id => u.byId[id]), 'the picks and the tempo steps are counted as content');
  ok(u.byId['shop:pick2'].cat === 'core' && u.byId['tempo:3'].cat === 'grind', 'picks are core, tempo steps are grind');
  for (const k of ['up_pick2', 'up_pick2_d', 'up_pick3', 'up_pick3_d1', 'up_pick3_d2', 'up_tempo', 'up_tempo_d', 'up_tempo_full', 'picks_beat', 't_picks_2', 't_picks_3', 't_picks_4', 't_tempo', 'bar_1', 'bar_2', 'bar_3', 'bar_4']) ok(G.hasString(k), 'string ' + k);
  const s = field(10);
  s.picks.second = true; s.picksUp.pick3 = 1; s.up.tempo = 3;
  const back = G.deserialize(G.serialize(s));
  ok(back && G.picksCount(back) === 3 && G.picksBpm(back) === TEMPOS[3], 'a save keeps the picks and the tempo');
  const old = JSON.parse(G.serialize(field(10)));
  delete old.picks; delete old.picksUp; delete old.up.tempo; delete old.up.pick2;
  const o = G.deserialize(JSON.stringify(old));
  ok(o && o.picks && o.picks.second === false && G.picksCount(o) === 1 && G.picksBpm(o) === 100 && o.up.tempo === 0, 'an old save without the slice loads with one pick at the first tempo');
  ok(G.swing(o, o.top, 0) && G.buy(Object.assign(o, { coins: 1e9, total: 1e9 }), 'tempo'), 'and it plays');
}

{ // Punch-through: the strength left over goes into the block below (the reach is the Pick track's)
  const undo = G.setParam('crits.chance', 0);
  const mk = steps => { const s = field(10); s.starUp.tr_pick = steps; return s; };
  const hit = s => G.pickPower(s);
  const set = (s, hps) => hps.forEach((h, i) => { s.rows[i][4].hp = s.rows[i][4].max = h * hit(s); });
  const s0 = mk(0); set(s0, [0.25, 100]);
  G.swing(s0, 0, 4);
  ok(s0.rows[0][4] === null && near(s0.rows[1][4].hp, 100 * hit(s0)), 'no Pick step: what is left of a hit is lost, as before');
  const s1 = mk(1), ev = log(); set(s1, [0.25, 100]);
  ok(G.starshopPunch(s1) === 1, 'the first Pick step is Punch-through, reach 1');
  G.swing(s1, 0, 4, ev);
  ok(s1.rows[0][4] === null && near(s1.rows[1][4].hp, (100 - 0.75) * hit(s1)), 'reach 1: the hit minus the block goes into the block below');
  ok(ev.of('punch').length === 1 && ev.of('punch')[0].n === 1, 'the page is told');
  const s1b = mk(1); set(s1b, [0.25, 0.25, 100]);
  G.swing(s1b, 0, 4);
  ok(s1b.rows[1][4] === null && near(s1b.rows[2][4].hp, 100 * hit(s1b)), 'reach 1 stops after one block, even with strength to spare');
  const s2 = mk(9); set(s2, [0.25, 0.25, 100]);
  G.swing(s2, 0, 4);
  ok(G.starshopPunch(s2) === 2 && s2.rows[1][4] === null && near(s2.rows[2][4].hp, (100 - 0.5) * hit(s2)), 'reach 2: through two blocks, less each time');
  const s9 = mk(29); set(s9, [0.1, 0.1, 0.1, 0.1, 0.1, 100]);
  G.swing(s9, 0, 4);
  ok([0, 1, 2, 3, 4].every(i => s9.rows[i][4] === null) && near(s9.rows[5][4].hp, (100 - 0.5) * hit(s9)), 'no limit: it goes on until the strength is spent');
  const sg = mk(29); set(sg, [0.25, 100, 100]); sg.rows[1][4] = null;
  G.swing(sg, 0, 4);
  ok(near(sg.rows[2][4].hp, 100 * hit(sg)), 'it stops at an empty cell');
  const sn = mk(29); set(sn, [2, 100]);
  G.swing(sn, 0, 4);
  ok(sn.rows[0][4] && near(sn.rows[1][4].hp, 100 * hit(sn)), 'a hit that does not break the block punches nothing');
  // a Big Rock stops it
  const sb = mk(29); set(sb, [0.25]);
  for (let c = 0; c < G.COLS; c++) sb.rows[1][c] = cell('boss', 1000);
  const bhp = sb.rows[1].map(x => x.hp).join(), boss = sb.boss ? JSON.stringify(sb.boss) : '';
  G.swing(sb, 0, 4);
  ok(sb.rows[0][4] === null && sb.rows[1].map(x => x.hp).join() === bhp && (sb.boss ? JSON.stringify(sb.boss) : '') === boss, 'a Big Rock stops it: the Rock is not touched');
  // with several picks every swing punches
  const sp = mk(1); set(sp, [0.5, 100]);
  G.picksStrike(sp, 1, aimCol(sp, 4));
  ok(sp.rows[0][4] === null && near(sp.rows[1][4].hp, (100 - 0.5 - 1) * hit(sp)), 'a strike of two swings: the first punches, the second carries on to the next block');
  undo();
}

// ---------- the rhythm ----------
const FLOOR = P.floor;
ok(FLOOR >= 0.07 && FLOOR <= 0.08, 'the floor between two notes is 70 to 80 ms');
ok(Math.max(...TEMPOS) <= 15 / FLOOR && TEMPOS.every((b, i) => !i || b > TEMPOS[i - 1]) && TEMPOS.every(Number.isInteger), 'tempos are whole beats a minute, rising, never past the floor (200)');
ok(TEMPOS.slice(1).every((b, i) => b / TEMPOS[i] > 1.08 && b / TEMPOS[i] < 1.12), 'each tempo step is the same musical step (about one tenth faster)');

for (const n of COUNTS) {
  const bar = G.picksBarOf(n);
  ok(G.picksBarFaults(n, { floor: FLOOR, maxBpm: Math.max(...TEMPOS) }).length === 0, `the bar for ${n}: 16 steps, 8 hits a pick, step 1 is all picks and an accent, no run over 4 steps`);
  ok(bar.n.reduce((a, b) => a + b, 0) === 8 * n, `${n} picks: ${8 * n} hits a bar`);
  ok(bar.n.filter(x => !x).length >= 4, `${n} picks: the bar has rests`);
  ok(new Set(bar.v.filter(v => v !== '.')).size >= 2 && bar.v.filter(v => v === 'X').length >= 4 && bar.v.filter(v => v === 'X').length <= 6, `${n} picks: four to six accents a bar, and softer notes between them`);
  ok(G.hasString(bar.name), `${n} picks: the groove has a name`);
}
ok(new Set(COUNTS.map(n => G.PICKS_BARS[n].hits)).size === 4 && new Set(COUNTS.map(n => G.picksBarText(n))).size === 4, 'every pick count has its own groove');
ok(G.picksBarText(1) === 'X . x . X . x . X . x . X . x .', 'one pick: a steady beat');
ok(G.picksBarText(4).replace(/ /g, '').slice(0, 8) === 'X.xX.xX.', 'four picks: accents on 1, 4 and 7 (3 + 3 + 2) with a clap between');
ok(P.gain.X > P.gain.x && P.gain.x > P.gain.o && P.gain.o >= 0.4 && P.gain.X <= 1, 'accents are louder, soft notes still heard, nothing louder than the sound as written');

// run the scheduler like the page does: a frame every 1/60 s give or take, for `bars` bars
function record(n, bpm, bars, { cfg = P, frame = 1 / 60, jitter = 0.006, seed = 5, t0 = 12.345 } = {}) {
  const rnd = G.mulberry(seed), seq = G.picksSeq(cfg), bar = G.picksBarOf(n), step = G.picksStepSec(bpm);
  const out = [];
  let now = t0;
  const end = t0 + bars * 16 * step - 1e-6;
  while (now < end + cfg.look) {
    for (const note of seq.advance(now, true, bar, step)) if (note.t < end) out.push({ ...note, handed: now });
    now += frame + (rnd() - 0.5) * 2 * jitter;
  }
  return { notes: out, t0, step, bar };
}

const rows = [];
for (const n of COUNTS) for (const bpm of TEMPOS) {
  const BARS = 4, { notes, t0, step, bar } = record(n, bpm, BARS);
  const want = [];
  for (let b = 0; b < BARS; b++) for (let i = 0; i < 16; i++) if (bar.n[i]) want.push({ t: t0 + (b * 16 + i) * step, slot: i, n: bar.n[i], v: bar.v[i] });
  const tag = `${n} picks at ${bpm}`;
  ok(notes.length === want.length, `${tag}: ${want.length} notes in ${BARS} bars (got ${notes.length})`);
  ok(notes.every((x, i) => want[i] && near(x.t, want[i].t, 1e-9) && x.slot === want[i].slot), `${tag}: every note is on its step of the grid, to the nanosecond`);
  ok(notes.every((x, i) => want[i] && x.n === want[i].n && x.v === want[i].v), `${tag}: the hits and the accents are the bar's`);
  ok(notes.every(x => x.t >= x.handed - 1e-12 && x.t - x.handed <= P.look + 1e-9), `${tag}: a note is handed out before it sounds, at most ${P.look * 1000} ms early`);
  let gap = Infinity;
  for (let i = 1; i < notes.length; i++) gap = Math.min(gap, notes[i].t - notes[i - 1].t);
  ok(gap >= FLOOR - 1e-9 && near(gap, step * (n === 1 ? 2 : 1)), `${tag}: the closest two notes are ${(gap * 1000).toFixed(1)} ms apart (floor ${FLOOR * 1000})`);
  const secs = BARS * 16 * step, hits = notes.reduce((a, x) => a + x.n, 0);
  ok(near(hits / secs, n * bpm / 30) && near(hits / secs, G.picksHitsPerSec(n, bpm)), `${tag}: ${(hits / secs).toFixed(2)} hits a second`);
  ok(notes.length / secs <= 1 / FLOOR && near(notes.length / secs, G.picksNotesPerSec(n, bpm)), `${tag}: ${(notes.length / secs).toFixed(2)} notes a second`);
  // every pick strikes 8 times a bar, in turn
  const per = Array(n).fill(0);
  for (const x of notes) { ok(x.hands.length === x.n && new Set(x.hands).size === x.n, `${tag}: a note's picks are different picks`); for (const h of x.hands) per[h]++; }
  ok(per.every(k => k === 8 * BARS), `${tag}: each pick strikes 8 times a bar`);
  // the bar is audible as a bar: the accents come back at the same places every bar
  const acc = b => notes.filter(x => x.v === 'X' && x.t >= t0 + b * 16 * step - 1e-9 && x.t < t0 + (b + 1) * 16 * step - 1e-9).map(x => x.slot).join();
  ok(acc(0) === acc(1) && acc(1) === acc(3) && acc(0).startsWith('0'), `${tag}: the accents repeat bar after bar`);
  if (bpm === TEMPOS[0] || bpm === TEMPOS[TEMPOS.length - 1]) rows.push({ n, bpm, notes: notes.length / secs, hits: hits / secs, gap });
}

{ // the top of both upgrades
  const top = Math.max(...TEMPOS), r = record(4, top, 8);
  let gap = Infinity; for (let i = 1; i < r.notes.length; i++) gap = Math.min(gap, r.notes[i].t - r.notes[i - 1].t);
  ok(gap >= FLOOR && near(gap, 15 / top), `four picks at ${top}: never two notes closer than ${(gap * 1000).toFixed(1)} ms`);
  let most = 0;
  for (const a of r.notes) most = Math.max(most, r.notes.filter(b => b.t >= a.t && b.t < a.t + 1).length);
  ok(most <= 12, `four picks at ${top}: at most ${most} notes in any one second (12 or fewer)`);
  const sizes = new Set(r.notes.map(x => x.n)), vels = new Set(r.notes.map(x => x.v));
  ok(sizes.size >= 3 && vels.size === 3, 'at the top the bar still has three loudnesses and chords of several sizes: no machine gun');
  ok(near(G.picksHitsPerSec(4, top), 4 * top / 30) && G.picksNotesPerSec(4, top) < 9 && G.picksNotesPerSec(4, top) < G.picksNotesPerSec(3, top), 'more picks made the notes heavier, not closer (under 9 notes a second, fewer than three picks play)');
}

{ // the floor holds whatever the numbers say
  const undo = G.setParam('picks.tempos.5', 400);
  const s = G.newState(); s.up.tempo = 5;
  ok(G.picksBpm(s) === 200 && G.picksStep(s) >= FLOOR - 1e-12, 'a tempo past the floor is played at the floor (200)');
  undo();
  // even a scheduler fed a step shorter than the floor never puts two notes closer than it
  const seq = G.picksSeq(P), bar = G.picksBarOf(3), ts = [];
  for (let now = 0; now < 3; now += 1 / 60) for (const x of seq.advance(now, true, bar, 0.03)) ts.push(x.t);
  ok(ts.length > 10 && ts.every((t, i) => !i || t - ts[i - 1] >= FLOOR - 1e-9), 'the scheduler itself refuses notes closer than the floor');
}

{ // holding keeps the phase; a new hold starts clean; tapping is never faster than holding
  const bar = G.picksBarOf(2), step = G.picksStepSec(126);
  const seq = G.picksSeq(P), got = [];
  let now = 3;
  const run = (secs, dig) => { const end = now + secs; for (; now < end; now += 1 / 60) for (const x of seq.advance(now, dig, bar, step)) got.push(x); };
  run(1.0, true);
  const first = got[0];
  ok(first.slot === 0 && near(first.t, 3) && first.n === 2 && first.v === 'X', 'a hold starts on step 1 at once: every pick, accented');
  ok(got.every(x => near((x.t - 3) / step, Math.round((x.t - 3) / step), 1e-6)), 'while held, the phase is kept');
  const before = got.length;
  run(step * 2, false);                      // let go for less than a beat
  run(1.0, true);
  ok(got.slice(before).every(x => near((x.t - 3) / step, Math.round((x.t - 3) / step), 1e-6)) && got[before].slot !== 0, 'a pause shorter than a beat keeps the phase (no restart to cheat with)');
  const mid = got.length;
  run(step * 12, false);                     // let go for three beats
  const press = now;
  run(1.0, true);
  ok(got[mid].slot === 0 && near(got[mid].t, press) && got[mid + 1].slot === 2, 'a new hold after a pause starts the bar again from step 1, at once');
  ok(got.every((x, i) => !i || x.t - got[i - 1].t >= FLOOR - 1e-9), 'and no two notes are closer than the floor across all of it');
  // tapping as fast as a hand can (press 50 ms, let go 50 ms) lands fewer hits than holding
  const tap = G.picksSeq(P), held = G.picksSeq(P);
  let nt = 0, nh = 0, k = 0;
  for (let t = 0; t < 8; t += 1 / 120, k++) {
    for (const x of tap.advance(t, Math.floor(t / 0.05) % 2 === 0, bar, step)) nt += x.n;
    for (const x of held.advance(t, true, bar, step)) nh += x.n;
  }
  ok(nt <= nh && nt > 0, `tapping (${nt} hits in 8 s) is not faster than holding (${nh})`);
  // one click every 1.5 s: each one lands the first note
  const click = G.picksSeq(P); let nc = 0;
  for (let t = 0; t < 6; t += 1 / 120) for (const x of click.advance(t, t % 1.5 < 0.03, bar, step)) { nc++; ok(x.slot === 0, 'a single click is step 1'); }
  ok(nc === 4, 'a single click always lands');
}

{ // a frame that hangs: no burst afterwards
  const bar = G.picksBarOf(4), step = G.picksStepSec(TOP), seq = G.picksSeq(P), got = [];
  let now = 0;
  for (; now < 1; now += 1 / 60) for (const x of seq.advance(now, true, bar, step)) got.push({ ...x, handed: now });
  now += 0.4;                                // the page hangs for 400 ms
  const after = got.length;
  for (const end = now + 1; now < end; now += 1 / 60) for (const x of seq.advance(now, true, bar, step)) got.push({ ...x, handed: now });
  ok(got.slice(after).filter(x => near(x.handed, got[after].handed)).length <= 1, 'after a hang at most one note sounds at once: the missed ones are dropped');
  ok(got.every((x, i) => !i || x.t - got[i - 1].t >= FLOOR - 1e-9), 'and the floor still holds');
  ok(got.slice(after + 1).every(x => near(x.t / step, Math.round(x.t / step), 1e-6)), 'and the bar is back on its grid, in phase');
}

{ // other sounds go to the grid: the next step, or the next off-beat eighth
  const bar = G.picksBarOf(1), step = G.picksStepSec(100), seq = G.picksSeq(P);
  let now = 0;
  for (; now < 0.5; now += 1 / 60) seq.advance(now, true, bar, step);
  for (let i = 0; i < 40; i++) {
    const t = now + i * 0.013, g = seq.gridAfter(t, step), o = seq.gridAfter(t, step, 2);
    ok(g >= t - 1e-9 && g - t < step + 1e-9 && near(g / step, Math.round(g / step), 1e-6), 'the next step is on the grid and less than a step away');
    ok(o >= t - 1e-9 && o - t < 4 * step + 1e-9 && Math.round(o / step) % 4 === 2, 'the next off-beat is the "and" of a beat, less than a beat away');
  }
}

{ // every land has its own bar for every pick count: same hits a pick, never closer than the floor at the top tempo
  ok(G.BAR_ZONES.join() === G.ZONES.join(), 'a bar set for every zone of the road');
  const seen = new Set();
  for (const zone of G.ZONES) for (const n of COUNTS) {
    const B = G.picksBarOf(n, zone);
    ok(B.zone === zone && B.n.reduce((a, b) => a + b, 0) === 8 * n, zone + ' ' + n + ': 8 hits a pick');
    ok(G.picksBarFaults(n, { floor: P.floor, maxBpm: TOP, zone }).length === 0, zone + ' ' + n + ': no faults at ' + TOP);
    ok(G.t(B.name) !== B.name, zone + ' ' + n + ': the bar has a name');
    seen.add(G.t(B.name));
    const q = G.picksSeq(P), step = 15 / TOP, ts = [];
    let now = 0;
    for (let f = 0; f < 4000; f++, now += 1 / 60) for (const nt of q.advance(now, true, B, step)) ts.push(nt.t);
    ok(ts.length > 60, zone + ' ' + n + ': notes were played');
    let min = 1e9; for (let i = 1; i < ts.length; i++) min = Math.min(min, ts[i] - ts[i - 1]);
    ok(min >= P.floor - 1e-9, zone + ' ' + n + ': every step at ' + TOP + ' is 75 ms or more apart (' + (min * 1000).toFixed(1) + ')');
  }
  ok(seen.size === 20, 'twenty different names');
  ok(G.picksBarOf(1).name === 'bar_1' && G.picksBarOf(4, 'arabia').name === 'bar_4', 'Arabia keeps the old bars');
}

{ // the bar in play and the kit follow the road zone
  const s = G.newState();
  ok(G.roadZone(s) === 'arabia' && G.picksBar(s).zone === 'arabia', 'a new dig plays the Arabia bar');
  for (const f of G.ROAD) {
    s.run = { ...s.run, site: f.site, floor: f.floor, twist: '' };
    ok(G.roadZone(s) === f.zone && G.picksBar(s).zone === f.zone, f.site + ' ' + f.floor + ' plays the ' + f.zone + ' bar');
  }
  s.run = { ...s.run, site: 'dunes', floor: 100, twist: 'heavy' };
  ok(G.picksBar(s).zone === 'africa', 'a side level plays the beat of the deepest road level at or above its floor');
}

{ // the sound kits: a voice for each land beyond Arabia, none for Arabia, and a sting for every land; nothing may throw without sound
  const A = await import('./proto/ui/audio.js'), K = await import('./proto/features/picks/kits.js');
  ok(Object.keys(K.KITS).join() === G.ZONES.slice(1).join(), 'a kit for every land but Arabia');
  for (const z of Object.keys(K.KITS)) ok(['hit', 'crit', 'crew'].every(k => typeof K.KITS[z][k] === 'function'), z + ' has hit, crit and crew');
  ok(K.STING_ZONES.join() === G.ZONES.join(), 'a sting for every land');
  for (const z of G.ZONES) for (const tier of [0, 4]) {
    A.setKit(z, tier);
    ok(A.kitZone() === z && A.kitDepth() === tier, 'the kit is set');
    let thrown = null;
    try { A.sfx.hit(false); A.sfx.hit(true); A.sfx.crit(); A.sfx.crew(); A.sfx.picksSting(z); } catch (e) { thrown = e; }
    ok(!thrown, z + ' sounds do not throw before the first click' + (thrown ? ': ' + thrown.message : ''));
  }
  A.setKit('arabia', 0);
  ok(A.depthPitch() === 1, 'no depth, no lowering');
  A.setKit('arabia', 4);
  ok(A.depthPitch() < 0.85 && A.depthPitch() > 0.7, 'the deepest layer is a little lower, not much');
}

if (process.argv.includes('--table')) {
  console.log(`| picks | groove | the bar (16 steps: X accent, x plain, o soft, . rest) | picks landing on each step | notes a second at ${TEMPOS[0]} / ${TOP} | hits a second at ${TEMPOS[0]} / ${TOP} | closest notes at ${TOP} |`);
  console.log('|---|---|---|---|---|---|---|');
  for (const n of COUNTS) {
    const a = rows.find(r => r.n === n && r.bpm === TEMPOS[0]), b = rows.find(r => r.n === n && r.bpm === TEMPOS[TEMPOS.length - 1]);
    console.log(`| ${n} | ${G.t(G.picksBarOf(n).name)} | \`${G.picksBarText(n)}\` | \`${[...G.PICKS_BARS[n].hits].join(' ')}\` | ${a.notes.toFixed(2)} / ${b.notes.toFixed(2)} | ${a.hits.toFixed(2)} / ${b.hits.toFixed(2)} | ${(b.gap * 1000).toFixed(1)} ms |`);
  }
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('picks: all passed');
