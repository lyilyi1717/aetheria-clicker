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
console.log('Dig chatter OK');
