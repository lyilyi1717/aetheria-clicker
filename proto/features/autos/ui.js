// Dig feature (page side): the Machines panel (one card per machine: locked ones say how to earn them and show
// the count, owned ones show their switch and rule), the little moments (a tool fired by itself, a chest the sorter
// took or left) and the ceremony when a machine is won.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { W, SKY, centre, ring, spark, shake, screenFlash } from '../../ui/render.js';
import { gap, tone } from '../../ui/audio.js';
import { icon, badge, S } from '../../ui/icons.js';

const { t } = G;

const ICONS = {
  au_buy: badge('#2f8f5b', `<circle cx="14" cy="16" r="8" fill="#ffd23f" ${S}/><path d="M14 11 V21 M11 13.5 H16 M11 18.5 H16" stroke="#7a5a00" stroke-width="1.8" stroke-linecap="round"/><path d="M22 6 A8 8 0 0 1 27 14 M27 14 L24 12 M27 14 L28.5 10.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`),
  au_sorter: badge('#8a4b1c', `<rect x="6" y="14" width="20" height="12" rx="2" fill="#a65c24" ${S}/><path d="M6 15 Q16 4 26 15 Z" fill="#c9782e" ${S}/><path d="M11 20 L15 24 L22 16" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`),
  au_timer: badge('#c0392b', `<circle cx="16" cy="17" r="9" fill="#fff" ${S}/><path d="M16 17 V11 M16 17 L20 19" stroke="#1b1410" stroke-width="2.2" stroke-linecap="round"/><path d="M12 5 H20" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`),
  au_habit: badge('#3b82f6', `<path d="M7 17 A9 9 0 0 1 24 12 M24 12 L25 6 M24 12 L18.5 11.5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M25 15 A9 9 0 0 1 8 20 M8 20 L7 26 M8 20 L13.5 20.5" fill="none" stroke="#ffd23f" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`),
  c_handsOff: badge('#c0392b', `<path d="M10 24 V12 a2 2 0 0 1 4 0 V16 M14 14 V10 a2 2 0 0 1 4 0 V16 M18 12 a2 2 0 0 1 4 0 V18 Q22 25 15 26 Q10 26 10 24" fill="#f8d9b0" ${S}/><path d="M5 5 L27 27" stroke="#e5533d" stroke-width="3" stroke-linecap="round"/>`),
  c_shopShut: badge('#7a5a1a', `<rect x="6" y="12" width="20" height="14" rx="2" fill="#e0b467" ${S}/><path d="M5 12 L8 6 H24 L27 12 Z" fill="#d7332b" ${S}/><path d="M9 18 H23" stroke="#1b1410" stroke-width="3"/><path d="M5 5 L27 27" stroke="#e5533d" stroke-width="3" stroke-linecap="round"/>`),
};
const CARD_ICON = { buyPick: 'up_pick', buyCrew: 'up_crew', buyTrain: 'up_crewPow', buySieve: 'up_luck', sorter: 'au_sorter', timer: 'au_timer', habit: 'au_habit' };
const BUY_IDS = ['buyPick', 'buyCrew', 'buyTrain', 'buySieve'];

const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// "Chests opened by hand: 31 of 50" or "Win the contract X"
function earnLine(s, id) {
  const g = G.autoProgress(s, id);
  if (g.contract) return t('au_e_' + id, { name: t('c_' + g.contract) });
  return t('au_e_' + id, { n: g.of });
}
function progLine(s, id) {
  const g = G.autoProgress(s, id);
  if (g.contract) return t(G.contractState(s, g.contract) === 'open' ? 'au_e_contract_open' : 'au_e_contract_todo');
  return t('au_e_count', { now: g.now, of: g.of });
}

function lockedRow(s, id) {
  const g = G.autoProgress(s, id);
  return `<div class="au-lock" data-m="${id}"><span class="ic">${icon(CARD_ICON[id], 30)}</span><span class="tx"><b>${esc(t('au_m_' + id))}</b><span class="how">${esc(earnLine(s, id))}</span><span class="bar"><i style="inline-size:${Math.round(100 * g.now / g.of)}%"></i></span><span class="prog">${esc(progLine(s, id))}</span></span></div>`;
}
const sw = (id, on) => `<button class="au-sw ${on ? 'on' : ''}" data-sw="${id}" aria-pressed="${on}">${esc(t(on ? 'au_s_on' : 'au_s_off'))}</button>`;
const sel = (attrs, opts, cur) => `<select ${attrs}>${opts.map(([v, l]) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;

function buyCard(s) {
  const rows = BUY_IDS.map(id => {
    if (!s.autoOwn[id]) return lockedRow(s, id);
    const item = G.AUTOS.find(a => a.id === id).item;
    return `<div class="au-row"><span class="ic">${icon(CARD_ICON[id], 30)}</span><b>${esc(t('up_' + item))}</b>${sw(id, !!s.autoOn[id])}</div>`;
  }).join('');
  const any = BUY_IDS.some(id => s.autoOwn[id]);
  const keep = any ? `<label class="au-set">${esc(t('au_s_keep'))} ${sel('data-keep', G.PARAMS.autos.keepSteps.map(n => [String(n), String(n)]), String(s.autoSet.keep))}</label>` : '';
  return `<div class="au-card ${any ? 'own' : ''}" data-card="buy"><h3>${icon('au_buy', 26)}<span>${esc(t('au_m_buy_card'))}</span></h3><p class="muted">${esc(t('au_m_buy_d'))}</p>${rows}${keep}</div>`;
}

function sorterBody(s) {
  const w = s.autoSet.wish;
  const items = w.map((id, i) => {
    const lv = G.rel(s, id), max = G.RELICS[id].max;
    return `<li data-id="${id}"><span class="n">${i + 1}</span>${icon(id, 26)}<b>${esc(t('r_' + id))}</b>${lv >= max ? `<span class="muted">${lv}/${max}</span>` : ''}<span class="mv"><button data-mv="-1" title="${esc(t('au_s_up'))}">&#9650;</button><button data-mv="1" title="${esc(t('au_s_down'))}">&#9660;</button><button data-drop="1" title="${esc(t('au_s_drop'))}">&times;</button></span></li>`;
  }).join('');
  const rest = Object.keys(G.RELICS).filter(id => !w.includes(id)).sort((a, b) => (t('r_' + a) < t('r_' + b) ? -1 : 1));
  const add = w.length < G.PARAMS.autos.wishMax && rest.length ? sel('data-add="1"', [['', t('au_s_wish_add')], ...rest.map(id => [id, t('r_' + id)])], '') : '';
  return `<p class="muted">${esc(t('au_s_wish'))}</p>${w.length ? `<ol class="au-wish">${items}</ol>` : `<p class="muted">${esc(t('au_s_wish_none'))}</p>`}${add}<p class="muted">${esc(t('au_s_wish_else'))}</p>`;
}
function timerBody(s) {
  const rows = G.FORGE_TOOLS.map(tool => {
    const have = G.itemLevel(s, tool) > 0;
    const opts = [['off', t('au_s_off_rule')], ...G.AUTO_TIMER[tool].map(r => [r, t('au_tr_' + r)])];
    return `<div class="au-row ${have ? '' : 'dim'}"><span class="ic">${icon('tool_' + tool, 28)}</span><b>${esc(t('tool_' + tool))}</b>${have ? sel(`data-tool="${tool}"`, opts, s.autoSet.timer[tool]) : ''}</div>`;
  }).join('');
  return `${rows}<p class="muted">${esc(t('au_s_full'))}</p>`;
}
function habitBody(s) {
  const h = s.autoSet.habit, jobs = G.foremanJobs.map(j => [j, t('job_' + j)]);
  return `<div class="au-hab"><span>${esc(t('au_h_when'))}</span>${sel('data-h="cond"', G.AUTO_CONDS.map(c => [c, t('au_hc_' + c)]), h.cond)}<span>${esc(t('au_h_then'))}</span>${sel('data-h="a"', jobs, h.a)}<span>${esc(t('au_h_else'))}</span>${sel('data-h="b"', jobs, h.b)}</div>${s.foremanHere ? '' : `<p class="muted">${esc(t('au_h_need_foreman'))}</p>`}`;
}
function machineCard(s, id) {
  if (!s.autoOwn[id]) return `<div class="au-card" data-card="${id}">${lockedRow(s, id)}</div>`;
  const body = id === 'sorter' ? sorterBody(s) : id === 'timer' ? timerBody(s) : habitBody(s);
  return `<div class="au-card own" data-card="${id}"><h3>${icon(CARD_ICON[id], 26)}<span>${esc(t('au_m_' + id))}</span>${sw(id, !!s.autoOn[id])}</h3><p class="muted">${esc(t('au_m_' + id + '_d'))}</p>${body}</div>`;
}

const sig = s => JSON.stringify([s.autoOwn, s.autoOn, s.autoSet, s.foremanHere, G.FORGE_TOOLS.map(x => G.itemLevel(s, x)), s.autoSet.wish.map(id => G.rel(s, id))]);
let last = '';

ui({
  id: 'autos',
  css: new URL('./autos.css', import.meta.url).href,
  icons: ICONS,
  sfx: {
    won() { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, { type: 'triangle', d: 0.24, vol: 0.18, at: i * 0.09 })); tone(130, { type: 'square', d: 0.2, vol: 0.14, slide: 60 }); },
    tick() { if (gap('autoTick', 0.25)) { tone(880, { type: 'square', d: 0.05, vol: 0.05 }); tone(1320, { type: 'square', d: 0.06, vol: 0.05, at: 0.05 }); } },
    take() { if (gap('autoTake', 0.2)) [660, 880].forEach((f, i) => tone(f, { type: 'triangle', d: 0.16, vol: 0.14, at: i * 0.07 })); },
    hold() { if (gap('autoHold', 0.6)) tone(330, { type: 'triangle', d: 0.18, vol: 0.1 }); },
  },
  on: {
    autoWon(d, app) {
      try { app.sfx.won(); } catch { /* audio not unlocked yet */ }
      screenFlash('#fff', 0.45); shake(0.5); app.hitStop(0.1);
      app.banner(t('au_won_title'), t('au_won_sub', { name: t('au_m_' + d.id) }));
      const x = W / 2, y = SKY + 200; ring(x, y, W * 0.55, '#59d37a'); ring(x, y, W * 0.35, '#ffd23f'); spark(x, y, '#ffd23f', 40);
      app.dirty('autos');
    },
    autoBought(d, app) { try { app.sfx.tick(); } catch { /* audio not unlocked yet */ } },
    autoPick(d, app) { try { app.sfx.take(); } catch { /* audio not unlocked yet */ } app.toast(t('au_pick', { name: t('r_' + d.id) }), 'gold'); },
    autoHold(d, app) { try { app.sfx.hold(); } catch { /* audio not unlocked yet */ } app.toast(t('au_hold')); },
    autoTool(d, app) {
      const [x, y] = centre(d.r, d.c); ring(x, y, 70, '#7be0ff'); spark(x, y, '#7be0ff', 10);
      app.toast(t('au_tool', { name: t('tool_' + d.id) }));
    },
    autoJob(d, app) { app.toast(t('au_job', { name: t('job_' + d.id) })); },
    autoRefund(d, app) { app.toast(t('au_refund')); },
  },
  panels: [{
    id: 'autos', elId: 'autos', side: 'left', at: 45, title: 'au_title', live: true,
    when: s => s.bossesDown >= 1 || s.autoStat.pick >= 10 || Object.keys(s.autoOwn).length > 0,
    build(el, app) {
      el.insertAdjacentHTML('beforeend', '<p class="muted au-intro"></p><div class="au-cards"></div>');
      el.querySelector('.au-intro').textContent = t('au_intro');
      const box = el.querySelector('.au-cards');
      const done = () => { last = ''; app.save(); };
      box.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        app.unlockAudio();
        const s = app.state, li = b.closest('li');
        if (b.dataset.sw) { G.autoToggle(s, b.dataset.sw); return done(); }
        if (li && b.dataset.mv) { G.autoWishMove(s, li.dataset.id, +b.dataset.mv); return done(); }
        if (li && b.dataset.drop) { G.autoWishDrop(s, li.dataset.id); return done(); }
      });
      box.addEventListener('change', e => {
        const x = e.target, s = app.state;
        if ('keep' in x.dataset) G.autoKeep(s, +x.value);
        else if ('add' in x.dataset) { if (x.value) G.autoWishAdd(s, x.value); }
        else if (x.dataset.tool) G.autoTimerSet(s, x.dataset.tool, x.value);
        else if (x.dataset.h) G.autoHabitSet(s, x.dataset.h, x.value);
        done();
      });
    },
    update(el, s) {
      const box = el.querySelector('.au-cards');
      const k = sig(s) + s.contract;
      const editing = document.activeElement && document.activeElement.tagName === 'SELECT' && box.contains(document.activeElement);
      if (k !== last && !editing) {
        last = k;
        box.innerHTML = buyCard(s) + ['sorter', 'timer', 'habit'].map(id => machineCard(s, id)).join('');
      }
      // the counts move every tick without redrawing the cards
      for (const row of box.querySelectorAll('.au-lock')) {
        const id = row.dataset.m, g = G.autoProgress(s, id);
        row.querySelector('.bar i').style.inlineSize = Math.round(100 * g.now / g.of) + '%';
        row.querySelector('.prog').textContent = progLine(s, id);
      }
      for (const card of box.querySelectorAll('.au-card.own')) {
        const id = card.dataset.card, on = id === 'buy' ? BUY_IDS.some(x => s.autoOwn[x] && s.autoOn[x]) : !!s.autoOn[id];
        card.classList.toggle('running', on);
      }
    },
  }],
});
