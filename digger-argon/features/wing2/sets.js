// Dig feature: the one Museum. The sets: pure data, no rules. (The folder is still called wing2.)
// The first three sets (Old Camel, Sand Whale, Lamp of the Djinn) were the old Museum; they have `legacy: true`
// so the old bone and set ids ('bone:camel.0', 'set:camel') still count as the first time.
// A piece says how it is found with `how`:
//   'bone'        a bone block (the white bone) breaks, below the set's `from` row
//   'lost'        a Dusty Bundle breaks, below `from`
//   'blast'       a Dusty Bundle breaks in a chain (a TNT blast, the Boom Pick, ...)
//   'site:<id>'   a Dusty Bundle breaks while you dig at that site
//   'ore:<kind>'  an ore block of that kind breaks (a small chance)
//   'chest'       a chest block breaks (a chance)
//   'gusher'      an oil block breaks (a chance)
//   'rock:<n>'    the Big Rock of layer n, or deeper, breaks
// `rare: true` marks the piece the panel tells you how to hunt. `from` is a row (metres) in the ground you dig.
// `reward` names what finishing does (rules.js and ui.js read it).

export const WING = {
  camel: { at: 1, from: 13, kind: 'skeleton', col: '#e8cf9a', reward: 'camel', legacy: true,
    pieces: [{ how: 'bone' }, { how: 'bone' }, { how: 'bone' }, { how: 'bone' }] },
  whale: { at: 2, from: 26, kind: 'skeleton', col: '#9fd0e8', reward: 'whalepearl', legacy: true,
    pieces: [{ how: 'bone' }, { how: 'bone' }, { how: 'bone' }, { how: 'lost' }, { how: 'ore:silver' }] },
  djinn: { at: 3, from: 38, kind: 'treasure', col: '#b48cff', reward: 'wish', legacy: true,
    pieces: [{ how: 'lost' }, { how: 'lost' }, { how: 'lost' }, { how: 'chest' }, { how: 'ore:gold' }, { how: 'rock:1', rare: true }] },
  dhab: { at: 10, from: 18, kind: 'skeleton', col: '#f6efdc', reward: 'lizard',
    pieces: [{ how: 'bone' }, { how: 'bone' }, { how: 'bone' }, { how: 'bone' }] },
  coins: { at: 20, from: 28, kind: 'treasure', col: '#ffd23f', reward: 'dinar',
    pieces: [{ how: 'lost' }, { how: 'lost' }, { how: 'lost' }, { how: 'ore:silver' }, { how: 'ore:gold', rare: true }] },
  teapot: { at: 30, from: 34, kind: 'treasure', col: '#6ec6d9', reward: 'hats',
    pieces: [{ how: 'lost' }, { how: 'lost' }, { how: 'lost' }, { how: 'chest' }, { how: 'ore:copper' }] },
  pilot: { at: 40, from: 44, kind: 'treasure', col: '#d9a15a', reward: 'goggles',
    pieces: [{ how: 'lost' }, { how: 'lost' }, { how: 'ore:silver' }, { how: 'chest' }, { how: 'rock:1', rare: true }] },
  scarab: { at: 50, from: 50, kind: 'skeleton', col: '#c9e4a8', reward: 'jar',
    pieces: [{ how: 'bone' }, { how: 'bone' }, { how: 'bone' }, { how: 'lost' }, { how: 'blast', rare: true }] },
  shark: { at: 60, from: 55, kind: 'skeleton', col: '#cfe3f2', reward: 'sharks',
    pieces: [{ how: 'bone' }, { how: 'bone' }, { how: 'bone' }, { how: 'lost' }, { how: 'rock:2' }, { how: 'ore:gem', rare: true }] },
  pearls: { at: 70, from: 60, kind: 'treasure', col: '#f1e6ff', reward: 'pearl',
    pieces: [{ how: 'lost' }, { how: 'lost' }, { how: 'chest' }, { how: 'ore:silver' }, { how: 'ore:gold' }, { how: 'ore:gem', rare: true }] },
  oilrig: { at: 80, from: 75, kind: 'treasure', col: '#b4bec8', reward: 'derrick',
    pieces: [{ how: 'lost' }, { how: 'lost' }, { how: 'gusher' }, { how: 'blast' }, { how: 'rock:3', rare: true }] },
  flycamel: { at: 90, from: 75, kind: 'skeleton', col: '#f6efdc', reward: 'mirage',
    pieces: [{ how: 'bone' }, { how: 'bone' }, { how: 'bone' }, { how: 'lost' }, { how: 'site:sharks', rare: true }, { how: 'chest' }, { how: 'rock:3', rare: true }] },
  beast: { at: 100, from: 90, kind: 'skeleton', col: '#ffe9b0', reward: 'parade',
    pieces: [{ how: 'bone' }, { how: 'bone' }, { how: 'bone' }, { how: 'lost' }, { how: 'ore:gem' }, { how: 'site:mirage', rare: true }, { how: 'rock:4', rare: true }] },
};

export const wingKeys = () => Object.keys(WING).sort((a, b) => WING[a].at - WING[b].at);
export const wingPiece = (set, i) => `${set}.${i}`;
// does a piece answer to this trigger? trig = { tags: [...], layer }
export function wingMatches(piece, trig) {
  if (!piece || typeof piece.how !== 'string') return false;
  if (typeof trig === 'string') trig = { tags: [trig] };
  if (!trig || !Array.isArray(trig.tags)) return false;
  if (piece.how.startsWith('rock:')) return trig.tags.includes('rock') && (trig.layer === undefined || trig.layer >= Number(piece.how.slice(5)));
  return trig.tags.includes(piece.how);
}
