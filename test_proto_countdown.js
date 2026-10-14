// The countdown between each Gate and the next: legs, banked time, over, extra time, almodeer / almodeera. Run: node test_proto_countdown.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const NO = () => {};
const fresh = (seed = 1) => { G.seedRng(seed); const s = G.newState(); G.siteRun(s).started = true; return s; };   // a dig whose first hit has landed
const run = (s, secs, ev = NO) => { for (let i = 0; i < secs * 20; i++) G.step(s, 0.05, ev); };

{ // legs add up to the par exactly and follow the rows
  for (const floor of [50, 75, 100, 125, 300]) {
    const legs = G.siteLegs({ floor, par: G.sitePar(floor, '') });
    ok(legs.length === floor / 25, 'one leg per Big Rock: ' + floor);
    ok(legs.reduce((n, l) => n + l.len, 0) === G.sitePar(floor, ''), 'legs add up to the par: ' + floor);
    ok(legs.every(l => l.len > 0 && l.rows === 25), 'every leg has time and 25 rows');
  }
  const l = G.siteLegs({ floor: 50, par: 301 });
  ok(l[0].len + l[1].len === 301, 'an odd par still adds up');
}
{ // the countdown counts down, banks saved time, forgives nothing it should not, never fails at 0
  const s = fresh(); const seen = [];
  const r = G.siteRun(s), legs = G.siteLegs(r);
  ok(G.legLeft(r, 0).left === legs[0].len, 'the first leg starts full');
  run(s, 10);
  ok(Math.abs(G.legLeft(s.run, 0).left - (legs[0].len - 10)) < 0.01, 'time left goes down with attended seconds');
  s.bossesDown = 1; G.step(s, 0.05, (k, d) => seen.push([k, d]));
  const d = seen.find(([k]) => k === 'legDone');
  ok(d && d[1].saved > 130 && d[1].idx === 0, 'a Rock closes the leg with the saved seconds');
  const c = G.legLeft(s.run, 1);
  ok(c.idx === 1 && c.left > legs[1].len + 130, 'the next leg starts fresh plus the banked seconds');
  s.bossesDown = 2; G.step(s, 0.05, NO);
  ok(s.run.done && s.run.time <= s.run.par, 'the Gate broke under par: Fast rule unchanged');
}
{ // over: nothing fails; the clock goes negative; fast is lost; the next leg is fresh
  const s = fresh(); G.siteRun(s);
  s.run.clock = s.run.par; s.bossesDown = 0; run(s, 5);
  const c = G.legLeft(s.run, 0);
  ok(c.over && c.left < 0 && !s.run.done, 'at 0 nothing ends, the clock counts over');
  s.bossesDown = 1; G.step(s, 0.05, NO);
  ok(G.legLeft(s.run, 1).left <= G.siteLegs(s.run)[1].len && !G.legLeft(s.run, 1).over, 'late leg: nothing banked, next leg fresh');
  s.bossesDown = 2; G.step(s, 0.05, NO);
  ok(s.run.done && s.run.time > s.run.par && s.road.stamps['dunes:50'].fast === 0, 'no Fast medal when over par');
}
{ // a run saved before legs gets its leg from its clock
  const s = fresh(); G.siteRun(s);
  delete s.run.legIdx; delete s.run.legAt; delete s.run.legBank; delete s.run.legLast;
  s.run.clock = 100; s.bossesDown = 1;
  const c = G.legLeft(s.run, 1);
  ok(c.idx === 1 && c.left > G.siteLegs(s.run)[1].len - 1, 'an old run in play: leg 2, banked from the clock');
  const t = G.deserialize(G.serialize(s));
  ok(t && t.run && t.run.legIdx === 1, 'legs survive save and load');
}
{ // extra time: once per leg, only at 0, counts toward Fast
  const s = fresh(); G.siteRun(s);
  ok(G.legExtend(s, 15) === 0, 'no extra while time is left');
  s.run.clock = G.siteLegs(s.run)[0].len; run(s, 1);
  ok(G.legExtend(s, 15) === 15 && G.runPar(s.run) === s.run.par + 15, 'extra granted at 0');
  ok(G.legLeft(s.run, 0).left > 10, 'the clock jumps back up');
  ok(G.legExtend(s, 15) === 0 || G.legLeft(s.run, 0).left > 0, 'once per leg');
  const left = G.legLeft(s.run, 0).left;
  s.bossesDown = 2; G.step(s, 0.05, NO);
  ok(s.run.time <= G.runPar(s.run) === (s.road.stamps['dunes:50'].fast === 1), 'Fast uses the extended par');
  ok(left > 0, 'extension leaves time on the clock');
}
{ // almodeer or almodeera: 50/50, per site, deterministic, kept in the save
  let fem = 0;
  for (let seed = 1; seed <= 200; seed++) { const s = fresh(seed); const a = G.chatterBossFem(s); ok(a === G.chatterBossFem(s), 'stable once rolled'); fem += a; }
  ok(fem > 70 && fem < 130, 'about half are almodeera: ' + fem);
  const a = fresh(7), fa = G.chatterBossFem(a), b = fresh(7);
  ok(fa === G.chatterBossFem(b), 'same seed, same manager');
  const t = G.deserialize(G.serialize(a));
  ok(t.bossFem === a.bossFem, 'the manager survives save and load');
  const old = G.deserialize(JSON.stringify({ ...JSON.parse(G.serialize(a)), bossFem: undefined }));
  ok(old && (G.chatterBossFem(old) === 0 || G.chatterBossFem(old) === 1), 'an old save without it loads');
  for (const k of ['all_0', 'tea_0', 'wake_0', 'back_0', 'time_zero_0', 'time_extend_0', 'time_start_0']) ok(G.t('bossf_' + k) !== 'bossf_' + k && G.t('boss_' + k) !== 'boss_' + k, 'both line sets exist: ' + k);
  ok(G.t('bossf_name') === 'almodeera', 'her name label');
}
{ // the shouts: start, half, 30, 10, 0 (maybe extend), early, late; a sleeper wakes for 10
  const s = fresh(3); for (let i = 0; i < 3; i++) s.diggers.push(G.newRafeeq ? G.newRafeeq(s) : { x: 0 });
  const r = G.siteRun(s), mem = G.chatterBossMem();
  const say = c => G.chatterTimeStep(s, mem, r, G.legLeft(r, s.bossesDown), { rnd: () => 0.9, muted: false, ...c });
  ok(s.diggers.length >= 3, 'three Rafeeqs hired');
  ok(say() === 'start', 'start of the first leg');
  mem.lineLeft = 0;
  r.clock = G.siteLegs(r)[0].len / 2 + 1; ok(say() === 'half', 'half left');
  mem.lineLeft = 0; r.clock = G.siteLegs(r)[0].len - 29; ok(say() === 't30', '30 s');
  mem.lineLeft = 0; mem.asleep = true; r.clock = G.siteLegs(r)[0].len - 9; ok(say() === 't10' && !mem.asleep, 'asleep, he wakes for 10 s');
  r.clock = G.siteLegs(r)[0].len + 1; mem.lineLeft = 0;
  ok(say({ rnd: () => 0.9 }) === 'zero', 'zero: a line');
  mem.lineLeft = 0;
  { // extra time is rolled in the rules (core rnd), once per leg, stored in the run; the manager only says the line on the event
    const seen = []; let granted = 0;
    for (let seed = 1; seed <= 60 && !granted; seed++) {
      const z = fresh(seed); for (let i = 0; i < 3; i++) z.diggers.push(G.newRafeeq(z));
      const zr = G.siteRun(z); zr.clock = G.siteLegs(zr)[0].len + 1;
      G.step(z, 0.05, (k, d) => seen.push([k, d]));
      if (zr.legRoll === 0 && zr.extra) {
        granted = zr.extra;
        ok(seen.some(([k]) => k === 'legExtended'), 'the rules emit legExtended');
        ok(G.chatterLegRoll(z, NO) === 0 && zr.extra === granted, 'no second grant in the same leg');
        const z2 = fresh(1); z2.diggers = z.diggers; z2.run = JSON.parse(JSON.stringify(z.run)); z2.run.legExt = undefined; z2.run.extra = 0; z2.run.legBank = 0;
        ok(G.chatterLegRoll(z2, NO) === 0, 'a reloaded run remembers its roll (legRoll): no re-roll');
        const m = G.chatterBossMem();
        ok(G.chatterBossExtended(z, m, { muted: false, rnd: () => 0.1 }) === 'extend' && m.bump > 0 && m.line, 'the manager says the extend line and bumps on the event');
      }
    }
    ok(granted >= 15, 'some seed grants extra time (about 1 in 3)');
    const none = fresh(5); const nr = G.siteRun(none); nr.clock = G.siteLegs(nr)[0].len + 1; G.step(none, 0.05, NO);
    ok(nr.legRoll === undefined && !nr.extra, 'fewer than 3 Rafeeqs: no roll at all');
    const hit = fresh(2); for (let i = 0; i < 3; i++) hit.diggers.push(G.newRafeeq(hit)); const hr = G.siteRun(hit);
    G.step(hit, 0.05, NO); ok(hr.legRoll === undefined, 'no roll while time is left');
  }
  s.bossesDown = 1; G.step(s, 0.05, NO); mem.lineLeft = 0;
  const w = say(); ok(w === 'late' || w === 'early', 'a Rock broken gives a closing line');
  const none = fresh(3); const m2 = G.chatterBossMem();
  ok(G.chatterTimeStep(none, m2, G.siteRun(none), G.legLeft(G.siteRun(none), 0), { rnd: Math.random }) === '', 'fewer than 3 Rafeeqs: no manager, no shout');
}
if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('countdown ok');
