// Dig: Central Live Tuning Registry & Real-Time Parameter Binding.
// All core variables affecting combat, health curves, gates, economy, and era mechanics
// can be queried through getTuning(). When an override is set (via in-memory or s.debugOverrides),
// it takes precedence immediately without page reload.

export const TUNING_CONFIG = {
  // 1. ⚔️ Combat & Damage Multipliers
  pickBase: {
    id: 'pickBase',
    label: 'Base Pick Damage',
    category: 'combat',
    default: 1.0,
    min: 0.1,
    max: 100.0,
    step: 0.1,
    desc: 'Base hit power of the pick before upgrade scaling',
    unit: 'dmg',
  },
  pickMult: {
    id: 'pickMult',
    label: 'Pick Power Multiplier',
    category: 'combat',
    default: 1.0,
    min: 0.1,
    max: 10.0,
    step: 0.1,
    desc: 'Global multiplier applied to total pick power',
    unit: 'x',
  },
  goodHitMult: {
    id: 'goodHitMult',
    label: 'Good Hit Rhythm Mult',
    category: 'combat',
    default: 2.5,
    min: 1.0,
    max: 10.0,
    step: 0.1,
    desc: 'Damage multiplier for hitting on musical accent downbeats',
    unit: 'x',
  },
  feverDmgMult: {
    id: 'feverDmgMult',
    label: 'Fever Mode Damage Mult',
    category: 'combat',
    default: 1.5,
    min: 1.0,
    max: 10.0,
    step: 0.1,
    desc: 'Damage multiplier active during Yalla! Fever Mode',
    unit: 'x',
  },
  feverCoinMult: {
    id: 'feverCoinMult',
    label: 'Fever Mode Coin Mult',
    category: 'combat',
    default: 2.0,
    min: 1.0,
    max: 10.0,
    step: 0.1,
    desc: 'Coin multiplier active during Yalla! Fever Mode',
    unit: 'x',
  },
  overkillRatio: {
    id: 'overkillRatio',
    label: 'Overkill Carry Ratio',
    category: 'combat',
    default: 0.5,
    min: 0.0,
    max: 1.0,
    step: 0.05,
    desc: 'Fraction of excess damage carried downward into blocks below',
    unit: 'ratio',
  },
  rafeeqShare: {
    id: 'rafeeqShare',
    label: 'Rafeeq Power Share',
    category: 'combat',
    default: 0.6,
    min: 0.1,
    max: 2.0,
    step: 0.05,
    desc: 'Share of player pick power each crew Rafeeq deals per swing',
    unit: 'ratio',
  },
  critChance: {
    id: 'critChance',
    label: 'Critical Strike Chance',
    category: 'combat',
    default: 0.08,
    min: 0.0,
    max: 1.0,
    step: 0.01,
    desc: 'Base probability for an active swing to land as a critical strike',
    unit: 'prob',
  },
  critMult: {
    id: 'critMult',
    label: 'Critical Strike Damage',
    category: 'combat',
    default: 5.0,
    min: 1.5,
    max: 25.0,
    step: 0.5,
    desc: 'Multiplier applied to damage on critical strikes',
    unit: 'x',
  },
  comboDecay: {
    id: 'comboDecay',
    label: 'Combo Decay Window',
    category: 'combat',
    default: 2.6,
    min: 0.5,
    max: 10.0,
    step: 0.1,
    desc: 'Seconds before an active combo meter begins to expire',
    unit: 's',
  },

  // 2. 🪨 Block Health & Hardness Curves
  baseDirtHp: {
    id: 'baseDirtHp',
    label: 'Base Dirt HP (Row 0)',
    category: 'blocks',
    default: 5.0,
    min: 1.0,
    max: 50.0,
    step: 1.0,
    desc: 'Initial ground hardness at the surface (row 0)',
    unit: 'hp',
  },
  dirtDepthSlope: {
    id: 'dirtDepthSlope',
    label: 'Dirt Depth Scaling Slope',
    category: 'blocks',
    default: 0.04,
    min: 0.005,
    max: 0.20,
    step: 0.005,
    desc: 'Linear depth hardening rate per metre down (bounded curve)',
    unit: 'slope',
  },
  stoneHpMult: {
    id: 'stoneHpMult',
    label: 'Stone / Hard Block Mult',
    category: 'blocks',
    default: 1.0,
    min: 0.2,
    max: 5.0,
    step: 0.1,
    desc: 'Multiplier applied to stone and hard rock block health',
    unit: 'x',
  },
  minHits: {
    id: 'minHits',
    label: 'Min Hits-to-Break Cap',
    category: 'blocks',
    default: 1.0,
    min: 1.0,
    max: 3.0,
    step: 1.0,
    desc: 'Lower bound for swings needed to break standard dirt',
    unit: 'hits',
  },
  maxHits: {
    id: 'maxHits',
    label: 'Max Hits-to-Break Cap',
    category: 'blocks',
    default: 4.0,
    min: 2.0,
    max: 10.0,
    step: 1.0,
    desc: 'Upper bound for swings needed to break standard dirt',
    unit: 'hits',
  },

  // 3. 🚪 Gates, Bosses & Depths
  bossHpMult: {
    id: 'bossHpMult',
    label: 'Boss & Gate HP Mult',
    category: 'gates',
    default: 1.0,
    min: 0.1,
    max: 10.0,
    step: 0.1,
    desc: 'Global multiplier on Big Rock and Gate barrier health',
    unit: 'x',
  },
  ch1RockHp: {
    id: 'ch1RockHp',
    label: 'Ch1 Big Rock HP Override',
    category: 'gates',
    default: 0.0, // 0 = use authored default (~500)
    min: 0.0,
    max: 5000.0,
    step: 50.0,
    desc: 'Fixed HP override for Chapter 1 Big Rocks (0 = authored default)',
    unit: 'hp',
  },
  ch1GateHp: {
    id: 'ch1GateHp',
    label: 'Ch1 Gate HP Override',
    category: 'gates',
    default: 0.0, // 0 = use authored default (~3000)
    min: 0.0,
    max: 20000.0,
    step: 100.0,
    desc: 'Fixed HP override for Chapter 1 Gates (0 = authored default)',
    unit: 'hp',
  },
  weakSpotMult: {
    id: 'weakSpotMult',
    label: 'Weak Spot Crack Mult',
    category: 'gates',
    default: 2.0,
    min: 1.0,
    max: 10.0,
    step: 0.2,
    desc: 'Damage multiplier when striking the glowing fissure on a Big Rock',
    unit: 'x',
  },
  gateBankShare: {
    id: 'gateBankShare',
    label: 'Gate Banked Damage Share',
    category: 'gates',
    default: 0.60,
    min: 0.10,
    max: 1.0,
    step: 0.05,
    desc: 'Fraction of damage dealt preserved on subsequent attempts if wiped',
    unit: 'ratio',
  },

  // 4. 💰 Economy, Stars & Currencies
  coinDropMult: {
    id: 'coinDropMult',
    label: 'Coin Drop Multiplier',
    category: 'economy',
    default: 1.0,
    min: 0.1,
    max: 20.0,
    step: 0.1,
    desc: 'Global multiplier on all coin earnings from digging and sieving',
    unit: 'x',
  },
  starCostExp: {
    id: 'starCostExp',
    label: 'Star Cost Exponent Base',
    category: 'economy',
    default: 1.5,
    min: 1.1,
    max: 2.5,
    step: 0.05,
    desc: 'Geometric growth base for early Starshop track step pricing',
    unit: 'exp',
  },
  starDamping: {
    id: 'starDamping',
    label: 'Star Damping Factor',
    category: 'economy',
    default: 1.0,
    min: 0.2,
    max: 3.0,
    step: 0.1,
    desc: 'Scale factor for mid/late piecewise star cost inflation damping',
    unit: 'scale',
  },
  awayRateMult: {
    id: 'awayRateMult',
    label: 'Away Earnings Rate Mult',
    category: 'economy',
    default: 1.0,
    min: 0.1,
    max: 10.0,
    step: 0.1,
    desc: 'Multiplier applied to offline/away crew digging DPS and sieving',
    unit: 'x',
  },
  keystoneDropRate: {
    id: 'keystoneDropRate',
    label: 'Keystone Drop Rate Mult',
    category: 'economy',
    default: 1.0,
    min: 0.1,
    max: 10.0,
    step: 0.1,
    desc: 'Multiplier on chance or frequency of discovering era keystones',
    unit: 'x',
  },

  // 5. 🌊 Era Systems (Acoustics, TNT, Fluids, Heat)
  shockwaveRows: {
    id: 'shockwaveRows',
    label: 'Acoustic Shockwave Rows',
    category: 'era',
    default: 3,
    min: 1,
    max: 10,
    step: 1,
    desc: 'Number of rows instantly cleared by full Acoustic Resonance burst',
    unit: 'rows',
  },
  resonanceGain: {
    id: 'resonanceGain',
    label: 'Resonance Gain Per Beat',
    category: 'era',
    default: 10,
    min: 1,
    max: 50,
    step: 1,
    desc: 'Acoustic Resonance meter gain per on-beat accent strike',
    unit: 'pts',
  },
  tntChainMax: {
    id: 'tntChainMax',
    label: 'TNT Chain Detonation Cap',
    category: 'era',
    default: 4,
    min: 1,
    max: 20,
    step: 1,
    desc: 'Maximum sympathetic TNT barrel detonations per single trigger',
    unit: 'limit',
  },
  tntPower: {
    id: 'tntPower',
    label: 'TNT Blast Power',
    category: 'era',
    default: 8.0,
    min: 1.0,
    max: 50.0,
    step: 1.0,
    desc: 'TNT blast damage to surrounding blocks in swings of the triggerer',
    unit: 'swings',
  },
  hydroDepth: {
    id: 'hydroDepth',
    label: 'Hydro-Pick Waterjet Depth',
    category: 'era',
    default: 5,
    min: 1,
    max: 20,
    step: 1,
    desc: 'Depth in blocks that high-pressure water streams penetrate',
    unit: 'blocks',
  },
  heatPerBlock: {
    id: 'heatPerBlock',
    label: 'Geothermal Heat Per Block',
    category: 'era',
    default: 5,
    min: 1,
    max: 30,
    step: 1,
    desc: 'Kiln heat units generated when mining heated or basalt blocks',
    unit: 'heat',
  },
  tailwindCharges: {
    id: 'tailwindCharges',
    label: 'Tailwind Return Charges',
    category: 'era',
    default: 3,
    min: 1,
    max: 10,
    step: 1,
    desc: 'Charges granted upon returning from 48h absence',
    unit: 'chg',
  },
  tailwindSpeed: {
    id: 'tailwindSpeed',
    label: 'Tailwind Speed Multiplier',
    category: 'era',
    default: 2.0,
    min: 1.0,
    max: 10.0,
    step: 0.5,
    desc: 'Crew work and walk speed multiplier while Tailwind charges remain',
    unit: 'x',
  },
};

// Global in-memory overrides store (active during live session)
const LIVE_OVERRIDES = {};

// Query a tunable parameter with automatic fallback resolution:
// 1. In-state persistent override: s.debugOverrides[key]
// 2. In-memory live override: LIVE_OVERRIDES[key]
// 3. Fallback argument (authored parameter in feature/core)
// 4. Authored default in TUNING_CONFIG[key].default
export function getTuning(key, s = null, fallback = undefined) {
  if (s && s.debugOverrides && s.debugOverrides[key] !== undefined) {
    return s.debugOverrides[key];
  }
  if (LIVE_OVERRIDES[key] !== undefined) {
    return LIVE_OVERRIDES[key];
  }
  if (fallback !== undefined) {
    return fallback;
  }
  if (TUNING_CONFIG[key] !== undefined) {
    return TUNING_CONFIG[key].default;
  }
  return undefined;
}


// Set a live parameter override immediately:
export function setTuning(key, val, s = null) {
  const numVal = Number(val);
  if (!Number.isFinite(numVal)) return;
  LIVE_OVERRIDES[key] = numVal;
  if (s) {
    if (!s.debugOverrides) s.debugOverrides = {};
    s.debugOverrides[key] = numVal;
  }
}

// Remove an override and revert to default:
export function clearTuning(key, s = null) {
  delete LIVE_OVERRIDES[key];
  if (s && s.debugOverrides) {
    delete s.debugOverrides[key];
  }
}

// Reset all tuning overrides to authored defaults:
export function resetTuning(s = null) {
  for (const k of Object.keys(LIVE_OVERRIDES)) {
    delete LIVE_OVERRIDES[k];
  }
  if (s && s.debugOverrides) {
    s.debugOverrides = {};
  }
}

// Get all active overrides as a plain object:
export function getActiveOverrides(s = null) {
  const out = {};
  for (const [k, v] of Object.entries(LIVE_OVERRIDES)) {
    out[k] = v;
  }
  if (s && s.debugOverrides) {
    for (const [k, v] of Object.entries(s.debugOverrides)) {
      out[k] = v;
    }
  }
  return out;
}

// Export current overrides as formatted JSON:
export function exportTuningJson(s = null) {
  const overrides = getActiveOverrides(s);
  return JSON.stringify(overrides, null, 2);
}

// Import overrides from a JSON string:
export function importTuningJson(jsonStr, s = null) {
  try {
    const data = JSON.parse(jsonStr);
    if (!data || typeof data !== 'object') return false;
    for (const [k, v] of Object.entries(data)) {
      if (TUNING_CONFIG[k] && Number.isFinite(Number(v))) {
        setTuning(k, Number(v), s);
      }
    }
    return true;
  } catch {
    return false;
  }
}
