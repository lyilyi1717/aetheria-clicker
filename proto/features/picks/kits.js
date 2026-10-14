// Dig feature "picks": the sound kit of each land, made in code (ui/audio.js tone() and noise(); no files).
// 'arabia' has no kit here: it keeps the game's own sounds as they are. Each other land gives new voices to the
// pick's sounds: hit (a swing; `hard` is a big one), crit (a lucky hit) and crew (a Rafeeq's swing, the clap
// on the off-beat). The deeper the layer, the lower the notes (depthPitch) and the darker the noise.
// Chapter two: each land at night (n_africa ...) plays its own kit a few notes lower; the Empty Quarter has the old kit of home,
// a tabl (a low drum) and a clap.
import { addVoices, addSfx, tone, noise, gap, pent, wob, depthPitch, kitDepth } from '../../ui/audio.js';

let turn = 0;                       // which of the kit's sounds comes next (a hit plays them in turn)
let nightMul = 1;                   // chapter two: a land at night plays its own kit this much lower (see `night` below)
const dp = () => depthPitch() * nightMul;
const dark = f => f * (1 - 0.1 * kitDepth());   // a noise filter, a little darker the deeper it is

const africa = {
  hit(hard) {
    if (!gap('hit', 0.035)) return;
    const k = hard ? 0 : (turn++ % 3) + 1;
    if (k === 0) { tone(92 * wob() * dp(), { type: 'sine', d: 0.17, vol: 0.4, slide: 52 }); noise({ d: 0.06, vol: 0.1, from: dark(900), to: 200 }); }   // djembe bass
    else if (k === 1) tone(250 * wob() * dp(), { type: 'triangle', d: 0.09, vol: 0.26, slide: 190 });                                                  // djembe tone
    else if (k === 2) noise({ d: 0.05, vol: 0.2, from: dark(3200), to: 1800, type: 'bandpass' });                                                       // djembe slap
    else { tone(330 * wob() * dp(), { type: 'triangle', d: 0.07, vol: 0.2, slide: 250 }); noise({ d: 0.04, vol: 0.05, from: dark(6000), to: 4000, type: 'highpass' }); }
  },
  crit() {
    if (!gap('crit', 0.05)) return;
    tone(88 * dp(), { type: 'sine', d: 0.2, vol: 0.5, slide: 45 });
    noise({ d: 0.12, vol: 0.14, from: dark(6500), to: 3000, type: 'highpass' });
    tone(520 * wob() * dp(), { type: 'triangle', d: 0.1, vol: 0.12, slide: 400, at: 0.05 });
  },
  crew() { if (gap('crew', 0.09)) noise({ d: 0.05, vol: 0.06, from: dark(7000), to: 5000, type: 'highpass' }); },    // a shaker
};

const eastasia = {
  hit(hard) {
    if (!gap('hit', 0.035)) return;
    const k = hard ? 0 : (turn++ % 3) + 1;
    if (k === 0) { tone(68 * wob() * dp(), { type: 'sine', d: 0.26, vol: 0.46, slide: 38 }); noise({ d: 0.07, vol: 0.14, from: dark(1100), to: 150 }); }   // taiko boom
    else if (k === 2) tone(pent(turn % 5) * 2 * dp(), { type: 'sine', d: 0.28, vol: 0.075 });                                                              // pentatonic bell
    else { tone(880 * wob() * dp(), { type: 'triangle', d: 0.045, vol: 0.24, slide: 640 }); noise({ d: 0.03, vol: 0.08, from: dark(3000), to: 1500, type: 'bandpass' }); }   // wood block
  },
  crit() {
    if (!gap('crit', 0.05)) return;
    tone(60 * dp(), { type: 'sine', d: 0.3, vol: 0.52, slide: 34 });
    noise({ d: 0.1, vol: 0.2, from: dark(2500), to: 300 });
    [7, 9].forEach((n, i) => tone(pent(n) * 2 * dp(), { type: 'sine', d: 0.32, vol: 0.09, at: 0.04 + i * 0.07 }));
  },
  crew() { if (gap('crew', 0.09)) tone(1100 * wob() * dp(), { type: 'triangle', d: 0.03, vol: 0.07, slide: 800 }); },   // a small wood tick
};

const americas = {
  hit(hard) {
    if (!gap('hit', 0.035)) return;
    const k = hard ? 0 : (turn++ % 3) + 1;
    if (k === 0) { tone(155 * wob() * dp(), { type: 'sine', d: 0.15, vol: 0.38, slide: 100 }); noise({ d: 0.04, vol: 0.1, from: dark(2500), to: 800 }); }   // conga
    else if (k === 1) { tone(2350 * wob() * dp(), { type: 'sine', d: 0.06, vol: 0.2 }); tone(1900 * dp(), { type: 'sine', d: 0.05, vol: 0.08 }); }              // clave
    else { tone(560 * dp(), { type: 'square', d: 0.1, vol: 0.05 }); tone(845 * dp(), { type: 'square', d: 0.1, vol: 0.05 }); }                                   // cowbell
  },
  crit() {
    if (!gap('crit', 0.05)) return;
    tone(135 * dp(), { type: 'sine', d: 0.2, vol: 0.5, slide: 70 });
    tone(560 * dp(), { type: 'square', d: 0.18, vol: 0.09 }); tone(845 * dp(), { type: 'square', d: 0.18, vol: 0.09 });
    noise({ d: 0.1, vol: 0.12, from: dark(6000), to: 2500, type: 'highpass' });
  },
  crew() { if (gap('crew', 0.09)) noise({ d: 0.06, vol: 0.07, from: dark(6500), to: 4000, type: 'highpass' }); },        // a maraca
};

const europe = {
  hit(hard) {
    if (!gap('hit', 0.035)) return;
    const k = hard ? 0 : (turn++ % 3) + 1;
    if (k === 0) { tone(118 * wob() * dp(), { type: 'triangle', d: 0.13, vol: 0.38, slide: 78 }); noise({ d: 0.06, vol: 0.14, from: dark(2600), to: 500 }); }   // march drum
    else if (k === 1) { noise({ d: 0.09, vol: 0.22, from: dark(4500), to: 2200, type: 'highpass' }); tone(200 * dp(), { type: 'sine', d: 0.05, vol: 0.1 }); }       // snare
    else { const f = pent(5 + (turn % 5)) * 2 * dp(); tone(f, { type: 'sine', d: 0.3, vol: 0.075 }); tone(f * 2.76, { type: 'sine', d: 0.12, vol: 0.03 }); }       // glockenspiel
  },
  crit() {
    if (!gap('crit', 0.05)) return;
    noise({ d: 0.1, vol: 0.28, from: dark(5500), to: 1800, type: 'highpass' });
    noise({ d: 0.08, vol: 0.2, from: dark(5000), to: 1800, type: 'highpass', at: 0.045 });
    tone(105 * dp(), { type: 'sine', d: 0.16, vol: 0.4, slide: 50 });
    tone(pent(12) * dp(), { type: 'sine', d: 0.3, vol: 0.08, at: 0.05 });
  },
  crew() { if (gap('crew', 0.09)) tone(1700 * wob() * dp(), { type: 'square', d: 0.02, vol: 0.03 }); },                  // a rim click
};

// a land at night: the same voices, lower (nightMul is set only while a night voice plays)
const NIGHT = 0.84;
const night = k => Object.fromEntries(Object.entries(k).map(([n, f]) => [n, (...a) => { nightMul = NIGHT; try { return f(...a); } finally { nightMul = 1; } }]));
// the Empty Quarter: the old kit, a tabl and a clap
const emptyquarter = {
  hit(hard) {
    if (!gap('hit', 0.035)) return;
    const k = hard ? 0 : (turn++ % 2) + 1;
    if (k === 0) { tone(74 * wob() * dp(), { type: 'sine', d: 0.24, vol: 0.44, slide: 44 }); noise({ d: 0.05, vol: 0.08, from: dark(700), to: 150 }); }   // tabl, the big side
    else if (k === 1) tone(130 * wob() * dp(), { type: 'sine', d: 0.12, vol: 0.3, slide: 90 });                                                          // tabl, the small side
    else noise({ d: 0.06, vol: 0.16, from: dark(2600), to: 1200, type: 'bandpass' });                                                                  // a clap
  },
  crit() {
    if (!gap('crit', 0.05)) return;
    tone(66 * dp(), { type: 'sine', d: 0.3, vol: 0.5, slide: 40 });
    noise({ d: 0.07, vol: 0.18, from: dark(2600), to: 1200, type: 'bandpass', at: 0.06 });
    noise({ d: 0.07, vol: 0.18, from: dark(2600), to: 1200, type: 'bandpass', at: 0.12 });
  },
  crew() { if (gap('crew', 0.09)) noise({ d: 0.05, vol: 0.07, from: dark(2400), to: 1100, type: 'bandpass' }); },    // a soft clap
};

export const KITS = { africa, eastasia, americas, europe, n_europe: night(europe), n_americas: night(americas), n_eastasia: night(eastasia), n_africa: night(africa), emptyquarter };
for (const [zone, k] of Object.entries(KITS)) addVoices(zone, k);

// A short call when a level in a new land begins: three notes in that land's own sounds.
const stings = {
  arabia: () => [392, 523, 659].forEach((f, i) => tone(f, { type: 'triangle', d: 0.22, vol: 0.16, at: i * 0.12 })),
  africa: () => {
    tone(92, { type: 'sine', d: 0.17, vol: 0.4, slide: 52 });
    tone(250, { type: 'triangle', d: 0.09, vol: 0.26, slide: 190, at: 0.14 });
    tone(pent(4), { type: 'sine', d: 0.4, vol: 0.14, at: 0.28 });
  },
  eastasia: () => {
    tone(68, { type: 'sine', d: 0.3, vol: 0.46, slide: 38 });
    [pent(7), pent(9)].forEach((f, i) => tone(f * 2, { type: 'sine', d: 0.45, vol: 0.12, at: 0.18 + i * 0.14 }));
  },
  americas: () => {
    tone(2350, { type: 'sine', d: 0.06, vol: 0.2 }); tone(2350, { type: 'sine', d: 0.06, vol: 0.2, at: 0.13 });
    tone(155, { type: 'sine', d: 0.15, vol: 0.38, slide: 100, at: 0.26 });
    tone(560, { type: 'square', d: 0.16, vol: 0.06, at: 0.26 }); tone(845, { type: 'square', d: 0.16, vol: 0.06, at: 0.26 });
  },
  europe: () => {
    noise({ d: 0.09, vol: 0.2, from: 4500, to: 2200, type: 'highpass' });
    noise({ d: 0.09, vol: 0.2, from: 4500, to: 2200, type: 'highpass', at: 0.1 });
    [pent(10), pent(12)].forEach((f, i) => { tone(f, { type: 'sine', d: 0.4, vol: 0.12, at: 0.22 + i * 0.12 }); tone(f * 2.76, { type: 'sine', d: 0.14, vol: 0.04, at: 0.22 + i * 0.12 }); });
  },
};
// chapter two: a land at night calls with a low soft note under its own sting; the Empty Quarter with the tabl and two claps
const nightCall = land => () => { tone(pent(0) / 2, { type: 'sine', d: 0.6, vol: 0.12 }); stings[land](); };
for (const z of ['europe', 'americas', 'eastasia', 'africa']) stings['n_' + z] = nightCall(z);
stings.emptyquarter = () => {
  tone(74, { type: 'sine', d: 0.24, vol: 0.44, slide: 44 });
  noise({ d: 0.06, vol: 0.18, from: 2600, to: 1200, type: 'bandpass', at: 0.18 }); noise({ d: 0.06, vol: 0.18, from: 2600, to: 1200, type: 'bandpass', at: 0.3 });
  tone(pent(2), { type: 'triangle', d: 0.4, vol: 0.13, at: 0.42 });
};
export const STING_ZONES = Object.keys(stings);
addSfx({ picksSting(zone) { if (gap('picksSting', 0.5) && stings[zone]) stings[zone](); } });
