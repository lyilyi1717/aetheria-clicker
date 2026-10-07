// Chronicle tab (R20, docs/redesign-proposal.md §4 and §6.6; mockup docs/ui/mockups/chronicle.html).
// main.js only calls init() once and update(currentTab) every frame. The DOM is built once and
// updated in place, so buttons are never replaced under the pointer.
//
// It also owns the Chronicle clock: a 1 s interval (it keeps running in background tabs, where
// requestAnimationFrame stops) completes a challenge whose goal is met and turns the Chapter page
// when its weeks are over, with their toasts. The Chronicle reset itself is an epic ceremony.
import { BigNum } from '../engine/BigNum.js';
import { sound } from '../engine/AudioEngine.js';
import { rewards } from './rewards.js';
import {
  ChronicleSystem, CHAPTERS, PAGE_UPGRADES, PAGE_AETHER_MULT, CHRONICLE_TRANSCEND_GATE, SEAL_STANDIN_TRANSCENDS,
  getChallenge, describeRules, getSealGate, getChronicleTranscendsNeeded
} from '../systems/ChronicleSystem.js';
import { t } from '../i18n/index.js';

const setText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };
const setAttr = (el, k, v) => { if (el && el.getAttribute(k) !== v) el.setAttribute(k, v); };
const setHidden = (el, h) => { if (el && el.hidden !== h) el.hidden = h; };
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtBig = (d) => (d instanceof BigNum ? d : new BigNum(d)).format('standard', 0);
const SAND = '#e7c38a';   // --sand, for the reward toasts (they take a colour value)

function fmtMult(b) {
  if (b.lt(1e6)) {
    const n = b.toNumber();
    return `×${n >= 10 ? n.toLocaleString('en-US', { maximumFractionDigits: 1 }) : n.toFixed(2)}`;
  }
  return `×${b.format('scientific', 2)}`;
}

export function roman(n) {
  const map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  let x = Math.max(1, Math.floor(n));
  for (const [v, s] of map) while (x >= v) { out += s; x -= v; }
  return out;
}

export function fmtDuration(seconds) {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return t('dur.s', { n: s });
  const m = Math.floor(s / 60);
  if (m < 60) return t('dur.min', { n: m });
  const h = Math.floor(m / 60);
  if (h < 48) return t('dur.h_min', { h, m: String(m % 60).padStart(2, '0') });
  return t('dur.d_h', { d: Math.floor(h / 24), h: h % 24 });
}

function weeksLeft(ms) {
  const d = ms / 86400000;
  if (d >= 7) return t('chr.left.w', { n: Math.ceil(d / 7) });
  if (d >= 1) return t('chr.left.d', { n: Math.ceil(d) });
  return t('chr.left.h', { n: Math.max(1, Math.ceil(ms / 3600000)) });
}

const chipHtml = (r) => `<span class="chip ${r.good ? 'sand' : 'danger'}">${esc(r.text)}</span>`;

export class ChronicleUI {
  constructor(app) {
    this.app = app;
    this.timer = null;
    this.chEls = new Map();
    this.upEls = new Map();
  }

  get gs() { return this.app.gameState; }
  get sys() { return this.app.chronicleSystem; }

  init() {
    if (!this.app.chronicleSystem) {
      this.app.chronicleSystem = new ChronicleSystem(this.app.gameState, this.app.prestigeSystem);
    }
    this.gs.chronicleSystem = this.app.chronicleSystem;
    this.build();
    this.tick();
    if (!this.timer) this.timer = setInterval(() => this.tick(), 1000);
  }

  // Challenge goal and Chapter turnover (also in background tabs)
  tick() {
    const { stamps, cleared } = this.sys.tick();
    for (const ch of stamps) {
      rewards.notify({ tier: 'big', kind: 'chapter-stamp', icon: ch.icon, color: SAND, title: t('chr.stamped_toast', { name: ch.name }),
        amount: ch.stampPages, fmt: (n) => String(n), unit: t('hdr.pages'), detail: t('chr.stamped_detail') });
    }
    if (cleared) {
      const c = cleared.challenge;
      rewards.notify({
        tier: cleared.first ? 'big' : 'medium', kind: `challenge-${c.id}`, icon: c.icon, color: SAND,
        title: cleared.first ? t('chr.cleared', { name: c.name }) : `${c.name}: ${cleared.best ? t('chr.new_best') : t('chr.cleared_again')}`,
        amount: cleared.pages || undefined, fmt: (n) => String(n), unit: cleared.pages ? t('hdr.pages') : undefined,
        detail: t('chr.cleared_detail', { time: fmtDuration(cleared.seconds) })
      });
      this.app.updateBuildingsUI?.();
    }
  }

  challengeHtml(c) {
    return `
      <div class="chr-ch" data-ch="${c.id}">
        <div class="icon-tile" aria-hidden="true">${c.icon}</div>
        <div>
          <div class="n">${esc(c.name)} <span class="tag run" data-run hidden>${t('chron.block.running')}</span></div>
          <div class="r">${esc(c.desc)} ${t('chr.goal', { n: fmtBig(c.goal.runAether) })}</div>
          <div class="chr-ch-rules">${describeRules(c.rules).map(chipHtml).join('')}</div>
          <div class="bar sand" data-bar hidden><i></i></div>
          <div class="best num" data-best></div>
        </div>
        <div class="chr-ch-act">
          <span class="chip life" data-done hidden>✓ ${t('codex.done')}</span>
          <button class="btn btn-sm" data-start="${c.id}">${t('chr.start')}</button>
          <button class="btn btn-sm btn-danger" data-abandon hidden>${t('chr.abandon')}</button>
        </div>
      </div>`;
  }

  build() {
    const cont = document.getElementById('chronicle-section');
    if (!cont || cont.dataset.built) return;
    cont.dataset.built = '1';
    const chapter = CHAPTERS[0];
    const challenges = CHAPTERS.flatMap(ch => ch.challenges);

    cont.innerHTML = `
      <div class="chr-wrap">
        <section class="card chr-chapter" aria-labelledby="chr-title">
          <div class="eyebrow" data-c="eyebrow"></div>
          <h1 id="chr-title" data-c="title"></h1>
          <p class="chr-blurb" data-c="blurb"></p>
          <div class="chr-rules" data-c="rules"></div>
          <div class="chr-time">
            <div class="bar-row"><span class="dim" data-c="week"></span><span class="bar sand lg"><i data-c="weekFill"></i></span><span class="val" data-c="left"></span></div>
            <div class="chr-stats"><span class="chip gold num" data-c="pagesChip"></span><span class="chip sand num" data-c="multChip"></span></div>
          </div>
        </section>
        <div class="chr-row">
          <section class="card">
            <div class="card-head"><h2>${t('chr.challenges')}</h2><span class="chr-hint">${t('chr.challenges_hint')}</span></div>
            <p class="chr-note" data-c="chNote" style="margin:0 0 var(--sp-2)"></p>
            <div class="chr-stack">${challenges.map(c => this.challengeHtml(c)).join('')}</div>
          </section>
          <section class="card">
            <div class="card-head"><h2>${t('hdr.pages')}</h2><span class="chr-hint num" data-c="pagesHint"></span></div>
            <div class="chr-ptree">
              ${PAGE_UPGRADES.map(u => `<button type="button" class="chr-pnode" data-up="${u.id}"><b>${u.icon} ${esc(u.name)}</b>${esc(u.desc)}<span class="c num" data-cost></span></button>`).join('')}
              <div class="chr-pnode future" aria-hidden="true"><b>???</b>${t('chr.future')}<span class="c">—</span></div>
            </div>
            <div class="card card-flat chr-reset">
              <h3>${t('chr.reset_title')}</h3>
              <div class="chr-keep">
                <div><span class="c-life h">${t('chr.keeps')}</span><ul data-c="keeps"></ul></div>
                <div><span class="c-danger h">${t('chr.resets')}</span><ul data-c="resets"></ul></div>
              </div>
              <div class="bar-row chr-gate"><span data-c="gateLabel"></span><span class="bar sand"><i data-c="gateFill"></i></span><span class="val num" data-c="gateVal"></span></div>
              <div class="chr-note" data-c="sealNote"></div>
              <button type="button" class="btn btn-block chr-begin" data-c="begin"></button>
            </div>
          </section>
        </div>
      </div>`;

    const q = (sel) => cont.querySelector(sel);
    this.el = {};
    for (const node of cont.querySelectorAll('[data-c]')) this.el[node.dataset.c] = node;
    for (const c of challenges) {
      const row = q(`[data-ch="${c.id}"]`);
      this.chEls.set(c.id, {
        row, run: row.querySelector('[data-run]'), bar: row.querySelector('[data-bar]'), fill: row.querySelector('[data-bar] i'),
        best: row.querySelector('[data-best]'), done: row.querySelector('[data-done]'),
        start: row.querySelector('[data-start]'), abandon: row.querySelector('[data-abandon]')
      });
    }
    for (const u of PAGE_UPGRADES) {
      const el = q(`[data-up="${u.id}"]`);
      this.upEls.set(u.id, { el, cost: el.querySelector('[data-cost]') });
    }
    this.setList(this.el.keeps, this.sys.getPreview().keeps);
    this.setList(this.el.resets, this.sys.getPreview().resets);
    this.el.rules.innerHTML = describeRules(chapter.rules).map(chipHtml).join('');

    cont.addEventListener('click', (e) => {
      const tgt = e.target;
      const up = tgt.closest('[data-up]');
      if (up) return this.buyUpgrade(up.dataset.up);
      const st = tgt.closest('[data-start]');
      if (st) return this.startChallenge(st.dataset.start);
      if (tgt.closest('[data-abandon]')) return this.abandonChallenge();
      if (tgt.closest('[data-c="begin"]')) return this.openConfirm();
    });
    this.buildModal();
    this.update('chronicle');
  }

  setList(ul, items) {
    const key = items.join('\n');
    if (!ul || ul.dataset.key === key) return;
    ul.dataset.key = key;
    ul.replaceChildren(...items.map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
  }

  // --- actions ---

  buyUpgrade(id) {
    if (!this.sys.buyUpgrade(id)) return;
    const u = PAGE_UPGRADES.find(x => x.id === id);
    sound.playBuy();
    rewards.notify({ tier: 'medium', kind: 'page-upgrade', icon: u.icon, color: SAND, title: t('chr.page_toast', { name: u.name }), batchTitle: t('chr.page_batch') });
    this.update('chronicle');
  }

  startChallenge(id) {
    const reason = this.sys.getChallengeBlockReason(id);
    if (reason) return;
    const c = getChallenge(id);
    const msg = t('chr.start_q', { name: c.name }) + `\n\n${c.desc}\n` + t('chr.start_goal', { n: fmtBig(c.goal.runAether) }) + '\n\n' +
      t('chr.start_body');
    if (!confirm(msg)) return;
    if (!this.sys.startChallenge(id)) return;
    sound.playBuy();
    rewards.notify({ tier: 'medium', kind: 'challenge-start', icon: c.icon, color: SAND, title: t('chr.challenge_toast', { name: c.name }), detail: t('chr.reach', { n: fmtBig(c.goal.runAether) }) });
    this.app.updateBuildingsUI?.();
    this.update('chronicle');
  }

  abandonChallenge() {
    const c = getChallenge(this.gs.chronicle.active?.id);
    if (!c) return;
    if (!confirm(t('chr.abandon_q', { name: c.name }))) return;
    this.sys.abandonChallenge();
    this.app.updateBuildingsUI?.();
    this.update('chronicle');
  }

  // --- epic confirm (modal; bottom sheet on phone) ---

  buildModal() {
    if (document.getElementById('chr-confirm')) return;
    const scrim = document.createElement('div');
    scrim.className = 'chr-scrim';
    scrim.id = 'chr-confirm';
    scrim.hidden = true;
    scrim.innerHTML = `
      <div class="chr-modal" role="dialog" aria-modal="true" aria-labelledby="chr-confirm-title">
        <h2 id="chr-confirm-title"></h2>
        <p>${t('chr.modal_intro')}</p>
        <div class="chr-keep">
          <div><span class="c-life h">${t('chr.you_keep')}</span><ul data-m="keep"></ul></div>
          <div><span class="c-danger h">${t('tr.lose')}</span><ul data-m="lose"></ul></div>
        </div>
        <div class="actions"><button type="button" class="btn" data-m="no">${t('chr.not_yet')}</button><button type="button" class="btn btn-primary" data-m="yes"></button></div>
      </div>`;
    document.body.appendChild(scrim);
    this.modal = { scrim, title: scrim.querySelector('#chr-confirm-title') };
    for (const n of scrim.querySelectorAll('[data-m]')) this.modal[n.dataset.m] = n;
    scrim.addEventListener('click', (e) => {
      if (e.target === scrim || e.target.closest('[data-m="no"]')) this.closeConfirm();
      else if (e.target.closest('[data-m="yes"]')) this.doChronicle();
    });
    scrim.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.closeConfirm(); });
  }

  openConfirm() {
    if (!this.sys.canChronicle()) return;
    const p = this.sys.getPreview();
    const gs = this.gs;
    const name = t('chr.name', { n: roman(p.number) });
    setText(this.modal.title, t('chr.begin_q', { name }));
    setText(this.modal.yes, t('chr.begin', { name }));
    const features = Object.values(gs.dustShop?.ranks || {}).filter(r => r > 0).length;
    const keep = [
      t('chr.k.pages', { a: p.pagesBefore, b: p.pages, x: fmtMult(p.aetherMultBefore), y: fmtMult(p.aetherMultAfter) }),
      t('chr.k.wells', { n: gs.ascensionCount.toLocaleString('en-US') }),
      t('chr.k.places', { f: (gs.hero?.maxFloor || 1).toLocaleString('en-US'), d: (gs.miningGrid?.maxDepth || 0).toLocaleString('en-US') }),
      t('chron.keeps.5')
    ];
    if (p.keepsAutoAscend) keep.push(t('chr.k.bookmark'));
    if (p.startsChapter) keep.push(t('chr.k.chapter', { name: p.startsChapter.name }));
    const lose = [
      t('chr.l.reserves', { n: fmtBig(p.dust), f: features }),
      t('chr.l.shares', { n: p.shards, t: p.treeNodes }) + (p.shardsAfter ? ' ' + t('chr.l.start_with', { n: p.shardsAfter }) : ''),
      t('chr.l.fields', { n: p.transcends }),
      t('chr.l.run')
    ];
    this.setList(this.modal.keep, keep);
    this.setList(this.modal.lose, lose);
    this.lastFocus = document.activeElement;
    this.modal.scrim.hidden = false;
    this.modal.no.focus();
  }

  closeConfirm() {
    if (!this.modal || this.modal.scrim.hidden) return;
    this.modal.scrim.hidden = true;
    this.lastFocus?.focus?.();
  }

  doChronicle() {
    this.closeConfirm();
    const res = this.sys.chronicle();
    if (!res) return;
    rewards.notify({
      tier: 'epic', kind: 'chronicle', icon: '📖', color: SAND, title: t('chr.name', { n: roman(res.number) }),
      amount: res.pages, fmt: (n) => String(n), unit: t('chr.pages_unit'),
      detail: res.startedChapter ? t('chr.chapter_begins', { name: res.startedChapter.name }) : t('chr.ladder_again')
    });
    this.app.updateBuildingsUI?.();
    this.app.updatePrestigeUI?.();
    this.update('chronicle');
  }

  // --- per frame ---

  update(tab) {
    const gs = this.gs;
    const c = gs.chronicle;
    // Header currency (shown on this tab only)
    setText(document.getElementById('stat-pages'), String(c.pages));
    if (tab !== 'chronicle' || !this.el) return;
    const el = this.el;
    const sys = this.sys;

    // Chapter poster
    const st = sys.getChapterStatus();
    const ch = st ? st.chapter : CHAPTERS[0];
    setText(el.eyebrow, t('chr.eyebrow', { a: ch.number, b: Math.max(4, CHAPTERS.length) }));
    setText(el.title, ch.name);
    setText(el.blurb, ch.blurb);
    let week, left, pct;
    if (!st) { week = t('chr.begins_first'); left = t('chr.weeks', { n: ch.weeks }); pct = 0; }
    else if (st.running) { week = t('chr.week_of', { a: st.week, b: ch.weeks }); left = weeksLeft(st.msLeft); pct = st.pct; }
    else { week = t('chr.chapter_done'); left = t('chr.next_soon'); pct = 1; }
    setText(el.week, week);
    setText(el.left, left);
    const w = `${(pct * 100).toFixed(1)}%`;
    if (el.weekFill.style.width !== w) el.weekFill.style.width = w;
    setText(el.pagesChip, t('chr.pages_chip', { n: c.pages }));
    setText(el.multChip, t('chr.mult_chip', { x: fmtMult(new BigNum(PAGE_AETHER_MULT).pow(c.totalPages)), n: c.totalPages }));
    el.rules.classList.toggle('is-off', !!st && !st.running);

    // Challenges
    const active = c.active?.id || null;
    const opened = sys.getAvailableChapters().length > 0;
    setText(el.chNote, !opened ? t('chr.ch_closed', { name: CHAPTERS[0].name })
      : active ? t('chr.ch_running') : '');
    setHidden(el.chNote, opened && !active);
    const prog = sys.getChallengeProgress();
    for (const [id, refs] of this.chEls) {
      const def = getChallenge(id);
      const rec = c.challenges[id];
      const reason = sys.getChallengeBlockReason(id);
      const running = active === id;
      const done = !!rec?.done;
      refs.row.classList.toggle('run', running);
      refs.row.classList.toggle('done', done && !running);
      refs.row.classList.toggle('lock', !running && !!reason && !done && reason !== t('chron.block.other_running'));
      setHidden(refs.run, !running);
      setHidden(refs.bar, !running);
      setHidden(refs.abandon, !running);
      setHidden(refs.done, !done || running);
      setHidden(refs.start, running);
      const canStart = reason === null;
      refs.start.classList.toggle('is-locked', !canStart);
      setAttr(refs.start, 'aria-disabled', String(!canStart));
      setText(refs.start, done ? t('chr.replay') : t('chr.start'));
      setAttr(refs.start, 'title', canStart ? t('chr.start_name', { name: def.name }) : (reason || ''));
      let best;
      if (running && prog) {
        const f = `${(prog.pct * 100).toFixed(1)}%`;
        if (refs.fill.style.width !== f) refs.fill.style.width = f;
        best = t('chr.prog', { a: fmtBig(prog.have), b: fmtBig(prog.goal), time: fmtDuration((Date.now() - c.active.startedAt) / 1000) });
      } else if (done) {
        best = t('chr.best', { time: fmtDuration(rec.best), n: def.pages });
      } else if (reason && reason !== t('chron.block.running') && reason !== t('chron.block.other_running')) {
        best = `${reason[0].toUpperCase()}${reason.slice(1)} · ${t('chr.plus_pages', { n: def.pages })}`;
      } else {
        best = t('chr.not_cleared', { n: def.pages });
      }
      setText(refs.best, best);
    }

    // Pages tree
    setText(el.pagesHint, t(c.pages === 1 ? 'chr.pages_hint1' : 'chr.pages_hint', { n: c.pages }));
    for (const [id, refs] of this.upEls) {
      const u = PAGE_UPGRADES.find(x => x.id === id);
      const reason = sys.getUpgradeBlockReason(id);
      const state = reason === 'owned' ? 'own' : reason === null ? 'aff' : 'lock';
      for (const k of ['own', 'aff', 'lock']) refs.el.classList.toggle(k, k === state);
      setText(refs.cost, state === 'own' ? t('st.owned') : state === 'aff' ? t('chr.buy_pages', { n: u.cost }) : `${u.cost} 📜${reason && reason !== t('chron.block.pages', { n: u.cost }) ? ` · ${reason}` : ''}`);
      setAttr(refs.el, 'aria-disabled', String(state !== 'aff'));
      setAttr(refs.el, 'aria-label', `${u.name}: ${u.desc} ${state === 'own' ? t('st.owned') : state === 'aff' ? t('chr.buy_for_pages', { n: u.cost }) : reason}`);
    }

    // Gate and Begin
    const need = getChronicleTranscendsNeeded(gs);
    const fields = gs.transcendenceCount || 0;
    setText(el.gateLabel, t('chr.name', { n: roman(c.count + 1) }));
    const gp = `${Math.min(100, (100 * fields) / need).toFixed(1)}%`;
    if (el.gateFill.style.width !== gp) el.gateFill.style.width = gp;
    setText(el.gateVal, `${Math.min(fields, need)}/${need}`);
    const seal = getSealGate(gs);
    let note = t('chr.gate.needs', { n: CHRONICLE_TRANSCEND_GATE });
    if (seal.source === 'seals' && seal.sealsMet) note = t('chr.gate.lit', { total: seal.total, n: CHRONICLE_TRANSCEND_GATE });
    else if (seal.source === 'seals') note = t('chr.gate.seals', { n: CHRONICLE_TRANSCEND_GATE, total: seal.total, lit: seal.lit, alt: SEAL_STANDIN_TRANSCENDS });
    else if (seal.source === 'standin') note = t('chr.gate.standin', { need, n: CHRONICLE_TRANSCEND_GATE });
    setText(el.sealNote, note);
    const reason = sys.getBlockReason();
    const pages = sys.getPreview().pages;
    const can = reason === null;
    el.begin.classList.toggle('btn-primary', can);
    el.begin.classList.toggle('is-locked', !can);
    setAttr(el.begin, 'aria-disabled', String(!can));
    setText(el.begin, can
      ? `📖 ${t('chr.begin', { name: t('chr.name', { n: roman(c.count + 1) }) })} · ${t('chr.plus_pages', { n: pages })}`
      : `📖 ${t('chr.begin', { name: t('chr.name', { n: roman(c.count + 1) }) })} · ${reason}`);
  }
}

