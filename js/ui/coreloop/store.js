// The core loop's save, under its own key so the current game's save is never touched while the
// loop is behind the ?loop=2 flag. `storage` is localStorage in the page, a stand-in in tests.
import { createCoreLoopState, serializeCoreLoop, deserializeCoreLoop } from '../../systems/coreloop/state.js';

export const CORE_LOOP_SAVE_KEY = 'AETHERIA_CORELOOP_SAVE_V1';

// { state, savedAt, fresh }: a new state (seeded from the clock) when there is no save or it is
// unreadable. savedAt is the wall-clock ms of the last save, null for a fresh state.
export function loadCoreLoop(storage, now = Date.now()) {
  let raw = null;
  try { raw = storage?.getItem(CORE_LOOP_SAVE_KEY) ?? null; } catch { raw = null; }
  if (raw) {
    try {
      const data = JSON.parse(raw);
      if (data && typeof data === 'object' && data.state) {
        const savedAt = Number.isFinite(data.savedAt) ? data.savedAt : null;
        return { state: deserializeCoreLoop(data.state), savedAt, fresh: false };
      }
    } catch { /* unreadable: start fresh, keep the bad copy */ }
    try { storage.setItem(CORE_LOOP_SAVE_KEY + '_BAD', raw); } catch { /* full or blocked */ }
  }
  return { state: createCoreLoopState(now % 2147483647 || 1), savedAt: null, fresh: true };
}

export function saveCoreLoop(storage, state, now = Date.now()) {
  try {
    storage?.setItem(CORE_LOOP_SAVE_KEY, JSON.stringify({ savedAt: now, state: serializeCoreLoop(state) }));
    return true;
  } catch { return false; }
}

// Seconds the game was closed (0 for a fresh state or a clock that went backwards)
export const secondsAway = (savedAt, now = Date.now()) =>
  (Number.isFinite(savedAt) && now > savedAt ? (now - savedAt) / 1000 : 0);

// The flag: ?loop=2 turns the core loop on
export const coreLoopFlag = (search) => new URLSearchParams(search || '').get('loop') === '2';
