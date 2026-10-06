// Codex tab (R14): the achievement ladder, collections and the Generator Codex. main.js builds
// this once and calls update() while the Codex tab is open (about once a second). Each pane is
// re-rendered only when its content changed, and the pane switcher lives outside the panes.
import { ACHIEVEMENTS, LADDER_GROUPS, LEGACY_BONUS, LADDER_BONUS } from '../systems/AchievementSystem.js';
import { SET_BONUS, GENERATOR_MILESTONES } from '../systems/CollectionSystem.js';

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct1 = (n) => `${n.toFixed(1)}%`;

const PANES = [['ladder', 'Achievements'], ['collections', 'Collections'], ['generators', 'Generator Codex']];

export class CodexUI {
  constructor(app) {
    this.app = app;
    this.pane = 'ladder';
    try { this.pane = localStorage.getItem('aetheria_codex_pane') || 'ladder'; } catch (e) { /* storage unavailable */ }
    if (!PANES.some(p => p[0] === this.pane)) this.pane = 'ladder';
    this.cache = {};
  }

  get gs() { return this.app.gameState; }
  get collections() { return this.app.collectionSystem; }

  build() {
    this.root = document.getElementById('codex-root');
    if (!this.root) return;
    this.ensureStylesheet();
    this.root.innerHTML = `
      <div class="codex-summary" id="codex-summary"></div>
      <div class="seg codex-seg" role="group" aria-label="Codex sections">
        ${PANES.map(([id, label]) => `<button type="button" data-pane="${id}" aria-pressed="false">${label}</button>`).join('')}
      </div>
      ${PANES.map(([id]) => `<div class="codex-pane" id="codex-pane-${id}"></div>`).join('')}`;
    this.root.querySelectorAll('.codex-seg button').forEach(btn => btn.addEventListener('click', () => {
      this.pane = btn.dataset.pane;
      try { localStorage.setItem('aetheria_codex_pane', this.pane); } catch (e) { /* ignore */ }
      this.update();
    }));
    this.update();
  }

  ensureStylesheet() {
    if (document.getElementById('codex-css')) return;
    const link = document.createElement('link');
    link.id = 'codex-css';
    link.rel = 'stylesheet';
    link.href = 'css/codex.css';
    document.head.appendChild(link);
  }

  setHtml(key, el, html) {
    if (!el || this.cache[key] === html) return;
    this.cache[key] = html;
    el.innerHTML = html;
  }

  update() {
    if (!this.root) return;
    const progress = this.collections.getCodexProgress();
    const bonus = this.app.achievementSystem.getBonusMultiplier() - 1;
    this.setHtml('summary', document.getElementById('codex-summary'), `
      <div class="eyebrow">Codex complete</div>
      <div class="codex-pct num">${pct1(progress.percent)}</div>
      <div class="bar-row"><div class="bar gold lg"><i style="width:${progress.percent.toFixed(1)}%"></i></div>
        <span class="val num">${progress.have}/${progress.total}</span></div>
      <div class="codex-chips">
        <span class="chip">${progress.ladderHave}/${progress.ladderTotal} achievements</span>
        <span class="chip">${progress.setsDone}/${progress.setsTotal} collections</span>
        <span class="chip gold">+${(bonus * 100).toFixed(1)}% Aether</span>
      </div>`);
    this.root.querySelectorAll('.codex-seg button').forEach(b => {
      b.setAttribute('aria-pressed', b.dataset.pane === this.pane ? 'true' : 'false');
    });
    for (const [id] of PANES) {
      const el = document.getElementById(`codex-pane-${id}`);
      el.hidden = id !== this.pane;
      if (id === this.pane) this.setHtml(id, el, this[`render_${id}`]());
    }
  }

  render_ladder() {
    const saved = this.gs.achievements || {};
    const info = `<p class="codex-note">Each original achievement gives +${LEGACY_BONUS * 100}% Aether, each new rung +${LADDER_BONUS * 100}%. Rungs are earned by playing and never expire.</p>`;
    return info + LADDER_GROUPS.map(g => {
      const list = ACHIEVEMENTS.filter(a => a.group === g.id);
      const have = list.filter(a => saved[a.id]).length;
      let nextShown = false;
      const rows = list.map(a => {
        const done = !!saved[a.id];
        const next = !done && !nextShown;
        if (next) nextShown = true;
        const cls = done ? 'is-owned' : next ? 'is-next' : 'is-locked';
        const state = done ? '<span class="tag">Done</span>' : next ? '<span class="tag tier">Next</span>' : '';
        return `<div class="card-row codex-ach ${cls}">
          <div class="icon-tile sm">${done || next ? a.icon : '🔒'}</div>
          <div class="codex-text"><div class="codex-name">${done || next ? esc(a.name) : 'Locked rung'}</div>
            <div class="codex-desc">${esc(a.desc)}</div></div>${state}</div>`;
      }).join('');
      return `<section class="codex-group"><div class="card-head"><h4>${esc(g.label)}</h4><span class="chip num">${have}/${list.length}</span></div>
        <div class="codex-list">${rows}</div></section>`;
    }).join('');
  }

  render_collections() {
    const sets = this.collections.getCollections().filter(c => !c.id.startsWith('generators_'));
    return `<p class="codex-note">Each finished set gives +${SET_BONUS * 100}% Aether. Entries fill from what you have already done, so older saves arrive with theirs.</p>` +
      sets.map(c => `<section class="card codex-set ${c.complete ? 'card-brand' : ''}">
        <div class="card-head"><h4>${c.icon} ${esc(c.name)}</h4>
          <span class="chip ${c.complete ? 'gold' : ''} num">${c.have}/${c.total}${c.complete ? ' ★ Complete' : c.total - c.have === 1 ? ' (1 to go)' : ''}</span></div>
        <div class="codex-desc">${esc(c.blurb)} <em>${esc(c.where)}</em></div>
        <div class="codex-entries">${c.entries.map(e => `<div class="card-row codex-entry ${e.have ? 'is-owned' : 'is-locked'}" title="${esc(e.hint)}">
          <div class="icon-tile sm">${e.have ? e.icon : '❔'}</div>
          <div class="codex-text"><div class="codex-name">${e.have ? esc(e.name) : 'Not found yet'}</div>
            <div class="codex-desc">${e.have ? 'Collected' : esc(e.hint)}</div></div></div>`).join('')}</div></section>`).join('');
  }

  render_generators() {
    const rows = this.collections.getGeneratorCodex();
    const all = this.collections.getCollections();
    const sets = GENERATOR_MILESTONES.map(n => {
      const c = all.find(x => x.id === `generators_${n}`);
      return `<span class="chip ${c.complete ? 'gold' : ''} num">x${n}: ${c.have}/${c.total}${c.complete ? ' ★' : ''}</span>`;
    }).join('');
    return `<p class="codex-note">Own ${GENERATOR_MILESTONES.join(' / ')} of a generator to earn its stars and read its entry. Your best count is kept through Ascensions. Finishing a whole column gives +${SET_BONUS * 100}% Aether.</p>
      <div class="codex-chips">${sets}</div>
      <div class="codex-gens">${rows.map(r => `<div class="card-row codex-gen ${r.silhouette ? 'is-locked silhouette' : r.stars === 3 ? 'is-owned' : ''}">
        <div class="icon-tile">${r.silhouette ? '<span class="cg-shape">' + r.icon + '</span>' : r.icon}</div>
        <div class="codex-text">
          <div class="codex-name">${r.silhouette ? 'Unknown generator' : esc(r.name)} <span class="tag tier">Tier ${r.tier}</span></div>
          <div class="codex-desc">${r.silhouette ? (r.tierLocked ? 'Opens with a later Transcend.' : 'Build one to reveal it.') : esc(r.flavour)}</div>
          <div class="cg-stars">${r.milestones.map(m => `<span class="num ${m.done ? 'on' : ''}">${m.done ? '★' : '☆'} ${m.n}</span>`).join('')}
            ${r.best ? `<span class="num cg-best">best ${r.best.toLocaleString('en-US')}</span>` : ''}</div>
        </div></div>`).join('')}</div>`;
  }
}
