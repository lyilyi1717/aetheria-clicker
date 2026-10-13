// Dig feature (page side): the Museum sets drawn as pictures the canvas can use (the dig background, the world map).
// The parts come from wing2/art.js. A part you lack is a pale outline-shape, a part you have is filled with the set's colour.
// No DOM work beyond a data-URL image; nothing here touches the state.
import { PARTS } from '../wing2/art.js';

// bold: stronger colours, for the small pictures on the map; plain: faint, for the dig background
export function museumSvg(set, got, col, w, bold = false) {
  const parts = (PARTS[set] || []).map((d, i) => `<g class="pt ${got(i) ? 'on' : 'off'}">${d}</g>`).join('');
  const off = bold ? 0.5 : 0.26, on = bold ? 1 : 0.7;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 128 78" width="${w}" height="${Math.round(w * 78 / 128)}">`
    + `<style>.pt *{fill:inherit;stroke:inherit}.off{fill:#f6efdc;stroke:#f6efdc;stroke-width:1;opacity:${off}}`
    + `.on{fill:${col};stroke:#fff6c8;stroke-width:1.2;opacity:${on}}.pt .hole{fill:#1b1410;stroke:none}`
    + `.pt .ln{fill:none;stroke:inherit;stroke-width:3;stroke-linecap:round}</style>${parts}</svg>`;
}

const IMGS = new Map();
// an Image for a set picture, made once per look; `redraw` is called when it has loaded
export function museumImage(set, mask, col, w, bold, redraw) {
  const key = `${set}|${mask}|${col}|${w}|${bold ? 1 : 0}`;
  let im = IMGS.get(key);
  if (!im) {
    im = new Image(); im.ready = false;
    im.onload = () => { im.ready = true; if (redraw) redraw(); };
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(museumSvg(set, i => mask[i] === '1', col, w, bold));
    IMGS.set(key, im);
  }
  return im;
}
// the found pieces of a set as a string of 0 and 1 (a cache key, and what museumImage reads)
export const maskOf = lv => lv.pieces.map(p => (p.have ? '1' : '0')).join('');
