// Constellations header (roadmap R9): where talent points come from and what is closest.
// Built once into #talent-sources (created under #talent-points-header), updated in place.
// Also polls S1 milestone stars once a second and pings the nav button when points are unspent.
import { rewards } from './rewards.js';
import {
  checkMilestones, getNextStars, guildTitle, onTalentGrant, ensureRecords, SOURCE_LABELS
} from '../systems/TalentSources.js';

const setText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };

// Layout-only rules; colours, chips, cards and bars come from css/tokens.css and css/components.css
const STYLE = `
.ts-earned { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin-bottom: var(--sp-3); }
.ts-row { display: grid; gap: var(--sp-1); margin-bottom: var(--sp-3); }
.ts-row .top { display: flex; justify-content: space-between; gap: var(--sp-2); font-size: var(--fs-13); color: var(--text-1); }
.ts-row .top .t { color: var(--text-3); white-space: nowrap; }
.ts-note { margin: var(--sp-2) 0 0; font-size: var(--fs-12); color: var(--text-3); }
`;

export class TalentSourcesPanel {
  constructor(app) {
    this.app = app;
    this.acc = 0;
    this.built = false;
    this.rows = [];
    // Medium-tier toast (R11 reward grammar); same-kind grants in one moment coalesce
    onTalentGrant(({ amount, reason }) => {
      rewards.notify({
        tier: 'medium', kind: 'talent-point', icon: '✨', color: '#ec4899',
        title: reason || 'Talent Point', amount, unit: amount > 1 ? 'Talent Points' : 'Talent Point',
        fmt: (n) => String(n), source: 'tp-avail-count'
      });
    });
  }

  get gs() { return this.app.gameState; }

  build() {
    const header = document.getElementById('talent-points-header');
    if (!header || this.built) return;
    this.built = true;
    if (!document.getElementById('ts-style')) {
      const st = document.createElement('style');
      st.id = 'ts-style';
      st.textContent = STYLE;
      document.head.appendChild(st);
    }
    const box = document.createElement('div');
    box.id = 'talent-sources';
    box.className = 'card card-flat';
    box.style.margin = 'var(--sp-3) 0 var(--sp-4)';
    box.innerHTML = `
      <div class="eyebrow">Where points come from</div>
      <div class="ts-earned"><span class="chip dust num" id="ts-e-stars"></span><span class="chip dust num" id="ts-e-record"></span><span class="chip dust num" id="ts-e-guild"></span></div>
      <div class="eyebrow" style="margin-bottom: var(--sp-2)">Next stars</div>
      <div id="ts-next"></div>
      <div class="ts-note">Points come from Milestone Stars (first Ascension, depth, Tower zones, first harvests, Catalysts, Transcend), Record Ascension (each 10x of your best single-run dust) and Guild Rank (contracts claimed). Ascending alone pays nothing.</div>`;
    header.insertAdjacentElement('afterend', box);
    this.el = {
      stars: box.querySelector('#ts-e-stars'), record: box.querySelector('#ts-e-record'),
      guild: box.querySelector('#ts-e-guild'), next: box.querySelector('#ts-next')
    };
    for (let i = 0; i < 3; i++) {
      const row = document.createElement('div');
      row.className = 'ts-row';
      row.innerHTML = '<div class="top"><span class="l"></span><span class="t num"></span></div><div class="bar dust"><i></i></div>';
      this.el.next.appendChild(row);
      this.rows.push({ row, l: row.querySelector('.l'), t: row.querySelector('.t'), f: row.querySelector('.bar > i') });
    }
    this.render();
  }

  render() {
    if (!this.built) return;
    const gs = this.gs;
    const rec = ensureRecords(gs);
    const e = rec.earned;
    setText(this.el.stars, `${SOURCE_LABELS.stars}: ${e.stars} TP`);
    setText(this.el.record, `${SOURCE_LABELS.record}: ${e.record} TP`);
    setText(this.el.guild, `${SOURCE_LABELS.guild} ${rec.guildRank} (${guildTitle(rec.guildRank)}): ${e.guild} TP`);
    const next = getNextStars(gs, 3, this.app.prestigeSystem?.getTranscendGate?.());
    this.rows.forEach((r, i) => {
      const n = next[i];
      r.row.style.display = n ? '' : 'none';
      if (!n) return;
      setText(r.l, `${n.label} (+${n.tp} TP)`);
      setText(r.t, n.text);
      const w = `${(n.progress * 100).toFixed(1)}%`;
      if (r.f.style.width !== w) r.f.style.width = w;
    });
  }

  // Called from the render tick
  update(dt, currentTab) {
    this.acc += dt;
    if (this.acc < 1) return;
    this.acc = 0;
    checkMilestones(this.gs);
    if (currentTab === 'talents') this.render();
    if (this.tabBtn === undefined) this.tabBtn = document.querySelector('.nav-tab[data-tab="talents"]');
    const pip = this.gs.talentPoints > 0 && currentTab !== 'talents';
    if (this.tabBtn && this.tabBtn.classList.contains('has-notif') !== pip) this.tabBtn.classList.toggle('has-notif', pip);
  }
}
