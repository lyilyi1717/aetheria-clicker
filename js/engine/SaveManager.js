// SaveManager: LocalStorage, Auto-Save, Export/Import, and Offline Progression

const SAVE_KEY = 'AETHERIA_CHRONICLES_SAVE_V1';

// Offline Aether stops accruing after 24 h, matching the default Chrono Sand bank (1440 min).
// Without it, moving the system clock forward credited unbounded Aether, which also fed the
// Best Run Aether leaderboard stat.
export const OFFLINE_AETHER_CAP = 24 * 3600; // seconds

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
    const elapsedSeconds = Math.max(0, (now - savedAt) / 1000);
    if (elapsedSeconds < 5) return null; // Ignore short micro-reloads

    // Calculate offline resources based on current production rates
    const prodPerSec = this.gameState.getNetAetherPerSecond();
    let offlineEfficiency = this.gameState.stats.offlineEfficiency || 1.0;
    
    // Apply Quartermaster Chronos Contract
    if (this.gameState.quartermaster && this.gameState.quartermaster['chronos_contract']) {
      offlineEfficiency += this.gameState.quartermaster['chronos_contract'].rank * 0.05;
    }
    
    const capped = elapsedSeconds > OFFLINE_AETHER_CAP;
    const effectiveSecs = Math.min(elapsedSeconds, OFFLINE_AETHER_CAP) * offlineEfficiency;

    const gainedAether = prodPerSec.mul(effectiveSecs);
    this.gameState.aether = this.gameState.aether.add(gainedAether);
    this.gameState.totalAetherEarned = this.gameState.totalAetherEarned.add(gainedAether);

    // Give Chrono Sand / Time Warps (1 Chrono Sand per minute offline, capped at 1440 mins = 24 hrs)
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
      capped,
      gainedAether,
      chronoEarned,
      gardenHarvests: garden.harvests
    };
  }
}
