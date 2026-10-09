// New Well / New Field ceremonies (R45, docs/game-feel-opportunities.md §3 item 5; game-feel
// guide P2 (T3), P4, P8). Replaces the browser confirm() with an in-game sheet that shows the
// exact trade, a hold-to-confirm button (800 ms, rising tone) and a release:
//   dim + orb sinks (400 ms) -> gusher burst (60 sparks) + "NEW WELL!" / "NEW FIELD!" callout
//   (700 ms) -> the state changes -> the reward card (2.4 s). 3.5 s in all, skippable any time.
// Reduced motion, or the "Tap to confirm" setting, makes the confirm a plain tap; reduced motion
// also drops the sink, burst and callout (the short reward card follows at once).
import { sound } from '../engine/AudioEngine.js';
import { particles } from '../engine/ParticleEngine.js';
import { isReducedMotion } from './motion.js';
import { themeVar } from './theme.js';
import { t } from '../i18n/index.js';

export const HOLD_MS = 800;
export const SINK_MS = 400;
export const CALLOUT_MS = 700;
export const BURST_SPARKS = 60;
export const KINDS = {
  well: { callout: 'pc.callout_well', color: '#f59e0b', icon: '🛢️' },
  field: { callout: 'pc.callout_field', color: '#a855f7', icon: '🌌' }
};

/** True when the confirm button needs a hold (not the setting, not reduced motion). */
export function needsHold(settings, reduced = isReducedMotion()) {
  return !reduced && !settings?.tapToConfirm;
}

const hasDom = () => typeof document !== 'undefined' && !!document.body;

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function list(items) {
  return items.length ? `<ul>${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : '';
}

let sheetOpen = false;

/**
 * The confirm sheet. spec = { kind: 'well'|'field', question, gain: [], lose: [], notes: [], settings }.
 * Resolves true on confirm, false on cancel (button, Esc, backdrop).
 */
export function confirmPrestige(spec) {
  if (!hasDom() || sheetOpen) return Promise.resolve(false);
  sheetOpen = true;
  const kind = KINDS[spec.kind] ? spec.kind : 'well';
  const hold = needsHold(spec.settings);
  const opener = document.activeElement;
  const root = document.createElement('div');
  root.className = `prestige-sheet-backdrop sig-${kind}`;
  root.innerHTML = `
    <div class="prestige-sheet" role="dialog" aria-modal="true" aria-labelledby="prestige-sheet-title">
      <h3 id="prestige-sheet-title" class="prestige-sheet-title">${KINDS[kind].icon} ${esc(spec.question)}</h3>
      ${spec.gain?.length ? `<div class="prestige-sheet-h gain">${esc(t('tr.gain'))}</div>${list(spec.gain)}` : ''}
      ${spec.lose?.length ? `<div class="prestige-sheet-h lose">${esc(t('tr.lose'))}</div>${list(spec.lose)}` : ''}
      ${(spec.notes || []).map(n => `<p class="prestige-sheet-note">${esc(n)}</p>`).join('')}
      <div class="prestige-sheet-actions">
        <button type="button" class="btn-action prestige-sheet-cancel">${esc(t('pc.cancel'))}</button>
        <button type="button" class="btn-action prestige-sheet-go${hold ? ' is-hold' : ''}">
          <span class="prestige-sheet-fill"></span>
          <span class="prestige-sheet-label">${esc(t(hold ? 'pc.hold' : 'pc.tap'))}</span>
        </button>
      </div>
    </div>`;
  document.body.appendChild(root);
  const go = root.querySelector('.prestige-sheet-go');
  const cancel = root.querySelector('.prestige-sheet-cancel');
  const fill = root.querySelector('.prestige-sheet-fill');

  return new Promise((resolve) => {
    let timer = null;
    let stopTone = null;
    let done = false;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(false); return; }
      if (!hold || document.activeElement !== go || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      if (!e.repeat) press();
    };
    function close(result) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (!result) stopTone?.();
      document.removeEventListener('keydown', onKey, true);
      root.remove();
      sheetOpen = false;
      if (!result && opener?.focus) opener.focus();
      resolve(result);
    }
    function release() {   // let go early: the build-up falls away
      if (timer === null) return;
      clearTimeout(timer);
      timer = null;
      stopTone?.();
      stopTone = null;
      go.classList.remove('is-holding');
      fill.style.transitionDuration = '0.15s';
    }
    function press() {
      if (done || timer !== null) return;
      go.classList.add('is-holding');
      fill.style.transitionDuration = `${HOLD_MS}ms`;
      stopTone = sound.playAscension?.() || null;
      timer = setTimeout(() => { timer = null; close(true); }, HOLD_MS);
    }
    document.addEventListener('keydown', onKey, true);
    go.addEventListener('keyup', (e) => { if (hold && (e.key === 'Enter' || e.key === ' ')) release(); });
    if (hold) {
      go.addEventListener('pointerdown', (e) => { if (e.button === 0 || e.pointerType !== 'mouse') press(); });
      for (const ev of ['pointerup', 'pointerleave', 'pointercancel', 'blur']) go.addEventListener(ev, release);
      go.addEventListener('contextmenu', (e) => e.preventDefault());
    } else {
      go.addEventListener('click', () => close(true));
    }
    cancel.addEventListener('click', () => close(false));
    root.addEventListener('click', (e) => { if (e.target === root) close(false); });
    go.focus();
  });
}

/**
 * The release. `commit()` changes the game state (and queues the reward card); it runs exactly
 * once: after the sink and callout, at once when the player skips (click or Esc), or at once when
 * motion is reduced. `origin` is the element the burst leaves from when the orb is off screen.
 */
export function playRelease(kind, commit, origin = null, { reduced = isReducedMotion() } = {}) {
  const spec = KINDS[kind] || KINDS.well;
  if (!hasDom() || reduced) { commit(); return { skip() {} }; }

  const orb = document.getElementById('monolith-orb');
  const orbShown = !!orb?.offsetParent;
  const src = orbShown ? orb : origin;
  const stage = document.createElement('div');
  stage.className = `prestige-stage sig-${kind}`;
  stage.setAttribute('role', 'alert');
  stage.style.setProperty('--stage-accent', themeVar(spec.color));
  document.body.appendChild(stage);
  if (orbShown) orb.classList.add('is-sinking');

  let committed = false;
  const timers = [];
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); finish(); } };
  function finish() {
    if (committed) return;
    committed = true;
    timers.forEach(clearTimeout);
    document.removeEventListener('keydown', onKey, true);
    stage.remove();
    orb?.classList.remove('is-sinking');
    commit();
  }
  document.addEventListener('keydown', onKey, true);
  stage.addEventListener('click', finish);

  timers.push(setTimeout(() => {
    if (src?.getBoundingClientRect) {
      const r = src.getBoundingClientRect();
      particles.spawnRingBurst(r.left + r.width / 2, r.top + r.height / 2, BURST_SPARKS, spec.color);
    }
    const call = document.createElement('div');
    call.className = 'prestige-callout';
    call.textContent = t(spec.callout);
    stage.appendChild(call);
  }, SINK_MS));
  timers.push(setTimeout(finish, SINK_MS + CALLOUT_MS));
  return { skip: finish };
}

/** Sheet, then release. Resolves true when the player went through with it. */
export async function runPrestige(spec, commit, origin) {
  if (!(await confirmPrestige(spec))) return false;
  playRelease(spec.kind, commit, origin);
  return true;
}

// Settings: "Tap to confirm" (R45). One checkbox under Reduce Motion.
export function renderConfirmSettings(container, settings, onChange) {
  if (!container) return;
  container.innerHTML = `
    <label class="settings-option">
      <input type="checkbox" name="tapToConfirm" ${settings.tapToConfirm ? 'checked' : ''}>
      <span>${esc(t('pc.setting_label'))}</span>
    </label>`;
  container.addEventListener('change', (e) => {
    if (e.target.name !== 'tapToConfirm') return;
    settings.tapToConfirm = !!e.target.checked;
    onChange?.();
  });
}
