// Dig: how much room a lesson needs in the top line (docs/art-and-sound.md decision 14). Pure, no DOM.
// While a lesson shows it takes the whole line after T1 (the message line, Tips and the goal); T1's level line stops
// growing, so the room is the stage less T1's second line. These numbers are the budget that room is checked against.
export const LESSON = {
  font: 13,          // px, bold: the 13 px floor
  lineHeight: 1.15,
  lines: 3,          // 3 x 13 x 1.15 = 45 px: inside the 40 px line plus the 6 px under it, never over the stage
  room: 270,         // px of text at a 1366 x 768 laptop: 518 stage - 216 (T1 second line) - 8 gap - 11 edge, less a margin for Arabic
};

// Widths at 13 px bold, a little wide on purpose (Segoe UI Bold for English, Cairo Bold for Arabic), so a lesson that
// passes here fits on screen. Arabic vowel marks take no room.
const MARK = /[ً-ٰٟ]/;
const AR = /[؀-ۿ]/;
function charW(c) {
  if (c === ' ') return 3.8;
  if (MARK.test(c)) return 0;
  if (AR.test(c)) return 8;
  if (/[.,!:;'’«»()]/.test(c)) return 4;
  if (/[A-Z0-9%]/.test(c)) return 8.8;
  return 7.4;
}
export function textWidth(s) { let w = 0; for (const c of s) w += charW(c); return w; }

// how many lines the text takes in `width` px, wrapped word by word as the browser does
export function lineCount(text, width) {
  const words = String(text).split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const sp = charW(' ');
  let lines = 1, cur = 0;
  for (const w of words) {
    const ww = textWidth(w);
    if (cur === 0) cur = ww;
    else if (cur + sp + ww <= width) cur += sp + ww;
    else { lines++; cur = ww; }
    while (cur > width) { lines++; cur -= width; }   // a word wider than the line breaks inside itself
  }
  return lines;
}

export const fitsLesson = (text, width = LESSON.room) => lineCount(text, width) <= LESSON.lines;
