import { BigNum } from '../engine/BigNum.js';
import { sound } from '../engine/AudioEngine.js';
import { particles } from '../engine/ParticleEngine.js';
import { ensureRecords, grantTalentPoints, recordContractClaim } from './TalentSources.js';

// Stand-in for the paced contract board (roadmap 4.4, R10): the board still refills instantly, so
// Guild Rank counts at most one claim per 30 min, banked up to 6 (the board's real ceiling of 48 a
// day). Over-limit claims still pay gold, seals and sand. R10 replaces this with the real board and
// calls recordContractClaim() directly.
export const GUILD_CLAIM_INTERVAL_MS = 30 * 60 * 1000;
export const GUILD_CLAIM_BANK = 6;

export const BOUNTY_TEMPLATES = [
  { type: 'click', title: 'Energize the Monolith', reqBase: 50, icon: '👆', desc: 'Perform manual clicks' },
  { type: 'crit_click', title: 'Critical Resonance', reqBase: 12, icon: '🎯', desc: 'Land critical clicks' },
  { type: 'slay_monster', title: 'Purge the Catacombs', reqBase: 6, icon: '⚔️', desc: 'Slay dungeon monsters' },
  { type: 'slay_boss', title: 'Boss Execution', reqBase: 1, icon: '👑', desc: 'Slay dungeon floor bosses' },
  { type: 'mine_block', title: 'Subterranean Excavation', reqBase: 10, icon: '⛏️', desc: 'Mine underground tiles' },
  { type: 'harvest_plant', title: 'Botanical Gathering', reqBase: 4, icon: '🌱', desc: 'Harvest mature plants' },
  { type: 'brew_potion', title: 'Alchemist Calling', reqBase: 2, icon: '🧪', desc: 'Brew potions or catalysts' },
  { type: 'cast_spell', title: 'Arcane Mastery', reqBase: 3, icon: '✨', desc: 'Cast active spells' },
  { type: 'buy_building', title: 'Expanding Empire', reqBase: 10, icon: '🏛️', desc: 'Construct generators' }
];

export const QUARTERMASTER_UPGRADES = [
  { id: 'aether_treaty', name: 'Aetheric Treaty', icon: '📜', desc: '+25% Global Aether Production per rank', baseCost: 5, costInc: 3, maxRank: 50 },
  { id: 'hunters_edge', name: "Hunter's Edge", icon: '⚔️', desc: '+15% Hero Attack per rank', baseCost: 5, costInc: 3, maxRank: 50 },
  { id: 'golden_req', name: 'Golden Requisition', icon: '💰', desc: '+25% Combat Gold Drops per rank', baseCost: 5, costInc: 3, maxRank: 50 },
  { id: 'chronos_contract', name: 'Chronos Contract', icon: '⏳', desc: '+5% Offline Efficiency per rank', baseCost: 10, costInc: 5, maxRank: 10 }
];

export class BountySystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.maxBounties = 4;
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

  initBounties() {
    if (!Array.isArray(this.gameState.bounties)) {
      this.gameState.bounties = [];
    }
    // Top up to the full board (a load may have dropped corrupted entries)
    while (this.gameState.bounties.length < this.maxBounties) {
      this.gameState.bounties.push(this.generateBounty());
    }
  }

  generateBounty() {
    const tmpl = BOUNTY_TEMPLATES[Math.floor(Math.random() * BOUNTY_TEMPLATES.length)];
    const difficultyMult = 1 + Math.floor(Math.random() * 3);
    const required = tmpl.reqBase * difficultyMult;

    const goldReward = new BigNum(250 * difficultyMult * Math.max(1, (this.gameState.hero?.floor || 1) * 0.5));
    const sealsReward = 1 * difficultyMult;
    const chronoReward = 15 * difficultyMult;

    return {
      id: 'bounty_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type: tmpl.type,
      title: tmpl.title,
      icon: tmpl.icon,
      desc: `${tmpl.desc} (${required})`,
      current: 0,
      required: required,
      completed: false,
      claimed: false,
      rewards: {
        gold: goldReward,
        seals: sealsReward,
        chrono: chronoReward,
        talentPoint: false // R9: no random talent points; Guild Rank (S3) pays them
      }
    };
  }

  checkProgress(actionType, amount = 1) {
    let anyCompleted = false;
    for (const b of this.gameState.bounties) {
      if (!b.completed && b.type === actionType) {
        b.current = Math.min(b.required, b.current + amount);
        if (b.current >= b.required) {
          b.completed = true;
          anyCompleted = true;
          sound.playAchievement();
          particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, `CONTRACT COMPLETE: ${b.title}!`, '#fbbf24', true);
        }
      }
    }
  }

  claimBounty(bountyId) {
    const idx = this.gameState.bounties.findIndex(b => b.id === bountyId);
    if (idx === -1) return false;

    const b = this.gameState.bounties[idx];
    if (!b.completed || b.claimed) return false;

    b.claimed = true;
    sound.playBuy();

    // Grant rewards
    this.gameState.gold = this.gameState.gold.add(b.rewards.gold);
    this.gameState.guildSeals = (this.gameState.guildSeals || 0) + b.rewards.seals;
    this.gameState.addChronoSand(b.rewards.chrono);

    // Rank-count claims (stand-in pacing, see above)
    if (this.consumeGuildClaim()) recordContractClaim(this.gameState, 1);

    // A contract generated before R9 may still carry a talent point; honour it
    if (b.rewards.talentPoint) {
      grantTalentPoints(this.gameState, 1, 'guild', 'Contract');
      particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, '+1 TALENT POINT!', '#ec4899', true);
    }

    this.gameState.stats.totalBountiesCompleted++;

    // Replace with a new bounty immediately!
    this.gameState.bounties.splice(idx, 1);
    this.gameState.bounties.push(this.generateBounty());
    return true;
  }

  // Token bucket: refills 1 per GUILD_CLAIM_INTERVAL_MS (wall clock), holds GUILD_CLAIM_BANK
  consumeGuildClaim(now = Date.now()) {
    const rec = ensureRecords(this.gameState);
    let bk = rec.contractBucket;
    if (!bk || !Number.isFinite(bk.tokens) || !Number.isFinite(bk.at)) bk = { tokens: GUILD_CLAIM_BANK, at: now };
    // a clock set backwards must not freeze the bucket
    const elapsed = Math.max(0, now - bk.at);
    bk.tokens = Math.min(GUILD_CLAIM_BANK, bk.tokens + elapsed / GUILD_CLAIM_INTERVAL_MS);
    bk.at = now;
    rec.contractBucket = bk;
    if (bk.tokens < 1) return false;
    bk.tokens -= 1;
    return true;
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
    
    sound.playBuy();
    particles.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2, `GUILD CHARTER ACQUIRED!`, '#fbbf24', true);
    return true;
  }
}
