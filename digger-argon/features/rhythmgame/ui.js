// Dig feature (page side): The Pre-Gate "Gate Rhythm Climax" Mini-Game.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { CELL, yOf, W, H } from '../../ui/render.js';
import { sfx, tone, noise, gap, pent, wob } from '../../ui/audio.js';
import {
  RHYTHM_DURATION_SEC,
  rhythmDifficulty,
  rhythmGenerateSchedule,
  rhythmCanPlay,
  rhythmFinish,
  rhythmMult,
} from './rules.js';

const { t } = G;

let activeSession = null;

ui({
  id: 'rhythmgame',
  css: new URL('./rhythmgame.css', import.meta.url).href,
  sfx: {
    // Subtle acoustic metronome tick
    rhythmBeat(type = 'dum') {
      if (!gap('rhythmtick', 0.07)) return;
      if (type === 'dum') {
        tone(146.8 * wob(), { type: 'sine', d: 0.04, vol: 0.12 });
        noise({ d: 0.02, vol: 0.04, from: 1200, to: 400, type: 'bandpass' });
      } else {
        tone(587.33 * wob(), { type: 'triangle', d: 0.03, vol: 0.09 });
        noise({ d: 0.02, vol: 0.05, from: 2400, to: 1000, type: 'bandpass' });
      }
    },

    // Strong Beat ("Dum" / Bass Accent): deep resonant modal sub-bass thump
    rhythmDum(rating = 'perfect') {
      const volMult = rating === 'perfect' ? 1.0 : rating === 'great' ? 0.8 : 0.6;
      // Fundamental D2 sub-bass punch with pitch-envelope drop
      tone(146.8, { type: 'sine', a: 0.003, d: 0.28, vol: 0.42 * volMult, slide: 36.7 });
      // Modal warm body resonance
      tone(73.4, { type: 'sine', a: 0.005, d: 0.32, vol: 0.35 * volMult });
      tone(293.66, { type: 'triangle', a: 0.002, d: 0.18, vol: 0.20 * volMult });
      // Low-end acoustic punch transient
      noise({ d: 0.06, vol: 0.18 * volMult, from: 1600, to: 300, type: 'bandpass' });
    },

    // Snare / Rim Beat ("Tak" / Syncopated Accent): crisp metallic/ceramic rim chime
    rhythmTak(rating = 'perfect') {
      const volMult = rating === 'perfect' ? 1.0 : rating === 'great' ? 0.8 : 0.6;
      // High harmonic D5 + A5 crisp resonant ring
      tone(587.33, { type: 'triangle', a: 0.002, d: 0.24, vol: 0.32 * volMult });
      tone(880, { type: 'sine', a: 0.003, d: 0.28, vol: 0.26 * volMult, at: 0.01 });
      tone(1174.66, { type: 'sine', a: 0.002, d: 0.18, vol: 0.18 * volMult, at: 0.02 });
      // Crisp snappy rim click transient
      noise({ d: 0.04, vol: 0.22 * volMult, from: 3800, to: 1200, type: 'bandpass' });
    },

    rhythmMiss() {
      if (!gap('rhythmmiss', 0.1)) return;
      tone(85, { type: 'sine', a: 0.005, d: 0.12, vol: 0.16, slide: 40 });
    },

    rhythmVictory() {
      [293.66, 392, 440, 587.33, 880].forEach((f, i) => {
        tone(f, { type: 'triangle', a: 0.005, d: 0.4, vol: 0.22, at: i * 0.08 });
      });
      tone(146.8, { type: 'sine', a: 0.005, d: 0.5, vol: 0.35, slide: 36.7 });
    },
  },

  mount(app) {
    const stage = document.getElementById('stage');
    if (!stage) return;

    // Shrine prompt button that appears on the stage when approaching a Gate
    const btn = document.createElement('button');
    btn.id = 'rhythm-shrine-btn';
    btn.type = 'button';
    btn.hidden = true;
    btn.innerHTML = `<span class="rhythm-icon">&#9835;</span><span class="rhythm-txt">${t('rhythm_prompt_btn')}</span>`;
    btn.addEventListener('click', () => {
      app.unlockAudio();
      const b = G.bossInView(app.state);
      if (b && rhythmCanPlay(app.state, b.row)) {
        startRhythmGame(app.state, app, b.row);
      }
    });
    stage.appendChild(btn);

    // Active surge indicator badge placed on boss bar when multiplier is armed
    const badge = document.createElement('div');
    badge.id = 'rhythm-active-badge';
    badge.hidden = true;
    stage.appendChild(badge);
  },

  tick(s, app) {
    const btn = document.getElementById('rhythm-shrine-btn');
    const badge = document.getElementById('rhythm-active-badge');
    const b = G.bossInView(s);

    // Update active surge badge
    const mult = rhythmMult(s);
    if (badge) {
      if (b && b.hp > 0 && mult > 1) {
        badge.hidden = false;
        badge.textContent = t('rhythm_surge_active', { n: mult });
        const y = Math.max(120, yOf(b.row) - 18);
        badge.style.top = `${(y / H) * 100}%`;
      } else {
        badge.hidden = true;
      }
    }

    // Update shrine prompt button visibility
    if (btn) {
      if (activeSession) {
        btn.hidden = true;
        return;
      }
      const canPlay = b && b.hp > 0 && rhythmCanPlay(s, b.row);
      if (canPlay) {
        btn.hidden = false;
        const y = Math.max(130, yOf(b.row) - 34);
        btn.style.top = `${(y / H) * 100}%`;
        btn.style.left = '50%';
      } else {
        btn.hidden = true;
      }
    }
  },
});

export function startRhythmGame(s, app, floor) {
  if (activeSession) return;
  app.unlockAudio();

  const diff = rhythmDifficulty(s, floor);
  const beats = rhythmGenerateSchedule(diff.bpm, diff.bars, RHYTHM_DURATION_SEC);

  const familyTitle = t(diff.familyTitleKey) || diff.familyName;
  const stepTime = 15 / diff.bpm;
  const barDuration = 16 * stepTime; // Duration of one 16-step bar in seconds

  const phraseKeys = ['groove', 'syncopation', 'roll', 'climax'];

  // Focus mode overlay
  const overlay = document.createElement('div');
  overlay.className = 'rhythm-overlay';
  overlay.innerHTML = `
    <div class="rhythm-modal" role="dialog" aria-modal="true" aria-label="${t('rhythm_title')}">
      <div class="rhythm-header">
        <div class="rhythm-title-wrap">
          <h2>&#9835; ${t('rhythm_title')}</h2>
          <p>${t('rhythm_sub')}</p>
        </div>
        <div class="rhythm-header-badges">
          <div class="rhythm-family-badge">${familyTitle}</div>
          <div class="rhythm-bpm-badge">${t('rhythm_bpm', { n: diff.bpm })}</div>
        </div>
      </div>
      <div class="rhythm-timer-bar">
        <div class="rhythm-timer-fill" id="rhythm-timer-fill"></div>
      </div>
      <div class="rhythm-phrase-bar" id="rhythm-phrase-bar">
        <div class="rhythm-phrase-steps">
          <span class="rhythm-phrase-step active" data-bar="1">1</span>
          <span class="rhythm-phrase-step" data-bar="2">2</span>
          <span class="rhythm-phrase-step" data-bar="3">3</span>
          <span class="rhythm-phrase-step" data-bar="4">4</span>
        </div>
        <div class="rhythm-phrase-name" id="rhythm-phrase-name">
          ${t('rhythm_phrase_groove')}
        </div>
      </div>
      <div class="rhythm-hud">
        <div class="rhythm-combo-box">
          <span>${t('rhythm_combo')}:</span>
          <span class="rhythm-combo-val" id="rhythm-combo-val">0</span>
        </div>
        <div class="rhythm-legend">
          <span class="legend-item legend-dum"><span class="legend-dot dum-dot"></span> ${t('rhythm_type_dum')}</span>
          <span class="legend-item legend-tak"><span class="legend-dot tak-dot"></span> ${t('rhythm_type_tak')}</span>
        </div>
        <div class="rhythm-score-box">
          <span>${t('rhythm_score')}:</span>
          <span class="rhythm-score-val" id="rhythm-score-val">0</span>
        </div>
      </div>
      <div class="rhythm-track-area" id="rhythm-track-area">
        <div class="rhythm-lane-line"></div>
        <div class="rhythm-reticle" id="rhythm-reticle">
          <div class="reticle-core"></div>
        </div>
        <div id="rhythm-orbs-container"></div>
      </div>
      <div class="rhythm-controls" id="rhythm-controls-area">
        <button class="rhythm-strike-btn" id="rhythm-strike-btn" type="button">
          <span>&#9835;</span>
          <span>${t('rhythm_strike')}</span>
        </button>
        <div class="rhythm-hint">
          <kbd>SPACE</kbd>
          <span>${t('rhythm_space_hint')}</span>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const trackArea = overlay.querySelector('#rhythm-track-area');
  const orbsContainer = overlay.querySelector('#rhythm-orbs-container');
  const reticle = overlay.querySelector('#rhythm-reticle');
  const strikeBtn = overlay.querySelector('#rhythm-strike-btn');
  const timerFill = overlay.querySelector('#rhythm-timer-fill');
  const comboEl = overlay.querySelector('#rhythm-combo-val');
  const scoreEl = overlay.querySelector('#rhythm-score-val');
  const controlsArea = overlay.querySelector('#rhythm-controls-area');
  const phraseNameEl = overlay.querySelector('#rhythm-phrase-name');
  const stepEls = overlay.querySelectorAll('.rhythm-phrase-step');

  const RETICLE_X = 64; // px from left
  const SPEED_PX_PER_SEC = 280; // horizontal travel speed
  const startTime = performance.now();

  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let perfects = 0;
  let greats = 0;
  let goods = 0;
  let misses = 0;
  let isDone = false;
  let lastMetronomeBeat = -1;
  let currentActiveBar = 1;

  // DOM pool of orb elements with distinct Dum vs Tak styling
  const orbEls = beats.map(b => {
    const el = document.createElement('div');
    const isTak = b.type === 'tak';
    el.className = `rhythm-orb ${isTak ? 'rhythm-orb-tak' : 'rhythm-orb-dum'}`;
    el.innerHTML = `<span class="orb-glyph">${isTak ? 'T' : 'D'}</span>`;
    el.style.left = '-100px';
    orbsContainer.appendChild(el);
    return { data: b, el, dead: false };
  });

  function triggerReticleRipple() {
    reticle.classList.remove('reticle-press');
    void reticle.offsetWidth; // retrigger reflow
    reticle.classList.add('reticle-press');
  }

  function showRating(text, type) {
    const pop = document.createElement('div');
    pop.className = `rhythm-rating-popup rating-${type}`;
    pop.textContent = text;
    trackArea.appendChild(pop);
    setTimeout(() => pop.remove(), 500);

    if (type !== 'miss') {
      reticle.classList.add('reticle-hit');
      setTimeout(() => reticle.classList.remove('reticle-hit'), 120);
    }
  }

  function handleHit() {
    if (isDone) return;
    triggerReticleRipple();
    const nowSec = (performance.now() - startTime) / 1000;

    // Find nearest unhit beat
    let best = null;
    let minDelta = Infinity;

    for (const b of orbEls) {
      if (b.dead || b.data.hit) continue;
      const delta = Math.abs(b.data.time - nowSec);
      if (delta < minDelta) {
        minDelta = delta;
        best = b;
      }
    }

    if (best && minDelta <= 0.17) {
      best.data.hit = true;
      best.dead = true;
      best.el.remove();

      let ratingStr = 'good';
      if (minDelta <= 0.055) {
        ratingStr = 'perfect';
        score += 100;
        combo++;
        perfects++;
        showRating(t('rhythm_perfect'), 'perfect');
      } else if (minDelta <= 0.11) {
        ratingStr = 'great';
        score += 70;
        combo++;
        greats++;
        showRating(t('rhythm_great'), 'great');
      } else {
        ratingStr = 'good';
        score += 40;
        goods++;
        showRating(t('rhythm_good'), 'good');
      }

      // Synthesize distinct acoustic pitches for Dum vs Tak
      if (best.data.type === 'tak') {
        sfx.rhythmTak(ratingStr);
      } else {
        sfx.rhythmDum(ratingStr);
      }

      maxCombo = Math.max(maxCombo, combo);
    } else {
      // MISS: struck when no note is present
      combo = 0;
      misses++;
      sfx.rhythmMiss();
      showRating(t('rhythm_miss'), 'miss');
    }

    comboEl.textContent = combo;
    scoreEl.textContent = score;
    comboEl.style.transform = 'scale(1.25)';
    setTimeout(() => { comboEl.style.transform = 'scale(1)'; }, 100);
  }

  // Input listeners
  const onKeyDown = e => {
    if (e.code === 'Space') {
      e.preventDefault();
      strikeBtn.classList.add('btn-active');
      handleHit();
    }
  };
  const onKeyUp = e => {
    if (e.code === 'Space') {
      strikeBtn.classList.remove('btn-active');
    }
  };
  strikeBtn.addEventListener('click', e => {
    e.preventDefault();
    handleHit();
  });
  trackArea.addEventListener('click', e => {
    e.preventDefault();
    handleHit();
  });

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  function finish() {
    if (isDone) return;
    isDone = true;
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);

    // Finalize stats and register completion in rules
    const stats = { perfects, greats, goods, misses };
    const res = rhythmFinish(s, floor, score, maxCombo, beats.length, stats, app.ev);
    sfx.rhythmVictory();

    // Render Victory / Surge Presentation Card
    const modal = overlay.querySelector('.rhythm-modal');
    trackArea.remove();
    controlsArea.remove();

    const rankLabelKey = `rhythm_rank_${res.rank.toLowerCase()}`;
    const rankTitle = t(rankLabelKey) || `${res.rank}-RANK`;

    const summaryCard = document.createElement('div');
    summaryCard.className = 'rhythm-summary';
    summaryCard.innerHTML = `
      <div class="rhythm-rank-badge">${rankTitle}</div>
      <div class="rhythm-mult-reward">
        <span>&#9835;</span>
        <span>${res.mult}x BOSS DAMAGE</span>
      </div>
      <p style="color: #ffd23f; font-weight: 700; margin: 0;">
        ${t('rhythm_summary_sub', { mult: res.mult })}
      </p>
      <div class="rhythm-stats-line">
        ${t('rhythm_stats_breakdown', { p: perfects, g: greats, gd: goods, m: misses })}
      </div>
      <div style="font-size: 14px; color: #f6ead8; font-weight: 800;">
        ${t('rhythm_score')}: ${score} · Max ${t('rhythm_combo')}: ${maxCombo}
      </div>
      <button class="rhythm-engage-btn" id="rhythm-engage-btn" type="button">
        ⚔️ ${t('rhythm_engage')}
      </button>
    `;
    modal.appendChild(summaryCard);

    summaryCard.querySelector('#rhythm-engage-btn').addEventListener('click', () => {
      app.unlockAudio();
      overlay.remove();
      activeSession = null;
      app.refresh(true);
      app.toast(t('rhythm_surge_active', { n: res.mult }), 'gold');
    });
  }

  // Animation frame loop
  function loop() {
    if (isDone) return;
    const nowSec = (performance.now() - startTime) / 1000;
    const progress = Math.min(1, nowSec / RHYTHM_DURATION_SEC);
    timerFill.style.width = `${(1 - progress) * 100}%`;

    // Multi-bar phrase progression update
    const effectiveNow = Math.max(0, nowSec - 0.6);
    const activeBarIndex = Math.min(3, Math.floor(effectiveNow / barDuration));
    const activeBarNum = activeBarIndex + 1;

    if (activeBarNum !== currentActiveBar) {
      currentActiveBar = activeBarNum;
      stepEls.forEach((el, idx) => {
        if (idx === activeBarIndex) el.classList.add('active');
        else el.classList.remove('active');
      });
      const phraseKey = phraseKeys[activeBarIndex] || 'climax';
      phraseNameEl.textContent = t(`rhythm_phrase_${phraseKey}`);
      phraseNameEl.classList.remove('phrase-bump');
      void phraseNameEl.offsetWidth;
      phraseNameEl.classList.add('phrase-bump');
    }

    // Metronome tick sound on beat boundaries
    const beatIndex = Math.floor(nowSec * (diff.bpm / 60));
    if (beatIndex > lastMetronomeBeat) {
      lastMetronomeBeat = beatIndex;
      sfx.rhythmBeat(beatIndex % 2 === 0 ? 'dum' : 'tak');
    }

    // Position orbs and check for late misses
    const trackWidth = trackArea.clientWidth || 560;
    for (const b of orbEls) {
      if (b.dead || b.data.hit) continue;
      const timeToHit = b.data.time - nowSec;
      const x = RETICLE_X + timeToHit * SPEED_PX_PER_SEC;

      if (timeToHit < -0.17) {
        // Late miss: note passed by
        b.dead = true;
        b.el.remove();
        combo = 0;
        misses++;
        sfx.rhythmMiss();
        showRating(t('rhythm_miss'), 'miss');
        comboEl.textContent = 0;
      } else if (x >= -40 && x <= trackWidth + 40) {
        b.el.style.left = `${x}px`;
      } else {
        b.el.style.left = '-100px';
      }
    }

    if (nowSec >= RHYTHM_DURATION_SEC) {
      finish();
    } else {
      requestAnimationFrame(loop);
    }
  }

  activeSession = { finish, overlay };
  requestAnimationFrame(loop);
}

// Export for test suite and programmatic triggering
export { rhythmCanPlay, rhythmDifficulty, rhythmGenerateSchedule, rhythmFinish, rhythmMult };
