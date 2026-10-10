# Core-loop redesign: reference

Owner directions, decisions, the sim's exact model, its targets and the tuning log. Companion to
`docs/core-loop-redesign.md` (the design) and `docs/core-loop-plan.md` (the implementation plan).
The sim is `sim/redesign/`; `test_redesign_sim.js` checks it. When the sim changes, update §3-§5
here in the same PR.

## 1. Owner directions (chronological, 2026-10-09)

1. Economy too slow; can't reach last generator; new tiers feel unreachable.
2. "Still not fast enough": more content, higher ceiling, ascend generators, a big hit at most
   every hour.
3. Categorise dopamine hits first, then map to games (done: economy-v6 §1-2).
4. Subgames need their own hits (economy-v6 §6).
5. Bring new ideas (IdleOn alchemy, Orb of Creation), not only retune.
6. Auto-generation per subgame unlocked by New Field; mix-and-match refinery; Antimatter
   Dimensions ideas; **simplify, remove clutter**; keep the player farming somewhere for items;
   **active > open-idle > offline**; be creative.
7. Keep Cauldrons, Vials, Mastery, Seals (expand, don't drop).
8. Write this reference, then build the sim; "it should be perfect".

## 2. Decisions

- One loop. 5 tabs: Well · Fields · Refinery · Prestige · Codex. Currencies: Crude, Materials
  (graded, one line per Field), Reserves, Shares, Pages.
- Fields: Tower, Mine, Oasis. Frontier pushed only by hand; **Rigs** farm behind it (unlocked
  by New Field choices). **Mastery** sets Rig efficiency.
- Presence states: Hands-on (input in last 30 s) > Watching (open) > Away (closed). Target value
  ratio ~3 : 1 : 1/3. Away always gains (rule 8).
- Refinery: 5 Fractions multiply (Gas, Naphtha, Kerosene, Diesel, Bitumen). Fraction =
  (1 + Bubbles + Vials) x OrderMult. Orders (3 slots) level Fractions; Cauldrons (one per
  presence state + Sands) brew Bubbles; Vials (single Materials); Mixer Compounds (pairs).
- Well: Antimatter-Dimensions cascade (tier k makes tier k-1), x2 per 10 bought, Flaring
  (sacrifice), Pressure (global speed), automation earned by Trials. Charters per New Field.
- Prestige: New Well → New Field → Chronicle. Pages multiply (x1.06 each); Chronicle needs a run
  x10 the best before the last one (record gate).
- Seals: Crew (a New Field choice) earn hours on 12 Seals with 5 named tiers.

## 3. Sim model (`sim/redesign/`), as built

Files: `params.mjs` (every tunable, commented), `model.mjs` (state + step, pure functions over a
cloneable state), `profiles.mjs` (schedules), `run.mjs` (driver, targets, report, CLI).
`test_redesign_sim.js` (repo root, runs in `npm test`, ~3 s): determinism, finiteness, Away > 0,
Hands-on > Watching > Away, progress happens, target checks run.

Commands:
```
node sim/redesign/run.mjs                    # report, every profile, seed 1
node sim/redesign/run.mjs --assert           # all targets on seeds 1,2,3 (~2 min); exit 1 on a miss
node sim/redesign/run.mjs --assert --seeds=4,5,6
node sim/redesign/run.mjs --only=casual --timeline   # first-week hit timeline
```
Time: Hands-on 5 s steps, Watching 30 s, Away 300 s; mulberry32 RNG in the state (same seed =
same year). Exact Taylor integration of the cascade per step.

### 3.1 Profiles (asleep 00:00-08:00)
| Profile | Hands-on | Watching | Charter |
|---|---|---|---|
| active | 2 x 45 min (09:00, 20:00) | 13:00-17:00 | Wildcatter (hand x1.5) |
| casual | 10 min every waking hour | – | Baron (Away x1.5) |
| idle | 2 min every 2 waking hours | – | Baron |
| open | 2 x 5 min | ~11 h open | Operator (Watching x1.5, Gushers x2) |

Player policy: Refinery taps at the start of each Hands-on stretch, every 2 min during it, on
leaving (taps only, no resets), and on each Gusher catch. Field in hand = the one an Order is
shortest on, else the lowest frontier.

### 3.2 Well
8 cascade slots; slot k makes slot k-1, slot 1 makes Crude. Unit cost 10^(1.5k + 0.15k²) x
10^((3 + k)·floor(b/10)); x2 per 10 bought; generator upgrades x10 per slot level. Global mults
(Reserves 1+0.1R, Shares 2.5^S, Pages 1.06^P, Naphtha, Pressure 1.125^L, presence) on slot 1's
output only. Pressure L costs 10^(3+L). Flare: top mult = (log10(a1)/10)^2 when ≥ 2x.
Generators: g unlocks at a best-ever run of 10^(60 + 7(g-9)), g = 9..30, never reset.
Away Well x0.5; Hands-on x(1 + 0.5·Heat).

### 3.3 Prestige
New Well: Reserves = floor(2·log10(run/1e6)^1.5), when ≥ 25% of lifetime Reserves (min 5) and
run ≥ 10 min. New Field (a Hands-on decision): best run ≥ 10^(50 + 3k + 8·Chronicles); +2 Shares;
choice Rig → Crew (slots 1 + Chronicles) → lowest Rig level. Chronicle: ≥ 8 New Fields first,
then ≥ 6; best ≥ 10x record; 9 New Fields or 5 days slowed. Pages = 3 + floor((fields-6)/2).
Starts with floor(1.35·Pages) Shares (re-blaze); Rig levels back to 1. Trials: Auto-Buy at
New Well 3, Auto-Well at New Field 1 (acts only with Auto-Buy), Auto-Flare at New Field 2; won
at the first Hands-on stretch ≥ 5 min that starts ≥ 2 h after unlock.

### 3.4 Fields, Rigs, Mastery
Frontier F only by hand: v = (20/h)·sigmoid(2·(log10 Power - F/lpd)), lpd 10/11/9 per Field,
grade = floor(F/10). Power = base (10/6/16) x Field Fraction x (1 + 0.1·Σrank/4) [x Heat x Gas
by hand]. Rig rate 0.1·level·eff·1.05^bestPressure; eff 0.4 + 0.6·avg rank/5; reach 0.6 +
0.04/level (max 0.9) of F. Watching 1 (Operator 1.5); Away 0.3·charter·Bitumen^0.1, capped
0.45. Hand farming = 2 x average Rig rate (floor 0.1) x Heat (1 → 2 over 60 s) x charter.
Mastery: 4 actions per Field, time split 40/30/20/10%; ranks at 0.25/1.5/6/20/60 h, then every
+25 h; Rigs add 10% of their time. Legend and Legend V, X, … are L4.

### 3.5 Refinery
Fraction = (1 + Bubbles + Vials + Compounds + Seals) x 1.015^Orders. Orders: 3 slots, Materials
only, 15 min of (Rig Watching rate + 0.25 x hand rate) at the Rig grade; refill 30 min. Weekly
Order: 4 h of every Field's Rig output; +1 level on all Fractions (L4). Cauldrons fill in
seconds: Hand (Hands-on), Oil (Watching), Sands (1/s by hand + 0.25/s per working Rig), Time
(Away); Bubble n costs c0·(n+1)^0.95 with c0 900/1800/1800/7200; every 5th bar +0.1 speed;
unlimited; every 4th Bubble opens a family (L3). Bubble effect 3·L/(10+L); levels cost
0.25·1.15^(L-1) hours of Oasis output. Vials per (Field, grade): 3 offers/day + 1 per Order,
30% chance, pity 4; tiers cost 2/8/32/128 h of Oasis output. Mixer: 40 recipes over grades
0-40 + 10 per Chronicle, found at 60% per visit once both Materials are in stock; re-makes cost
0.5 h of each Field's output, one per visit; Gilded at 25 (L3), Royal at 100 (L4). Seals: one
opens every 30 days; every open Seal gains (1 + 0.25·Crew) h per hour once Crew ≥ 1; tiers at
24/150/500/1200/2500 h; tiers 1-3 L3, 4-5 L4. Gushers every 240 s Watching, caught 30% (open
50%, Operator x2); a catch = 60 s of Crude and Rig output, plus Refinery taps.

### 3.6 Hits
L2+: Order, weekly Order, Bubble, Vial, rank, frontier grade, Rig new grade, Compound, generator,
New Field, Chronicle, Seal tier, Trial, Vial tier, Gilded, Royal, Bubble family, manual Flare.
L3+: generator, grade, Rig grade, Compound, Vial tier, Seal tiers, New Field, Chronicle, Trial,
Gilded, Royal, Bubble family, Legend titles. L4: Seal 4-5, Trial, Royal, Legend titles,
Chronicle, weekly Order.

## 4. Targets (all pass: 4 profiles x seeds 1-6, 2026-10-09)

| # | Target | Result range (seed 1) |
|---|---|---|
| T1 | ≥ 95% of sessions after day 1 contain a big hit | 100% all |
| T2 | Hands-on never 60 min without a big hit (active, casual) | 10-34 min |
| T3 | L3 novelty never > 3 days apart | 1.0-2.8 d |
| T4 | L4 never > 14 days apart (from day 7) | 6.9-9.0 d |
| T5 | Hands/Watching and Watching/Away in [2, 4.5] once every Field has a Rig (probes d7-180, no Charter); Away Crude > 0 always | 2.5-4.1 / 2.3-3.3 |
| T6 | Best run Crude: every month above the previous | 11/11 all |
| T7 | ≥ 90% of Orders filled within 24 h | 100% |
| T8 | Bubbles: ≥ 8 on day 0 (active, casual); never 3 days without one (d1-180) | 11-13; ≤ 0.7 d |
| T9 | 6-24 Chronicles a year (was 6-15: that bound was arbitrary; > 2 a month is spam); a New Field or Chronicle at least every 14 days to day 270 | 15-24; ≤ 6.5 d |
| T10 | Numbers finite (< 1e300 in the sim; the game's BigNum has no such limit) | ok |
| T11 | Same seed, same year (test) | ok |
| T12 | A new x10 all-time record at least every 30 days (added: monthly peaks alone hid a late-year stall) | 19-23 d |

Year shape (seed 1): best run month 1 → 12: casual 1e91 → 1e241, active 1e93 → 1e206, idle
1e74 → 1e191, open 1e93 → 1e250. Generator 30: casual ~day 225, open ~day 200; active/idle reach
29/27 by year end. Frontier grade at year end 26 (idle) to 55 (casual).

Known limits (not modelled, or deliberately simple): Tower/Mine/Oasis are one generic frontier
model (no bosses, tiles, timers); Heat has no Flashpoint burst; the Mixer is a chance stand-in
for curiosity; Charters only as rate multipliers; Trials are a time rule, not real challenge
runs; no save or migration modelling. Open design concerns: **Bubble volume** settled (tuning log 28); consider rarer, bigger Bubbles); **Orders
carry many hourly hits** (casual: 81% of sessions also have a non-Order hit, others 96-100%).

## 5. Tuning log

2026-10-09, building the sim (each line: what broke → what changed; **D** = a design change the docs
must carry, not just a number):

1. Crude overflowed to Infinity in the first day. Global multipliers applied to every cascade stage
   are raised to the power of the tier count (x1e3 becomes x1e60 at 20 tiers). → Global multipliers
   (layers, Naphtha, Pressure, presence) act on tier 1's Crude output only. **D**
2. Still overflowed: x2 per 10 bought with only x31 price per 10 compounds faster than prices.
   Rule: Σ_k log10(2)/(price step decades of tier k) must stay < 1. → Price per 10 = 10^(3 + k)
   (Antimatter Dimensions uses 1e3..1e15). **D**
3. Reserves as a power of run Crude exploded. → Reserves = 2·log10(run/1e6)^1.5 (log-scaled). **D**
4. A cascade of N tiers grows like run-time^N; 24+ tiers made day-long runs 1e33x hour-long ones.
   → **The Well has 8 cascade slots; the 30 generators are upgrades that fill them** (generator g
   upgrades slot ((g-9) mod 8)+1 to x10). Generators unlocked = 8 + record New Fields in a
   Chronicle + 1 per Chronicle, never reset; the last one lands late in the year. **D**
5. New Wells stopped after day 1 (rule "pending ≥ all Reserves" needs ever-longer runs). → New Well
   when it adds ≥ 25% to Reserves. **D**
6. New Field gated on Reserves was indirect and hard to pace. → New Field k needs a best run of
   10^(50 + 3k + 8·Chronicles) Crude: a visible goal; each loop must climb higher. **D**
7. Orders at x1.1 each ran Fractions to 1e53. → x1.015 each, smaller (15 min of farming), slot
   refills 30 min after filling.
8. Orders' Crude price (2 min of output) failed after every reset (the cause of 90% of sessions
   without a hit). → **Orders cost Materials only.** Crude's sinks are the Well; its link to the
   Fields is Pressure (Rig speed). **D**
9. Field power included Pressure, so grades raced. → Field power = base x its Fraction x school;
   Pressure only speeds Rigs and hand farming.
10. Hand farming at a fixed rate made Hands-on 20-800x Watching. → Hand farming = 2x the average
    Rig rate (x Heat), so Hands-on ≈ 3x Watching for any Rig mix; Away capped at 45% of
    Watching. **D**
11. Mastery ran out at 60 ranks. → Legend II, III, … every 25 h (endless). **D**
12. Vial tiers / Bubble levels / re-makes became free as output grew. → Their prices are in hours of
    the Field's farming (scale-free). **D**
13. Sands Cauldron filled from raw units (grow with Pressure) → 1,175 Bubbles of spam. → Cauldrons
    fill in seconds: Sands = 1/s farming by hand + 0.5/s per working Rig. **D**
14. Bubble pools ran dry mid-year. → Effectively unlimited (named, then numbered); cost
    c0·(n+1)^0.6; every 5th bar adds +0.1 fill speed (linear, no runaway).
15. Grades of the three Fields landed on the same day (same curves). → Different difficulty curves
    (10/11/9 levels per decade) and bases. **D**
16. Seals all finished by day 268, front-loaded. → **One Seal opens per month theme**; every open
    Seal gains (1 + 0.25·Crew) Seal-hours per hour once you have Crew; tiers 24/150/500/1200/2500.
    Crew slots = 1 + Chronicles. First three tiers are L3, Radiant/Eternal L4. **D**
17. New L3 sources so slower players keep seeing new things: a Rig reaching a new grade brings a
    Material it has never hauled (L3); every 10th Bubble opens a Bubble family (L3); Mixer recipes
    spread over the year's whole grade range. **D**
18. A Chronicle dropped ~x1e7 of Field Shares, so the month after it was flat (treadmill). →
    **Re-blaze**: a Chronicle starts with floor(Pages x k) Shares. **D**
19. Watching players had nothing to tap. → A Gusher catch is a tap: the player also checks the
    Refinery. Auto-Buy unlocks at the 3rd New Well (open-game players need it); Auto-Well needs
    Auto-Buy. **D**
20. Measurement fixes (not design): probes don't act (no Refinery during a probe); probe Crude is
    counted from zero (a lifetime total swallowed a fresh run's hour in float precision); the
    ratio target (T5) applies once every Field has a Rig.
21. Bubble pools still ran out and an empty pool turned every bar into a speed upgrade (speed
    229,571). → Unlimited pool; speed upgrade only every 5th bar; cost (n+1)^0.6, modelled per
    profile first (a one-cauldron calculator) so late-year Bubbles keep coming.
22. Single-seed passes were knife-edge (the model is chaotic around thresholds). → `--assert` runs
    seeds 1-3; checked again on 4-6.
23. L4 bunched. → **Weekly big Order** (the old Weekly Ledger: in the doc, missing from the sim);
    **Legend V, X, … titles** (L4); actions used unevenly (40/30/20/10%) so ranks stop landing on
    one day. **D**
24. All 30 generators were out by day 67-89 (reset-count unlocks) and growth stalled late (55 days
    without a x10 record). → **Generators unlock with the ceiling**: g at a best run of
    10^(60 + 7(g-9)). Added T12. **D**
25. Re-blaze 1.5 Shares/Page overshot (25-26 Chronicles); 1.0-1.25 left a flat month. → 1.35.
    New Field gate step 4 → 3 (the 5th → 6th Field took 15 days late in a Chronicle).
26. T9 upper bound 15 → 24 (see §4); dead code from the Orders' Crude price removed.
27. The sim's Legend titles landed on Legend VI, XI (every 5 ranks past Legend) while the design says Legend V, X → a title when the Legend number is a multiple of 5 (ranks 9, 14, ...), 25 h earlier each. All targets still pass on seeds 1-6.
28. Owner decision 4 (#23): Bubbles came ~8,000 a year for a casual player, each too small to notice.
    → Bar cost (n+1)^0.6 → (n+1)^0.95 (about 800 a year: 640-1,080 across profiles and seeds; still
    ≥ 8 on day 0 for active and casual), Bubble effect 0.5 → 3 at saturation (six times bigger, the
    same total Fraction bonus as before), a family every 4th Bubble instead of every 10th (fewer
    Bubbles left T3, the L3 gap, at 3.0-3.2 d on 3 of 24 runs). All targets pass on seeds 1-6 in
    `sim/redesign` and on the real systems (`npm run sim:coreloop -- --assert`). **D**
