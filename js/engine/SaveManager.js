// SaveManager: LocalStorage, Auto-Save, Export/Import, and Offline Progression

const SAVE_KEY = 'AETHERIA_CHRONICLES_SAVE_V1';

// Offline Aether is paid in two bands (docs/redesign-proposal.md section 8): 100% for the first
// 8 h away, 50% from 8 h to 24 h, nothing beyond. Without a cap, moving the system clock forward
// credited unbounded Aether, which also fed the Best Run Aether leaderboard stat.
// Each Chrono Reservoir rank (ascension perk `chrono_vault`) adds 4 h to the full-rate band and
// moves the end of the cap out by the same 4 h, so the 50% band stays 16 h long.
export const OFFLINE_FULL_BAND = 8 * 3600; // seconds at 100%
export const OFFLINE_AETHER_CAP = 24 * 3600; // seconds; nothing is paid beyond this (base)
export const OFFLINE_HALF_RATE = 0.5;
export const OFFLINE_RESERVOIR_BONUS = 4 * 3600; // seconds per Chrono Reservoir rank

// Splits time away into paid bands. Pure: no game state, so it is easy to test.
// Negative, NaN or infinite elapsed time (clock moved backwards) pays nothing.
export function computeOfflineBands(elapsedSeconds, reservoirRank = 0) {
  const elapsed = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
  const rank = Math.max(0, Number(reservoirRank) || 0);
  const fullEnd = OFFLINE_FULL_BAND + rank * OFFLINE_RESERVOIR_BONUS;
  const capEnd = OFFLINE_AETHER_CAP + rank * OFFLINE_RESERVOIR_BONUS;
  const fullSecs = Math.min(elapsed, fullEnd);
  const halfSecs = Math.max(0, Math.min(elapsed, capEnd) - fullEnd);
  return {
    elapsedSeconds: elapsed,
    fullSecs,
    halfSecs,
    unpaidSecs: Math.max(0, elapsed - capEnd),
    fullEnd,
    capEnd,
    halfRate: OFFLINE_HALF_RATE,
    // Seconds of production credited before efficiency multipliers
    paidSecs: fullSecs + halfSecs * OFFLINE_HALF_RATE,
    capped: elapsed > capEnd
  };
}

export class SaveManager {
  constructor(gameState) {
    this.gameState = gameState;
    this.lastSaveTime = Date.now();
    this.autoSaveInterval = 10000; // 10 seconds
  }

  save() {
    try {
      const data = this.gameState.serialize();
      data.savedAt = Date.now();
      const serialized = JSON.stringify(data);
      localStorage.setItem(SAVE_KEY, serialized);
      this.lastSaveTime = Date.now();
      return true;
    } catch (err) {
      console.error('Save failed:', err);
      return false;
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data;
    } catch (err) {
      console.error('Load failed:', err);
      return null;
    }
  }

  exportSaveString() {
    try {
      const data = this.gameState.serialize();
      data.savedAt = Date.now();
      const json = JSON.stringify(data);
      return btoa(encodeURIComponent(json));
    } catch (e) {
      console.error('Export failed:', e);
      return '';
    }
  }

  importSaveString(saveString) {
    try {
      const decoded = decodeURIComponent(atob(saveString.trim()));
      const data = JSON.parse(decoded);
      // Valid JSON that isn't a save object would otherwise load as an empty game and be saved
      if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
      // Same path as a normal load: deserialize runs the migration chain (migrations.js)
      this.gameState.deserialize(data);
      this.save();
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }

  hardReset() {
    localStorage.removeItem(SAVE_KEY);
    window.location.reload();
  }

  // Calculate offline gains when player returns
  processOfflineTime(savedAt) {
    if (!savedAt) return null;
    const now = Date.now();
    // A clock moved backwards gives a negative gap: it pays nothing (never negative)
    const elapsedSeconds = Math.max(0, (now - savedAt) / 1000);
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 5) return null; // Ignore short micro-reloads

    // Calculate offline resources based on current production rates
    const prodPerSec = this.gameState.getNetAetherPerSecond();
    let offlineEfficiency = this.gameState.stats.offlineEfficiency || 1.0;
    
    // Apply Quartermaster Chronos Contract
    if (this.gameState.quartermaster && this.gameState.quartermaster['chronos_contract']) {
      offlineEfficiency += this.gameState.quartermaster['chronos_contract'].rank * 0.05;
    }
    
    // Banded payout (100% then 50%); Chrono Reservoir extends the bands. Efficiency (talents,
    // Chronos Contract) multiplies whatever the bands pay.
    const reservoirRank = this.gameState.ascensionPerks?.chrono_vault?.rank || 0;
    const bands = computeOfflineBands(elapsedSeconds, reservoirRank);
    const effectiveSecs = bands.paidSecs * offlineEfficiency;

    const gainedAether = prodPerSec.mul(effectiveSecs);
    this.gameState.aether = this.gameState.aether.add(gainedAether);
    this.gameState.totalAetherEarned = this.gameState.totalAetherEarned.add(gainedAether);

    // Give Chrono Sand / Time Warps (1 Chrono Sand per minute offline, up to the sand bank cap)
    const minutes = Math.floor(elapsedSeconds / 60);
    // Chrono Reservoir perk: +50% cap per rank. The same cap bounds the whole sand bank.
    const sandCap = this.gameState.getChronoSandCap();
    const current = this.gameState.chronoSand || 0;
    const chronoEarned = Math.max(0, Math.min(minutes, sandCap - current));
    this.gameState.chronoSand = current + chronoEarned;

    // Garden grows offline (GardenSystem applies its own speed factor and cap)
    const garden = this.gameState.gardenSystem?.applyOfflineTime(elapsedSeconds) || { harvests: 0 };

    return {
      elapsedSeconds,
      capped: bands.capped,
      bands,
      efficiency: offlineEfficiency,
      gainedAether,
      chronoEarned,
      gardenHarvests: garden.harvests
    };
  }
}
