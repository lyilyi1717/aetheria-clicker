// Dig feature (wardrobe): the drawings of every look. DRAWING ONLY: functions of a 2d context, no rules, no DOM at load time
// (so a test can import this file and check that every item has a drawing).
// Heads are drawn with the origin in the middle of the hat's bottom edge (it rests on the top of the head), y up is negative.
// Bodies are drawn in the Rafeeq's bean (the origin is the same as the old blob). Patterns are two colours and at least 3 px wide.
export const INK = '#1b1410';
const TAU = Math.PI * 2;

// ---------- colours: the cloth (c) and a name ----------
export const COLOUR = {
  blue: '#2f6fe4', sand: '#d9b873', green: '#3fa35c', red: '#d4443b', white: '#f1ede0', teal: '#22a8a0', purple: '#8a55c9', orange: '#ee8a2a',
  gold: '#e8b923', night: '#2b2b3b',
};
// a second colour that shows on the cloth: dark on a light cloth, light on a dark one
export function contrast(hex) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const mix = (v, to, k) => Math.round(v + (to - v) * k);
  const k = lum > 0.55 ? 0 : 255, a = lum > 0.55 ? 0.5 : 0.62;
  return '#' + [r, g, b].map(v => mix(v, k, a).toString(16).padStart(2, '0')).join('');
}

// ---------- the bean ----------
const bean = x => { x.beginPath(); x.moveTo(0, -4); x.bezierCurveTo(8, -4, 12.5, 3, 12.5, 10); x.bezierCurveTo(12.5, 16.5, 7, 20.5, 0, 20.5); x.bezierCurveTo(-7, 20.5, -12.5, 16.5, -12.5, 10); x.bezierCurveTo(-12.5, 3, -8, -4, 0, -4); x.closePath(); };

// ---------- patterns: drawn inside a clip over the cloth, in colour pc ----------
export const PATTERN = {
  plain() {},
  stripes(x, pc) { x.fillStyle = pc; for (let y = -3; y < 22; y += 7) x.fillRect(-14, y, 28, 3.4); },
  check(x, pc) { x.fillStyle = pc; for (let i = -3; i < 4; i++) for (let j = -2; j < 6; j++) if ((i + j) & 1) x.fillRect(i * 4.6, j * 4.6, 4.6, 4.6); },
  dots(x, pc) { x.fillStyle = pc; for (let j = 0; j < 4; j++) for (let i = -2; i < 3; i++) { x.beginPath(); x.arc(i * 8 + (j & 1 ? 4 : 0), -1 + j * 7, 2.5, 0, TAU); x.fill(); } },
  zigzag(x, pc) {
    x.strokeStyle = pc; x.lineWidth = 2.4; x.lineJoin = 'miter';
    for (let y = 0; y < 22; y += 6.5) { x.beginPath(); for (let i = -4; i <= 4; i++) x.lineTo(i * 3.6, y + (i & 1 ? 2.6 : -2.6)); x.stroke(); }
  },
  stars(x, pc) {
    x.fillStyle = pc;
    for (let j = 0; j < 4; j++) for (let i = -2; i < 3; i++) {
      const cx = i * 8.5 + (j & 1 ? 4.2 : 0), cy = j * 7.4 + 0.5;
      x.beginPath(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - Math.PI / 2, r = k & 1 ? 1.4 : 3.2; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); x.fill();
    }
  },
};

// ---------- bodies ----------
// o = { c: cloth colour, pc: pattern colour, pat: pattern id }
function paint(x, o, region) {
  x.save(); bean(x); x.clip();
  if (region) { region(x); x.clip(); }
  x.fillStyle = o.c; x.fillRect(-16, -6, 32, 32);
  (PATTERN[o.pat] || PATTERN.plain)(x, o.pc);
  x.restore();
}
const rectR = (...r) => x => { x.beginPath(); x.rect(...r); };
function shade(x) {
  x.save(); bean(x); x.clip();
  x.fillStyle = 'rgba(255,255,255,0.2)'; x.beginPath(); x.ellipse(-6, 4.5, 3, 5.6, 0.35, 0, TAU); x.fill();
  x.fillStyle = 'rgba(10,20,60,0.22)'; x.beginPath(); x.ellipse(5, 17, 10, 6, 0, 0, TAU); x.fill();
  x.restore();
}
function outline(x) { bean(x); x.lineWidth = 2; x.strokeStyle = INK; x.stroke(); }
const dot = (x, px, py, r, col) => { x.fillStyle = col; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill(); };
const line = (x, x0, y0, x1, y1, col, w) => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); };
const inBean = (x, fn) => { x.save(); bean(x); x.clip(); fn(x); x.restore(); };

export const BODY = {
  shirt(x, o) {            // a plain work shirt: white collar, two buttons
    paint(x, o); shade(x);
    inBean(x, g => { g.fillStyle = '#fff'; g.strokeStyle = INK; g.lineWidth = 1.2; for (const sg of [-1, 1]) { g.beginPath(); g.moveTo(0, -4); g.lineTo(sg * 6, -4); g.lineTo(sg * 2.2, 2.2); g.closePath(); g.fill(); g.stroke(); } dot(g, 0, 7, 1, INK); dot(g, 0, 12, 1, INK); });
    outline(x);
  },
  thobe(x, o) {            // the long white robe: a line down the front, a light band at the hem, a round neck
    paint(x, o); shade(x);
    inBean(x, g => { line(g, 0, 0, 0, 21, 'rgba(0,0,0,0.38)', 1.4); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(-14, 16.4, 28, 6); line(g, -14, 16.4, 14, 16.4, 'rgba(0,0,0,0.4)', 1); g.fillStyle = '#6a4a2a'; g.beginPath(); g.ellipse(0, -3.6, 3.2, 1.7, 0, 0, TAU); g.fill(); dot(g, 0, 1.2, 0.9, INK); });
    outline(x);
  },
  vest(x, o) {             // a coloured vest over a cream shirt: the middle shows cream
    paint(x, { ...o, c: '#f0e4c4', pat: 'plain' });
    paint(x, o, x2 => { x2.beginPath(); x2.moveTo(-16, -6); x2.lineTo(-3.4, -6); x2.lineTo(-2.4, 22); x2.lineTo(-16, 22); x2.closePath(); x2.moveTo(16, -6); x2.lineTo(3.4, -6); x2.lineTo(2.4, 22); x2.lineTo(16, 22); x2.closePath(); });
    shade(x);
    inBean(x, g => { for (const sg of [-1, 1]) line(g, sg * 3.4, -5, sg * 2.4, 21, 'rgba(0,0,0,0.5)', 1.3); dot(g, 6.2, 6, 1, INK); dot(g, 6.0, 12, 1, INK); dot(g, -6.2, 6, 1, INK); dot(g, -6.0, 12, 1, INK); });
    outline(x);
  },
  bisht(x, o) {            // the grand robe: gold edge all round and down the front
    paint(x, o); shade(x);
    inBean(x, g => { bean(g); g.lineWidth = 6; g.strokeStyle = '#e8b923'; g.stroke(); bean(g); g.lineWidth = 1.2; g.strokeStyle = '#8a6200'; g.stroke(); line(g, 0, -3, 0, 21, '#e8b923', 2.4); g.fillStyle = '#e8b923'; g.beginPath(); g.moveTo(-4, -4); g.lineTo(4, -4); g.lineTo(0, 3); g.closePath(); g.fill(); g.strokeStyle = '#8a6200'; g.lineWidth = 1; g.stroke(); });
    outline(x);
  },
  diver(x, o) {            // a diving suit: yellow collar ring, belt, chest dial, bright stripes
    paint(x, o); shade(x);
    inBean(x, g => {
      g.fillStyle = '#2b2f3a'; g.fillRect(-14, 11.5, 28, 3.4); g.fillStyle = '#ffd23f'; g.fillRect(-2, 11.2, 4, 4);
      line(g, -8, -3, -8.6, 20, '#ffe14a', 2); line(g, 8, -3, 8.6, 20, '#ffe14a', 2);
      dot(g, 0, 4, 3.8, INK); dot(g, 0, 4, 2.7, '#c9ced6'); line(g, 0, 4, 1.6, 2.6, INK, 1);
      g.strokeStyle = '#ffd23f'; g.lineWidth = 2.6; g.beginPath(); g.ellipse(0, -3.2, 7, 2.3, 0, 0, Math.PI); g.stroke();
    });
    outline(x);
  },
  overalls(x, o) {         // work overalls over a cream shirt: bib with a pocket, straps
    paint(x, { ...o, c: '#efe6cf', pat: 'plain' });
    paint(x, o, x2 => { x2.beginPath(); x2.rect(-16, 10, 32, 14); x2.rect(-6.4, 2.4, 12.8, 8.2); x2.moveTo(-6.4, 3); x2.lineTo(-3.8, 3); x2.lineTo(-6, -4); x2.lineTo(-8.8, -4); x2.closePath(); x2.moveTo(6.4, 3); x2.lineTo(3.8, 3); x2.lineTo(6, -4); x2.lineTo(8.8, -4); x2.closePath(); });
    shade(x);
    inBean(x, g => { g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.1; g.strokeRect(-3, 4.6, 6, 3.6); line(g, 0, 11, 0, 21, 'rgba(0,0,0,0.45)', 1.2); dot(g, -6.6, 3, 1.2, '#ffd23f'); dot(g, 6.6, 3, 1.2, '#ffd23f'); line(g, -6.4, 10.4, 6.4, 10.4, 'rgba(0,0,0,0.5)', 1.1); });
    outline(x);
  },
};

// ---------- heads: the origin is the middle of the bottom edge of the hat ----------
function fill(x, col, w = 2) { x.fillStyle = col; x.fill(); x.lineWidth = w; x.strokeStyle = INK; x.lineJoin = 'round'; x.stroke(); }
const domeP = (x, r, h, y0 = 0) => { x.beginPath(); x.moveTo(-r, y0); x.bezierCurveTo(-r, y0 - h * 1.3, r, y0 - h * 1.3, r, y0); x.closePath(); };
function fezShape(x, burnt, gold) {
  x.beginPath(); x.moveTo(-7.8, 0); x.lineTo(7.8, 0); x.lineTo(6.2, -9); x.lineTo(-6.2, -9); x.closePath();
  x.fillStyle = gold ? (burnt ? '#9a7a20' : '#e8b923') : burnt ? '#7a2a26' : '#d8262c'; x.fill();
  x.save(); x.clip(); x.fillStyle = gold ? '#fff0a0' : burnt ? '#8d3a33' : '#f0555a'; x.fillRect(-8, -9, 4, 10);
  x.fillStyle = 'rgba(80,0,0,0.25)'; x.fillRect(-8, -2.6, 16, 3); x.restore();
  if (burnt) { x.fillStyle = '#231815'; x.beginPath(); x.ellipse(-1, -9, 5, 2.6, 0, 0, TAU); x.ellipse(3, -3, 2.4, 1.8, 0, 0, TAU); x.fill(); }
  x.lineWidth = 2; x.strokeStyle = INK; x.beginPath(); x.moveTo(-7.8, 0); x.lineTo(7.8, 0); x.lineTo(6.2, -9); x.lineTo(-6.2, -9); x.closePath(); x.stroke();
  x.fillStyle = gold ? '#fff6c0' : burnt ? '#6a3a30' : '#ff7a74'; x.beginPath(); x.ellipse(0, -9, 6.2, 1.5, 0, 0, TAU); x.fill(); x.lineWidth = 1.4; x.stroke();
}

export const HEAD = {
  fez: (x, burnt) => fezShape(x, burnt, false),
  goldfez: (x, burnt) => fezShape(x, burnt, true),
  ghutra(x) {              // white head cloth with the two black rings
    x.beginPath(); x.moveTo(-10.4, 5); x.bezierCurveTo(-13, -9, -6, -13, 0, -12.4); x.bezierCurveTo(6, -13, 13, -9, 10.4, 5);
    x.quadraticCurveTo(7.5, 6, 6, 2); x.quadraticCurveTo(0, -3.4, -6, 2); x.quadraticCurveTo(-7.5, 6, -10.4, 5); x.closePath(); fill(x, '#fbfaf4');
    x.strokeStyle = 'rgba(120,110,90,0.55)'; x.lineWidth = 1; x.beginPath(); x.moveTo(-8.4, 3); x.quadraticCurveTo(-10, -4, -6, -9); x.moveTo(8.4, 3); x.quadraticCurveTo(10, -4, 6, -9); x.stroke();
    x.strokeStyle = INK; x.lineWidth = 2.8; x.beginPath(); x.ellipse(0, -4.6, 8.4, 3.2, 0, Math.PI * 1.04, Math.PI * 1.96, true); x.stroke();
    x.beginPath(); x.ellipse(0, -4.6, 8.4, 3.2, 0, 0.1, Math.PI - 0.1); x.stroke();
  },
  hard(x) {                // a yellow hard hat with a lamp
    x.beginPath(); x.moveTo(-9.6, 0); x.bezierCurveTo(-10, -13, 10, -13, 9.6, 0); x.closePath(); fill(x, '#f6c21a');
    x.fillStyle = '#d99a0c'; x.fillRect(-1.8, -10.6, 3.6, 8); x.strokeStyle = INK; x.lineWidth = 1; x.strokeRect(-1.8, -10.6, 3.6, 8);
    x.beginPath(); x.roundRect(-12.4, -2, 24.8, 3.6, 1.6); fill(x, '#f6c21a');
    dot(x, 0, -5.4, 2.6, '#fffbd0'); x.lineWidth = 1.4; x.strokeStyle = INK; x.beginPath(); x.arc(0, -5.4, 2.6, 0, TAU); x.stroke();
  },
  bare(x) {                // no hat: a few tufts of hair
    x.beginPath(); x.moveTo(-6.4, 1); x.lineTo(-6, -4.4); x.lineTo(-3.4, -1.6); x.lineTo(-2.4, -7); x.lineTo(0.4, -2.4); x.lineTo(2.8, -6.6); x.lineTo(3.8, -1.4); x.lineTo(6.4, -4); x.lineTo(6.4, 1); x.closePath(); fill(x, '#3a2418', 1.6);
  },
  cap(x) {                 // the red cap with a white band
    x.beginPath(); x.moveTo(-9.5, 0); x.bezierCurveTo(-10, -13, 10, -13, 9.5, 0); x.closePath(); fill(x, '#d7332b');
    x.save(); x.clip(); x.fillStyle = '#fff'; x.fillRect(-12, -5.6, 24, 3.2); x.restore();
    x.beginPath(); x.roundRect(-14, -1.6, 28, 3.8, 1.8); fill(x, '#d7332b');
  },
  crown(x) {               // a gold crown with a red jewel
    x.beginPath(); x.moveTo(-9, 1); x.lineTo(-10, -11); x.lineTo(-4.6, -5.4); x.lineTo(0, -13.4); x.lineTo(4.6, -5.4); x.lineTo(10, -11); x.lineTo(9, 1); x.closePath(); fill(x, '#ffd23f');
    dot(x, 0, -3, 2.1, '#e5533d'); x.lineWidth = 1; x.strokeStyle = INK; x.beginPath(); x.arc(0, -3, 2.1, 0, TAU); x.stroke();
  },
  cosy(x) {                // Grandma's tea cosy: pink stripes and a pompom
    domeP(x, 10.4, 10.4); fill(x, '#f08aa8');
    x.save(); x.clip(); x.fillStyle = '#fff4f6'; for (const px of [-6, -1.6, 2.8, 7.2]) x.fillRect(px, -14, 1.9, 16); x.restore();
    x.beginPath(); for (let i = 0; i < 5; i++) { x.arc(-8.4 + i * 4.2, 1.2, 2.1, Math.PI, 0, true); } x.lineWidth = 2; x.strokeStyle = INK; x.stroke();
    dot(x, 0, -12.4, 3.2, '#fff'); x.lineWidth = 1.6; x.strokeStyle = INK; x.beginPath(); x.arc(0, -12.4, 3.2, 0, TAU); x.stroke();
  },
  pilot(x) {               // a leather flying cap with ear flaps
    domeP(x, 9.8, 10); fill(x, '#8a5a2b');
    for (const sg of [-1, 1]) { x.beginPath(); x.roundRect(sg * 9.4 - 2.8, -1.4, 5.6, 8.4, 2.6); fill(x, '#7a4d22', 1.6); }
    x.fillStyle = '#e8dcc0'; x.fillRect(-9.4, -2.6, 18.8, 3); x.lineWidth = 1.2; x.strokeStyle = INK; x.strokeRect(-9.4, -2.6, 18.8, 3);
    line(x, 0, -10, 0, -3, 'rgba(0,0,0,0.4)', 1.2); dot(x, 0, -2.4, 1.2, '#ffd23f');
  },
  pearlband(x) {           // a headband with a big pearl
    x.beginPath(); x.moveTo(-9.8, 3.2); x.quadraticCurveTo(0, -11, 9.8, 3.2); x.lineWidth = 6; x.lineCap = 'round'; x.strokeStyle = INK; x.stroke(); x.lineWidth = 3.4; x.strokeStyle = '#7bd3e6'; x.stroke();
    dot(x, 0, -3.2, 4, '#fbf6ee'); x.lineWidth = 1.6; x.strokeStyle = INK; x.beginPath(); x.arc(0, -3.2, 4, 0, TAU); x.stroke(); dot(x, -1.3, -4.5, 1.2, '#fff');
  },
  straw(x) {               // a straw hat with a red band
    x.beginPath(); x.ellipse(0, 0, 14.4, 3.6, 0, 0, TAU); fill(x, '#e5c06a');
    x.beginPath(); x.moveTo(-8.6, 0); x.bezierCurveTo(-9, -13, 9, -13, 8.6, 0); x.closePath(); fill(x, '#ecc974');
    x.save(); x.clip(); x.fillStyle = '#c0392b'; x.fillRect(-10, -4.6, 20, 3.6); x.restore();
    x.strokeStyle = 'rgba(120,80,20,0.5)'; x.lineWidth = 1; for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(i * 4, -6.4); x.lineTo(i * 5, -11); x.stroke(); }
  },
  rice(x) {                // a pointed rice-field hat
    x.beginPath(); x.moveTo(-15, 2); x.quadraticCurveTo(0, -3, 15, 2); x.lineTo(0, -15); x.closePath(); fill(x, '#efd48a');
    x.strokeStyle = 'rgba(140,100,30,0.6)'; x.lineWidth = 1.1; for (const px of [-8, -3.6, 3.6, 8]) { x.beginPath(); x.moveTo(0, -14.6); x.lineTo(px * 1.5, 0.4); x.stroke(); }
    x.beginPath(); x.moveTo(-15, 2); x.quadraticCurveTo(0, -3, 15, 2); x.lineWidth = 2; x.strokeStyle = INK; x.stroke();
  },
  wide(x) {                // a big brown hat with a gold band
    x.beginPath(); x.ellipse(0, 0.6, 18.6, 4.4, 0, 0, TAU); fill(x, '#8a5a2b');
    x.beginPath(); x.moveTo(-7.4, 0); x.bezierCurveTo(-7.4, -14, 7.4, -14, 7.4, 0); x.closePath(); fill(x, '#a3622c');
    x.save(); x.clip(); x.fillStyle = '#ffd23f'; x.fillRect(-9, -3.8, 18, 3.2); x.restore();
  },
  flat(x) {                // a grey flat cap with a button
    x.beginPath(); x.moveTo(-11, 1); x.quadraticCurveTo(-12, -6, -3, -7.4); x.quadraticCurveTo(6, -9, 11, -3.4); x.lineTo(13.6, 1); x.closePath(); fill(x, '#7a8896');
    x.strokeStyle = 'rgba(0,0,0,0.3)'; x.lineWidth = 1; x.beginPath(); x.moveTo(-6, -6.6); x.lineTo(-2, 0.6); x.moveTo(1, -7.6); x.lineTo(4, 0.6); x.stroke();
    dot(x, -2.4, -7.2, 1.4, '#4b5662');
  },
};

// the single table the rules and the page both read: every id with a drawing
export const DRAW = { head: HEAD, body: BODY, pattern: PATTERN };
