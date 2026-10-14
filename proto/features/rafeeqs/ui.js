// Dig feature (page side): the Rafeeq card. A click on a row of the Rafeeqs list fires `rafeeqCard { i }`.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { portrait, kindName } from './portrait.js';
import { langNow } from '../../core/strings.js';

const { t, fmt } = G;

function openCard(i, app) {
  const s = app.state;
  if (!s.diggers[i]) return;
  const m = app.modal.open('rafeeq', `<div class="card rq-card"><div class="rq-head"></div><div class="rq-name"><h2></h2><button class="ghost rq-pen"></button></div>`
    + `<p class="rq-trait"></p><p class="rq-pair"></p><div class="rq-cols"><section class="rq-lv"><h3></h3><ul></ul></section><section class="rq-all"><h3></h3><ul></ul></section></div>`
    + `<button class="primary rq-ok"></button></div>`);
  if (!m) return;
  const name = m.querySelector('h2'), pen = m.querySelector('.rq-pen');
  m.querySelector('.rq-head').appendChild(portrait(s, i));
  const fill = () => {
    const st = G.rafeeqStats(s, i), pair = G.rafeeqPair(s, i), tr = G.rafeeqTrait(s, i);
    name.textContent = G.rafeeqName(s, i);
    pen.textContent = t('rq_rename');
    const nk = G.rafeeqNick(s, i);
    // in English the nickname's Arabic script follows his line; in Arabic it is already his name
    m.querySelector('.rq-trait').textContent = nk ? (langNow() === 'ar' ? G.rafeeqLine(s, i) : t('rq_nick_line', { line: G.rafeeqLine(s, i), ar: nk.ar }))
      : t('rq_trait_line', { trait: t('rq_trait_' + tr), line: G.rafeeqLine(s, i) });
    const bits = [];
    if (pair.friend >= 0 && s.diggers[pair.friend]) bits.push(t('rq_friend', { name: G.rafeeqName(s, pair.friend) }));
    if (pair.rival >= 0 && s.diggers[pair.rival]) bits.push(t('rq_rival', { name: G.rafeeqName(s, pair.rival) }));
    m.querySelector('.rq-pair').textContent = bits.join('   ');
    m.querySelector('.rq-lv h3').textContent = t('rq_this');
    m.querySelector('.rq-all h3').textContent = t('rq_life');
    const li = (box, list) => { const ul = m.querySelector(box + ' ul'); ul.textContent = ''; list.forEach(x => { const e = document.createElement('li'); e.textContent = x; ul.appendChild(e); }); };
    li('.rq-lv', [t('rq_broke', { n: fmt(st.level.broke) }), t('rq_coins', { n: fmt(st.level.coins) })]);
    const all = [t('rq_broke', { n: fmt(st.life.broke) }), t('rq_coins', { n: fmt(st.life.coins) })];
    if (st.life.best) all.push(t('rq_best', { kind: kindName(st.life.best.kind), n: fmt(st.life.best.coins) }));
    all.push(st.life.levels === 1 ? t('rq_levels1') : t('rq_levels', { n: st.life.levels }));
    li('.rq-all', all);
  };
  fill();
  m.querySelector('.rq-ok').textContent = t('rq_close');
  m.querySelector('.rq-ok').addEventListener('click', () => { app.modal.close(); app.save(); app.dirty('crew'); });
  pen.addEventListener('click', () => {
    const box = m.querySelector('.rq-name');
    const inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'rq-input'; inp.maxLength = 24; inp.value = G.rafeeqName(s, i);
    const ok = document.createElement('button');
    ok.className = 'primary rq-keep'; ok.textContent = t('rq_save');
    const done = () => { G.rafeeqRename(s, i, inp.value); app.save(); app.dirty('crew'); box.replaceChildren(name, pen); fill(); };
    inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') done(); });   // typing must not press the game's hotkeys
    ok.addEventListener('click', done);
    box.replaceChildren(inp, ok);
    inp.focus(); inp.select();
  });
}

ui({
  id: 'rafeeqs',
  css: new URL('./rafeeqs.css', import.meta.url).href,
  on: { rafeeqCard(d, app) { openCard(d.i, app); } },
});
