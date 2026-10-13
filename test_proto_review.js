// Dig code review: one test per defect that was found and fixed. Run: node test_proto_review.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const NO = () => {};
const fresh = (seed = 1) => { G.seedRng(seed); return G.newState(); };
const run = (s, secs, ev = NO) => { for (let i = 0; i < secs * 20; i++) G.step(s, 0.05, ev); };

{ // the dealt cards are dropped when a level is finished: a look from the leave button must not pin the old level
  const s = fresh();
  G.siteRun(s); s.bossesDown = 2;
  const before = G.dealCards(s);
  ok(before.length === 1 && before[0].key === 'dunes:50', 'before the finish the deal is the level in play');
  run(s, 0.1);
  ok(s.run.done && s.road.deal === null, 'finishing drops the cached deal');
  ok(G.dealCards(s)[0].key === 'boom:50', 'the next deal moves on to the next level');
}

{ // the board is announced once, and the tiers once each, however many steps follow (announce is on the hot path)
  const s = fresh(); const seen = [];
  s.seen.legacyBoard = true;
  const ev = k => seen.push(k);
  run(s, 3, ev);
  ok(seen.filter(k => k === 'contractsOpen').length === 1, 'contractsOpen told once');
  s.contractsWon.bare = 1; s.contractsWon.dark = 1;
  run(s, 3, ev);
  ok(seen.filter(k => k === 'contractTier').length === 1 && s.seen.contractTier2, 'tier 2 told once when two tier 1 contracts are won');
  s.contractsWon.tntOnly = 1; s.contractsWon.glass = 1; s.contractsWon.oneRelic = 1;
  run(s, 3, ev);
  ok(seen.filter(k => k === 'contractTier').length === 2 && s.seen.contractTier3, 'tier 3 told once');
}

const ready2 = () => { const s = fresh(); s.bossesDown = 2; s.best = 52; s.sites = 99; return s; };

{ // contractDone says whether the contract was taken from the board; a road card's hard rule is not
  const s = ready2(); G.startContract(s, 'bare', NO);
  let d = null; s.best = 40; G.step(s, 0.05, (k, x) => { if (k === 'contractDone') d = x; });
  ok(d && d.board === true, 'a contract taken from the board says board');
  const s2 = ready2(); G.siteRun(s2);
  const card = { site: 'dunes', floor: 50, twist: '', hard: 'bare' };
  ok(G.pickCard(s2, card, NO) && s2.contract === 'bare', 'a road card can carry the hard rule');
  d = null; s2.best = 40; G.step(s2, 0.05, (k, x) => { if (k === 'contractDone') d = x; });
  ok(d && d.board === false, 'a road card hard rule win is not from the board');
}

{ // the no-Rafeeq note says refund only when coins came back
  const s = ready2(); G.startContract(s, 'bare', NO);
  s.diggers.push(G.newRafeeq(s, 3));
  let key = null; G.step(s, 0.05, (k, x) => { if (k === 'contractNote') key = x.key; });
  ok(key === 'home' && s.diggers.length === 0, 'a free Rafeeq goes home with a different note');
  const s2 = ready2(); G.startContract(s2, 'bare', NO);
  s2.coins = 1000; s2.total = 1000; G.buy(s2, 'crew');
  key = null; G.step(s2, 0.05, (k, x) => { if (k === 'contractNote') key = x.key; });
  ok(key === 'refund', 'paid Rafeeqs give the refund note');
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('review: ok');
