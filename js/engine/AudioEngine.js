
// Procedural Web Audio API Sound Engine
// Generates dynamic audio without any external assets or file dependencies

export const SCALES = {
  pentatonic: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25], // C Major Pentatonic
  hijaz: [277.18, 293.66, 329.63, 392.00, 415.30, 554.37], // Hijaz / Desert scale
  mystic: [261.63, 277.18, 329.63, 349.23, 415.30, 523.25], // Byzantine / Mystic
  lofi: [220.00, 261.63, 293.66, 329.63, 392.00, 440.00], // A Minor Pentatonic
  boss: [130.81, 138.59, 155.56, 174.61, 185.00, 207.65] // Dark / Deep
};

// Find family: note offsets into the scale and the extras per rarity
const GEM_VOICES = {
  common: { offsets: [0, 3] },
  rare: { offsets: [0, 2, 4] },
  epic: { offsets: [0, 1, 3, 5], shimmer: true },
  legendary: { offsets: [0, 1, 3, 5], bell: true }
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.quiet = false; // Fast Forward: hush per-hit sounds while a warp is simulated
    this.volume = 0.25;
    this.initialized = false;
    this.rhythmScale = 'hijaz';
    this.noteIndex = 0;
  }

  init() {
    if (this.initialized) return;
    try {
      if (typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
          this.masterGain.connect(this.ctx.destination);
          this.initialized = true;
        }
      }
    } catch (e) {
      console.warn('Web Audio not supported or blocked:', e);
    }
  }

  ensureContext() {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.muted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  setRhythmScale(scaleName) {
    if (SCALES[scaleName]) {
      this.rhythmScale = scaleName;
    }
  }

  getNextFreq() {
    const scale = SCALES[this.rhythmScale] || SCALES.hijaz;
    const freq = scale[this.noteIndex % scale.length];
    this.noteIndex++;
    return freq;
  }

  // Sound: Normal Click (Melodic)
  playClick(pitchMod = 1) {
    if (this.muted || this.quiet) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    const baseFreq = this.getNextFreq();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq * pitchMod, t);
    osc.frequency.exponentialRampToValueAtTime((baseFreq / 4) * pitchMod, t + 0.08);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  // Sound: Critical Click / Golden Clover
  playCrit() {
    if (this.muted || this.quiet) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const baseFreq = this.getNextFreq() * 1.5;
    [baseFreq, baseFreq * 1.25, baseFreq * 1.5].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.03);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + idx * 0.03 + 0.15);

      gain.gain.setValueAtTime(0.3, t + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.03 + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + idx * 0.03);
      osc.stop(t + idx * 0.03 + 0.15);
    });
  }

  // Sound: Building Purchase / Upgrade
  playBuy() {
    if (this.muted || this.quiet) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const baseFreq = this.getNextFreq();
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 2, t + 0.1);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  // Sound: Combat Attack / Hit (Bassline Rhythm)
  playHit() {
    if (this.muted || this.quiet) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const baseFreq = this.getNextFreq() / 2;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq / 4, t + 0.07);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  // Sound: Monster Defeated / Victory
  playDefeat() {
    if (this.muted || this.quiet) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    const baseFreq = this.getNextFreq();
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq / 4, t + 0.25);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  // Sound: Mining Dig (Deep Rhythm)
  playDig() {
    if (this.muted || this.quiet) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    const baseFreq = this.getNextFreq() / 2.5;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq / 2.5, t + 0.06);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.06);
  }

  // Sound: Subterranean Bomb / Massive Explosion
  playExplosion() {
    if (this.muted || this.quiet) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.4);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.4);
  }

  // Sound: Chain Lightning / Arc Conduction
  playLightning() {
    if (this.muted || this.quiet) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [0, 0.04, 0.08].forEach((delay) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800 + Math.random() * 400, t + delay);
      osc.frequency.exponentialRampToValueAtTime(150, t + delay + 0.06);

      gain.gain.setValueAtTime(0.25, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.06);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + delay);
      osc.stop(t + delay + 0.06);
    });
  }

  // Sound: Block Shatter / Fracture
  playShatter() {
    if (this.muted || this.quiet) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [1200, 1600, 2200].forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.12);
    });
  }

  // Sound: Excavation Frenzy Digging Rush
  playFrenzyTrigger() {
    if (this.muted || this.quiet) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [300, 500, 750, 1100].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.04);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + idx * 0.04 + 0.1);

      gain.gain.setValueAtTime(0.3, t + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + idx * 0.04);
      osc.stop(t + idx * 0.04 + 0.12);
    });
  }

  // Sound: Find (R46). Rarity sets how rich it is: common 2 notes, rare 3, epic 4 + shimmer,
  // legendary 4 + a bell partial. Unknown rarities sound like common.
  playGem(rarity = 'common') {
    if (this.muted || this.quiet) return;
    this.ensureContext();
    if (!this.ctx) return;

    const spec = GEM_VOICES[rarity] || GEM_VOICES.common;
    const t = this.ctx.currentTime;
    const scale = SCALES[this.rhythmScale] || SCALES.hijaz;

    spec.offsets.forEach((offset, i) => {
      const at = t + i * 0.05;
      this._voice('sine', scale[(this.noteIndex + offset) % scale.length] * 2, at, 0.2, 0.25);
    });
    const top = scale[(this.noteIndex + spec.offsets[spec.offsets.length - 1]) % scale.length] * 2;
    const end = t + (spec.offsets.length - 1) * 0.05;
    if (spec.shimmer) {   // two detuned high partials that beat against each other
      this._voice('triangle', top * 2, end, 0.5, 0.09);
      this._voice('triangle', top * 2 * 1.007, end, 0.5, 0.09);
    }
    if (spec.bell) this._voice('sine', top * 2.76, end, 0.7, 0.1);   // inharmonic bell partial
    this.noteIndex += spec.offsets.length;
  }

  // Sound: Collect / claim (R46): 3 short bright plucks, each detuned by up to +-15 cents so
  // repeated claims do not sound mechanical.
  playCoins() {
    if (this.muted || this.quiet) return;
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const s = this._scale();
    [s[2], s[4], s[0] * 2].forEach((f, i) => {
      const cents = (Math.random() * 2 - 1) * 15;
      this._voice('triangle', f * 2 * Math.pow(2, cents / 1200), t + i * 0.055, 0.14, 0.22);
    });
  }

  // Sound: Boom (R46): a noise burst over a falling low sine, about 250 ms.
  playBlast() {
    if (this.muted || this.quiet) return;
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * 0.25));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.35, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    noise.connect(ng);
    ng.connect(this.masterGain);
    noise.start(t);

    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.25);
    og.gain.setValueAtTime(0.5, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(og);
    og.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  playGemRare() { this.playGem('rare'); }
  playGemEpic() { this.playGem('epic'); }
  playGemLegendary() { this.playGem('legendary'); }

  // Sound: Cast. `interval` is a frequency ratio (SPELL_INTERVALS) so each spell has its own pitch.
  playSpell(interval = 1) {
    if (this.muted || this.quiet) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const baseFreq = (SCALES[this.rhythmScale] || SCALES.hijaz)[0] * (Number(interval) > 0 ? Number(interval) : 1);
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 4, t + 0.25);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  // Sound: Achievement Fanfare
  playAchievement() {
    if (this.muted || this.quiet) return;
    this.ensureContext();
    if (!this.ctx) return;

    const scale = SCALES[this.rhythmScale] || SCALES.hijaz;
    const chords = [
      scale[0 % scale.length],
      scale[2 % scale.length] * 1.5,
      scale[4 % scale.length] * 2,
      scale[5 % scale.length] * 2
    ];
    const t = this.ctx.currentTime;

    chords.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);

      gain.gain.setValueAtTime(0.3, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.35);
    });
  }

  // Sound: Ascension / Cosmic Shift
  playAscension() {
    if (this.muted || this.quiet) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    const baseFreq = this.getNextFreq() / 2;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 10, t + 0.8);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 2, t + 1.6);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.6);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 1.6);
  }

  // ---- Reward tiers (redesign §5.1): small = pluck, medium = bell, big = brass, epic = choir.
  // All built from the selected rhythm scale, so they follow the player's Settings choice.

  // One enveloped voice. attack/release in seconds; detune in cents; vibrato as a pitch fraction.
  _voice(type, freq, start, dur, peak, { attack = 0.005, detune = 0, vibrato = 0 } = {}) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (detune) osc.detune.setValueAtTime(detune, start);
    if (vibrato) {
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(5.5, start);
      lfoGain.gain.setValueAtTime(freq * vibrato, start);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(start);
      lfo.stop(start + dur);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  _scale() {
    return SCALES[this.rhythmScale] || SCALES.hijaz;
  }

  // Small: a short pluck
  playPluck() {
    if (this.muted || this.quiet) return;
    this.ensureContext();
    if (!this.ctx) return;
    this._voice('triangle', this._scale()[3] * 2, this.ctx.currentTime, 0.12, 0.2);
  }

  // Medium: 3-note bell arpeggio (sine + an inharmonic partial)
  playBell() {
    if (this.muted || this.quiet) return;
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const s = this._scale();
    [s[0], s[2], s[4]].forEach((f, i) => {
      const at = t + i * 0.09;
      this._voice('sine', f * 2, at, 0.6, 0.22);
      this._voice('sine', f * 2 * 2.76, at, 0.25, 0.05);
    });
  }

  // Big: brass fanfare, short-short-short-long
  playBrass() {
    if (this.muted || this.quiet) return;
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const s = this._scale();
    const notes = [[s[0], 0, 0.14], [s[0], 0.16, 0.14], [s[2], 0.32, 0.14], [s[4], 0.48, 0.7]];
    for (const [f, off, dur] of notes) {
      this._voice('sawtooth', f, t + off, dur, 0.12, { attack: 0.03 });
      this._voice('square', f / 2, t + off, dur, 0.06, { attack: 0.03 });
    }
  }

  // Epic: choir pad (detuned voices with vibrato, slow swell) under a rising motif
  playChoir() {
    if (this.muted || this.quiet) return;
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const s = this._scale();
    for (const f of [s[0], s[2], s[4], s[0] * 2]) {
      for (const d of [-9, 0, 9]) {
        this._voice('sine', f, t, 2.6, 0.06, { attack: 0.6, detune: d, vibrato: 0.006 });
      }
    }
    [s[0], s[2], s[4], s[5]].forEach((f, i) => {
      this._voice('triangle', f * 2, t + 0.5 + i * 0.22, 0.5, 0.12, { attack: 0.02 });
    });
  }

  // Boss/Warden down (R42): a low thud as the hit-stop ends (sine 80 -> 40 Hz, 120 ms), then the
  // last two notes of the brass phrase
  playBossDown() {
    if (this.muted || this.quiet) return;
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.09;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.13);
    const s = this._scale();
    for (const [f, off, dur] of [[s[2], 0.14, 0.14], [s[4], 0.3, 0.6]]) {
      this._voice('sawtooth', f, t + off, dur, 0.12, { attack: 0.03 });
      this._voice('square', f / 2, t + off, dur, 0.06, { attack: 0.03 });
    }
  }

  // Enrage countdown tick (R42): a short, quiet pluck, once a second for the last 10 s
  playTick() {
    if (this.muted || this.quiet) return;
    this.ensureContext();
    if (!this.ctx) return;
    this._voice('triangle', this._scale()[0] * 2, this.ctx.currentTime, 0.08, 0.06);
  }

  // Boss telegraph wind-up (R65): two low square pulses, a warning that is not a hit
  playWarn() {
    if (this.muted || this.quiet) return;
    this.ensureContext();
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    this._voice('square', 196, t0, 0.12, 0.05);
    this._voice('square', 196, t0 + 0.2, 0.12, 0.05);
  }

  // A telegraph answered / a Wasta Strike: a bright rising two-note chime
  playCounter() {
    if (this.muted || this.quiet) return;
    this.ensureContext();
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    this._voice('triangle', 660, t0, 0.1, 0.08);
    this._voice('triangle', 990, t0 + 0.08, 0.16, 0.08);
  }

  // One entry point for the reward system (js/ui/rewards.js)
  playTier(tier) {
    if (tier === 'small') this.playPluck();
    else if (tier === 'medium') this.playBell();
    else if (tier === 'big') this.playBrass();
    else if (tier === 'epic') this.playChoir();
  }

  // One entry point for the feedback helper (js/ui/feedback.js): a sound id from SOUND_IDS.
  // Returns false for an unknown id. Mute, volume and Fast Forward are checked by each voice.
  play(id, pitchMod) {
    const method = SOUND_IDS[id];
    if (!method) return false;
    this[method](pitchMod);
    return true;
  }
}

// Frequency ratios for the Cast family: root, fourth, fifth, octave
export const SPELL_INTERVALS = { root: 1, fourth: 4 / 3, fifth: 3 / 2, octave: 2 };
// Which interval each spell and hero skill plays (anything else plays the root)
export const SPELL_INTERVAL_BY_ID = {
  aether_burst: SPELL_INTERVALS.root, midas_touch: SPELL_INTERVALS.fourth,
  celestial_alignment: SPELL_INTERVALS.fifth, chrono_warp: SPELL_INTERVALS.fifth,
  astral_refresh: SPELL_INTERVALS.octave
};

// Sound ids the feedback helper accepts (R41)
export const SOUND_IDS = {
  click: 'playClick', crit: 'playCrit', buy: 'playBuy', coins: 'playCoins', blast: 'playBlast', hit: 'playHit', defeat: 'playDefeat',
  dig: 'playDig', gem: 'playGem', 'gem-rare': 'playGemRare', 'gem-epic': 'playGemEpic', 'gem-legendary': 'playGemLegendary', spell: 'playSpell', achievement: 'playAchievement',
  ascension: 'playAscension', pluck: 'playPluck', bell: 'playBell', brass: 'playBrass',
  choir: 'playChoir', 'boss-down': 'playBossDown', tick: 'playTick', warn: 'playWarn', counter: 'playCounter'
};

export const sound = new AudioEngine();

