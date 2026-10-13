// The drawer's rules (proto/ui/drawerlogic.js): the panel -> tab map, locks, dots, next lines. Run: node test_proto_drawer.js
import { readFileSync } from 'node:fs';
import * as G from './proto/game.js';
import strings from './proto/ui/strings.js';
import trackStrings from './proto/features/track/strings.js';
import { TABS, PANEL_TAB, tabOf, tabInfo, dotStep } from './proto/ui/drawerlogic.js';

G.addStrings(strings, 'page'); G.addStrings(trackStrings, 'track');
let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const tab = id => TABS.find(x => x.id === id);
const info = (id, s) => tabInfo(tab(id), s);

{ // every tab has words and a plain one-line next
  const s = G.newState();
  for (const tb of TABS) {
    ok(G.hasString('dr_tab_' + tb.id), tb.id + ': a name');
    const i = tabInfo(tb, s);
    ok(typeof i.next === 'string' && i.next.length > 0 && !i.next.includes('{'), tb.id + ': a plain next line, got "' + i.next + '"');
  }
  ok(TABS.map(x => x.id).join() === 'shop,stars,camp,relics,museum,forge,level', 'the seven tabs, in order');
}
{ // every panel that exists is mapped to a tab (read from the feature files)
  const dirs = [...readFileSync('proto/features/ui.js', 'utf8').matchAll(/\.\/(\w+)\/ui\.js/g)].map(x => x[1]);
  const ids = [];
  for (const d of dirs) {
    const src = readFileSync(`proto/features/${d}/ui.js`, 'utf8');
    for (const m of src.matchAll(/panels:\s*\[[^\]]*?id:\s*'(\w+)'/g)) ids.push(m[1]);
    for (const m of src.matchAll(/shopPanel\(\{[^}]*?id:\s*'(\w+)'/g)) ids.push(m[1]);
  }
  ok(ids.length >= 10, 'found the panels (' + ids.join() + ')');
  for (const id of new Set(ids)) ok(!!PANEL_TAB[id] && TABS.some(x => x.id === PANEL_TAB[id]), `panel ${id} has a tab`);
  ok(tabOf({ id: 'nope' }) === 'level' && tabOf({ id: 'nope', tab: 'forge' }) === 'forge' && tabOf({ id: 'site', tab: 'shop' }) === 'shop', 'a panel may name its tab; unknown panels fall to Level');
}
{ // a fresh save: Shop and Level open, the rest locked with a reason that is never a time; no dots
  const s = G.newState();
  ok(info('shop', s).lock === null && info('level', s).lock === null, 'Shop and Level are never locked');
  for (const id of ['stars', 'camp', 'relics', 'museum', 'forge']) {
    const l = info(id, s).lock;
    ok(typeof l === 'string' && /^Opens when /.test(l) && !/second|minute|hour|day|wait/i.test(l), id + ': locked, says how it opens (' + l + ')');
    ok(info(id, s).ready.length === 0 && info(id, s).main === null, id + ': no dot and no button while locked');
  }
  ok(info('shop', s).ready.length === 0, 'nothing to buy yet: no dot');
  ok(info('level', s).next === 'Break the Gate at ' + G.siteRun(s).floor + ' m to finish.', 'Level says the Gate');
}
{ // the tabs open with what the player has done
  const s = G.newState(); s.stars = 3;
  ok(info('stars', s).lock === null && /^(Next|Ready): /.test(info('stars', s).next), 'Stars open with a Star: ' + info('stars', s).next);
  const s2 = G.newState(); s2.chests = 1; ok(info('relics', s2).lock === null, 'Relics open with a chest');
  const s3 = G.newState(); s3.forgeOn = true; ok(info('forge', s3).lock === null, 'Forge opens with forgeOn');
  const s4 = G.newState(); s4.foremanHere = true;
  ok(info('camp', s4).lock === null && info('camp', s4).ready.join() === 'foreman' && /Foreman/.test(info('camp', s4).next), 'the Foreman opens the Rafeeqs tab and earns one dot');
  const s5 = G.newState(); s5.wingDeep = 12; ok(info('museum', s5).lock === null, 'Museum opens when you dig deep');
}
{ // the shop: a next line with a price; ready only when affordable; a main button then
  const s = G.newState();
  ok(/^(Next|Ready): .+, .+ coins?\.$/.test(info('shop', s).next), 'shop next line "' + info('shop', s).next + '"');
  s.coins = 1e9;
  const after = info('shop', s);
  ok(after.ready.length > 0 && after.main && /^Buy /.test(after.main.label), 'with coins there is something ready and a Buy button');
  ok(G.canBuy(s, after.main.id), 'the button buys something affordable');
  ok(after.ready.every(id => G.canBuy(s, id)), 'ready = affordable');
  const hit = G.buy(s, after.main.id);
  ok(hit, 'the button really buys');
}
{ // dots: none at load, one when something becomes ready on a closed tab, cleared by opening, again after it is spent
  let r = dotStep(new Set(), [], false);
  ok(!r.dot, 'no dot with nothing ready');
  r = dotStep(r.seen, ['pick'], false); ok(r.dot, 'a new ready thing shows a dot on a closed tab');
  r = dotStep(r.seen, ['pick'], false); ok(r.dot, 'the dot stays until the tab is opened');
  r = dotStep(r.seen, ['pick'], true); ok(!r.dot, 'an open tab has no dot');
  r = dotStep(r.seen, ['pick'], false); ok(!r.dot, 'and it stays clear after you leave');
  r = dotStep(r.seen, [], false); r = dotStep(r.seen, ['pick'], false); ok(r.dot, 'a thing that was spent and is ready again earns a dot again');
  r = dotStep(new Set(['a']), ['a', 'b'], false); ok(r.dot, 'a second ready thing earns a dot');
}
{ // the Level dot needs the Gate down AND a next site to take
  const s = G.newState(); G.siteRun(s).done = true;
  ok(info('level', s).ready.join() === (G.canNewSite(s) ? 'next' : ''), 'Level dot = Gate down and Next site waiting');
  s.contractFree = true; ok(info('level', s).ready.join() === 'next', 'with a next site waiting: a dot');
  ok(/^The Gate is down/.test(info('level', s).next), 'Level says the Gate is down');
}
{ // no emoji in the drawer's words
  for (const [k, v] of Object.entries(strings.en)) ok(!/\p{Extended_Pictographic}/u.test(v), k + ': no emoji');
}

if (failed) { console.error(failed + ' check(s) failed'); process.exit(1); }
console.log('Dig drawer OK');
