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
  buyTenMult: 2, packSize: 10,     // x2 per pack of 10 bought; the price steps with the pack too
  tierRate: 1,                     // units of tier k-1 (or Crude) made per unit of tier k per s
  startCrude: 50,
  tapCrude: 1,                     // Crude a tap on the Well gives: flat, so it only matters in the first minutes
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
  wellGain: 0.25, wellMinReserves: 5, // New Well once it would add ≥ 25% to lifetime Reserves (at least 5)
  // New Field k (0-based in this Chronicle) needs a best run of 10^(fieldLog0 + fieldLogStep·k +
  // fieldLogPerChronicle·Chronicles) Crude: a clear goal on screen, and each loop must climb higher
  fieldLog0: 50, fieldLogStep: 3, fieldLogPerChronicle: 8,
  sharesPerField: 2, shareMult: 2.5,
  chronFirstFields: 8, chronFields: 6, chronFullFields: 9, chronSlowDays: 5,
  chronRecord: 10,                 // best run must be x10 the best before the last Chronicle
  pageBase: 3, pageStep: 2, pageMult: 1.06,
  // Re-blaze: a Chronicle starts with floor(lifetime Pages x this) Field Shares, so the next loop races
  // back past old content instead of crawling (the old Chronicle dropped ~x1e7 of Shares at once)
  startSharesPerPage: 1.3,

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
  offlineMaxHours: 12,             // time away settled on return, at most (the design's "Rigs up to 12 h")
  offlineStep: 300,                // s per step when settling time away (the sim's Away step)

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
  rigEffBase: 0.4, rigEffMastery: 0.6, // Rig efficiency = base + mastery x (average rank / named ranks)
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
  bubbleExp: 0.95, upgradeEvery: 5, cauldronSpeed: 0.1,
  // Unlimited: named Bubbles, then numbered variants. Owner decision 4: fewer, bigger Bubbles. A bar's
  // cost grows almost linearly (bubbleExp), so a year brings about 800 (it was 8,000 at 0.6) and each
  // adds six times as much (bubbleA); they add (saturating) inside a Fraction, never multiply each other
  bubbleFamily: 3,                 // every 3rd Bubble opens a new Bubble family (L3)
  // Essence prices are in hours of Oasis farming (Watching rate), so they stay meaningful as output grows
  bubbleA: 3, bubbleB: 10, bubbleLevelHours: 0.25, bubbleCostGrowth: 1.15,
  // Vials
  vialOffersPerDay: 3, vialChance: 0.3, vialPity: 4,
  vialTierHours: [2, 8, 32, 128], vialTiers: 5, vialPerTier: 0.05,
  // Mixer
  // recipe grades spread over the year's whole grade range, so discoveries keep coming
  recipes: 40, recipesPerChronicle: 10, recipeGradeMax: 40, mixerChance: 0.6,
  recipeChronicleSpan: 4,          // a Chronicle's batch spreads its grades over this many above the best grade
  compoundBonus: 0.02,             // added to the Fraction per Compound found, and per Gilded / Royal tier
  compoundTiers: [5, 25, 100],
  remakeHours: 0.5,                // a re-make costs this many hours of each Field's farming; one per visit
  // Seals
  // One Seal per month theme: Seal i opens on day i x sealEveryDays. With any Crew, every open Seal gains
  // (1 + sealCrewBonus x Crew) Seal-hours per hour; tiers at these cumulative Seal-hours
  seals: 12, sealEveryDays: 30, sealCrewBonus: 0.25, sealHours: [24, 150, 500, 1200, 2500],
  sealBonusPerTier: 0.03,          // reaching tier T adds this x T to the Seal's Fraction (Seal i powers Fraction i % 5)
  sealBigTier: 4,                  // tiers from here (Radiant, Eternal) are L4; the first three are L3
  crewBase: 1,                     // Crew slots = crewBase + Chronicles (a New Field choice fills one)
  // Trials (automation): unlocked at New Field n, won at the first Hands-on stretch ≥ trialMinSec
  // starting ≥ trialDelay after unlock
  // [id, kind, n]: unlocked at the n-th New Well or New Field. Auto-Buy comes early (players who leave the
  // game open need it); Auto-Well needs Auto-Buy won
  trials: [['autoBuy', 'well', 3], ['autoWell', 'field', 1], ['autoFlare', 'field', 2]],
  trialMinSec: 300, trialDelay: 7200,

  // --- the one tree (CL-24) -------------------------------------------------------------------
  // The Reserve shop, Shard tree, talents, Page upgrades and Quartermaster of the old game as three
  // rings. Inner: bought with the Reserves earned this New Field layer, reset by a New Field. Middle:
  // bought with the Shares New Fields pay (not the re-blaze ones), reset by a Chronicle. Outer: bought
  // with Pages, never reset. Buying spends a bank; the Crude multipliers of Reserves, Shares and Pages
  // read what was earned and are not reduced. Rank r (0-based) costs cost x growth^r.
  // kind: a multiplier is x(1 + value x rank) (crude, hand, reserves, awayWell, fieldPower, rig,
  // gusherRate, heat); an amount is + value x rank (offlineHours, gusherWindow, startShares,
  // pageBank (an extra Page to spend per Chronicle), startKit, keepPressure, handsWell); a flag is on at rank 1 (for later items).
  // field: a Field index for fieldPower / rig; left out = all three. from: the old ids it stands for.
  tree: [
    // inner ring (Reserves)
    { id: 'kit', ring: 'reserves', cost: 5, growth: 3, max: 3, kind: 'startKit', value: 10, from: ['genesis', 'resonant_start'] },
    { id: 'idle_hands', ring: 'reserves', cost: 5, growth: 1, max: 1, kind: 'crude', value: 0.1, from: ['auto_tap'] },
    { id: 'memory', ring: 'reserves', cost: 10, growth: 5, max: 2, kind: 'keepPressure', value: 0.5, from: ['blueprint_memory', 'blueprint_memory_2'] },
    { id: 'vault', ring: 'reserves', cost: 10, growth: 2, max: 3, kind: 'offlineHours', value: 4, from: ['chrono_vault'] },
    { id: 'titan', ring: 'reserves', cost: 10, growth: 2, max: 5, kind: 'fieldPower', field: 0, value: 0.2, from: ['titan_legacy'] },
    { id: 'wasta', ring: 'reserves', cost: 20, growth: 2, max: 5, kind: 'handsWell', value: 0.1, from: ['finger_of_wasta'] },
    { id: 'drill', ring: 'reserves', cost: 35, growth: 2, max: 3, kind: 'rig', field: 1, value: 0.15, from: ['drill_mastery'] },
    { id: 'covenant', ring: 'reserves', cost: 30, growth: 2, max: 3, kind: 'rig', field: 2, value: 0.15, from: ['golem_covenant'] },
    { id: 'hourglass', ring: 'reserves', cost: 40, growth: 2, max: 2, kind: 'gusherWindow', value: 10, from: ['hourglass'] },
    { id: 'amplifier', ring: 'reserves', cost: 50, growth: 2, max: 10, kind: 'reserves', value: 0.1, from: ['dust_amplifier'] },
    { id: 'alchemist', ring: 'reserves', cost: 15, growth: 1, max: 1, kind: 'flag', value: 1, from: ['astral_alchemist'], pending: 'CL-25' },
    { id: 'wakeel', ring: 'reserves', cost: 40, growth: 1, max: 1, kind: 'flag', value: 1, from: ['al_wakeel'], pending: 'CL-21' },
    { id: 'leylines', ring: 'reserves', cost: 60, growth: 1, max: 1, kind: 'flag', value: 1, from: ['auto_leylines'], pending: 'CL-25' },
    // middle ring (Shares)
    { id: 'foundry', ring: 'shares', cost: 1, growth: 1, max: 12, kind: 'crude', value: 0.1,
      from: ['foundry_t9', 'foundry_t10', 'foundry_t11', 'foundry_t12', 'foundry_t13', 'foundry_t14', 'foundry_t15', 'foundry_t16', 'foundry_t17', 'foundry_t18', 'foundry_t19', 'foundry_t20'] },
    { id: 'efficiency', ring: 'shares', cost: 1, growth: 1, max: 6, kind: 'crude', value: 0.1, from: ['building_efficiency', 'cost_reduction', 'synergy_resonance'] },
    { id: 'grip', ring: 'shares', cost: 1, growth: 1, max: 3, kind: 'handsWell', value: 0.1, from: ['click_power'] },
    { id: 'synergy', ring: 'shares', cost: 1, growth: 1, max: 3, kind: 'handsWell', value: 0.1, from: ['click_synergy'] },
    { id: 'warlord', ring: 'shares', cost: 1, growth: 1, max: 3, kind: 'fieldPower', field: 0, value: 0.2, from: ['warlord_might'] },
    { id: 'spoils', ring: 'shares', cost: 1, growth: 1, max: 3, kind: 'rig', field: 0, value: 0.1, from: ['dungeon_wealth', 'loot_fortune'] },
    { id: 'miner', ring: 'shares', cost: 1, growth: 1, max: 3, kind: 'fieldPower', field: 1, value: 0.2, from: ['mining_power'] },
    { id: 'botanist', ring: 'shares', cost: 1, growth: 1, max: 3, kind: 'fieldPower', field: 2, value: 0.2, from: ['botanical_haste'] },
    { id: 'flow', ring: 'shares', cost: 1, growth: 1, max: 3, kind: 'heat', value: 0.15, from: ['mana_flow'] },
    { id: 'night_shift', ring: 'shares', cost: 1, growth: 1, max: 3, kind: 'awayWell', value: 0.1, from: ['offline_transcendence'] },
    { id: 'lookout', ring: 'shares', cost: 1, growth: 1, max: 3, kind: 'gusherRate', value: 0.1, from: ['chrono_mastery'] },
    { id: 'long_sleep', ring: 'shares', cost: 2, growth: 1, max: 1, kind: 'offlineHours', value: 8, from: ['chronos_offline'] },
    { id: 'long_warp', ring: 'shares', cost: 3, growth: 1, max: 1, kind: 'flag', value: 1, from: ['chronos_long_warp'], pending: 'CL-25' },
    { id: 'sharp_eye', ring: 'shares', cost: 1, growth: 1, max: 3, kind: 'flag', value: 1, from: ['crit_mastery'], pending: 'CL-25' },
    { id: 'slow_brew', ring: 'shares', cost: 1, growth: 1, max: 3, kind: 'flag', value: 1, from: ['catalyst_potency'], pending: 'CL-25' },
    { id: 'auto_blast', ring: 'shares', cost: 1, growth: 1, max: 1, kind: 'flag', value: 1, from: ['chronos_auto_blast'], pending: 'CL-22' },
    { id: 'wardens', ring: 'shares', cost: 1, growth: 1, max: 1, kind: 'flag', value: 1, from: ['tower_wardens'], pending: 'CL-21' },
    { id: 'second_wind', ring: 'shares', cost: 2, growth: 1, max: 1, kind: 'flag', value: 1, from: ['tower_second_wind'], pending: 'CL-21' },
    // outer ring (Pages)
    { id: 'treaty', ring: 'pages', cost: 1, growth: 1, max: 10, kind: 'crude', value: 0.02, from: ['aether_treaty'] },
    { id: 'hunter', ring: 'pages', cost: 2, growth: 1, max: 5, kind: 'fieldPower', field: 0, value: 0.15, from: ['hunters_edge'] },
    { id: 'caravan', ring: 'pages', cost: 2, growth: 1, max: 5, kind: 'rig', value: 0.05, from: ['golden_req'] },
    { id: 'contract', ring: 'pages', cost: 2, growth: 1, max: 5, kind: 'awayWell', value: 0.05, from: ['chronos_contract'] },
    { id: 'ink', ring: 'pages', cost: 4, growth: 2, max: 2, kind: 'startShares', value: 1, from: ['ink'] },
    { id: 'margin', ring: 'pages', cost: 6, growth: 1, max: 4, kind: 'crude', value: 0.1, from: ['margin_notes', 'second_reading'] },
    { id: 'gilded', ring: 'pages', cost: 8, growth: 1, max: 1, kind: 'pageBank', value: 1, from: ['gilded_edges'] }
  ],
  // Old nodes whose job another part of the loop already does (no tree node)
  treeElsewhere: {
    auto_buy: 'Trial: Auto-Buy', chronos_auto_ascend: 'Trial: Auto-Well',
    bookmark: 'Trials are never reset', dog_ear: 'the outer ring is never reset'
  },

  // --- probes and targets -------------------------------------------------------------------
  refineEvery: 120,                // a hands-on player checks the Refinery every 2 min (and on leaving)
  probeDays: [1, 7, 30, 90, 180],
  probeSeconds: 3600
};
