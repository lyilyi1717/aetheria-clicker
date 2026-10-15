# Game Audio & Rhythm Systems Design Guideline
**Aetheria / Dig: Sound Architecture, Musical Scales & Rhythmic Flow**
*Owner: Lead Audio & Rhythm Systems Architect (Argon)*
*Date: October 2026 | Version 1.0*

---

## 1. Executive Summary & Audit of Audio Defects

A browser clicker/digger lives or dies by its auditory feedback loop. Players execute hundreds of clicks per minute and listen for hours. Any audio effect that is harsh, dissonant, or rhythmically unquantized transforms from satisfying feedback into neural fatigue and auditory irritation.

### 1.1 The "Boom Pick" Audit
The **Boom Pick** relic (`relics.boom`, exploding every 12th, 9th, or 6th hit) historically sounded abrasive and rhythmically jarring to human ears. Our audit identified four root causes:
1. **Desynchronized Triggering (Lack of Grid Quantization):**
   - The pick rhythm runs on a strict 16-step bar at tempos between 100 and 160 BPM (`picks/beat.js`).
   - The Boom Pick was triggered via `later(s, 0.05, 'blast')`. Because `'blast'` was missing from the mixer's quantization array (`picks.back`), the explosion fired asynchronously in free time—cutting awkwardly across sixteenth-note boundaries like a stumbled step.
2. **Aggressive Sawtooth Waveform & Frequency Clashing:**
   - The legacy `blast` sound employed a raw `sawtooth` oscillator at 120 Hz ramping down to 30 Hz with high volume (`vol: 0.3`).
   - Sawtooth waves produce harsh even and odd harmonics that sound like an abrasive electrical buzz rather than an acoustic blast. Furthermore, 120 Hz is a microtonal clash against the game's D-minor / Bayati tonal root (D2 = 73.4 Hz, A2 = 110 Hz, D3 = 146.8 Hz).
3. **Ear-Fatiguing High White Noise Transients:**
   - The noise component swept from 8,000 Hz down to 60 Hz at high gain (`vol: 0.6`) for 0.6 seconds.
   - Frequencies above 4,000 Hz with slow exponential decay cause rapid listener fatigue (acoustic reflex exhaustion). When explosions proc every few seconds, the high-frequency hiss overwhelms the mix.
4. **Volume Stacking Mud:**
   - A 600 ms explosion duration when hits occur every 80–120 ms caused multiple blasts to overlap, flooding the audio buffer and causing clipping and muddy low-end build-up.

### 1.2 The "Boomerang" Audit
The **Boomerang** relic (`relics2.rang`) suffered from:
1. **Raw Unpitched Noise Sweep:**
   - Using a generic `noise({ from: 500, to: 2600, type: 'bandpass' })` lacked any melodic resonance or sense of rotating aerodynamic flight.
2. **Missing Out-and-Return Acoustic Contour:**
   - A real boomerang carves through the air with a rising Doppler whistle as it leaves and a falling resonant hum as it loops back. The flat noise burst gave no spatial or kinetic satisfaction.

---

## 2. Harmonic Scale & Tonal Architecture

All synthesized tones in Aetheria/Dig must adhere to a unified modal harmonic palette rooted in the Arabian and Silk Road desert aesthetic.

### 2.1 The Modal Key: D Minor & Maqam Bayati Resonance
The foundational root is **D** (fundamental $D_2 = 73.42\text{ Hz}$, $D_3 = 146.83\text{ Hz}$, $D_4 = 293.66\text{ Hz}$).
All tones must belong to or resonate harmonically with the **Pentatonic Minor / Maqam Bayati** scale:

| Scale Degree | Note | Interval from D | Pitch Multiplier ($2^{n/12}$) | Frequency ($D_3 = 146.83\text{ Hz}$) |
|---|---|---|---|---|
| **Tonic (Root)** | D | Unison | $1.0000$ | $146.83\text{ Hz}$ |
| **Neutral 2nd (Sikah)** | E half-flat ($\text{E}^\rlap{-}\flat$) / E | ~150 / 200 cents | $1.0905 / 1.1225$ | $160.12 / 164.81\text{ Hz}$ |
| **Minor 3rd** | F | Minor 3rd | $1.1892$ | $174.61\text{ Hz}$ |
| **Perfect 4th** | G | Perfect 4th | $1.3348$ | $196.00\text{ Hz}$ |
| **Fifth (Dominant)** | A | Perfect 5th | $1.4983$ | $220.00\text{ Hz}$ |
| **Minor 6th** | $\text{B}\flat$ | Minor 6th | $1.5874$ | $233.08\text{ Hz}$ |
| **Subtonic** | C | Minor 7th | $1.7818$ | $261.63\text{ Hz}$ |

### 2.2 Scale Formulas in Code
- **Pentatonic Tone Generator (`pent(n)`):**
  Uses root C/D pentatonic intervals `[0, 2, 4, 7, 9]` scaled into octaves.
- **Chain Multiplication (`pentPitch(chain)`):**
  Pitch multiplies by $2^{P/12}$ where $P \in [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]$.
- **Rule:** Never use arbitrary prime frequencies (e.g. 120 Hz, 370 Hz) without ensuring they correspond to a harmonic overtone of D ($73.4\text{ Hz} \times k$).

---

## 3. Rhythmic Architecture & Master Clock Quantization

### 3.1 The 16-Step Master Grid
The rhythmic engine divides every musical bar into **16 sixteenth-note steps**:
$$\text{stepSec} = \frac{15}{\text{BPM}}\text{ seconds}$$
$$\text{barSec} = 16 \times \text{stepSec} = \frac{240}{\text{BPM}}\text{ seconds}$$

At the base tempo of 100 BPM:
- 1 bar = 2.40 seconds.
- 1 quarter note (beat) = 0.60 seconds (4 steps).
- 1 eighth note = 0.30 seconds (2 steps).
- 1 sixteenth note (grid step) = 0.15 seconds (1 step).

### 3.2 The Scheduler and Lookahead
Audio events are scheduled against the browser's high-precision `AudioContext.currentTime` clock with a 40 ms (`look: 0.04`) lookahead window. This decouples audio rhythm from frame-rate jitter.

### 3.3 Mixer Backing Quantization (`P.back`)
Any secondary game event that sounds alongside the main pick swings—such as delayed hits, chain reactions, TNT blasts, Boom Pick explosions, and Boomerang throws—**MUST be listed in `P.back`**:
```javascript
back: ['hit', 'break', 'crit', 'coin', 'blast', 'boom', 'relics2Whoosh', 'rhythmHit']
```
When a sound is included in `P.back`, the mixer intercepts it and aligns its start time to `seq.gridAfter(now, stepNow, -1)`. This guarantees that the sound lands precisely on the next 16th-note subdivision, preserving the hypnotic rhythmic groove instead of stumbling out of pocket.

---

## 4. Synthesizer Sound Envelope & Frequency Spectrum Allocation

Every sound effect is designed in code using native Web Audio primitives (`OscillatorNode`, `BiquadFilterNode`, `GainNode`). Each frequency band has a dedicated function:

```
+-----------------------------------------------------------------------+
|  FREQUENCY SPECTRUM ALLOCATION                                        |
|  [20 Hz - 90 Hz]      Sub-Bass Thud: Kick, Taiko Doom, Gate Climax    |
|  [100 Hz - 350 Hz]    Warm Body: Pick strikes, Darbuka Tak, Ores      |
|  [400 Hz - 1,200 Hz]  Harmonic Resonance: Bells, Coins, Combos        |
|  [1,200 Hz - 3,500 Hz]Tactile Click/Snip: Pick transients, Shimmers   |
|  [> 4,000 Hz]         Hard Cutoff / Steep Lowpass: Anti-Fatigue Zone  |
+-----------------------------------------------------------------------+
```

### 4.1 Envelope Parameters (ADSR)
1. **Transient Attack ($a$):**
   - Click/hit attacks must be ultra-fast ($0.002\text{ s} - 0.005\text{ s}$) to give instantaneous tactile impact.
   - Exponential ramps (`exponentialRampToValueAtTime`) must start at a non-zero floor ($0.0001$) to prevent audio buffer pop/click artifacts.
2. **Decay ($d$):**
   - Rapid-fire pick sounds: $0.05\text{ s} - 0.08\text{ s}$.
   - Block break & combos: $0.10\text{ s} - 0.18\text{ s}$.
   - Heavy explosions & gate events: $0.22\text{ s} - 0.35\text{ s}$ (tightened from 0.60 s to prevent mud).
3. **Anti-Fatigue Frequency Dampening:**
   - Never allow unfiltered white noise above 3,500 Hz. Always apply a `lowpass` or `bandpass` filter with $Q \le 2.0$.

---

## 5. Polyphony, Voice Stealing & Dynamic Volume Scaling

When a screen clear or rapid chain occurs, dozens of blocks break in under 200 ms. Playing all sounds at full volume destroys the speaker dynamic range and causes ear fatigue.

### 5.1 Rules for Polyphony
1. **Minimum Interval Throttle (`gap(name, duration)`):**
   - Every sound class must guard its invocation with `gap(name, minSeconds)`.
   - `hit`: 0.035 s
   - `break`: 0.030 s
   - `blast`: 0.050 s
   - `whoosh`: 0.080 s
   - `rubble`: 0.150 s
2. **Dynamic Gain Attenuation on Chaining:**
   - Multi-block reactions must scale their volume inversely with chain depth:
     $$\text{gain} = \frac{\text{baseGain}}{1 + 0.15 \times (\text{chain} - 1)}$$
   - Pitch rises pentatonically while volume dips slightly, creating an exhilarating climbing sensation without volume spikes.

---

## 6. Synthesizing the New "Boom Pick" Sound

The re-engineered Boom Pick audio (`sfx.blast` / `sfx.boomPick`) features a four-layer acoustic architecture:

1. **Sub-Bass Thump Layer (Acoustic Taiko/Darbuka Doom):**
   - Oscillator: `sine`
   - Frequency: Ramps exponentially from $146.8\text{ Hz}$ ($D_3$) down to $36.7\text{ Hz}$ ($D_1$).
   - Attack: $0.003\text{ s}$, Decay: $0.24\text{ s}$, Volume: $0.35$.
   - Delivers a deep, chest-resonating punch without acoustic rumble.
2. **Pitched Harmonic Body (Warm D-Minor Resonance):**
   - Oscillator: `triangle` (smooth odd harmonics, zero harshness).
   - Frequency: $73.4\text{ Hz} \times \text{pentPitch(chain)}$.
   - Attack: $0.004\text{ s}$, Decay: $0.18\text{ s}$, Volume: $0.20$.
   - Harmonically locks the explosion into the game's active key.
3. **Tactile Impact Transient (Snappy Rock Crack):**
   - Noise buffer with `bandpass` filter centered at $1,800\text{ Hz}$ sliding to $400\text{ Hz}$.
   - Attack: $0.002\text{ s}$, Decay: $0.06\text{ s}$, Volume: $0.18$.
   - Provides crisp tactile definition without painful high sizzle.
4. **Mixer Quantization:**
   - Added `'blast'` to `P.back` in `features/picks/rules.js` so it automatically lands on the 16th-note rhythmic grid.

---

## 7. Synthesizing the New "Boomerang" Sound

The re-engineered Boomerang audio (`sfx.relics2Whoosh`) features:

1. **Vortex Air Body:**
   - Bandpass noise sweeping smoothly from $700\text{ Hz} \to 1,500\text{ Hz} \to 600\text{ Hz}$ over $0.22\text{ s}$, volume $0.12$.
2. **Aerodynamic Spinning Whistle:**
   - Pure `sine` wave gently sliding from $293.66\text{ Hz}$ ($D_4$) up to $370\text{ Hz}$ and resolving back to $293.66\text{ Hz}$, duration $0.20\text{ s}$, subtle volume $0.07$.
   - Evokes a curved hardwood boomerang carving through desert air and returning smoothly to hand.

---

## 8. The Pre-Gate "Gate Rhythm Climax" Mini-Game Specification

### 8.1 Concept & Purpose
Immediately before confronting each Gate Boss (the Big Rock sealing the road), an opt-in rhythmic shrine awakens: **Gate Rhythm Climax** (*قمة الإيقاع*).
- **Duration:** Exactly 10 seconds of focused rhythmic interaction.
- **Goal:** Deliver an empowering musical climax that rewards rhythm accuracy with up to a **10x Boss Damage** surge on the upcoming Gate encounter.
- **Independence:** Opt-in, tactical surge; does not disrupt baseline idle/progression economy. Playable once per Gate.

### 8.2 Horizontal Track & Strike Zone
- A sleek, neon-sand horizontal rhythm track spanning the center modal.
- The **Strike Reticle** glows at the left end of the track.
- Rhythmic energy pulses travel from right to left toward the reticle at a speed locked to the Gate's BPM.
- Beneath the track sits a large tactile rhythm button: **STRIKE / اضرب** (operable by Mouse Click, Touch, or Spacebar).

### 8.3 Difficulty & Pacing Progression
- **Chapter 1 Early Gates (Floors 25, 50, 75):**
  - Tempo: 100–110 BPM.
  - Pattern: Steady quarter notes and downbeat 8ths (predictable, accessible onboarding).
- **Mid Chapters (Floors 100, 125, 150):**
  - Tempo: 120–140 BPM.
  - Pattern: Syncopated 8th-note grooves with offbeat accents.
- **Deep & Late Chapters (Floors 175+):**
  - Tempo: 150–180 BPM.
  - Pattern: Polyrhythmic Arabian Darbuka patterns (Malfuf, Maqsum, and Samai meters).

### 8.4 Rating Windows & Scoring
Each beat strike is evaluated against the target window:
- **PERFECT ($\pm 45\text{ ms}$):** Cyan/Gold burst, $+100\text{ pts}$, Combo $+1$, triggers high resonant bell strike.
- **GREAT ($\pm 90\text{ ms}$):** Green pulse, $+70\text{ pts}$, Combo $+1$, triggers solid wood strike.
- **GOOD ($\pm 150\text{ ms}$):** Amber glow, $+40\text{ pts}$, combo maintained.
- **MISS ($> 150\text{ ms}$):** Dull thud, combo reset.

### 8.5 Reward Calculation
Upon conclusion of the 10-second climax:
- Score $\ge 80\%$ or Combo $\ge 12$: **S-Rank / 10.0x Boss Damage Surge**.
- Score $\ge 60\%$: **A-Rank / 7.5x Boss Damage Surge**.
- Score $\ge 40\%$: **B-Rank / 5.0x Boss Damage Surge**.
- Score $< 40\%$: **C-Rank / 2.5x Boss Damage Surge**.

The surge attaches to `s.bossRhythmMult` and multiplies all damage dealt to the Gate boss until the boss is shattered.

---

## 9. Audio Verification & Checklist for Future SFX

Before committing any new sound effect or pick upgrade to the codebase, verify against this checklist:

- [ ] **Quantization:** Is the sound listed in `P.back` if it triggers from pick hits, chain reactions, or secondary relics?
- [ ] **Key Harmony:** Are all tone frequencies tuned to fundamentals or harmonics of D ($D_2 = 73.4\text{ Hz}$, $D_3 = 146.8\text{ Hz}$)?
- [ ] **No Sawtooth Buzz:** Uses `sine` for sub-bass, `triangle` for melodic body, and filtered `noise` for transients. No harsh raw `sawtooth`.
- [ ] **Transient Ceiling:** High frequencies filtered below 3,500 Hz; no piercing white noise above 4,000 Hz.
- [ ] **Decay Discipline:** Transients under 60 ms; body decay under 250 ms. Blasts never exceed 350 ms.
- [ ] **Polyphony Throttling:** Guarded by `gap(name, duration)`.
- [ ] **Dynamic Scaling:** Chained or stacked sounds scale down volume via `pentPitch` attenuation.
- [ ] **Bilingual Localization:** Any accompanying toast or UI text is translated in both English and Arabic with RTL support.
- [ ] **Automated Testing:** Covered by unit tests verifying audio clock calculation, quantization, and math safety without DOM dependencies.
