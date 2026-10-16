// Dig feature (page side): Survivor-Excavator Buildcraft Engine UI.
import * as G from '../../game.js';
import { ui, app } from '../../ui/app.js';
import { sfx, gap, tone } from '../../ui/audio.js';
import { icon } from '../../ui/icons.js';
import {
  ensureBuildcraft,
  COLLAB_RECIPES,
  RUNE_STAMPS,
  RIG_TOOLS,
  canFuseCollab,
  fuseCollab,
  canAscendRig,
  ascendRig,
  socketRuneStamp,
  unsocketRuneStamp,
  openGildedVault,
} from './rules.js';

const { t } = G;

ui({
  id: 'buildcraft',
  css: 'features/buildcraft/buildcraft.css',
  sfx: {
    vaultFanfare() {
      if (!gap('vaultFanfare', 0.5)) return;
      [440, 554, 659, 880].forEach((f, i) => tone(f, { type: 'triangle', d: 0.25, vol: 0.2, at: i * 0.08 }));
    },
    collabFuse() {
      if (!gap('collabFuse', 0.5)) return;
      [300, 450, 600, 900].forEach((f, i) => tone(f, { type: 'square', d: 0.3, vol: 0.15, at: i * 0.1 }));
    },
  },
  on: {
    gildedVaultOpen(d) {
      if (app && app.sfx && app.sfx.vaultFanfare) app.sfx.vaultFanfare();
      if (app && app.toast) {
        app.toast(t('vault_jackpot', { n: d.count }), 'gold');
      }
      app.dirty('buildcraft');
    },
    collabFused(d) {
      if (app && app.sfx && app.sfx.collabFuse) app.sfx.collabFuse();
      if (app && app.toast) {
        app.toast(t('collab_' + d.collabId) || 'Collab Fused!', 'gold');
      }
      app.dirty('buildcraft');
    },
    rigAscended(d) {
      if (app && app.sfx && app.sfx.collabFuse) app.sfx.collabFuse();
      if (app && app.toast) {
        app.toast(t('overdrive_unlocked'), 'gold');
      }
      app.dirty('buildcraft');
    },
  },
  panels: [{
    id: 'buildcraft', tab: 'forge', side: 'left', at: 15, title: 'buildcraft_title',
    build(el) {
      el.insertAdjacentHTML('beforeend', `
        <div class="buildcraft-panel">
          <div class="buildcraft-section" id="bc-pick-section">
            <h3>${t('signature_pick')}</h3>
            <div class="stamp-sockets" id="bc-stamp-sockets"></div>
          </div>
          <div class="buildcraft-section" id="bc-tools-section">
            <h3 id="bc-tools-title">${t('tool_slots', { n: 0, max: 3 })}</h3>
            <div class="tool-grid" id="bc-tool-list"></div>
          </div>
          <div class="buildcraft-section" id="bc-relics-section">
            <h3 id="bc-relics-title">${t('relic_slots', { n: 0, max: 4 })}</h3>
            <div class="tool-grid" id="bc-relic-list"></div>
          </div>
          <div class="buildcraft-section" id="bc-forge-section" style="display:none;">
            <h3>${t('collab_ready')}</h3>
            <button type="button" id="bc-forge-btn" class="open-next-btn">${t('collab_fuse')}</button>
          </div>
        </div>
      `);
    },
    update(el, s) {
      const b = ensureBuildcraft(s);

      // Sockets
      const sockWrap = el.querySelector('#bc-stamp-sockets');
      if (sockWrap) {
        sockWrap.innerHTML = '';
        b.signaturePick.sockets.forEach((st, idx) => {
          const div = document.createElement('div');
          div.className = 'stamp-socket' + (st ? ' filled' : '');
          div.textContent = st ? t(RUNE_STAMPS[st] ? RUNE_STAMPS[st].name : st) : `[${idx + 1}]`;
          div.addEventListener('click', () => {
            if (st) {
              unsocketRuneStamp(s, idx, app.ev);
            } else if (b.stamps.length > 0) {
              socketRuneStamp(s, idx, b.stamps[0], app.ev);
            }
            app.dirty('buildcraft');
          });
          sockWrap.appendChild(div);
        });
      }

      // Tools
      const toolsTitle = el.querySelector('#bc-tools-title');
      if (toolsTitle) toolsTitle.textContent = t('tool_slots', { n: Object.keys(b.tools).length, max: b.toolSlots });
      const toolList = el.querySelector('#bc-tool-list');
      if (toolList) {
        toolList.innerHTML = '';
        for (const [id, tool] of Object.entries(b.tools)) {
          const item = document.createElement('div');
          item.className = 'tool-card' + (tool.collab ? ' collab' : '') + (tool.overdrive ? ' overdrive' : '');
          const label = tool.collab ? t('collab_' + id) : t(RIG_TOOLS[id] ? RIG_TOOLS[id].name : id);
          item.innerHTML = `<span>${label} (Lv ${tool.level})</span>`;
          toolList.appendChild(item);
        }
      }

      // Bedrock forge fusion availability
      const forgeSection = el.querySelector('#bc-forge-section');
      if (forgeSection) {
        let readyCollab = null;
        for (const cId of Object.keys(COLLAB_RECIPES)) {
          if (canFuseCollab(s, cId)) { readyCollab = cId; break; }
        }
        if (readyCollab) {
          forgeSection.style.display = 'block';
          const btn = el.querySelector('#bc-forge-btn');
          btn.onclick = () => {
            fuseCollab(s, readyCollab, app.ev);
            app.dirty('buildcraft');
          };
        } else {
          forgeSection.style.display = 'none';
        }
      }
    },
  }],
});
