// Dig: the save code (export/import). Run: node test_proto_savecode.js
import { readFileSync } from 'node:fs';
import * as G from './proto/game.js';
import { encodeSave, decodeSave, checkSum } from './proto/features/settings/savecode.js';

let failed = 0;
const ok = (c, m) => { if (!c) { failed++; console.error('FAIL: ' + m); } };
const mid = readFileSync('test_fixtures/v2-mid-road.json', 'utf8');

{ // round trip: state -> code -> state is equal after deserialize
  const s = G.deserialize(mid);
  const text = G.serialize(s), code = await encodeSave(text);
  ok(/^DIG1-2-[0-9a-f]{8}-[A-Za-z0-9_-]+$/.test(code) && code.length < text.length, 'a short single-line code');
  const r = await decodeSave(code);
  ok(r.ok && r.text === text, 'the text comes back exactly');
  const a = JSON.parse(G.serialize(r.state)), b = JSON.parse(G.serialize(s)); delete a.savedAt; delete b.savedAt;
  ok(JSON.stringify(a) === JSON.stringify(b), 'state to code to state is equal');
  ok(r.info.stars === s.stars, 'preview numbers');
  ok((await decodeSave('  ' + code.slice(0, 20) + '\n' + code.slice(20) + ' ')).ok, 'spaces and line breaks from a paste are ignored');
}
{ // refusals
  const code = await encodeSave(mid);
  const why = async c => (await decodeSave(c)).why;
  ok(await why('') === 'empty' && await why(null) === 'empty', 'empty');
  ok(await why('hello') === 'format' && await why(mid) === 'format', 'not a code');
  ok(await why(code.slice(0, -10)) === 'sum', 'cut code');
  const flip = code.slice(0, -5) + (code.at(-5) === 'A' ? 'B' : 'A') + code.slice(-4);
  ok(await why(flip) === 'sum', 'a mistyped letter');
  ok(await why(code.replace('DIG1-2-', 'DIG1-3-')) === 'newer', 'a newer save version');
  ok(await why(await encodeSave(mid, G.SAVE_VERSION + 1)) === 'newer', 'a code made by a newer game');
  // valid sum but not a save
  const junk = await encodeSave('{"v":2,"rows":[]}');
  ok(await why(junk) === 'broken', 'a well-formed code that is not a save');
  const notZip = 'abcd'; ok(await why(`DIG1-2-${checkSum(notZip)}-${notZip}`) === 'broken', 'not compressed data');
  const tooNew = JSON.parse(mid); tooNew.v = G.SAVE_VERSION + 1;
  ok(await why(await encodeSave(JSON.stringify(tooNew))) === 'broken', 'a save inside that is newer than this game');
}
{ // the stored save is never touched by decoding
  const mem = { DIG_PROTO_SAVE_V1: 'current save' };
  for (const bad of ['x', 'DIG1-9-00000000-abc']) await decodeSave(bad);
  ok(mem.DIG_PROTO_SAVE_V1 === 'current save', 'decode has no side effects (it only returns)');
  const src = readFileSync('proto/features/settings/savecode.js', 'utf8');
  ok(!/localStorage|setItem|removeItem/.test(src), 'savecode.js cannot write the store');
}
{ // an old save exported becomes a good code and loads through the migrations
  const old = readFileSync('test_fixtures/old-no-fv.json', 'utf8');
  const r = await decodeSave(await encodeSave(old, 2));
  ok(r.ok && r.state.v === G.SAVE_VERSION && r.state.road.deal === null, 'an old save loads from a code');
}
{ // strings exist
  for (const k of ['sc_title', 'sc_show', 'sc_load', 'sc_format', 'sc_sum', 'sc_newer', 'sc_broken', 'sc_preview', 'sc_replace', 'sc_cancel'])
    ok(G.hasString(k), 'string ' + k);
}

if (failed) { console.error(`${failed} check(s) failed`); process.exit(1); }
console.log('Dig save code OK');
