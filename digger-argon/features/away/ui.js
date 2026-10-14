// Dig feature (page side): the welcome-back card. The page calls away(seconds) when it was closed
// or asleep for more than a minute. A short absence is one line; a longer one is a card with a
// small replay: a Rafeeq runs along a track and stamps pop up as it passes. When the card closes
// it fires `awayDone` (the chest feature opens the stacked chests one by one then).
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { icon, badge, pickShape, helmet } from '../../ui/icons.js';
import { CELL, baseBlock, rr, centre, coinBurst, spark, ring, text, shake, fx } from '../../ui/render.js';
import { sfx } from '../../ui/audio.js';

const { t, fmt } = G;

const span = secs => {
  const mins = Math.max(1, Math.floor(secs / 60));
  return (mins >= 60 ? t('hours', { h: Math.floor(mins / 60), m: mins % 60 }) : t('min', { n: mins })).replace(/ /g, ' ');
};
const plural = (n, one, many) => n === 1 ? t(one) : t(many, { n });

function stamps(out) {
  const list = [];
  if (out.metres) list.push({ ic: 'away_pick', text: t('away_metres', { n: out.metres }) });
  if (out.sieveSeconds >= 60) list.push({ ic: 'away_pick', text: t('away_sieve', { t: span(out.sieveSeconds) }) });
  if (out.bones) list.push({ ic: 'bone', text: plural(out.bones, 'away_bone1', 'away_bones'), sub: out.newBones ? plural(out.newBones, 'away_newbone1', 'away_newbones') : '', isNew: !!out.newBones });
  if (out.chests) list.push({ ic: 'chest', text: plural(out.chests, 'away_chest1', 'away_chests') });
  return list;
}

function card(out, app) {
  const m = app.modal.open('away', `<div class="card away"><h2></h2><p class="line"></p><div class="away-track"><span class="runner">${icon('away_rafeeq', 30)}</span></div><div class="big">${icon('coin', 30)}<b id="away-n">0</b></div><p class="joke"></p><ul class="rq-names"></ul><div class="stack"></div><p class="rock"></p><p class="crate-note" style="color:#ffd700;font-weight:bold;"></p><button class="primary"></button><p class="cap"></p></div>`);
  if (!m) return false;
  m.querySelector('h2').textContent = t('away_title');
  m.querySelector('.line').textContent = t('away_line', { t: span(out.seconds) });
  m.querySelector('.cap').textContent = t('away_cap', { h: G.PARAMS.away.capHours });
  const named = G.rafeeqAway(app.state, out);
  m.querySelector('.joke').textContent = named.joke || t('away_joke_' + out.joke);
  const ul = m.querySelector('.rq-names');
  named.lines.forEach(x => { const li = document.createElement('li'); li.textContent = x; ul.appendChild(li); });
  m.querySelector('.rock').textContent = out.atGate ? t('away_gate') : out.atBoss ? t('away_boss') : '';
  if (out.hasCrate) {
    const cn = m.querySelector('.crate-note');
    if (cn) cn.textContent = t('away_crate_msg');
  }
  const list = stamps(out);
  const track = m.querySelector('.away-track');
  const run = 0.5 + 0.5 * list.length;
  track.style.setProperty('--run', run + 's');
  list.forEach((x, i) => {
    const e = document.createElement('div');
    e.className = 'stamp' + (x.isNew ? ' new' : '');
    e.style.setProperty('--d', (run * (i + 0.7) / (list.length + 0.4)) + 's');
    e.innerHTML = `${icon(x.ic, 34)}<span></span>${x.sub ? '<small></small>' : ''}`;
    e.querySelector('span').textContent = x.text;
    if (x.sub) e.querySelector('small').textContent = x.sub;
    track.appendChild(e);
  });
  const stack = m.querySelector('.stack');
  for (let i = 0; i < Math.min(out.chests, 8); i++) { stack.insertAdjacentHTML('beforeend', icon('chest', 40)); stack.lastChild.style.setProperty('--d', (run + i * 0.12) + 's'); }
  const btn = m.querySelector('button');
  btn.textContent = out.chests ? t('away_open') : t('away_ok');
  btn.addEventListener('click', () => {
    app.unlockAudio();
    app.modal.close();
    if (app.state.away && app.state.away.crate) {
      fx.cam = app.state.away.crate.r - 2;
    }
    app.fire('awayDone', out);
  });
  const t0 = performance.now(), el = m.querySelector('#away-n');
  const dur = run * 1000 + 600;
  const tick = () => { const k = Math.min(1, (performance.now() - t0) / dur); el.textContent = '+' + fmt(out.coins * (1 - Math.pow(1 - k, 3))); if (k < 1 && el.isConnected) requestAnimationFrame(tick); };
  tick();
  return true;
}

function line(out, app) {
  app.toast(out.chests ? (out.chests === 1 ? t('away_short_chest1', { n: fmt(out.coins) }) : t('away_short_chests', { n: fmt(out.coins), c: out.chests })) : t('away_short', { n: fmt(out.coins) }), 'gold');
  if (out.hasCrate) {
    app.toast(t('away_crate_msg'), 'gold');
    if (app.state.away && app.state.away.crate) fx.cam = app.state.away.crate.r - 2;
  }
  if (out.chests) setTimeout(() => app.fire('awayDone', out), 900);
}

ui({
  id: 'away',
  icons: { away_pick: badge('#6b4a2b', pickShape()), away_rafeeq: badge('#2f5d8a', helmet) },
  css: new URL('./away.css', import.meta.url).href,
  art: {
    crate: {
      colour: '#8b5a2b',
      twinkle: true,
      glow: '245,190,40',
      sprite(g, p, v) {
        baseBlock(g, '#7a481c', v, 1);
        g.strokeStyle = '#4a2808';
        g.lineWidth = 2;
        g.strokeRect(4, 4, CELL - 8, CELL - 8);
        g.beginPath();
        g.moveTo(4, CELL / 2); g.lineTo(CELL - 4, CELL / 2);
        g.moveTo(4, 4); g.lineTo(CELL - 4, CELL - 4);
        g.moveTo(4, CELL - 4); g.lineTo(CELL - 4, 4);
        g.stroke();
        g.fillStyle = '#e63946';
        g.fillRect(CELL / 2 - 5, 2, 10, CELL - 4);
        g.fillRect(2, CELL / 2 - 5, CELL - 4, 10);
        g.strokeStyle = '#ffd700';
        g.lineWidth = 1.5;
        g.strokeRect(CELL / 2 - 5, 2, 10, CELL - 4);
        g.strokeRect(2, CELL / 2 - 5, CELL - 4, 10);
        rr(g, CELL / 2 - 7, CELL / 2 - 7, 14, 14, 4);
        g.fillStyle = '#ffd700';
        g.fill();
        g.stroke();
      },
    },
  },
  on: {
    unpackSpoils(d) {
      const cr = (d && d.r) || 0;
      const cc = (d && d.c) !== undefined ? d.c : 5;
      const [x, y] = centre(cr, cc);
      coinBurst(cr, cc, 40, '#ffd700');
      spark(x, y, '#ff4d4d', 25);
      spark(x, y, '#ffd700', 30);
      ring(x, y, CELL * 2.5, '#ffd700');
      if (d && d.coins) text(x, y - 20, t('away_crate_unpack', { n: fmt(d.coins) }), '#ffd700', 22, 1.2);
      if (sfx.chestOpen) sfx.chestOpen();
      shake(0.3);
    },
  },
  away(seconds, app) {
    const out = G.settleAway(app.state, seconds, app.ev, { deferSpoils: true });
    if (!out.coins && !out.chests) return;
    if (out.seconds < G.PARAMS.away.bigSeconds || !card(out, app)) line(out, app);
  },
});
