// Unit test for Lead Systems & Live Tuning Architect: Real-time Debug & Tuning System
// Run: node test_proto_argon_debug.js
import * as G from './digger-argon/game.js';

let failed = 0;
const ok = (cond, msg) => {
  if (!cond) {
    failed++;
    console.error('FAIL: ' + msg);
  }
};

console.log('Testing Lead Systems Live Tuning & Real-Time Debug Dashboard...');

// Clean slate
G.resetTuning();

// 1. Central Tuning Registry & Parameter Configuration
{
  ok(G.TUNING_CONFIG !== undefined, 'TUNING_CONFIG registry is exported');
  ok(typeof G.getTuning === 'function', 'getTuning is exported');
  ok(typeof G.setTuning === 'function', 'setTuning is exported');
  ok(typeof G.resetTuning === 'function', 'resetTuning is exported');
  ok(typeof G.exportTuningJson === 'function', 'exportTuningJson is exported');
  ok(typeof G.importTuningJson === 'function', 'importTuningJson is exported');

  // Verify all categories exist
  const cats = new Set(Object.values(G.TUNING_CONFIG).map(c => c.category));
  ok(cats.has('combat'), 'combat category registered');
  ok(cats.has('blocks'), 'blocks category registered');
  ok(cats.has('gates'), 'gates category registered');
  ok(cats.has('economy'), 'economy category registered');
  ok(cats.has('era'), 'era category registered');

  // Verify default parameters
  ok(G.getTuning('pickMult') === 1.0, 'default pickMult is 1.0');
  ok(G.getTuning('goodHitMult') === 2.5, 'default goodHitMult is 2.5');
  ok(G.getTuning('feverDmgMult') === 1.5, 'default feverDmgMult is 1.5');
  ok(G.getTuning('feverCoinMult') === 2.0, 'default feverCoinMult is 2.0');
  ok(G.getTuning('overkillRatio') === 0.5, 'default overkillRatio is 0.5');
  ok(G.getTuning('rafeeqShare') === 0.6, 'default rafeeqShare is 0.6');
  ok(G.getTuning('shockwaveRows') === 3, 'default shockwaveRows is 3');
  ok(G.getTuning('tntChainMax') === 4, 'default tntChainMax is 4');
  ok(G.getTuning('tailwindSpeed') === 2.0, 'default tailwindSpeed is 2.0');
}

// 2. Real-Time Pick Damage Overrides
{
  const s = G.newState();
  const basePower = G.pickPower(s);
  ok(basePower === 1, `initial pickPower is 1, got ${basePower}`);

  // In-memory / in-state override
  G.setTuning('pickMult', 2.5, s);
  ok(G.pickPower(s) === 2.5, `pickPower dynamically altered to 2.5, got ${G.pickPower(s)}`);

  G.setTuning('pickBase', 4.0, s);
  ok(G.pickPower(s) === 10.0, `pickPower with pickBase 4.0 and pickMult 2.5 is 10.0, got ${G.pickPower(s)}`);

  // Clear pick tuning
  G.clearTuning('pickBase', s);
  G.clearTuning('pickMult', s);
  ok(G.pickPower(s) === 1, 'pickPower restored to baseline 1 after clear');
}

// 3. Dirt HP and Hardness Curves Overrides
{
  const s = G.newState();
  const defaultHp0 = G.dirtHp(0, 'desert', true);
  ok(defaultHp0 === 5, `default row 0 boundedDirtHp is 5, got ${defaultHp0}`);

  // Tune base dirt HP
  G.setTuning('baseDirtHp', 15.0, s);
  const tunedHp0 = G.dirtHp(0, 'desert', true);
  ok(tunedHp0 === 15, `tuned baseDirtHp is 15, got ${tunedHp0}`);

  // Tune depth slope
  G.setTuning('dirtDepthSlope', 0.10, s);
  // at r=10: 15 * (1 + 0.10 * 10) = 15 * 2 = 30
  const tunedHp10 = G.dirtHp(10, 'desert', true);
  ok(tunedHp10 === 30, `tuned r=10 dirtHp is 30, got ${tunedHp10}`);

  // Hits clamp limits
  G.setTuning('minHits', 2, s);
  G.setTuning('maxHits', 8, s);
  const minClamped = G.clampHits(1, 1000); // 1 HP with 1000 power -> clamped to minHits 2
  ok(minClamped === 2, `clampHits respects tuned minHits=2, got ${minClamped}`);

  G.clearTuning('baseDirtHp', s);
  G.clearTuning('dirtDepthSlope', s);
  G.clearTuning('minHits', s);
  G.clearTuning('maxHits', s);
}

// 4. Boss & Gate HP Overrides
{
  const s = G.newState();

  // Chapter 1 overrides
  ok(G.chapter1BossHp(25) === 500, 'default Ch1 Big Rock HP is 500');
  G.setTuning('ch1RockHp', 777);
  ok(G.chapter1BossHp(25) === 777, `ch1RockHp override returns 777, got ${G.chapter1BossHp(25)}`);

  ok(G.chapter1BossHp(50, true) === 3000, 'default Ch1 Gate HP is 3000');
  G.setTuning('ch1GateHp', 9999);
  ok(G.chapter1BossHp(50, true) === 9999, `ch1GateHp override returns 9999, got ${G.chapter1BossHp(50, true)}`);

  G.clearTuning('ch1RockHp');
  G.clearTuning('ch1GateHp');
}

// 5. Era Mechanics Tuning: Acoustics Shockwave & TNT
{
  const s = G.newState();

  // Shockwave rows tuning
  G.setTuning('shockwaveRows', 5, s);
  ok(G.getTuning('shockwaveRows', s) === 5, 'shockwaveRows tuned to 5');
  const cleared = G.triggerAcousticShockwave(s);
  ok(cleared >= 5 * G.COLS, `shockwave cleared at least 5 rows (${cleared} blocks)`);

  // Resonance gain per beat
  G.setTuning('resonanceGain', 35, s);
  s.acoustics = { resonance: 0 };
  G.recordStrike(s, true);
  ok(s.acoustics.resonance === 35, `recordStrike on-beat awarded 35 resonance, got ${s.acoustics.resonance}`);

  // TNT chain max
  G.setTuning('tntChainMax', 12, s);
  ok(G.getTuning('tntChainMax', s) === 12, 'tntChainMax tuned to 12');

  G.clearTuning('shockwaveRows', s);
  G.clearTuning('resonanceGain', s);
  G.clearTuning('tntChainMax', s);
}

// 6. Rafeeq Power Share, Crits, and Combat Multipliers
{
  const s = G.newState();
  ok(G.crewShare(s) === 0.6, 'default crewShare is 0.6');

  G.setTuning('rafeeqShare', 1.25, s);
  ok(G.crewShare(s) === 1.25, `crewShare dynamically altered to 1.25, got ${G.crewShare(s)}`);

  G.setTuning('critChance', 0.50, s);
  ok(G.critChance(s) === 0.50, `critChance dynamically altered to 0.50, got ${G.critChance(s)}`);

  G.setTuning('critMult', 12.0, s);
  ok(G.critMult(s) === 12.0, `critMult dynamically altered to 12.0, got ${G.critMult(s)}`);

  G.setTuning('goodHitMult', 4.5, s);
  ok(G.getTuning('goodHitMult', s) === 4.5, 'goodHitMult tuned to 4.5');

  G.clearTuning('rafeeqShare', s);
  G.clearTuning('critChance', s);
  G.clearTuning('critMult', s);
  G.clearTuning('goodHitMult', s);
}

// 7. State Persistence, Reset Survival & Serialization
{
  const s = G.newState();
  ok(s.debugOverrides !== undefined, 's.debugOverrides is defined on new state');

  G.setTuning('coinDropMult', 3.0, s);
  G.setTuning('starCostExp', 1.8, s);

  ok(s.debugOverrides.coinDropMult === 3.0, 'override recorded in s.debugOverrides');
  ok(G.coinMult(s) === 3.0, `coinMult uses coinDropMult 3.0, got ${G.coinMult(s)}`);

  // Reset site: debugOverrides declares survives: ['site', 'land']
  G.reset(s, 'site');
  ok(s.debugOverrides.coinDropMult === 3.0, 'debugOverrides survived site reset');
  ok(G.coinMult(s) === 3.0, 'coinMult remains 3.0 after site reset');

  // Serialization and Deserialization roundtrip
  const text = G.serialize(s);
  const loaded = G.deserialize(text);
  ok(loaded !== null, 'state deserialized successfully');
  ok(loaded.debugOverrides && loaded.debugOverrides.coinDropMult === 3.0, 'debugOverrides restored from save');

  // Reset to defaults
  G.resetTuning(s);
  ok(Object.keys(s.debugOverrides).length === 0, 's.debugOverrides cleared after resetTuning');
  ok(G.coinMult(s) === 1.0, 'coinMult restored to 1.0 after resetTuning');
}

// 8. JSON Export / Import Roundtrip
{
  const s = G.newState();
  G.setTuning('pickMult', 3.0, s);
  G.setTuning('overkillRatio', 0.8, s);

  const jsonStr = G.exportTuningJson(s);
  ok(typeof jsonStr === 'string' && jsonStr.includes('"pickMult": 3'), 'JSON export contains pickMult: 3');

  const s2 = G.newState();
  const okImport = G.importTuningJson(jsonStr, s2);
  ok(okImport === true, 'JSON profile imported successfully');
  ok(G.getTuning('pickMult', s2) === 3.0, 'imported pickMult is 3.0');
  ok(G.getTuning('overkillRatio', s2) === 0.8, 'imported overkillRatio is 0.8');

  G.resetTuning(s);
  G.resetTuning(s2);
}

// 9. Testing Shortcuts Execution
{
  const s = G.newState();

  // Coins shortcut
  const coinsBefore = s.coins;
  G.addCoinsShortcut(s, 2500);
  ok(s.coins === coinsBefore + 2500, `addCoinsShortcut added 2500 coins: ${s.coins}`);

  // Stars shortcut
  const starsBefore = s.stars || 0;
  G.addStarsShortcut(s, 350);
  ok(s.stars === starsBefore + 350, `addStarsShortcut added 350 stars: ${s.stars}`);

  // Break view shortcut
  const broken = G.breakViewShortcut(s);
  ok(broken > 0, `breakViewShortcut broke ${broken} blocks`);

  // Spawn Gate shortcut
  G.spawnGateShortcut(s);
  ok(s.boss && s.boss.gate === 1, 'spawnGateShortcut successfully initialized Gate barrier');

  // Jump Level shortcut
  G.jumpLevelShortcut(s, 100);
  ok(s.best >= 100, `jumpLevelShortcut set depth best >= 100, got ${s.best}`);
}

if (failed) {
  console.error(`${failed} check(s) failed`);
  process.exit(1);
}
console.log('All Live Tuning & Real-Time Debug System tests passed!');
