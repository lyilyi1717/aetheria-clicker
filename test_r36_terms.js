// Oil re-theme (R36): players never see the old names. Scans the code players read text from
// (index.html and every js/ file except js/version.js, whose past changelog entries are history
// and whose newest entry names the old terms to explain the rename) for "Aether", "Ascend",
// "Ascension", "Transcend", "Transcendence" and "Falafel" outside comments. Internal identifiers
// (ascend(), canTranscend, gs.ascensionCount, the `aether` key, --aether) never match: the check
// is case-sensitive and skips words glued to an identifier, a dot, a dash or a $.
// Also checks the terms table and that old saves still load with the renamed text.
// Run: node test_r36_terms.js
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { TERMS } from './js/data/strings.js';
import { GameState } from './js/systems/GameState.js';

const OLD = 'Aether|Ascend|Ascends|Ascended|Ascending|Ascension|Ascensions|Transcend|Transcends|Transcended|Transcending|Transcendence|Transcendences|Falafel';
const CAPS = new RegExp(`(?<![\\w.$\\-])(${OLD})(?![\\w\\-])`);
// Lowercase old words in index.html prose ("... and ascend."); attributes like data-res="aether"
// and var(--aether) are skipped because a quote or dash precedes them.
const LOWER = new RegExp(`(?<=[\\s>])(${OLD.toLowerCase()})(?![\\w\\-])`);

function jsFiles(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...jsFiles(p));
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}

// Strips // and /* */ comments line by line (good enough for this codebase: no string holds
// " //" or "/*").
function codeLines(src) {
  let inBlock = false;
  return src.split('\n').map(line => {
    let l = line;
    if (inBlock) {
      const end = l.indexOf('*/');
      if (end < 0) return '';
      l = l.slice(end + 2);
      inBlock = false;
    }
    l = l.replace(/\/\*.*?\*\//g, '');
    const start = l.indexOf('/*');
    if (start >= 0) { inBlock = true; l = l.slice(0, start); }
    return l.replace(/(^|\s)\/\/.*$/, '$1');
  });
}

const hits = [];
for (const file of jsFiles('js')) {
  if (file.replace(/\\/g, '/') === 'js/version.js') continue;
  codeLines(readFileSync(file, 'utf8')).forEach((l, i) => {
    const m = CAPS.exec(l);
    if (m) hits.push(`${file}:${i + 1}: "${m[1]}" in ${l.trim().slice(0, 120)}`);
  });
}
const html = readFileSync('index.html', 'utf8').replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ''));
html.split('\n').forEach((l, i) => {
  const m = CAPS.exec(l) || LOWER.exec(l);
  if (m) hits.push(`index.html:${i + 1}: "${m[1]}" in ${l.trim().slice(0, 120)}`);
});
assert.deepEqual(hits, [], `old player-facing names left:\n${hits.join('\n')}`);

// The terms table holds the new names and none of the old ones
for (const [k, v] of Object.entries(TERMS)) {
  assert.ok(typeof v === 'string' && v.trim(), `TERMS.${k} is a non-empty string`);
  assert.ok(!CAPS.test(v) && !/aether|ascen|transcend|falafel/i.test(v), `TERMS.${k} has no old name`);
}
assert.equal(TERMS.currency, 'Oil');
assert.equal(TERMS.reset1, 'Drill a New Well');
assert.equal(TERMS.reset1Currency, 'Crude Reserves');
assert.equal(TERMS.reset2, 'Open a New Oil Field');
assert.equal(TERMS.reset2Currency, 'Field Shares');

// The rename is text only: an old save with the old keys loads with every value intact
{
  const gs = new GameState();
  gs.aether = gs.aether.add(12345);
  gs.ascensionCount = 7;
  gs.transcendenceCount = 2;
  const data = JSON.parse(JSON.stringify(gs.serialize()));
  for (const key of ['aether', 'cosmicDust', 'totalCosmicDust', 'ascensionCount', 'transcendenceCount', 'fractureShards']) {
    assert.ok(key in data, `save still uses the key "${key}"`);
  }
  const back = new GameState();
  back.deserialize(data);
  assert.equal(back.aether.toNumber(), 12345, 'Oil (aether) survives a save round trip');
  assert.equal(back.ascensionCount, 7, 'New Well count (ascensionCount) survives');
  assert.equal(back.transcendenceCount, 2, 'New Field count (transcendenceCount) survives');
}

console.log('R36 terms tests passed');
