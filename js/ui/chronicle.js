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

const setText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };
const setAttr = (el, k, v) => { if (el && el.getAttribute(k) !== v) el.setAttribute(k, v); };
const setHidden = (el, h) => { if (el && el.hidden !== h) el.hidden = h; };
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtBig = (d) => (d instanceof BigNum ? d : new BigNum(d)).format('standard', 0);
const SAND = '#e7c38a';   // --sand, for the reward toasts (they take a colour value)

function fmtMult(b) {
  if (b.lt(1e6)) {
    const n = b.toNumber();
    return `×${n >= 10 ? n.toLocaleString(undefined, { maximumFractionDigits: 1 }) : n.toFixed(2)}`;
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
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h ${String(m % 60).padStart(2, '0')} min`;
  return `${Math.floor(h / 24)} d ${h % 24} h`;
}

function weeksLeft(ms) {
  const d = ms / 86400000;
  if (d >= 7) return `${Math.ceil(d / 7)} w left`;
  if (d >= 1) return `${Math.ceil(d)} d left`;
  return `${Math.max(1, Math.ceil(ms / 3600000))} h left`;
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
      rewards.notify({ tier: 'big', kind: 'chapter-stamp', icon: ch.icon, color: SAND, title: `${ch.name}: stamped`,
        amount: ch.stampPages, fmt: (n) => String(n), unit: 'Pages', detail: 'The Chapter is over; its challenges stay open.' });
    }
    if (cleared) {
      const c = cleared.challenge;
      rewards.notify({
        tier: cleared.first ? 'big' : 'medium', kind: `challenge-${c.id}`, icon: c.icon, color: SAND,
        title: cleared.first ? `Challenge cleared: ${c.name}` : `${c.name}: ${cleared.best ? 'new best' : 'cleared again'}`,
        amount: cleared.pages || undefined, fmt: (n) => String(n), unit: cleared.pages ? 'Pages' : undefined,
        detail: `${fmtDuration(cleared.seconds)}. Your run is back.`
      });
      this.app.updateBuildingsUI?.();
    }
  }

  challengeHtml(c) {
    return `
      <div class="chr-ch" data-ch="${c.id}">
        <div class="icon-tile" aria-hidden="true">${c.icon}</div>
        <div>
          <div class="n">${esc(c.name)} <span class="tag run" data-run hidden>running</span></div>
          <div class="r">${esc(c.desc)} Reach ${fmtBig(c.goal.runAether)} Aether in the challenge run.</div>
          <div class="chr-ch-rules">${describeRules(c.rules).map(chipHtml).join('')}</div>
          <div class="bar sand" data-bar hidden><i></i></div>
          <div class="best num" data-best></div>
        </div>
        <div class="chr-ch-act">
          <span class="chip life" data-done hidden>✓ Done</span>
          <button class="btn btn-sm" data-start="${c.id}">Start</button>
          <button class="btn btn-sm btn-danger" data-abandon hidden>Abandon</button>
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
            <div class="card-head"><h2>Challenges</h2><span class="chr-hint">Side runs with their own rules · Pages on the first clear</span></div>
            <p class="chr-note" data-c="chNote" style="margin:0 0 var(--sp-2)"></p>
            <div class="chr-stack">${challenges.map(c => this.challengeHtml(c)).join('')}</div>
          </section>
          <section class="card">
            <div class="card-head"><h2>Pages</h2><span class="chr-hint num" data-c="pagesHint"></span></div>
            <div class="chr-ptree">
              ${PAGE_UPGRADES.map(u => `<button type="button" class="chr-pnode" data-up="${u.id}"><b>${u.icon} ${esc(u.name)}</b>${esc(u.desc)}<span class="c num" data-cost></span></button>`).join('')}
              <div class="chr-pnode future" aria-hidden="true"><b>???</b>More Page upgrades arrive with Chapter 2<span class="c">—</span></div>
            </div>
            <div class="card card-flat chr-reset">
              <h3>A Chronicle reset</h3>
              <div class="chr-keep">
                <div><span class="c-life h">Keeps</span><ul data-c="keeps"></ul></div>
                <div><span class="c-danger h">Resets</span><ul data-c="resets"></ul></div>
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
      const t = e.target;
      const up = t.closest('[data-up]');
      if (up) return this.buyUpgrade(up.dataset.up);
      const st = t.closest('[data-start]');
      if (st) return this.startChallenge(st.dataset.start);
      if (t.closest('[data-abandon]')) return this.abandonChallenge();
      if (t.closest('[data-c="begin"]')) return this.openConfirm();
    });
    this.buildModal();
    this.update('chronicle');
  }

  setList(ul, items) {
    const key = items.join('\n');
    if (!ul || ul.dataset.key === key) return;
    ul.dataset.key = key;
    ul.replaceChildren(...items.map(t => { const li = document.createElement('li'); li.textContent = t; return li; }));
  }

  // --- actions ---

  buyUpgrade(id) {
    if (!this.sys.buyUpgrade(id)) return;
    const u = PAGE_UPGRADES.find(x => x.id === id);
    sound.playBuy();
    rewards.notify({ tier: 'medium', kind: 'page-upgrade', icon: u.icon, color: SAND, title: `Page upgrade: ${u.name}`, batchTitle: '{n} Page upgrades' });
    this.update('chronicle');
  }

  startChallenge(id) {
    const reason = this.sys.getChallengeBlockReason(id);
    if (reason) return;
    const c = getChallenge(id);
    const msg = `Start "${c.name}"?\n\n${c.desc}\nGoal: ${fmtBig(c.goal.runAether)} Aether in a fresh run, with dust, shard and Page bonuses off.\n\n` +
      'Your current run (Aether and generators) is set aside and comes back exactly as it is when the challenge ends or you abandon it. ' +
      'Ascending, Transcending and the 6 h Fast Forward wait until then. Everything else keeps running.';
    if (!confirm(msg)) return;
    if (!this.sys.startChallenge(id)) return;
    sound.playBuy();
    rewards.notify({ tier: 'medium', kind: 'challenge-start', icon: c.icon, color: SAND, title: `Challenge: ${c.name}`, detail: `Reach ${fmtBig(c.goal.runAether)} Aether` });
    this.app.updateBuildingsUI?.();
    this.update('chronicle');
  }

  abandonChallenge() {
    const c = getChallenge(this.gs.chronicle.active?.id);
    if (!c) return;
    if (!confirm(`Abandon "${c.name}"? The challenge run ends and your main run comes back exactly as you left it.`)) return;
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
        <p>This is the rare one. Read both columns.</p>
        <div class="chr-keep">
          <div><span class="c-life h">You keep</span><ul data-m="keep"></ul></div>
          <div><span class="c-danger h">You reset</span><ul data-m="lose"></ul></div>
        </div>
        <div class="actions"><button type="button" class="btn" data-m="no">Not yet</button><button type="button" class="btn btn-primary" data-m="yes"></button></div>
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
    const name = `Chronicle ${roman(p.number)}`;
    setText(this.modal.title, `Begin ${name}?`);
    setText(this.modal.yes, `Begin ${name}`);
    const features = Object.values(gs.dustShop?.ranks || {}).filter(r => r > 0).length;
    const keep = [
      `${p.pagesBefore} Pages earned + ${p.pages} new (Aether ${fmtMult(p.aetherMultBefore)} → ${fmtMult(p.aetherMultAfter)})`,
      `${gs.ascensionCount.toLocaleString()} Ascensions, talents, Codex and achievements`,
      `Floor ${(gs.hero?.maxFloor || 1).toLocaleString()}, depth ${(gs.miningGrid?.maxDepth || 0).toLocaleString()}, Garden, Guild, Bazaar`,
      'Wardens and Garden breeding stay unlocked'
    ];
    if (p.keepsAutoAscend) keep.push('Auto-Ascend (Bookmark)');
    if (p.startsChapter) keep.push(`Chapter 1 begins: ${p.startsChapter.name}`);
    const lose = [
      `${fmtBig(p.dust)} lifetime dust, ${features} Dust Shop feature${features === 1 ? '' : 's'}`,
      `${p.shards} shards${p.shardsAfter ? ` (you start with ${p.shardsAfter})` : ''}, ${p.treeNodes} shard tree node${p.treeNodes === 1 ? '' : 's'}`,
      `${p.transcends} Transcends: back to 14 generator tiers`,
      'The current run'
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
      tier: 'epic', kind: 'chronicle', icon: '📖', color: SAND, title: `Chronicle ${roman(res.number)}`,
      amount: res.pages, fmt: (n) => String(n), unit: 'Chronicle Pages',
      detail: res.startedChapter ? `${res.startedChapter.name} begins` : 'The ladder starts again'
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
    setText(el.eyebrow, `Chapter ${ch.number} of ${Math.max(4, CHAPTERS.length)} · Season`);
    setText(el.title, ch.name);
    setText(el.blurb, ch.blurb);
    let week, left, pct;
    if (!st) { week = 'Begins with your first Chronicle'; left = `${ch.weeks} w`; pct = 0; }
    else if (st.running) { week = `Week ${st.week} of ${ch.weeks}`; left = weeksLeft(st.msLeft); pct = st.pct; }
    else { week = 'Chapter complete · stamped'; left = 'Next Chapter soon'; pct = 1; }
    setText(el.week, week);
    setText(el.left, left);
    const w = `${(pct * 100).toFixed(1)}%`;
    if (el.weekFill.style.width !== w) el.weekFill.style.width = w;
    setText(el.pagesChip, `📜 Pages ${c.pages}`);
    setText(el.multChip, `${fmtMult(new BigNum(PAGE_AETHER_MULT).pow(c.totalPages))} Aether from ${c.totalPages} Pages`);
    el.rules.classList.toggle('is-off', !!st && !st.running);

    // Challenges
    const active = c.active?.id || null;
    const opened = sys.getAvailableChapters().length > 0;
    setText(el.chNote, !opened ? `Challenges open with ${CHAPTERS[0].name}, at your first Chronicle.`
      : active ? 'A challenge is running: Ascend and Transcend wait until it ends. Your main run is safe.' : '');
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
      refs.row.classList.toggle('lock', !running && !!reason && !done && reason !== 'another challenge is running');
      setHidden(refs.run, !running);
      setHidden(refs.bar, !running);
      setHidden(refs.abandon, !running);
      setHidden(refs.done, !done || running);
      setHidden(refs.start, running);
      const canStart = reason === null;
      refs.start.classList.toggle('is-locked', !canStart);
      setAttr(refs.start, 'aria-disabled', String(!canStart));
      setText(refs.start, done ? 'Replay' : 'Start');
      setAttr(refs.start, 'title', canStart ? `Start ${def.name}` : (reason || ''));
      let best;
      if (running && prog) {
        const f = `${(prog.pct * 100).toFixed(1)}%`;
        if (refs.fill.style.width !== f) refs.fill.style.width = f;
        best = `${fmtBig(prog.have)} / ${fmtBig(prog.goal)} Aether · ${fmtDuration((Date.now() - c.active.startedAt) / 1000)}`;
      } else if (done) {
        best = `Best ${fmtDuration(rec.best)} · +${def.pages} Pages ✓`;
      } else if (reason && reason.startsWith('opens')) {
        best = `${reason[0].toUpperCase()}${reason.slice(1)} · +${def.pages} Pages`;
      } else {
        best = `Not cleared · +${def.pages} Pages`;
      }
      setText(refs.best, best);
    }

    // Pages tree
    setText(el.pagesHint, `Permanent · ${c.pages} Page${c.pages === 1 ? '' : 's'} to spend`);
    for (const [id, refs] of this.upEls) {
      const u = PAGE_UPGRADES.find(x => x.id === id);
      const reason = sys.getUpgradeBlockReason(id);
      const state = reason === 'owned' ? 'own' : reason === null ? 'aff' : 'lock';
      for (const k of ['own', 'aff', 'lock']) refs.el.classList.toggle(k, k === state);
      setText(refs.cost, state === 'own' ? 'Owned' : state === 'aff' ? `Buy · ${u.cost} 📜` : `${u.cost} 📜${reason && !reason.startsWith('needs ' + u.cost) ? ` · ${reason}` : ''}`);
      setAttr(refs.el, 'aria-disabled', String(state !== 'aff'));
      setAttr(refs.el, 'aria-label', `${u.name}: ${u.desc} ${state === 'own' ? 'Owned' : state === 'aff' ? `Buy for ${u.cost} Pages` : reason}`);
    }

    // Gate and Begin
    const need = getChronicleTranscendsNeeded(gs);
    const t = gs.transcendenceCount || 0;
    setText(el.gateLabel, `Chronicle ${roman(c.count + 1)}`);
    const gp = `${Math.min(100, (100 * t) / need).toFixed(1)}%`;
    if (el.gateFill.style.width !== gp) el.gateFill.style.width = gp;
    setText(el.gateVal, `${Math.min(t, need)}/${need}`);
    const seal = getSealGate(gs);
    let note = `Needs ${CHRONICLE_TRANSCEND_GATE} Transcends this Chronicle.`;
    if (seal.source === 'seals' && seal.sealsMet) note = `All ${seal.total} Seals of Transcendence are lit: ${CHRONICLE_TRANSCEND_GATE} Transcends open your first Chronicle.`;
    else if (seal.source === 'seals') note = `Needs ${CHRONICLE_TRANSCEND_GATE} Transcends and all ${seal.total} Seals of Transcendence (${seal.lit} lit), or ${SEAL_STANDIN_TRANSCENDS} Transcends without them. After the first Chronicle, ${CHRONICLE_TRANSCEND_GATE} is enough.`;
    else if (seal.source === 'standin') note = `Your first Chronicle needs ${need} Transcends; after it, ${CHRONICLE_TRANSCEND_GATE} is enough.`;
    setText(el.sealNote, note);
    const reason = sys.getBlockReason();
    const pages = sys.getPreview().pages;
    const can = reason === null;
    el.begin.classList.toggle('btn-primary', can);
    el.begin.classList.toggle('is-locked', !can);
    setAttr(el.begin, 'aria-disabled', String(!can));
    setText(el.begin, can
      ? `📖 Begin Chronicle ${roman(c.count + 1)} · +${pages} Pages`
      : `📖 Begin Chronicle ${roman(c.count + 1)} · ${reason}`);
  }
}

