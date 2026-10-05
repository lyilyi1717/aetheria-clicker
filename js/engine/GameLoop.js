// High-stability Game Loop with background tab tick fallback

export class GameLoop {
  constructor(onUpdate, onFastUpdate, onAutoSave) {
    this.onUpdate = onUpdate; // Main game logic tick (~20 ticks/sec)
    this.onFastUpdate = onFastUpdate; // UI / Render animation tick (~60 fps)
    this.onAutoSave = onAutoSave;

    this.isRunning = false;
    this.lastTime = performance.now();
    this.lastSimTime = performance.now();
    this.lastSaveCheck = performance.now();

    this.simIntervalMs = 50; // 20 updates per second
    this.autoSaveIntervalMs = 10000; // 10 seconds

    this.timeScale = 1.0; // Dynamic speed multiplier (from spells / chrono warp)
  }

  start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.lastSimTime = performance.now();
    this.lastSaveCheck = performance.now();

    // Standard Animation Frame Loop for 60fps UI
    const frame = (time) => {
      if (!this.isRunning) return;
      const dt = Math.min(0.5, (time - this.lastTime) / 1000);
      this.lastTime = time;

      if (this.onFastUpdate) {
        this.onFastUpdate(dt);
      }

      // Check fixed simulation steps
      const simDt = (time - this.lastSimTime) / 1000;
      if (simDt >= this.simIntervalMs / 1000) {
        const realDt = Math.min(1.0, simDt);
        if (this.onUpdate) {
          this.onUpdate(realDt * this.timeScale, realDt);
        }
        this.lastSimTime = time;
      }

      // Check auto-save
      if (time - this.lastSaveCheck >= this.autoSaveIntervalMs) {
        if (this.onAutoSave) {
          this.onAutoSave();
        }
        this.lastSaveCheck = time;
      }

      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);

    // Background interval fallback: Browsers throttle requestAnimationFrame to 0.5-1fps in background
    setInterval(() => {
      const now = performance.now();
      const elapsed = (now - this.lastSimTime) / 1000;
      if (elapsed >= 0.2) { // Tab was in background or frame skipped
        const safeElapsed = Math.min(5.0, elapsed);
        if (this.onUpdate) {
          this.onUpdate(safeElapsed * this.timeScale, safeElapsed);
        }
        this.lastSimTime = now;
      }
      // Autosave here too: requestAnimationFrame is paused in hidden tabs
      if (now - this.lastSaveCheck >= this.autoSaveIntervalMs) {
        if (this.onAutoSave) this.onAutoSave();
        this.lastSaveCheck = now;
      }
    }, 200);
  }

  stop() {
    this.isRunning = false;
  }
}
