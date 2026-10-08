// Garden cross-breeding panel, Herbarium and hybrid recipe cards (R17).
// Kept out of main.js: main builds this once and calls update from its Garden/Alchemy refresh.
import { SEED_TYPES, HYBRIDS, GOLDEN_CHANCE, GOLDEN_ESSENCE_MULT } from '../systems/GardenSystem.js';
import { HYBRID_RECIPES } from '../systems/AlchemySystem.js';
import { itemName } from '../data/names.js';
import { t } from '../i18n/index.js';


const setText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };
const pct = (n) => `${Math.round(n * 100)}%`;

export class GardenBreedingUI {
  constructor(app, fmtNum) {
    this.app = app;
    this.fmtNum = fmtNum;
    this.breedMode = false;
    this.selected = null;
    this.flash = '';
    this.builtRecipeCount = -1;
  }

  get garden() { return this.app.gardenSystem; }
  get alchemy() { return this.app.alchemySystem; }

  build() {
    this.buildGardenPanel();
    this.buildAlchemySection();
    this.updateGardenPanel();
    this.updateAlchemySection();
  }

  buildGardenPanel() {
    const grid = document.getElementById('garden-plot-grid');
    if (!grid || document.getElementById('garden-breeding')) return;
    const panel = document.createElement('div');
    panel.id = 'garden-breeding';
    panel.className = 'breeding-panel';
    panel.innerHTML = `
      <div class="breeding-head">
        <strong>${t('breed.title')}</strong>
        <button id="btn-breed-mode" class="btn-action">${t('breed.mode', { s: t('breed.off') })}</button>
      </div>
      <div id="breeding-status" class="breeding-note"></div>
      <div id="breeding-pairs" class="breeding-pairs"></div>
      <div id="breeding-herbarium" class="breeding-note"></div>
    `;
    grid.after(panel); // below the plots, so the plots stay above the fold (R23)

    document.getElementById('btn-breed-mode').addEventListener('click', () => {
      if (!this.garden.isBreedingUnlocked()) return;
      this.breedMode = !this.breedMode;
      this.selected = null;
      this.flash = '';
      this.updateGardenPanel();
    });

    // Capture on the grid's parent so breed-mode clicks run before (and replace) the normal
    // plant/harvest handler in main.js.
    grid.parentNode.addEventListener('click', (e) => {
      if (!this.breedMode) return;
      const plotEl = e.target.closest('.garden-plot');
      if (!plotEl || !grid.contains(plotEl)) return;
      e.stopPropagation();
      this.onPlotClick(parseInt(plotEl.dataset.index, 10), e);
    }, true);
  }

  onPlotClick(idx, e) {
    const g = this.garden;
    const plots = this.app.gameState.garden.plots;
    if (this.selected === null) {
      if (g.isPlotMature(plots[idx])) this.selected = idx;
    } else if (this.selected === idx) {
      this.selected = null;
    } else if (g.getBreedingOutcome(this.selected, idx)) {
      const res = g.breedPlots(this.selected, idx, e.clientX, e.clientY);
      this.selected = null;
      if (res.ok) {
        const h = HYBRIDS[res.hybrid];
        this.flash = res.amount > 0
          ? t('breed.hit', { n: res.amount, name: h.name })
          : t('breed.miss', { p: pct(res.chance) });
      }
      this.app.updateGardenUI();
    } else if (g.isPlotMature(plots[idx])) {
      this.selected = idx; // pick a different first plant
    }
    this.updateGardenPanel();
  }

  buildAlchemySection() {
    const list = document.getElementById('alchemy-recipes-list');
    if (!list || document.getElementById('alchemy-hybrid-section')) return;
    const sec = document.createElement('div');
    sec.id = 'alchemy-hybrid-section';
    sec.innerHTML = `
      <h3 class="hybrid-head">🧬 ${t('coll.recipes')}</h3>
      <div id="alchemy-hybrid-note" class="breeding-note"></div>
      <div id="alchemy-hybrid-list" class="alchemy-grid"></div>
    `;
    list.parentNode.insertBefore(sec, list.nextSibling);
    document.getElementById('alchemy-hybrid-list').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-hybrid-recipe]');
      if (!btn || btn.classList.contains('disabled')) return;
      this.alchemy.brew(btn.dataset.hybridRecipe);
      this.updateAlchemySection();
    });
  }

  costStr(r) {
    return Object.entries(this.alchemy.getRecipeCost(r)).map(([k, v]) =>
      `<bdi>${v}x</bdi> ${itemName(k)} (<span id="hyb-own-${r.id}-${k}">0</span>)`).join(t('list.sep'));
  }

  have(k) {
    const gs = this.app.gameState;
    return gs.inventory?.[k] ?? gs.garden?.essences?.[k] ?? 0;
  }

  updateGardenPanel() {
    const panel = document.getElementById('garden-breeding');
    if (!panel) return;
    const g = this.garden;
    const gs = this.app.gameState;
    const unlocked = g.isBreedingUnlocked();
    const btn = document.getElementById('btn-breed-mode');
    btn.classList.toggle('disabled', !unlocked);
    if (!unlocked) { this.breedMode = false; this.selected = null; }
    btn.classList.toggle('active', this.breedMode);
    setText(btn, t('breed.mode', { s: this.breedMode ? t('breed.on') : t('breed.off') }));

    let text;
    if (!unlocked) {
      text = t('breed.locked');
    } else if (!this.breedMode) {
      text = t('breed.howto');
    } else if (this.flash && this.selected === null) {
      text = this.flash;
    } else if (this.selected === null) {
      text = t('breed.pick1');
    } else {
      text = t('breed.pick2');
    }
    setText(document.getElementById('breeding-status'), text);

    const pairs = document.getElementById('breeding-pairs');
    if (!pairs.dataset.built) {
      pairs.dataset.built = '1';
      pairs.innerHTML = Object.values(HYBRIDS).map(h =>
        `<span class="res-badge" title="${SEED_TYPES[h.parents[0]].name} x ${SEED_TYPES[h.parents[1]].name}">${SEED_TYPES[h.parents[0]].icon} + ${SEED_TYPES[h.parents[1]].icon} ➔ ${h.name} ${pct(h.chance)} <span id="hyb-ess-${h.id}"></span></span>`).join(' ');
    }
    for (const h of Object.values(HYBRIDS)) {
      setText(document.getElementById(`hyb-ess-${h.id}`), `(${this.fmtNum(gs.garden.essences[h.id] || 0)})`);
    }

    const golden = gs.garden.herbarium.golden;
    const ids = Object.keys(SEED_TYPES);
    const found = ids.filter(id => golden[id] > 0).length;
    const total = ids.reduce((a, id) => a + (golden[id] || 0), 0);
    setText(document.getElementById('breeding-herbarium'),
      t('breed.herbarium', { a: found, b: ids.length, n: total, p: pct(GOLDEN_CHANCE), x: GOLDEN_ESSENCE_MULT }));

    for (const p of gs.garden.plots) {
      const el = document.getElementById(`garden-plot-${p.id}`);
      if (!el) continue;
      el.classList.toggle('breed-selected', this.breedMode && this.selected === p.id);
      el.classList.toggle('breed-partner', this.breedMode && this.selected !== null && !!g.getBreedingOutcome(this.selected, p.id));
    }
  }

  updateAlchemySection() {
    const listEl = document.getElementById('alchemy-hybrid-list');
    if (!listEl) return;
    const visible = this.alchemy.getVisibleHybridRecipes();
    if (visible.length !== this.builtRecipeCount) {
      this.builtRecipeCount = visible.length;
      listEl.innerHTML = visible.map(r => `
        <div class="alchemy-card" id="hyb-card-${r.id}">
          <div class="alc-info">
            <div class="alc-name">${r.name}</div>
            <div class="alc-desc">${r.desc}</div>
            <div class="alc-cost">${t('alc.cost')} ${this.costStr(r)}</div>
          </div>
          <button class="btn-brew" id="hyb-brew-${r.id}" data-hybrid-recipe="${r.id}">${t('alc.brew')}</button>
        </div>`).join('');
    }
    for (const r of visible) {
      for (const k of Object.keys(r.cost)) setText(document.getElementById(`hyb-own-${r.id}-${k}`), t('alc.have', { n: this.fmtNum(this.have(k)) }));
      const can = this.alchemy.canBrew(r.id);
      const b = document.getElementById(`hyb-brew-${r.id}`);
      if (b) { b.classList.toggle('active', can); b.classList.toggle('disabled', !can); }
    }
    setText(document.getElementById('alchemy-hybrid-note'),
      t('breed.recipes_note', { a: visible.length, b: HYBRID_RECIPES.length }));
  }
}
