// Dig: lessons wait their turn (proto/ui/lessons.js). Run: node test_proto_lessons.js
import { createLessons } from './proto/ui/lessons.js';
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const run = (L, secs, blocked = false) => { for (let i = 0; i < secs / 0.1 - 1e-9; i++) L.tick(0.1, blocked); };

{ // order, and a second one waits for the first
  const got = [];
  const L = createLessons({ onTaught: f => got.push(f) });
  ok(L.request('a', 'A') && L.request('b', 'B'), 'both accepted');
  ok(!L.request('b', 'B'), 'the same lesson is not queued twice');
  L.tick(0.1);
  ok(L.current.flag === 'a' && L.waiting === 1, 'a shows first, b waits');
  run(L, 2.5);
  ok(L.current.flag === 'a' && got.length === 0, 'a still on show and not taught before 3 s');
  run(L, 1);
  ok(got.join() === 'a', 'a taught after its minimum time');
  L.tick(0.1);
  ok(L.current && L.current.flag === 'b', 'then b');
}
{ // an ordinary toast has no way in: the queue only changes through request
  const L = createLessons();
  L.request('a', 'A'); L.tick(0.1);
  const before = L.current;
  run(L, 1);
  ok(L.current === before, 'the lesson stays while time passes');
}
{ // taught only when shown; a banner pauses it
  const got = [];
  const L = createLessons({ onTaught: f => got.push(f) });
  L.request('a', 'A');
  ok(got.length === 0, 'requested is not taught');
  run(L, 10, true);
  ok(got.length === 0 && !L.current, 'a banner holds it back; nothing shown, nothing taught');
  run(L, 2);
  ok(got.length === 0, 'not yet taught at 2 s');
  run(L, 0.5, true);
  run(L, 1.2);
  ok(got.join() === 'a', 'taught after 3 s of real showing');
}
{ // a click teaches at once and moves on
  const got = [];
  const L = createLessons({ onTaught: f => got.push(f) });
  L.request('a', 'A'); L.request('b', 'B'); L.tick(0.1);
  ok(L.click() && got.join() === 'a', 'click teaches');
  L.tick(0.1);
  ok(L.current.flag === 'b', 'next one up');
  ok(!createLessons().click(), 'click with nothing on show does nothing');
}
{ // the last lesson leaves on its own, after the longest time
  const L = createLessons();
  L.request('a', 'A'); run(L, 4);
  ok(L.current, 'still up at 4 s when nothing waits');
  run(L, 3);
  ok(!L.current, 'gone after the longest time');
}
{ // history keeps 10
  const L = createLessons();
  for (let i = 0; i < 14; i++) { L.request('f' + i, 'T' + i); L.click(); L.tick(0.1); L.click(); }
  const h = L.history;
  ok(h.length === 10 && h[0].flag === 'f4' && h[9].flag === 'f13', 'the last 10 stay: ' + h.map(x => x.flag));
  ok(createLessons({ history: Array.from({ length: 15 }, (_, i) => ({ flag: 'x' + i, text: '' })) }).history.length === 10, 'old history is cut to 10');
}
{ // old saves: no change to the saved state; lessons seen before stay seen
  const s = G.newState();
  s.seen.tntToast = true;
  const s2 = G.deserialize(G.serialize(s));
  ok(s2.seen.tntToast === true, 'a seen flag survives a save');
  const old = JSON.parse(G.serialize(G.newState()));
  const s3 = G.deserialize(JSON.stringify(old));
  ok(s3 && typeof s3.seen === 'object', 'a save loads with an empty seen');
}
if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('lessons: ok');
