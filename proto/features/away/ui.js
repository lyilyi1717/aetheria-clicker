// Dig feature (page side): the welcome-back card. The page calls away(seconds) when it was closed
// or asleep for more than a minute. When the card is closed it fires `awayDone` (chests open then).
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { icon } from '../../ui/icons.js';

const { t, fmt } = G;

function card(out, app) {
  if (out.seconds < 120 || (!out.coins && !out.chests)) return;
  const m = app.modal.open('away', `<div class="card away"><h2></h2><p class="line"></p><div class="big">${icon('coin', 30)}<b id="away-n">0</b></div><ul></ul><button class="primary"></button></div>`);
  if (!m) return;
  const mins = Math.floor(out.seconds / 60);
  const when = mins >= 60 ? t('hours', { h: Math.floor(mins / 60), m: mins % 60 }) : t('min', { n: mins });
  m.querySelector('h2').textContent = t('away_title');
  m.querySelector('.line').textContent = t('away_line', { t: when });
  const ul = m.querySelector('ul');
  const li = s => { const e = document.createElement('li'); e.textContent = s; ul.appendChild(e); };
  if (out.metres) li(t('away_metres', { n: out.metres }));
  if (out.chests) li(out.chests === 1 ? t('away_chest1') : t('away_chests', { n: out.chests }));
  if (out.atBoss) li(t('away_boss'));
  const btn = m.querySelector('button');
  btn.textContent = t('away_ok');
  btn.addEventListener('click', () => { app.unlockAudio(); app.modal.close(); app.fire('awayDone', out); });
  const t0 = performance.now(), el = m.querySelector('#away-n');
  const tick = () => { const k = Math.min(1, (performance.now() - t0) / 1800); el.textContent = '+' + fmt(out.coins * (1 - Math.pow(1 - k, 3))); if (k < 1 && el.isConnected) requestAnimationFrame(tick); };
  tick();
}

ui({
  id: 'away',
  away(seconds, app) { card(G.settleAway(app.state, seconds, app.ev), app); },
});
