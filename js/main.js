import { BigNum } from './engine/BigNum.js';
import { sound } from './engine/AudioEngine.js';
import { particles } from './engine/ParticleEngine.js';
import { SaveManager } from './engine/SaveManager.js';
import { renderOfflineModal } from './ui/offlineModal.js';
import { rewards } from './ui/rewards.js';
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
import { BountySystem, QUARTERMASTER_UPGRADES } from './systems/BountySystem.js';
import { MarketSystem, COMMODITIES, getStockCap } from './systems/MarketSystem.js';
import { PrestigeSystem, ASCENSION_PERKS } from './systems/PrestigeSystem.js';
import { TranscendPanel, fmtBigMult } from './ui/prestige.js';
import { AchievementSystem, ACHIEVEMENTS } from './systems/AchievementSystem.js';
import { FastForwardSystem, FF_WARP_SECONDS, FF_COST_GROWTH, FF_RESET_MINUTES } from './systems/FastForwardSystem.js';
import { VERSION, CHANGELOG } from './version.js';
import { getTabBonuses, SPELL_TABS, getMasteries, getAetherMasteryTooltip, fmtMult } from './tabBonuses.js';
import { BuffBar } from './buffBar.js';
import { Shell } from './ui/shell.js';
import { GardenBreedingUI } from './ui/garden.js';
import { WardensRelicsUI } from './ui/wardens-relics.js';
import { gearCard } from './ui/rarity.js';
import { Leaderboard } from './leaderboard.js';
import { MonsterPortrait, loadBossArtManifest } from './bossArt.js';

// Plain-number display in the player's notation (Settings tab); see BigNum.formatNumber
const fmtNum = (n, precision = 2) => BigNum.formatNumber(n, precision);

// Per-frame DOM writes: assigning an unchanged textContent/width still replaces the text node
// and invalidates layout, so the render tick only writes when the value differs.
const setText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };
const setWidth = (el, width) => { if (el && el.style.width !== width) el.style.width = width; };

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
    if (typeof sound !== 'undefined' && this.gameState.settings.rhythmScale) { sound.rhythmScale = this.gameState.settings.rhythmScale; }

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
    this.fastForwardSystem = new FastForwardSystem(this.gameState);

    // Separate 1x/10x/MAX settings: Buildings use buildingSystem.buyAmount, the Enchanter this
    this.enchanterBuyAmount = 1;

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
      (dt, realDt) => {
        this.onSimTick(dt, realDt);
        this.processFastForward(realDt);
      },
      (dt) => this.onRenderTick(dt),
      () => this.saveManager.save()
    );

    this.spellSystem = new SpellSystem(this.gameState, this.gameLoop);
    this.gameState.spellSystem = this.spellSystem;

    this.currentTab = 'monolith';
    this.tabNeedsFullRender = {};
    this.version = VERSION;
    this.leaderboard = new Leaderboard(this);
    this.elCache = new Map();
  }

  // Cached document.getElementById for nodes that are normally created once
  // (static markup and the build*Structure() lists). The render tick used to do hundreds
  // of lookups per frame. Lists that are rebuilt (bounties, mining tiles) keep their own refs.
  $(id) {
    let el = this.elCache.get(id);
    // Re-resolve if a structure was rebuilt after caching, so the UI never writes to a detached node.
    if (el === undefined || !el.isConnected) {
      el = document.getElementById(id);
      if (el) this.elCache.set(id, el);
    }
    return el;
  }

  init() {
    // Canvas particles setup
    const canvas = document.getElementById('particle-canvas');
    if (canvas) particles.init(canvas);
    rewards.init();

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
    if (this.bountyTabBtn === undefined) this.bountyTabBtn = document.querySelector('.nav-tab[data-tab="bounties"]');
    const bountyTab = this.bountyTabBtn;
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
      this.bonusStripTimer = Infinity; // refresh the Active Bonuses strip on the next frame
      this.saveManager.save();
    });
    const rhythmCont = document.getElementById('settings-rhythm');
    if (rhythmCont) {
      const rhythmOptions = [
        { id: 'pentatonic', label: 'Pentatonic (C Major)' },
        { id: 'hijaz', label: 'Hijaz (Desert)' },
        { id: 'mystic', label: 'Mystic (Byzantine)' },
        { id: 'lofi', label: 'Lofi (A Minor)' },
        { id: 'boss', label: 'Boss (Deep/Dark)' }
      ];
      if (!this.gameState.settings.rhythmScale) {
        this.gameState.settings.rhythmScale = 'hijaz';
      }
      rhythmCont.innerHTML = rhythmOptions.map(o => `
        <label class="settings-option">
          <input type="radio" name="rhythmScale" value="${o.id}" ${this.gameState.settings.rhythmScale === o.id ? 'checked' : ''}>
          <span>${o.label}</span>
        </label>
      `).join('');
      rhythmCont.addEventListener('change', (e) => {
        if (e.target.name !== 'rhythmScale') return;
        this.gameState.settings.rhythmScale = e.target.value;
        if (typeof sound !== 'undefined') { sound.rhythmScale = e.target.value; }
        this.saveManager.save();
      });
    }
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
    this.shell?.onTabChange(tabName);
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

    // Buy amount toggles (1, 10, 25, 100, max). Each group keeps its own setting:
    // Buildings -> buildingSystem.buyAmount, Bazaar Enchanter -> this.enchanterBuyAmount.
    const bindBuyAmountGroup = (groupId, apply) => {
      const group = document.getElementById(groupId);
      if (!group) return;
      group.addEventListener('click', (e) => {
        const btn = e.target.closest('.buy-amt-btn');
        if (!btn || !group.contains(btn)) return;
        group.querySelectorAll('.buy-amt-btn').forEach(b => b.classList.toggle('active', b === btn));
        const amt = btn.dataset.amount;
        apply(amt === 'max' ? 'max' : parseInt(amt, 10));
      });
    };
    bindBuyAmountGroup('building-buy-amount', (amt) => {
      this.buildingSystem.buyAmount = amt;
      this.updateBuildingsUI();
    });
    bindBuyAmountGroup('enchanter-buy-amount', (amt) => {
      this.enchanterBuyAmount = amt;
      this.updateMarketUI();
    });

    // Fast Forward: books a warp that the game loop pays out over a few frames
    const warpBtn = document.getElementById('btn-time-warp');
    if (warpBtn) {
      warpBtn.addEventListener('click', () => {
        if (!this.fastForwardSystem.use()) return;
        sound.playSpell();
        rewards.notify({ tier: 'small', kind: 'time-warp', icon: '⚡', title: `${FF_WARP_SECONDS}s Time Warp`, color: '#38bdf8', source: warpBtn });
        this.updateFastForwardButton();
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
        rewards.notify({ tier: 'small', kind: 'game-saved', icon: '💾', title: 'Game saved', color: '#4ade80' });
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
        if (this.marketSystem.buyEnchanter(this.enchanterBuyAmount || 1)) {
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
    renderOfflineModal(res);
  }

  // Build the initial DOM cards once (never destroyed every frame!)
  // One "Active Bonuses" strip per subgame tab, placed after its guide banner
  buildTabBonusStrips() {
    this.quickCastBtns = {};
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
        // Button refs for the per-frame update (no querySelectorAll per frame)
        this.quickCastBtns[tab] = Array.from(bar.querySelectorAll('.quick-cast-btn')).map(btn => ({
          btn, stateEl: btn.querySelector('.qc-state'), spell: SPELLS.find(sp => sp.id === btn.dataset.spell)
        }));
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
    const buttons = this.quickCastBtns?.[this.currentTab];
    if (!buttons) return;
    for (const { btn, stateEl, spell: s } of buttons) {
      const id = s.id;
      const cd = this.gameState.spells[id]?.cd || 0;
      const buff = this.gameState.activeBuffs.find(b => b.id === id);
      let state;
      if (buff) state = `active ${Math.ceil(buff.duration)}s`;
      else if (cd > 0) state = `${Math.ceil(cd)}s`;
      else state = `${s.manaCost} mana`;
      setText(stateEl, state);
      const castable = this.spellSystem.canCast(id);
      btn.classList.toggle('ready', castable);
      btn.classList.toggle('disabled', !castable);
      btn.classList.toggle('buff-active', !!buff);
    }
  }

  updateTabBonusStrip(dt) {
    // Refresh at most every 0.25 s, plus immediately after a tab switch. (This used to key on
    // tabNeedsFullRender, which only the bounties/codex renders ever clear, so after the first
    // tab switch the strip was being recomputed and its innerHTML re-serialized every frame.)
    this.bonusStripTimer = (this.bonusStripTimer || 0) + dt;
    if (this.bonusStripTimer < 0.25 && this.bonusStripTab === this.currentTab) return;
    this.bonusStripTimer = 0;
    this.bonusStripTab = this.currentTab;
    const strip = this.$(`tab-bonus-${this.currentTab}`);
    if (!strip) return;
    const items = getTabBonuses(this.gameState, this.currentTab, TALENT_DEFINITIONS, ASCENSION_PERKS);
    // One summary line that opens the chips on tap (R23; toggle in js/ui/shell.js)
    const html = items.length === 0 ? '' :
      `<button class="tab-bonus-summary" type="button" aria-expanded="${strip.classList.contains('is-open')}">` +
      `<span class="tab-bonus-title">✨ ${items.length} active bonus${items.length === 1 ? '' : 'es'}</span>` +
      `<span class="tab-bonus-names">${items.map(i => i.name).join(' · ')}</span></button>` +
      `<div class="tab-bonus-chips">` +
      items.map(i => `<span class="tab-bonus-chip ${i.kind}">${i.icon} <strong>${i.name}</strong> ${i.detail}</span>`).join('') + `</div>`;
    // Compare against what we last wrote rather than reading innerHTML back (a DOM serialization)
    if (!this.bonusStripHtml) this.bonusStripHtml = {};
    if (this.bonusStripHtml[this.currentTab] !== html) {
      this.bonusStripHtml[this.currentTab] = html;
      strip.innerHTML = html;
    }
    const display = items.length ? '' : 'none';
    if (strip.style.display !== display) strip.style.display = display;
  }

  buildStaticUI() {
    this.leaderboard.build();
    this.buildTabBonusStrips();
    this.buffBar = new BuffBar(this);
    this.buffBar.build();
    this.shell = new Shell(this);
    this.shell.build();
    this.buildBuildingsStructure();
    this.buildCombatStructure();
    this.buildMiningStructure();
    this.buildGardenStructure();
    this.buildAlchemyStructure();
    this.breedingUI = new GardenBreedingUI(this, fmtNum);
    this.breedingUI.build();
    this.wardensRelicsUI = new WardensRelicsUI(this, fmtNum);
    this.wardensRelicsUI.build();
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
      <div class="building-card card-row" id="b-card-${def.id}" data-id="${def.id}">
        <div class="b-icon icon-tile">${def.icon}</div>
        <div class="b-info">
          <div class="b-header">
            <span class="b-name">${def.name}</span>
            <span class="b-count num" id="b-count-${def.id}">0</span>
          </div>
          <div class="b-desc">${def.desc}</div>
          <div class="b-stats num" id="b-stats-${def.id}">Yield: +0/s</div>
        </div>
        <button class="btn-buy-building btn btn-buy" id="btn-buy-${def.id}" data-id="${def.id}">
          <span class="lbl" id="buy-lbl-${def.id}">Buy +1</span>
          <span class="cost num" id="cost-lbl-${def.id}">💎 0</span>
        </button>
      </div>
    `).join('');

    this.updateBuildingsUI();
  }

  updateBuildingsUI() {
    const buyAmt = this.buildingSystem.buyAmount;

    for (const def of BUILDING_DEFINITIONS) {
      // Tiers 15-30 open one per Transcend (R4); locked ones stay hidden
      const unlocked = this.buildingSystem.isTierUnlocked(def.id);
      const cardEl = this.$(`b-card-${def.id}`);
      const display = unlocked ? '' : 'none'; // .building-card sets display, so [hidden] would not hide it
      if (cardEl && cardEl.style.display !== display) cardEl.style.display = display;
      if (!unlocked) continue;
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

      setText(this.$(`b-count-${def.id}`), fmtNum(state.count));
      setText(this.$(`b-stats-${def.id}`), `Yield: +${currentCps.format('standard', 1)}/s`);
      setText(this.$(`buy-lbl-${def.id}`), `Buy +${fmtNum(buyCount)}`);
      // Affordable shows the price on a gold button; otherwise say how much Aether is missing
      setText(this.$(`cost-lbl-${def.id}`), canAfford
        ? `💎 ${cost.format('standard', 1)}`
        : `need 💎 ${cost.sub(this.gameState.aether).format('standard', 1)}`);

      const card = this.$(`b-card-${def.id}`);
      if (card) card.classList.toggle('is-affordable', canAfford);

      const btn = this.$(`btn-buy-${def.id}`);
      if (btn) {
        btn.classList.toggle('btn-primary', canAfford);
        btn.classList.toggle('is-locked', !canAfford);
        btn.setAttribute('aria-disabled', String(!canAfford));
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

    const floorEl = this.$('combat-floor-title');
    if (floorEl) {
      const zone = this.combatSystem.getZone(h.floor);
      const title = `<span style="color: ${zone.color}">${zone.icon} Floor ${h.floor}: ${zone.name}</span>`;
      if (this.lastCombatTitle !== title) {
        this.lastCombatTitle = title;
        floorEl.innerHTML = title;
      }
    }

    const maxHp = this.combatSystem.getTotalMaxHp();
    setText(this.$('hero-hp-text'), `${this.combatSystem.fmt(Math.floor(h.hp))} / ${this.combatSystem.fmt(maxHp)} HP ${h.shield > 0 ? `(+${this.combatSystem.fmt(h.shield)} Shield)` : ''}`);
    setWidth(this.$('hero-hp-fill'), `${Math.min(100, (h.hp / maxHp) * 100)}%`);
    setText(this.$('hero-atk-text'), `Attack: ${this.combatSystem.fmt(this.combatSystem.getTotalAttack())} (Spd: ${h.attackSpeed}s)`);
    setText(this.$('hero-lvl-text'), `Level ${h.level} (${this.combatSystem.fmt(h.xp)} / ${this.combatSystem.fmt(h.xpNeeded)} XP)`);

    const bossTimerEl = this.$('boss-timer');

    setText(this.$('monster-name'), m.name);

    // Portrait frame is static markup; MonsterPortrait only swaps its <img> src / fallback
    // icon when the monster changes (art lookup + naming contract: js/bossArt.js)
    if (!this.monsterPortrait) {
      const frame = document.querySelector('.monster-avatar');
      if (frame) {
        this.monsterPortrait = new MonsterPortrait(frame);
        loadBossArtManifest().then(n => { if (n) this.monsterPortrait.invalidate(); });
      }
    }
    if (this.monsterPortrait) this.monsterPortrait.update(h.floor, m);

    setText(this.$('monster-hp-text'), `${this.combatSystem.fmt(Math.max(0, m.hp))} / ${this.combatSystem.fmt(m.maxHp)} HP`);
    setWidth(this.$('monster-hp-fill'), `${Math.max(0, (m.hp / m.maxHp) * 100)}%`);

    if (bossTimerEl) {
      // visibility (not display) so the portrait doesn't jump when a boss arrives
      const vis = m.isBoss ? 'visible' : 'hidden';
      if (bossTimerEl.style.visibility !== vis) bossTimerEl.style.visibility = vis;
      if (m.isBoss) setText(bossTimerEl, `⏱️ Enrage: ${m.timer.toFixed(1)}s`);
    }

    // Update skill cooldowns
    for (const key in h.skills) {
      const s = h.skills[key];
      const btn = this.$(`btn-cskill-${key}`);
      const onCd = s.cd > 0;
      if (btn) {
        btn.classList.toggle('cooldown', onCd);
        btn.classList.toggle('ready', !onCd);
      }
      setText(this.$(`sk-cd-${key}`), onCd ? `${s.cd.toFixed(1)}s` : 'READY');
    }

    // Gear
    const gearCont = this.$('hero-gear-container');
    // Notation is part of the key so a Settings change re-renders the formatted stats
    const gearSig = BigNum.notation + JSON.stringify(h.gear);
    if (gearCont && this.lastGearSig !== gearSig) {
      this.lastGearSig = gearSig;
      const g = h.gear;
      const fmt = (v) => this.combatSystem.fmt(v);
      gearCont.innerHTML =
        gearCard('Weapon', g.weapon, `+${fmt(g.weapon?.attack || 0)} Atk`) +
        gearCard('Armor', g.armor, `+${fmt(g.armor?.hp || 0)} HP`) +
        gearCard('Amulet', g.amulet, `+${((g.amulet?.crit || 0) * 100).toFixed(0)}% Crit`) +
        gearCard('Relic', g.relic, `+${((g.relic?.lifesteal || 0) * 100).toFixed(0)}% Drain`);
    }

    // Aether Forge
    const forgeLevelEl = this.$('forge-level');
    const forgeCostEl = this.$('forge-cost');
    const btnForge = this.$('btn-forge-awaken');
    if (forgeLevelEl) {
      const fLevel = h.aetherForgeLevel || 0;
      const fCost = this.combatSystem.getAetherForgeCost();
      setText(forgeLevelEl, String(fLevel));
      setText(forgeCostEl, fCost.format('standard', 1));
      const affordable = this.gameState.aether.gte(fCost);
      if (this.forgeAffordable !== affordable) {
        this.forgeAffordable = affordable;
        btnForge.disabled = !affordable;
        btnForge.style.opacity = affordable ? 1.0 : 0.5;
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

    const fmt = (n, precision = 0) => fmtNum(n, precision);
    const setTextById = (id, text) => setText(this.$(id), text);

    const depthEl = this.$('mining-depth-title');
    const strata = this.miningSystem.getCurrentStrata();
    if (depthEl) {
      const record = grid.maxDepth > grid.depth ? ` · Record ${grid.maxDepth}` : '';
      const title = `<span style="color: ${strata.color}">${strata.icon} Depth ${grid.depth} - ${strata.name} Strata${record}</span>`;
      if (this.lastMiningTitle !== title) {
        this.lastMiningTitle = title;
        depthEl.innerHTML = title;
      }
    }

    const pickaxeEl = this.$('mining-pickaxe-info');
    if (pickaxeEl) {
      // Build the shop once and update it in place: this runs every render frame, and
      // replacing the buttons' DOM between mousedown and mouseup swallows clicks.
      // Clicks are handled by delegation in setupEventListeners.
      if (!this.$('btn-buy-drill')) {
        pickaxeEl.innerHTML = `
          <div style="display:flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
            <img loading="lazy" decoding="async" src="cosmic_shovel.webp" alt="Mining Tool" style="width: 64px; height: 64px; border-radius: 8px; border: 2px solid var(--accent-purple); box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);">
            <div>
              <div>Pickaxe: <strong id="mining-pick-name"></strong> (Lv <span id="mining-pick-level"></span>, Power: <span id="mining-pick-power"></span>)</div>
              <div>Auto-Drills: <strong id="mining-drill-count"></strong> (<span id="mining-drill-rate"></span> hits/sec)</div>
              <div class="mining-stats-line">Tile HP: <span id="mining-tile-hp"></span> · Stone per tile: <span id="mining-stone-yield"></span></div>
            </div>
          </div>
          <div class="mining-btn-group">
            <button id="btn-upgrade-pick" class="btn-action"></button>
            <button id="btn-buy-drill" class="btn-action"></button>
            <button id="btn-mining-dynamite" class="btn-action"></button>
          </div>
        `;
      }

      const stone = this.gameState.inventory.stone || 0;
      const level = grid.pickaxeTier || 0;

      setTextById('mining-pick-name', getPickaxeName(level));
      setTextById('mining-pick-level', String(level));
      setTextById('mining-pick-power', fmt(this.miningSystem.getPickaxePower(), 1));
      setTextById('mining-drill-count', fmtNum(grid.autoDrills));
      setTextById('mining-drill-rate', this.miningSystem.getAutoDrillRate().toFixed(1));
      setTextById('mining-tile-hp', fmt(strata.maxHp, 1));
      setTextById('mining-stone-yield', fmt(this.miningSystem.getStoneYield(), 1));

      const pickCost = this.miningSystem.getPickaxeCost();
      setTextById('btn-upgrade-pick', `Upgrade to ${getPickaxeName(level + 1)} (${fmt(pickCost, 2)} Stone)`);
      this.$('btn-upgrade-pick').classList.toggle('disabled', stone < pickCost);

      const drillCost = this.miningSystem.getAutoDrillCost();
      setTextById('btn-buy-drill', `Buy Auto-Drill (${fmt(drillCost, 2)} Stone)`);
      this.$('btn-buy-drill').classList.toggle('disabled', stone < drillCost);

      const cd = this.miningSystem.dynamiteCooldown;
      setTextById('btn-mining-dynamite', `🧨 Blast 3x3 (${cd > 0 ? `${Math.ceil(cd)}s` : 'Ready'})`);
      this.$('btn-mining-dynamite').classList.toggle('disabled', cd > 0);
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

    const container = this.$('mining-grid-board');
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
            <span class="tile-hp-text" id="tile-text-${b.id}">${fmt(b.hp, 1)}</span>
          </div>
        `).join('');
        // Tile refs for the per-frame update; rebuilt with the grid (these ids are not stable)
        this.miningTileEls = new Map(grid.blocks.map(b => [b.id, {
          tile: document.getElementById(`mine-tile-${b.id}`),
          bar: document.getElementById(`tile-bar-${b.id}`),
          txt: document.getElementById(`tile-text-${b.id}`)
        }]));
      } else {
        // Fast update without wiping DOM
        for (const b of grid.blocks) {
          const refs = this.miningTileEls.get(b.id);
          const tile = refs?.tile;
          if (!tile) continue;
          if (b.revealed && !tile.classList.contains('revealed')) {
            tile.classList.remove('unrevealed');
            tile.classList.add('revealed');
            tile.innerHTML = tileContent(b);
          } else if (!b.revealed) {
            setWidth(refs.bar, `${(b.hp / b.maxHp) * 100}%`);
            setText(refs.txt, fmt(b.hp, 1)); // max HP is in the stats line; "a/b" overflowed small tiles
          }
        }
      }
    }

    const invEl = this.$('minerals-inventory');
    if (invEl) {
      // Badges are built once; only the counts are written (and only when they change)
      if (!invEl.dataset.built) {
        invEl.dataset.built = '1';
        invEl.innerHTML = `
          <span class="res-badge">Stone: <span id="min-inv-stone"></span></span>
          <span class="res-badge" style="color:#ef4444">Fawanees: <span id="min-inv-rubies"></span></span>
          <span class="res-badge" style="color:#3b82f6">Dallahs: <span id="min-inv-sapphires"></span></span>
          <span class="res-badge" style="color:#10b981">Oud Wood: <span id="min-inv-emeralds"></span></span>
          <span class="res-badge" style="color:#38bdf8">Misbaha: <span id="min-inv-diamonds"></span></span>
          <span class="res-badge" style="color:#a855f7">Mabkhara: <span id="min-inv-voidAmethyst"></span></span>
        `;
      }
      const inv = this.gameState.inventory;
      setTextById('min-inv-stone', fmt(inv.stone || 0, 2));
      setTextById('min-inv-rubies', fmtNum(inv.rubies || 0));
      setTextById('min-inv-sapphires', fmtNum(inv.sapphires || 0));
      setTextById('min-inv-emeralds', fmtNum(inv.emeralds || 0));
      setTextById('min-inv-diamonds', fmtNum(inv.diamonds || 0));
      setTextById('min-inv-voidAmethyst', fmtNum(inv.voidAmethyst || 0));
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
    this.breedingUI?.updateGardenPanel();
    const waterBtn = this.$('btn-water-garden');
    if (waterBtn) {
      const cd = this.gardenSystem.waterCooldown;
      const label = cd > 0 ? `💧 Water All (${Math.ceil(cd)}s)` : `💧 Water All (+${WATER_BOOST}s)`;
      setText(waterBtn, label);
      waterBtn.classList.toggle('disabled', cd > 0);
    }

    const garden = this.gameState.garden;
    if (!garden) return;

    const fertBtn = this.$('btn-fertilize-garden');
    if (fertBtn) {
      const canFert = (garden.essences.sporePowder || 0) >= 1 &&
        garden.plots.some(p => p.seed && !p.fertilized && p.progress < p.maxTime);
      fertBtn.classList.toggle('disabled', !canFert);
    }

    // Golem panel
    const golems = garden.golems || 0;
    setText(this.$('golem-count'), `${golems} / ${MAX_GOLEMS}`);
    const buyGolemBtn = this.$('btn-buy-golem');
    if (buyGolemBtn) {
      const cost = this.gardenSystem.getNextGolemCost();
      const t = cost
        ? `🗿 Buy Golem (Row ${golems + 1}): ${new BigNum(cost.stone).format('standard', 0)} Stone + ${new BigNum(cost.manaSap).format('standard', 0)} Mana Sap`
        : '🗿 All rows automated';
      setText(buyGolemBtn, t);
      buyGolemBtn.classList.toggle('disabled', !this.gardenSystem.canBuyGolem());
    }
    for (let r = 0; r < MAX_GOLEMS; r++) {
      const rowEl = this.$(`golem-row-${r}`);
      if (!rowEl) continue;
      const status = this.gardenSystem.getRowStatus(r);
      const cls = `golem-row ${status}`;
      if (rowEl.className !== cls) rowEl.className = cls;
      const st = status === 'locked' ? '🔒 Manual' : status === 'noseeds' ? '⚠️ No seeds' : '🗿 Automated';
      setText(this.$(`golem-row-status-${r}`), st);
      const sel = this.$(`golem-row-seed-${r}`);
      if (sel && document.activeElement !== sel) {
        const v = garden.rowSeed[r] || '';
        if (sel.value !== v) sel.value = v;
      }
    }

    for (const id in SEED_TYPES) {
      setText(this.$(`seed-nm-${id}`), `${SEED_TYPES[id].name} (${fmtNum(garden.inventory[id] || 0)})`);
    }

    for (const p of garden.plots) {
      const plotEl = this.$(`garden-plot-${p.id}`);
      if (!plotEl) continue;
      const icoEl = this.$(`plot-ico-${p.id}`);
      const statEl = this.$(`plot-stat-${p.id}`);
      const fillEl = this.$(`plot-fill-${p.id}`);
      const golemCls = this.gardenSystem.isRowAutomated(this.gardenSystem.getRowOfPlot(p.id)) ? ' golem-tended' : '';

      if (!p.seed) {
        const cls = `garden-plot empty${golemCls}`;
        if (plotEl.className !== cls) plotEl.className = cls;
        setText(icoEl, '');
        setText(statEl, 'Empty');
        setWidth(fillEl, '0%');
      } else {
        const def = SEED_TYPES[p.seed];
        const isMature = p.stage === 'mature' || p.progress >= p.maxTime;
        const progressPct = Math.min(100, (p.progress / p.maxTime) * 100);

        const cls = `garden-plot planted${isMature ? ' mature' : ''}${p.fertilized ? ' fertilized' : ''}${golemCls}`;
        if (plotEl.className !== cls) plotEl.className = cls;
        setText(icoEl, def.icon);
        const st = isMature ? '✨ READY TO HARVEST!' : `${def.name} (${this.formatGrowTime(p.maxTime - p.progress)})${p.fertilized ? ' 🧪' : ''}`;
        setText(statEl, st);
        setWidth(fillEl, `${progressPct}%`);
      }
    }

    const essEl = this.$('garden-essences-list');
    if (essEl) {
      const ess = garden.essences;
      if (!essEl.dataset.built) {
        essEl.dataset.built = '1';
        essEl.innerHTML = Object.entries(ESSENCE_NAMES).map(([k, name]) =>
          `<span class="res-badge">${name}: <span id="ess-count-${k}">0</span></span>`).join(' ');
      }
      for (const k in ESSENCE_NAMES) {
        setText(this.$(`ess-count-${k}`), fmtNum(ess[k] || 0));
      }
    }
  }

  // --- Alchemy Structure ---
  buildAlchemyStructure() {
    const listCont = document.getElementById('alchemy-recipes-list');
    if (listCont) {
      listCont.innerHTML = RECIPES.map(r => {
        const costStr = Object.entries(this.alchemySystem.getRecipeCost(r)).map(([k, v]) =>
          `<span id="alc-cost-${r.id}-${k}">${fmtNum(v)}</span>x ${INGREDIENT_NAMES[k] || k} (<span id="alc-own-${r.id}-${k}">0</span>)`).join(', ');
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
    this.breedingUI?.updateAlchemySection();
    const inv = this.gameState.inventory;
    const ess = this.gameState.garden?.essences || {};
    for (const r of RECIPES) {
      const cost = this.alchemySystem.getRecipeCost(r);
      for (const k in cost) {
        setText(this.$(`alc-own-${r.id}-${k}`), `have ${fmtNum(inv[k] ?? ess[k] ?? 0)}`);
        setText(this.$(`alc-cost-${r.id}-${k}`), fmtNum(cost[k]));
      }
    }
    const catEl = this.$('alc-catalyst-status');
    if (catEl) {
      const n = this.alchemySystem.getCatalystCount();
      setText(catEl, `Brewed: ${fmtNum(n)} (Aether x${this.gameState.getCatalystMult().toFixed(2)})`);
    }
    const chronoLbl = this.$('chrono-transmute-lbl');
    if (chronoLbl) {
      const cap = this.gameState.getChronoSandCap();
      setText(chronoLbl, `⏳ Gold ➔ Chrono Sand (${this.alchemySystem.getChronoBatchCost().format('standard', 2)} Gold = 30s, bank ${fmtNum(Math.floor(this.gameState.chronoSand || 0))}/${fmtNum(cap)}s):`);
    }
    const tStone = this.$('btn-transmute-stone');
    if (tStone) tStone.classList.toggle('disabled', (inv.stone || 0) < 50);
    const maxBatches = this.alchemySystem.getMaxChronoBatches();
    if (!this.chronoBatchBtns) this.chronoBatchBtns = Array.from(document.querySelectorAll('#chrono-transmute-group button[data-batches]'));
    for (const btn of this.chronoBatchBtns) {
      const b = btn.dataset.batches;
      btn.classList.toggle('disabled', b === 'max' ? maxBatches < 1 : maxBatches < parseInt(b, 10));
    }
    const maxBtn = this.$('btn-transmute-chrono-max');
    if (maxBtn) {
      const room = Math.max(0, this.gameState.getChronoSandCap() - (this.gameState.chronoSand || 0));
      const fill = Math.min(room, Math.floor(maxBatches * 30 * this.gameState.getChronoSandGainMult()));
      const label = maxBatches >= 1 ? `Max (+${new BigNum(fill).format('standard', 2)}s)` : (room <= 0 ? 'Max (bank full)' : 'Max');
      setText(maxBtn, label);
    }
    for (const r of RECIPES) {
      const can = this.alchemySystem.canBrew(r.id);
      const card = this.$(`alc-card-${r.id}`);
      const btn = this.$(`btn-brew-${r.id}`);
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

      const card = this.$(`spell-card-${s.id}`);
      const btn = this.$(`btn-spell-${s.id}`);

      if (card) card.classList.toggle('ready', can);
      if (btn) {
        btn.classList.toggle('active', can);
        btn.classList.toggle('disabled', !can);
      }
      setText(this.$(`spell-text-${s.id}`), onCd ? `${state.cd.toFixed(1)}s` : '✨ Cast');
    }
  }

  // --- Talents Structure ---
  buildTalentsStructure() {
    const ptsEl = document.getElementById('talent-points-header');
    if (ptsEl) {
      ptsEl.innerHTML = `
        <span>Talent Points Available: <strong id="tp-avail-count" class="num">0</strong></span>
        <button id="btn-respec-talents" class="btn btn-sm btn-ghost" style="margin-left: 1rem">🔄 Respec All</button>
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
        <div class="talent-card card branch-${t.branch}">
          <div class="t-name">${t.name}</div>
          <div class="bar-row t-rank">
            <div class="segs dust" id="t-segs-${t.id}">${'<i></i>'.repeat(t.maxRank)}</div>
            <span class="val num" id="t-rank-${t.id}">0 / ${t.maxRank}</span>
          </div>
          <div class="t-desc">${t.desc}</div>
          <button class="btn-rank-talent btn btn-sm btn-dust" id="btn-talent-${t.id}" data-id="${t.id}">
            + Upgrade
          </button>
        </div>
      `).join('');
    }
    this.updateTalentsUI();
  }

  updateTalentsUI() {
    setText(this.$('tp-avail-count'), String(this.gameState.talentPoints));
    const respecBtn = this.$('btn-respec-talents');
    if (respecBtn) {
      const noneSpent = this.gameState.spentTalentPoints <= 0;
      respecBtn.classList.toggle('is-locked', noneSpent);
      respecBtn.setAttribute('aria-disabled', String(noneSpent));
    }

    for (const t of TALENT_DEFINITIONS) {
      const state = this.gameState.talents[t.id] || { rank: 0 };
      const isMax = state.rank >= t.maxRank;
      const canRank = !isMax && this.gameState.talentPoints > 0;

      setText(this.$(`t-rank-${t.id}`), `${state.rank} / ${t.maxRank}`);
      const segs = this.$(`t-segs-${t.id}`);
      if (segs) {
        for (let i = 0; i < segs.children.length; i++) segs.children[i].classList.toggle('on', i < state.rank);
      }
      const btn = this.$(`btn-talent-${t.id}`);
      if (btn) {
        // Locked buttons say what's missing rather than just greying out
        setText(btn, isMax ? 'Maxed' : canRank ? '+ Upgrade' : 'Need 1 point');
        btn.classList.toggle('btn-dust', canRank);
        btn.classList.toggle('active', canRank); // the click handler requires it
        btn.classList.toggle('is-locked', !canRank);
        btn.setAttribute('aria-disabled', String(!canRank));
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
              <div class="b-count" id="bounty-count-${b.id}">${fmtNum(b.current)} / ${fmtNum(b.required)}</div>
            </div>
            <div class="b-reward-box">
              <div>+${b.rewards.gold.format('standard', 0)} Gold</div>
              <div>+${fmtNum(b.rewards.chrono)} Chrono Sand</div>
              <div>+${fmtNum(b.rewards.seals)} Guild Seals</div>
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
      setWidth(fill, `${Math.min(100, (b.current / b.required) * 100)}%`);
      const count = document.getElementById(`bounty-count-${b.id}`);
      const countText = `${fmtNum(b.current)} / ${fmtNum(b.required)}`;
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
    setText(this.$('qm-seals-count'), fmtNum(this.gameState.guildSeals || 0));

    const qmGrid = this.$('quartermaster-upgrades-grid');
    if (!qmGrid) return;

    // Built once; QUARTERMASTER_UPGRADES is imported statically (this used to issue a
    // dynamic import() per frame and apply the values a microtask later)
    if (qmGrid.children.length === 0) {
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
    }

    for (const u of QUARTERMASTER_UPGRADES) {
      const rank = this.gameState.quartermaster[u.id]?.rank || 0;
      const cost = u.baseCost + (rank * u.costInc);
      const canBuy = (this.gameState.guildSeals || 0) >= cost && rank < u.maxRank;

      setText(this.$(`qm-rank-${u.id}`), `Rank: ${rank} / ${u.maxRank}`);
      const btn = this.$(`btn-qm-${u.id}`);
      if (btn) {
        setText(btn, rank >= u.maxRank ? 'MAXED' : `Buy (${fmtNum(cost)} Seals)`);
        btn.classList.toggle('active', canBuy);
        btn.classList.toggle('disabled', !canBuy);
      }
    }
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

    // Row element refs (built once in buildMarketStructure): no closest/querySelector per frame
    if (!this.marketRowEls) {
      this.marketRowEls = {};
      for (const c of COMMODITIES) {
        const pEl = document.getElementById(`price-${c.id}`);
        const row = pEl?.closest('.commodity-row');
        this.marketRowEls[c.id] = {
          tEl: document.getElementById(`trend-${c.id}`), pEl, oEl: document.getElementById(`owned-${c.id}`),
          buyBtn: row?.querySelector('.btn-market-buy'), buy10Btn: row?.querySelector('.btn-market-buy10')
        };
      }
    }

    for (const c of COMMODITIES) {
      const item = this.gameState.market?.items[c.id];
      if (!item) continue;

      const { tEl, pEl, oEl, buyBtn, buy10Btn } = this.marketRowEls[c.id];

      if (tEl) {
        setText(tEl, trendIcons[item.trend] || '⚖️ STABLE');
        const color = trendColors[item.trend] || '#94a3b8';
        if (tEl.dataset.trend !== item.trend) {
          tEl.dataset.trend = item.trend;
          tEl.style.color = color;
        }
      }
      if (pEl) {
        setText(pEl, this.marketSystem.getCommodityPrice(c.id).format('standard', 2));
        // Buys pay the 5% markup and stop at the stock cap (Amber and Crystal: Garden-only)
        const buyPrice = this.marketSystem.getBuyPrice(c.id);
        const cap = getStockCap(c.id);
        const room = Math.max(0, cap - item.owned);
        buyBtn?.classList.toggle('disabled', room < 1 || !this.gameState.gold.gte(buyPrice));
        buy10Btn?.classList.toggle('disabled', room < 1 || !this.gameState.gold.gte(buyPrice.mul(Math.min(10, room))));
        const tip = cap === 0 ? 'Garden-only: cannot be bought here' : `Buy at +5% (holding limit ${cap} bought units)`;
        if (buyBtn && buyBtn.title !== tip) { buyBtn.title = tip; if (buy10Btn) buy10Btn.title = tip; }
      }
      setText(oEl, fmtNum(item.owned));
    }
    setText(this.$('market-index-display'), `x${this.marketSystem.getMarketIndex().format('standard', 2)}`);

    const carCont = this.$('market-caravan-panel');
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
            <label class="caravan-cargo-opt"><input type="checkbox" id="caravan-load-cargo"> Load cargo: <span id="caravan-cargo-preview"></span></label>
            <button id="btn-send-caravan-1" class="btn-action"></button>
            <button id="btn-send-caravan-2" class="btn-action"></button>
          </div>
        `;
        carCont.addEventListener('click', (e) => {
          const btn = e.target.closest('button');
          if (!btn) return;
          // Cargo is opt-in: held goods only ride along when the box is ticked
          const cargo = this.$('caravan-load-cargo')?.checked ? undefined : 'none';
          if (btn.id === 'btn-send-caravan-1') this.marketSystem.dispatchCaravan('small', cargo);
          else if (btn.id === 'btn-send-caravan-2') this.marketSystem.dispatchCaravan('large', cargo);
          else return;
          this.updateMarketUI();
        });
      }
      const car = this.gameState.market?.caravan;
      const active = !!car?.active;
      if (this.caravanActiveShown !== active) {
        this.caravanActiveShown = active;
        this.$('caravan-active').style.display = active ? '' : 'none';
        this.$('caravan-dispatch').style.display = active ? 'none' : '';
      }
      if (active) {
        setText(this.$('caravan-time'), String(Math.ceil(car.duration)));
        setText(this.$('caravan-invest'), car.investment.format('standard', 0));
        setText(this.$('caravan-return'), (car.payout ? new BigNum(car.payout) : car.investment.mul(car.expectedProfit)).format('standard', 2));
      } else {
        for (const [btnId, tier] of [['btn-send-caravan-1', 'small'], ['btn-send-caravan-2', 'large']]) {
          const t = this.marketSystem.getCaravanTier(tier);
          const btn = this.$(btnId);
          setText(btn, `Send ${t.invest.format('standard', 2)} Gold (${t.minutes} Min - ${t.profit}x Return)`);
          btn.classList.toggle('disabled', !this.gameState.gold.gte(t.invest));
        }
        // What ticking "Load cargo" would ship (small / large caravan), at mean price x premium
        const preview = ['small', 'large'].map(tier => {
          const pick = this.marketSystem.pickCargo(tier);
          if (!pick) return null;
          const name = COMMODITIES.find(x => x.id === pick.id)?.name || pick.id;
          return `${tier} ${pick.units} ${name} (+${this.marketSystem.getCargoPayout(pick.id, pick.units, tier).format('standard', 2)})`;
        }).filter(Boolean);
        setText(this.$('caravan-cargo-preview'), preview.length ? preview.join(' · ') : 'no commodities held');
      }
    }

    const enchanterLevel = this.$('enchanter-level');
    const enchanterBonus = this.$('enchanter-bonus');
    const enchanterCost = this.$('enchanter-cost');
    const enchanterLabel = this.$('enchanter-label');
    const btnEnchanter = this.$('btn-buy-enchanter');
    if (enchanterLevel && enchanterCost && enchanterLabel && btnEnchanter && this.gameState.market) {
      const level = this.gameState.market.goldenSynergy || 0;
      const amt = this.enchanterBuyAmount || 1;
      const cost = this.marketSystem.getEnchanterTotalCost(amt);

      // The button's spans are static markup; only their text changes (no per-frame innerHTML)
      const levelText = String(level);
      if (enchanterLevel.textContent !== levelText) enchanterLevel.textContent = levelText;
      const bonusText = `+${level * 5}% Global Aether`;
      if (enchanterBonus.textContent !== bonusText) enchanterBonus.textContent = bonusText;
      const btnText = amt === 'max' ? 'Weave Max' : `Weave Spell x${amt}`;
      if (enchanterLabel.textContent !== btnText) enchanterLabel.textContent = btnText;
      const costText = cost.format('standard', 1);
      if (enchanterCost.textContent !== costText) enchanterCost.textContent = costText;

      const affordable = this.gameState.gold.gte(cost);
      if (btnEnchanter.disabled === affordable) {
        btnEnchanter.disabled = !affordable;
        btnEnchanter.style.opacity = affordable ? 1.0 : 0.5;
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
        const nectarNote = `\n\nNectar Offering: all ${fmtNum(dm.nectar)} Celestial Nectar will be consumed (${fmtMult(dm.nectarMult)} dust).`;
        if (confirm(`Ascend now? This resets Aether and Buildings to grant permanent Cosmic Dust and God Perks!${nectarNote}`)) {
          this.prestigeSystem.ascend();
          this.updateBuildingsUI();
          this.updatePrestigeUI();
        }
      };
    }

    this.transcendUI = new TranscendPanel(this);
    this.transcendUI.build();
    this.updatePrestigeUI();
  }

  // Masteries panel: rows built once, values updated in place (no buttons inside)
  updateMasteriesPanel() {
    const panel = this.$('masteries-panel');
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
      this.masteryRowEls = {};
      for (const row of panel.querySelectorAll('.mastery-row')) {
        this.masteryRowEls[row.dataset.mastery] = { row, valEl: row.querySelector('.m-value'), srcEl: row.querySelector('.m-source') };
      }
    }
    for (const m of list) {
      const refs = this.masteryRowEls[m.id];
      if (!refs) continue;
      setText(refs.valEl, fmtMult(m.value));
      setText(refs.srcEl, m.source);
      refs.row.classList.toggle('active', m.value > 1);
    }
  }

  updatePrestigeUI() {
    const pending = this.prestigeSystem.getPendingCosmicDust();
    const pendEl = this.$('pending-dust-display');
    const ascBtn = this.$('btn-do-ascend');

    setText(pendEl, `Pending Cosmic Dust: +${pending.format('standard', 0)}`);
    if (ascBtn) {
      const wait = this.prestigeSystem.getMinRunRemaining();
      const disabled = pending.lte(0) || wait > 0;
      if (ascBtn.disabled !== disabled) ascBtn.disabled = disabled;
      const m = Math.ceil(wait);
      setText(ascBtn, wait > 0 ? `✨ Ascend in ${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')} (min. run)` : '✨ Ascend to the Stars');
    }

    // Dust-gain links (Geode Attunement, Nectar Offering): text only, the button is never rebuilt
    const dm = this.prestigeSystem.getDustMultipliers();
    const breakdown = `${fmtMult(dm.geode)} from Depth ${dm.depth} · ${fmtMult(dm.nectarMult)} from ${fmtNum(dm.nectar)} Nectar (consumed)` +
      (dm.shards > 0 ? ` · ${fmtBigMult(dm.shardMult)} from ${dm.shards} Fracture Shards` : '');
    setText(this.$('pending-dust-breakdown'), breakdown);
    if (ascBtn) {
      const tip = `Base ${this.prestigeSystem.getBaseCosmicDust().format('standard', 0)} Dust · ${breakdown}`;
      if (ascBtn.title !== tip) ascBtn.title = tip;
    }

    this.updateMasteriesPanel();

    for (const p of ASCENSION_PERKS) {
      const state = this.gameState.ascensionPerks[p.id] || { rank: 0 };
      const cost = new BigNum(p.cost * Math.pow(1.5, state.rank));
      const canBuy = this.gameState.cosmicDust.gte(cost) && state.rank < p.maxRank;

      setText(this.$(`perk-rank-${p.id}`), `Rank: ${state.rank} / ${p.maxRank}`);
      const btn = this.$(`btn-perk-${p.id}`);
      if (btn) {
        setText(btn, state.rank >= p.maxRank ? 'MAXED' : `Unlock (${cost.format('standard', 0)} Dust)`);
        btn.classList.toggle('active', canBuy);
        btn.classList.toggle('disabled', !canBuy);
      }
    }

    this.transcendUI?.update();
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
        <div class="stat-line"><span>Total Clicks:</span><strong>${fmtNum(this.gameState.totalClicks)}</strong></div>
        <div class="stat-line"><span>Total Aether Gathered:</span><strong>${this.gameState.totalAetherEarned.format('standard', 2)}</strong></div>
        <div class="stat-line"><span>Monsters Vanquished:</span><strong>${fmtNum(s.totalMonstersSlain)}</strong></div>
        <div class="stat-line"><span>Bosses Vanquished:</span><strong>${fmtNum(s.totalBossesSlain)}</strong></div>
        <div class="stat-line"><span>Blocks Excavated:</span><strong>${fmtNum(s.totalBlocksMined)}</strong></div>
        <div class="stat-line"><span>Plants Harvested:</span><strong>${fmtNum(s.totalPlantsHarvested)}</strong></div>
        <div class="stat-line"><span>Potions Brewed:</span><strong>${fmtNum(s.totalPotionsBrewed)}</strong></div>
        <div class="stat-line"><span>Spells Cast:</span><strong>${fmtNum(s.totalSpellsCast)}</strong></div>
        <div class="stat-line"><span>Guild Contracts Fulfilled:</span><strong>${fmtNum(s.totalBountiesCompleted)}</strong></div>
        <div class="stat-line"><span>Ascensions:</span><strong>${fmtNum(this.gameState.ascensionCount)}</strong></div>
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

  // Pays out a booked Fast Forward over a few loop ticks (FF_WARP_RATE), in small sim steps.
  // Effects and sounds of the warped events are skipped: they are what made spam-clicking lag.
  processFastForward(realDt) {
    if (!this.fastForwardSystem.isWarping()) return;
    particles.suppressed = true;
    sound.quiet = true;
    rewards.beginBatch(); // rewards earned inside the warp arrive as one toast per kind
    try {
      this.fastForwardSystem.consume(realDt, (step) => this.onSimTick(step));
    } finally {
      particles.suppressed = false;
      sound.quiet = false;
      rewards.endBatch('During the time warp');
    }
  }

  // Header Fast Forward button: price, uses this cycle, time to price reset. Text-only updates.
  updateFastForwardButton() {
    const btn = this.$('btn-time-warp');
    if (!btn) return;
    const ff = this.fastForwardSystem;
    const cost = ff.getCost();
    const uses = ff.getUses();
    const resetIn = ff.getResetIn();
    const warping = ff.isWarping();
    const sand = Math.floor(this.gameState.chronoSand || 0);
    const affordable = sand >= cost;

    const costText = `${new BigNum(cost).format('standard', 0)} sand`;
    let infoText;
    if (warping) infoText = 'warping…';
    else if (uses === 0) infoText = 'base price';
    else {
      const s = Math.ceil(resetIn);
      infoText = `${uses} used · resets ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }
    setText(this.$('ff-cost'), costText);
    setText(this.$('ff-info'), infoText);

    const disabled = warping || !affordable;
    if (btn.disabled !== disabled) {
      btn.disabled = disabled;
      btn.classList.toggle('disabled', disabled);
    }
    const title = `Warp ${FF_WARP_SECONDS}s ahead for ${costText}${affordable ? '' : ` (you have ${fmtNum(sand)})`}. ` +
      `Each use this cycle costs x${FF_COST_GROWTH} more; the price resets after ${FF_RESET_MINUTES} min without a use.`;
    if (btn.title !== title) btn.title = title;
  }

  // Fast animation render tick (60 fps)
  onRenderTick(dt) {
    this.updateHeaderStats();
    this.updateFastForwardButton();
    this.updateAnomalyUI();
    this.updateTabNotifications();
    this.updateTabBonusStrip(dt);
    this.updateQuickCastBar();
    this.leaderboard.tick(this.currentTab === 'leaderboard', VERSION);
    this.buffBar.update();
    this.shell?.update(dt);
    this.wardensRelicsUI?.update(this.currentTab);

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
    setText(this.$('stat-aether'), this.gameState.aether.format('standard', 2));

    const aetherRateEl = this.$('stat-aether-rate');
    if (aetherRateEl) {
      const rate = this.gameState.getNetAetherPerSecond();
      setText(aetherRateEl, `+${rate.format('standard', 2)} /s`);
      // Mastery tooltip: refreshed every 30 frames (~0.5 s), only written when it changes
      this.aetherTipTimer = (this.aetherTipTimer ?? 29) + 1;
      if (this.aetherTipTimer >= 30) {
        this.aetherTipTimer = 0;
        const tip = getAetherMasteryTooltip(this.gameState);
        if (aetherRateEl.title !== tip) aetherRateEl.title = tip;
      }
    }

    setText(this.$('stat-gold'), this.gameState.gold.format('standard', 0));

    setText(this.$('stat-mana'), `${fmtNum(Math.floor(this.gameState.mana))} / ${fmtNum(Math.floor(this.gameState.maxMana))}`);
    setWidth(this.$('bar-mana-fill'), `${(this.gameState.mana / this.gameState.maxMana) * 100}%`);

    setText(this.$('stat-chrono'), `${new BigNum(Math.floor(this.gameState.chronoSand)).format('standard', 2)}s`);
    setText(this.$('stat-guild-seals'), fmtNum(this.gameState.guildSeals || 0));
    setText(this.$('stat-cosmic-dust'), this.gameState.cosmicDust.format('standard', 0));
  }

  updateAnomalyUI() {
    const el = this.$('golden-anomaly');
    if (!el) return;
    if (this.clickerSystem.anomalyActive) {
      if (el.style.display !== 'flex') el.style.display = 'flex';
      const left = `${this.clickerSystem.anomalyX}%`;
      const top = `${this.clickerSystem.anomalyY}%`;
      if (el.style.left !== left) el.style.left = left;
      if (el.style.top !== top) el.style.top = top;
    } else if (el.style.display !== 'none') {
      el.style.display = 'none';
    }
  }

  renderMonolithOverview() {
    const clickPowerEl = this.$('monolith-click-power');
    if (clickPowerEl) {
      const clickVal = this.gameState.getClickYield();
      setText(clickPowerEl, `+${clickVal.format('standard', 1)} per Click`);
    }

    const comboBar = this.$('combo-bar-fill');
    const comboText = this.$('combo-text');
    if (comboBar && comboText) {
      const combo = this.gameState.comboCount;
      setWidth(comboBar, `${Math.min(100, combo)}%`);
      setText(comboText, combo > 0 ? `${combo}x Combo! (${(1 + Math.min(50, combo) * 0.08).toFixed(1)}x boost)` : 'Combo Ready');
    }

    const frenzyBadge = this.$('frenzy-badge');
    if (frenzyBadge) {
      if (this.gameState.frenzyActive) {
        if (frenzyBadge.style.display !== 'block') frenzyBadge.style.display = 'block';
        setText(frenzyBadge, `🔥 FRENZY ACTIVE! (${this.gameState.frenzyTimer.toFixed(1)}s)`);
      } else if (frenzyBadge.style.display !== 'none') {
        frenzyBadge.style.display = 'none';
      }
    }

    // Optional container (not in the current index.html); looked up once, rebuilt only when changed
    if (this.activeBuffsList === undefined) this.activeBuffsList = document.getElementById('active-buffs-list');
    const buffsContainer = this.activeBuffsList;
    if (buffsContainer) {
      const html = this.gameState.activeBuffs.map(b =>
        `<span class="buff-chip">${b.name} (${Math.ceil(b.duration)}s)</span>`
      ).join('');
      if (this.activeBuffsHtml !== html) {
        this.activeBuffsHtml = html;
        buffsContainer.innerHTML = html;
      }
    }
  }
}

// Instantiate on window load
window.addEventListener('DOMContentLoaded', () => {
  window.gameApp = new AetheriaApp();
  window.gameApp.init();
});

// Global Custom Tooltip System
function setupTooltips() {
  const tooltip = document.createElement('div');
  tooltip.id = 'global-tooltip';
  document.body.appendChild(tooltip);

  document.addEventListener('mouseover', e => {
    const target = e.target.closest('[title], [data-original-title]');
    if (!target) return;
    
    if (target.hasAttribute('title')) {
      target.setAttribute('data-original-title', target.getAttribute('title'));
      target.removeAttribute('title');
    }
    
    const tipText = target.getAttribute('data-original-title');
    if (!tipText) return;
    
    // Parse possible asterisks or emphasis for styling if needed
    tooltip.innerHTML = tipText;
    tooltip.classList.add('visible');
    
    const updatePosition = (x, y) => {
      let left = x + 15;
      let top = y + 15;
      if (left + tooltip.offsetWidth > window.innerWidth) left = window.innerWidth - tooltip.offsetWidth - 10;
      if (top + tooltip.offsetHeight > window.innerHeight) top = y - tooltip.offsetHeight - 15;
      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
    };
    updatePosition(e.clientX, e.clientY);
    
    target._tooltipMove = (me) => updatePosition(me.clientX, me.clientY);
    target.addEventListener('mousemove', target._tooltipMove);
  });

  document.addEventListener('mouseout', e => {
    const target = e.target.closest('[data-original-title]');
    if (!target) return;
    if (target._tooltipMove) {
      target.removeEventListener('mousemove', target._tooltipMove);
      delete target._tooltipMove;
    }
    tooltip.classList.remove('visible');
  });
}

// Intercept window.gameApp.init call if it exists, or just run it.
// To avoid conflicts, we just add it to DOMContentLoaded.
window.addEventListener('DOMContentLoaded', () => {
  setupTooltips();
});





