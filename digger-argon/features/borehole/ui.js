// Dig feature "borehole": UI wiring and Alqahwa Monument Widget
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { getGlobalDepth, getNextMilestone, syncBorehole, isFestivalActive } from './rules.js';

const { t, fmt } = G;

ui({
  id: 'borehole',
  css: new URL('./borehole.css', import.meta.url).href,
  panels: [
    {
      id: 'borehole',
      elId: 'borehole-panel',
      at: 40,
      tab: 'camp',
      title: 'borehole_title',
      when: () => true,
      build(el, app) {
        el.innerHTML = `
          <div class="borehole-monument" id="borehole-widget">
            <div id="borehole-festival" class="borehole-festival-banner" hidden>
              ✨ <span data-t="borehole_festival_active">Golden Sieve Festival Active: +20% coins!</span> ✨
            </div>
            <div class="borehole-shaft-visual">
              <div class="brass-drill-cone" title="Drilling to the Core"></div>
            </div>
            <div class="borehole-depth-display">
              <div class="borehole-depth-label" data-t="borehole_title">Global Subterranean Borehole</div>
              <div class="borehole-depth-odometer" id="borehole-odometer">0 m</div>
            </div>
            <div class="borehole-progress-bar-container">
              <div class="borehole-progress-fill" id="borehole-progress-fill" style="width: 0%"></div>
            </div>
            <div class="borehole-milestone-text">
              <span id="borehole-milestone-label">Next Milestone</span>
              <span id="borehole-milestone-pct">0%</span>
            </div>
            <div class="borehole-contribute-section">
              <span class="borehole-pending-text">
                Pending: <b id="borehole-pending">0m</b>
              </span>
              <button type="button" class="borehole-sync-btn" data-action="sync">
                ⚡ <span data-t="borehole_sync_btn">Deposit Metres</span>
              </button>
            </div>
            <div class="borehole-contributors-list">
              <div class="borehole-contributors-title" data-t="borehole_contributors">Recent Global Miners</div>
              <div class="borehole-ticker" id="borehole-ticker"></div>
            </div>
          </div>
        `;

        el.querySelector('[data-action="sync"]').addEventListener('click', () => {
          if (app.state) {
            const res = syncBorehole(app.state, app.ev);
            if (res && app.toast) {
              app.toast(t('borehole_synced'));
              if (app.bump) app.bump(el.querySelector('#borehole-odometer'));
            }
          }
        });
      },
      update(el, s) {
        if (!s || !s.borehole) return;
        const b = s.borehole;
        const depth = getGlobalDepth(s);

        // Update depth odometer
        const odo = el.querySelector('#borehole-odometer');
        if (odo) odo.textContent = `${fmt(depth)} m`;

        // Update progress bar & milestone
        const next = getNextMilestone(depth);
        const fill = el.querySelector('#borehole-progress-fill');
        const mLabel = el.querySelector('#borehole-milestone-label');
        const mPct = el.querySelector('#borehole-milestone-pct');

        if (next) {
          if (fill) fill.style.width = `${next.pct}%`;
          if (mLabel) mLabel.textContent = t(next.titleKey);
          if (mPct) mPct.textContent = `${next.pct}% (${fmt(next.metres)}m)`;
        } else {
          if (fill) fill.style.width = '100%';
          if (mLabel) mLabel.textContent = t('borehole_all_milestones');
          if (mPct) mPct.textContent = '100%';
        }

        // Pending metres
        const pend = el.querySelector('#borehole-pending');
        if (pend) pend.textContent = `${fmt(b.pendingMetres || 0)}m`;

        // Festival Banner
        const fest = el.querySelector('#borehole-festival');
        const monument = el.querySelector('#borehole-widget');
        const active = isFestivalActive(s);
        if (fest) fest.hidden = !active;
        if (monument) monument.classList.toggle('festival-active', active);

        // Contributors list
        const ticker = el.querySelector('#borehole-ticker');
        if (ticker && b.contributors) {
          ticker.innerHTML = b.contributors.map(c => `
            <div class="borehole-ticker-row ${c.name === 'You' ? 'you' : ''}">
              <span>${c.name} (${c.origin})</span>
              <span>+${fmt(c.metres)}m</span>
            </div>
          `).join('');
        }
      },
    },
  ],
  on: {
    boreholeMilestone(d, app) {
      if (app && app.banner) {
        const title = t('borehole_milestone_unlocked', { name: fmt(d.metres) + 'm' });
        const sub = t(`borehole_${d.id}_title`);
        app.banner(title, sub);
      }
    },
  },
});
