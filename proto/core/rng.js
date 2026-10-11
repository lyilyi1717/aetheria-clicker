// Dig: the one source of chance for the rules. Sims and tests replace it to get the same dig twice.
// Rules never call Math.random; they call rnd(). (Effects on the canvas may: they never touch the state.)
let src = null;

export const rnd = () => (src ? src() : Math.random());
export const rndInt = n => Math.floor(rnd() * n);
export const pickOne = a => a[Math.floor(rnd() * a.length)];

// setRng(f): every later rnd() comes from f. setRng(null) goes back to Math.random.
export function setRng(f) { src = f || null; }

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const seedRng = seed => setRng(mulberry(seed));
