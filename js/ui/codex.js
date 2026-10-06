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
      <div class="codex-tabs" role="tablist">
        ${PANES.map(([id, label]) => `<button class="codex-tab" role="tab" data-pane="${id}">${label}</button>`).join('')}
      </div>
      ${PANES.map(([id]) => `<div class="codex-pane" id="codex-pane-${id}" role="tabpanel"></div>`).join('')}`;
    this.root.querySelectorAll('.codex-tab').forEach(btn => btn.addEventListener('click', () => {
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
      <div class="codex-pct"><strong>${pct1(progress.percent)}</strong> Codex complete</div>
      <div class="codex-bar"><span style="width:${progress.percent.toFixed(1)}%"></span></div>
      <div class="codex-sub">${progress.ladderHave}/${progress.ladderTotal} achievements, ${progress.setsDone}/${progress.setsTotal} collections.
        Bonus: <strong>+${(bonus * 100).toFixed(1)}% Aether</strong></div>`);
    this.root.querySelectorAll('.codex-tab').forEach(b => {
      const on = b.dataset.pane === this.pane;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    for (const [id] of PANES) {
      const el = document.getElementById(`codex-pane-${id}`);
      el.hidden = id !== this.pane;
      if (id === this.pane) this.setHtml(id, el, this[`render_${id}`]());
    }
  }

  render_ladder() {
    const saved = this.gs.achievements || {};
    const info = `<p class="codex-note">Each original achievement gives +${LEGACY_BONUS * 100}% Aether, each new rung +${LADDER_BONUS * 100}%. Every rung is earned by playing; nothing here expires.</p>`;
    return info + LADDER_GROUPS.map(g => {
      const list = ACHIEVEMENTS.filter(a => a.group === g.id);
      const have = list.filter(a => saved[a.id]).length;
      let nextShown = false;
      const cards = list.map(a => {
        const done = !!saved[a.id];
        const next = !done && !nextShown;
        if (next) nextShown = true;
        const cls = done ? 'unlocked' : next ? 'locked next' : 'locked';
        return `<div class="ach-card codex-ach ${cls}">
          <div class="a-icon">${done || next ? a.icon : '🔒'}</div>
          <div class="a-name">${done || next ? esc(a.name) : '???'}</div>
          <div class="a-desc">${esc(a.desc)}</div></div>`;
      }).join('');
      return `<div class="codex-group"><div class="codex-group-head"><h4>${esc(g.label)}</h4><span>${have}/${list.length}</span></div>
        <div class="achievements-grid">${cards}</div></div>`;
    }).join('');
  }

  render_collections() {
    const sets = this.collections.getCollections().filter(c => !c.id.startsWith('generators_'));
    return `<p class="codex-note">Each finished set gives +${SET_BONUS * 100}% Aether. Entries fill from what you have already done, so older saves arrive with theirs.</p>` +
      sets.map(c => `<div class="codex-set ${c.complete ? 'complete' : ''}">
        <div class="codex-group-head"><h4>${c.icon} ${esc(c.name)}</h4><span>${c.have}/${c.total}${c.complete ? ' ★' : c.total - c.have === 1 ? ' (1 to go)' : ''}</span></div>
        <div class="codex-sub">${esc(c.blurb)} <em>${esc(c.where)}</em></div>
        <div class="codex-entries">${c.entries.map(e => `<div class="codex-entry ${e.have ? 'have' : ''}" title="${esc(e.hint)}">
          <span class="ce-icon">${e.have ? e.icon : '❔'}</span>
          <span class="ce-name">${e.have ? esc(e.name) : '???'}</span>
          <span class="ce-hint">${e.have ? '' : esc(e.hint)}</span></div>`).join('')}</div></div>`).join('');
  }

  render_generators() {
    const rows = this.collections.getGeneratorCodex();
    const all = this.collections.getCollections();
    const sets = GENERATOR_MILESTONES.map(n => {
      const c = all.find(x => x.id === `generators_${n}`);
      return `x${n}: ${c.have}/${c.total}${c.complete ? ' ★' : ''}`;
    }).join(' &middot; ');
    return `<p class="codex-note">Own ${GENERATOR_MILESTONES.join(' / ')} of a generator to fill its stars and read its entry. Your best count is kept through Ascensions. Completing a whole column gives +${SET_BONUS * 100}% Aether. ${sets}</p>
      <div class="codex-gens">${rows.map(r => `<div class="codex-gen ${r.silhouette ? 'silhouette' : ''}">
        <div class="cg-icon">${r.icon}</div>
        <div class="cg-main">
          <div class="cg-name">${r.silhouette ? '???' : esc(r.name)} <span class="cg-tier">Tier ${r.tier}</span></div>
          <div class="cg-flavour">${r.silhouette ? (r.tierLocked ? 'Unlocks with a later Transcend.' : 'Not built yet.') : esc(r.flavour)}</div>
          <div class="cg-stars">${r.milestones.map(m => `<span class="${m.done ? 'on' : ''}" title="Own ${m.n}">${m.done ? '★' : '☆'} ${m.n}</span>`).join('')}
            ${r.best ? `<span class="cg-best">best ${r.best.toLocaleString('en-US')}</span>` : ''}</div>
        </div></div>`).join('')}</div>`;
  }
}
