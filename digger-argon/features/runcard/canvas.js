// Dig feature "runcard": Headless 600x600 High-Contrast Canvas Card Generator
// Renders the Daily Dig summary card with obsidian dark desert background, golden Arabesque border,
// 4x4 descent glyph matrix, performance badges, and Hakawati proverb quote.

export const CARD_WIDTH = 600;
export const CARD_HEIGHT = 600;

export const THEME = {
  bgStart: '#12100e',
  bgEnd: '#1e1812',
  goldOuter: '#d4af37',
  goldInner: '#ffd700',
  goldHighlight: '#fff1a8',
  textMuted: '#b9a58c',
  textLight: '#f4ead8',
  textIvory: '#ffffff',
  tileBg: 'rgba(255, 215, 0, 0.06)',
  tileBorder: 'rgba(212, 175, 55, 0.35)',
  statBoxBg: 'rgba(30, 24, 18, 0.85)',
  statBoxBorder: 'rgba(212, 175, 55, 0.4)',
};

/**
 * Draws Arabesque geometric corner flourishes at (x, y).
 */
function drawCornerFlourish(ctx, x, y, size, dirX, dirY) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dirX, dirY);

  ctx.strokeStyle = THEME.goldInner;
  ctx.lineWidth = 2;
  ctx.beginPath();
  // Corner L-bracket
  ctx.moveTo(0, size);
  ctx.lineTo(0, 0);
  ctx.lineTo(size, 0);
  ctx.stroke();

  // Decorative inner diagonal and diamond
  ctx.beginPath();
  ctx.moveTo(size * 0.4, 0);
  ctx.lineTo(0, size * 0.4);
  ctx.moveTo(size * 0.7, 0);
  ctx.lineTo(0, size * 0.7);
  ctx.stroke();

  // Tiny corner diamond
  const d = size * 0.22;
  ctx.fillStyle = THEME.goldInner;
  ctx.beginPath();
  ctx.moveTo(d, 0);
  ctx.lineTo(0, d);
  ctx.lineTo(-d, 0);
  ctx.lineTo(0, -d);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Renders the 600x600 Daily Dig Run Card onto any 2D canvas context.
 */
export function drawRunCard(ctx, summary) {
  const W = CARD_WIDTH;
  const H = CARD_HEIGHT;

  // 1. Background Obsidian Gradient
  const grad = ctx.createLinearGradient ? ctx.createLinearGradient(0, 0, W, H) : null;
  if (grad) {
    grad.addColorStop(0, THEME.bgStart);
    grad.addColorStop(1, THEME.bgEnd);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = THEME.bgStart;
  }
  ctx.fillRect(0, 0, W, H);

  // 2. Dual Golden Frame Border
  const padOuter = 16;
  const padInner = 22;

  ctx.strokeStyle = THEME.goldOuter;
  ctx.lineWidth = 3;
  ctx.strokeRect(padOuter, padOuter, W - padOuter * 2, H - padOuter * 2);

  ctx.strokeStyle = THEME.goldInner;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(padInner, padInner, W - padInner * 2, H - padInner * 2);

  // Four Arabic corner flourishes
  const flSize = 24;
  drawCornerFlourish(ctx, padOuter + 2, padOuter + 2, flSize, 1, 1);
  drawCornerFlourish(ctx, W - padOuter - 2, padOuter + 2, flSize, -1, 1);
  drawCornerFlourish(ctx, padOuter + 2, H - padOuter - 2, flSize, 1, -1);
  drawCornerFlourish(ctx, W - padOuter - 2, H - padOuter - 2, flSize, -1, -1);

  // 3. Header: "AETHERIA: THE DAILY DIG #N"
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Title
  ctx.fillStyle = THEME.goldHighlight;
  ctx.font = 'bold 22px system-ui, Cairo, sans-serif';
  const dayNum = summary.dayNumber || 1;
  ctx.fillText(`AETHERIA: THE DAILY DIG #${dayNum}`, W / 2, 54);

  // Date and Depth Subtitle
  ctx.fillStyle = THEME.textMuted;
  ctx.font = '14px system-ui, Cairo, sans-serif';
  const dateStr = summary.date || new Date().toISOString().slice(0, 10);
  ctx.fillText(`${dateStr} • EXPEDITION RECORD`, W / 2, 78);

  // Depth & Medal Badge Banner
  const depth = summary.depthReached || 0;
  const rank = summary.rank || 'Gold';
  const medalIcons = { Master: '💎', Gold: '🥇', Silver: '🥈', Bronze: '🥉' };
  const medalIcon = medalIcons[rank] || '🏅';

  // Luminous Depth Callout
  ctx.fillStyle = THEME.goldInner;
  ctx.font = 'bold 36px system-ui, Cairo, sans-serif';
  ctx.fillText(`${depth}m REACHED`, W / 2, 118);

  // Medal Badge Tag
  ctx.fillStyle = THEME.statBoxBg;
  ctx.strokeStyle = THEME.statBoxBorder;
  ctx.lineWidth = 1.5;
  const badgeW = 160;
  const badgeH = 28;
  const badgeX = (W - badgeW) / 2;
  const badgeY = 142;
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
    ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
  }

  ctx.fillStyle = THEME.textLight;
  ctx.font = 'bold 14px system-ui, Cairo, sans-serif';
  ctx.fillText(`${medalIcon} ${rank.toUpperCase()} RANK`, W / 2, badgeY + badgeH / 2);

  // 4. Center 4x4 Descent Path Glyph Matrix
  const matrix = summary.pathGlyphs?.matrix || [
    ['[D]', '[D]', '[O]', '[*]'],
    ['[~]', '[~]', '[B]', '[~]'],
    ['[!]', '[!]', '[!]', '[!]'],
    ['[=]', '[=]', '[=]', '[=]'],
  ];

  const emojis = summary.pathGlyphs?.emojiMatrix || [
    ['🟫', '🟫', '🪙', '🦴'],
    ['🌊', '🌊', '🪨', '🌊'],
    ['🧨', '🧨', '🧨', '🧨'],
    ['🚪', '🚪', '🚪', '🚪'],
  ];

  const gridStartX = 186;
  const gridStartY = 190;
  const cellSize = 52;
  const cellGap = 6;

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const cx = gridStartX + c * (cellSize + cellGap);
      const cy = gridStartY + r * (cellSize + cellGap);

      // Cell background
      ctx.fillStyle = THEME.tileBg;
      ctx.strokeStyle = THEME.tileBorder;
      ctx.lineWidth = 1;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(cx, cy, cellSize, cellSize, 6);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(cx, cy, cellSize, cellSize);
        ctx.strokeRect(cx, cy, cellSize, cellSize);
      }

      // Glyph / Emoji
      const emoji = emojis[r] && emojis[r][c] ? emojis[r][c] : '🟫';
      ctx.font = '24px system-ui, Apple Color Emoji, Segoe UI Emoji, sans-serif';
      ctx.fillStyle = THEME.textLight;
      ctx.fillText(emoji, cx + cellSize / 2, cy + cellSize / 2);
    }
  }

  // 5. Stats Row (Swings, Max Chain, Best Specimen)
  const statBoxY = 434;
  const statBoxH = 64;
  const statBoxW = 520;
  const statBoxX = (W - statBoxW) / 2;

  ctx.fillStyle = THEME.statBoxBg;
  ctx.strokeStyle = THEME.statBoxBorder;
  ctx.lineWidth = 1.5;
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(statBoxX, statBoxY, statBoxW, statBoxH, 8);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(statBoxX, statBoxY, statBoxW, statBoxH);
    ctx.strokeRect(statBoxX, statBoxY, statBoxW, statBoxH);
  }

  // 3 Columns inside Stats Row
  const colW = statBoxW / 3;

  // Stat 1: Swings
  const swings = summary.swingsTaken || 0;
  ctx.fillStyle = THEME.textMuted;
  ctx.font = '13px system-ui, Cairo, sans-serif';
  ctx.fillText('SWINGS TAKEN', statBoxX + colW * 0.5, statBoxY + 20);
  ctx.fillStyle = THEME.textLight;
  ctx.font = 'bold 18px system-ui, Cairo, sans-serif';
  ctx.fillText(`⛏️ ${swings}`, statBoxX + colW * 0.5, statBoxY + 44);

  // Stat 2: Max Chain
  const chain = summary.maxTntChain || 1;
  ctx.fillStyle = THEME.textMuted;
  ctx.font = '13px system-ui, Cairo, sans-serif';
  ctx.fillText('MAX TNT CHAIN', statBoxX + colW * 1.5, statBoxY + 20);
  ctx.fillStyle = THEME.goldInner;
  ctx.font = 'bold 18px system-ui, Cairo, sans-serif';
  ctx.fillText(`🧨 ${chain}x`, statBoxX + colW * 1.5, statBoxY + 44);

  // Stat 3: Best Specimen
  const specimen = summary.bestSpecimen?.label || summary.bestSpecimen || 'PSA 10 Whale';
  ctx.fillStyle = THEME.textMuted;
  ctx.font = '13px system-ui, Cairo, sans-serif';
  ctx.fillText('BEST SPECIMEN', statBoxX + colW * 2.5, statBoxY + 20);
  ctx.fillStyle = THEME.goldHighlight;
  ctx.font = 'bold 16px system-ui, Cairo, sans-serif';
  ctx.fillText(`💎 ${specimen}`, statBoxX + colW * 2.5, statBoxY + 44);

  // Dividers between stat columns
  ctx.strokeStyle = THEME.statBoxBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(statBoxX + colW, statBoxY + 10);
  ctx.lineTo(statBoxX + colW, statBoxY + statBoxH - 10);
  ctx.moveTo(statBoxX + colW * 2, statBoxY + 10);
  ctx.lineTo(statBoxX + colW * 2, statBoxY + statBoxH - 10);
  ctx.stroke();

  // 6. Footer: Hakawati Proverb & Clean URL
  const proverb = summary.proverb?.en || summary.proverb || 'Drink your tea; the mountain is not running away.';
  ctx.fillStyle = THEME.textLight;
  ctx.font = 'italic 13px system-ui, Cairo, Georgia, serif';
  ctx.fillText(`"${proverb}"`, W / 2, 524);

  ctx.fillStyle = THEME.goldInner;
  ctx.font = 'bold 14px system-ui, Cairo, monospace';
  ctx.fillText('aetheria.dev/dig', W / 2, 552);
}

/**
 * Creates an in-memory or DOM canvas and renders the run card.
 * Returns canvas element with toDataURL helper.
 */
export function createRunCardCanvas(summary, canvas = null) {
  let cv = canvas;
  if (!cv) {
    if (typeof document !== 'undefined') {
      cv = document.createElement('canvas');
      cv.width = CARD_WIDTH;
      cv.height = CARD_HEIGHT;
    } else {
      // Mock canvas for headless environments
      cv = {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        getContext: () => ({
          fillRect: () => {},
          strokeRect: () => {},
          fillText: () => {},
          beginPath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          stroke: () => {},
          fill: () => {},
          closePath: () => {},
          save: () => {},
          restore: () => {},
          translate: () => {},
          scale: () => {},
          createLinearGradient: () => ({ addColorStop: () => {} }),
        }),
        toDataURL: () => 'data:image/png;base64,mockRunCard600x600',
      };
    }
  }

  const ctx = cv.getContext('2d');
  drawRunCard(ctx, summary);
  return cv;
}
