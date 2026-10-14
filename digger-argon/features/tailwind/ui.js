import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { icon, badge } from '../../ui/icons.js';

const { t } = G;

const kettleShape = '<path d="M8 17 h16 a5 5 0 0 1 5 5 v2 H3 v-2 a5 5 0 0 1 5 -5 z M16 17 v-5 a2 2 0 0 0 -2 -2 h-2 M23 18 l4 -4 M13 7 c-1 -1 0 -2 -1 -3 M18 9 c-1 -1 0 -2 -1 -3" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>';

function openHakawatiDialog(app, charges = 3) {
  const m = app.modal.open('tailwind', `<div class="card tailwind" style="text-align:center;max-width:360px;"><div class="kettle-anim" style="margin-bottom:12px;">${icon('kettle_steam', 56)}</div><h2 style="margin:0 0 10px;color:#f4a261;"></h2><p class="hakawati" style="font-size:15px;line-height:1.5;color:#e0e0e0;"></p><div class="buff-box" style="margin:14px 0;padding:10px;background:rgba(244,162,97,0.15);border:1px solid #f4a261;border-radius:8px;color:#f4a261;font-weight:bold;"></div><button class="primary tailwind-ok" style="width:100%;"></button></div>`);
  if (!m) return;
  m.querySelector('h2').textContent = t('tailwind_title');
  m.querySelector('.hakawati').textContent = t('tailwind_hakawati');
  m.querySelector('.buff-box').textContent = t('tailwind_buff', { n: charges });
  const btn = m.querySelector('.tailwind-ok');
  btn.textContent = t('tailwind_accept');
  btn.addEventListener('click', () => {
    app.unlockAudio();
    app.modal.close();
  });
}

ui({
  id: 'tailwind',
  icons: { kettle_steam: badge('#d48b38', kettleShape) },
  on: {
    tailwindAwarded(d) {
      openHakawatiDialog(ui.app || window.app, (d && d.charges) || 3);
    },
  },
  status: {
    at: 50,
    render(s) {
      if (!s.tailwind || s.tailwind.charges <= 0) return null;
      return `<span class="chip tailwind-chip" title="${t('tailwind_charges', { n: s.tailwind.charges })}" style="background:#5c3d18;color:#f4a261;border:1px solid #f4a261;padding:2px 8px;border-radius:12px;font-size:13px;font-weight:bold;">${icon('kettle_steam', 16)} ${t('tailwind_tag')} (${s.tailwind.charges})</span>`;
    },
  },
});
