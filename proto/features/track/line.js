// Dig feature (page side): the words of the level line above the dig, with no DOM so a test can read them.
// The line is two parts: "level · land" (never cut) and " · place" (the only part that may end in dots).
// In Arabic the whole top-left block of the track (the level line, the gate note with the clock and medals, the message
// line) reads right to left: the caller gives those boxes `dir` from here. The track row and the stage stay unmirrored.
import { t } from '../../core/strings.js';
import { DIR } from '../../core/lang.js';

// `level` is the level words (null off the road), `full` the hover title's level words
export function levelLine({ level, zone, name, full }, dir = DIR) {
  const lv = level ? t('trk_head', { level, zone }) : '';
  return {
    dir: dir === 'rtl' ? 'rtl' : 'ltr',
    lv,
    nm: lv ? t('trk_then', { name }) : name,
    title: level ? t('trk_full', { level: full || level, zone, name }) : name,
  };
}
