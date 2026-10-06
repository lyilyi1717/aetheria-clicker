// Constellations header (roadmap R9): where talent points come from and what is closest.
// Built once into #talent-sources (created under #talent-points-header), updated in place.
// Also polls S1 milestone stars once a second and pings the nav button when points are unspent.
import { rewards } from './rewards.js';
import {
  checkMilestones, getNextStars, guildTitle, onTalentGrant, ensureRecords, SOURCE_LABELS
} from '../systems/TalentSources.js';

const setText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };

const STYLE = `
.ts-box { margin: 0.5rem 0 1rem; padding: 0.7rem 0.8rem; border-radius: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); font-size: 0.9rem; }
.ts-earned { display: flex; flex-wrap: wrap; gap: 0.2rem 1rem; color: var(--text-muted); }
.ts-earned span { overflow-wrap: break-word; }
.ts-next-h { margin: 0.6rem 0 0.3rem; font-weight: 700; color: var(--text-muted); }
.ts-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0.1rem 0.6rem; margin-bottom: 0.45rem; }
.ts-row .l { overflow-wrap: break-word; }
.ts-row .t { color: var(--text-dim); font-variant-numeric: tabular-nums; white-space: nowrap; }
.ts-bar { grid-column: 1 / -1; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.08); overflow: hidden; }
.ts-fill { height: 100%; width: 0; background: linear-gradient(90deg, var(--accent-purple), var(--accent-gold)); }
.ts-note { margin-top: 0.4rem; font-size: 0.78rem; color: var(--text-dim); }
@media (max-width: 600px) { .ts-row { grid-template-columns: minmax(0, 1fr); } .ts-row .t { white-space: normal; } }
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
    box.className = 'ts-box';
    box.innerHTML = `
      <div class="ts-earned"><span id="ts-e-stars"></span><span id="ts-e-record"></span><span id="ts-e-guild"></span></div>
      <div class="ts-next-h">Next stars:</div>
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
      row.innerHTML = '<span class="l"></span><span class="t"></span><div class="ts-bar"><div class="ts-fill"></div></div>';
      this.el.next.appendChild(row);
      this.rows.push({ row, l: row.querySelector('.l'), t: row.querySelector('.t'), f: row.querySelector('.ts-fill') });
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
