// Dig: free levels are a discount (core grantFree, the start kit, Warm Pick, the Camp). Run: node test_proto_discount.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const give = (s, tr, n) => { s.starUp['tr_' + tr] = n; };
function ready() { G.seedRng(7); const s = G.newState(); s.bossesDown = 2; s.best = 60; s.starBoss = 2; return s; }
const move = (s, pick) => { ok(G.newSite(s, 'dunes', () => {}, undefined, pick), 'moved'); };
const FIRST = { pick: 10, crew: 30 };

{ // the start kit gives no free pick levels (they made every level about 5 times faster); Warm Pick keeps its ramp
  const s = ready(); s.up.pick = 30; s.starBestPick = 30;
  move(s);
  ok(G.PARAMS.sites.kitPick === 0 && s.up.pick === 0 && G.upgradeCost(s, 'pick') === 15, 'no kit pick levels: the first Stronger Pick costs 15');
  const w = ready(); give(w, 'pick', 5); w.up.pick = 20; w.starBestPick = 20; move(w);
  ok(w.up.pick === 10 && G.upgradeCost(w, 'pick') === 15, 'Warm Pick: half the best level, and the next level costs 15 (ramp)');
}

{ // Rafeeqs: the kit's one and the Camp's waiting ones fill seats; the cap of 8 is on the whole site; Training starts at 12
  const s = ready(); give(s, 'camp', 3); s.starBestPick = 10;
  move(s);
  ok(s.diggers.length === 3 && s.up.crew === 3 && s.free.crew === 3, 'three wait (the Camp\'s three include the kit\'s one)');
  ok(G.upgradeCost(s, 'crew') === FIRST.crew, 'the next Rafeeq costs 30');
  s.coins = 1e9; s.total = 1e9;
  let n = 0; while (G.buy(s, 'crew')) n++;
  ok(n === 5 && s.up.crew === 8 && s.diggers.length === 8, 'free Rafeeqs fill seats first: 3 free + 5 bought = the cap of 8 on the site (' + n + ')');
  ok(G.upgradeCost(s, 'crew') === Math.ceil(30 * Math.pow(4.2, 5)), 'the price followed the five bought');
  const w = ready(); give(w, 'camp', 12); move(w);
  ok(w.diggers.length === 8 && !G.canBuy(w, 'crew'), 'the whole camp fills every seat');
}

{ // the first site, and a New Site: prices begin again at the first price
  const s = ready();
  ok(G.upgradeCost(s, 'pick') === 15 && G.upgradeCost(s, 'crew') === 30, 'a fresh game: the first prices');
  s.coins = 1e9; s.total = 1e9; for (let i = 0; i < 20; i++) G.buy(s, 'pick');
  G.buy(s, 'crew'); G.buy(s, 'crew');
  s.starBestPick = 20;
  move(s);
  ok(G.upgradeCost(s, 'pick') === 15 && G.upgradeCost(s, 'crew') === 30, 'at the new site every price starts again');
  ok(s.free.crew === 1 && s.up.pick === 0, 'only the free Rafeeq comes along');
  const tempo = G.upgradeCost(s, 'tempo'); ok(tempo === G.PARAMS.picks.tempoBase, 'Faster Hands starts again too');
}

{ // other items are untouched by an offset of their own
  const s = G.newState(); s.free.luck = 0;
  ok(G.upgradeCost(s, 'luck') === 120, 'Lucky Sieve is as it was');
  ok(G.grantFree(s, 'pick', 5) === 5 && G.grantFree(s, 'pick', 3) === 0 && G.grantFree(s, 'pick', 8) === 3 && s.up.pick === 8, 'the larger grant wins and nothing is given twice');
  ok(G.grantFree(s, 'crew', 99) === 8 && s.up.crew === 8, 'a grant never passes the cap');
}

{ // contracts take levels away: getting free seats back is free
  const s = ready(); s.starBestPick = 30; move(s);
  s.up.crew = 0; ok(G.upgradeCost(s, 'crew') === 0, 'a Rafeeq sent home: the free seat comes back free');
}

{ // old saves
  const s = ready(); s.up.pick = 12; s.starWarm = 12;
  const o = JSON.parse(G.serialize(s)); delete o.free;
  const back = G.deserialize(JSON.stringify(o));
  ok(back && back.free && G.upgradeCost(back, 'pick') === 15, 'a dig that began on Warm Pick keeps its ramp');
  const bare = JSON.parse(G.serialize(ready())); delete bare.free;
  const b2 = G.deserialize(JSON.stringify(bare));
  ok(b2 && typeof b2.free === 'object' && G.upgradeCost(b2, 'pick') === 15, 'a save without the slice loads with no free levels');
}

{ // C: the Star refund does not give back Stars that bought a pick that stays owned
  const mk = (spent, pick3) => {
    const s = ready(); s.starSpent = spent; s.stars = 4; s.picksUp = { pick3 }; s.starUp = { sp_eyes: 1, sp_warm: 2 };
    const o = JSON.parse(G.serialize(s)); o.fv.starshop = 1; o.picksUp = { pick3 }; o.starSpent = spent; o.stars = 4; o.starUp = { sp_eyes: 1, sp_warm: 2 };
    return G.deserialize(JSON.stringify(o));
  };
  const P = G.PARAMS.picks.starCosts;
  const a = mk(40, 0); ok(a.stars === 44 && a.starSpent === 0 && a.starRefund === 40, 'no extra pick: every Star comes back');
  const b = mk(40 + P[0], 1); ok(b.stars === 44 && b.starSpent === P[0] && b.picksUp.pick3 === 1, 'a third pick stays owned: its ' + P[0] + ' Stars are not refunded (stars ' + b.stars + ', spent ' + b.starSpent + ')');
  const c = mk(40 + P[0] + P[1], 2); ok(c.stars === 44 && c.starSpent === P[0] + P[1], 'both extra picks');
  const d = mk(10, 1); ok(d.stars === 14 && d.starSpent === 0, 'if the Stars for the pick are not in the total, nothing is held back');
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('discount: ok');
