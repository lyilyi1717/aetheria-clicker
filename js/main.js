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
import { CombatSystem, gearStat, getGearLevel } from './systems/CombatSystem.js';
import { MiningSystem, getPickaxeName } from './systems/MiningSystem.js';
import { GardenSystem, SEED_TYPES, ESSENCE_NAMES, WATER_BOOST, MAX_GOLEMS } from './systems/GardenSystem.js';
import { AlchemySystem, RECIPES, GEM_LADDER } from './systems/AlchemySystem.js';
import { SpellSystem, SPELLS } from './systems/SpellSystem.js';
import { TalentTreeSystem, TALENT_DEFINITIONS } from './systems/TalentTreeSystem.js';
import { BountySystem, QUARTERMASTER_UPGRADES } from './systems/BountySystem.js';
import { MarketSystem, COMMODITIES, getStockCap } from './systems/MarketSystem.js';
import { PrestigeSystem } from './systems/PrestigeSystem.js';
import { DUST_SHOP_ITEMS } from './systems/DustShopSystem.js';
import { DustShopUI } from './ui/dustShop.js';
import { TranscendPanel, fmtBigMult } from './ui/prestige.js';
import { TalentSourcesPanel } from './ui/talents.js';
import { buildContractsBoard, updateContractsBoard, bindContracts } from './ui/contracts.js';
import { AchievementSystem } from './systems/AchievementSystem.js';
import { CollectionSystem } from './systems/CollectionSystem.js';
import { CodexUI } from './ui/codex.js';
import { FastForwardSystem, FF_WARP_SECONDS, FF_COST_GROWTH, FF_RESET_MINUTES } from './systems/FastForwardSystem.js';
import { VERSION, CHANGELOG } from './version.js';
import { getTabBonuses, BONUS_KIND_LABELS, SPELL_TABS, getMasteries, getAetherMasteryTooltip, fmtMult } from './tabBonuses.js';
import { BuffBar } from './buffBar.js';
import { Shell } from './ui/shell.js';
import { UnlocksUI } from './ui/unlocks.js';
import { GardenBreedingUI } from './ui/garden.js';
import { WardensRelicsUI } from './ui/wardens-relics.js';
import { EquipmentUI } from './ui/equipment.js';
import { UpgradeSystem } from './systems/UpgradeSystem.js';
import { UpgradeShopUI } from './ui/upgrades.js';
import { ShardTreeUI } from './ui/shardTree.js';
import { AutoBlastUI } from './ui/autoBlast.js';
import { ChronicleUI } from './ui/chronicle.js';
import { CalendarUI } from './ui/calendar.js';
import { gearCard } from './ui/rarity.js';
import { applyMotionSetting, renderMotionSettings } from './ui/motion.js';
import { applyThemeSetting, renderThemeSettings, themeVar } from './ui/theme.js';
import { NewsTicker, renderNewsSettings } from './ui/newsTicker.js';
import { SharedNews, sharedQueueItems, sharedNewsHooks } from './ui/sharedNews.js';
import { initTooltips, tipHtml, tipAttr } from './ui/tooltip.js';
import { renderCombo } from './ui/comboBar.js';
import { Leaderboard } from './leaderboard.js';
import { AccountUI } from './ui/account.js';
import { CommunityUI } from './ui/community.js';
import { MonsterPortrait, loadBossArtManifest } from './bossArt.js';
import { ITEM_NAMES, TILE_ITEM_KEY, itemName } from './data/names.js';
import { t, tOr, getLang, buffName, bidi, isolateSigns, applyLanguageToDocument, syncLanguageSetting, renderLanguageSettings } from './i18n/index.js';

// Plain-number display in the player's notation (Settings tab); see BigNum.formatNumber
const fmtNum = (n, precision = 2) => BigNum.formatNumber(n, precision);

// Per-frame DOM writes: assigning an unchanged textContent/width still replaces the text node
// and invalidates layout, so the render tick only writes when the value differs.
const setText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };
const setWidth = (el, width) => { if (el && el.style.width !== width) el.style.width = width; };

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
    applyMotionSetting(this.gameState.settings);
    applyThemeSetting(this.gameState.settings);
    // A cloud save opened in a browser with no language choice yet asks for its own language
    this.languageReload = syncLanguageSetting(this.gameState.settings);
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
    this.collectionSystem = new CollectionSystem(this.gameState);
    this.fastForwardSystem = new FastForwardSystem(this.gameState);
    this.upgradeSystem = new UpgradeSystem(this.gameState);

    // Separate 1x/10x/MAX settings: Buildings use buildingSystem.buyAmount, the Enchanter this
    this.enchanterBuyAmount = 1;

    // Cross-link systems onto gameState
    this.gameState.buildingSystem = this.buildingSystem;
    this.gameState.combatSystem = this.combatSystem;
    this.gameState.miningSystem = this.miningSystem;
    this.gameState.gardenSystem = this.gardenSystem;
    this.gameState.bountySystem = this.bountySystem;
    this.gameState.achievementSystem = this.achievementSystem;
    this.gameState.collectionSystem = this.collectionSystem;
    this.gameState.marketSystem = this.marketSystem;
    this.gameState.upgradeSystem = this.upgradeSystem;
    this.gameState.alchemySystem = this.alchemySystem;   // unlock checks (R7)
    this.gameState.prestigeSystem = this.prestigeSystem;

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
    // Shard tree (R13): creates this.shardTreeSystem, builds its panel, runs Auto-Ascend
    this.shardTreeUI = new ShardTreeUI(this);
    this.shardTreeUI.init();
    // Chronicle (R20): creates this.chronicleSystem, builds its tab, runs challenge/Chapter checks
    this.chronicleUI = new ChronicleUI(this);
    this.chronicleUI.init();
    // Daily Dallah, Weekly Ledger, Souq Rotation, Seals (R15): creates this.calendarSystem
    this.calendarUI = new CalendarUI(this);
    this.calendarUI.init();
    this.communityUI = new CommunityUI(this); // R40: bugs & ideas from GitHub issues
    this.communityUI.init();
    initTooltips({ switchTab: (tab) => this.switchTab(tab) });

    // Setup DOM Listeners & Navigation
    this.setupEventListeners();
    this.setupTabs();
    // Account & cloud save (R38): optional; signed out, the game saves locally as before
    this.accountUI = new AccountUI(this);
    this.sharedNews.watchAccount(this.cloudSave);
    this.accountUI.init();

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
        ? t('nav.bounties.ready')
        : t('nav.title.bounties_a_board_of');
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
      // Entries may carry an Arabic version (`ar: { title, changes }`); older ones stay English
      logEl.innerHTML = CHANGELOG.map(entry => {
        const loc = (getLang() === 'ar' && entry.ar) || entry;
        const dir = loc === entry && getLang() === 'ar' ? ' dir="ltr" lang="en"' : '';
        return `
        <div class="changelog-entry"${dir}>
          <div class="changelog-head"><strong>v${entry.version}</strong> &mdash; ${loc.title} <span class="changelog-date">${entry.date}</span></div>
          <ul>${loc.changes.map(c => `<li>${loc === entry ? c : isolateSigns(c)}</li>`).join('')}</ul>
        </div>
      `;
      }).join('');
    }
  }

  buildSettingsStructure() {
    const cont = document.getElementById('settings-notation');
    if (!cont) return;
    const sample = new BigNum(1.5, 16);
    const options = [
      { id: 'letters', label: t('settings.notation.letters') },
      { id: 'scientific', label: t('settings.notation.scientific') },
      { id: 'suffix', label: t('settings.notation.suffix') },
      { id: 'engineering', label: t('settings.notation.engineering') }
    ];
    cont.innerHTML = options.map(o => `
      <label class="settings-option">
        <input type="radio" name="notation" value="${o.id}" ${this.gameState.settings.notation === o.id ? 'checked' : ''}>
        <span>${o.label}</span>
        <span class="settings-sample num">${sample.format(o.id, 2)}</span>
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
        { id: 'pentatonic', label: t('settings.rhythm.pentatonic') },
        { id: 'hijaz', label: t('settings.rhythm.hijaz') },
        { id: 'mystic', label: t('settings.rhythm.mystic') },
        { id: 'lofi', label: t('settings.rhythm.lofi') },
        { id: 'boss', label: t('settings.rhythm.boss') }
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
    this.sharedNews = new SharedNews({ getCloud: () => this.cloudSave });
    const sharedItems = () => sharedQueueItems(this.sharedNews.posts, this.gameState.settings.news, this.sharedNews.myId);
    this.newsTicker = new NewsTicker(() => this.gameState.settings.news, CHANGELOG, sharedItems);
    this.newsTicker.mount(document.getElementById('top-dashboard'));
    this.sharedNews.onChange(() => this.newsTicker.softRefresh());
    this.sharedNews.start();
    const newsChanged = () => { this.newsTicker.refresh(); this.saveManager.save(); };
    renderMotionSettings(document.getElementById('settings-motion'), this.gameState.settings, newsChanged);
    renderNewsSettings(document.getElementById('settings-news'), this.gameState.settings, newsChanged, sharedNewsHooks(this.sharedNews, this.gameState.settings));
    renderThemeSettings(document.getElementById('settings-theme'), this.gameState.settings, () => this.saveManager.save());
    renderLanguageSettings(document.getElementById('settings-language'), this.gameState.settings, () => this.saveManager.save());
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
    if (!this.gameState.isTabUnlocked(tabName)) return; // locked tabs can't be opened (R7)
    this.currentTab = tabName;
    document.querySelectorAll('.nav-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-view').forEach(view => {
      view.classList.toggle('active', view.id === `tab-${tabName}`);
    });
    this.tabNeedsFullRender[tabName] = true;
    this.shell?.onTabChange(tabName);
    this.unlocksUI?.onTabChange(tabName);
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
        rewards.notify({ tier: 'small', kind: 'time-warp', icon: '⚡', title: t('ff.toast', { s: FF_WARP_SECONDS }), color: '#38bdf8', source: warpBtn });
        this.updateFastForwardButton();
      });
    }

    // Sound toggle & volume
    const muteBtn = document.getElementById('btn-mute');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        sound.setMuted(!sound.muted);
        muteBtn.textContent = sound.muted ? t('hdr.muted') : t('hdr.sound_on');
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
        rewards.notify({ tier: 'small', kind: 'game-saved', icon: '💾', title: t('save.saved'), color: '#4ade80' });
      });
    }

    const exportBtn = document.getElementById('btn-export-save');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const str = this.saveManager.exportSaveString();
        navigator.clipboard?.writeText(str);
        alert(t('save.copied') + '\n\n' + str.substring(0, 50) + '...');
      });
    }

    const importBtn = document.getElementById('btn-import-save');
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        const input = prompt(t('save.paste'));
        if (input) {
          if (this.saveManager.importSaveString(input)) {
            alert(t('save.loaded'));
            window.location.reload();
          } else {
            alert(t('save.invalid'));
          }
        }
      });
    }

    const resetBtn = document.getElementById('btn-hard-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm(t('save.wipe_confirm'))) {
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

    // Event Delegation: Quartermaster (the contract board binds its own clicks, js/ui/contracts.js)
    bindContracts(this);
    const bountiesTab = document.getElementById('tab-bounties');
    if (bountiesTab) {
      bountiesTab.addEventListener('click', (e) => {
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
      if (['settings', 'about', 'talents', 'leaderboard', 'community'].includes(tab)) continue;
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
        bar.innerHTML = `<span class="tab-bonus-title">${t('quickcast.title')}</span>` + spellIds.map(id => {
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
      if (buff) state = t('quickcast.active', { s: Math.ceil(buff.duration) });
      else if (cd > 0) state = t('u.sec', { n: Math.ceil(cd) });
      else state = t('quickcast.mana', { n: s.manaCost });
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
    const items = getTabBonuses(this.gameState, this.currentTab, TALENT_DEFINITIONS, DUST_SHOP_ITEMS);
    // One summary line that opens the chips on tap (R23; toggle in js/ui/shell.js)
    const html = items.length === 0 ? '' :
      `<button class="tab-bonus-summary" type="button" aria-expanded="${strip.classList.contains('is-open')}">` +
      `<span class="tab-bonus-title">✨ ${t(items.length === 1 ? 'bonus.count1' : 'bonus.count', { n: items.length })}</span>` +
      `<span class="tab-bonus-names">${items.map(i => i.name).join(' · ')}</span></button>` +
      `<div class="tab-bonus-chips">` +
      items.map(i => `<span class="tab-bonus-chip ${i.kind}" ${tipAttr(tipHtml(i.name, BONUS_KIND_LABELS[i.kind], i.detail))}>${i.icon} <strong>${i.name}</strong> ${i.detail}</span>`).join('') + `</div>`;
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
    this.unlocksUI = new UnlocksUI(this);
    this.unlocksUI.build();
    this.buildBuildingsStructure();
    this.buildCombatStructure();
    this.buildMiningStructure();
    this.autoBlastUI = new AutoBlastUI(this);
    this.autoBlastUI.init();
    this.buildGardenStructure();
    this.buildAlchemyStructure();
    this.breedingUI = new GardenBreedingUI(this, fmtNum);
    this.breedingUI.build();
    this.wardensRelicsUI = new WardensRelicsUI(this, fmtNum);
    this.wardensRelicsUI.build();
    this.equipmentUI = new EquipmentUI(this, fmtNum);
    this.equipmentUI.build();
    this.upgradeShopUI = new UpgradeShopUI(this);
    this.upgradeShopUI.build();
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
          <div class="b-stats num" id="b-stats-${def.id}"></div>
        </div>
        <button class="btn-buy-building btn btn-buy" id="btn-buy-${def.id}" data-id="${def.id}">
          <span class="lbl" id="buy-lbl-${def.id}"></span>
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
      setText(this.$(`b-stats-${def.id}`), t('bld.yield', { n: currentCps.format('standard', 1) }));
      setText(this.$(`buy-lbl-${def.id}`), t('bld.buy', { n: fmtNum(buyCount) }));
      // Affordable shows the price on a gold button; otherwise say how much Aether is missing
      setText(this.$(`cost-lbl-${def.id}`), canAfford
        ? `💎 ${cost.format('standard', 1)}`
        : t('bld.need', { n: cost.sub(this.gameState.aether).format('standard', 1) }));

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
          <div class="sk-name">${tOr(`skill.${key}`, s.name)}</div>
          <div class="sk-cd" id="sk-cd-${key}">${t('combat.ready')}</div>
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
      const title = `<span style="color: ${themeVar(zone.color)}">${zone.icon} ${t('combat.floor_title', { n: h.floor, zone: zone.name })}</span>`;
      if (this.lastCombatTitle !== title) {
        this.lastCombatTitle = title;
        floorEl.innerHTML = title;
      }
    }

    const maxHp = this.combatSystem.getTotalMaxHp();
    setText(this.$('hero-hp-text'), t('combat.hp', { hp: this.combatSystem.fmt(Math.floor(h.hp)), max: this.combatSystem.fmt(maxHp) }) + (h.shield > 0 ? ' ' + t('combat.shield', { n: this.combatSystem.fmt(h.shield) }) : ''));
    setWidth(this.$('hero-hp-fill'), `${Math.min(100, (h.hp / maxHp) * 100)}%`);
    setText(this.$('hero-atk-text'), t('combat.attack', { n: this.combatSystem.fmt(this.combatSystem.getTotalAttack()), s: h.attackSpeed }));
    setText(this.$('hero-lvl-text'), t('combat.level', { n: h.level, xp: this.combatSystem.fmt(h.xp), need: this.combatSystem.fmt(h.xpNeeded) }));

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

    setText(this.$('monster-hp-text'), t('combat.hp', { hp: this.combatSystem.fmt(Math.max(0, m.hp)), max: this.combatSystem.fmt(m.maxHp) }));
    setWidth(this.$('monster-hp-fill'), `${Math.max(0, (m.hp / m.maxHp) * 100)}%`);

    if (bossTimerEl) {
      // visibility (not display) so the portrait doesn't jump when a boss arrives
      const vis = m.isBoss ? 'visible' : 'hidden';
      if (bossTimerEl.style.visibility !== vis) bossTimerEl.style.visibility = vis;
      if (m.isBoss) setText(bossTimerEl, t('combat.enrage', { s: m.timer.toFixed(1) }));
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
      setText(this.$(`sk-cd-${key}`), onCd ? t('u.sec', { n: s.cd.toFixed(1) }) : t('combat.ready'));
    }

    // Gear
    const gearCont = this.$('hero-gear-container');
    // Notation is part of the key so a Settings change re-renders the formatted stats
    const gearSig = BigNum.notation + JSON.stringify(h.gear);
    if (gearCont && this.lastGearSig !== gearSig) {
      this.lastGearSig = gearSig;
      const g = h.gear;
      const fmt = (v) => this.combatSystem.fmt(v);
      // Stats include gear levels (R34); the level shows after the stat
      const lv = (item) => getGearLevel(item) > 0 ? ' · ' + t('gear.lv', { n: getGearLevel(item) }) : '';
      gearCont.innerHTML =
        gearCard(t('gear.slot.weapon'), g.weapon, t('gear.stat.atk', { n: fmt(gearStat('weapon', g.weapon)) }) + lv(g.weapon)) +
        gearCard(t('gear.slot.armor'), g.armor, t('gear.stat.hp', { n: fmt(gearStat('armor', g.armor)) }) + lv(g.armor)) +
        gearCard(t('gear.slot.amulet'), g.amulet, t('gear.stat.crit', { n: (gearStat('amulet', g.amulet) * 100).toFixed(0) }) + lv(g.amulet)) +
        gearCard(t('gear.slot.relic'), g.relic, t('gear.stat.drain', { n: (gearStat('relic', g.relic) * 100).toFixed(0) }) + lv(g.relic));
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
      const record = grid.maxDepth > grid.depth ? ' · ' + t('mine.record', { n: grid.maxDepth }) : '';
      const title = `<span style="color: ${themeVar(strata.color)}">${strata.icon} ${t('mine.depth_title', { n: grid.depth, strata: strata.name })}${record}</span>`;
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
            <img loading="lazy" decoding="async" src="cosmic_shovel.webp" alt="${t('mine.tool_alt')}" style="width: 64px; height: 64px; border-radius: 8px; border: 2px solid var(--accent-purple); box-shadow: 0 0 10px color-mix(in srgb, var(--dust) 50%, transparent);">
            <div>
              <div>${t('mine.pickaxe_line')}</div>
              <div>${t('mine.drills_line')}</div>
              <div class="mining-stats-line">${t('mine.stats_line')}</div>
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
      setTextById('btn-upgrade-pick', t('mine.upgrade_pick', { name: getPickaxeName(level + 1), n: fmt(pickCost, 2) }));
      this.$('btn-upgrade-pick').classList.toggle('disabled', stone < pickCost);

      const drillCost = this.miningSystem.getAutoDrillCost();
      setTextById('btn-buy-drill', t('mine.buy_drill', { n: fmt(drillCost, 2) }));
      this.$('btn-buy-drill').classList.toggle('disabled', stone < drillCost);

      const cd = this.miningSystem.dynamiteCooldown;
      setTextById('btn-mining-dynamite', t('mine.dynamite', { state: cd > 0 ? t('u.sec', { n: Math.ceil(cd) }) : t('mine.ready') }));
      this.$('btn-mining-dynamite').classList.toggle('disabled', cd > 0);
    }

    const tileContent = (b) => {
      let icon = '⛏️'; let label = itemName('stone');
      if (b.content === 'stairs') { icon = '🪜'; label = t('mine.tile.stairs'); }
      else if (b.content === 'gold_cache') { icon = '💰'; label = t('res.gold'); }
      else if (TILE_ITEM_KEY[b.content]) { const e = ITEM_NAMES[TILE_ITEM_KEY[b.content]]; icon = e.icon; label = e.name; }
      return `<span class="m-icon">${icon}</span><span class="m-lbl">${label}</span>`;
    };

    const container = this.$('mining-grid-board');
    if (container) {
      // Key the rebuild on the blocks array itself: a new grid is generated 400ms after
      // the depth changes, so keying on depth left stale revealed tiles over the new grid.
      if (forceRebuildGrid || container.children.length === 0 || this.lastMiningBlocks !== grid.blocks) {
        this.lastMiningBlocks = grid.blocks;
        container.innerHTML = grid.blocks.map(b => b.revealed ? `
          <div class="mine-tile revealed" id="mine-tile-${b.id}" data-index="${b.id}" style="border-color: ${themeVar(strata.color)}">${tileContent(b)}</div>
        ` : `
          <div class="mine-tile unrevealed" id="mine-tile-${b.id}" data-index="${b.id}" style="border-color: ${themeVar(strata.color)}">
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
          <span class="res-badge">${itemName('stone')}: <span id="min-inv-stone"></span></span>
          ${GEM_LADDER.map(k => `<span class="res-badge" style="color:${ITEM_NAMES[k].color}">${ITEM_NAMES[k].plural}: <span id="min-inv-${k}"></span></span>`).join(' ')}
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
          <span class="seed-nm" id="seed-nm-${id}">${def.name}</span>
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
        <button id="btn-water-garden" class="btn-action">${t('garden.water', { state: '+' + t('u.sec', { n: WATER_BOOST }) })}</button>
        <button id="btn-fertilize-garden" class="btn-action" title="${t('garden.fert_tip', { item: itemName('sporePowder') })}">${t('garden.fert', { item: itemName('sporePowder') })}</button>
        <button id="btn-harvest-all-garden" class="btn-action">${t('garden.harvest_all')}</button>
        <button id="btn-plant-all-garden" class="btn-action">${t('garden.plant_all')}</button>
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
          <div class="p-status" id="plot-stat-${p.id}">${t('garden.empty')}</div>
          <div class="plot-progress-bar"><div class="fill" id="plot-fill-${p.id}" style="width: 0%"></div></div>
        </div>
      `).join('');
    }

    // Garden Golems panel: built once; text/classes updated in place, clicks/changes delegated.
    const golemCont = document.getElementById('garden-golems');
    if (golemCont) {
      const seedOptions = `<option value="">${t('golem.auto_seed')}</option>` +
        Object.entries(SEED_TYPES).map(([id, def]) => `<option value="${id}">${def.icon} ${def.name}</option>`).join('');
      golemCont.innerHTML = `
        <div class="golem-header">
          <div>
            <strong>${t('golem.title')}</strong> <span id="golem-count" class="res-badge num">0 / ${MAX_GOLEMS}</span>
            <div class="golem-sub">${t('golem.sub')}</div>
          </div>
          <button id="btn-buy-golem" class="btn-action" data-action="buy-golem"></button>
        </div>
        <div class="golem-rows">
          ${Array.from({ length: MAX_GOLEMS }, (_, r) => `
            <div class="golem-row locked" id="golem-row-${r}">
              <span class="golem-row-label">${t('golem.row', { n: r + 1 })}</span>
              <span class="golem-row-status" id="golem-row-status-${r}">${t('golem.manual')}</span>
              <label class="golem-row-seed">${t('golem.fallback')}
                <select id="golem-row-seed-${r}" data-row="${r}">${seedOptions}</select>
              </label>
            </div>`).join('')}
        </div>
      `;
      golemCont.onclick = (e) => {
        const btn = e.target.closest('[data-action="buy-golem"]');
        if (!btn) return;
        if (this.gardenSystem.buyGolem()) {
          particles.spawnFloatingText(e.clientX, e.clientY, t('golem.row_automated', { n: this.gameState.garden.golems }), '#4ade80', true);
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
    if (s < 60) return t('u.sec', { n: s });
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    if (h > 0) return t('u.hm', { h, m: String(m).padStart(2, '0') });
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  updateGardenUI() {
    this.breedingUI?.updateGardenPanel();
    const waterBtn = this.$('btn-water-garden');
    if (waterBtn) {
      const cd = this.gardenSystem.waterCooldown;
      const label = t('garden.water', { state: cd > 0 ? t('u.sec', { n: Math.ceil(cd) }) : '+' + t('u.sec', { n: WATER_BOOST }) });
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
      const label = !cost ? t('golem.all_rows')
        : !this.gardenSystem.isGolemPurchaseUnlocked() ? t('golem.locked')
        : t('golem.buy', { row: golems + 1, stone: new BigNum(cost.stone).format('standard', 0), sap: new BigNum(cost.manaSap).format('standard', 0), item: itemName('manaSap') });
      setText(buyGolemBtn, label);
      buyGolemBtn.classList.toggle('disabled', !this.gardenSystem.canBuyGolem());
    }
    for (let r = 0; r < MAX_GOLEMS; r++) {
      const rowEl = this.$(`golem-row-${r}`);
      if (!rowEl) continue;
      const status = this.gardenSystem.getRowStatus(r);
      const cls = `golem-row ${status}`;
      if (rowEl.className !== cls) rowEl.className = cls;
      const st = status === 'locked' ? t('golem.manual') : status === 'noseeds' ? t('golem.noseeds') : t('golem.automated');
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
        setText(statEl, t('garden.empty'));
        setWidth(fillEl, '0%');
      } else {
        const def = SEED_TYPES[p.seed];
        const isMature = p.stage === 'mature' || p.progress >= p.maxTime;
        const progressPct = Math.min(100, (p.progress / p.maxTime) * 100);

        const cls = `garden-plot planted${isMature ? ' mature' : ''}${p.fertilized ? ' fertilized' : ''}${golemCls}`;
        if (plotEl.className !== cls) plotEl.className = cls;
        setText(icoEl, def.icon);
        const st = isMature ? t('garden.ready') : `${def.name} (${this.formatGrowTime(p.maxTime - p.progress)})${p.fertilized ? ' 🧪' : ''}`;
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
          `<bdi><span id="alc-cost-${r.id}-${k}">${fmtNum(v)}</span>x</bdi> ${itemName(k)} (<span id="alc-own-${r.id}-${k}">0</span>)`).join(t('list.sep'));
        return `
          <div class="alchemy-card" id="alc-card-${r.id}">
            <div class="alc-info">
              <div class="alc-name">${r.name}</div>
              <div class="alc-desc">${r.desc}</div>
              ${r.id === 'philosophers_catalyst' ? '<div class="alc-desc" id="alc-catalyst-status"></div>' : ''}
              <div class="alc-cost">${t('alc.cost')} ${costStr}</div>
            </div>
            <button class="btn-brew" id="btn-brew-${r.id}" data-recipe="${r.id}">
              ${t('alc.brew')}
            </button>
          </div>
        `;
      }).join('');
    }

    const transCont = document.getElementById('transmutation-actions');
    if (transCont) {
      transCont.innerHTML = `
        <button id="btn-transmute-stone" class="btn-action">${t('alc.transmute_stone')}</button>
        <div class="chrono-transmute-group" id="chrono-transmute-group">
          <span class="chrono-transmute-lbl" id="chrono-transmute-lbl"></span>
          <button class="btn-action" data-batches="1">x1</button>
          <button class="btn-action" data-batches="10">x10</button>
          <button class="btn-action" data-batches="100">x100</button>
          <button class="btn-action" data-batches="1000">x1K</button>
          <button class="btn-action" data-batches="max" id="btn-transmute-chrono-max">${t('alc.max')}</button>
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
        setText(this.$(`alc-own-${r.id}-${k}`), t('alc.have', { n: fmtNum(inv[k] ?? ess[k] ?? 0) }));
        setText(this.$(`alc-cost-${r.id}-${k}`), fmtNum(cost[k]));
      }
    }
    const catEl = this.$('alc-catalyst-status');
    if (catEl) {
      const n = this.alchemySystem.getCatalystCount();
      setText(catEl, t('alc.brewed', { n: fmtNum(n), mult: this.gameState.getCatalystMult().toFixed(2) }));
    }
    const chronoLbl = this.$('chrono-transmute-lbl');
    if (chronoLbl) {
      const cap = this.gameState.getChronoSandCap();
      setText(chronoLbl, t('alc.chrono_label', { cost: this.alchemySystem.getChronoBatchCost().format('standard', 2), bank: fmtNum(Math.floor(this.gameState.chronoSand || 0)), cap: fmtNum(cap) }));
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
      const label = maxBatches >= 1 ? t('alc.max_fill', { n: new BigNum(fill).format('standard', 2) }) : (room <= 0 ? t('alc.max_full') : t('alc.max'));
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
            <div class="sp-meta">${t('spell.meta', { mana: s.manaCost, cd: s.cooldown })}</div>
          </div>
          <button class="btn-cast-spell" id="btn-spell-${s.id}" data-id="${s.id}">
            <span id="spell-text-${s.id}">${t('spell.cast')}</span>
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
      setText(this.$(`spell-text-${s.id}`), onCd ? t('u.sec', { n: state.cd.toFixed(1) }) : t('spell.cast'));
    }
  }

  // --- Talents Structure ---
  buildTalentsStructure() {
    const ptsEl = document.getElementById('talent-points-header');
    if (ptsEl) {
      ptsEl.innerHTML = `
        <span>${t('talent.available')} <strong id="tp-avail-count" class="num">0</strong></span>
        <button id="btn-respec-talents" class="btn btn-sm btn-ghost" style="margin-inline-start: 1rem">${t('talent.respec')}</button>
      `;
      const respecBtn = document.getElementById('btn-respec-talents');
      if (respecBtn) respecBtn.onclick = () => {
        if (this.gameState.spentTalentPoints <= 0) return;
        if (!confirm(t('talent.respec_confirm'))) return;
        this.talentSystem.respecTalents();
        this.updateTalentsUI();
      };
    }

    const grid = document.getElementById('talents-tree-grid');
    if (grid) {
      grid.innerHTML = TALENT_DEFINITIONS.map(td => `
        <div class="talent-card card branch-${td.branch}">
          <div class="t-name">${td.name}</div>
          <div class="bar-row t-rank">
            <div class="segs dust" id="t-segs-${td.id}">${'<i></i>'.repeat(td.maxRank)}</div>
            <span class="val num" id="t-rank-${td.id}">0 / ${td.maxRank}</span>
          </div>
          <div class="t-desc">${td.desc}</div>
          <button class="btn-rank-talent btn btn-sm btn-dust" id="btn-talent-${td.id}" data-id="${td.id}">
            ${t('talent.upgrade')}
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

    for (const td of TALENT_DEFINITIONS) {
      const state = this.gameState.talents[td.id] || { rank: 0 };
      const isMax = state.rank >= td.maxRank;
      const canRank = !isMax && this.gameState.talentPoints > 0;

      setText(this.$(`t-rank-${td.id}`), `${state.rank} / ${td.maxRank}`);
      const segs = this.$(`t-segs-${td.id}`);
      if (segs) {
        for (let i = 0; i < segs.children.length; i++) segs.children[i].classList.toggle('on', i < state.rank);
      }
      const btn = this.$(`btn-talent-${td.id}`);
      if (btn) {
        // Locked buttons say what's missing rather than just greying out
        setText(btn, isMax ? t('talent.maxed') : canRank ? t('talent.upgrade') : t('talent.need_point'));
        btn.classList.toggle('btn-dust', canRank);
        btn.classList.toggle('active', canRank); // the click handler requires it
        btn.classList.toggle('is-locked', !canRank);
        btn.setAttribute('aria-disabled', String(!canRank));
      }
    }
  }

  // --- Bounties Structure ---
  buildBountiesStructure() {
    buildContractsBoard(this);
    this.updateQuartermasterUI();
  }

  updateBountiesUI() {
    updateContractsBoard(this);
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
          <div class="p-rank" id="qm-rank-${u.id}"></div>
          <div class="p-desc">${u.desc}</div>
          <button class="btn-buy-qm-upgrade" id="btn-qm-${u.id}" data-id="${u.id}"></button>
        </div>
      `).join('');
    }

    for (const u of QUARTERMASTER_UPGRADES) {
      const rank = this.gameState.quartermaster[u.id]?.rank || 0;
      const cost = u.baseCost + (rank * u.costInc);
      const canBuy = (this.gameState.guildSeals || 0) >= cost && rank < u.maxRank;

      setText(this.$(`qm-rank-${u.id}`), t('qm.rank', { n: rank, max: u.maxRank }));
      const btn = this.$(`btn-qm-${u.id}`);
      if (btn) {
        setText(btn, rank >= u.maxRank ? t('qm.maxed') : t('qm.buy', { n: fmtNum(cost) }));
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
            <span class="c-trend" id="trend-${c.id}">${t('market.trend.stable')}</span>
          </div>
          <div class="c-price">${t('market.price', { n: `<strong id="price-${c.id}">${c.basePrice}</strong>` })}</div>
          <div class="c-owned">${t('market.owned')} <strong id="owned-${c.id}">0</strong></div>
          <div class="c-actions">
            <button class="btn-market-buy" data-id="${c.id}">${t('market.buy', { n: 1 })}</button>
            <button class="btn-market-buy10" data-id="${c.id}">${t('market.buy', { n: 10 })}</button>
            <button class="btn-market-sell" data-id="${c.id}">${t('market.sell1')}</button>
            <button class="btn-market-sellall" data-id="${c.id}">${t('market.sellall')}</button>
          </div>
        </div>
      `).join('');
    }
    this.updateMarketUI();
  }

  updateMarketUI() {
    const trendIcons = this.marketTrendLabels || (this.marketTrendLabels = {
      surge: t('market.trend.surge'), rising: t('market.trend.rising'), stable: t('market.trend.stable'),
      falling: t('market.trend.falling'), crash: t('market.trend.crash')
    });
    const trendColors = { surge: 'var(--life)', rising: 'var(--life)', stable: 'var(--text-3)', falling: 'var(--danger)', crash: 'var(--danger)' };

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
        setText(tEl, trendIcons[item.trend] || trendIcons.stable);
        const color = trendColors[item.trend] || 'var(--text-3)';
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
        const tip = cap === 0 ? t('market.garden_only') : t('market.buy_tip', { n: cap });
        if (buyBtn && buyBtn.title !== tip) { buyBtn.title = tip; if (buy10Btn) buy10Btn.title = tip; }
      }
      setText(oEl, fmtNum(item.owned));
    }
    setText(this.$('market-index-display'), bidi(`x${this.marketSystem.getMarketIndex().format('standard', 2)}`));

    const carCont = this.$('market-caravan-panel');
    if (carCont) {
      // Built once and updated in place: rebuilding every frame swallowed button clicks
      if (!carCont.dataset.built) {
        carCont.dataset.built = '1';
        carCont.innerHTML = `
          <div class="caravan-active-card" id="caravan-active">
            <h3>${t('caravan.transit')}</h3>
            <p>${t('caravan.time')}</p>
            <p>${t('caravan.invest')}</p>
          </div>
          <div class="caravan-dispatch-box" id="caravan-dispatch">
            <h3>${t('caravan.dispatch')}</h3>
            <p>${t('caravan.dispatch_desc')}</p>
            <label class="caravan-cargo-opt"><input type="checkbox" id="caravan-load-cargo"> ${t('caravan.load')} <span id="caravan-cargo-preview"></span></label>
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
          const ti = this.marketSystem.getCaravanTier(tier);
          const btn = this.$(btnId);
          setText(btn, t('caravan.send', { n: ti.invest.format('standard', 2), min: ti.minutes, x: ti.profit }));
          btn.classList.toggle('disabled', !this.gameState.gold.gte(ti.invest));
        }
        // What ticking "Load cargo" would ship (small / large caravan), at mean price x premium
        const preview = ['small', 'large'].map(tier => {
          const pick = this.marketSystem.pickCargo(tier);
          if (!pick) return null;
          const name = COMMODITIES.find(x => x.id === pick.id)?.name || pick.id;
          return t(`caravan.cargo.${tier}`, { n: pick.units, name, gold: this.marketSystem.getCargoPayout(pick.id, pick.units, tier).format('standard', 2) });
        }).filter(Boolean);
        setText(this.$('caravan-cargo-preview'), preview.length ? preview.join(' · ') : t('caravan.no_cargo'));
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
      const bonusText = t('enchanter.bonus', { n: level * 5 });
      if (enchanterBonus.textContent !== bonusText) enchanterBonus.textContent = bonusText;
      const btnText = amt === 'max' ? t('enchanter.weave_max') : t('enchanter.weave', { n: amt });
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
    // Dust shop (R6, js/ui/dustShop.js): panel, Auto-Buy switch and clock, Hourglass warps
    this.dustShopUI = new DustShopUI(this);
    this.dustShopUI.init();

    const ascBtn = document.getElementById('btn-do-ascend');
    if (ascBtn) {
      ascBtn.onclick = () => {
        const dm = this.prestigeSystem.getDustMultipliers();
        const nectarNote = '\n\n' + t('prestige.nectar_note', { n: fmtNum(dm.nectar), item: itemName('starNectar'), mult: fmtMult(dm.nectarMult) });
        if (confirm(t('prestige.confirm') + nectarNote)) {
          this.prestigeSystem.ascend();
          this.updateBuildingsUI();
          this.updatePrestigeUI();
        }
      };
    }

    this.transcendUI = new TranscendPanel(this);
    this.transcendUI.build();
    this.talentSourcesUI = new TalentSourcesPanel(this);
    this.talentSourcesUI.build();
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

    setText(pendEl, t('prestige.pending', { n: pending.format('standard', 0) }));
    if (ascBtn) {
      const wait = this.prestigeSystem.getMinRunRemaining();
      const inChallenge = !!this.gameState.chronicle?.active;   // R20: no Ascending mid-challenge
      const disabled = pending.lte(0) || wait > 0 || inChallenge;
      if (ascBtn.disabled !== disabled) ascBtn.disabled = disabled;
      const m = Math.ceil(wait);
      setText(ascBtn, inChallenge ? t('prestige.btn_challenge') : wait > 0 ? t('prestige.btn_wait', { time: `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}` }) : t('tab.prestige.drill_button'));
    }

    // Dust-gain links (Geode Attunement, Nectar Offering): text only, the button is never rebuilt
    const dm = this.prestigeSystem.getDustMultipliers();
    const breakdown = t('prestige.bd.depth', { x: fmtMult(dm.geode), n: dm.depth }) + ' · ' +
      t('prestige.bd.nectar', { x: fmtMult(dm.nectarMult), n: fmtNum(dm.nectar), item: itemName('starNectar') }) +
      (dm.amplifier > 1 ? ' · ' + t('prestige.bd.amp', { x: fmtMult(dm.amplifier) }) : '');
    setText(this.$('pending-dust-breakdown'), breakdown);
    if (ascBtn) {
      const tip = t('prestige.base_tip', { n: this.prestigeSystem.getBaseCosmicDust().format('standard', 0) }) + ' · ' + breakdown;
      if (ascBtn.title !== tip) ascBtn.title = tip;
    }

    this.updateMasteriesPanel();

    this.dustShopUI?.update();

    this.transcendUI?.update();
  }

  // --- Codex Structure ---
  buildCodexStructure() {
    this.codexUI = new CodexUI(this);
    this.codexUI.build();
    this.updateCodexUI();
  }

  updateCodexUI() {
    this.codexUI?.update();

    const statsCont = document.getElementById('game-stats-container');
    if (statsCont) {
      const s = this.gameState.stats;
      const days = (s.totalPlayTimeSeconds / 86400).toFixed(2);
      const hours = (s.totalPlayTimeSeconds / 3600).toFixed(1);

      statsCont.innerHTML = `
        <div class="stat-line"><span>${t('stats.playtime')}</span><strong>${t('stats.playtime_val', { d: days, h: hours })}</strong></div>
        <div class="stat-line"><span>${t('stats.clicks')}</span><strong class="num">${fmtNum(this.gameState.totalClicks)}</strong></div>
        <div class="stat-line"><span>${t('stats.oil')}</span><strong class="num">${this.gameState.totalAetherEarned.format('standard', 2)}</strong></div>
        <div class="stat-line"><span>${t('stats.monsters')}</span><strong class="num">${fmtNum(s.totalMonstersSlain)}</strong></div>
        <div class="stat-line"><span>${t('stats.bosses')}</span><strong class="num">${fmtNum(s.totalBossesSlain)}</strong></div>
        <div class="stat-line"><span>${t('stats.blocks')}</span><strong class="num">${fmtNum(s.totalBlocksMined)}</strong></div>
        <div class="stat-line"><span>${t('stats.plants')}</span><strong class="num">${fmtNum(s.totalPlantsHarvested)}</strong></div>
        <div class="stat-line"><span>${t('stats.potions')}</span><strong class="num">${fmtNum(s.totalPotionsBrewed)}</strong></div>
        <div class="stat-line"><span>${t('stats.spells')}</span><strong class="num">${fmtNum(s.totalSpellsCast)}</strong></div>
        <div class="stat-line"><span>${t('stats.contracts')}</span><strong class="num">${fmtNum(s.totalBountiesCompleted)}</strong></div>
        <div class="stat-line"><span>${t('stats.wells')}</span><strong class="num">${fmtNum(this.gameState.ascensionCount)}</strong></div>
      `;
    }
  }

  // Simulation tick (fixed rate)
  onSimTick(dt, realDt = dt) {
    this.clickerSystem.update(dt);
    // The Tower starts climbing when its tab opens (R7)
    if (this.gameState.isTabUnlocked('combat')) this.combatSystem.update(dt);
    this.miningSystem.update(dt);
    this.gardenSystem.update(dt);
    this.alchemySystem.update(dt, realDt);
    this.spellSystem.update(dt, realDt);
    this.marketSystem.update(dt);
    this.bountySystem.update(); // contract board timer (wall clock, not sim time)

    // Passive aether income
    const aetherPerSec = this.gameState.getNetAetherPerSecond();
    if (aetherPerSec.gt(0)) {
      const deltaIncome = aetherPerSec.mul(dt);
      this.gameState.aether = this.gameState.aether.add(deltaIncome);
      this.gameState.totalAetherEarned = this.gameState.totalAetherEarned.add(deltaIncome);
    }

    this.gameState.stats.totalPlayTimeSeconds += dt;
    this.achievementSystem.checkAchievements();
    this.collectionSystem.update(dt);
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
      rewards.endBatch(t('ff.batch'));
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

    const costText = t('ff.cost', { n: new BigNum(cost).format('standard', 0) });
    let infoText;
    if (warping) infoText = t('ff.warping');
    else if (uses === 0) infoText = t('ff.base_price');
    else {
      const s = Math.ceil(resetIn);
      infoText = t('ff.used', { n: uses, time: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` });
    }
    setText(this.$('ff-cost'), costText);
    setText(this.$('ff-info'), infoText);

    const disabled = warping || !affordable;
    if (btn.disabled !== disabled) {
      btn.disabled = disabled;
      btn.classList.toggle('disabled', disabled);
    }
    const title = t('ff.title', { s: FF_WARP_SECONDS, cost: costText }) + (affordable ? '' : ' ' + t('ff.you_have', { n: fmtNum(sand) })) + '. ' +
      t('ff.title2', { x: FF_COST_GROWTH, min: FF_RESET_MINUTES });
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
    this.unlocksUI?.update(dt);
    this.wardensRelicsUI?.update(this.currentTab);
    this.equipmentUI?.update(this.currentTab);
    this.shardTreeUI?.update(this.currentTab);
    this.dustShopUI?.update();
    this.chronicleUI?.update(this.currentTab);
    this.calendarUI?.update(this.currentTab, dt);
    this.communityUI?.update(this.currentTab);
    this.talentSourcesUI?.update(dt, this.currentTab);

    // Fast, lightweight state updates without replacing DOM nodes
    if (this.currentTab === 'monolith') {
      this.renderMonolithOverview();
      this.updateBuildingsUI();
      this.upgradeShopUI?.update();
    } else if (this.currentTab === 'combat') {
      this.updateCombatUI();
    } else if (this.currentTab === 'mining') {
      this.updateMiningUI(false);
      this.autoBlastUI?.update('mining');
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
      setText(aetherRateEl, t('hdr.rate', { n: rate.format('standard', 2) }));
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

    setText(this.$('stat-chrono'), t('u.sec', { n: new BigNum(Math.floor(this.gameState.chronoSand)).format('standard', 2) }));
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
      setText(clickPowerEl, t('clicker.per_click', { n: clickVal.format('standard', 1) }));
    }

    renderCombo(this.$('combo-bar-fill'), this.$('combo-text'), this.gameState, this.clickerSystem);

    const frenzyBadge = this.$('frenzy-badge');
    if (frenzyBadge) {
      if (this.gameState.frenzyActive) {
        if (frenzyBadge.style.display !== 'block') frenzyBadge.style.display = 'block';
        setText(frenzyBadge, t('clicker.frenzy', { s: this.gameState.frenzyTimer.toFixed(1) }));
      } else if (frenzyBadge.style.display !== 'none') {
        frenzyBadge.style.display = 'none';
      }
    }

    // Optional container (not in the current index.html); looked up once, rebuilt only when changed
    if (this.activeBuffsList === undefined) this.activeBuffsList = document.getElementById('active-buffs-list');
    const buffsContainer = this.activeBuffsList;
    if (buffsContainer) {
      const html = this.gameState.activeBuffs.map(b =>
        `<span class="buff-chip">${buffName(b)} (${t('u.sec', { n: Math.ceil(b.duration) })})</span>`
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
  applyLanguageToDocument();
  window.gameApp = new AetheriaApp();
  if (window.gameApp.languageReload) { window.gameApp.saveManager.save(); location.reload(); return; }
  window.gameApp.init();
});
