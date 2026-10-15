// Dig feature (page side): Live Tuning, Real-Time Variable Control & Cloud Sync Dashboard.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { TUNING_CONFIG, getTuning, setTuning, resetTuning, clearTuning, exportTuningJson, importTuningJson } from './rules.js';
import { syncToCloud, fetchCloudPresets, recordTelemetrySnapshot } from './sync.js';

const { t } = G;

let appRef = null;
let lastDmgSum = 0;
let lastDmgTime = performance.now();
let currentDps = 0;
let totalHitsObserved = 0;
let totalBlocksBroken = 0;
let statusMsg = '';
let statusTimer = 0;

// Rolling DPS tracker via event hooks
function trackDamage(dmg) {
  const now = performance.now();
  const dt = (now - lastDmgTime) / 1000;
  if (dt >= 0.8) {
    currentDps = Math.round(lastDmgSum / dt);
    lastDmgSum = dmg;
    lastDmgTime = now;
  } else {
    lastDmgSum += dmg;
  }
}

export const debugPanel = {
  id: 'debug',
  tab: 'debug',
  side: 'right',
  title: 'debug_title',
  live: true,
  at: 10,

  build(el, app) {
    appRef = app;
    el.innerHTML = `
      <div class="debug-dashboard">
        <div class="debug-header">
          <div class="debug-header-title">⚙️ <span>${t('debug_title')}</span></div>
          <div class="debug-header-sub">${t('debug_subtitle')}</div>
          <button type="button" class="debug-btn danger debug-btn-reset-all" title="${t('debug_reset_tip')}">
            🔄 ${t('debug_reset_all')}
          </button>
        </div>

        <div class="debug-status-msg" hidden></div>

        <!-- 1. Combat & Damage -->
        <div class="debug-section open" data-cat="combat">
          <div class="debug-section-head">
            <span>${t('debug_cat_combat')}</span>
            <span class="debug-chevron">▶</span>
          </div>
          <div class="debug-section-body" id="debug-cat-combat"></div>
        </div>

        <!-- 2. Block Health & Hardness -->
        <div class="debug-section" data-cat="blocks">
          <div class="debug-section-head">
            <span>${t('debug_cat_blocks')}</span>
            <span class="debug-chevron">▶</span>
          </div>
          <div class="debug-section-body" id="debug-cat-blocks"></div>
        </div>

        <!-- 3. Gates & Bosses -->
        <div class="debug-section" data-cat="gates">
          <div class="debug-section-head">
            <span>${t('debug_cat_gates')}</span>
            <span class="debug-chevron">▶</span>
          </div>
          <div class="debug-section-body" id="debug-cat-gates"></div>
        </div>

        <!-- 4. Economy & Currencies -->
        <div class="debug-section" data-cat="economy">
          <div class="debug-section-head">
            <span>${t('debug_cat_economy')}</span>
            <span class="debug-chevron">▶</span>
          </div>
          <div class="debug-section-body" id="debug-cat-economy"></div>
        </div>

        <!-- 5. Era Systems -->
        <div class="debug-section" data-cat="era">
          <div class="debug-section-head">
            <span>${t('debug_cat_era')}</span>
            <span class="debug-chevron">▶</span>
          </div>
          <div class="debug-section-body" id="debug-cat-era"></div>
        </div>

        <!-- 6. Testing Shortcuts -->
        <div class="debug-section open" data-cat="shortcuts">
          <div class="debug-section-head">
            <span>${t('debug_cat_shortcuts')}</span>
            <span class="debug-chevron">▶</span>
          </div>
          <div class="debug-section-body">
            <div class="debug-grid">
              <button type="button" class="debug-btn" id="db-btn-coins-1k">${t('debug_btn_add_1k_coins')}</button>
              <button type="button" class="debug-btn" id="db-btn-coins-10k">${t('debug_btn_add_10k_coins')}</button>
              <button type="button" class="debug-btn" id="db-btn-stars-1k">${t('debug_btn_add_1k_stars')}</button>
              <button type="button" class="debug-btn" id="db-btn-break-view">${t('debug_btn_break_view')}</button>
              <button type="button" class="debug-btn" id="db-btn-spawn-gate">${t('debug_btn_spawn_gate')}</button>
              <div style="display:flex;gap:4px;">
                <input type="number" id="db-jump-floor-input" min="1" max="1000" value="25" style="width:50px;background:#181824;color:#ffd700;border:1px solid rgba(255,255,255,0.15);border-radius:4px;padding:2px 4px;font-size:13px;" />
                <button type="button" class="debug-btn" id="db-btn-jump-floor" style="flex:1;">${t('debug_btn_jump_lvl')}</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 7. Live DPS & JSON Profile -->
        <div class="debug-section open" data-cat="telemetry">
          <div class="debug-section-head">
            <span>${t('debug_cat_telemetry')}</span>
            <span class="debug-chevron">▶</span>
          </div>
          <div class="debug-section-body">
            <div class="debug-telemetry-cards">
              <div class="debug-stat-card">
                <div class="debug-stat-label">${t('debug_dps_label')}</div>
                <div class="debug-stat-val" id="db-stat-dps">0</div>
              </div>
              <div class="debug-stat-card">
                <div class="debug-stat-label">${t('debug_hits_label')}</div>
                <div class="debug-stat-val" id="db-stat-hits">1.0</div>
              </div>
              <div class="debug-stat-card">
                <div class="debug-stat-label">${t('debug_par_label')}</div>
                <div class="debug-stat-val" id="db-stat-par">0s</div>
              </div>
            </div>
            <textarea class="debug-textarea" id="db-json-area" placeholder="Tuning overrides JSON..."></textarea>
            <div style="display:flex;gap:6px;">
              <button type="button" class="debug-btn" id="db-btn-copy-json" style="flex:1;">📋 ${t('debug_btn_copy_json')}</button>
              <button type="button" class="debug-btn" id="db-btn-apply-json" style="flex:1;">📥 ${t('debug_btn_import_json')}</button>
            </div>
          </div>
        </div>

        <!-- 8. Cloud Sync (Supabase) -->
        <div class="debug-section" data-cat="cloud">
          <div class="debug-section-head">
            <span>${t('debug_cat_cloud')}</span>
            <span class="debug-chevron">▶</span>
          </div>
          <div class="debug-section-body">
            <div style="display:flex;flex-direction:column;gap:6px;">
              <input type="text" id="db-cloud-name" placeholder="Preset name (e.g. Speedrun Test)" style="background:#181824;color:#e8dcc4;border:1px solid rgba(255,255,255,0.15);border-radius:4px;padding:6px 8px;font-size:13px;" />
              <div style="display:flex;gap:6px;">
                <button type="button" class="debug-btn primary" id="db-btn-sync-cloud" style="flex:1;">☁️ ${t('debug_btn_sync_cloud')}</button>
                <button type="button" class="debug-btn" id="db-btn-fetch-cloud" style="flex:1;">🔄 ${t('debug_btn_fetch_cloud')}</button>
              </div>
              <select class="debug-select" id="db-cloud-presets-select" hidden>
                <option value="">-- Select Cloud Preset --</option>
              </select>
            </div>
          </div>
        </div>

      </div>
    `;

    // Populate Slider Rows per category
    const catContainers = {
      combat: el.querySelector('#debug-cat-combat'),
      blocks: el.querySelector('#debug-cat-blocks'),
      gates: el.querySelector('#debug-cat-gates'),
      economy: el.querySelector('#debug-cat-economy'),
      era: el.querySelector('#debug-cat-era'),
    };

    for (const [key, cfg] of Object.entries(TUNING_CONFIG)) {
      const container = catContainers[cfg.category];
      if (!container) continue;

      const row = document.createElement('div');
      row.className = 'debug-param-row';
      row.dataset.key = key;

      row.innerHTML = `
        <div class="debug-param-meta">
          <span class="debug-param-label" title="${cfg.desc}">${cfg.label}</span>
          <span class="debug-param-val" id="db-val-${key}">${cfg.default}</span>
        </div>
        <div class="debug-slider-wrap">
          <input type="range" class="debug-slider" id="db-slide-${key}"
            min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${cfg.default}" />
          <button type="button" class="debug-btn-reset-single" title="Reset to default (${cfg.default})">↺</button>
        </div>
      `;

      const slider = row.querySelector('.debug-slider');
      const valBadge = row.querySelector('.debug-param-val');
      const resetBtn = row.querySelector('.debug-btn-reset-single');

      slider.addEventListener('input', e => {
        const val = Number(e.target.value);
        valBadge.textContent = val + (cfg.unit ? ' ' + cfg.unit : '');
        setTuning(key, val, app.state);
        updateJsonArea(el, app.state);
      });

      resetBtn.addEventListener('click', () => {
        clearTuning(key, app.state);
        slider.value = cfg.default;
        valBadge.textContent = cfg.default + (cfg.unit ? ' ' + cfg.unit : '');
        updateJsonArea(el, app.state);
        showStatus(el, `Reset ${cfg.label} to ${cfg.default}`);
      });

      container.appendChild(row);
    }

    // Collapsible Accordion Toggle
    el.querySelectorAll('.debug-section-head').forEach(head => {
      head.addEventListener('click', () => {
        head.parentElement.classList.toggle('open');
      });
    });

    // Reset All Button
    el.querySelector('.debug-btn-reset-all').addEventListener('click', () => {
      resetTuning(app.state);
      syncUiFromState(el, app.state);
      updateJsonArea(el, app.state);
      showStatus(el, t('debug_reset_tip'));
    });

    // Shortcuts wiring
    el.querySelector('#db-btn-coins-1k').addEventListener('click', () => {
      G.addCoinsShortcut(app.state, 1000, app.ev);
      app.refresh(true);
      showStatus(el, '+1,000 Coins added!');
    });
    el.querySelector('#db-btn-coins-10k').addEventListener('click', () => {
      G.addCoinsShortcut(app.state, 10000, app.ev);
      app.refresh(true);
      showStatus(el, '+10,000 Coins added!');
    });
    el.querySelector('#db-btn-stars-1k').addEventListener('click', () => {
      G.addStarsShortcut(app.state, 1000, app.ev);
      app.refresh(true);
      showStatus(el, '+1,000 Stars added!');
    });
    el.querySelector('#db-btn-break-view').addEventListener('click', () => {
      const broken = G.breakViewShortcut(app.state, app.ev);
      app.refresh(true);
      showStatus(el, `Cleared ${broken} visible blocks!`);
    });
    el.querySelector('#db-btn-spawn-gate').addEventListener('click', () => {
      G.spawnGateShortcut(app.state, app.ev);
      app.refresh(true);
      showStatus(el, 'Spawned Gate barrier on next row!');
    });
    el.querySelector('#db-btn-jump-floor').addEventListener('click', () => {
      const input = el.querySelector('#db-jump-floor-input');
      const floor = Number(input.value) || 25;
      G.jumpLevelShortcut(app.state, floor, app.ev);
      app.refresh(true);
      showStatus(el, `Jumped to floor ${floor}m!`);
    });

    // JSON Export / Copy
    el.querySelector('#db-btn-copy-json').addEventListener('click', async () => {
      const json = exportTuningJson(app.state);
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(json);
        } else {
          const area = el.querySelector('#db-json-area');
          area.select();
          document.execCommand('copy');
        }
        showStatus(el, t('debug_copied'));
      } catch {
        showStatus(el, 'Selected JSON profile in textarea.');
      }
    });

    // JSON Import
    el.querySelector('#db-btn-apply-json').addEventListener('click', () => {
      const area = el.querySelector('#db-json-area');
      const ok = importTuningJson(area.value, app.state);
      if (ok) {
        syncUiFromState(el, app.state);
        showStatus(el, t('debug_applied'));
      } else {
        showStatus(el, 'Error: Invalid JSON profile format.');
      }
    });

    // Cloud Sync to Supabase
    el.querySelector('#db-btn-sync-cloud').addEventListener('click', async () => {
      const nameInput = el.querySelector('#db-cloud-name');
      const name = nameInput.value.trim() || 'Custom Tuning Preset';
      showStatus(el, 'Saving preset to Supabase cloud...');
      const res = await syncToCloud(name, app.state.debugOverrides || {});
      if (res.ok) {
        showStatus(el, t('debug_synced', { id: (res.id || '').slice(0, 8) }));
      } else {
        showStatus(el, `Cloud Sync Error: ${res.error || 'Failed'}`);
      }
    });

    // Cloud Fetch Presets
    const presetsSelect = el.querySelector('#db-cloud-presets-select');
    el.querySelector('#db-btn-fetch-cloud').addEventListener('click', async () => {
      showStatus(el, 'Fetching cloud presets from Supabase...');
      const res = await fetchCloudPresets(20);
      if (res.ok && res.presets && res.presets.length > 0) {
        presetsSelect.innerHTML = `<option value="">-- Load Cloud Preset (${res.presets.length}) --</option>`;
        res.presets.forEach((p, idx) => {
          const opt = document.createElement('option');
          opt.value = idx;
          opt.textContent = `${p.name} (by ${p.author || 'anon'})`;
          presetsSelect.appendChild(opt);
        });
        presetsSelect.hidden = false;
        presetsSelect.dataset.presetsJson = JSON.stringify(res.presets);
        showStatus(el, t('debug_cloud_fetched', { n: res.presets.length }));
      } else {
        showStatus(el, 'No cloud presets found or offline.');
      }
    });

    presetsSelect.addEventListener('change', e => {
      const idx = e.target.value;
      if (idx === '') return;
      try {
        const presets = JSON.parse(presetsSelect.dataset.presetsJson || '[]');
        const preset = presets[idx];
        if (preset && preset.tuning) {
          importTuningJson(JSON.stringify(preset.tuning), app.state);
          syncUiFromState(el, app.state);
          updateJsonArea(el, app.state);
          showStatus(el, `Loaded preset: ${preset.name}`);
        }
      } catch (err) {
        showStatus(el, 'Failed to load selected preset.');
      }
    });

    syncUiFromState(el, app.state);
    updateJsonArea(el, app.state);
  },

  update(el, s, app) {
    appRef = app;
    // Update live metrics
    const dpsEl = el.querySelector('#db-stat-dps');
    if (dpsEl) dpsEl.textContent = G.fmt(currentDps);

    const hitsEl = el.querySelector('#db-stat-hits');
    if (hitsEl && s) {
      const pickPwr = G.pickPower(s);
      const estHits = G.clampHits(s.best, pickPwr);
      hitsEl.textContent = estHits.toFixed(1);
    }

    const parEl = el.querySelector('#db-stat-par');
    if (parEl && s && s.run) {
      const clock = Math.round(s.run.clock || 0);
      const par = Math.round(s.run.par || 0);
      parEl.textContent = `${clock}s / ${par}s`;
    }

    if (statusTimer > 0) {
      statusTimer -= 0.1;
      if (statusTimer <= 0) {
        const msgEl = el.querySelector('.debug-status-msg');
        if (msgEl) msgEl.hidden = true;
      }
    }
  },
};

function showStatus(el, text) {
  const msgEl = el.querySelector('.debug-status-msg');
  if (!msgEl) return;
  msgEl.textContent = text;
  msgEl.hidden = false;
  statusTimer = 4.0;
}

function updateJsonArea(el, s) {
  const area = el.querySelector('#db-json-area');
  if (area) {
    area.value = exportTuningJson(s);
  }
}

function syncUiFromState(el, s) {
  for (const [key, cfg] of Object.entries(TUNING_CONFIG)) {
    const val = getTuning(key, s, cfg.default);
    const slider = el.querySelector(`#db-slide-${key}`);
    const badge = el.querySelector(`#db-val-${key}`);
    if (slider) slider.value = val;
    if (badge) badge.textContent = val + (cfg.unit ? ' ' + cfg.unit : '');
  }
}

// Register UI feature
ui({
  id: 'debug',
  css: new URL('./debug.css', import.meta.url).href,
  panels: [debugPanel],
  on: {
    hit(d) {
      if (d && d.dmg) trackDamage(d.dmg);
      totalHitsObserved++;
    },
    break() {
      totalBlocksBroken++;
    },
  },
});
