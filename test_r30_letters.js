// R30: letter notation (K, M, B, T, then aa, ab, ac...) as the default, and the v7 save step
// that moves saves on the old default (scientific) to it.
// Run: node test_r30_letters.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { MIGRATIONS, SAVE_VERSION, migrateSave } from './js/engine/migrations.js';

const L = (v, p = 2) => new BigNum(v).format('letters', p);

console.log('--- letters: K, M, B, T, then aa..zz, then aaa ---');
{
  assert.equal(L(0), '0');
  assert.equal(L(999), '999');
  assert.equal(L(1000), '1.00K');
  assert.equal(L(45210), '45.21K');
  assert.equal(L('1e6'), '1.00M');
  assert.equal(L('1e9'), '1.00B');
  assert.equal(L('1e12'), '1.00T');
  assert.equal(L('9.99e14'), '999.00T');
  assert.equal(L('1e15'), '1.00aa');
  assert.equal(L('1e18'), '1.00ab');
  assert.equal(L('1.5e16'), '15.00aa');
  // Each step is x1000 from aa = 1e15, so az = 1e90 and ba = 1e93
  assert.equal(L('1e90'), '1.00az');
  assert.equal(L('1e93'), '1.00ba');
  assert.equal(L('1e96'), '1.00bb');
  assert.equal(L('1e2040'), '1.00zz'); // last 2-letter tier
  assert.equal(L('1e2043'), '1.00aaa');
  assert.equal(L('1e2046'), '1.00aab');
  // Generated, so it never runs out (no fallback to scientific)
  assert.match(L('1e9000000'), /^1\.00[a-z]+$/);
}

console.log('--- letters: suffix boundaries and rounding ---');
{
  assert.equal(BigNum.letterSuffix(0), '');
  assert.equal(BigNum.letterSuffix(4), 'T');
  assert.equal(BigNum.letterSuffix(5), 'aa');
  assert.equal(BigNum.letterSuffix(5 + 675), 'zz');
  assert.equal(BigNum.letterSuffix(5 + 676), 'aaa');
  assert.equal(BigNum.letterSuffix(5 + 676 + 17575), 'zzz');
  assert.equal(BigNum.letterSuffix(5 + 676 + 17576), 'aaaa');
  // 999.999K rounds up to the next tier, never "1000.00K"
  assert.equal(L(999999), '1.00M');
  assert.equal(L('9.99999e14'), '1.00aa');
  assert.equal(L(999999, 0), '1M');
  assert.equal(L(1500, 0), '2K');
}

console.log('--- letters: negatives ---');
{
  assert.equal(L(-1500), '-1.50K');
  assert.equal(L('-1.5e16'), '-15.00aa');
  assert.equal(L('-1e93'), '-1.00ba');
  assert.equal(L(-999999), '-1.00M');
}

console.log('--- letters is the default; other notations unchanged ---');
{
  assert.equal(BigNum.notation, 'letters');
  assert.equal(new GameState().settings.notation, 'letters');
  assert.equal(new BigNum('1e15').format(), '1.00aa');
  assert.equal(BigNum.formatNumber(2.5e18), '2.50ab');
  const n = new BigNum(1.5, 16);
  assert.equal(n.format('scientific'), '1.5e16');
  assert.equal(n.format('engineering'), '15e15');
  assert.equal(n.format('suffix'), '15.00 Qa');
  // Letters stay Latin/ASCII so they render the same inside RTL text
  assert.match(n.format('letters'), /^[\x20-\x7e]+$/);
}

console.log('--- v7: saves on the old default switch to letters, picked notations are kept ---');
{
  assert.ok(MIGRATIONS.some(s => s.to === 7));
  assert.ok(SAVE_VERSION >= 7);
  const step = MIGRATIONS.find(s => s.to === 7);
  const run = (settings) => step.migrate(settings === undefined ? {} : { settings }).settings;
  assert.equal(run({ notation: 'scientific' }).notation, 'letters');
  assert.equal(run({}).notation, 'letters');
  assert.equal(run(undefined).notation, 'letters');
  assert.equal(run({ notation: 'suffix' }).notation, 'suffix');
  assert.equal(run({ notation: 'engineering' }).notation, 'engineering');
  assert.deepEqual(run({ notation: 'scientific', guidesSeen: { all: true } }).guidesSeen, { all: true });

  // A full v6 save through GameState
  const old = { version: 6, savedAt: 1, aether: { m: 1, e: 3 }, settings: { notation: 'scientific', reduceMotion: 'on' } };
  const gs = new GameState();
  gs.deserialize(JSON.parse(JSON.stringify(old)));
  assert.equal(gs.settings.notation, 'letters');
  assert.equal(gs.settings.reduceMotion, 'on', 'other settings kept');
  assert.equal(gs.serialize().version, SAVE_VERSION);

  const eng = { version: 6, savedAt: 1, settings: { notation: 'engineering' } };
  const gs2 = new GameState();
  gs2.deserialize(eng);
  assert.equal(gs2.settings.notation, 'engineering');

  // A v7 save that chose scientific after the switch keeps it
  const v7 = migrateSave({ version: 7, settings: { notation: 'scientific' } });
  assert.equal(v7.settings.notation, 'scientific');
  const gs3 = new GameState();
  gs3.deserialize({ version: 7, savedAt: 1, settings: { notation: 'scientific' } });
  assert.equal(gs3.settings.notation, 'scientific');
}

console.log('R30 letter notation tests passed');
