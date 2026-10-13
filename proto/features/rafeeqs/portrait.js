// Dig feature (page side, no ui() call): a Rafeeq drawn big in his own clothes, and the "Rafeeq of the level" block.
// The sprite is drawn by the diggers' art (it asks the wardrobe for the clothes when that feature is merged).
import * as G from '../../game.js';
import { drawRafeeq } from '../diggers/art.js';

const { t, fmt } = G;

// a canvas with seat i drawn on it; it keeps drawing (he breathes, blinks) until it leaves the page
export function portrait(s, i, w = 96, h = 128) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h; cv.className = 'rq-portrait';
  const g = cv.getContext('2d');
  const d = { c: 0, r: 0, tr: -1, tc: -1, cd: 0, swing: 0 };        // his own body, so the live one is left alone
  let last = performance.now();
  const born = last;
  const frame = now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    g.clearRect(0, 0, w, h);
    g.save(); g.translate(w / 2, h / 2 + 8); g.scale(2.6 * w / 96, 2.6 * w / 96);
    try { drawRafeeq(g, s, d, i, 0, dt); } catch (e) { /* a missing pose must not break a card */ }
    g.restore();
    if (cv.isConnected || now - born < 400) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return cv;
}

export const kindName = k => t(G.hasString('blk_' + k) ? 'blk_' + k : 'blk_other');

// fills `box` with the Rafeeq who brought the most coins this level; hides it when nobody brought any
export function ofLevel(box, s) {
  const i = G.rafeeqBest(s);
  box.hidden = i < 0;
  box.textContent = '';
  if (i < 0) return;
  const st = G.rafeeqStats(s, i);
  const txt = document.createElement('div');
  txt.className = 'rq-of-t';
  const h = document.createElement('b'); h.textContent = t('rq_of_level');
  const l = document.createElement('span'); l.textContent = t('rq_of_level_line', { name: G.rafeeqName(s, i), n: fmt(st.level.coins) });
  const q = document.createElement('i'); q.textContent = t('rq_line_' + G.rafeeqTrait(s, i));
  txt.append(h, l, q);
  box.append(portrait(s, i, 64, 86), txt);
}
