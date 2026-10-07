// Gear levels panel (R34) on the Tower tab, under Hero Equipment. Kept out of main.js: main builds
// this once and calls update(currentTab) every frame. Rows are built once and updated in place, so
// a button is never replaced between mousedown and mouseup.
import { GEAR_SLOTS, GEAR_MAIN_STAT, GEAR_LEVEL_MAX, GEAR_LEVEL_STEP, GEAR_LEVEL_RESOURCE } from '../systems/CombatSystem.js';
import { ITEM_NAMES, itemName } from '../data/names.js';

const SLOT_LABELS = { weapon: 'Weapon', armor: 'Armor', amulet: 'Amulet', relic: 'Relic' };
const SLOT_ICONS = { weapon: '⚔️', armor: '🛡️', amulet: '📿', relic: '🔮' };

const setText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class EquipmentUI {
  constructor(app, fmtNum) {
    this.app = app;
    this.fmtNum = fmtNum;
  }

  get combat() { return this.app.combatSystem; }
  get gs() { return this.app.gameState; }

  // Main stat as the gear cards show it: "1.2e5 Atk", "12% Crit"
  statText(slot, v) {
    const key = GEAR_MAIN_STAT[slot].key;
    if (key === 'attack') return `${this.combat.fmt(v)} Atk`;
    if (key === 'hp') return `${this.combat.fmt(v)} HP`;
    return `${(v * 100).toFixed(1)}% ${key === 'crit' ? 'Crit' : 'Drain'}`;
  }

  build() {
    this.ensureStylesheet();
    const gear = document.getElementById('hero-gear-container');
    if (!gear || document.getElementById('gear-levels-panel')) return;
    const bone = ITEM_NAMES[GEAR_LEVEL_RESOURCE];
    const panel = document.createElement('div');
    panel.id = 'gear-levels-panel';
    panel.className = 'card gl-panel';
    panel.innerHTML = `
      <div class="card-head">
        <strong class="gl-title">⚒️ Gear Levels</strong>
        <span class="chip" id="gl-stock">${bone.icon} 0 ${esc(bone.plural)}</span>
      </div>
      <p class="gl-note">Each level adds +${Math.round(GEAR_LEVEL_STEP * 100)}% to the item's main stat, up to +${GEAR_LEVEL_MAX}.
        Paid in ${esc(bone.plural)} from Tower loot. A better drop keeps the slot's level.</p>
      <div class="gl-list">
        ${GEAR_SLOTS.map(slot => `
          <div class="card-row gl-row" id="gl-row-${slot}">
            <div class="icon-tile sm" aria-hidden="true">${SLOT_ICONS[slot]}</div>
            <div class="gl-main">
              <div class="gl-name"><span class="gl-slot">${SLOT_LABELS[slot]}</span> <strong id="gl-lvl-${slot}" class="num">+0</strong></div>
              <div class="gl-stat num" id="gl-stat-${slot}"></div>
            </div>
            <button class="btn btn-buy btn-sm" id="gl-btn-${slot}" data-gear-slot="${slot}">
              <span class="lbl" id="gl-lbl-${slot}">Level up</span>
              <span class="cost num" id="gl-cost-${slot}"></span>
            </button>
          </div>`).join('')}
      </div>`;
    gear.insertAdjacentElement('afterend', panel);
    panel.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-gear-slot]');
      if (!btn || btn.getAttribute('aria-disabled') === 'true') return;
      if (this.combat.levelUpGear(btn.dataset.gearSlot)) this.update('combat');
    });
  }

  // Own stylesheet, linked from here so index.html stays untouched
  ensureStylesheet() {
    if (typeof document === 'undefined' || document.getElementById('equipment-css')) return;
    const link = document.createElement('link');
    link.id = 'equipment-css';
    link.rel = 'stylesheet';
    link.href = 'css/equipment.css';
    document.head.appendChild(link);
  }

  update(tab) {
    if (tab !== 'combat' || !this.combat || !this.gs.hero || !document.getElementById('gear-levels-panel')) return;
    const have = Math.floor(Number(this.gs.inventory?.[GEAR_LEVEL_RESOURCE]) || 0);
    const bone = ITEM_NAMES[GEAR_LEVEL_RESOURCE];
    setText(document.getElementById('gl-stock'), `${bone.icon} ${this.fmtNum(have, 0)} ${itemName(GEAR_LEVEL_RESOURCE, have)}`);

    for (const slot of GEAR_SLOTS) {
      const info = this.combat.getGearLevelInfo(slot);
      setText(document.getElementById(`gl-lvl-${slot}`), `+${info.level}`);
      const done = info.blocked === 'max' || info.blocked === 'capped' || info.blocked === 'empty';
      setText(document.getElementById(`gl-stat-${slot}`), done
        ? this.statText(slot, info.stat)
        : `${this.statText(slot, info.stat)} → ${this.statText(slot, info.nextStat)}`);

      let lbl = `Level +${info.level + 1}`;
      let cost = `${bone.icon} ${this.fmtNum(info.cost, 0)}`;
      if (info.blocked === 'max') { lbl = 'Max level'; cost = '—'; }
      else if (info.blocked === 'capped') { lbl = 'Stat at cap'; cost = '—'; }
      else if (info.blocked === 'empty') { lbl = 'No item'; cost = '—'; }
      else if (info.blocked === 'cost') lbl = `Need ${this.fmtNum(info.cost - have, 0)} more`;
      setText(document.getElementById(`gl-lbl-${slot}`), lbl);
      setText(document.getElementById(`gl-cost-${slot}`), cost);

      const btn = document.getElementById(`gl-btn-${slot}`);
      const locked = !!info.blocked;
      if (btn && btn.classList.contains('is-locked') !== locked) {
        btn.classList.toggle('is-locked', locked);
        btn.classList.toggle('btn-primary', !locked);
        btn.setAttribute('aria-disabled', String(locked));
      }
      const row = document.getElementById(`gl-row-${slot}`);
      if (row) {
        row.classList.toggle('is-affordable', !locked);
        row.classList.toggle('is-owned', info.blocked === 'max');
      }
    }
  }
}
