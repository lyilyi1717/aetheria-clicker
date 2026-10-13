// The wardrobe: looks for the Rafeeqs, no power in any of them. Run: node test_proto_wardrobe.js
import * as G from './proto/game.js';
import { DRAW, COLOUR } from './proto/features/wardrobe/items.js';
import strings from './proto/features/wardrobe/strings.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const SL = G.WARDROBE_SLOTS;
const stampOf = (s, key, st) => { s.road.stamps[key] = { site: 'dunes', floor: 50, twist: '', fin: 0, fast: 0, hard: 0, ...st }; };

{ // every item has a drawing and a string, and every earned one has a line that says how
  const en = strings.en;
  for (const slot of SL) for (const it of G.wardrobeItems(slot)) {
    ok(en['wd_' + slot + '_' + it.id], 'a name for ' + slot + ' ' + it.id);
    if (slot === 'colour') ok(COLOUR[it.id], 'a colour for ' + it.id);
    else ok(typeof DRAW[slot === 'pattern' ? 'pattern' : slot][it.id] === 'function', 'a drawing for ' + slot + ' ' + it.id);
    if (!it.free) ok(en['wd_why_' + it.id], 'an unlock line for ' + it.id);
  }
  ok(G.wardrobeItems('head').length === 14 && G.wardrobeItems('body').length === 6 && G.wardrobeItems('colour').length === 10 && G.wardrobeItems('pattern').length === 6, 'the lists are whole');
}
{ // a new game: whole, owned looks; locked ones cannot be set
  const s = G.newState();
  const w = G.wardrobeWear(s, 0);
  ok(w.head === 'fez' && w.body === 'shirt' && w.colour === 'blue' && w.pattern === 'plain', 'the plain default');
  ok(!G.wardrobeSet(s, 'all', 'head', 'crown') && !G.wardrobeSet(s, 3, 'colour', 'gold') && !G.wardrobeSet(s, 'all', 'head', 'nonsense'), 'a locked or unknown look cannot be set');
  ok(G.wardrobeWhy(s, 'head', 'crown') === 'wd_why_crown' && G.wardrobeWhy(s, 'head', 'fez') === '', 'the unlock line, or none when owned');
  ok(G.wardrobeSet(s, 'all', 'head', 'ghutra') && G.wardrobeWear(s, 5).head === 'ghutra', 'all Rafeeqs');
  ok(G.wardrobeSet(s, 2, 'head', 'hard') && G.wardrobeWear(s, 2).head === 'hard' && G.wardrobeWear(s, 1).head === 'ghutra', 'one Rafeeq on his own');
  // all, then one, then all: all overwrites that slot for everyone, with one Undo
  ok(G.wardrobeSet(s, 'all', 'head', 'bare') && G.wardrobeWear(s, 2).head === 'bare', 'all overwrites a hand-dressed Rafeeq');
  ok(G.wardrobeUndo(s) && G.wardrobeWear(s, 2).head === 'hard' && G.wardrobeWear(s, 0).head === 'ghutra', 'one Undo brings him back');
  ok(!G.wardrobeUndo(s), 'only one');
  // other slots of the single one stay when all changes another slot
  G.wardrobeSet(s, 2, 'colour', 'red'); G.wardrobeSet(s, 'all', 'body', 'thobe');
  ok(G.wardrobeWear(s, 2).colour === 'red' && G.wardrobeWear(s, 2).head === 'hard' && G.wardrobeWear(s, 2).body === 'thobe', 'slots are separate');
}
{ // the arrows wrap and show a locked look without wearing it
  const s = G.newState();
  let r = G.wardrobeStep(s, 'all', 'pattern', -1);
  ok(r.id === 'stars' && !r.owned && G.wardrobeWear(s, 0).pattern === 'plain', 'back from the first wraps to a locked one, not worn');
  r = G.wardrobeStep(s, 'all', 'pattern', 1, 'check'); ok(r.id === 'dots' && r.owned && G.wardrobeWear(s, 0).pattern === 'dots', 'next from a browsed look');
  r = G.wardrobeStep(s, 'all', 'pattern', 1); ok(r.id === 'zigzag' && !r.owned, 'next from the worn one');
}
{ // earning: each condition, banked for good
  G.seedRng(1);
  const s = G.newState(); const seen = [];
  const run = () => { s.wardrobe.t = 9; G.step(s, 0.05, k => seen.push(k)); };
  s.contractsWon.bare = 1; s.wingDone.teapot = true; s.wingDone.pilot = true; s.wingDone.shark = true; s.wingDone.oilrig = true; s.wingDone.pearls = true;
  for (let k = 0; k < 6; k++) stampOf(s, 'a' + k, { fin: 1, fast: 1, hard: 1 });
  s.best = 25 * 3 + 5;
  run();
  for (const [sl, id] of [['head', 'cap'], ['head', 'cosy'], ['head', 'pilot'], ['head', 'pearlband'], ['head', 'straw'], ['head', 'goldfez'], ['body', 'bisht'], ['body', 'diver'], ['body', 'overalls'], ['colour', 'gold'], ['colour', 'night']]) ok(G.wardrobeOwns(s, sl, id), sl + ' ' + id + ' earned');
  ok(!G.wardrobeOwns(s, 'head', 'crown') && !G.wardrobeOwns(s, 'head', 'rice') && !G.wardrobeOwns(s, 'pattern', 'zigzag') && !G.wardrobeOwns(s, 'pattern', 'stars'), 'the rest not yet');
  ok(seen.filter(k => k === 'wardrobeNew').length === 0, 'the first look banks without a fanfare');
  s.contractsWon.blindAlone = 1; s.contractsWon.rising = 1; run();
  ok(G.wardrobeOwns(s, 'head', 'crown') && G.wardrobeOwns(s, 'pattern', 'zigzag') && seen.includes('wardrobeNew'), 'a contract hat and the weave; said once');
  G.wardrobeSet(s, 'all', 'head', 'crown'); G.wardrobeSet(s, 4, 'colour', 'gold');
  // a New Site or a Land starts the road over: the looks stay
  s.road.stamps = {}; s.contractsWon = {}; s.best = 0; s.wingDone = {}; run();
  ok(G.wardrobeOwns(s, 'colour', 'gold') && G.wardrobeWear(s, 0).head === 'crown' && G.wardrobeWear(s, 4).colour === 'gold', 'banked looks stay');
}
{ // survives New Site and Land, and a save round-trip
  const s = G.newState();
  s.road.stamps.x = { site: 'dunes', floor: 50, twist: '', fin: 1, fast: 1, hard: 1 }; s.wardrobe.seen['head:goldfez'] = 1;
  G.wardrobeSet(s, 'all', 'colour', 'teal'); G.wardrobeSet(s, 1, 'pattern', 'dots');
  const back = G.deserialize(G.serialize(s));
  ok(G.wardrobeWear(back, 1).colour === 'teal' && G.wardrobeWear(back, 1).pattern === 'dots' && G.wardrobeOwns(back, 'head', 'goldfez'), 'save round-trip');
  G.reset(s, 'site'); ok(G.wardrobeWear(s, 1).pattern === 'dots', 'survives New Site');
  G.reset(s, 'land'); ok(G.wardrobeWear(s, 1).colour === 'teal', 'survives Land');
}
{ // an old save: no slice, a contract hat on
  const s = G.newState();
  const raw = JSON.parse(G.serialize(s));
  delete raw.wardrobe; raw.contractLook = { skin: '', hat: 'crown' }; raw.contractsWon = { blindAlone: 1 };
  const old = G.deserialize(JSON.stringify(raw));
  ok(G.wardrobeWear(old, 0).head === 'crown' && G.wardrobeWear(old, 7).head === 'crown', 'the crown he wore, on every Rafeeq');
  ok(old.wardrobe.one.length === 8 && old.wardrobe.mode === 'all', 'the slice has its defaults');
  raw.contractLook.hat = ''; raw.wingDone = { teapot: true };
  ok(G.wardrobeWear(G.deserialize(JSON.stringify(raw)), 0).head === 'cosy', 'the Museum tea hat, as before');
  raw.contractLook.hat = 'crown'; raw.contractsWon = {};
  ok(G.wardrobeWear(G.deserialize(JSON.stringify(raw)), 0).head === 'cosy', 'a hat that is not owned is not worn');
}
{ // surprise me: owned looks only, colours differ for all
  G.seedRng(3);
  const s = G.newState();
  G.wardrobeRandom(s, 'all');
  const cols = new Set(), seats = [0, 1, 2, 3, 4, 5, 6, 7].map(i => G.wardrobeWear(s, i));
  for (const w of seats) { cols.add(w.colour); for (const sl of SL) ok(G.wardrobeOwns(s, sl, w[sl]), 'random wears only what is owned'); }
  ok(cols.size === 8, 'eight Rafeeqs, eight colours');
  ok(G.wardrobeUndo(s) && G.wardrobeWear(s, 3).colour === 'blue', 'surprise can be undone');
  G.wardrobeRandom(s, 2); ok(G.wardrobeWear(s, 2).colour && G.wardrobeWear(s, 1).colour === 'blue', 'one Rafeeq only');
}
{ // looks give no power: no mod, no hook of the feature but the one that notices, and no number moves
  const s = G.newState(); s.diggers.push({ c: 1, r: 0, tc: -1, tr: -1, cd: 0, swing: 0 });
  const before = [G.fold('crewPower', s, 1), G.fold('pickPower', s, 1), G.fold('coinMult', s, 1), G.fold('crewRate', s, 1), G.fold('swingDmg', s, 1), G.fold('damage', s, 1, { t: 'dirt' }, 'crew', {}, 0)];
  for (const sl of SL) for (const it of G.wardrobeItems(sl)) if (it.free) G.wardrobeSet(s, 0, sl, it.id);
  G.wardrobeRandom(s, 'all');
  const after = [G.fold('crewPower', s, 1), G.fold('pickPower', s, 1), G.fold('coinMult', s, 1), G.fold('crewRate', s, 1), G.fold('swingDmg', s, 1), G.fold('damage', s, 1, { t: 'dirt' }, 'crew', {}, 0)];
  ok(JSON.stringify(before) === JSON.stringify(after), 'no number moves with a look');
  ok(!G.wardrobe.mods && !G.wardrobe.relics && !G.wardrobe.items && Object.keys(G.wardrobe.hooks || {}).join() === 'step', 'the feature registers no mod, relic or shop item, one hook');
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('wardrobe: all passed');
