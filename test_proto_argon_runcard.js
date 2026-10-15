// Test for Issue C1 (M7): Shareable Daily Dig Run Cards ("Wordle of Mining")
// Run: node test_proto_argon_runcard.js

import * as G from './digger-argon/game.js';
import {
  dailySeed,
  dailyExpeditionNumber,
  dailyDateStr,
  dailyProverb,
  generatePathMatrix,
  calculateRank,
  formatShareText,
  startDailyExpedition,
  finishDailyExpedition,
  recordSwing,
  recordChain,
  recordExcavatedCell,
  recordSpecimen,
  PROVERBS,
  PROVERBS_AR,
} from './digger-argon/features/runcard/rules.js';
import { createRunCardCanvas, CARD_WIDTH, CARD_HEIGHT } from './digger-argon/features/runcard/canvas.js';
import strings from './digger-argon/features/runcard/strings.js';

let failed = 0;
const ok = (cond, msg) => {
  if (!cond) {
    failed++;
    console.error('FAIL: ' + msg);
  }
};

console.log('Testing Issue C1 (M7): Shareable Daily Dig Run Cards...');

// 1. Verify Bilingual Strings Parity
{
  const required = [
    'runcard_title', 'runcard_sub', 'runcard_header', 'runcard_depth',
    'runcard_swings', 'runcard_max_chain', 'runcard_best_specimen',
    'runcard_rank', 'runcard_rank_bronze', 'runcard_rank_silver',
    'runcard_rank_gold', 'runcard_rank_master', 'runcard_share_btn',
    'runcard_copy_btn', 'runcard_copied', 'runcard_shared',
    'runcard_proverb_1', 'runcard_proverb_2', 'runcard_proverb_3',
    'runcard_url', 'runcard_view_card',
  ];

  for (const k of required) {
    ok(typeof strings.en[k] === 'string' && strings.en[k].length > 0, `EN string for ${k} exists`);
    ok(typeof strings.ar[k] === 'string' && strings.ar[k].length > 0, `AR string for ${k} exists`);
  }
}

// 2. Deterministic Daily Seed and Expedition Number Generation
{
  const dateA = '2026-10-16';
  const dateB = '2026-10-17';

  const seedA1 = dailySeed(dateA);
  const seedA2 = dailySeed(dateA);
  const seedB = dailySeed(dateB);

  ok(typeof seedA1 === 'number' && Number.isInteger(seedA1) && seedA1 >= 0, 'Seed is non-negative 32-bit int');
  ok(seedA1 === seedA2, 'Identical dates generate identical 32-bit seeds');
  ok(seedA1 !== seedB, 'Different dates generate distinct seeds');

  // Verify Day Numbers
  const day1 = dailyExpeditionNumber('2026-01-01');
  const day2 = dailyExpeditionNumber('2026-01-02');
  const dayOct = dailyExpeditionNumber('2026-10-16');

  ok(day1 === 1, '2026-01-01 is Day #1');
  ok(day2 === 2, '2026-01-02 is Day #2');
  ok(dayOct === 289, '2026-10-16 is Day #289');

  // Verify Proverb selection
  const provA1 = dailyProverb(seedA1);
  const provA2 = dailyProverb(seedA1);
  ok(provA1.en === provA2.en, 'Deterministic proverb for seed A');
  ok(PROVERBS.includes(provA1.en), 'Proverb is one of the Hakawati proverbs');
  ok(PROVERBS_AR.includes(provA1.ar), 'Arabic proverb matches Hakawati collection');
}

// 3. 4x4 Descent Path Matrix Generation
{
  const cells = [
    'sand', 'sand', 'ore', 'fossil',
    'water', 'water', 'rock', 'water',
    'tnt', 'tnt', 'fever', 'tnt',
  ];

  const res = generatePathMatrix(cells, true);
  ok(res.matrix.length === 4, 'Matrix has 4 rows');
  ok(res.matrix[0].length === 4, 'Row 0 has 4 columns');
  ok(res.matrix[3].length === 4, 'Row 3 has 4 columns');

  ok(res.matrix[0][0] === '[D]', 'Sand maps to [D]');
  ok(res.matrix[0][2] === '[O]', 'Ore maps to [O]');
  ok(res.matrix[0][3] === '[*]', 'Fossil maps to [*]');
  ok(res.matrix[1][0] === '[~]', 'Water maps to [~]');
  ok(res.matrix[1][2] === '[B]', 'Rock maps to [B]');
  ok(res.matrix[2][0] === '[!]', 'TNT maps to [!]');
  ok(res.matrix[2][2] === '[^]', 'Fever maps to [^]');
  ok(res.matrix[3][0] === '[=]', 'Gate down fills row 3 with [=]');

  ok(res.emojiMatrix[0][0] === '🟫', 'Sand emoji is 🟫');
  ok(res.emojiMatrix[0][2] === '🪙', 'Ore emoji is 🪙');
  ok(res.emojiMatrix[0][3] === '🦴', 'Fossil emoji is 🦴');
  ok(res.emojiMatrix[1][0] === '🌊', 'Water emoji is 🌊');
  ok(res.emojiMatrix[1][2] === '🪨', 'Basalt emoji is 🪨');
  ok(res.emojiMatrix[2][0] === '🧨', 'TNT emoji is 🧨');
  ok(res.emojiMatrix[2][2] === '⚡', 'Fever emoji is ⚡');
  ok(res.emojiMatrix[3][0] === '🚪', 'Gate emoji is 🚪');

  ok(typeof res.textGrid === 'string' && res.textGrid.split('\n').length === 4, 'Text grid has 4 lines');
  ok(typeof res.emojiGrid === 'string' && res.emojiGrid.split('\n').length === 4, 'Emoji grid has 4 lines');
}

// 4. In-Run Telemetry Aggregation & Daily Expedition Lifecycle
{
  const s = G.newState();
  ok(s.runcard, 'runcard slice initialized in state');

  const evs = [];
  const ev = (k, d) => evs.push({ k, d });

  const active = startDailyExpedition(s, '2026-10-16', ev);
  ok(active && active.dayNumber === 289, 'Started daily expedition #289');
  ok(s.runcard.activeRun === active, 'Active run set in state');
  ok(evs.some(e => e.k === 'dailyExpeditionStarted'), 'dailyExpeditionStarted emitted');

  // Record swings
  recordSwing(s);
  recordSwing(s);
  recordSwing(s);
  ok(active.swingsTaken === 3, 'Recorded 3 swings');

  // Record TNT chain
  recordChain(s, 6);
  ok(active.maxTntChain === 6, 'Recorded max TNT chain of 6');
  recordChain(s, 4);
  ok(active.maxTntChain === 6, 'Lower chain does not overwrite max');

  // Record excavated cells
  recordExcavatedCell(s, 'sand', 5);
  recordExcavatedCell(s, 'ore', 15);
  recordExcavatedCell(s, 'rock', 30);
  recordExcavatedCell(s, 'water', 65);
  ok(active.depthReached === 65, 'Depth reached updated to 65');

  // Record fossil specimens
  recordSpecimen(s, 'ammonite', 8);
  ok(active.bestSpecimen.grade === 8 && active.bestSpecimen.label === 'PSA 8 Ammonite', 'Recorded Grade 8');
  recordSpecimen(s, 'whale', 10, 'Whale');
  ok(active.bestSpecimen.grade === 10 && active.bestSpecimen.label === 'PSA 10 Whale', 'Promoted to PSA 10 Whale');
  recordSpecimen(s, 'camel', 7);
  ok(active.bestSpecimen.grade === 10, 'Lower grade does not overwrite PSA 10');

  // Finish expedition
  active.gateBreached = true;
  active.depthReached = 125;
  const summary = finishDailyExpedition(s, ev);

  ok(summary !== null, 'Summary returned on finish');
  ok(summary.dayNumber === 289, 'Summary day #289');
  ok(summary.depthReached === 125, 'Summary depth 125m');
  ok(summary.swingsTaken === 3, 'Summary swings 3');
  ok(summary.maxTntChain === 6, 'Summary max chain 6');
  ok(summary.bestSpecimen.label === 'PSA 10 Whale', 'Summary best specimen PSA 10 Whale');
  ok(summary.rank === 'Master', 'Rank is Master for 125m breach');
  ok(s.runcard.completedToday === true, 'completedToday marked true');
  ok(s.runcard.activeRun === null, 'Active run cleared');
  ok(s.runcard.lastRun === summary, 'lastRun saved in state');
  ok(s.runcard.history['2026-10-16'] === summary, 'Run archived in history');
  ok(evs.some(e => e.k === 'dailyExpeditionFinished'), 'dailyExpeditionFinished emitted');
}

// 5. Formatted Share Text ("The Wordle of Mining")
{
  const summary = {
    dayNumber: 289,
    depthReached: 125,
    swingsTaken: 348,
    maxTntChain: 6,
    bestSpecimen: { label: 'PSA 10 Whale' },
    rank: 'Gold',
    emojiGrid: '🟫 🟫 🪙 🦴\n🌊 🌊 🪨 🌊\n🧨 🧨 ⚡ 🧨\n🚪 🚪 🚪 🚪',
    proverb: { en: 'Drink your tea; the mountain is not running away.' },
  };

  const text = formatShareText(summary);
  ok(text.includes('AETHERIA: THE DAILY DIG #289'), 'Includes title header with #289');
  ok(text.includes('Depth: 125m | Rank: Gold 🥇'), 'Includes depth and gold medal');
  ok(text.includes('Swings: 348 | Max Chain: 6x 🧨 | Best: PSA 10 Whale'), 'Includes stats line');
  ok(text.includes('🟫 🟫 🪙 🦴'), 'Includes 4x4 descent path glyph matrix');
  ok(text.includes('"Drink your tea; the mountain is not running away."'), 'Includes Hakawati proverb');
  ok(text.includes('aetheria.dev/dig'), 'Includes clean URL footer');
}

// 6. Headless 600x600 Canvas Card Generator
{
  const summary = {
    dayNumber: 289,
    date: '2026-10-16',
    depthReached: 125,
    swingsTaken: 412,
    maxTntChain: 6,
    bestSpecimen: { label: 'PSA 10 Whale' },
    rank: 'Gold',
    pathGlyphs: generatePathMatrix(['sand', 'ore', 'fossil', 'rock'], true),
    proverb: { en: 'Drink your tea; the mountain is not running away.' },
  };

  // Test headless canvas creation
  const cv = createRunCardCanvas(summary);
  ok(cv.width === CARD_WIDTH && cv.width === 600, 'Canvas width is exactly 600');
  ok(cv.height === CARD_HEIGHT && cv.height === 600, 'Canvas height is exactly 600');
  ok(typeof cv.toDataURL === 'function', 'Canvas supports toDataURL');
  const dataUrl = cv.toDataURL();
  ok(typeof dataUrl === 'string' && dataUrl.startsWith('data:image/png'), 'Outputs valid PNG data URL');
}

// 7. Save and Migration Compatibility
{
  const s = G.newState();
  startDailyExpedition(s, '2026-10-16');
  recordSwing(s);
  const raw = G.serialize(s);
  ok(typeof raw === 'string' && raw.length > 0, 'Serialized state with runcard');

  const loaded = G.deserialize(raw);
  ok(loaded.runcard && loaded.runcard.todayDate === '2026-10-16', 'Deserialized runcard date');
  ok(loaded.runcard.activeRun && loaded.runcard.activeRun.swingsTaken === 1, 'Deserialized swings');

  // Backward compatibility: old save without runcard slice
  const oldState = G.newState();
  const oldRaw = JSON.parse(G.serialize(oldState));
  delete oldRaw.runcard;
  const migrated = G.deserialize(JSON.stringify(oldRaw));
  ok(migrated.runcard && migrated.runcard.completedToday === false, 'Legacy save initializes default runcard slice');
}

if (failed) {
  console.error(`${failed} assertion(s) failed in test_proto_argon_runcard.js`);
  process.exit(1);
}
console.log('test_proto_argon_runcard: ok');
