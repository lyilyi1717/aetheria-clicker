// Dig look: the horizon of each continent, drawn on canvas (no images). One function per zone paints the far land into
// the sky canvas of a place: `makeZoneProps({ W, SKY, sun })` hands back { africa(g), eastasia(g), americas(g), europe(g),
// n_africa(g) ... (the same lands at night, chapter two), emptyquarter(g) }. Arabia is not here: it keeps the place's own horizon.
export function makeZoneProps({ W, SKY, sun }) {
  const acacia = (g, x, base, h, col) => {
    g.strokeStyle = '#3a2814'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, base); g.quadraticCurveTo(x + 3, base - h * 0.6, x - 2, base - h); g.stroke();
    g.fillStyle = col; g.beginPath(); g.ellipse(x - 2, base - h - 2, h * 0.75, h * 0.2, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(x - h * 0.3, base - h + 4, h * 0.4, h * 0.12, 0, 0, 7); g.fill();
  };
  const baobab = (g, x, base, h) => {
    g.fillStyle = '#6d4a2c'; g.beginPath(); g.moveTo(x - 15, base); g.quadraticCurveTo(x - 9, base - h * 0.6, x - 7, base - h); g.lineTo(x + 7, base - h); g.quadraticCurveTo(x + 9, base - h * 0.6, x + 15, base); g.closePath(); g.fill();
    g.strokeStyle = '#6d4a2c'; g.lineWidth = 3; g.lineCap = 'round';
    for (const a of [-0.9, -0.3, 0.3, 0.9]) { g.beginPath(); g.moveTo(x, base - h); g.lineTo(x + Math.sin(a) * 26, base - h - 12 - Math.cos(a) * 6); g.stroke(); }
    g.fillStyle = '#4f7a34';
    for (const a of [-0.9, -0.3, 0.3, 0.9]) { g.beginPath(); g.arc(x + Math.sin(a) * 26, base - h - 14 - Math.cos(a) * 6, 9, 0, 7); g.fill(); }
  };
  const pagoda = (g, x, base, w, tiers) => {
    for (let i = 0; i < tiers; i++) {
      const y = base - i * 17, ww = w * (1 - i * 0.2);
      g.fillStyle = '#7a2e2a'; g.fillRect(x - ww * 0.36, y - 12, ww * 0.72, 12);
      g.fillStyle = '#2e3a40'; g.beginPath(); g.moveTo(x - ww * 0.62, y - 10); g.quadraticCurveTo(x - ww * 0.3, y - 12, x, y - 24);
      g.quadraticCurveTo(x + ww * 0.3, y - 12, x + ww * 0.62, y - 10); g.quadraticCurveTo(x, y - 14, x - ww * 0.62, y - 10); g.fill();
    }
    g.strokeStyle = '#2e3a40'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, base - tiers * 17 - 6); g.lineTo(x, base - tiers * 17 - 18); g.stroke();
  };
  const bamboo = (g, x, base, h) => {
    g.lineCap = 'butt';
    for (let i = 0; i < 3; i++) {
      const bx = x + i * 7, hh = h - i * 9;
      g.strokeStyle = '#5b9a4a'; g.lineWidth = 4; g.beginPath(); g.moveTo(bx, base); g.lineTo(bx + i - 1, base - hh); g.stroke();
      g.strokeStyle = '#2f5e2a'; g.lineWidth = 1.5;
      for (let y = base - 10; y > base - hh; y -= 12) { g.beginPath(); g.moveTo(bx - 3, y); g.lineTo(bx + 3, y); g.stroke(); }
      g.fillStyle = '#6fb257';
      for (const d of [-1, 1]) { g.beginPath(); g.ellipse(bx + d * 8, base - hh + 5, 7, 2, d * 0.5, 0, 7); g.fill(); }
    }
  };
  const ridge = (g, col, base, amp, ph, sharp) => {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, SKY);
    for (let x = 0; x <= W; x += 16) g.lineTo(x, SKY - base - Math.abs(Math.sin(x / 61 + ph)) * amp * (sharp || 1) - Math.sin(x / 19 + ph) * 3);
    g.lineTo(W, SKY); g.closePath(); g.fill();
  };
  const mesa = (g, x, w, h, col, top) => {
    g.fillStyle = col; g.beginPath(); g.moveTo(x, SKY); g.lineTo(x + 6, SKY - h * 0.7); g.lineTo(x + 10, SKY - h); g.lineTo(x + w - 10, SKY - h); g.lineTo(x + w - 5, SKY - h * 0.65); g.lineTo(x + w, SKY); g.closePath(); g.fill();
    g.fillStyle = top; g.fillRect(x + 10, SKY - h, w - 20, 4);
    g.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 1; i < 4; i++) g.fillRect(x + 6 + i, SKY - h * (0.25 * i + 0.05), w - 12 - 2 * i, 2);
  };
  const stepPyramid = (g, x, base, w, tiers) => {
    for (let i = 0; i < tiers; i++) {
      const ww = w * (1 - i / (tiers + 0.6)), hh = 11;
      g.fillStyle = i % 2 ? '#a89874' : '#c2b085'; g.fillRect(x - ww / 2, base - (i + 1) * hh, ww, hh);
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x + ww / 2 - 5, base - (i + 1) * hh, 5, hh);
    }
    g.fillStyle = '#6d6048'; g.fillRect(x - 6, base - tiers * 11 - 9, 12, 9);
    g.fillStyle = '#2a2418'; g.beginPath(); g.moveTo(x - 4, base); g.lineTo(x - 4, base - 12); g.lineTo(x + 4, base - 12); g.lineTo(x + 4, base); g.fill();
  };
  const jungleTree = (g, x, base, h) => {
    g.fillStyle = '#4a3820'; g.fillRect(x - 2, base - h, 4, h);
    g.fillStyle = '#2f7a3c'; g.beginPath(); g.ellipse(x, base - h, 17, 10, 0, 0, 7); g.fill();
    g.fillStyle = '#3f9a4a'; g.beginPath(); g.ellipse(x - 5, base - h - 3, 10, 6, 0, 0, 7); g.fill();
  };
  const castle = (g, x, base) => {
    g.fillStyle = '#7d868f'; g.fillRect(x - 40, base - 36, 80, 36);
    g.fillStyle = '#6b747d'; g.fillRect(x - 15, base - 64, 30, 64);
    g.fillStyle = '#7d868f';
    for (const cx of [-40, -26, -12, 4, 20, 32]) g.fillRect(x + cx, base - 44, 8, 8);
    for (const cx of [-15, -5, 5]) g.fillRect(x + cx, base - 72, 9, 9);
    g.fillStyle = '#b4443a'; g.beginPath(); g.moveTo(x - 20, base - 62); g.lineTo(x, base - 94); g.lineTo(x + 20, base - 62); g.closePath(); g.fill();
    g.fillStyle = '#2a323a'; g.beginPath(); g.moveTo(x - 4, base); g.lineTo(x - 4, base - 12); g.arc(x, base - 12, 4, Math.PI, 0); g.lineTo(x + 4, base); g.fill();
    g.fillRect(x - 3, base - 52, 6, 10); g.fillRect(x - 30, base - 26, 4, 8); g.fillRect(x + 26, base - 26, 4, 8);
    g.strokeStyle = '#2a323a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, base - 94); g.lineTo(x, base - 106); g.stroke();
    g.fillStyle = '#d6b23a'; g.fillRect(x + 1, base - 106, 11, 6);
  };
  const windmill = (g, x, base) => {
    g.fillStyle = '#e8e0d0'; g.beginPath(); g.moveTo(x - 14, base); g.lineTo(x - 8, base - 46); g.lineTo(x + 8, base - 46); g.lineTo(x + 14, base); g.closePath(); g.fill();
    g.fillStyle = '#8a4a34'; g.beginPath(); g.moveTo(x - 11, base - 46); g.lineTo(x, base - 58); g.lineTo(x + 11, base - 46); g.closePath(); g.fill();
    g.fillStyle = '#5a3a28'; g.fillRect(x - 3, base - 14, 6, 14);
    g.strokeStyle = '#5a3a28'; g.lineWidth = 3; g.lineCap = 'round';
    for (let i = 0; i < 4; i++) { const a = 0.5 + i * Math.PI / 2; g.beginPath(); g.moveTo(x, base - 44); g.lineTo(x + Math.cos(a) * 30, base - 44 + Math.sin(a) * 30); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 4; i++) { const a = 0.5 + i * Math.PI / 2; g.save(); g.translate(x, base - 44); g.rotate(a); g.fillRect(8, -5, 20, 5); g.restore(); }
  };
  const cloud = (g, x, y, s, col) => {
    g.fillStyle = col;
    for (const [dx, dy, r] of [[0, 0, 11], [12, -4, 13], [26, 0, 10], [12, 4, 11]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, 7); g.fill(); }
  };
  // chapter two: a land at night is its day props under a dark veil, then stars and a moon over them
  const night = paint => g => {
    paint(g);
    g.fillStyle = 'rgba(12,16,44,0.5)'; g.fillRect(0, 0, W, SKY);
    let k = 7; const r = () => (k = (k * 1664525 + 1013904223) >>> 0) / 4294967296;
    g.fillStyle = '#fff';
    for (let i = 0; i < 40; i++) { g.globalAlpha = 0.35 + r() * 0.65; g.fillRect(r() * W, r() * (SKY * 0.55), 1.6, 1.6); }
    g.globalAlpha = 1;
    sun(g, W * 0.78, 30, 13, '#f4f0dc', 'rgba(230,230,255,0.22)');
    g.fillStyle = 'rgba(12,16,44,0.85)'; g.beginPath(); g.arc(W * 0.78 + 6, 27, 11, 0, 7); g.fill();     // a crescent
  };
  // the Empty Quarter: high red dunes in rows under a low sun, and a far line of camels
  const dunes = (g, col, base, amp, ph, len) => {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, SKY);
    for (let x = 0; x <= W; x += 12) g.lineTo(x, SKY - base - Math.pow(Math.abs(Math.sin(x / len + ph)), 1.6) * amp);
    g.lineTo(W, SKY); g.closePath(); g.fill();
  };
  const camel = (g, x, y, k) => {
    g.fillStyle = '#4a1e10';
    g.beginPath(); g.ellipse(x, y, 9 * k, 4 * k, 0, 0, 7); g.fill();                       // body
    g.beginPath(); g.ellipse(x - 1 * k, y - 4 * k, 4 * k, 3 * k, 0, 0, 7); g.fill();       // hump
    g.fillRect(x + 7 * k, y - 8 * k, 2 * k, 7 * k); g.fillRect(x + 7 * k, y - 9 * k, 5 * k, 2 * k);   // neck, head
    for (const dx of [-6, -3, 3, 6]) g.fillRect(x + dx * k, y + 2 * k, 1.2 * k, 7 * k);    // legs
  };
  const props = {
    africa(g) {   // a low orange sun, far hills, a baobab and flat-topped acacias
      sun(g, W - 150, SKY - 26, 32, '#ffd27a', 'rgba(255,170,70,0.3)');
      ridge(g, '#b9763c', 22, 14, 1.3);
      ridge(g, '#a2622f', 10, 10, 3.1);
      g.fillStyle = '#c98a4a'; g.fillRect(0, SKY - 7, W, 7);
      baobab(g, 120, SKY - 6, 50); acacia(g, 330, SKY - 6, 34, '#5b7a34'); acacia(g, 372, SKY - 6, 26, '#6a8a3a'); acacia(g, 520, SKY - 6, 38, '#5b7a34');
      g.fillStyle = '#2a1a0c';
      for (let i = 0; i < 3; i++) g.fillRect(450 + i * 11, SKY - 14 - (i % 2) * 2, 5, 10);   // a herd, far off
    },
    eastasia(g) {   // layered misty mountains, a pagoda, bamboo
      sun(g, 150, 38, 20, '#fff8e8', 'rgba(255,248,232,0.4)');
      ridge(g, '#c3d2d2', 46, 30, 0.4, 1.3);
      ridge(g, '#a2b8b6', 30, 24, 2.0, 1.2);
      g.fillStyle = 'rgba(245,245,238,0.65)'; g.fillRect(0, SKY - 58, W, 12);
      ridge(g, '#7f9c98', 20, 22, 4.4);
      g.save(); g.translate(400, SKY - 10); g.scale(0.8, 0.8); pagoda(g, 0, 0, 56, 3); g.restore();
      g.fillStyle = 'rgba(245,245,238,0.55)'; g.fillRect(0, SKY - 30, W, 10);
      ridge(g, '#5f7f70', 6, 8, 0.9);
      bamboo(g, 70, SKY - 4, 60); bamboo(g, 560, SKY - 4, 54);
    },
    americas(g) {   // red canyon mesas on one side, the green jungle and a step pyramid on the other
      sun(g, 110, 34, 22, '#fff1c8', 'rgba(255,230,170,0.3)');
      mesa(g, 20, 110, 76, '#a8472e', '#d0694a'); mesa(g, 120, 70, 50, '#b8553a', '#d9775a');
      ridge(g, '#4f7a46', 16, 10, 2.2);
      stepPyramid(g, 400, SKY - 10, 120, 5);
      ridge(g, '#2f6a3a', 8, 8, 5);
      jungleTree(g, 270, SKY - 4, 40); jungleTree(g, 520, SKY - 4, 46); jungleTree(g, 580, SKY - 4, 34); jungleTree(g, 600, SKY - 4, 50);
    },
    europe(g) {   // a grey-blue sky with clouds, green hills, a castle tower and a windmill
      cloud(g, 80, 26, 1, 'rgba(255,255,255,0.7)'); cloud(g, 300, 44, 0.8, 'rgba(255,255,255,0.55)'); cloud(g, 520, 22, 1.1, 'rgba(255,255,255,0.65)');
      ridge(g, '#7fa57a', 26, 16, 0.8);
      g.save(); g.translate(190, SKY - 14); g.scale(0.72, 0.72); castle(g, 0, 0); g.restore();
      ridge(g, '#5f9458', 10, 14, 3.4);
      windmill(g, 480, SKY - 12);
      g.fillStyle = '#4f8a4a'; g.fillRect(0, SKY - 5, W, 5);
    },
    emptyquarter(g) {   // the home land of the caravan: red sand, high dunes, a low sun, camels far off
      sun(g, W * 0.3, SKY - 40, 30, '#ffd88a', 'rgba(255,150,70,0.3)');
      dunes(g, '#d9733a', 50, 40, 0.3, 110);
      dunes(g, '#c85a2a', 30, 34, 1.9, 80);
      for (let i = 0; i < 5; i++) camel(g, 380 + i * 26, SKY - 34 - (i % 2), 0.9);
      dunes(g, '#b4471f', 12, 22, 3.3, 60);
      g.fillStyle = '#a63e1a'; g.fillRect(0, SKY - 5, W, 5);
    },
  };
  for (const z of ['africa', 'eastasia', 'americas', 'europe']) props['n_' + z] = night(props[z]);
  return props;
}
