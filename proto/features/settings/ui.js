// Dig feature (page side): the Settings menu. A round gear button beside the Map and Sound buttons opens a small card with
// three sliders (Volume, Music, Effects; 0 to 100), the Sound on/off switch and the play-times switch. Moving a slider plays a
// short sample. The levels are kept in localStorage (not in the save). Esc or a click outside the card closes it.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { addIcons, icon } from '../../ui/icons.js';
import { setLevels, getLevels, preview, isMuted, unlock } from '../../ui/audio.js';
import { load, save } from '../../ui/volume.js';
import { tel } from '../telemetry/ui.js';
import * as motion from '../../ui/motion.js';
import { buildSaveCode } from './savecode-ui.js';

const { t } = G;

const store = (() => { try { return localStorage; } catch { return null; } })();
if (store) setLevels(load(store));
motion.init(store, window.matchMedia && window.matchMedia.bind(window), document.documentElement);

// a gear: a ring with eight teeth and a hub
addIcons({ btn_gear: '<circle cx="16" cy="16" r="7" fill="none" stroke="currentColor" stroke-width="2.6"/><circle cx="16" cy="16" r="2.4" fill="currentColor"/><path d="M16 3.5 V8 M16 24 V28.5 M3.5 16 H8 M24 16 H28.5 M7.2 7.2 L10.4 10.4 M21.6 21.6 L24.8 24.8 M24.8 7.2 L21.6 10.4 M10.4 21.6 L7.2 24.8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' });

const ROWS = [['master', 'set_master'], ['music', 'set_music'], ['fx', 'set_fx']];
let open = false;

function close(app) { if (!open) return; open = false; window.removeEventListener('keydown', onKey, true); app.modal.close(); }
let appRef = null;
function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(appRef); } }

function openSettings(app) {
  app.unlockAudio();
  const m = app.modal.open('settings', `<div class="card settings"><h2></h2><div class="set-rows"></div><div class="set-sw"></div><button class="primary set-done"></button></div>`);
  if (!m) return;
  open = true; appRef = app;
  m.querySelector('h2').textContent = t('set_title');
  const rows = m.querySelector('.set-rows');
  let last = 0;
  for (const [k, key] of ROWS) {
    const row = document.createElement('label'); row.className = 'set-row';
    const name = document.createElement('span'); name.textContent = t(key);
    const inp = document.createElement('input'); inp.type = 'range'; inp.min = 0; inp.max = 100; inp.step = 1;
    inp.value = getLevels()[k]; inp.setAttribute('aria-label', t(key));
    const val = document.createElement('b'); val.textContent = t('set_value', { n: inp.value });
    inp.addEventListener('input', () => {
      setLevels({ [k]: Number(inp.value) }); val.textContent = t('set_value', { n: inp.value });
      if (store) save(store, getLevels());
      const now = performance.now();
      if (now - last > 110) { last = now; unlock(); preview(k === 'music' ? 'music' : 'fx'); }
    });
    row.append(name, inp, val); rows.append(row);
  }
  const sw = m.querySelector('.set-sw');
  const sound = document.createElement('button'); sound.type = 'button'; sound.className = 'ghost set-switch';
  const paintSound = () => { sound.textContent = t(isMuted() ? 'set_sound_is_off' : 'set_sound_is_on'); sound.setAttribute('aria-pressed', isMuted() ? 'false' : 'true'); };
  sound.addEventListener('click', () => { const b = document.getElementById('mute'); if (b) b.click(); paintSound(); });
  paintSound(); sw.append(sound);
  if (tel) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'ghost set-switch';
    const paint = () => { b.textContent = t(tel.consent() ? 'set_tel_is_on' : 'set_tel_is_off'); b.title = t(tel.consent() ? 'tel_note_on' : 'tel_note_off'); b.setAttribute('aria-pressed', tel.consent() ? 'true' : 'false'); };
    b.addEventListener('click', () => { tel.setConsent(!tel.consent()); paint(); });
    paint(); sw.append(b);
  }
  const calm = document.createElement('button'); calm.type = 'button'; calm.className = 'ghost set-switch';
  const paintCalm = () => { calm.textContent = t(motion.isReduced() ? 'set_calm_is_on' : 'set_calm_is_off'); calm.setAttribute('aria-pressed', motion.isReduced() ? 'true' : 'false'); };
  calm.addEventListener('click', () => { motion.setReduced(!motion.isReduced(), document.documentElement); if (store) motion.save(store, motion.isReduced()); paintCalm(); });
  paintCalm(); sw.append(calm);
  const sc = document.createElement('div'); m.querySelector('.set-done').before(sc); buildSaveCode(app, sc);
  const done = m.querySelector('.set-done'); done.textContent = t('set_close');
  done.addEventListener('click', () => close(app));
  m.addEventListener('click', e => { if (e.target === m) close(app); });
  window.addEventListener('keydown', onKey, true);
  inpFocus(m);
}
function inpFocus(m) { const f = m.querySelector('input'); if (f) f.focus(); }

ui({
  id: 'settings',
  css: new URL('./settings.css', import.meta.url).href,
  mount(app) {
    const mute = document.getElementById('mute');
    if (!mute) return;
    const b = document.createElement('button'); b.id = 'setbtn'; b.type = 'button'; b.className = 'rbtn';
    b.innerHTML = icon('btn_gear', 22); b.title = b.ariaLabel = t('set_open');
    b.addEventListener('click', () => openSettings(app));
    mute.before(b);
  },
  on: { modalClosed(d) { if (d.id === 'settings' && open) { open = false; window.removeEventListener('keydown', onKey, true); } } },
});
