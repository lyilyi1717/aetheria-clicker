// Dig feature "runcard": Daily Dig Expedition & Shareable Run Card ("Wordle of Mining")
// Deterministic daily seeds, telemetry recording, 4x4 descent path glyph matrix, and social sharing.

import { use, emit } from '../../core/registry.js';
import strings from './strings.js';

export const PROVERBS = [
  'The desert hides its treasures from the hurried traveler.',
  'Every strike of the chisel is a conversation with the stone.',
  'Drink your tea; the mountain is not running away.',
  'Even the deepest darkness bows to a steady lantern.',
  'Gold is found where patient hands persist.',
  'The earth remembers every footstep and every strike.',
  'The deep sings only to those who listen between the beats.',
];

export const PROVERBS_AR = [
  'تخفي الصحراء كنوزها عن المسافر المتعجل.',
  'كل ضربة إزميل هي حديث مع الحجر.',
  'اشرب شايك؛ فالجبل لن يهرب.',
  'حتى أحلك الظلمات تنحني لسراج ثابت.',
  'يوجد الذهب حيث تصبر الأيدي وتثابر.',
  'الأرض تتذكر كل خطوة وكل ضربة.',
  'الأعماق لا تغني إلا لمن يصغي بين النغمات.',
];

// Block category mappings for 4x4 matrix
export const GLYPH_MAP = {
  dirt: { code: '[D]', emoji: '\u{1F7EB}', name: 'Dirt' },
  sand: { code: '[D]', emoji: '\u{1F7EB}', name: 'Sand' },
  ore: { code: '[O]', emoji: '\u{1FA99}', name: 'Ore' },
  gold: { code: '[O]', emoji: '\u{1FA99}', name: 'Gold' },
  fossil: { code: '[*]', emoji: '\u{1F9B4}', name: 'Fossil' },
  bone: { code: '[*]', emoji: '\u{1F9B4}', name: 'Bone' },
  gem: { code: '[*]', emoji: '\u{1F48E}', name: 'Gem' },
  water: { code: '[~]', emoji: '\u{1F30A}', name: 'Water' },
  silt: { code: '[~]', emoji: '\u{1F30A}', name: 'Silt' },
  aquifer: { code: '[~]', emoji: '\u{1F30A}', name: 'Aquifer' },
  rock: { code: '[B]', emoji: '\u{1FAA8}', name: 'Basalt' },
  basalt: { code: '[B]', emoji: '\u{1FAA8}', name: 'Basalt' },
  obsidian: { code: '[B]', emoji: '\u{1FAA8}', name: 'Obsidian' },
  tnt: { code: '[!]', emoji: '\u{1F9E8}', name: 'TNT' },
  blast: { code: '[!]', emoji: '\u{1F9E8}', name: 'Blast' },
  gate: { code: '[=]', emoji: '\u{1F6AA}', name: 'Gate' },
  boss: { code: '[=]', emoji: '\u{1F6AA}', name: 'Gate' },
  fever: { code: '[^]', emoji: '\u{26A1}', name: 'Fever' },
  chest: { code: '[$]', emoji: '\u{1F4E6}', name: 'Chest' },
};

export const DEFAULT_GLYPH = { code: '[D]', emoji: '\u{1F7EB}', name: 'Dirt' };

/**
 * Returns UTC date string 'YYYY-MM-DD'.
 */
export function dailyDateStr(date = new Date()) {
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

/**
 * Deterministic 32-bit positive integer hash derived from date string 'YYYY-MM-DD'.
 */
export function dailySeed(dateStr) {
  const str = dateStr || dailyDateStr();
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * Expedition number: sequential day counter starting from epoch 2026-01-01 (Day #1).
 */
export function dailyExpeditionNumber(dateStr) {
  const str = dateStr || dailyDateStr();
  const [y, m, d] = str.split('-').map(Number);
  const dt = Date.UTC(y, m - 1, d);
  const epoch = Date.UTC(2026, 0, 1);
  return Math.max(1, Math.floor((dt - epoch) / 86400000) + 1);
}

/**
 * Select deterministic Hakawati proverb based on seed or date.
 */
export function dailyProverb(seed) {
  const idx = Math.abs(seed) % PROVERBS.length;
  return {
    en: PROVERBS[idx],
    ar: PROVERBS_AR[idx],
  };
}

/**
 * Maps a list of encountered block types and milestones into a 4x4 matrix of glyphs.
 */
export function generatePathMatrix(pathCells = [], gateDown = false) {
  const matrix = [];
  const emojiMatrix = [];
  const textRows = [];
  const emojiRows = [];

  // Fill 16 cells
  for (let i = 0; i < 16; i++) {
    let item = pathCells[i];
    // If gate was downed, ensure the final row reflects gate breach
    if (gateDown && i >= 12) {
      item = 'gate';
    }
    const glyph = (item && GLYPH_MAP[item]) ? GLYPH_MAP[item] : DEFAULT_GLYPH;
    const row = Math.floor(i / 4);
    const col = i % 4;

    if (!matrix[row]) matrix[row] = [];
    if (!emojiMatrix[row]) emojiMatrix[row] = [];

    matrix[row][col] = glyph.code;
    emojiMatrix[row][col] = glyph.emoji;
  }

  for (let r = 0; r < 4; r++) {
    textRows.push(matrix[r].join(' '));
    emojiRows.push(emojiMatrix[r].join(' '));
  }

  return {
    matrix,
    emojiMatrix,
    textGrid: textRows.join('\n'),
    emojiGrid: emojiRows.join('\n'),
  };
}

/**
 * Calculate medal rank from performance.
 */
export function calculateRank(depth, gateDown, swings) {
  if (depth >= 100 && gateDown && swings < 800) return 'Master';
  if (depth >= 75 && gateDown) return 'Gold';
  if (depth >= 50 || gateDown) return 'Silver';
  return 'Bronze';
}

/**
 * Formats full summary for clipboard or social share.
 */
export function formatShareText(summary) {
  const medalIcons = { Master: '\u{1F48E}', Gold: '\u{1F947}', Silver: '\u{1F948}', Bronze: '\u{1F949}' };
  const medalIcon = medalIcons[summary.rank] || '\u{1F3C5}';
  const specimenText = summary.bestSpecimen?.label || summary.bestSpecimen || 'PSA 10 Whale';

  return [
    `AETHERIA: THE DAILY DIG #${summary.dayNumber}`,
    `Depth: ${summary.depthReached}m | Rank: ${summary.rank} ${medalIcon}`,
    `Swings: ${summary.swingsTaken} | Max Chain: ${summary.maxTntChain}x \u{1F9E8} | Best: ${specimenText}`,
    '',
    summary.pathGlyphs?.emojiGrid || summary.emojiGrid || '',
    '',
    `"${summary.proverb?.en || summary.proverb || PROVERBS[0]}"`,
    'aetheria.dev/dig',
  ].join('\n');
}

/**
 * Initializes or starts a new daily expedition run in state.
 */
export function startDailyExpedition(s, dateStr, ev) {
  const date = dateStr || dailyDateStr();
  const seed = dailySeed(date);
  const dayNumber = dailyExpeditionNumber(date);
  const proverb = dailyProverb(seed);

  if (!s.runcard) {
    s.runcard = {
      todayDate: date,
      todayNumber: dayNumber,
      completedToday: false,
      activeRun: null,
      lastRun: null,
      history: {},
    };
  }

  const activeRun = {
    date,
    dayNumber,
    seed,
    swingsTaken: 0,
    maxTntChain: 1,
    bestSpecimen: null,
    depthReached: 0,
    gateBreached: false,
    feverCount: 0,
    pathCells: [],
    proverb,
    startTime: Date.now(),
    completed: false,
  };

  s.runcard.activeRun = activeRun;
  s.runcard.todayDate = date;
  s.runcard.todayNumber = dayNumber;

  if (ev) ev('dailyExpeditionStarted', { date, dayNumber, seed });
  return activeRun;
}

/**
 * Finalizes current daily expedition and generates summary.
 */
export function finishDailyExpedition(s, ev) {
  if (!s.runcard || !s.runcard.activeRun) return null;
  const run = s.runcard.activeRun;
  run.completed = true;

  const pathGlyphs = generatePathMatrix(run.pathCells, run.gateBreached);
  const rank = calculateRank(run.depthReached, run.gateBreached, run.swingsTaken);

  const summary = {
    date: run.date,
    dayNumber: run.dayNumber,
    seed: run.seed,
    depthReached: Math.max(run.depthReached, s.best || 0),
    swingsTaken: run.swingsTaken,
    maxTntChain: run.maxTntChain,
    bestSpecimen: run.bestSpecimen || { id: 'whale', grade: 10, label: 'PSA 10 Whale' },
    gateBreached: run.gateBreached,
    feverCount: run.feverCount,
    rank,
    proverb: run.proverb,
    pathGlyphs,
    emojiGrid: pathGlyphs.emojiGrid,
    textGrid: pathGlyphs.textGrid,
    completedAt: Date.now(),
  };

  summary.shareText = formatShareText(summary);

  s.runcard.lastRun = summary;
  s.runcard.history[run.date] = summary;
  s.runcard.completedToday = true;
  s.runcard.activeRun = null;

  if (ev) {
    emit(s, ev, 'dailyExpeditionFinished', summary);
  }
  return summary;
}

/**
 * Record an excavation strike.
 */
export function recordSwing(s) {
  if (s.runcard && s.runcard.activeRun) {
    s.runcard.activeRun.swingsTaken++;
  }
}

/**
 * Record a TNT chain reaction.
 */
export function recordChain(s, chain) {
  if (s.runcard && s.runcard.activeRun) {
    if (chain > s.runcard.activeRun.maxTntChain) {
      s.runcard.activeRun.maxTntChain = chain;
    }
  }
}

/**
 * Record an excavated block cell.
 */
export function recordExcavatedCell(s, blockType, depth) {
  if (s.runcard && s.runcard.activeRun) {
    const run = s.runcard.activeRun;
    if (depth > run.depthReached) run.depthReached = depth;
    if (run.pathCells.length < 64) {
      run.pathCells.push(blockType);
    }
  }
}

/**
 * Record a discovered fossil / antiquity specimen.
 */
export function recordSpecimen(s, specimenId, grade = 10, name = '') {
  if (s.runcard && s.runcard.activeRun) {
    const curGrade = s.runcard.activeRun.bestSpecimen?.grade || 0;
    if (grade >= curGrade) {
      const displayName = name || (specimenId ? specimenId.charAt(0).toUpperCase() + specimenId.slice(1) : 'Specimen');
      s.runcard.activeRun.bestSpecimen = {
        id: specimenId,
        grade,
        label: `PSA ${grade} ${displayName}`,
      };
    }
  }
}

export const runcard = use({
  id: 'runcard',
  strings,
  state: {
    runcard: {
      init: () => ({
        todayDate: null,
        todayNumber: 0,
        completedToday: false,
        activeRun: null,
        lastRun: null,
        history: {},
      }),
      survives: ['site', 'land'],
    },
  },
  hooks: {
    swung(s) {
      recordSwing(s);
    },
    broke(s, d) {
      if (s.runcard && s.runcard.activeRun) {
        const depth = Math.max(s.best || 0, (d.r !== undefined ? d.r + 1 : 0));
        recordExcavatedCell(s, d.t || 'dirt', depth);
      }
    },
    blast(s, d) {
      if (d && d.chain) {
        recordChain(s, d.chain);
      }
    },
    fossil(s, d) {
      if (d) {
        const grade = d.grade || 10;
        recordSpecimen(s, d.set || d.id || 'fossil', grade, d.name);
      }
    },
    bossDown(s) {
      if (s.runcard && s.runcard.activeRun) {
        s.runcard.activeRun.gateBreached = true;
      }
    },
    feverStart(s) {
      if (s.runcard && s.runcard.activeRun) {
        s.runcard.activeRun.feverCount++;
        s.runcard.activeRun.pathCells.push('fever');
      }
    },
    siteFinished(s, d, ev) {
      if (s.runcard && s.runcard.activeRun) {
        s.runcard.activeRun.gateBreached = true;
        finishDailyExpedition(s, ev);
      }
    },
  },
});
