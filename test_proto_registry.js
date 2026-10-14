// The Dig prototype's extension points (proto/README.md). One small made-up feature uses each of
// them once; then the contract's own rules are checked. Run: node test_proto_registry.js
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
process.on('uncaughtException', e => { console.error('UNCAUGHT in test_proto_registry.js: ' + (e && e.code ? e.code + ' ' : '') + (e && e.path ? e.path + ' ' : '') + '\n' + (e && e.stack || e)); process.exit(1); });
const throws = f => { try { f(); return false; } catch { return true; } };

// ---------- what ships ----------
{
  // These checks hold however many features are added later: they look at the first slice only.
  const u = G.unlocks();
  const SLICE1 = ['type:dirt', 'type:gem', 'type:boss', 'relic:boom', 'relic:lamp', 'relic:boom:3', 'boss:L1', 'boss:L3', 'layer2', 'layer4', 'bone:camel.0', 'bone:djinn.5', 'set:whale', 'shop:pick', 'shop:luck', 'crew:8', 'luck:20', 'site:boom', 'site:bones'];
  ok(SLICE1.every(id => u.byId[id]), 'the first slice is all in the list of content');
  ok(u.list.length >= 105 && u.list.filter(x => x.cat === 'core').length >= 63 && !u.byId['site:dunes'] && !u.byId['crew:1'], `the first slice counts 63 core + 42 grind (now ${u.list.length} in all)`);
  ok(u.byId['crew:2'].cat === 'core' && u.byId['luck:2'].cat === 'grind' && u.byId['relic:vein:2'].cat === 'grind', 'levels are core or grind as declared');
  const inOrder = (table, ids) => Object.keys(table).filter(id => ids.includes(id)).join() === ids.join();
  ok(inOrder(G.RELICS, ['boom', 'vein', 'lucky', 'heavy', 'deep', 'wide', 'bang', 'karak', 'shiny', 'streak', 'nose', 'echo', 'lamp']), 'relics keep their order whatever order features load in');
  ok(inOrder(G.SITES, ['dunes', 'boom', 'gold', 'bones']) && inOrder(G.ITEMS, ['pick', 'crew', 'luck']) && G.layersOf('desert').slice(0, 4).map(l => l.id).join() === 'sand,clay,slate,deep', 'sites, shop items and layers keep their order');
  ok(G.P.tntPower === G.PARAMS.tnt.power && 'offlineCapHours' in G.P && G.TYPES === G.BLOCKS && G.UPGRADES === G.ITEMS, 'the old names of the numbers still work');
  for (const id of Object.keys(G.RELICS)) ok(G.hasString('r_' + id) && G.hasString('r_' + id + '_d'), `relic ${id} has its words`);
  for (const id of Object.keys(G.ITEMS)) ok(G.hasString('up_' + id), `shop item ${id} has its words`);
  for (const id of Object.keys(G.SITES)) ok(G.hasString('site_' + id) && G.hasString('site_' + id + '_d'), `site ${id} has its words`);
}

// ---------- numbers by path ----------
{
  const undo = G.setParam('tnt.power', 99);
  ok(G.PARAMS.tnt.power === 99 && G.P.tntPower === 99, 'setParam by feature path');
  undo();
  ok(G.PARAMS.tnt.power === 8, 'and its undo');
  const undos = [G.setParam('P.critChance', 0.5), G.setParam('crew.base', 20), G.setParam('UPGRADES.crew.max', 9), G.setParam('TYPES.gold.val', 50), G.setParam('SITES.boom.tnt', 2), G.setParam('SETS.camel.pieces', 3), G.setParam('hpGrow', 1.2)];
  ok(G.PARAMS.crits.chance === 0.5 && G.ITEMS.crew.base === 20 && G.ITEMS.crew.max === 9 && G.BLOCKS.gold.val === 50 && G.SITES.boom.tnt === 2 && G.SETS.camel.pieces === 3 && G.PARAMS.core.hpGrow === 1.2, 'every old --set key form resolves');
  undos.reverse().forEach(u => u());
  ok(G.ITEMS.crew.base === 30 && G.PARAMS.core.hpGrow === 1.12, 'all undone');
  ok(throws(() => G.setParam('nothing.here', 1)), 'an unknown path is an error, not a silent no-op');
}

// ---------- one source of chance ----------
{
  const run = () => {
    G.seedRng(42);
    const s = G.newState(); s.coins = 500; s.total = 500; G.buy(s, 'crew'); G.buy(s, 'pick');
    for (let i = 0; i < 600; i++) { if (i % 4 === 0) for (let c = 0; c < G.COLS; c++) if (G.swing(s, s.top, c)) break; G.step(s, 0.05); while (s.chests > 0) G.takeRelic(s, G.rollDraft(s)[0]); }
    const o = JSON.parse(G.serialize(s)); delete o.savedAt;
    return JSON.stringify(o);
  };
  ok(run() === run(), 'the same seed gives the same dig');
  G.setRng(null);
}

// ---------- a made-up feature that uses every extension point ----------
const before = G.unlocks().list.length;
const log = [];
const kit = G.use({
  id: 'testkit',
  version: 2,
  migrate(s, from) { s.kitMigrated = from; },
  params: { glassPay: 3, toll: 2 },
  legacy: { kitGlassPay: 'glassPay' },
  tables: { KIT: { a: { b: 1 } } },
  strings: { en: { kit_hello: 'Hello {n}' }, ar: { kit_hello: 'مرحبا {n}' } },
  state: {
    kitKeep: { init: () => 0, survives: ['site'] },
    kitRun:  { init: () => 0 },
    kitSite: { init: () => 0, perSite: true },
    gems:    { init: () => 0, survives: ['site'] },
    kitTemp: { init: () => 'fresh', transient: true },
  },
  blocks: {
    glass: { hp: 1, val: 2, hit() { log.push('glass hit'); }, broke(s, b, ev) { log.push('glass broke'); s.gems += G.PARAMS.testkit.glassPay; G.emit(s, ev, 'kitGlass', { r: b.r }); } },
    spike: { hp: 1, val: 0, unlock: false, special: true },
  },
  layers: [{ id: 'kitland-1', land: 'kitland', at: 10, name: 'layer_0', look: { dirt: '#111', stone: '#222', hard: '#333', back: '#000' }, ores: [1, 1, 1, 1],
    blocks: { glass: 0.5 },
    law: { mods: { sight: () => 0 }, hooks: { step(s) { s.kitSite++; } } } }],
  gen: { row: [{ at: 60, fn(c) { if (c.s.land === 'kitland' && c.r === 3) c.set(0, 'spike'); } }] },
  relics: {
    kitA: { max: 2, pair: 'kitB', when: s => s.kitRun > 0, mods: { pickPower: (v, s) => v * (1 + s.relics.kitA) }, hooks: { broke(s, b) { if (b.byHand) s.kitRun += 10; } } },
    kitB: { max: 1, pair: 'kitA', when: () => false },
  },
  shops: { gem: { wallet: 'gems', levels: 'gemUp', survives: ['site'] } },
  items: { kitPerk: { shop: 'gem', base: 2, grow: 2, max: 3, levels: 'grind', open: s => s.gems > 0 || s.gemUp.kitPerk > 0, bought(s, lv) { s.kitKeep = lv; } } },
  sites: { kitSite: { hp: 2, mods: { coinMult: v => v * 10 }, hooks: { earned(s) { s.kitRun++; } } } },
  contracts: { kitNoPick: { mods: { canSwing: () => false } } },
  policies: { kitLeft: (s, d) => { for (let i = 0; i < G.VIEW_ROWS; i++) if (s.rows[i][0] && G.reachable(s, s.top + i, 0)) return [s.top + i, 0]; return null; } },
  tools: { kitDrill: { key: '1', open: s => s.gems >= 0, can: s => s.gems >= G.PARAMS.testkit.toll, use(s, r, c, ev) { s.gems -= G.PARAMS.testkit.toll; for (let k = 0; k < 3; k++) G.breakCell(s, r + k, c, 'tool', ev); } } },
  queue: { kitPing(s, q) { log.push('ping ' + q.n); } },
  hooks: { reset(s, name) { log.push('reset ' + name); } },
  unlocks: [{ id: 'kit:first-glass', group: 'test' }],
  firsts: { kitGlass: () => 'kit:first-glass' },
  bot: { shop() { return 0; } },
});

{ // registries, order, clashes
  ok(G.BLOCKS.glass && G.BLOCKS.glass.owner === 'testkit' && G.BLOCKS.glass.hp === 1, 'a block kind registers');
  ok(Object.keys(G.RELICS).indexOf('kitA') > Object.keys(G.RELICS).indexOf('lamp'), 'new relics sort after the ones with a place');
  ok(throws(() => G.use({ id: 'testkit' })), 'the same feature twice is an error');
  ok(throws(() => G.use({ id: 'clash1', blocks: { dirt: {} } })), 'two features cannot register the same block kind');
  ok(throws(() => G.use({ id: 'clash2', state: { coins: { init: () => 0 } } })), 'nor the same state key');
  ok(throws(() => G.use({ id: 'clash3', strings: { en: { title: 'x', kit_hello: 'x' } } })), 'nor the same string');
  const u = G.unlocks();
  ok(u.byId['type:glass'] && !u.byId['type:spike'] && u.byId['relic:kitA:2'] && u.byId['shop:kitPerk'] && u.byId['kitPerk:3'].cat === 'grind' && u.byId['site:kitSite'] && u.byId['tool:kitDrill'] && u.byId['contract:kitNoPick'] && u.byId['kit:first-glass'], 'content is listed from the registries');
  ok(u.list.length === before + 11, 'so the count grows by itself');
  ok(G.BOTS.some(b => b.id === 'testkit'), 'a feature can bring a bot for the sims');
  ok(G.getParam('testkit.glassPay') === 3 && G.getParam('kitGlassPay') === 3 && G.getParam('KIT.a.b') === 1, 'its numbers and tables are reachable by path');
}
{ // strings
  ok(G.t('kit_hello', { n: 2 }) === 'Hello 2', 'a feature string');
  G.setLang('ar');
  ok(G.t('kit_hello', { n: 2 }) === 'مرحبا 2' && G.t('title') === 'title' || G.t('up_pick') === 'Stronger Pick', 'another language, with English as the fallback');
  ok(G.missingStrings('ar').includes('up_pick') && !G.missingStrings('ar').includes('kit_hello'), 'missing translations can be listed');
  G.setLang('en');
}
{ // state slices, shop with its own currency, reset
  const s = G.newState();
  ok(s.kitKeep === 0 && s.kitTemp === 'fresh' && s.gemUp.kitPerk === 0, 'slices get their defaults (a shop gets its levels)');
  ok(!G.itemOpen(s, 'kitPerk') && !G.canBuy(s, 'kitPerk'), 'an item can be hidden and unaffordable');
  s.gems = 7; s.coins = 5;
  const seen = [];
  ok(G.buy(s, 'kitPerk', (k, d) => seen.push(k + ':' + (d.id || ''))) && s.gems === 5 && s.coins === 5 && s.gemUp.kitPerk === 1 && s.kitKeep === 1, 'buying spends the shop\'s own currency and runs bought()');
  ok(seen.includes('buy:kitPerk') && seen.includes('unlock:shop:kitPerk'), 'and reports the buy and the first time');
  ok(G.buy(s, 'kitPerk') && s.unlocked['kitPerk:2'] === 1, 'a level beyond the first is found too');
  s.kitRun = 5; s.kitSite = 9; s.kitTemp = 'used'; s.bossesDown = 2; s.best = 60; s.up.pick = 2;   // under the start kit's reach (40% of 2 is 0)
  log.length = 0;
  ok(G.newSite(s, 'kitSite'), 'moving to a registered site');
  ok(s.kitKeep === 2 && s.gems === 1 && s.gemUp.kitPerk === 2, 'slices that declare survives: [site] are kept');
  ok(s.kitRun === 0 && s.kitSite === 0 && s.up.pick === 0 && s.coins === 0, 'the others start over');
  ok(log.includes('reset site'), 'reset hooks run');
  ok(s.rows[5].every(c => c.max >= Math.round(G.dirtHp(5)) * 2 - 1), 'the new ground follows the site (hp x2)');
  // the site's own rules
  s.rows[0][0] = { t: 'dirt', hp: 1, max: 1, s: 0 };
  const stars = s.stars; s.stars = 0; s.sets = {};
  G.swing(s, 0, 0);
  ok(s.coins === 10 && s.kitRun >= 1, 'a site can carry mods and hooks of its own');
  s.stars = stars;
  // saving
  s.kitTemp = 'used';
  const text = G.serialize(s);
  ok(JSON.parse(text).kitTemp === 'fresh' && JSON.parse(text).fv.testkit === 2, 'transient slices are not saved; feature versions are');
  const back = G.deserialize(text);
  ok(back.kitKeep === 2 && back.gems === 1 && back.kitMigrated === undefined, 'a save comes back with its slices, and no migration when the version matches');
}
{ // old saves
  const s = G.newState(); s.coins = 77; s.relics.vein = 2; s.up.crew = 3; s.fossils['camel.1'] = 1; s.sets.camel = true;
  const o = JSON.parse(G.serialize(s));
  // the shape main shipped: version 1, none of the newer keys
  o.v = 1; for (const k of ['unlocked', 'land', 'contract', 'crewJob', 'fv', 'gems', 'gemUp', 'kitKeep', 'kitRun', 'kitSite', 'kitTemp', '_pb']) delete o[k];
  delete o.up.luck;
  const back = G.deserialize(JSON.stringify(o));
  ok(back && back.v === G.SAVE_VERSION && back.coins === 77 && back.relics.vein === 2, 'a version 1 save loads');
  ok(back.land === 'desert' && back.crewJob === 'nearest' && back.contract === null && back.gemUp.kitPerk === 0 && back.up.luck === 0, 'missing slices and missing keys get their defaults');
  ok(back.unlocked['relic:vein:2'] && back.unlocked['shop:crew'] && back.unlocked['crew:3'] && back.unlocked['bone:camel.1'] && back.unlocked['set:camel'], 'the migration step fills in what the save had already found');
  ok(back.kitMigrated === 1, 'a feature whose version went up migrates its own slice');
  ok(G.MIGRATIONS.every((m, i) => m.to === i + 2) && G.MIGRATIONS.length === G.SAVE_VERSION - 1, 'migration steps are in order, one per version');
  for (let i = 0; i < 40; i++) G.step(back, 0.05);
  ok(back.t > 0, 'and it plays');
}
{ // a layer of another land: its block table and its law
  G.seedRng(7);
  const s = G.newState();
  s.land = 'kitland'; G.reset(s, 'site');
  ok(s.land === 'kitland', 'the land survives a New Site');
  const kinds = s.rows.flat().map(c => c.t);
  ok(kinds.includes('glass') && kinds.filter(t => t === 'glass').length > 30, 'a layer\'s block table generates its kind');
  ok(s.rows[3][0].t === 'spike', 'a row pass can place a block');
  ok(G.visibleMask(s).every(row => row.every(v => v === false)), 'a layer law can change what is seen (always dark)');
  G.step(s, 0.05);
  ok(s.kitSite === 1, 'and can run each step');
  // block hooks, events, first times
  log.length = 0;
  const c = s.rows[0].findIndex(x => x.t === 'glass');
  s.rows[0][c].hp = 1e6;
  G.swing(s, 0, c);
  ok(log.includes('glass hit'), 'a block kind hears a hit');
  s.rows[0][c].hp = 1;
  const seen = [];
  G.swing(s, 0, c, (k, d) => seen.push(k + ':' + (d.id || d.t || '')));
  ok(log.includes('glass broke') && s.gems === 3, 'and its break');
  ok(seen.includes('kitGlass:') && seen.includes('unlock:kit:first-glass') && seen.includes('unlock:type:glass'), 'a feature event is sent, and its first time is noticed');
  // the queue
  log.length = 0;
  G.later(s, 0.1, 'kitPing', { n: 5 });
  G.step(s, 0.05); ok(log.length === 0, 'a delayed effect waits');
  G.step(s, 0.06); ok(log[0] === 'ping 5', 'and then runs');
  // a tool
  ok(G.toolOpen(s, 'kitDrill') && G.canUseTool(s, 'kitDrill', 0, 1) && !G.useTool(s, 'nope', 0, 1), 'a tool is open and usable');
  const ev = []; const top = s.top;
  const glassHit = [0, 1, 2].filter(k => G.cellAt(s, top + k, 1).t === 'glass').length;
  ok(G.useTool(s, 'kitDrill', top, 1, k => ev.push(k)) && s.gems === 3 - 2 + 3 * glassHit && G.cellAt(s, top + 2, 1) === null, 'using it does its work and spends its resource');
  s.gems = 1;
  ok(ev.includes('tool') && ev.includes('unlock') && !G.useTool(s, 'kitDrill', top, 2), 'it reports, and is refused when the resource is short');
  G.setRng(null);
}
{ // relic hooks only while held; draft rules
  const s = G.newState();
  const base = G.pickPower(s);
  ok(!G.rollDraft(Object.assign(s, { chests: 1 })).includes('kitB'), 'a relic\'s when() keeps it out of the draft');
  let offered = false;
  s.kitRun = 1;
  for (let i = 0; i < 60 && !offered; i++) offered = G.rollDraft(s).includes('kitA');
  ok(offered, 'and lets it in once its gate is met');
  ok(G.takeRelic(s, 'kitA') && G.pickPower(s) === base * 2, 'a relic\'s mod applies while held');
  ok(G.RELICS.kitA.pair === 'kitB', 'a relic can name its pair');
  s.rows[0][0] = { t: 'dirt', hp: 1, max: 1, s: 0 };
  G.swing(s, 0, 0);
  ok(s.kitRun === 11, 'and so does its hook');
}
{ // a contract on a site
  const s = G.newState();
  ok(G.swing(s, 0, 0), 'no contract: the pick works');
  s.contract = 'kitNoPick';
  ok(!G.swing(s, 0, 1), 'a contract can forbid the pick');
}
{ // digger policy
  const s = G.newState(); s.coins = 1e6; s.total = 1e6; G.buy(s, 'crew'); G.buy(s, 'crew');
  s.crewJob = 'kitLeft';
  for (let i = 0; i < 200; i++) G.step(s, 0.05);
  ok(s.diggers.every(d => d.tc === 0 || d.tr < 0), 'the crew follows the job that is set');
  s.diggers[0].job = 'nearest'; s.diggers[0].tr = -1;
  ok(G.POLICIES.nearest && G.POLICIES.kitLeft, 'policies are registered by name');
}
{ // several sites: park one, work it in the background, come back
  const s = G.newState(); s.coins = 1e6; s.total = 1e6; G.buy(s, 'crew'); for (let i = 0; i < 20; i++) G.buy(s, 'pick');
  const coins = s.coins, top = s.top;
  const other = G.freshSite(s, 'gold');
  ok(other.site === 'gold' && other.rows.length === G.KEEP_ROWS && other.diggers.length === 0 && s.site === 'dunes' && s.top === top && s.diggers.length === 1, 'a second site is a bag of the per-site slices');
  G.withSite(s, other, st => { st.diggers.push({ c: 2, r: st.top, tc: -1, tr: -1, cd: 0.3, swing: 0 }); for (let i = 0; i < 400; i++) G.step(st, 0.05); });
  ok(other.best > 0 && other.diggers.length === 1, 'rules run on the parked site');
  ok(s.site === 'dunes' && s.top === top && s.diggers.length === 1, 'and the site on screen is untouched');
  ok(s.coins > coins, 'what is not per site (the purse) is shared');
  const back = G.deserialize(G.serialize(Object.assign(s, { kitBags: [other] })));
  ok(back && back.site === 'dunes', 'it saves');
}
{ // the rules of the contract itself
  const files = ['proto/game.js', ...readdirSync('proto/core').map(f => 'proto/core/' + f)];
  const feats = readdirSync('proto/features', { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
  console.log(`registry test: found ${feats.length} feature folders in ${process.cwd()}/proto/features: ${feats.join(' ')}`);
  for (const f of feats) for (const n of ['rules.js', 'strings.js']) if (existsSync(`proto/features/${f}/${n}`)) files.push(`proto/features/${f}/${n}`);
  for (const f of files) {
    if (f === 'proto/core/lang.js') continue; // the page's language switch: location and localStorage on purpose
    let raw; try { raw = readFileSync(f, 'utf8'); } catch (e) { failed++; console.error(`FAIL: could not read ${f} (${e.code}): ${e.message}`); continue; }
    const src = raw.replace(/\/\/.*$/gm, '');
    if (f !== 'proto/core/rng.js') ok(!/Math\.random/.test(src), `${f}: rules take chance from rnd(), not Math.random`);
    ok(!/(?<![.\w'])(document|window|localStorage|requestAnimationFrame)\b(?!\s*:)/.test(src), `${f}: no DOM in the rules`);
    ok(!/\p{Extended_Pictographic}/u.test(src), `${f}: no emoji`);
  }
  const index = readFileSync('proto/features/index.js', 'utf8'), uiIndex = readFileSync('proto/features/ui.js', 'utf8');
  for (const f of feats) {
    ok(index.includes(`'./${f}/rules.js'`), `features/index.js lists ${f}`);
    if (existsSync(`proto/features/${f}/ui.js`)) ok(uiIndex.includes(`'./${f}/ui.js'`), `features/ui.js lists ${f}`);
  }
  const lines = index.split('\n').filter(l => l.startsWith('export'));
  ok(lines.join() === lines.slice().sort().join(), 'features/index.js is in A to Z order');
}

if (failed) { console.error(`${failed} check(s) failed`); process.exit(1); }
console.log('Dig prototype registries OK');
