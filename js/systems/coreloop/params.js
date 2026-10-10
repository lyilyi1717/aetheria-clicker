// Every number of the core loop (docs/core-loop-redesign.md). The single source for the game
// (js/systems/coreloop/) and for the sim (sim/redesign/ re-exports this object), so they cannot
// drift. A tuning pass is an edit here plus `node sim/redesign/run.mjs --assert`; record what
// changed and why in docs/core-loop-reference.md §5. Formulas: that file's §3.

export const P = {
  // --- time ---------------------------------------------------------------------------------
  years: 1,
  dt: { hands: 5, watch: 30, away: 300 },     // seconds per step in each presence state

  // --- Well: cascade generators (Antimatter Dimensions) --------------------------------------
  // The Well has `slots` cascade slots (Antimatter Dimensions has 8). A cascade of N tiers grows like
  // run-time^N, so N stays fixed; the 30 generators are the content that fills the slots: generator g
  // (9..30) upgrades slot ((g - 9) % slots) + 1 to x genMult output. Generator g unlocks when the best
  // run ever reaches 10^(genLog0 + genLogStep·(g - 9)): tied to the ceiling, so they arrive all year and
  // the last one is a late-year goal (tied to reset counts they were all out by month 3). Never reset.
  slots: 8, generators: 30, genMult: 10, genLog0: 60, genLogStep: 7,
  costA: 1.5, costB: 0.15,         // tier k unit cost 10^(costA·k + costB·k²)
  // x10^(stepA + stepB·k) per 10 bought of tier k. Keep Σ_k log10(buyTenMult)/(stepA + stepB·k) < 1:
  // above 1 the x2-per-10 bonuses compound faster than prices and a run blows up in finite time
  stepA: 3, stepB: 1,
  buyTenMult: 2,                   // x2 per 10 bought
  tierRate: 1,                     // units of tier k-1 (or Crude) made per unit of tier k per s
  startCrude: 50,
  // Global multipliers (layers, Naphtha, Pressure, presence) act on tier 1's Crude output only:
  // applied to every cascade stage they would be raised to the power of the tier count
  awayWell: 0.5,                   // Well rate while Away (offline efficiency)
  handsWell: 0.5,                  // Well x(1 + handsWell·heat) while Hands-on (tapping)
  // Pressure (Tickspeed): level L costs 10^(pA + pB·L); Crude x pMult^L (Fields: pFieldMult)
  pA: 3, pB: 1, pMult: 1.125,
  flareDiv: 10,                    // top-tier mult = (log10(tier-1 amount)/flareDiv)^2
  flareMinGain: 2,                 // flare when it at least doubles the top multiplier

  // --- prestige -------------------------------------------------------------------------------
  wellMin: 1e6,                    // run Crude for a New Well
  resBase: 2, resPow: 1.5,         // Reserves = floor(resBase·(log10(run/wellMin))^resPow): log-scaled
  resPer: 0.1,                     // Crude x(1 + resPer·R), R = lifetime Reserves this layer
  wellMinRunSec: 600,
  wellGain: 0.25,                  // New Well once it would add ≥ 25% to lifetime Reserves (min 5)
  // New Field k (0-based in this Chronicle) needs a best run of 10^(fieldLog0 + fieldLogStep·k +
  // fieldLogPerChronicle·Chronicles) Crude: a clear goal on screen, and each loop must climb higher
  fieldLog0: 50, fieldLogStep: 3, fieldLogPerChronicle: 8,
  sharesPerField: 2, shareMult: 2.5,
  chronFirstFields: 8, chronFields: 6, chronFullFields: 9, chronSlowDays: 5,
  chronRecord: 10,                 // best run must be x10 the best before the last Chronicle
  pageBase: 3, pageStep: 2, pageMult: 1.06,
  // Re-blaze: a Chronicle starts with floor(lifetime Pages x this) Field Shares, so the next loop races
  // back past old content instead of crawling (the old Chronicle dropped ~x1e7 of Shares at once)
  startSharesPerPage: 1.35,

  // --- presence -------------------------------------------------------------------------------
  away: 0.3, watch: 1, hands: 1,   // Rig rate by state
  awayCap: 0.45,                   // Away Rig rate never above this share of Watching
  charter: {
    wildcatter: { hand: 1.5 },     // Hands-on yield
    operator: { watch: 1.5, gusher: 2 },
    baron: { away: 1.5 }
  },
  heatRamp: 60,                    // s to full Heat; Heat = 1 + min(1, t/heatRamp)
  gusherEvery: 240, gusherSeconds: 60,
  handsWindow: 30,                 // s since the last input that still count as Hands-on
  gusherWindow: 20,                // s a Gusher stays up to be tapped

  // --- Fields ---------------------------------------------------------------------------------
  fields: ['tower', 'mine', 'oasis'],
  gradeSpan: 10,                   // frontier levels per grade
  // difficulty x10 every N levels, per Field (tower, mine, oasis): different curves keep their grade-ups
  // from all landing on the same day
  levelsPerDecade: [10, 11, 9],
  vMax: 20 / 3600,                 // frontier levels per s when far below the wall
  sigK: 2,                         // sigmoid steepness per decade of power over difficulty
  fieldBase: [10, 6, 16],          // starting power per Field
  handMult: 2,                     // hand farming = handMult x the Field's Rig rate (x Heat)
  handFloor: 0.1,                  // ... at least this per s (before the first Rig)
  pFieldMult: 1.05,                // Rig and hand farming speed x pFieldMult^(best Pressure ever)
  rigBase: 0.1,                    // units/s per Rig level
  rigReach0: 0.6, rigReachStep: 0.04, rigReachMax: 0.9,
  awayBitumenExp: 0.1,             // Away rate x Bitumen^exp (then capped by awayCap)

  // --- Mastery --------------------------------------------------------------------------------
  actionsPerField: 4,
  actionShare: [0.4, 0.3, 0.2, 0.1], // players use a Field's actions unevenly, so their ranks come at different times
  rankHours: [0.25, 1.5, 6, 20, 60],  // Novice..Legend
  legendHours: 25,                 // then Legend II, III, ... every 25 more hours (endless)
  legendTitleEvery: 5,             // Legend V, X, XV ... are titles (L4)
  rigMasteryShare: 0.1,
  schoolPower: 0.1,                // field power x(1 + schoolPower·sum of ranks / actions)

  // --- Refinery -------------------------------------------------------------------------------
  // which Field's Materials each Fraction's Orders need ('any' = the largest stock)
  orderSource: { gas: 'any', naphtha: 'mine', kerosene: 'oasis', diesel: 'tower', bitumen: 'any' },
  orderMult: 1.015,
  // Orders cost Materials only: a Crude price tied to current output kept failing right after resets
  orderSeconds: 900, orderHandShare: 0.25, orderRefill: 1800,
  orderSlots: 3,
  // Weekly big Order (the old Weekly Ledger): posted each 7 days, needs weeklyHours of every Field's Rig
  // output (Watching rate) at its Rig grade; pays +1 level on every Fraction (L4)
  weeklyHours: 4,
  // Cauldrons: Hand (Hands-on s), Oil (Watching s), Sands (field s + rig units·sandsPerUnit), Time (Away s)
  cauldrons: ['hand', 'oil', 'sands', 'time'],
  cauldronC0: { hand: 900, oil: 1800, sands: 1800, time: 7200 },
  sandsPerRig: 0.25,               // Sands fills 1/s while farming by hand + this per working Rig per s
  // every upgradeEvery-th full bar adds cauldronSpeed to the fill speed (linear, so no runaway)
  bubbleExp: 0.6, upgradeEvery: 5, cauldronSpeed: 0.1,
  // Unlimited: named Bubbles, then numbered variants. A near-flat cost keeps a steady stream all year;
  // safe because Bubbles add (saturating) inside a Fraction, they never multiply each other
  bubbleFamily: 10,                // every 10th Bubble opens a new Bubble family (L3)
  // Essence prices are in hours of Oasis farming (Watching rate), so they stay meaningful as output grows
  bubbleA: 0.5, bubbleB: 10, bubbleLevelHours: 0.25, bubbleCostGrowth: 1.15,
  // Vials
  vialOffersPerDay: 3, vialChance: 0.3, vialPity: 4,
  vialTierHours: [2, 8, 32, 128], vialTiers: 5, vialPerTier: 0.05,
  // Mixer
  // recipe grades spread over the year's whole grade range, so discoveries keep coming
  recipes: 40, recipesPerChronicle: 10, recipeGradeMax: 40, mixerChance: 0.6,
  compoundTiers: [5, 25, 100],
  remakeHours: 0.5,                // a re-make costs this many hours of each Field's farming; one per visit
  // Seals
  // One Seal per month theme: Seal i opens on day i x sealEveryDays. With any Crew, every open Seal gains
  // (1 + sealCrewBonus x Crew) Seal-hours per hour; tiers at these cumulative Seal-hours
  seals: 12, sealEveryDays: 30, sealCrewBonus: 0.25, sealHours: [24, 150, 500, 1200, 2500],
  sealBigTier: 4,                  // tiers from here (Radiant, Eternal) are L4; the first three are L3
  crewBase: 1,                     // Crew slots = crewBase + Chronicles (a New Field choice fills one)
  // Trials (automation): unlocked at New Field n, won at the first Hands-on stretch ≥ trialMinSec
  // starting ≥ trialDelay after unlock
  // [id, kind, n]: unlocked at the n-th New Well or New Field. Auto-Buy comes early (players who leave the
  // game open need it); Auto-Well needs Auto-Buy won
  trials: [['autoBuy', 'well', 3], ['autoWell', 'field', 1], ['autoFlare', 'field', 2]],
  trialMinSec: 300, trialDelay: 7200,

  // --- probes and targets -------------------------------------------------------------------
  refineEvery: 120,                // a hands-on player checks the Refinery every 2 min (and on leaving)
  probeDays: [1, 7, 30, 90, 180],
  probeSeconds: 3600
};
