// Rafeeq chatter: traits and lines, the rate rule (never nags), the switch, old saves, and that it writes no number.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as G from './proto/game.js';

const EMOJI = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

// every trait x moment has lines: at most 5 words, no digits, no emoji
assert.equal(G.CHATTER_TRAITS.length, 6);
for (const tr of G.CHATTER_TRAITS) for (const mo of G.CHATTER_MOMENTS) {
  const L = G.chatterLines(tr, mo);
  assert.ok(L.length >= 1, `${tr} ${mo} has a line`);
  for (const l of L) { assert.ok(G.chatterWords(l) <= 5, `${tr} ${mo}: "${l}" is over 5 words`); assert.ok(!/\d/.test(l) && !EMOJI.test(l), `${l} has a digit or emoji`); }
}
for (let k = 0; k < G.CHATTER_PAIRS; k++) { const p = G.chatterPairLines(k, 'Salem'); assert.ok(p.a && p.b && G.chatterWords(p.a) <= 5 && G.chatterWords(p.b) <= 5); }
assert.equal(G.chatterPairLines(0, 'Salem').a, 'Tea, Salem?');

// the page code asks for t() keys that exist (no key left raw)
for (const k of ['chat_talk_on', 'chat_talk_off', 'chat_cheer', 'chat_pat_hint', 'chat_tag_line', 'chat_panel']) assert.notEqual(G.t(k), k);
for (const tr of G.CHATTER_TRAITS) assert.notEqual(G.t('chat_trait_' + tr), 'chat_trait_' + tr);

// traits and names fall back when the rafeeqs feature is not merged
const s = G.newState(); s.coins = 1e9; for (let i = 0; i < 8; i++) G.buy(s, 'crew');
for (let i = 0; i < 8; i++) assert.ok(G.CHATTER_TRAITS.includes(G.chatterTrait(s, i)));
assert.equal(new Set([0, 1, 2, 3, 4, 5].map(i => G.chatterTrait(s, i))).size, 6, 'the first six seats differ');
if (!G.rafeeqName) assert.equal(G.chatterName(s, 2), 'Rafeeq 3');
const pr = G.chatterPair(s, 0); assert.ok(pr.friend === null || (pr.friend >= 0 && pr.friend < 8));

// ---- the rate rule, over ten minutes of a Rafeeq chorus trying to talk ----
function chorus(seed, mins, quiet) {
  G.seedRng(seed);
  const mem = G.chatterMem(), P = G.chatterParams, shown = [];
  let x = seed * 7919 % 2147483647 || 1; const r = () => (x = x * 48271 % 2147483647) / 2147483647;
  for (let step = 0; step < mins * 60 * 10; step++) {
    mem.now = step / 10;
    const due = G.chatterReplyDue(mem); if (due) { shown.push({ at: mem.now, who: due.to, text: due.text, reply: true }); G.chatterReplied(mem, P); }
    if (quiet) continue;
    for (let k = 0; k < 3; k++) {          // three would-be speakers each tenth of a second: far more than a game gives
      const who = Math.floor(r() * 8), lines = G.chatterLines(G.CHATTER_TRAITS[who % 6], G.CHATTER_MOMENTS[Math.floor(r() * 7)]);
      if (!G.chatterAllow(mem, who, P)) continue;
      const text = G.chatterPick(mem, who, lines, r()); if (!text) continue;
      G.chatterSpoke(mem, who, text, P); shown.push({ at: mem.now, who, text });
      if (r() < 0.3) { const to = (who + 1) % 8; G.chatterAsk(mem, who, to, 'Always.', P); }
    }
  }
  return shown;
}
const sh = chorus(3, 10, false);
assert.ok(sh.length > 50, 'it does talk');
const first = sh.filter(b => !b.reply);
for (let i = 1; i < first.length; i++) assert.ok(first[i].at - first[i - 1].at >= G.chatterParams.gap - 1e-9, 'two bubbles closer than the gap');
for (let i = 0; i < sh.length; i++) {                    // at most one bubble plus one reply in any 4 s window
  const win = sh.filter(b => b.at >= sh[i].at && b.at < sh[i].at + G.chatterParams.gap - 1e-9);
  assert.ok(win.length <= 2 && win.filter(b => !b.reply).length <= 1, 'more than one bubble plus one reply at once');
}
for (let m = 0; m < 10; m++) assert.ok(first.filter(b => b.at >= m * 60 && b.at < m * 60 + 60).length <= G.chatterParams.perMinute, 'over the per-minute cap');
const own = {};
for (const b of first) { if (own[b.who] !== undefined) assert.ok(b.at - own[b.who] >= G.chatterParams.own - 1e-9, 'a Rafeeq spoke twice inside 14 s'); own[b.who] = b.at; }
for (let i = 1; i < sh.length; i++) if (!sh[i].reply && !sh[i - 1].reply) assert.notEqual(sh[i].text, sh[i - 1].text, 'a line repeated back to back');
for (let i = 1; i < first.length; i++) assert.notEqual(first[i].text, first[i - 1].text);
for (const rep of sh.filter(b => b.reply)) { const prev = sh.filter(b => !b.reply && b.at <= rep.at).pop(); assert.ok(rep.at - prev.at >= G.chatterParams.replyAfter - 0.11); }
// after a pair talks, both are quiet for 20 s
{
  const mem = G.chatterMem(), P = G.chatterParams;
  mem.now = 10; G.chatterSpoke(mem, 1, 'Tea?', P); G.chatterAsk(mem, 1, 2, 'Always.', P);
  mem.now = 10.5; assert.equal(G.chatterReplyDue(mem), null);
  mem.now = 10.9; assert.ok(G.chatterReplyDue(mem)); G.chatterReplied(mem, P);
  mem.now = 29; assert.ok(!G.chatterAllow(mem, 1, P) && !G.chatterAllow(mem, 2, P));
  mem.now = 31; assert.ok(G.chatterAllow(mem, 1, P) && G.chatterAllow(mem, 2, P));
  mem.mute = true; assert.ok(!G.chatterAllow(mem, 4, P), 'muted (a card is open, last third of a Rock fight)');
}
// a pick never returns the line just said; a single line that was just said gives nothing
{
  const mem = G.chatterMem(); mem.lastAny = 'Brrr!';
  assert.equal(G.chatterPick(mem, 0, ['Brrr!'], 0.5), null);
  assert.equal(G.chatterPick(mem, 0, ['Brrr!', 'Ow!'], 0.1), 'Ow!');
}

// ---- the switch: default on, kept through a New Site, off stops the bubbles' source ----
assert.equal(s.chatterQuiet, false);
G.chatterSetQuiet(s, true);
const ev = () => {};
G.newSite(s, undefined, ev);
assert.equal(s.chatterQuiet, true, 'the switch survives a New Site');
assert.equal(JSON.parse(G.serialize(s)).chatterQuiet, true);

// ---- old saves: no slice, loads with talk on ----
{
  const o = JSON.parse(G.serialize(G.newState())); delete o.chatterQuiet;
  const l = G.deserialize(JSON.stringify(o));
  assert.ok(l, 'an old save loads');
  assert.equal(l.chatterQuiet, false);
}

// ---- looks and words only: poking chatter changes no number and not the random stream ----
function run(poke) {
  G.seedRng(11);
  const t0 = G.newState(); t0.coins = 1e6; G.buy(t0, 'crew'); G.buy(t0, 'crew');
  const e = () => {};
  for (let i = 0; i < 400; i++) {
    G.step(t0, 0.1, e);
    if (poke && i % 10 === 0) { G.chatterSay(t0, e, 0, 'ore'); G.chatterCheer(t0, e); G.chatterTrait(t0, 0); G.chatterPick(G.chatterMem(), 0, ['a', 'b'], 0.3); }
  }
  const o = JSON.parse(G.serialize(t0)); delete o.savedAt; return JSON.stringify(o);
}
assert.equal(run(false), run(true), 'chatter must not change the state');
// nothing in the folder writes a saved number: the only state key is the switch, and no Math.random in rules
const rules = fs.readFileSync('./proto/features/chatter/rules.js', 'utf8');
assert.ok(!/Math\.random|Date\.now/.test(rules), 'rules use no clock and no random');

// ---- nicknames: every name has a speech line and a manager line; almodeer's rules ----
{
  const EM = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
  let seed = 12345; const rng = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const st = (s, m, dt, c) => G.chatterBossStep(s, m, dt, { ...c, rnd: rng });
  for (const n of G.RAFEEQ_NICKS) {
    const s = G.newState(); s.coins = 1e12; s.total = 1e12; G.buy(s, 'crew'); G.step(s, 0.05, () => {});
    s.rafeeqSeats[0].name = s.rafeeqSeats[0].given = n.id; s.rafeeqSeats[0].trait = n.base;
    const say = G.chatterNickLines(s, 0);
    assert.ok(say.length >= 1 && say.every(l => G.chatterWords(l) <= 5 && !EM.test(l)), n.id + ' has a short speech line');
    assert.notEqual(G.t('nk_boss_' + n.id), 'nk_boss_' + n.id, n.id + ' has a manager line');
    assert.ok(G.chatterMomentLines(s, 0, 'hired').includes(say[0]), n.id + ' says it at a friendly moment');
    assert.ok(!G.chatterMomentLines(s, 0, 'tnt').includes(say[0]), 'but not at the TNT');
    assert.equal(G.chatterLine(s, 0), n.line);
  }
  for (const tr of G.CHATTER_TRAITS) assert.ok(Number(G.t('boss_' + tr + '_n')) >= 3, tr + ' has 3 manager lines');
  assert.ok(Number(G.t('boss_all_n')) >= 10, 'ten general lines');
  assert.equal(G.t('boss_back_0'), 'ar7boooo');
  assert.equal(G.t('boss_name'), 'almodeer');
  for (const k of ['all', 'tea', 'wake', 'back', ...G.CHATTER_TRAITS]) for (let i = 0; i < Number(G.t('boss_' + k + '_n')); i++) {
    const l = G.t('boss_' + k + '_' + i);
    assert.ok(!EM.test(l) && !/fat|ugly|stupid|fired|religio/i.test(l), l + ' is kind');
  }

  const mk = n => { const s = G.newState(); s.coins = 1e12; s.total = 1e12; for (let i = 0; i < n; i++) G.buy(s, 'crew'); G.step(s, 0.05, () => {}); return s; };
  assert.equal(G.chatterBossShown(mk(2)), false); assert.equal(G.chatterBossShown(mk(3)), true, 'shown at 3 hired');
  const run = (s, secs, ctx, mem = G.chatterBossMem()) => {
    const lines = [];
    for (let t = 0; t < secs; t += 0.1) { const before = mem.orders; st(s, mem, 0.1, ctx); if (mem.orders > before) lines.push({ at: t, text: mem.line, who: mem.lineTo }); }
    return { lines, mem };
  };
  const s5 = mk(5), on = { muted: false, digging: true };
  const { lines } = run(s5, 600, on);
  assert.ok(lines.length >= 18 && lines.length <= 32, 'about one a 20 to 30 s: ' + lines.length);
  for (let i = 1; i < lines.length; i++) {
    const gap = lines[i].at - lines[i - 1].at;
    assert.ok(gap >= 19.5 && gap <= 30.5, 'gap ok ' + gap);
    assert.notEqual(lines[i].text, lines[i - 1].text, 'no repeat back to back');
  }
  assert.ok(lines.every(l => !l.text.includes('{')), 'no raw {name}');
  assert.ok(lines.some(l => l.who === -1) && lines.some(l => l.who >= 0), 'sometimes to all, sometimes to one');
  assert.equal(run(s5, 300, { muted: true, digging: true }).lines.length, 0, 'never while a card is open or in the Rock fight');
  const q = mk(5); q.chatterQuiet = true;
  assert.equal(run(q, 300, on).lines.length, 0, 'silent when Rafeeqs talk is off');
  assert.equal(run(mk(2), 300, on).lines.length, 0, 'nothing at 2 hired');
  // he leaves when fewer than 3
  const m = G.chatterBossMem(); run(s5, 40, on, m); assert.ok(m.orders >= 1);
  s5.diggers.length = 2; st(s5, m, 0.1, on); assert.equal(m.line, '', 'line gone when fewer than 3'); assert.equal(G.chatterBossShown(s5), false);
  // the addressed Rafeeq may answer
  const sa = mk(4), ma = G.chatterBossMem(); let due = 0, orders1 = 0;
  for (let t = 0; t < 300; t += 0.1) { const e = st(sa, ma, 0.1, on); if (e === 'order' && ma.lineTo >= 0) orders1++; if (ma.answerIn === -2) { due++; ma.answerIn = -1; } }
  assert.ok(due >= 1 && due <= orders1, 'an answer follows an order to one Rafeeq');
  // asleep and awake
  const sw = mk(3), mw = G.chatterBossMem();
  run(sw, 5, { muted: false, digging: false }, mw); assert.equal(mw.asleep, false, 'awake after 5 s idle');
  run(sw, 5, { muted: false, digging: false }, mw); assert.equal(mw.asleep, true, 'asleep after about 8 s idle');
  const ob = mw.orders; run(sw, 120, { muted: false, digging: false }, mw); assert.equal(mw.orders, ob, 'no orders while asleep');
  const e = st(sw, mw, 0.1, on);
  assert.equal(e, 'wake'); assert.equal(mw.asleep, false);
  assert.ok(['I was checking the rocks!', 'I was not sleeping.', 'Back to work, everyone!'].includes(mw.line) && mw.jump > 0 && mw.spill > 0, 'wakes with a start and a flustered line');
  const sx = mk(3), mx = G.chatterBossMem(); run(sx, 300, on, mx); assert.equal(mx.asleep, false, 'awake while digging goes on (auto dig)');
  // the welcome back: plain ar7boooo first, once per return, not on a nap
  const sb = mk(3), mb = G.chatterBossMem(); mb.welcome = true;
  assert.equal(st(sb, mb, 0.1, on), 'welcome'); assert.equal(mb.line, 'ar7boooo'); assert.ok(mb.wave > 0 && mb.sipLeft > 0);
  assert.equal(st(sb, mb, 0.1, on), '', 'once per return');
  const mm = G.chatterBossMem(); mm.welcome = true;
  assert.equal(st(sb, mm, 0.1, { muted: true, digging: true }), '', 'waits while the away card is open');
  assert.equal(st(sb, mm, 0.1, on), 'welcome', 'then says it');
  // he keeps sipping while silent
  const ss = mk(3), ms = G.chatterBossMem(); let sips = 0, was = 0;
  for (let t = 0; t < 60; t += 0.1) { st(ss, ms, 0.1, { muted: true, digging: true }); if (ms.sipLeft > 0 && !was) sips++; was = ms.sipLeft > 0 ? 1 : 0; }
  assert.ok(sips >= 8, 'he keeps sipping: ' + sips);
  // NOT a Rafeeq: nothing in the state moves; the cap, the hires and the power are the same
  const sn = mk(3), snap = G.serialize(sn).replace(/"savedAt":[0-9]+/, ''), power = G.crewPower(sn);
  run(sn, 120, on); run(sn, 30, { muted: false, digging: false });
  assert.ok(G.serialize(sn).replace(/"savedAt":[0-9]+/, '') === snap, 'the manager writes nothing to the state');
  assert.equal(sn.diggers.length, 3); assert.equal(G.crewPower(sn), power);
  const hireAll = pre => { const s = G.newState(); s.coins = 1e15; s.total = 1e15; for (let i = 0; i < 3; i++) G.buy(s, 'crew'); if (pre) run(s, 60, on); for (let i = 0; i < 12; i++) G.buy(s, 'crew'); return s.diggers.length; };
  const withHim = hireAll(true), without = hireAll(false);
  assert.ok(withHim >= 8, 'an 8th Rafeeq can be hired: ' + withHim);
  assert.equal(withHim, without, 'the cap is the same with him showing');
}

console.log('Dig chatter OK');
