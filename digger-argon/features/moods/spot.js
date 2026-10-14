// Dig: where a Rafeeq's speech bubble goes on the dig (pure, no DOM, so a node test can check it). Used by ui.js.
export const BUBBLES_AT_ONCE = 2;   // more than two lines at once is noise; a third waits for room (art-and-sound decision 6)
// where a bubble of width w goes: over the Rafeeq, else a step up (up to 3), else a step down; null when no spot is free.
// `taken` is the list of bubbles already placed this frame ({ x, y, w }). Pure, so a test can check it.
export function bubbleSpot(taken, x, y, w, h = 24, Wd = 640, Hd = 680) {
  const bx = Math.max(w / 2 + 2, Math.min(Wd - w / 2 - 2, x)), by0 = Math.max(h / 2 + 2, y);
  if (taken.length >= BUBBLES_AT_ONCE) return null;
  const free = by => !taken.some(b => Math.abs(b.x - bx) < (b.w + w) / 2 + 4 && Math.abs(b.y - by) < h + 4);
  const tries = [by0];
  for (let k = 1; k <= 3; k++) tries.push(by0 - k * (h + 5));
  for (let k = 1; k <= 3; k++) tries.push(by0 + k * (h + 5));
  for (const by of tries) if (by >= h / 2 + 2 && by <= Hd - h / 2 - 2 && free(by)) return { x: bx, y: by };
  return null;
}
