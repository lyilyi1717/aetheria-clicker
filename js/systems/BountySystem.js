import { BigNum } from '../engine/BigNum.js';
import { sound } from '../engine/AudioEngine.js';
import { rewards } from '../ui/rewards.js';
import { grantTalentPoints, recordContractClaim } from './TalentSources.js';
import { t, localize } from '../i18n/index.js';

// Contract board (roadmap 4.4, R10). The board holds up to BOARD_SIZE contracts. One new contract
// arrives every CONTRACT_INTERVAL_MS of wall-clock time (never sped up by Fast Forward) while there
// is a free slot; nothing refills instantly on claim. Time away is never punished: the board keeps
// filling while the player is gone, up to its cap. The ceiling is 48 arrivals a day, which is what
// the Guild Rank (S3) curve in TalentSources assumes. Each claimed contract counts toward the rank.
export const CONTRACT_INTERVAL_MS = 30 * 60 * 1000;
export const BOARD_SIZE = 6;
export const STARTER_CONTRACTS = 4;          // a save with no board yet is topped up to this
export const CLICK_RECENT_MS = 5 * 60 * 1000; // click contracts only roll if the player clicked this recently
export const SIZE_PER_RANK = 0.15;            // required = reqBase * d * (1 + 0.15 * guildRank), up to `cap`

// `tab` is the tab the contract is played in (a contract only rolls once that tab is open to the
// player), `task(n)` the one-line task, `cap` the largest target (about 10 minutes of normal play).
export const BOUNTY_TEMPLATES = [
  { type: 'click', title: 'Energize the Monolith', reqBase: 50, cap: 600, icon: '👆', tab: 'monolith', desc: 'Perform manual clicks', task: n => t('contract.task.click', { n }) },
  { type: 'crit_click', title: 'Critical Resonance', reqBase: 12, cap: 90, icon: '🎯', tab: 'monolith', desc: 'Land critical clicks', task: n => t('contract.task.crit_click', { n }) },
  { type: 'slay_monster', title: 'Purge the Catacombs', reqBase: 6, cap: 120, icon: '⚔️', tab: 'combat', desc: 'Slay dungeon monsters', task: n => t('contract.task.slay_monster', { n }) },
  { type: 'slay_boss', title: 'Boss Execution', reqBase: 1, cap: 4, icon: '👑', tab: 'combat', desc: 'Slay dungeon floor bosses', task: n => t(n === 1 ? 'contract.task.slay_boss1' : 'contract.task.slay_boss', { n }) },
  { type: 'mine_block', title: 'Subterranean Excavation', reqBase: 10, cap: 150, icon: '⛏️', tab: 'mining', desc: 'Mine underground tiles', task: n => t('contract.task.mine_block', { n }) },
  { type: 'harvest_plant', title: 'Botanical Gathering', reqBase: 4, cap: 40, icon: '🌱', tab: 'garden', desc: 'Harvest mature plants', task: n => t('contract.task.harvest_plant', { n }) },
  { type: 'brew_potion', title: 'Alchemist Calling', reqBase: 2, cap: 12, icon: '🧪', tab: 'alchemy', desc: 'Brew potions or catalysts', task: n => t('contract.task.brew_potion', { n }) },
  { type: 'cast_spell', title: 'Arcane Mastery', reqBase: 3, cap: 30, icon: '✨', tab: 'spells', desc: 'Cast active spells', task: n => t('contract.task.cast_spell', { n }) },
  { type: 'buy_building', title: 'Expanding Empire', reqBase: 10, cap: 80, icon: '🏛️', tab: 'monolith', desc: 'Construct generators', task: n => t('contract.task.buy_building', { n }) }
];
localize(BOUNTY_TEMPLATES, 'contract', ['title', 'desc']);
export const TAB_NAMES = {
  monolith: t('nav.refinery'), combat: t('nav.tower'), mining: t('nav.dig'), garden: t('nav.garden'), alchemy: t('nav.alchemy'), spells: t('nav.grimoire')
};
const CLICK_TYPES = ['click', 'crit_click'];

export const QUARTERMASTER_UPGRADES = [
  { id: 'aether_treaty', name: 'Aetheric Treaty', icon: '📜', desc: '+2% Global Oil Production per rank', baseCost: 5, costInc: 3, maxRank: 50 },
  { id: 'hunters_edge', name: "Hunter's Edge", icon: '⚔️', desc: '+15% Hero Attack per rank', baseCost: 5, costInc: 3, maxRank: 50 },
  { id: 'golden_req', name: 'Golden Requisition', icon: '💰', desc: '+25% Combat Gold Drops per rank', baseCost: 5, costInc: 3, maxRank: 50 },
  { id: 'chronos_contract', name: 'Chronos Contract', icon: '⏳', desc: '+5% Offline Efficiency per rank', baseCost: 10, costInc: 5, maxRank: 10 }
];
localize(QUARTERMASTER_UPGRADES, 'qm', ['name', 'desc']);

export class BountySystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.rng = Math.random;   // tests inject a seeded generator
    this.seq = 0;
    this.initBounties();
    this.initQuartermaster();
  }

  initQuartermaster() {
    if (!this.gameState.quartermaster) {
      this.gameState.quartermaster = {};
    }
    // Fill charters a loaded save lacks: buyQuartermasterUpgrade does `[id].rank++` on them
    for (const upg of QUARTERMASTER_UPGRADES) {
      if (!this.gameState.quartermaster[upg.id]) {
        this.gameState.quartermaster[upg.id] = { rank: 0 };
      }
    }
  }

  // Makes gs.bounties (the board) and gs.contracts (the timer) valid. Safe to call any time: a
  // save import replaces both without going through the constructor, so update() calls it too.
  initBounties(now = Date.now()) {
    const gs = this.gameState;
    if (!Array.isArray(gs.bounties)) gs.bounties = [];
    // Legacy and corrupted entries: keep what can still be played and claimed
    gs.bounties = gs.bounties.filter(b => b && b.rewards && Number.isFinite(Number(b.required)));
    for (const b of gs.bounties) normalizeContract(b);
    let c = gs.contracts;
    if (!c || typeof c !== 'object') {
      // First time on the board (a new game, or a save from before R10): keep the contracts the
      // player already has, top up to the starter set, the next arrival is one interval away
      c = gs.contracts = { nextAt: now + CONTRACT_INTERVAL_MS, lastClickAt: now };
      while (gs.bounties.length < STARTER_CONTRACTS) gs.bounties.push(this.generateBounty(now));
    }
    c.nextAt = Number.isFinite(c.nextAt) ? c.nextAt : now + CONTRACT_INTERVAL_MS;
    c.lastClickAt = Number.isFinite(c.lastClickAt) ? c.lastClickAt : 0;
    // A clock set backwards must not freeze the timer for hours
    if (c.nextAt > now + CONTRACT_INTERVAL_MS) c.nextAt = now + CONTRACT_INTERVAL_MS;
    return c;
  }

  // Call every sim tick (cheap). Adds the contracts that arrived on the wall clock, up to the cap.
  // The board keeps filling while the player is away; a full board holds the timer at one interval
  // so a claim never refills instantly and a long absence never stacks arrivals past the cap.
  update(now = Date.now()) {
    const gs = this.gameState;
    const c = this.initBounties(now);
    if (gs.bounties.length >= BOARD_SIZE) {
      c.nextAt = now + CONTRACT_INTERVAL_MS;
      return 0;
    }
    if (now < c.nextAt) return 0;
    let added = 0;
    while (now >= c.nextAt && gs.bounties.length < BOARD_SIZE) {
      gs.bounties.push(this.generateBounty(now));
      c.nextAt += CONTRACT_INTERVAL_MS;
      added++;
    }
    if (gs.bounties.length >= BOARD_SIZE) c.nextAt = now + CONTRACT_INTERVAL_MS;
    return added;
  }

  secondsToNext(now = Date.now()) {
    const c = this.gameState.contracts;
    if (!c || this.gameState.bounties.length >= BOARD_SIZE) return null;
    return Math.max(0, Math.min(CONTRACT_INTERVAL_MS, c.nextAt - now) / 1000);
  }

  // Can the player do this contract type right now? A tab that is not open yet (R7 progressive
  // unlocking will provide gs.isTabUnlocked) never rolls its contracts; click contracts need a
  // click in the last 5 minutes so an idle board never fills with chores nobody is doing.
  isTemplateAvailable(tmpl, now = Date.now()) {
    const gs = this.gameState;
    if (typeof gs.isTabUnlocked === 'function' && !gs.isTabUnlocked(tmpl.tab)) return false;
    if (CLICK_TYPES.includes(tmpl.type)) {
      const last = gs.contracts?.lastClickAt || 0;
      if (now - last > CLICK_RECENT_MS) return false;
    }
    return true;
  }

  getGuildRank() {
    return this.gameState.records?.guildRank || 0;
  }

  // exclude: a type to avoid (a reroll should not hand the same contract back)
  generateBounty(now = Date.now(), exclude = null) {
    const gs = this.gameState;
    let pool = BOUNTY_TEMPLATES.filter(t => this.isTemplateAvailable(t, now));
    if (exclude && pool.length > 1) pool = pool.filter(t => t.type !== exclude);
    if (pool.length === 0) pool = BOUNTY_TEMPLATES.filter(t => t.type === 'buy_building');
    const tmpl = pool[Math.floor(this.rng() * pool.length)];
    const d = 1 + Math.floor(this.rng() * 3);
    const rank = this.getGuildRank();
    const required = Math.max(1, Math.min(tmpl.cap, Math.round(tmpl.reqBase * d * (1 + SIZE_PER_RANK * rank))));
    // Gold is 250 * d * Market Index, so it keeps its worth at any depth
    const goldReward = gs.getMarketIndex().mul(250 * d);
    return {
      id: `bounty_${now}_${++this.seq}_${Math.floor(this.rng() * 1e6).toString(36)}`,
      type: tmpl.type,
      title: tmpl.title,
      icon: tmpl.icon,
      tab: tmpl.tab,
      d,
      desc: tmpl.task(required),
      current: 0,
      required,
      completed: false,
      claimed: false,
      rerolled: false,
      rewards: {
        gold: goldReward,
        seals: 1 * d,
        chrono: 15 * d,
        talentPoint: false // R9: no random talent points; Guild Rank (S3) pays them
      }
    };
  }

  checkProgress(actionType, amount = 1, now = Date.now()) {
    if (CLICK_TYPES.includes(actionType) && this.gameState.contracts) this.gameState.contracts.lastClickAt = now;
    for (const b of this.gameState.bounties) {
      if (!b.completed && b.type === actionType) {
        b.current = Math.min(b.required, b.current + amount);
        if (b.current >= b.required) {
          b.completed = true;
          rewards.notify({
            tier: 'medium', kind: 'contract', icon: '📜', color: '#fbbf24',
            title: t('contract.complete', { name: contractTitle(b) }), batchTitle: t('contract.complete_batch'), detail: t('contract.claim_on_board')
          });
        }
      }
    }
  }

  // One free reroll per contract: swaps an unfinished contract for a fresh one in the same slot.
  // No refill happens and the timer is untouched, so it cannot be used to farm contracts.
  rerollBounty(bountyId, now = Date.now()) {
    const bounties = this.gameState.bounties;
    const idx = bounties.findIndex(b => b.id === bountyId);
    if (idx === -1) return false;
    const old = bounties[idx];
    if (old.rerolled || old.completed || old.claimed || old.current > 0) return false;
    const fresh = this.generateBounty(now, old.type);
    fresh.rerolled = true;
    bounties[idx] = fresh;
    return true;
  }

  canReroll(b) {
    return !!b && !b.rerolled && !b.completed && !b.claimed && !(b.current > 0);
  }

  claimBounty(bountyId) {
    const gs = this.gameState;
    const idx = gs.bounties.findIndex(b => b.id === bountyId);
    if (idx === -1) return false;

    const b = gs.bounties[idx];
    if (!b.completed || b.claimed) return false;

    b.claimed = true;
    sound.playCoins();

    // Grant rewards
    gs.gold = gs.gold.add(b.rewards.gold);
    gs.guildSeals = (gs.guildSeals || 0) + b.rewards.seals;
    gs.addChronoSand(b.rewards.chrono);
    // A small toast keeps the amounts readable after the click (silent: the claim made its sound)
    rewards.notify({
      tier: 'small', kind: 'contract-claim', icon: '📜', color: '#fbbf24', sound: false,
      title: t('contract.claimed'),
      detail: t('contract.claimed_detail', {
        gold: new BigNum(b.rewards.gold).format('standard', 0), seals: b.rewards.seals, sand: b.rewards.chrono
      })
    });

    // Every claim counts toward Guild Rank (S3); a rank-up pays its talent point and seals itself
    recordContractClaim(gs, 1);

    // A contract generated before R9 may still carry a talent point; honour it
    if (b.rewards.talentPoint) {
      grantTalentPoints(gs, 1, 'guild', t('contract.word')); // toast comes from the grant hook
    }

    gs.stats.totalBountiesCompleted++;

    // The slot stays empty until the timer brings the next contract (update())
    gs.bounties.splice(idx, 1);
    return true;
  }

  // Daily Dallah gift (R15): one extra contract, already finished, paying like a size-2 contract.
  // It joins the board (a slot until claimed) and counts toward Guild Rank like any claim; being
  // ready-made, it cannot be rerolled. Returns the contract.
  grantBonusContract() {
    const gs = this.gameState;
    const b = {
      id: `bounty_dallah_${Date.now()}_${++this.seq}_${Math.floor(this.rng() * 1e6).toString(36)}`,
      type: 'dallah', title: 'Dallah Writ', icon: '☕', tab: 'monolith', d: 2,
      desc: 'A gift from the Dallah, ready to claim',
      current: 1, required: 1, completed: true, claimed: false, rerolled: true, bonus: true,
      rewards: { gold: gs.getMarketIndex().mul(500), seals: 2, chrono: 30, talentPoint: false }
    };
    gs.bounties.push(b);
    return b;
  }

  getQuartermasterCost(id) {
    const upg = QUARTERMASTER_UPGRADES.find(u => u.id === id);
    if (!upg) return 0;
    const rank = this.gameState.quartermaster[id]?.rank || 0;
    return upg.baseCost + (rank * upg.costInc);
  }

  buyQuartermasterUpgrade(id) {
    const upg = QUARTERMASTER_UPGRADES.find(u => u.id === id);
    if (!upg) return false;
    
    const rank = this.gameState.quartermaster[id]?.rank || 0;
    if (rank >= upg.maxRank) return false;

    const cost = this.getQuartermasterCost(id);
    if ((this.gameState.guildSeals || 0) < cost) return false;

    this.gameState.guildSeals -= cost;
    this.gameState.quartermaster[id].rank++;
    
    rewards.notify({
      tier: 'medium', kind: 'guild-charter', icon: '🏛️', color: '#fbbf24',
      title: t('qm.acquired'), batchTitle: t('qm.acquired_batch')
    });
    return true;
  }
}

// A contract's title and task line in the player's language. Saves keep the English text a
// contract was generated with, so the board reads them from the template by type instead.
export function contractTitle(b) {
  if (b?.type === 'dallah') return t('contract.dallah.title');
  return BOUNTY_TEMPLATES.find(tm => tm.type === b?.type)?.title || b?.title || t('contract.generic');
}

export function contractTask(b) {
  if (b?.type === 'dallah') return t('contract.dallah.desc');
  const tmpl = BOUNTY_TEMPLATES.find(tm => tm.type === b?.type);
  return tmpl ? tmpl.task(b.required) : (b?.desc || '');
}

// Fills what a legacy or hand-edited contract may lack so the board code can rely on it
function normalizeContract(b) {
  b.required = Math.max(1, Number(b.required));
  b.current = Math.max(0, Math.min(b.required, Number(b.current) || 0));
  b.completed = !!b.completed || b.current >= b.required;
  b.claimed = !!b.claimed;
  b.rerolled = !!b.rerolled;
  b.rewards.gold = b.rewards.gold instanceof BigNum ? b.rewards.gold : BigNum.fromJSON(b.rewards.gold);
  b.rewards.seals = Number(b.rewards.seals) || 0;
  b.rewards.chrono = Number(b.rewards.chrono) || 0;
  const tmpl = BOUNTY_TEMPLATES.find(t => t.type === b.type);
  if (!b.tab) b.tab = tmpl?.tab || 'monolith';
  if (!b.icon) b.icon = tmpl?.icon || '📜';
  if (!b.title) b.title = tmpl?.title || 'Guild contract';
  if (!b.desc) b.desc = tmpl ? tmpl.task(b.required) : '';
  // Legacy descriptions read "Perform manual clicks (50)": show the one-line task instead
  else if (tmpl && /^[A-Za-z ]+ \(\d+\)$/.test(b.desc)) b.desc = tmpl.task(b.required);
}
