// Test 365-Day Chapter Roadmap Orchestrator (ARGON-07). Run: node test_proto_chapters.js
import * as G from './digger-argon/game.js';
import strings from './digger-argon/features/sites/strings.js';
import { buildMap } from './digger-argon/features/worldmap/layout.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };

console.log('Testing ARGON-07: The 365-Day Chapter Roadmap Orchestrator...');

{ // 1. Roadmap length and uniqueness
  ok(G.ROAD.length === 240, `ROAD has 240 levels: got ${G.ROAD.length}`);
  const keys = G.ROAD.map(G.roadKey);
  const uniqueKeys = new Set(keys);
  ok(uniqueKeys.size === 240, `all 240 levels have unique keys: got ${uniqueKeys.size}`);
}

{ // 2. Chapter mapping (chapterOf)
  for (let ch = 1; ch <= 12; ch++) {
    const start = (ch - 1) * 20 + 1;
    const end = ch * 20;
    for (let lv = start; lv <= end; lv++) {
      ok(G.chapterOf(lv) === ch, `level ${lv} maps to chapter ${ch}: got ${G.chapterOf(lv)}`);
      const info = G.levelOf(lv);
      ok(info.ch === ch, `levelOf(${lv}).ch === ${ch}`);
      ok(info.n === lv - start + 1, `levelOf(${lv}).n === ${lv - start + 1}`);
      ok(info.of === 20, `levelOf(${lv}).of === 20`);
    }
  }
}

{ // 3. Era mapping (eraOf)
  const expectedEras = {
    1: 1, 2: 1, 3: 1, 4: 1,
    5: 2, 6: 2, 7: 2,
    8: 3, 9: 3, 10: 3,
    11: 4, 12: 4,
  };
  for (let ch = 1; ch <= 12; ch++) {
    ok(G.eraOf(ch) === expectedEras[ch], `chapter ${ch} is in era ${expectedEras[ch]}: got ${G.eraOf(ch)}`);
  }
}

{ // 4. Chapter biomes registry
  for (let ch = 1; ch <= 12; ch++) {
    const biome = G.CHAPTER_BIOMES[ch];
    ok(biome && biome.id && biome.name && biome.era, `chapter ${ch} has valid biome: ${biome ? biome.id : 'none'}`);
    ok(biome.era === G.eraOf(ch), `chapter ${ch} biome era matches eraOf`);
  }
}

{ // 5. Gate multiplier across all 240 road levels
  for (let i = 0; i < 240; i++) {
    const g = G.gateMulOf(i);
    if (i >= G.FIXED.length) {
      ok(typeof g === 'number' && g > 0, `gateMulOf(${i}) returns positive multiplier: got ${g}`);
    }
  }
}

{ // 6. Strings and i18n for chapters 1 through 12
  const en = strings.en, ar = strings.ar;
  ok(en.ch_level && ar.ch_level, 'ch_level string exists in en and ar');
  for (let ch = 3; ch <= 12; ch++) {
    const key = 'new_ch' + ch;
    ok(en[key] && ar[key], `${key} exists in en and ar`);
  }
}

{ // 7. World map integration with 240 levels
  const s = G.newState();
  let threw = false;
  try {
    const map = buildMap(s);
    ok(map && map.nodes.length >= 240, `buildMap created >= 240 nodes: got ${map ? map.nodes.length : 0}`);
  } catch (err) {
    threw = true;
    console.error(err);
  }
  ok(!threw, 'buildMap succeeds with full 240 levels');
}

if (failed) {
  console.error(`${failed} check(s) failed in test_proto_chapters.js`);
  process.exit(1);
}
console.log('test_proto_chapters: ok');
