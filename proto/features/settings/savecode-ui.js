// Dig (page side): the "Save code" section of Settings. Show code copies the whole save as one line of text; Load code takes one
// back. A bad, cut or too-new code is refused with a plain line and the save in the browser is never touched. A good code asks
// first ("Level N, X Stars, saved ...") and only then replaces the save.
import * as G from '../../game.js';
import { encodeSave, decodeSave } from './savecode.js';

const { t } = G;

const WHY = { empty: 'sc_empty', format: 'sc_format', sum: 'sc_sum', newer: 'sc_newer', broken: 'sc_broken' };
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };

export function buildSaveCode(app, parent) {
  const box = el('div', 'sc'), head = el('h3', '', t('sc_title')), row = el('div', 'sc-row');
  const show = el('button', 'ghost set-switch', t('sc_show')), load = el('button', 'ghost set-switch', t('sc_load'));
  const area = el('textarea', 'sc-area'); area.rows = 3; area.hidden = true; area.spellcheck = false; area.setAttribute('aria-label', t('sc_title'));
  const msg = el('p', 'sc-msg'); msg.setAttribute('role', 'status');
  const act = el('div', 'sc-row'); act.hidden = true;
  const go = el('button', 'primary', ''), no = el('button', 'ghost', t('sc_cancel'));
  act.append(go, no); row.append(show, load); box.append(head, row, area, msg, act); parent.append(box);
  let mode = '', pending = null;

  const say = (text, bad) => { msg.textContent = text; msg.classList.toggle('bad', !!bad); };
  const reset = () => { mode = ''; pending = null; act.hidden = true; area.readOnly = false; };

  show.addEventListener('click', async () => {
    reset(); area.hidden = false; area.readOnly = true; mode = 'show';
    area.value = await encodeSave(G.serialize(app.state));
    area.focus(); area.select();
    let copied = false;
    try { await navigator.clipboard.writeText(area.value); copied = true; } catch { /* the player can copy it by hand */ }
    say(t(copied ? 'sc_copied' : 'sc_copy_by_hand'));
  });
  load.addEventListener('click', () => {
    reset(); area.hidden = false; area.value = ''; mode = 'load'; area.focus(); say(t('sc_paste'));
  });
  area.addEventListener('input', async () => {
    if (mode !== 'load') return;
    pending = null; act.hidden = true;
    const r = await decodeSave(area.value);
    if (!r.ok) { say(r.why === 'empty' ? t('sc_paste') : t(WHY[r.why]), r.why !== 'empty'); return; }
    pending = r;
    const when = r.info.savedAt ? new Date(r.info.savedAt).toLocaleDateString() : t('sc_unknown_date');
    say(t('sc_preview', { n: G.roadLevel(r.state).level, stars: G.fmt(r.info.stars), date: when }));
    go.textContent = t('sc_replace'); act.hidden = false;
  });
  go.addEventListener('click', () => {
    if (!pending) return;
    // the page holds the live state: swap its contents, save it, start again from it. Nothing is stored before this click.
    const live = app.state, next = pending.state;
    for (const k of Object.keys(live)) delete live[k];
    Object.assign(live, next);
    app.save();
    say(t('sc_done'));
    setTimeout(() => location.reload(), 300);
  });
  no.addEventListener('click', () => { reset(); area.value = ''; area.hidden = true; say(''); });
}
