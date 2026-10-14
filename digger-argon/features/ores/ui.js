// Dig feature (page side): how ore looks. `rich` gives a break its ring, sparks and bigger coins.
import { ui } from '../../ui/app.js';
import { baseBlock } from '../../ui/render.js';
import { S, badge, gem } from '../../ui/icons.js';
import { oreBacking } from '../look/palette.js';

const COL = { copper: ['#f08a3c', '#ffc38a'], silver: ['#dfe9f2', '#ffffff'], gold: ['#ffcf33', '#fff3a8'], gem: ['#3ee6e0', '#d6fffd'] };

function nugget(g, x, y, s, cols, rot) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.beginPath(); g.moveTo(-s, -s * 0.2); g.lineTo(-s * 0.3, -s); g.lineTo(s * 0.8, -s * 0.6); g.lineTo(s, s * 0.4); g.lineTo(0, s); g.closePath();
  g.fillStyle = cols[0]; g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 1.5; g.stroke();
  g.beginPath(); g.moveTo(-s * 0.3, -s); g.lineTo(s * 0.8, -s * 0.6); g.lineTo(0, -s * 0.05); g.closePath();
  g.fillStyle = cols[1]; g.fill();
  g.restore();
}
function gemShape(g, x, y, s, cols) {
  g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.8, y - s * 0.25); g.lineTo(x, y + s); g.lineTo(x - s * 0.8, y - s * 0.25); g.closePath();
  g.fillStyle = cols[0]; g.fill(); g.strokeStyle = 'rgba(0,40,50,0.6)'; g.lineWidth = 1.5; g.stroke();
  g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.8, y - s * 0.25); g.lineTo(x, y - s * 0.05); g.lineTo(x - s * 0.8, y - s * 0.25); g.closePath();
  g.fillStyle = cols[1]; g.fill();
}
const nuggets = t => (g, p, v) => {
  baseBlock(g, oreBacking(p.dirt, COL[t][0]), v, 3);   // dark enough that the ore reads on every layer
  const cols = COL[t];
  nugget(g, 21, 24, 10, cols, 0.3 + v); nugget(g, 43, 38, 11, cols, 1.2 + v); nugget(g, 40, 17, 6, cols, 2 + v); nugget(g, 20, 45, 6, cols, 4 + v);
};

ui({
  id: 'ores',
  icons: {
    vein: badge('#1f7a8c', gem(9, 17, 6, '#3ee6e0') + gem(16, 13, 7, '#9af7f3') + gem(23, 17, 6, '#3ee6e0')),
    shiny: badge('#b98a00', gem(16, 17, 11, '#fff3a8') + `<path d="M16 6 L24.8 14.8 L16 17 L7.2 14.8 Z" fill="#fff" opacity="0.7"/>`),
  },
  art: {
    copper: { rich: true, twinkle: true, colour: COL.copper[0], sprite: nuggets('copper') },
    silver: { rich: true, twinkle: true, colour: COL.silver[0], coin: '#dfe9f2', sprite: nuggets('silver') },
    gold:   { rich: true, twinkle: true, colour: COL.gold[0], sprite: nuggets('gold') },
    gem:    { rich: true, twinkle: true, colour: COL.gem[0], coin: '#dfe9f2', sprite(g, p, v) {
      baseBlock(g, oreBacking(p.dirt, COL.gem[0]), v, 3);
      gemShape(g, 22, 26, 12, COL.gem); gemShape(g, 43, 40, 10, COL.gem); gemShape(g, 40, 17, 6, COL.gem);
    } },
  },
});
