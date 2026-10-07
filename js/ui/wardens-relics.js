// Month-2 panels (R18): Tower Wardens (combat tab), Strata Relics + Aether Ore (mining tab) and
// Gem Polishing (alchemy tab). Kept out of main.js: main builds this once and calls
// update(currentTab) every frame. Rows are built once (or when their status changes) and
// updated in place, so buttons are never replaced between mousedown and mouseup.
import { WARDEN_TROPHY_GOLD, WARDEN_HP_MULT, WARDEN_TIMER_SECONDS, WARDEN_INTERVAL, getWardenName } from '../systems/CombatSystem.js';
import { STRATA, STRATA_RELICS, RELIC_CHANCE, RELIC_PITY, RELIC_PICK_BONUS, AETHER_ORE_CHANCE } from '../systems/MiningSystem.js';
import { GEM_LADDER, POLISH_RATIO } from '../systems/AlchemySystem.js';
import { ITEM_NAMES } from '../data/names.js';

const GEM_NAMES = Object.fromEntries(GEM_LADDER.map(k => [k, [ITEM_NAMES[k].name, ITEM_NAMES[k].plural, ITEM_NAMES[k].color]]));

const setText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };
const pct = (n) => `${Math.round(n * 100)}%`;
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class WardensRelicsUI {
  constructor(app, fmtNum) {
    this.app = app;
    this.fmtNum = fmtNum;
    this.wardenSig = '';
  }

  get combat() { return this.app.combatSystem; }
  get mining() { return this.app.miningSystem; }
  get alchemy() { return this.app.alchemySystem; }
  get gs() { return this.app.gameState; }

  build() {
    this.ensureStylesheet();
    this.buildWardenPanel();
    this.buildRelicPanel();
    this.buildPolishPanel();
  }

  // Own stylesheet, linked from here so index.html stays untouched
  ensureStylesheet() {
    if (typeof document === 'undefined' || document.getElementById('wardens-relics-css')) return;
    const link = document.createElement('link');
    link.id = 'wardens-relics-css';
    link.rel = 'stylesheet';
    link.href = 'css/wardens-relics.css';
    document.head.appendChild(link);
  }

  update(tab) {
    if (tab === 'combat') this.updateWardenPanel();
    else if (tab === 'mining') this.updateRelicPanel();
    else if (tab === 'alchemy') this.updatePolishPanel();
  }

  // --- Tower Wardens ---

  buildWardenPanel() {
    const tab = document.getElementById('tab-combat');
    if (!tab || document.getElementById('warden-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'warden-panel';
    panel.className = 'glass-card wr-panel';
    panel.innerHTML = `
      <div class="wr-head">
        <strong>🛡️ Tower Wardens</strong>
        <span id="warden-summary" class="wr-summary"></span>
      </div>
      <div id="warden-note" class="wr-note"></div>
      <div id="warden-list" class="wr-list"></div>
    `;
    tab.appendChild(panel);
    panel.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-warden-action]');
      if (!btn) return;
      if (btn.dataset.wardenAction === 'challenge') this.combat.challengeWarden(Number(btn.dataset.floor));
      else if (btn.dataset.wardenAction === 'retreat') this.combat.endWardenChallenge();
      this.wardenSig = '';
      this.updateWardenPanel();
    });
  }

  updateWardenPanel() {
    const cs = this.combat;
    const h = this.gs.hero;
    if (!cs || !h || !document.getElementById('warden-panel')) return;
    const unlocked = cs.isWardensUnlocked();
    const trophies = cs.getWardenTrophyCount();
    const challenge = cs.wardenChallenge;

    setText(document.getElementById('warden-summary'), unlocked
      ? `Trophies: ${trophies} · +${pct(WARDEN_TROPHY_GOLD * trophies)} Tower gold`
      : '🔒 Locked');

    let note;
    if (!unlocked) {
      note = `Every ${WARDEN_INTERVAL}th floor a named Warden guards the Tower: ${WARDEN_TIMER_SECONDS} s to beat ×${WARDEN_HP_MULT} boss HP. ` +
        'Each first kill wins a trophy (+2% Tower gold). Unlocks at your first New Field.';
    } else if (challenge) {
      note = `Challenging ${getWardenName(challenge.floor)} (floor ${challenge.floor}). Win or lose, you return to floor ${h.floor}; losing costs nothing.`;
    } else {
      note = `A Warden guards every ${WARDEN_INTERVAL}th floor: ${WARDEN_TIMER_SECONDS} s, ×${WARDEN_HP_MULT} boss HP, triple boss spoils. ` +
        'First kill = trophy (+2% Tower gold). Wardens you passed can be challenged from here without leaving your floor.';
    }
    setText(document.getElementById('warden-note'), note);

    const list = document.getElementById('warden-list');
    const floors = unlocked ? cs.getWardenFloors() : [];
    const rows = floors.map(f => {
      let status;
      if (challenge?.floor === f) status = 'fighting';
      else if (cs.isWardenDefeated(f)) status = 'trophy';
      else if (cs.canChallengeWarden(f)) status = 'challenge';
      else if (h.floor === f) status = 'fighting';
      else status = challenge && f < h.floor ? 'busy' : 'ahead';
      return { f, status };
    });
    const sig = JSON.stringify(rows);
    if (sig === this.wardenSig) return;
    this.wardenSig = sig;
    list.innerHTML = rows.map(({ f, status }) => {
      let right;
      if (status === 'trophy') right = '<span class="wr-tag wr-tag-done">🏆 Trophy</span>';
      else if (status === 'fighting') right = challenge?.floor === f
        ? '<button class="btn-action" data-warden-action="retreat">Give up</button>'
        : '<span class="wr-tag wr-tag-live">⚔️ Fighting now</span>';
      else if (status === 'challenge') right = `<button class="btn-action" data-warden-action="challenge" data-floor="${f}">Challenge</button>`;
      else if (status === 'busy') right = '<span class="wr-tag">Waiting</span>';
      else right = '<span class="wr-tag">Ahead</span>';
      return `<div class="wr-row ${status === 'trophy' ? 'is-done' : ''}">
        <div class="wr-row-main"><strong>${esc(getWardenName(f))}</strong><span class="wr-sub">Floor ${this.fmtNum(f, 0)}</span></div>
        ${right}
      </div>`;
    }).join('');
  }

  // --- Strata Relics + Aether Ore ---

  buildRelicPanel() {
    const inv = document.getElementById('minerals-inventory');
    if (!inv || document.getElementById('relic-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'relic-panel';
    panel.className = 'wr-panel wr-inset';
    panel.innerHTML = `
      <div class="wr-head">
        <strong>🏺 Strata Relics</strong>
        <span id="relic-summary" class="wr-summary"></span>
      </div>
      <div class="relic-grid">
        ${STRATA_RELICS.map((r, i) => `
          <div class="relic-slot" id="relic-slot-${i}" title="${esc(STRATA[i].name)} stratum">
            <span class="relic-icon">${r.icon}</span>
            <span class="relic-name" id="relic-name-${i}"></span>
          </div>`).join('')}
      </div>
      <div id="relic-note" class="wr-note"></div>
      <div id="ore-note" class="wr-note"></div>
    `;
    inv.parentNode.insertBefore(panel, inv.nextSibling);
  }

  updateRelicPanel() {
    const ms = this.mining;
    const grid = this.gs.miningGrid;
    if (!ms || !grid || !document.getElementById('relic-panel')) return;
    const count = ms.getRelicCount();
    const target = ms.getRelicTarget();
    setText(document.getElementById('relic-summary'), `${count}/${STRATA_RELICS.length} · +${pct(RELIC_PICK_BONUS * count)} pickaxe`);
    STRATA_RELICS.forEach((r, i) => {
      const slot = document.getElementById(`relic-slot-${i}`);
      const have = ms.hasRelic(i);
      slot.classList.toggle('found', have);
      slot.classList.toggle('seeking', i === target);
      setText(document.getElementById(`relic-name-${i}`), have ? r.name : (i === target ? `Seeking (${STRATA[i].name})` : STRATA[i].name));
    });
    let note;
    if (target >= 0) {
      note = `Each tile you break has a 1 in ${Math.round(1 / RELIC_CHANCE)} chance to unearth the ${STRATA_RELICS[target].name}; ` +
        `it is guaranteed within ${RELIC_PITY} tiles (${this.fmtNum(grid.relicPity || 0, 0)}/${RELIC_PITY}). Each relic: +${pct(RELIC_PICK_BONUS)} pickaxe power.`;
    } else if (count < STRATA_RELICS.length) {
      note = `Every relic reachable from here is found. The next one lies in the ${STRATA[ms.getStratumIndex() + 1]?.name || 'deeper'} stratum.`;
    } else {
      note = 'All seven Strata Relics found.';
    }
    setText(document.getElementById('relic-note'), note);
    const owned = this.gs.market?.items?.ore?.owned ?? 0;
    setText(document.getElementById('ore-note'),
      `🪨 Oil Shale: ${pct(AETHER_ORE_CHANCE)} of stone tiles drop 1. Found ${this.fmtNum(grid.oreFound || 0, 0)} · ${this.fmtNum(owned + (this.gs.inventory.aetherOre || 0), 0)} in stock to sell in the Bazaar.`);
  }

  // --- Gem Polishing ---

  buildPolishPanel() {
    const anchor = document.getElementById('transmutation-actions');
    if (!anchor || document.getElementById('polish-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'polish-panel';
    panel.className = 'wr-panel wr-inset';
    const rows = GEM_LADDER.slice(0, -1).map((from, i) => {
      const to = GEM_LADDER[i + 1];
      return `<div class="wr-row polish-row">
        <div class="wr-row-main">
          <span><span style="color:${GEM_NAMES[from][2]}">${POLISH_RATIO} ${GEM_NAMES[from][1]}</span> ➔ <span style="color:${GEM_NAMES[to][2]}">1 ${GEM_NAMES[to][0]}</span></span>
          <span class="wr-sub" id="polish-have-${from}"></span>
        </div>
        <div class="polish-btns">
          <button class="btn-action" data-polish="${from}" data-times="1">Polish</button>
          <button class="btn-action" data-polish="${from}" data-times="max" id="polish-max-${from}">Max</button>
        </div>
      </div>`;
    }).join('');
    panel.innerHTML = `
      <div class="wr-head">
        <strong>💎 Gem Polishing</strong>
        <span class="wr-summary" id="polish-summary"></span>
      </div>
      <div class="wr-note">Polish ${POLISH_RATIO} of a gem into 1 of the next tier. A poor rate on purpose (${Math.pow(POLISH_RATIO, 4)} ${ITEM_NAMES.rubies.plural} = 1 ${ITEM_NAMES.voidAmethyst.name}), but surplus low gems now reach the Catalyst.</div>
      ${rows}
    `;
    anchor.parentNode.insertBefore(panel, anchor.nextSibling);
    panel.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-polish]');
      if (!btn || btn.classList.contains('disabled')) return;
      const times = btn.dataset.times === 'max' ? 'max' : 1;
      if (this.alchemy.polishGem(btn.dataset.polish, times) > 0) {
        this.updatePolishPanel();
      }
    });
  }

  updatePolishPanel() {
    const al = this.alchemy;
    if (!al || !document.getElementById('polish-panel')) return;
    const inv = this.gs.inventory;
    for (const from of GEM_LADDER.slice(0, -1)) {
      const max = al.getMaxPolish(from);
      setText(document.getElementById(`polish-have-${from}`), `have ${this.fmtNum(inv[from] || 0, 0)}`);
      setText(document.getElementById(`polish-max-${from}`), max > 0 ? `Max (${this.fmtNum(max, 0)})` : 'Max');
      for (const btn of document.querySelectorAll(`#polish-panel button[data-polish="${from}"]`)) {
        btn.classList.toggle('disabled', max < 1);
      }
    }
    setText(document.getElementById('polish-summary'), `Polished: ${this.fmtNum(this.gs.alchemy?.gemsPolished || 0, 0)}`);
  }
}
