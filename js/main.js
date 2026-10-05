import { BigNum } from './engine/BigNum.js';
import { sound } from './engine/AudioEngine.js';
import { particles } from './engine/ParticleEngine.js';
import { SaveManager } from './engine/SaveManager.js';
import { GameLoop } from './engine/GameLoop.js';

import { GameState } from './systems/GameState.js';
import { ClickerSystem } from './systems/ClickerSystem.js';
import { BuildingSystem, BUILDING_DEFINITIONS } from './systems/BuildingSystem.js';
import { CombatSystem } from './systems/CombatSystem.js';
import { MiningSystem, getPickaxeName } from './systems/MiningSystem.js';
import { GardenSystem, SEED_TYPES, ESSENCE_NAMES, WATER_BOOST, MAX_GOLEMS } from './systems/GardenSystem.js';
import { AlchemySystem, RECIPES } from './systems/AlchemySystem.js';
import { SpellSystem, SPELLS } from './systems/SpellSystem.js';
import { TalentTreeSystem, TALENT_DEFINITIONS } from './systems/TalentTreeSystem.js';
import { BountySystem } from './systems/BountySystem.js';
import { MarketSystem, COMMODITIES } from './systems/MarketSystem.js';
import { PrestigeSystem, ASCENSION_PERKS } from './systems/PrestigeSystem.js';
import { AchievementSystem, ACHIEVEMENTS } from './systems/AchievementSystem.js';
import { VERSION, CHANGELOG } from './version.js';
import { getTabBonuses, SPELL_TABS, getMasteries, getAetherMasteryTooltip, fmtMult } from './tabBonuses.js';
import { BuffBar } from './buffBar.js';
import { Leaderboard } from './leaderboard.js';

const INGREDIENT_NAMES = {
  ...ESSENCE_NAMES,
  rubies: 'Ruby', sapphires: 'Sapphire', emeralds: 'Emerald', diamonds: 'Diamond',
  voidAmethyst: 'Void Amethyst', monsterBones: 'Monster Bone', voidCores: 'Void Core', bossTokens: 'Boss Token'
};

// Application Orchestrator
class AetheriaApp {
  constructor() {
    this.gameState = new GameState();
    this.saveManager = new SaveManager(this.gameState);

    // Load save data if present
    const savedData = this.saveManager.load();
    if (savedData) {
      this.gameState.deserialize(savedData);
      this.saveManager.lastSaveTime = savedData.savedAt || Date.now();
    }
    BigNum.notation = this.gameState.settings.notation;

    // Attach systems
    this.clickerSystem = new ClickerSystem(this.gameState);
    this.buildingSystem = new BuildingSystem(this.gameState);
    this.combatSystem = new CombatSystem(this.gameState);
    this.miningSystem = new MiningSystem(this.gameState);
    this.gardenSystem = new GardenSystem(this.gameState);
    this.alchemySystem = new AlchemySystem(this.gameState);
    this.talentSystem = new TalentTreeSystem(this.gameState);
    this.bountySystem = new BountySystem(this.gameState);
    this.marketSystem = new MarketSystem(this.gameState);
    this.prestigeSystem = new PrestigeSystem(this.gameState);
    this.achievementSystem = new AchievementSystem(this.gameState);

    // Cross-link systems onto gameState
    this.gameState.buildingSystem = this.buildingSystem;
    this.gameState.combatSystem = this.combatSystem;
    this.gameState.miningSystem = this.miningSystem;
    this.gameState.gardenSystem = this.gardenSystem;
    this.gameState.bountySystem = this.bountySystem;
    this.gameState.achievementSystem = this.achievementSystem;
    this.gameState.marketSystem = this.marketSystem;

    // Game loop
    this.gameLoop = new GameLoop(
      (dt, realDt) => this.onSimTick(dt, realDt),
      (dt) => this.onRenderTick(dt),
      () => this.saveManager.save()
    );

    this.spellSystem = new SpellSystem(this.gameState, this.gameLoop);
    this.gameState.spellSystem = this.spellSystem;

    this.currentTab = 'monolith';
    this.tabNeedsFullRender = {};
    this.version = VERSION;
    this.leaderboard = new Leaderboard(this);
  }

  init() {
    // Canvas particles setup
    const canvas = document.getElementById('particle-canvas');
    if (canvas) particles.init(canvas);

    // Setup DOM Listeners & Navigation
    this.setupEventListeners();
    this.setupTabs();

    // Check offline time
    if (this.saveManager.lastSaveTime) {
      const offlineResult = this.saveManager.processOfflineTime(this.saveManager.lastSaveTime);
      if (offlineResult && offlineResult.elapsedSeconds >= 10) {
        this.showOfflineModal(offlineResult);
      }
    }

    // Initial DOM structural creation
    this.buildStaticUI();

    // Start loop
    this.gameLoop.start();
  }

  // Red dot on nav tabs that have something ready to claim
  updateTabNotifications() {
    const bountyReady = this.gameState.bounties.some(b => b.completed && !b.claimed);
    const bountyTab = document.querySelector('.nav-tab[data-tab="bounties"]');
    if (bountyTab && bountyTab.classList.contains('has-notif') !== bountyReady) {
      bountyTab.classList.toggle('has-notif', bountyReady);
      bountyTab.title = bountyReady
        ? 'Bounties: a contract is complete and ready to claim!'
        : 'Bounties: Endless procedural guild contracts with instant rewards.';
    }
  }

  buildAboutStructure() {
    const verBtn = document.getElementById('game-version');
    if (verBtn) {
      verBtn.textContent = `v${VERSION}`;
      verBtn.addEventListener('click', () => this.switchTab('about'));
    }
    const verEl = document.getElementById('about-version');
    if (verEl) verEl.textContent = `v${VERSION}`;
    const logEl = document.getElementById('about-changelog');
    if (logEl) {
      logEl.innerHTML = CHANGELOG.map(entry => `
        <div class="changelog-entry">
          <div class="changelog-head"><strong>v${entry.version}</strong> &mdash; ${entry.title} <span class="changelog-date">${entry.date}</span></div>
          <ul>${entry.changes.map(c => `<li>${c}</li>`).join('')}</ul>
        </div>
      `).join('');
    }
  }

  buildSettingsStructure() {
    const cont = document.getElementById('settings-notation');
    if (!cont) return;
    const sample = new BigNum(1.5, 10);
    const options = [
      { id: 'scientific', label: 'Scientific' },
      { id: 'suffix', label: 'Standard (K, M, B…)' },
      { id: 'engineering', label: 'Engineering' }
    ];
    cont.innerHTML = options.map(o => `
      <label class="settings-option">
        <input type="radio" name="notation" value="${o.id}" ${this.gameState.settings.notation === o.id ? 'checked' : ''}>
        <span>${o.label}</span>
        <span class="settings-sample">${sample.format(o.id, 2)}</span>
      </label>
    `).join('');
    cont.addEventListener('change', (e) => {
      if (e.target.name !== 'notation') return;
      this.gameState.settings.notation = e.target.value;
      BigNum.notation = e.target.value;
      for (const t in this.tabNeedsFullRender) this.tabNeedsFullRender[t] = true;
      this.saveManager.save();
    });
  }

  setupTabs() {
    this.buildAboutStructure();
    this.buildSettingsStructure();
    const tabButtons = document.querySelectorAll('.nav-tab');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    document.querySelectorAll('.nav-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-view').forEach(view => {
      view.classList.toggle('active', view.id === `tab-${tabName}`);
    });
    this.tabNeedsFullRender[tabName] = true;
  }

  setupEventListeners() {
    // Monolith Click
    const monolith = document.getElementById('monolith-orb');
    if (monolith) {
      monolith.addEventListener('pointerdown', (e) => {
        sound.ensureContext();
        this.clickerSystem.handleClick(e.clientX, e.clientY);
        monolith.classList.add('pulse');
        setTimeout(() => monolith.classList.remove('pulse'), 100);
      });
    }

    // Golden Anomaly Click
    const anomaly = document.getElementById('golden-anomaly');
    if (anomaly) {
      anomaly.addEventListener('click', (e) => {
        this.clickerSystem.clickAnomaly(e.clientX, e.clientY);
      });
    }

    // Buy amount toggles (1, 10, 25, 100, max)
    const buyBtns = document.querySelectorAll('.buy-amt-btn');
    buyBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        buyBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const amt = btn.dataset.amount;
        this.buildingSystem.buyAmount = amt === 'max' ? 'max' : parseInt(amt, 10);
        this.updateBuildingsUI();
      });
    });

    // Time Warp button
    const warpBtn = document.getElementById('btn-time-warp');
    if (warpBtn) {
      warpBtn.addEventListener('click', () => {
        if (this.gameState.chronoSand >= 30) {
          this.gameState.chronoSand -= 30;
          for (let i = 0; i < 300; i++) this.onSimTick(0.1);
          sound.playSpell();
          particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, '⚡ 30s TIME WARP!', '#38bdf8', true);
        }
      });
    }

    // Sound toggle & volume
    const muteBtn = document.getElementById('btn-mute');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        sound.setMuted(!sound.muted);
        muteBtn.textContent = sound.muted ? '🔇 Muted' : '🔊 Sound On';
      });
    }

    const volSlider = document.getElementById('volume-slider');
    if (volSlider) {
      volSlider.addEventListener('input', (e) => {
        sound.setVolume(parseFloat(e.target.value));
      });
    }

    // Save Controls
    const saveBtn = document.getElementById('btn-manual-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveManager.save();
        sound.playBuy();
        particles.spawnFloatingText(window.innerWidth / 2, 50, 'GAME SAVED!', '#4ade80', false);
      });
    }

    const exportBtn = document.getElementById('btn-export-save');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const str = this.saveManager.exportSaveString();
        navigator.clipboard?.writeText(str);
        alert('Save code copied to clipboard!\n\n' + str.substring(0, 50) + '...');
      });
    }

    const importBtn = document.getElementById('btn-import-save');
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        const input = prompt('Paste your exported save code here:');
        if (input) {
          if (this.saveManager.importSaveString(input)) {
            alert('Save loaded successfully!');
            window.location.reload();
          } else {
            alert('Invalid save code!');
          }
        }
      });
    }

    const resetBtn = document.getElementById('btn-hard-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to HARD RESET? All 365 days of progress will be erased!')) {
          this.saveManager.hardReset();
        }
      });
    }

    // Event Delegation: Buildings List (PERMANENT DELEGATION)
    const bList = document.getElementById('building-list');
    if (bList) {
      bList.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-buy-building');
        if (btn) {
          const id = btn.dataset.id;
          sound.ensureContext();
          this.buildingSystem.buyBuilding(id);
          this.updateBuildingsUI();
        }
      });
    }

    // Event Delegation: Combat Skills & Monster Attack
    const skillsCont = document.getElementById('combat-skills-bar');
    if (skillsCont) {
      skillsCont.addEventListener('click', (e) => {
        const btn = e.target.closest('.combat-skill-btn');
        if (btn && !btn.classList.contains('cooldown')) {
          this.combatSystem.castHeroSkill(btn.dataset.skill);
          this.updateCombatUI();
        }
      });
    }

    const monsterCard = document.getElementById('monster-arena-box');
    if (monsterCard) {
      monsterCard.addEventListener('pointerdown', (e) => {
        sound.ensureContext();
        this.combatSystem.activeClickAttack(e.clientX, e.clientY);
        monsterCard.classList.add('hit-shake');
        setTimeout(() => monsterCard.classList.remove('hit-shake'), 80);
      });
    }
    
    const btnForge = document.getElementById('btn-forge-awaken');
    if (btnForge) {
      btnForge.addEventListener('click', () => {
        if (this.combatSystem.upgradeAetherForge()) {
          this.updateCombatUI();
          this.updateHeaderStats();
        }
      });
    }

    // Event Delegation: Mining Grid
    const mineBoard = document.getElementById('mining-grid-board');
    if (mineBoard) {
      mineBoard.addEventListener('pointerdown', (e) => {
        const tile = e.target.closest('.mine-tile.unrevealed');
        if (tile) {
          const idx = parseInt(tile.dataset.index, 10);
          sound.ensureContext();
          this.miningSystem.mineBlock(idx, e.clientX, e.clientY);
          this.updateMiningUI();
        }
      });
    }

    // Event Delegation: Mining Shop (buttons are updated in place every frame)
    const mineShop = document.getElementById('mining-pickaxe-info');
    if (mineShop) {
      mineShop.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        sound.ensureContext();
        if (btn.id === 'btn-upgrade-pick') this.miningSystem.upgradePickaxe();
        else if (btn.id === 'btn-buy-drill') this.miningSystem.buyAutoDrill();
        else if (btn.id === 'btn-mining-dynamite') this.miningSystem.useDynamite();
        else return;
        this.updateMiningUI();
      });
    }

    // Event Delegation: Garden Plots
    const gardenBoard = document.getElementById('garden-plot-grid');
    if (gardenBoard) {
      gardenBoard.addEventListener('click', (e) => {
        const plotEl = e.target.closest('.garden-plot');
        if (plotEl) {
          const idx = parseInt(plotEl.dataset.index, 10);
          const p = this.gameState.garden.plots[idx];
          if (p.stage === 'mature') {
            this.gardenSystem.harvestPlot(idx, e.clientX, e.clientY);
          } else if (!p.seed) {
            this.gardenSystem.plantSeed(idx);
          }
          this.updateGardenUI();
        }
      });
    }

    // Event Delegation: Alchemy Recipes
    const alcList = document.getElementById('alchemy-recipes-list');
    if (alcList) {
      alcList.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-brew');
        if (btn && btn.classList.contains('active')) {
          this.alchemySystem.brew(btn.dataset.recipe);
          this.updateAlchemyUI();
        }
      });
    }

    // Event Delegation: Spells
    const spellsGrid = document.getElementById('spells-grid-container');
    if (spellsGrid) {
      spellsGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-cast-spell');
        if (btn && btn.classList.contains('active')) {
          this.spellSystem.castSpell(btn.dataset.id);
          this.updateSpellsUI();
        }
      });
    }

    // Event Delegation: Talents
    const talentGrid = document.getElementById('talents-tree-grid');
    if (talentGrid) {
      talentGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-rank-talent');
        if (btn && btn.classList.contains('active')) {
          this.talentSystem.upgradeTalent(btn.dataset.id);
          this.updateTalentsUI();
        }
      });
    }

    // Event Delegation: Bounties & Quartermaster
    const bountiesTab = document.getElementById('tab-bounties');
    if (bountiesTab) {
      bountiesTab.addEventListener('click', (e) => {
        const claimBtn = e.target.closest('.btn-claim-bounty.ready');
        if (claimBtn) {
          this.bountySystem.claimBounty(claimBtn.dataset.id);
          this.buildBountiesStructure();
        }
        
        const qmBtn = e.target.closest('.btn-buy-qm-upgrade');
        if (qmBtn && qmBtn.classList.contains('active')) {
          this.bountySystem.buyQuartermasterUpgrade(qmBtn.dataset.id);
          this.updateQuartermasterUI();
        }
      });
    }

    // Event Delegation: Market
    const marketList = document.getElementById('market-commodities-list');
    if (marketList) {
      marketList.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        if (!id) return;
        if (e.target.classList.contains('btn-market-buy')) this.marketSystem.buyCommodity(id, 1);
        else if (e.target.classList.contains('btn-market-buy10')) this.marketSystem.buyCommodity(id, 10);
        else if (e.target.classList.contains('btn-market-sell')) this.marketSystem.sellCommodity(id, 1);
        else if (e.target.classList.contains('btn-market-sellall')) this.marketSystem.sellAll(id);
        this.updateMarketUI();
      });
    }

    const btnEnchanter = document.getElementById('btn-buy-enchanter');
    if (btnEnchanter) {
      btnEnchanter.addEventListener('click', () => {
        if (this.marketSystem.buyEnchanter()) {
          this.updateMarketUI();
        }
      });
    }

    // Event Delegation: Prestige Perks
    const perkGrid = document.getElementById('ascension-perks-grid');
    if (perkGrid) {
      perkGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-buy-perk');
        if (btn && btn.classList.contains('active')) {
          this.prestigeSystem.buyPerk(btn.dataset.id);
          this.updatePrestigeUI();
        }
      });
    }
  }

  showOfflineModal(res) {
    const modal = document.getElementById('offline-modal');
    if (!modal) return;
    const hours = (res.elapsedSeconds / 3600).toFixed(1);
    document.getElementById('offline-time-text').textContent = `${hours} hours`;
    document.getElementById('offline-aether-text').textContent = res.gainedAether.format('standard', 2);
    document.getElementById('offline-chrono-text').textContent = `+${res.chronoEarned} Chrono Sand`
      + (res.gardenHarvests ? ` · Garden Golems: +${res.gardenHarvests} harvests` : '');
    modal.classList.add('visible');

    const closeBtn = document.getElementById('offline-modal-close');
    if (closeBtn) {
      closeBtn.onclick = () => modal.classList.remove('visible');
    }
  }

  // Build the initial DOM cards once (never destroyed every frame!)
  // One "Active Bonuses" strip per subgame tab, placed after its guide banner
  buildTabBonusStrips() {
    for (const section of document.querySelectorAll('section.tab-view')) {
      const tab = section.id.replace('tab-', '');
      if (['settings', 'about', 'talents', 'leaderboard'].includes(tab)) continue;
      const strip = document.createElement('div');
      strip.className = 'tab-bonus-strip';
      strip.id = `tab-bonus-${tab}`;
      const banner = section.querySelector('.tab-guide-banner');
      if (banner) banner.after(strip); else section.prepend(strip);

      // Quick Cast bar: built once, updated in place, clicks delegated below
      const spellIds = SPELL_TABS[tab];
      if (spellIds) {
        const bar = document.createElement('div');
        bar.className = 'quick-cast-bar';
        bar.id = `quick-cast-${tab}`;
        bar.innerHTML = `<span class="tab-bonus-title">Quick Cast</span>` + spellIds.map(id => {
          const s = SPELLS.find(sp => sp.id === id);
          return `<button class="quick-cast-btn" data-spell="${id}" title="${s.desc}">
            <span class="qc-name">${s.icon} ${s.name}</span><span class="qc-state" data-qc-state="${id}"></span>
          </button>`;
        }).join('');
        strip.after(bar);
      }
    }
    document.getElementById('content-area')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.quick-cast-btn');
      if (!btn) return;
      sound.ensureContext();
      this.spellSystem.castSpell(btn.dataset.spell);
    });
  }

  updateQuickCastBar() {
    const bar = document.getElementById(`quick-cast-${this.currentTab}`);
    if (!bar) return;
    for (const btn of bar.querySelectorAll('.quick-cast-btn')) {
      const id = btn.dataset.spell;
      const s = SPELLS.find(sp => sp.id === id);
      const cd = this.gameState.spells[id]?.cd || 0;
      const buff = this.gameState.activeBuffs.find(b => b.id === id);
      let state;
      if (buff) state = `active ${Math.ceil(buff.duration)}s`;
      else if (cd > 0) state = `${Math.ceil(cd)}s`;
      else state = `${s.manaCost} mana`;
      const stateEl = btn.querySelector('.qc-state');
      if (stateEl.textContent !== state) stateEl.textContent = state;
      const castable = this.spellSystem.canCast(id);
      btn.classList.toggle('ready', castable);
      btn.classList.toggle('disabled', !castable);
      btn.classList.toggle('buff-active', !!buff);
    }
  }

  updateTabBonusStrip(dt) {
    this.bonusStripTimer = (this.bonusStripTimer || 0) + dt;
    if (this.bonusStripTimer < 0.25 && !this.tabNeedsFullRender[this.currentTab]) return;
    this.bonusStripTimer = 0;
    const strip = document.getElementById(`tab-bonus-${this.currentTab}`);
    if (!strip) return;
    const items = getTabBonuses(this.gameState, this.currentTab, TALENT_DEFINITIONS, ASCENSION_PERKS);
    const html = items.length === 0 ? '' :
      `<span class="tab-bonus-title">Active Bonuses</span>` +
      items.map(i => `<span class="tab-bonus-chip ${i.kind}">${i.icon} <strong>${i.name}</strong> ${i.detail}</span>`).join('');
    if (strip.innerHTML !== html) strip.innerHTML = html;
    strip.style.display = items.length ? '' : 'none';
  }

  buildStaticUI() {
    this.leaderboard.build();
    this.buildTabBonusStrips();
    this.buffBar = new BuffBar(this);
    this.buffBar.build();
    this.buildBuildingsStructure();
    this.buildCombatStructure();
    this.buildMiningStructure();
    this.buildGardenStructure();
    this.buildAlchemyStructure();
    this.buildSpellsStructure();
    this.buildTalentsStructure();
    this.buildBountiesStructure();
    this.buildMarketStructure();
    this.buildPrestigeStructure();
    this.buildCodexStructure();
  }

  // --- Monolith & Building Structures ---
  buildBuildingsStructure() {
    const container = document.getElementById('building-list');
    if (!container) return;

    container.innerHTML = BUILDING_DEFINITIONS.map(def => `
      <div class="building-card" id="b-card-${def.id}" data-id="${def.id}">
        <div class="b-icon">${def.icon}</div>
        <div class="b-info">
          <div class="b-header">
            <span class="b-name">${def.name}</span>
            <span class="b-count" id="b-count-${def.id}">0</span>
          </div>
          <div class="b-desc">${def.desc}</div>
          <div class="b-stats" id="b-stats-${def.id}">Yield: +0/s</div>
        </div>
        <button class="btn-buy-building" id="btn-buy-${def.id}" data-id="${def.id}">
          <span class="buy-lbl" id="buy-lbl-${def.id}">Buy +1</span>
          <span class="cost-lbl" id="cost-lbl-${def.id}">💎 0</span>
        </button>
      </div>
    `).join('');

    this.updateBuildingsUI();
  }

  updateBuildingsUI() {
    const buyAmt = this.buildingSystem.buyAmount;

    for (const def of BUILDING_DEFINITIONS) {
      const state = this.gameState.buildings[def.id] || { count: 0 };
      let cost = BigNum.zero();
      let buyCount = 1;

      if (buyAmt === 'max') {
        const maxInfo = this.buildingSystem.getMaxBuyable(def.id);
        if (maxInfo.count > 0) {
          cost = maxInfo.cost;
          buyCount = maxInfo.count;
        } else {
          cost = this.buildingSystem.getBuildingCost(def.id, 1);
          buyCount = 1;
        }
      } else {
        buyCount = buyAmt;
        cost = this.buildingSystem.getBuildingCost(def.id, buyCount);
      }

      const canAfford = this.gameState.aether.gte(cost) && buyCount > 0;
      const currentCps = this.buildingSystem.getBuildingProduction(def.id);

      const countEl = document.getElementById(`b-count-${def.id}`);
      if (countEl) countEl.textContent = state.count;

      const statsEl = document.getElementById(`b-stats-${def.id}`);
      if (statsEl) statsEl.textContent = `Yield: +${currentCps.format('standard', 1)}/s`;

      const buyLbl = document.getElementById(`buy-lbl-${def.id}`);
      if (buyLbl) buyLbl.textContent = `Buy +${buyCount}`;

      const costLbl = document.getElementById(`cost-lbl-${def.id}`);
      if (costLbl) costLbl.textContent = `💎 ${cost.format('standard', 1)}`;

      const card = document.getElementById(`b-card-${def.id}`);
      if (card) {
        card.classList.toggle('affordable', canAfford);
        card.classList.toggle('unaffordable', !canAfford);
      }

      const btn = document.getElementById(`btn-buy-${def.id}`);
      if (btn) {
        btn.classList.toggle('active', canAfford);
        btn.classList.toggle('disabled', !canAfford);
      }
    }
  }

  // --- Combat Structure ---
  buildCombatStructure() {
    const skillsCont = document.getElementById('combat-skills-bar');
    if (skillsCont && this.gameState.hero) {
      skillsCont.innerHTML = Object.entries(this.gameState.hero.skills).map(([key, s]) => `
        <button class="combat-skill-btn ready" id="btn-cskill-${key}" data-skill="${key}">
          <div class="sk-name">${s.name}</div>
          <div class="sk-cd" id="sk-cd-${key}">READY</div>
        </button>
      `).join('');
    }
  }

  updateCombatUI() {
    const h = this.gameState.hero;
    const m = this.combatSystem.monster;
    if (!h || !m) return;

    const floorEl = document.getElementById('combat-floor-title');
    if (floorEl) {
      const zone = this.combatSystem.getZone(h.floor);
      floorEl.innerHTML = `<span style="color: ${zone.color}">${zone.icon} Floor ${h.floor}: ${zone.name}</span>`;
    }

    const heroHpEl = document.getElementById('hero-hp-text');
    const heroHpBar = document.getElementById('hero-hp-fill');
    const maxHp = this.combatSystem.getTotalMaxHp();
    if (heroHpEl) heroHpEl.textContent = `${Math.floor(h.hp)} / ${maxHp} HP ${h.shield > 0 ? `(+${h.shield} Shield)` : ''}`;
    if (heroHpBar) heroHpBar.style.width = `${Math.min(100, (h.hp / maxHp) * 100)}%`;

    const heroAtkEl = document.getElementById('hero-atk-text');
    if (heroAtkEl) heroAtkEl.textContent = `Attack: ${this.combatSystem.getTotalAttack()} (Spd: ${h.attackSpeed}s)`;

    const heroLvlEl = document.getElementById('hero-lvl-text');
    if (heroLvlEl) heroLvlEl.textContent = `Level ${h.level} (${h.xp} / ${h.xpNeeded} XP)`;

    const monsterNameEl = document.getElementById('monster-name');
    const monsterHpEl = document.getElementById('monster-hp-text');
    const monsterHpBar = document.getElementById('monster-hp-fill');
    const bossTimerEl = document.getElementById('boss-timer');

    if (monsterNameEl) monsterNameEl.textContent = m.name;
    if (monsterHpEl) monsterHpEl.textContent = `${Math.max(0, m.hp)} / ${m.maxHp} HP`;
    if (monsterHpBar) monsterHpBar.style.width = `${Math.max(0, (m.hp / m.maxHp) * 100)}%`;

    if (bossTimerEl) {
      if (m.isBoss) {
        bossTimerEl.style.display = 'block';
        bossTimerEl.textContent = `⏱️ Enrage: ${m.timer.toFixed(1)}s`;
      } else {
        bossTimerEl.style.display = 'none';
      }
    }

    // Update skill cooldowns
    for (const [key, s] of Object.entries(h.skills)) {
      const btn = document.getElementById(`btn-cskill-${key}`);
      const cdEl = document.getElementById(`sk-cd-${key}`);
      const onCd = s.cd > 0;
      if (btn) {
        btn.classList.toggle('cooldown', onCd);
        btn.classList.toggle('ready', !onCd);
      }
      if (cdEl) {
        cdEl.textContent = onCd ? `${s.cd.toFixed(1)}s` : 'READY';
      }
    }

    // Gear
    const gearCont = document.getElementById('hero-gear-container');
    const gearSig = JSON.stringify(h.gear);
    if (gearCont && this.lastGearSig !== gearSig) {
      this.lastGearSig = gearSig;
      gearCont.innerHTML = `
        <div class="gear-slot" style="border-color: ${h.gear.weapon?.color || '#64748b'}">
          <div class="slot-title">Weapon</div>
          <div class="slot-item">${h.gear.weapon?.name || 'Empty'} (+${h.gear.weapon?.attack || 0} Atk)</div>
        </div>
        <div class="gear-slot" style="border-color: ${h.gear.armor?.color || '#64748b'}">
          <div class="slot-title">Armor</div>
          <div class="slot-item">${h.gear.armor?.name || 'Empty'} (+${h.gear.armor?.hp || 0} HP)</div>
        </div>
        <div class="gear-slot" style="border-color: ${h.gear.amulet?.color || '#64748b'}">
          <div class="slot-title">Amulet</div>
          <div class="slot-item">${h.gear.amulet?.name || 'Empty'} (+${((h.gear.amulet?.crit || 0) * 100).toFixed(0)}% Crit)</div>
        </div>
        <div class="gear-slot" style="border-color: ${h.gear.relic?.color || '#64748b'}">
          <div class="slot-title">Relic</div>
          <div class="slot-item">${h.gear.relic?.name || 'Empty'} (+${((h.gear.relic?.lifesteal || 0) * 100).toFixed(0)}% Drain)</div>
        </div>
      `;
    }

    // Aether Forge
    const forgeLevelEl = document.getElementById('forge-level');
    const forgeCostEl = document.getElementById('forge-cost');
    const btnForge = document.getElementById('btn-forge-awaken');
    if (forgeLevelEl) {
      const fLevel = h.aetherForgeLevel || 0;
      const fCost = this.combatSystem.getAetherForgeCost();
      forgeLevelEl.textContent = fLevel;
      forgeCostEl.textContent = fCost.format('standard', 1);
      if (this.gameState.aether.gte(fCost)) {
        btnForge.disabled = false;
        btnForge.style.opacity = 1.0;
      } else {
        btnForge.disabled = true;
        btnForge.style.opacity = 0.5;
      }
    }
  }

  // --- Mining Structure ---
  buildMiningStructure() {
    this.updateMiningUI(true);
  }

  updateMiningUI(forceRebuildGrid = false) {
    const grid = this.gameState.miningGrid;
    if (!grid) return;

    const fmt = (n, precision = 0) => (n < 1000 ? String(n) : new BigNum(n).format('standard', precision));
    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el && el.textContent !== text) el.textContent = text;
    };

    const depthEl = document.getElementById('mining-depth-title');
    const strata = this.miningSystem.getCurrentStrata();
    if (depthEl) {
      const title = `<span style="color: ${strata.color}">${strata.icon} Depth ${grid.depth} - ${strata.name} Strata</span>`;
      if (this.lastMiningTitle !== title) {
        this.lastMiningTitle = title;
        depthEl.innerHTML = title;
      }
    }

    const pickaxeEl = document.getElementById('mining-pickaxe-info');
    if (pickaxeEl) {
      // Build the shop once and update it in place: this runs every render frame, and
      // replacing the buttons' DOM between mousedown and mouseup swallows clicks.
      // Clicks are handled by delegation in setupEventListeners.
      if (!document.getElementById('btn-buy-drill')) {
        pickaxeEl.innerHTML = `
          <div>Pickaxe: <strong id="mining-pick-name"></strong> (Lv <span id="mining-pick-level"></span>, Power: <span id="mining-pick-power"></span>)</div>
          <div>Auto-Drills: <strong id="mining-drill-count"></strong> (<span id="mining-drill-rate"></span> hits/sec)</div>
          <div class="mining-stats-line">Tile HP: <span id="mining-tile-hp"></span> · Stone per tile: <span id="mining-stone-yield"></span></div>
          <div class="mining-btn-group">
            <button id="btn-upgrade-pick" class="btn-action"></button>
            <button id="btn-buy-drill" class="btn-action"></button>
            <button id="btn-mining-dynamite" class="btn-action"></button>
          </div>
        `;
      }

      const stone = this.gameState.inventory.stone || 0;
      const level = grid.pickaxeTier || 0;

      setText('mining-pick-name', getPickaxeName(level));
      setText('mining-pick-level', String(level));
      setText('mining-pick-power', fmt(this.miningSystem.getPickaxePower(), 1));
      setText('mining-drill-count', String(grid.autoDrills));
      setText('mining-drill-rate', this.miningSystem.getAutoDrillRate().toFixed(1));
      setText('mining-tile-hp', fmt(strata.maxHp, 1));
      setText('mining-stone-yield', fmt(this.miningSystem.getStoneYield(), 1));

      const pickCost = this.miningSystem.getPickaxeCost();
      setText('btn-upgrade-pick', `Upgrade to ${getPickaxeName(level + 1)} (${fmt(pickCost, 2)} Stone)`);
      document.getElementById('btn-upgrade-pick').classList.toggle('disabled', stone < pickCost);

      const drillCost = this.miningSystem.getAutoDrillCost();
      setText('btn-buy-drill', `Buy Auto-Drill (${fmt(drillCost, 2)} Stone)`);
      document.getElementById('btn-buy-drill').classList.toggle('disabled', stone < drillCost);

      const cd = this.miningSystem.dynamiteCooldown;
      setText('btn-mining-dynamite', `🧨 Blast 3x3 (${cd > 0 ? `${Math.ceil(cd)}s` : 'Ready'})`);
      document.getElementById('btn-mining-dynamite').classList.toggle('disabled', cd > 0);
    }

    const tileContent = (b) => {
      let icon = '⛏️'; let label = 'Stone';
      if (b.content === 'stairs') { icon = '🪜'; label = 'STAIRS'; }
      else if (b.content === 'gold_cache') { icon = '💰'; label = 'Gold'; }
      else if (b.content === 'ruby') { icon = '🔴'; label = 'Ruby'; }
      else if (b.content === 'sapphire') { icon = '🔵'; label = 'Sapphire'; }
      else if (b.content === 'emerald') { icon = '🟢'; label = 'Emerald'; }
      else if (b.content === 'diamond') { icon = '💎'; label = 'Diamond'; }
      else if (b.content === 'voidAmethyst') { icon = '🟣'; label = 'Void Amethyst'; }
      return `<span class="m-icon">${icon}</span><span class="m-lbl">${label}</span>`;
    };

    const container = document.getElementById('mining-grid-board');
    if (container) {
      // Key the rebuild on the blocks array itself: a new grid is generated 400ms after
      // the depth changes, so keying on depth left stale revealed tiles over the new grid.
      if (forceRebuildGrid || container.children.length === 0 || this.lastMiningBlocks !== grid.blocks) {
        this.lastMiningBlocks = grid.blocks;
        container.innerHTML = grid.blocks.map(b => b.revealed ? `
          <div class="mine-tile revealed" id="mine-tile-${b.id}" data-index="${b.id}" style="border-color: ${strata.color}">${tileContent(b)}</div>
        ` : `
          <div class="mine-tile unrevealed" id="mine-tile-${b.id}" data-index="${b.id}" style="border-color: ${strata.color}">
            <div class="tile-hp-bar" id="tile-bar-${b.id}" style="width: ${(b.hp / b.maxHp) * 100}%"></div>
            <span class="tile-hp-text" id="tile-text-${b.id}">${fmt(b.hp, 1)}/${fmt(b.maxHp, 1)}</span>
          </div>
        `).join('');
      } else {
        // Fast update without wiping DOM
        for (const b of grid.blocks) {
          const tile = document.getElementById(`mine-tile-${b.id}`);
          if (!tile) continue;
          if (b.revealed && !tile.classList.contains('revealed')) {
            tile.classList.remove('unrevealed');
            tile.classList.add('revealed');
            tile.innerHTML = tileContent(b);
          } else if (!b.revealed) {
            const bar = document.getElementById(`tile-bar-${b.id}`);
            const txt = document.getElementById(`tile-text-${b.id}`);
            if (bar) bar.style.width = `${(b.hp / b.maxHp) * 100}%`;
            if (txt) {
              const hpText = `${fmt(b.hp, 1)}/${fmt(b.maxHp, 1)}`;
              if (txt.textContent !== hpText) txt.textContent = hpText;
            }
          }
        }
      }
    }

    const invEl = document.getElementById('minerals-inventory');
    if (invEl) {
      const inv = this.gameState.inventory;
      invEl.innerHTML = `
        <span class="res-badge">Stone: ${fmt(inv.stone || 0, 2)}</span>
        <span class="res-badge" style="color:#ef4444">Rubies: ${inv.rubies || 0}</span>
        <span class="res-badge" style="color:#3b82f6">Sapphires: ${inv.sapphires || 0}</span>
        <span class="res-badge" style="color:#10b981">Emeralds: ${inv.emeralds || 0}</span>
        <span class="res-badge" style="color:#38bdf8">Diamonds: ${inv.diamonds || 0}</span>
        <span class="res-badge" style="color:#a855f7">Void Amethyst: ${inv.voidAmethyst || 0}</span>
      `;
    }
  }

  // --- Garden Structure ---
  buildGardenStructure() {
    const seedBar = document.getElementById('garden-seed-selector');
    if (seedBar) {
      seedBar.innerHTML = Object.entries(SEED_TYPES).map(([id, def]) => `
        <button class="seed-select-btn ${this.gardenSystem.selectedSeed === id ? 'active' : ''}" id="seed-btn-${id}" data-seed="${id}">
          <span class="seed-ico">${def.icon}</span>
          <span class="seed-nm" id="seed-nm-${id}">${def.name} (0)</span>
        </button>
      `).join('');

      seedBar.querySelectorAll('.seed-select-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.gardenSystem.selectedSeed = btn.dataset.seed;
          seedBar.querySelectorAll('.seed-select-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });
    }

    const actionEl = document.getElementById('garden-actions');
    if (actionEl) {
      actionEl.innerHTML = `
        <button id="btn-water-garden" class="btn-action">💧 Water All (+${WATER_BOOST}s)</button>
        <button id="btn-fertilize-garden" class="btn-action" title="Costs 1 Spore Powder per growing plot. That plot's next harvest yields ×2 essence.">🧪 Fertilize All (1 Spore Powder each)</button>
        <button id="btn-harvest-all-garden" class="btn-action">🌾 Harvest All Mature</button>
        <button id="btn-plant-all-garden" class="btn-action">🌱 Plant All Empty</button>
      `;
      const waterBtn = document.getElementById('btn-water-garden');
      if (waterBtn) waterBtn.onclick = () => { this.gardenSystem.waterAll(); this.updateGardenUI(); };
      const fertBtn = document.getElementById('btn-fertilize-garden');
      if (fertBtn) fertBtn.onclick = () => { this.gardenSystem.fertilizeAll(); this.updateGardenUI(); };
      const harvestBtn = document.getElementById('btn-harvest-all-garden');
      if (harvestBtn) harvestBtn.onclick = () => { this.gardenSystem.harvestAll(); this.updateGardenUI(); };
      const plantBtn = document.getElementById('btn-plant-all-garden');
      if (plantBtn) plantBtn.onclick = () => { this.gardenSystem.plantAll(); this.updateGardenUI(); };
    }

    const gridCont = document.getElementById('garden-plot-grid');
    if (gridCont && this.gameState.garden) {
      gridCont.innerHTML = this.gameState.garden.plots.map(p => `
        <div class="garden-plot empty" id="garden-plot-${p.id}" data-index="${p.id}">
          <div class="p-icon" id="plot-ico-${p.id}"></div>
          <div class="p-status" id="plot-stat-${p.id}">Empty</div>
          <div class="plot-progress-bar"><div class="fill" id="plot-fill-${p.id}" style="width: 0%"></div></div>
        </div>
      `).join('');
    }

    // Garden Golems panel: built once; text/classes updated in place, clicks/changes delegated.
    const golemCont = document.getElementById('garden-golems');
    if (golemCont) {
      const seedOptions = `<option value="">Auto (highest owned)</option>` +
        Object.entries(SEED_TYPES).map(([id, def]) => `<option value="${id}">${def.icon} ${def.name}</option>`).join('');
      golemCont.innerHTML = `
        <div class="golem-header">
          <div>
            <strong>🗿 Garden Golems</strong> <span id="golem-count" class="res-badge">0 / ${MAX_GOLEMS}</span>
            <div class="golem-sub">Each Golem automates one row: harvests the moment a plot matures, then replants the same seed (or the row's fallback seed). Works offline at 50% speed for up to 12 h. Golems never water or fertilize.</div>
          </div>
          <button id="btn-buy-golem" class="btn-action" data-action="buy-golem">Buy Golem</button>
        </div>
        <div class="golem-rows">
          ${Array.from({ length: MAX_GOLEMS }, (_, r) => `
            <div class="golem-row locked" id="golem-row-${r}">
              <span class="golem-row-label">Row ${r + 1}</span>
              <span class="golem-row-status" id="golem-row-status-${r}">🔒 Manual</span>
              <label class="golem-row-seed">Fallback seed
                <select id="golem-row-seed-${r}" data-row="${r}">${seedOptions}</select>
              </label>
            </div>`).join('')}
        </div>
      `;
      golemCont.onclick = (e) => {
        const btn = e.target.closest('[data-action="buy-golem"]');
        if (!btn) return;
        if (this.gardenSystem.buyGolem()) {
          particles.spawnFloatingText(e.clientX, e.clientY, `🗿 ROW ${this.gameState.garden.golems} AUTOMATED`, '#4ade80', true);
        }
        this.updateGardenUI();
      };
      golemCont.onchange = (e) => {
        const sel = e.target.closest('select[data-row]');
        if (!sel) return;
        this.gardenSystem.setRowSeed(parseInt(sel.dataset.row, 10), sel.value || null);
        this.updateGardenUI();
      };
    }

    this.updateGardenUI();
  }

  formatGrowTime(secs) {
    const s = Math.max(0, Math.ceil(secs));
    if (s < 60) return `${s}s`;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  updateGardenUI() {
    const waterBtn = document.getElementById('btn-water-garden');
    if (waterBtn) {
      const cd = this.gardenSystem.waterCooldown;
      const label = cd > 0 ? `💧 Water All (${Math.ceil(cd)}s)` : `💧 Water All (+${WATER_BOOST}s)`;
      if (waterBtn.textContent !== label) waterBtn.textContent = label;
      waterBtn.classList.toggle('disabled', cd > 0);
    }

    const garden = this.gameState.garden;
    if (!garden) return;

    const fertBtn = document.getElementById('btn-fertilize-garden');
    if (fertBtn) {
      const canFert = (garden.essences.sporePowder || 0) >= 1 &&
        garden.plots.some(p => p.seed && !p.fertilized && p.progress < p.maxTime);
      fertBtn.classList.toggle('disabled', !canFert);
    }

    // Golem panel
    const golems = garden.golems || 0;
    const countEl = document.getElementById('golem-count');
    if (countEl) {
      const t = `${golems} / ${MAX_GOLEMS}`;
      if (countEl.textContent !== t) countEl.textContent = t;
    }
    const buyGolemBtn = document.getElementById('btn-buy-golem');
    if (buyGolemBtn) {
      const cost = this.gardenSystem.getNextGolemCost();
      const t = cost
        ? `🗿 Buy Golem (Row ${golems + 1}): ${new BigNum(cost.stone).format('standard', 0)} Stone + ${new BigNum(cost.manaSap).format('standard', 0)} Mana Sap`
        : '🗿 All rows automated';
      if (buyGolemBtn.textContent !== t) buyGolemBtn.textContent = t;
      buyGolemBtn.classList.toggle('disabled', !this.gardenSystem.canBuyGolem());
    }
    for (let r = 0; r < MAX_GOLEMS; r++) {
      const rowEl = document.getElementById(`golem-row-${r}`);
      if (!rowEl) continue;
      const status = this.gardenSystem.getRowStatus(r);
      const cls = `golem-row ${status}`;
      if (rowEl.className !== cls) rowEl.className = cls;
      const stEl = document.getElementById(`golem-row-status-${r}`);
      const st = status === 'locked' ? '🔒 Manual' : status === 'noseeds' ? '⚠️ No seeds' : '🗿 Automated';
      if (stEl && stEl.textContent !== st) stEl.textContent = st;
      const sel = document.getElementById(`golem-row-seed-${r}`);
      if (sel && document.activeElement !== sel) {
        const v = garden.rowSeed[r] || '';
        if (sel.value !== v) sel.value = v;
      }
    }

    for (const [id, def] of Object.entries(SEED_TYPES)) {
      const nmEl = document.getElementById(`seed-nm-${id}`);
      if (nmEl) nmEl.textContent = `${def.name} (${garden.inventory[id] || 0})`;
    }

    for (const p of garden.plots) {
      const plotEl = document.getElementById(`garden-plot-${p.id}`);
      const icoEl = document.getElementById(`plot-ico-${p.id}`);
      const statEl = document.getElementById(`plot-stat-${p.id}`);
      const fillEl = document.getElementById(`plot-fill-${p.id}`);
      if (!plotEl) continue;
      const golemCls = this.gardenSystem.isRowAutomated(this.gardenSystem.getRowOfPlot(p.id)) ? ' golem-tended' : '';

      if (!p.seed) {
        const cls = `garden-plot empty${golemCls}`;
        if (plotEl.className !== cls) plotEl.className = cls;
        if (icoEl && icoEl.textContent !== '') icoEl.textContent = '';
        if (statEl && statEl.textContent !== 'Empty') statEl.textContent = 'Empty';
        if (fillEl) fillEl.style.width = '0%';
      } else {
        const def = SEED_TYPES[p.seed];
        const isMature = p.stage === 'mature' || p.progress >= p.maxTime;
        const progressPct = Math.min(100, (p.progress / p.maxTime) * 100);

        const cls = `garden-plot planted${isMature ? ' mature' : ''}${p.fertilized ? ' fertilized' : ''}${golemCls}`;
        if (plotEl.className !== cls) plotEl.className = cls;
        if (icoEl && icoEl.textContent !== def.icon) icoEl.textContent = def.icon;
        const st = isMature ? '✨ READY TO HARVEST!' : `${def.name} (${this.formatGrowTime(p.maxTime - p.progress)})${p.fertilized ? ' 🧪' : ''}`;
        if (statEl && statEl.textContent !== st) statEl.textContent = st;
        if (fillEl) fillEl.style.width = `${progressPct}%`;
      }
    }

    const essEl = document.getElementById('garden-essences-list');
    if (essEl) {
      const ess = garden.essences;
      if (!essEl.dataset.built) {
        essEl.dataset.built = '1';
        essEl.innerHTML = Object.entries(ESSENCE_NAMES).map(([k, name]) =>
          `<span class="res-badge">${name}: <span id="ess-count-${k}">0</span></span>`).join(' ');
      }
      for (const k of Object.keys(ESSENCE_NAMES)) {
        const el = document.getElementById(`ess-count-${k}`);
        const v = String(ess[k] || 0);
        if (el && el.textContent !== v) el.textContent = v;
      }
    }
  }

  // --- Alchemy Structure ---
  buildAlchemyStructure() {
    const listCont = document.getElementById('alchemy-recipes-list');
    if (listCont) {
      listCont.innerHTML = RECIPES.map(r => {
        const costStr = Object.entries(this.alchemySystem.getRecipeCost(r)).map(([k, v]) =>
          `<span id="alc-cost-${r.id}-${k}">${v}</span>x ${INGREDIENT_NAMES[k] || k} (<span id="alc-own-${r.id}-${k}">0</span>)`).join(', ');
        return `
          <div class="alchemy-card" id="alc-card-${r.id}">
            <div class="alc-info">
              <div class="alc-name">${r.name}</div>
              <div class="alc-desc">${r.desc}</div>
              ${r.id === 'philosophers_catalyst' ? '<div class="alc-desc" id="alc-catalyst-status"></div>' : ''}
              <div class="alc-cost">Cost: ${costStr}</div>
            </div>
            <button class="btn-brew" id="btn-brew-${r.id}" data-recipe="${r.id}">
              🧪 Brew
            </button>
          </div>
        `;
      }).join('');
    }

    const transCont = document.getElementById('transmutation-actions');
    if (transCont) {
      transCont.innerHTML = `
        <button id="btn-transmute-stone" class="btn-action">🪙 Transmute 50 Stone ➔ Gold</button>
        <div class="chrono-transmute-group" id="chrono-transmute-group">
          <span class="chrono-transmute-lbl" id="chrono-transmute-lbl">⏳ Gold ➔ Chrono Sand:</span>
          <button class="btn-action" data-batches="1">x1</button>
          <button class="btn-action" data-batches="10">x10</button>
          <button class="btn-action" data-batches="100">x100</button>
          <button class="btn-action" data-batches="1000">x1K</button>
          <button class="btn-action" data-batches="max" id="btn-transmute-chrono-max">Max</button>
        </div>
      `;
      const tStone = document.getElementById('btn-transmute-stone');
      if (tStone) tStone.onclick = () => { this.alchemySystem.transmuteStoneToGold(); this.updateAlchemyUI(); };
      const chronoGroup = document.getElementById('chrono-transmute-group');
      if (chronoGroup) chronoGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-batches]');
        if (!btn) return;
        const b = btn.dataset.batches;
        this.alchemySystem.transmuteGoldToChrono(b === 'max' ? 'max' : parseInt(b, 10));
        this.updateAlchemyUI();
      });
    }

    this.updateAlchemyUI();
  }

  updateAlchemyUI() {
    const inv = this.gameState.inventory;
    const ess = this.gameState.garden?.essences || {};
    for (const r of RECIPES) {
      for (const [k, amount] of Object.entries(this.alchemySystem.getRecipeCost(r))) {
        const el = document.getElementById(`alc-own-${r.id}-${k}`);
        const v = `have ${inv[k] ?? ess[k] ?? 0}`;
        if (el && el.textContent !== v) el.textContent = v;
        const costEl = document.getElementById(`alc-cost-${r.id}-${k}`);
        const c = String(amount);
        if (costEl && costEl.textContent !== c) costEl.textContent = c;
      }
    }
    const catEl = document.getElementById('alc-catalyst-status');
    if (catEl) {
      const n = this.alchemySystem.getCatalystCount();
      const t = `Brewed: ${n} (Aether x${this.gameState.getCatalystMult().toFixed(2)})`;
      if (catEl.textContent !== t) catEl.textContent = t;
    }
    const chronoLbl = document.getElementById('chrono-transmute-lbl');
    if (chronoLbl) {
      const cap = this.gameState.getChronoSandCap();
      const t = `⏳ Gold ➔ Chrono Sand (${this.alchemySystem.getChronoBatchCost().format('standard', 2)} Gold = 30s, bank ${Math.floor(this.gameState.chronoSand || 0)}/${cap}s):`;
      if (chronoLbl.textContent !== t) chronoLbl.textContent = t;
    }
    const tStone = document.getElementById('btn-transmute-stone');
    if (tStone) tStone.classList.toggle('disabled', (inv.stone || 0) < 50);
    const maxBatches = this.alchemySystem.getMaxChronoBatches();
    document.querySelectorAll('#chrono-transmute-group button[data-batches]').forEach(btn => {
      const b = btn.dataset.batches;
      btn.classList.toggle('disabled', b === 'max' ? maxBatches < 1 : maxBatches < parseInt(b, 10));
    });
    const maxBtn = document.getElementById('btn-transmute-chrono-max');
    if (maxBtn) {
      const room = Math.max(0, this.gameState.getChronoSandCap() - (this.gameState.chronoSand || 0));
      const fill = Math.min(room, Math.floor(maxBatches * 30 * this.gameState.getChronoSandGainMult()));
      const label = maxBatches >= 1 ? `Max (+${new BigNum(fill).format('standard', 2)}s)` : (room <= 0 ? 'Max (bank full)' : 'Max');
      if (maxBtn.textContent !== label) maxBtn.textContent = label;
    }
    for (const r of RECIPES) {
      const can = this.alchemySystem.canBrew(r.id);
      const card = document.getElementById(`alc-card-${r.id}`);
      const btn = document.getElementById(`btn-brew-${r.id}`);
      if (card) {
        card.classList.toggle('can-brew', can);
        card.classList.toggle('cannot-brew', !can);
      }
      if (btn) {
        btn.classList.toggle('active', can);
        btn.classList.toggle('disabled', !can);
      }
    }
  }

  // --- Spells Structure ---
  buildSpellsStructure() {
    const cont = document.getElementById('spells-grid-container');
    if (cont) {
      cont.innerHTML = SPELLS.map(s => `
        <div class="spell-card" id="spell-card-${s.id}">
          <div class="sp-icon">${s.icon}</div>
          <div class="sp-details">
            <div class="sp-name">${s.name}</div>
            <div class="sp-desc">${s.desc}</div>
            <div class="sp-meta">Cost: ${s.manaCost} Mana | CD: ${s.cooldown}s</div>
          </div>
          <button class="btn-cast-spell" id="btn-spell-${s.id}" data-id="${s.id}">
            <span id="spell-text-${s.id}">✨ Cast</span>
          </button>
        </div>
      `).join('');
    }
    this.updateSpellsUI();
  }

  updateSpellsUI() {
    for (const s of SPELLS) {
      const state = this.gameState.spells[s.id] || { cd: 0 };
      const can = this.spellSystem.canCast(s.id);
      const onCd = state.cd > 0;

      const card = document.getElementById(`spell-card-${s.id}`);
      const btn = document.getElementById(`btn-spell-${s.id}`);
      const txt = document.getElementById(`spell-text-${s.id}`);

      if (card) card.classList.toggle('ready', can);
      if (btn) {
        btn.classList.toggle('active', can);
        btn.classList.toggle('disabled', !can);
      }
      if (txt) txt.textContent = onCd ? `${state.cd.toFixed(1)}s` : '✨ Cast';
    }
  }

  // --- Talents Structure ---
  buildTalentsStructure() {
    const ptsEl = document.getElementById('talent-points-header');
    if (ptsEl) {
      ptsEl.innerHTML = `
        <span>Talent Points Available: <strong id="tp-avail-count">0</strong></span>
        <button id="btn-respec-talents" class="btn-action" style="margin-left: 1rem">🔄 Respec All</button>
      `;
      const respecBtn = document.getElementById('btn-respec-talents');
      if (respecBtn) respecBtn.onclick = () => {
        if (this.gameState.spentTalentPoints <= 0) return;
        if (!confirm('Refund all spent talent points?')) return;
        this.talentSystem.respecTalents();
        this.updateTalentsUI();
      };
    }

    const grid = document.getElementById('talents-tree-grid');
    if (grid) {
      grid.innerHTML = TALENT_DEFINITIONS.map(t => `
        <div class="talent-card branch-${t.branch}">
          <div class="t-name">${t.name}</div>
          <div class="t-rank" id="t-rank-${t.id}">Rank 0 / ${t.maxRank}</div>
          <div class="t-desc">${t.desc}</div>
          <button class="btn-rank-talent" id="btn-talent-${t.id}" data-id="${t.id}">
            + Upgrade
          </button>
        </div>
      `).join('');
    }
    this.updateTalentsUI();
  }

  updateTalentsUI() {
    const tpCount = document.getElementById('tp-avail-count');
    if (tpCount) tpCount.textContent = this.gameState.talentPoints;
    const respecBtn = document.getElementById('btn-respec-talents');
    if (respecBtn) respecBtn.classList.toggle('disabled', this.gameState.spentTalentPoints <= 0);

    for (const t of TALENT_DEFINITIONS) {
      const state = this.gameState.talents[t.id] || { rank: 0 };
      const isMax = state.rank >= t.maxRank;
      const canRank = !isMax && this.gameState.talentPoints > 0;

      const rankEl = document.getElementById(`t-rank-${t.id}`);
      const btn = document.getElementById(`btn-talent-${t.id}`);

      if (rankEl) rankEl.textContent = `Rank ${state.rank} / ${t.maxRank}`;
      if (btn) {
        btn.textContent = isMax ? 'MAXED' : '+ Upgrade';
        btn.classList.toggle('active', canRank);
        btn.classList.toggle('disabled', !canRank);
      }
    }
  }

  // --- Bounties Structure ---
  buildBountiesStructure() {
    const cont = document.getElementById('bounties-list-container');
    if (cont) {
      cont.innerHTML = this.gameState.bounties.map(b => {
        const pct = Math.min(100, (b.current / b.required) * 100);
        return `
          <div class="bounty-card ${b.completed ? 'completed' : ''}" id="bounty-card-${b.id}">
            <div class="b-icon">${b.icon}</div>
            <div class="b-info">
              <div class="b-title">${b.title}</div>
              <div class="b-desc">${b.desc}</div>
              <div class="b-progress-bar"><div class="fill" id="bounty-fill-${b.id}" style="width: ${pct}%"></div></div>
              <div class="b-count" id="bounty-count-${b.id}">${b.current} / ${b.required}</div>
            </div>
            <div class="b-reward-box">
              <div>+${b.rewards.gold.format('standard', 0)} Gold</div>
              <div>+${b.rewards.chrono} Chrono Sand</div>
              <div>+${b.rewards.seals} Guild Seals</div>
              ${b.rewards.talentPoint ? '<div style="color:#ec4899;font-weight:bold">+1 Talent Point</div>' : ''}
              <button class="btn-claim-bounty ${b.completed ? 'ready' : 'disabled'}" id="bounty-btn-${b.id}" data-id="${b.id}">
                ${b.completed ? '🎁 Claim' : 'In Progress'}
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    this.updateQuartermasterUI();
  }

  updateBountiesUI() {
    for (const b of this.gameState.bounties) {
      const fill = document.getElementById(`bounty-fill-${b.id}`);
      if (!fill) continue;
      fill.style.width = `${Math.min(100, (b.current / b.required) * 100)}%`;
      const count = document.getElementById(`bounty-count-${b.id}`);
      const countText = `${b.current} / ${b.required}`;
      if (count && count.textContent !== countText) count.textContent = countText;
      const btn = document.getElementById(`bounty-btn-${b.id}`);
      if (btn && b.completed && !btn.classList.contains('ready')) {
        btn.classList.add('ready');
        btn.classList.remove('disabled');
        btn.textContent = '🎁 Claim';
        document.getElementById(`bounty-card-${b.id}`)?.classList.add('completed');
      }
    }
    this.updateQuartermasterUI();
  }

  updateQuartermasterUI() {
    const sealsEl = document.getElementById('qm-seals-count');
    if (sealsEl) sealsEl.textContent = this.gameState.guildSeals || 0;

    const qmGrid = document.getElementById('quartermaster-upgrades-grid');
    if (!qmGrid) return;
    
    // Check if we need to build the inner HTML
    if (qmGrid.children.length === 0) {
      import('./systems/BountySystem.js').then(module => {
        const QUARTERMASTER_UPGRADES = module.QUARTERMASTER_UPGRADES;
        qmGrid.innerHTML = QUARTERMASTER_UPGRADES.map(u => `
          <div class="perk-card">
            <div class="p-name">${u.icon} ${u.name}</div>
            <div class="p-rank" id="qm-rank-${u.id}">Rank: 0 / ${u.maxRank}</div>
            <div class="p-desc">${u.desc}</div>
            <button class="btn-buy-qm-upgrade" id="btn-qm-${u.id}" data-id="${u.id}">
              Buy
            </button>
          </div>
        `).join('');
        this.updateQuartermasterUI(); // Re-run to update values
      });
      return;
    }

    import('./systems/BountySystem.js').then(module => {
      const QUARTERMASTER_UPGRADES = module.QUARTERMASTER_UPGRADES;
      for (const u of QUARTERMASTER_UPGRADES) {
        const rank = this.gameState.quartermaster[u.id]?.rank || 0;
        const cost = u.baseCost + (rank * u.costInc);
        const canBuy = (this.gameState.guildSeals || 0) >= cost && rank < u.maxRank;

        const rEl = document.getElementById(`qm-rank-${u.id}`);
        const btn = document.getElementById(`btn-qm-${u.id}`);

        if (rEl) rEl.textContent = `Rank: ${rank} / ${u.maxRank}`;
        if (btn) {
          btn.textContent = rank >= u.maxRank ? 'MAXED' : `Buy (${cost} Seals)`;
          btn.classList.toggle('active', canBuy);
          btn.classList.toggle('disabled', !canBuy);
        }
      }
    });
  }

  // --- Market Structure ---
  buildMarketStructure() {
    const list = document.getElementById('market-commodities-list');
    if (list) {
      list.innerHTML = COMMODITIES.map(c => `
        <div class="commodity-row">
          <div class="c-info">
            <span class="c-icon">${c.icon}</span>
            <span class="c-name">${c.name}</span>
            <span class="c-trend" id="trend-${c.id}">⚖️ STABLE</span>
          </div>
          <div class="c-price"><strong id="price-${c.id}">${c.basePrice}</strong> Gold</div>
          <div class="c-owned">Owned: <strong id="owned-${c.id}">0</strong></div>
          <div class="c-actions">
            <button class="btn-market-buy" data-id="${c.id}">Buy 1</button>
            <button class="btn-market-buy10" data-id="${c.id}">Buy 10</button>
            <button class="btn-market-sell" data-id="${c.id}">Sell 1</button>
            <button class="btn-market-sellall" data-id="${c.id}">Sell All</button>
          </div>
        </div>
      `).join('');
    }
    this.updateMarketUI();
  }

  updateMarketUI() {
    const trendIcons = { surge: '🚀 SURGE', rising: '📈 RISING', stable: '⚖️ STABLE', falling: '📉 FALLING', crash: '💥 CRASH' };
    const trendColors = { surge: '#10b981', rising: '#4ade80', stable: '#94a3b8', falling: '#f87171', crash: '#ef4444' };

    for (const c of COMMODITIES) {
      const item = this.gameState.market?.items[c.id];
      if (!item) continue;

      const tEl = document.getElementById(`trend-${c.id}`);
      const pEl = document.getElementById(`price-${c.id}`);
      const oEl = document.getElementById(`owned-${c.id}`);

      if (tEl) {
        tEl.textContent = trendIcons[item.trend] || '⚖️ STABLE';
        tEl.style.color = trendColors[item.trend] || '#94a3b8';
      }
      if (pEl) {
        const price = this.marketSystem.getCommodityPrice(c.id);
        const priceText = price.format('standard', 2);
        if (pEl.textContent !== priceText) pEl.textContent = priceText;
        const row = pEl.closest('.commodity-row');
        row?.querySelector('.btn-market-buy')?.classList.toggle('disabled', !this.gameState.gold.gte(price));
        row?.querySelector('.btn-market-buy10')?.classList.toggle('disabled', !this.gameState.gold.gte(price.mul(new BigNum(10))));
      }
      if (oEl) oEl.textContent = item.owned;
    }
    const idxEl = document.getElementById('market-index-display');
    if (idxEl) {
      const idxText = `x${this.marketSystem.getMarketIndex().format('standard', 2)}`;
      if (idxEl.textContent !== idxText) idxEl.textContent = idxText;
    }

    const carCont = document.getElementById('market-caravan-panel');
    if (carCont) {
      // Built once and updated in place: rebuilding every frame swallowed button clicks
      if (!carCont.dataset.built) {
        carCont.dataset.built = '1';
        carCont.innerHTML = `
          <div class="caravan-active-card" id="caravan-active">
            <h3>🐪 Caravan In Transit</h3>
            <p>Time remaining: <span id="caravan-time"></span>s</p>
            <p>Investment: <span id="caravan-invest"></span> Gold | Returns: <span id="caravan-return"></span> Gold</p>
          </div>
          <div class="caravan-dispatch-box" id="caravan-dispatch">
            <h3>🐪 Dispatch Trade Caravan</h3>
            <p>Send gold into distant trade routes for guaranteed profit! Caravan sizes scale with your deepest Void Tower floor.</p>
            <button id="btn-send-caravan-1" class="btn-action"></button>
            <button id="btn-send-caravan-2" class="btn-action"></button>
          </div>
        `;
        carCont.addEventListener('click', (e) => {
          const btn = e.target.closest('button');
          if (!btn) return;
          if (btn.id === 'btn-send-caravan-1') this.marketSystem.dispatchCaravan('small');
          else if (btn.id === 'btn-send-caravan-2') this.marketSystem.dispatchCaravan('large');
          else return;
          this.updateMarketUI();
        });
      }
      const car = this.gameState.market?.caravan;
      const active = !!car?.active;
      document.getElementById('caravan-active').style.display = active ? '' : 'none';
      document.getElementById('caravan-dispatch').style.display = active ? 'none' : '';
      if (active) {
        document.getElementById('caravan-time').textContent = Math.ceil(car.duration);
        document.getElementById('caravan-invest').textContent = car.investment.format('standard', 0);
        document.getElementById('caravan-return').textContent = (car.payout ? new BigNum(car.payout) : car.investment.mul(car.expectedProfit)).format('standard', 2);
      } else {
        for (const [btnId, tier] of [['btn-send-caravan-1', 'small'], ['btn-send-caravan-2', 'large']]) {
          const t = this.marketSystem.getCaravanTier(tier);
          const btn = document.getElementById(btnId);
          const label = `Send ${t.invest.format('standard', 2)} Gold (${t.minutes} Min - ${t.profit}x Return)`;
          if (btn.textContent !== label) btn.textContent = label;
          btn.classList.toggle('disabled', !this.gameState.gold.gte(t.invest));
        }
      }
    }

    const enchanterLevel = document.getElementById('enchanter-level');
    const enchanterBonus = document.getElementById('enchanter-bonus');
    const enchanterCost = document.getElementById('enchanter-cost');
    const btnEnchanter = document.getElementById('btn-buy-enchanter');
    if (enchanterLevel && this.gameState.market) {
      const level = this.gameState.market.goldenSynergy || 0;
      const cost = this.marketSystem.getEnchanterCost();
      enchanterLevel.textContent = level;
      enchanterBonus.textContent = `+${level * 5}% Global Aether`;
      enchanterCost.textContent = cost.format('standard', 1);
      if (this.gameState.gold.gte(cost)) {
        btnEnchanter.disabled = false;
        btnEnchanter.style.opacity = 1.0;
      } else {
        btnEnchanter.disabled = true;
        btnEnchanter.style.opacity = 0.5;
      }
    }
  }

  // --- Prestige Structure ---
  buildPrestigeStructure() {
    const perksCont = document.getElementById('ascension-perks-grid');
    if (perksCont) {
      perksCont.innerHTML = ASCENSION_PERKS.map(p => `
        <div class="perk-card">
          <div class="p-name">${p.name}</div>
          <div class="p-rank" id="perk-rank-${p.id}">Rank: 0 / ${p.maxRank}</div>
          <div class="p-desc">${p.desc}</div>
          <button class="btn-buy-perk" id="btn-perk-${p.id}" data-id="${p.id}">
            Unlock
          </button>
        </div>
      `).join('');
    }

    const ascBtn = document.getElementById('btn-do-ascend');
    if (ascBtn) {
      ascBtn.onclick = () => {
        const dm = this.prestigeSystem.getDustMultipliers();
        const nectarNote = `\n\nNectar Offering: all ${dm.nectar} Celestial Nectar will be consumed (${fmtMult(dm.nectarMult)} dust).`;
        if (confirm(`Ascend now? This resets Aether and Buildings to grant permanent Cosmic Dust and God Perks!${nectarNote}`)) {
          this.prestigeSystem.ascend();
          this.updateBuildingsUI();
          this.updatePrestigeUI();
        }
      };
    }

    this.updatePrestigeUI();
  }

  // Masteries panel: rows built once, values updated in place (no buttons inside)
  updateMasteriesPanel() {
    const panel = document.getElementById('masteries-panel');
    if (!panel) return;
    const list = getMasteries(this.gameState);
    const key = list.map(m => m.id).join(',');
    if (panel.dataset.key !== key) {
      panel.dataset.key = key;
      panel.innerHTML = list.map(m => `
        <div class="mastery-row" data-mastery="${m.id}">
          <span class="m-name">${m.icon} ${m.name}</span>
          <span class="m-effect">${m.effect} <span class="m-rule">(${m.rule})</span></span>
          <span class="m-source"></span>
          <span class="m-value"></span>
        </div>`).join('');
    }
    for (const m of list) {
      const row = panel.querySelector(`[data-mastery="${m.id}"]`);
      if (!row) continue;
      const v = fmtMult(m.value);
      const valEl = row.querySelector('.m-value');
      const srcEl = row.querySelector('.m-source');
      if (valEl.textContent !== v) valEl.textContent = v;
      if (srcEl.textContent !== m.source) srcEl.textContent = m.source;
      row.classList.toggle('active', m.value > 1);
    }
  }

  updatePrestigeUI() {
    const pending = this.prestigeSystem.getPendingCosmicDust();
    const pendEl = document.getElementById('pending-dust-display');
    const ascBtn = document.getElementById('btn-do-ascend');

    if (pendEl) pendEl.textContent = `Pending Cosmic Dust: +${pending.format('standard', 0)}`;
    if (ascBtn) ascBtn.disabled = pending.lte(0);

    // Dust-gain links (Geode Attunement, Nectar Offering): text only, the button is never rebuilt
    const dm = this.prestigeSystem.getDustMultipliers();
    const breakdown = `${fmtMult(dm.geode)} from Depth ${dm.depth} · ${fmtMult(dm.nectarMult)} from ${dm.nectar} Nectar (consumed)`;
    const bdEl = document.getElementById('pending-dust-breakdown');
    if (bdEl && bdEl.textContent !== breakdown) bdEl.textContent = breakdown;
    if (ascBtn) {
      const tip = `Base ${this.prestigeSystem.getBaseCosmicDust().format('standard', 0)} Dust · ${breakdown}`;
      if (ascBtn.title !== tip) ascBtn.title = tip;
    }

    this.updateMasteriesPanel();

    for (const p of ASCENSION_PERKS) {
      const state = this.gameState.ascensionPerks[p.id] || { rank: 0 };
      const cost = new BigNum(p.cost * Math.pow(1.5, state.rank));
      const canBuy = this.gameState.cosmicDust.gte(cost) && state.rank < p.maxRank;

      const rEl = document.getElementById(`perk-rank-${p.id}`);
      const btn = document.getElementById(`btn-perk-${p.id}`);

      if (rEl) rEl.textContent = `Rank: ${state.rank} / ${p.maxRank}`;
      if (btn) {
        btn.textContent = state.rank >= p.maxRank ? 'MAXED' : `Unlock (${cost.format('standard', 0)} Dust)`;
        btn.classList.toggle('active', canBuy);
        btn.classList.toggle('disabled', !canBuy);
      }
    }

    const transCont = document.getElementById('transcendence-section');
    if (transCont) {
      // Built once and updated in place: rebuilding every frame swallowed button clicks
      if (!transCont.dataset.built) {
        transCont.dataset.built = '1';
        transCont.innerHTML = `
          <div class="transcend-box">
            <h3>🌌 Multiverse Transcendence (Prestige Tier 2)</h3>
            <p>Fracture Shards: <strong id="fracture-shards-count"></strong> (+10% All Aether Production each). Requires 50,000+ Total Cosmic Dust.</p>
            <button id="btn-do-transcend" class="btn-action"></button>
          </div>
        `;
        document.getElementById('btn-do-transcend').addEventListener('click', () => {
          if (!this.prestigeSystem.canTranscend()) return;
          if (confirm('Transcend Reality? This resets your Ascension (Cosmic Dust and perks) in exchange for Fracture Shards, each granting +10% All Aether Production permanently.')) {
            this.prestigeSystem.transcend();
            this.updateBuildingsUI();
            this.updatePrestigeUI();
          }
        });
      }
      const canT = this.prestigeSystem.canTranscend();
      const shardsEl = document.getElementById('fracture-shards-count');
      const shardsText = this.gameState.fractureShards.format('standard', 0);
      if (shardsEl.textContent !== shardsText) shardsEl.textContent = shardsText;
      const tBtn = document.getElementById('btn-do-transcend');
      const label = canT ? '✨ Transcend Reality!' : 'Locked (Needs 50K Cosmic Dust)';
      if (tBtn.textContent !== label) tBtn.textContent = label;
      tBtn.classList.toggle('active', canT);
      tBtn.classList.toggle('disabled', !canT);
    }
  }

  // --- Codex Structure ---
  buildCodexStructure() {
    this.updateCodexUI();
  }

  updateCodexUI() {
    const achList = document.getElementById('achievements-grid');
    if (achList) {
      const unlockedCount = this.achievementSystem.getUnlockedCount();
      const countEl = document.getElementById('achievements-unlocked-title');
      if (countEl) countEl.textContent = `Unlocked: ${unlockedCount} / ${ACHIEVEMENTS.length} (+${(unlockedCount * 1.5).toFixed(1)}% Global Bonus)`;

      achList.innerHTML = ACHIEVEMENTS.map(a => {
        const isUnlocked = !!this.gameState.achievements[a.id];
        return `
          <div class="ach-card ${isUnlocked ? 'unlocked' : 'locked'}">
            <div class="a-icon">${isUnlocked ? a.icon : '🔒'}</div>
            <div class="a-name">${isUnlocked ? a.name : '???'}</div>
            <div class="a-desc">${isUnlocked ? a.desc : 'Milestone undiscovered'}</div>
          </div>
        `;
      }).join('');
    }

    const statsCont = document.getElementById('game-stats-container');
    if (statsCont) {
      const s = this.gameState.stats;
      const days = (s.totalPlayTimeSeconds / 86400).toFixed(2);
      const hours = (s.totalPlayTimeSeconds / 3600).toFixed(1);

      statsCont.innerHTML = `
        <div class="stat-line"><span>Playtime:</span><strong>${days} Days (${hours} Hours)</strong></div>
        <div class="stat-line"><span>Total Clicks:</span><strong>${this.gameState.totalClicks}</strong></div>
        <div class="stat-line"><span>Total Aether Gathered:</span><strong>${this.gameState.totalAetherEarned.format('standard', 2)}</strong></div>
        <div class="stat-line"><span>Monsters Vanquished:</span><strong>${s.totalMonstersSlain}</strong></div>
        <div class="stat-line"><span>Bosses Vanquished:</span><strong>${s.totalBossesSlain}</strong></div>
        <div class="stat-line"><span>Blocks Excavated:</span><strong>${s.totalBlocksMined}</strong></div>
        <div class="stat-line"><span>Plants Harvested:</span><strong>${s.totalPlantsHarvested}</strong></div>
        <div class="stat-line"><span>Potions Brewed:</span><strong>${s.totalPotionsBrewed}</strong></div>
        <div class="stat-line"><span>Spells Cast:</span><strong>${s.totalSpellsCast}</strong></div>
        <div class="stat-line"><span>Guild Contracts Fulfilled:</span><strong>${s.totalBountiesCompleted}</strong></div>
        <div class="stat-line"><span>Ascensions:</span><strong>${this.gameState.ascensionCount}</strong></div>
      `;
    }
  }

  // Simulation tick (fixed rate)
  onSimTick(dt, realDt = dt) {
    this.clickerSystem.update(dt);
    this.combatSystem.update(dt);
    this.miningSystem.update(dt);
    this.gardenSystem.update(dt);
    this.alchemySystem.update(dt, realDt);
    this.spellSystem.update(dt, realDt);
    this.marketSystem.update(dt);

    // Passive aether income
    const aetherPerSec = this.gameState.getNetAetherPerSecond();
    if (aetherPerSec.gt(0)) {
      const deltaIncome = aetherPerSec.mul(dt);
      this.gameState.aether = this.gameState.aether.add(deltaIncome);
      this.gameState.totalAetherEarned = this.gameState.totalAetherEarned.add(deltaIncome);
    }

    this.gameState.stats.totalPlayTimeSeconds += dt;
    this.achievementSystem.checkAchievements();
  }

  // Fast animation render tick (60 fps)
  onRenderTick(dt) {
    this.updateHeaderStats();
    this.updateAnomalyUI();
    this.updateTabNotifications();
    this.updateTabBonusStrip(dt);
    this.updateQuickCastBar();
    this.leaderboard.tick(this.currentTab === 'leaderboard', VERSION);
    this.buffBar.update();

    // Fast, lightweight state updates without replacing DOM nodes
    if (this.currentTab === 'monolith') {
      this.renderMonolithOverview();
      this.updateBuildingsUI();
    } else if (this.currentTab === 'combat') {
      this.updateCombatUI();
    } else if (this.currentTab === 'mining') {
      this.updateMiningUI(false);
    } else if (this.currentTab === 'garden') {
      this.updateGardenUI();
    } else if (this.currentTab === 'alchemy') {
      this.updateAlchemyUI();
    } else if (this.currentTab === 'spells') {
      this.updateSpellsUI();
    } else if (this.currentTab === 'talents') {
      this.updateTalentsUI();
    } else if (this.currentTab === 'bounties') {
      if (this.tabNeedsFullRender['bounties']) {
        this.tabNeedsFullRender['bounties'] = false;
        this.buildBountiesStructure();
      } else {
        this.updateBountiesUI();
      }
    } else if (this.currentTab === 'market') {
      this.updateMarketUI();
    } else if (this.currentTab === 'prestige') {
      this.updatePrestigeUI();
    } else if (this.currentTab === 'codex') {
      this.codexRefreshTimer = (this.codexRefreshTimer || 0) + dt;
      if (this.tabNeedsFullRender['codex'] || this.codexRefreshTimer >= 1) {
        this.tabNeedsFullRender['codex'] = false;
        this.codexRefreshTimer = 0;
        this.updateCodexUI();
      }
    }
  }

  updateHeaderStats() {
    const aetherEl = document.getElementById('stat-aether');
    if (aetherEl) aetherEl.textContent = this.gameState.aether.format('standard', 2);

    const aetherRateEl = document.getElementById('stat-aether-rate');
    if (aetherRateEl) {
      const rate = this.gameState.getNetAetherPerSecond();
      aetherRateEl.textContent = `+${rate.format('standard', 2)} /s`;
      // Mastery tooltip: refreshed every 30 frames (~0.5 s), only written when it changes
      this.aetherTipTimer = (this.aetherTipTimer ?? 29) + 1;
      if (this.aetherTipTimer >= 30) {
        this.aetherTipTimer = 0;
        const tip = getAetherMasteryTooltip(this.gameState);
        if (aetherRateEl.title !== tip) aetherRateEl.title = tip;
      }
    }

    const goldEl = document.getElementById('stat-gold');
    if (goldEl) goldEl.textContent = this.gameState.gold.format('standard', 0);

    const manaEl = document.getElementById('stat-mana');
    const manaBar = document.getElementById('bar-mana-fill');
    if (manaEl) manaEl.textContent = `${Math.floor(this.gameState.mana)} / ${this.gameState.maxMana}`;
    if (manaBar) manaBar.style.width = `${(this.gameState.mana / this.gameState.maxMana) * 100}%`;

    const chronoEl = document.getElementById('stat-chrono');
    if (chronoEl) chronoEl.textContent = `${new BigNum(Math.floor(this.gameState.chronoSand)).format('standard', 2)}s`;

    const sealsEl = document.getElementById('stat-guild-seals');
    if (sealsEl) {
      const seals = String(this.gameState.guildSeals || 0);
      if (sealsEl.textContent !== seals) sealsEl.textContent = seals;
    }

    const dustEl = document.getElementById('stat-cosmic-dust');
    if (dustEl) dustEl.textContent = this.gameState.cosmicDust.format('standard', 0);
  }

  updateAnomalyUI() {
    const el = document.getElementById('golden-anomaly');
    if (!el) return;
    if (this.clickerSystem.anomalyActive) {
      el.style.display = 'flex';
      el.style.left = `${this.clickerSystem.anomalyX}%`;
      el.style.top = `${this.clickerSystem.anomalyY}%`;
    } else {
      el.style.display = 'none';
    }
  }

  renderMonolithOverview() {
    const clickPowerEl = document.getElementById('monolith-click-power');
    if (clickPowerEl) {
      const clickVal = this.gameState.getClickYield();
      clickPowerEl.textContent = `+${clickVal.format('standard', 1)} per Click`;
    }

    const comboBar = document.getElementById('combo-bar-fill');
    const comboText = document.getElementById('combo-text');
    if (comboBar && comboText) {
      const combo = this.gameState.comboCount;
      comboBar.style.width = `${Math.min(100, combo)}%`;
      comboText.textContent = combo > 0 ? `${combo}x Combo! (${(1 + Math.min(50, combo) * 0.08).toFixed(1)}x boost)` : 'Combo Ready';
    }

    const frenzyBadge = document.getElementById('frenzy-badge');
    if (frenzyBadge) {
      if (this.gameState.frenzyActive) {
        frenzyBadge.style.display = 'block';
        frenzyBadge.textContent = `🔥 FRENZY ACTIVE! (${this.gameState.frenzyTimer.toFixed(1)}s)`;
      } else {
        frenzyBadge.style.display = 'none';
      }
    }

    const buffsContainer = document.getElementById('active-buffs-list');
    if (buffsContainer) {
      buffsContainer.innerHTML = this.gameState.activeBuffs.map(b =>
        `<span class="buff-chip">${b.name} (${Math.ceil(b.duration)}s)</span>`
      ).join('');
    }
  }
}

// Instantiate on window load
window.addEventListener('DOMContentLoaded', () => {
  window.gameApp = new AetheriaApp();
  window.gameApp.init();
});
