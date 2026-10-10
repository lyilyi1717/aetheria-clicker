# Core loop redesign: Pump, Farm, Refine, Push

Status: proposal (2026-10-09). Owner brief: auto-generation for every subgame unlocked by New
Fields; a refinery that mixes and matches materials (the cauldron idea, not a copy of it);
ideas from other idle games, Antimatter Dimensions in particular; **simplify and remove
clutter**; keep the player busy farming somewhere for items; active play worth more than an open
idle game, which is worth more than offline; be creative.

This doc **builds on** `docs/new-systems-proposal.md`: its four Cauldrons, Vials, Mastery and
Seals all stay, each with its own job inside the new loop (§3.4, §4.5, §4.6, §6.1). It also
keeps the measured findings and the hit taxonomy from `docs/economy-v6-proposal.md`. The
simplification comes from merging the **old** tabs and currencies into the loop (§7), not from
cutting the new systems.

How the new systems divide the work, so none of them repeats another:

| System | Its one job | Fed by | Pays |
|---|---|---|---|
| **Rigs** | farm the ground behind your frontier | New Fields | Materials |
| **Orders** | tell you *where* to farm next | Materials + Crude | Fraction levels (big x-steps) |
| **Cauldrons** | a steady stream of small new perks, by playstyle | time spent in each presence state | Bubbles (add into a Fraction) |
| **Vials** | collect every single Material | one Material offered | a permanent bonus into its Field's Fraction |
| **Mixer** | discover pairs of Materials | two Materials | Compounds (named passives) |
| **Mastery** | reward doing an action again and again | using it | cheaper, stronger actions; **trains the Rigs** |
| **Seals** | the year-long ladder | Crew time, online and offline | named permanent tiers |
| **Heat** | one shared active meter | any hands-on action | x on hand actions, Flashpoint |

## 1. The problem in one line

Today: **17 tabs, ~20 currencies** (Oil, Crude Reserves, Field Shares, Pages, Talent Points,
Chrono Sand, Guild Seals, 5 gems, Stone, Gold, Void Cores, Boss Tokens, essences, Mana, scrap,
…), subgames that run dry in weeks 1-3, and wins in one tab that barely touch the others. More
systems on top would make it worse. The fix is **one loop that every tab is part of**.

## 2. The loop

```
        ┌──────────── PUSH (New Well · New Field · Chronicle) ◀──────────┐
        │                                                                │
        ▼                                                                │
   PUMP the Well ──Crude──▶ REFINE in the Refinery ──Fractions (x)──▶ everything
        ▲                     ▲            │
        │                     │ Materials  │ Orders say where to farm next
        │                     │            ▼
        └── Pressure ◀──── FARM the three Fields: Tower · Mine · Oasis
                             (you push the frontier, Rigs work the ground behind you)
```

- **Pump**: generators make Crude (the main number).
- **Farm**: the three subgames become **Fields** with one shared layout. Each yields
  **Materials**.
- **Refine**: Crude plus Materials go into the Refinery, which turns them into **Fractions**:
  five multipliers that multiply each other (the owner's D x D x D).
- **Push**: the three prestige layers on one ladder screen.

Every tab is now a step in this loop. A win anywhere is a Material, and Materials are Fraction
levels, which are multipliers on everything.

## 3. Farm: Fields, frontier and Rigs (the auto-generation)

### 3.1 One layout for all three Fields

| Field | The frontier (you, by hand) | The ground behind it | Materials |
|---|---|---|---|
| **Tower** | the next unbeaten floor | every floor below your best | Void Cores, Boss Tokens, gear |
| **Mine** | the next undug depth | every stratum above your record | stone and gems by stratum |
| **Oasis** (Garden) | the next undiscovered crop or hybrid | every crop you know | essences by species |

Materials come in **grades** set by where they were farmed: deeper strata, higher floors and
rarer crops give higher grades. Each Field has one Material line with grades, instead of the
current loose gems, stone, gold, scrap and tokens.

### 3.2 Rigs: automation unlocked by New Fields

**The rule: Rigs work the ground you've already won; only you push the frontier.**

- **New Field #1** builds the first Rig. The player picks the Field:
  - **Caravan Guards** (Tower): auto-clear floors up to a set % of your best floor.
  - **Pump Jacks** (Mine): auto-dig any stratum you've cleared; you pick which ore.
  - **Falaj** (Oasis, the traditional irrigation channel): auto-plant and harvest known crops.
- **Every later New Field**: +1 Rig, or +1 level on an existing one (reach, speed, grade).
- A Rig's grade is capped by its **reach** (a % of your frontier). **Pushing the frontier by hand
  raises what every Rig can farm.** When a Rig's reach crosses into a new grade, the haul brings a
  Material it has never brought before (an L3 moment for players who rarely push by hand). Active
  play compounds into passive income, and the player
  always has a reason to go back to the frontier.

### 3.3 Three presence states, three values

The game already knows if it's open; this makes the difference matter and keeps it honest.

| State | When | What runs | What only this state gets |
|---|---|---|---|
| **Hands-on** | an input in the last 30 s | everything, plus your own farming at 2x the average Rig rate, up to x2 more with Heat | **frontier progress**, top-grade Materials, **Heat** (§4.3), Mixer discoveries |
| **Watching** | game open, no input | Rigs at 100%, Refinery batches, generators | **Gushers**: a burst appears every few minutes; tap within 20 s for a big haul |
| **Away** | game closed | Rigs at 30% (up to 12 h), generators at the offline rate | the **return haul** count-up (Welcome Back exists) |

Target value per hour: **Hands-on ≈ 3x Watching ≈ 9x Away**. Away still always gains (rule 8:
no punishment for absence). Hands-on just gets *more*, plus the things that can only be done by
hand.

### 3.4 Mastery: you train the Rigs

Orb of Creation's mastery by use (new-systems §3.3), wired into the Fields:

- Every hands-on action has a mastery bar that fills by **doing it**: each Tower skill and boss
  type, dynamite and each pickaxe ability, harvesting each crop species, Flaring, filling each
  kind of Order. Ranks: Novice → Adept → Master → Grandmaster → Legend (rank-ups are T2, Legend
  is T3).
- Mastery makes the action **cheaper and stronger**, and **sets the Rigs' efficiency**: a
  Pump Jack digs Granite at your Granite mastery %, Caravan Guards fight a boss type at your
  mastery of it. **Active play literally teaches the automation.** That's the strongest link
  between Hands-on and Away value: an hour of hand-farming raises every future idle hour.
- Rigs earn mastery too, at a reduced rate, so a low-click player still climbs.
- Mastery never runs out: after Legend come Legend II, III, … every 25 more hours on the action;
  Legend V, X, XV, … are titles (L4).
- **Schools**: Tower (Saif), Mine (Ard), Oasis (Nakhl) and Well (Wasta). Each levels from its
  actions' mastery and gives a Field-wide bonus.
- Mastery is never reset.

## 4. Refine: the Refinery (the cauldron idea, Aetheria's way)

A refinery separates crude into fractions, so the theme hands us the mechanic. There are no bars
or bubbles. It's a **distillation tower with five trays**.

### 4.1 Fractions: the five dimensions

| Fraction | Multiplies | Fed mostly by |
|---|---|---|
| **Gas** (top tray) | everything you do by hand: taps, Heat, frontier damage and digging | Hands-on refining |
| **Naphtha** | generators (Crude) | Crude + Mine Materials |
| **Kerosene** | Tower (hero damage, Caravan Guards) | Crude + Tower Materials |
| **Diesel** | Mine (pickaxe, Pump Jacks) | Crude + Oasis Materials |
| **Bitumen** (bottom tray) | Oasis (growth, Falaj) and the Away rate | Crude + any Materials |

Total = Base x Gas x Naphtha x Kerosene x Diesel x Bitumen. Each Fraction levels up, and each
level is a **visible x-step** shown on the tower graphic. The cross-feeding is deliberate:
Naphtha (generators) needs Mine Materials, Diesel (Mine) needs Oasis Materials, and so on. **No
Field can be ignored**, and every Field lifts another.

### 4.2 Orders: always a reason to farm somewhere

- The Refinery always shows **3 Orders**, e.g. *"Kerosene batch: 40 Granite ore (grade 2) +
  12 Rose essence"*. Filling one levels its Fraction. **Orders cost Materials only**: in the sim
  a Crude price tied to current output failed right after every reset and caused 9 in 10 of the
  sessions without a hit. Crude's sink is the Well; it reaches the Fields through Pressure.
- Orders are sized to **your current frontier**: always reachable, always pointing at a specific
  Field and grade. That's "keep the user busy farming somewhere for items", with the somewhere
  named.
- One free reroll an hour. A filled Order slot refills after a few minutes, so there's a new one
  every session.
- **Weekly Ledger and Bounties fold into Orders**: a big weekly Order (about 4 hours of every
  Field's Rig output) pays a step on every Fraction and is an L4 moment.

### 4.3 Heat: one active meter for the whole game

Any hands-on action in **any** Field heats the Refinery: a tap, a kill, a tile, a harvest. Heat
multiplies everything you do by hand and refines batches faster. It cools back to normal when
you stop. It never goes below normal, so stopping costs nothing; it just stops the bonus. At
full Heat comes a **Flashpoint**: a short burst (the Frenzy moment, T2) usable in whichever Field
you're in.

**Heat replaces Combo, Frenzy, Mana and Spells** with one meter that every Field shares. One
thing to learn, and it rewards farming anywhere.

### 4.4 The Mixer: discovery by curiosity (from Little Alchemy, not from idle games)

Put **any two Materials from different Fields** into the Mixer. If a hidden recipe exists, you
discover a **Compound**: a named item with a permanent passive bonus. *Granite ore + Date
essence = "Ma'amoul Mortar"* (+Pump Jack reach); *Void Core + Oud gem = "Night Incense"*
(+Gusher frequency).

- ~40 Compounds, deterministic (no RNG; curiosity is the cost). Hints show counts: "3 Compounds
  use Granite".
- Re-making a known Compound 5 / 25 / 100 times upgrades it **Plain → Gilded → Royal**. That's a
  sink for farmed Materials and a long Completion ladder.
- **Compounds replace Alchemy recipes and catalysts.**

### 4.5 The Brewing Hall: four Cauldrons, one per presence state

The four Cauldrons from new-systems §3.1 live in the Refinery. They're re-wired so each one is
filled by a **way of playing**, which makes every presence state produce something of its own:

| Cauldron | Fills while | So it rewards |
|---|---|---|
| **Qidr of the Hand** | Hands-on (taps, Heat, frontier work) | active play |
| **Qidr of Oil** | Watching (game open) | leaving the game open |
| **Qidr of the Sands** | farming: 1/s by hand, plus 0.5/s for each working Rig | farming, including automated |
| **Qidr of Time** | Away (real time while closed) | coming back: a bubble ready on return |

- A full bar is still the one-tap choice: **brew a new Bubble** or **upgrade the Cauldron**.
- **Bubbles add into a Fraction.** Each Bubble is tagged Gas, Naphtha, Kerosene, Diesel or
  Bitumen, and its saturating effect (A·L/(B+L)) adds to that Fraction's base: Fraction =
  (1 + Σ its Bubbles) x its Order level. Bubbles are the **breadth** (many small new perks,
  steady novelty); Orders are the **depth** (big x-steps). Together they're the D x D x D: add
  within a Fraction, multiply across the five.
- Bubbles level with **Essence** (Oasis Materials), so the Garden feeds every Fraction.
- Big Bubbles go in **3 active slots**, a loadout per playstyle.
- Cauldrons fill in seconds, never in raw Material units (units grow with Pressure; in the sim that
  ran away to 1,175 Bubbles). Each 3rd Bubble opens a new **Bubble family** (L3).
- Target cadence (to be simmed): a Bubble every 30-60 min on day 0 across the four, then one or
  two a day for months. The Hand Cauldron fills fastest, so active players see the most new
  Bubbles.

### 4.6 Vials: every single Material is a collection entry

Vials (new-systems §3.2) and the Mixer split the collection cleanly: **Vials for single
Materials, Compounds for pairs.**

- Offer one Material to the Refinery for a **shown chance** to unlock its Vial, with a pity bar
  (rule 8). Every grade of every Field's Material has one: ~50 Vials from items that already
  exist.
- A Vial adds a permanent bonus into **its Field's Fraction** (Mine Vials into Diesel, and so
  on) and levels with Essence through **Clay → Glass → Crystal → Gold → Aether**.
- Higher grades only come from the frontier, so the best Vials need hands-on play.
- The Herbarium becomes the Oasis page of the Vial and Compound collection in the Codex.

## 5. Pump: the Well, with Antimatter Dimensions' best ideas

([guide](https://antimatter-dimensions.fandom.com/wiki/Guide),
[how-to](https://raw.githack.com/aarextiaokhiao/ivark.github.io/master/howto.html))

### 5.1 Cascade generators

In Antimatter Dimensions **each dimension produces the one below it**, and only the first makes
antimatter. Growth inside a run is then polynomial, so a run *accelerates*: it starts slow, then
the numbers run away from you. That's the momentum today's flat sum of generators lacks.

Aetheria version: **tier k produces tier k-1**; only the bottom slot pumps Crude. Buying the top
tier you can afford is a long-term bet that pays off over the run. Every 10 bought of a tier is
x2 (already in spirit: milestones).

**8 slots, 30 generators (from the sim).** A cascade of N tiers grows like run-time to the power N,
so a 24-tier cascade makes a day-long run 1e33x an hour-long one. Antimatter Dimensions has 8 for
that reason. The Well therefore has **8 cascade slots**, and the 30 generators are the content
that fills them: each new generator **replaces the one in a slot with a x10 stronger one**,
cycling through the slots (slot 4's Mandi Restaurant later becomes the Ghawar Oil Rig). **A new
generator unlocks when your best run ever reaches its height** (the 9th at 1e60 Crude, then every
7 orders of magnitude). Generators are never reset and arrive all year as the ceiling climbs, so
"reach the last generator" (Vision 2030) is a late-year goal. (Unlocked by reset counts, the sim
handed out all 30 by month 3 and the late year stalled.)

Two rules keep the cascade bounded (both found by the sim):
- **Price per 10 rises by 10^(3 + slot)**: the x2-per-10 bonuses must compound slower than
  prices (Σ log10(2) / price-step decades < 1), or a run blows up in finite time.
- **Global multipliers act on the bottom slot's Crude output only.** Applied to every stage they
  would be raised to the power of the slot count.

### 5.2 Flaring (Antimatter Dimensions' Dimensional Sacrifice)

**Flare** burns every generator below your top tier for a permanent (this run) multiplier on the
top tier, scaled by what you burned. An active timing decision: flare too early and you lose
momentum; flare at the right moment and the top tier jumps. A T2 moment with a real choice,
replacing the Overclock idea from economy-v6.

### 5.3 Pressure (Antimatter Dimensions' Tickspeed)

**One global speed stat**: generators, Rigs, crop timers, hero attack speed, drill rate. Bought
with Crude. **Pressure replaces the separate speed upgrades scattered across tabs** (Water All,
drill speed, growth boosts, …). One number to understand.

### 5.4 Automation is earned, not bought

In Antimatter Dimensions, autobuyers come from completing challenges. Here each automation
(Auto-Buy, Auto-Well, Auto-Flare, Auto-Order) is the reward for a short **Trial** (a run with one
rule, e.g. "reach 1e9 Crude without tier 5"). Chronicle challenges already work this way; this
makes it the rule for automation. Unlocking automation becomes a memorable moment, not a shop line.

### 5.5 Charters (Antimatter Dimensions' active / passive / idle study paths)

At each New Field pick a **Charter**: **Wildcatter** (Hands-on bonus), **Operator** (Watching
bonus, more Gushers) or **Baron** (Away bonus). Free to switch at the next New Field. **Replaces
Attunements.**

## 6. Push: one ladder screen

New Well → New Field → Chronicle on one screen, as three rings of one upgrade tree:

| Layer | Resets | Pays | Unlocks |
|---|---|---|---|
| New Well | Crude, generators, Pressure, Flare | Reserves | inner ring of the tree |
| New Field | + Reserves and the inner ring | Shares, **a Rig or Rig level**, a generator tier | middle ring, Charter pick |
| Chronicle | + Shares, Rigs' levels (not Rigs) | Pages (multiplicative, economy-v6 §4.2) | outer ring, a new Compound family, a Field rule |

Never reset by anything: Fraction levels, Bubbles, Vials, Compounds, Mastery, Seal tiers,
frontier records. The Refinery is the permanent spine beside the prestige ladder, so a reset
never feels like losing everything.

**Reserve Shop + Shard Tree + Constellations (talents) + Page upgrades become this one tree.**

Prestige rules the sim settled:
- **New Well** when it would add ≥ 25% to your Reserves. Reserves are log-scaled in run Crude.
- **New Field** shows a clear goal: a best run of 10^(50 + 3k + 8·Chronicles) Crude for the k-th
  New Field of this Chronicle. Each loop has to climb higher than the last.
- **Re-blaze**: a Chronicle starts you with Field Shares based on your lifetime Pages. Without it,
  a Chronicle dropped ~x1e7 of Shares at once and the month after it was flat (the treadmill this
  redesign set out to remove).

### 6.1 Seals of Time and the Crew

The Seals (new-systems §3.4) are the year-long ladder, now tied to the prestige ladder:

- Each New Field offers a choice: **a Rig, a Rig level, or a Crew member** (Crew slots = 1 +
  Chronicles). **One Seal opens each month** (12 month themes). Once you have Crew, every open
  Seal earns Seal-hours online and offline at 1 + 0.25 per Crew per hour, so Seals climb on a
  steady clock and Crew speed them up. The first three tiers are L3 moments; Radiant and Eternal
  are L4.
- Each Seal climbs named permanent tiers: **Unlocked → Gilded → Blessed → Radiant → Eternal**,
  each a bigger, different bonus. Target: a Seal tier every 1-2 weeks all year for a player who
  keeps Crew assigned.
- The choice is a real trade: a Rig pays Materials now, Crew pays a permanent tier later. Each
  Chronicle adds a Crew slot.
- Seals are the Away player's long game; the frontier is the active player's. Both stay open to
  everyone.

## 7. What's kept, merged and dropped

| Today | Becomes |
|---|---|
| 17 tabs | **5**: Well · Fields (Tower / Mine / Oasis switch) · Refinery (Orders, Brewing Hall, Mixer, Vials) · Prestige (ladder, tree, Seals) · Codex (achievements, Vials and Compounds collection, leaderboard, community, settings, about) |
| ~20 currencies | **Crude**, **Materials** (one graded line per Field; Oasis Materials double as Essence), **Reserves**, **Shares**, **Pages** |
| Combo, Frenzy, Mana | **Heat** and Flashpoint |
| Grimoire spells | Flashpoint abilities, levelled by **Mastery** |
| Alchemy recipes, catalysts, gem polishing | **Mixer** and Compounds; timed elixirs become Brews paid from a Cauldron bar |
| Herbarium, golden harvests | **Vials** (Oasis page) |
| Bounties, Weekly Ledger, Bazaar caravans, contracts | **Orders** |
| Bazaar prices, gold, stone, scrap, Chrono Sand | Materials and Crude (Fast Forward becomes a Gusher reward) |
| Golems, Auto-Drills, Auto-Blast | **Rigs** (efficiency set by Mastery) and **Crew** (Seals) |
| Reserve Shop, Shard Tree, Constellations, Page upgrades | **one three-ring tree** |
| Attunements | **Charters** |
| Garden speed, drill speed, Water All, etc. | **Pressure** |
| WorldLinks capped pool | **Fractions** |
| From economy-v6: Overclock | **Flaring** (Antimatter Dimensions' version, a real decision) |
| From economy-v6: multiplicative Pages, record-gated Chronicle, tiers 21-30 | **kept** |
| From new-systems: four Cauldrons, Vials, Mastery, Seals | **kept**: Cauldrons fill per presence state and feed Fractions; Vials for single Materials beside Compounds for pairs; Mastery trains the Rigs; Seals run on Crew from New Fields |

## 8. Where the hits come from (taxonomy check)

| Loop | Hits |
|---|---|
| L0 seconds | taps, Heat rising, crits, tiles, kills |
| L1 minutes | Gusher (Watching), Flashpoint (Hands-on), a Mixer try, a batch done, a Bubble level |
| **L2 the hour** | **an Order filled** (a Fraction x-step), **a new Bubble**, a Vial unlocked, a Mastery rank-up, a frontier record, a Compound discovered, a well-timed Flare |
| L3 day | New Field (Rig, Crew or Rig level + Charter + tier), Vial tier, Compound gilded, new stratum / zone / species |
| L4 week | Seal tier, big weekly Order, Trial won (new automation), Compound royal, a Legend rank |
| L5 season | Chronicle: new Compound family, Field rule, Crew slot |

Three independent clocks cover the hour: Orders (always three, sized for one session), Bubbles
(the Cauldrons fill on their own) and Mastery (fills with whatever you happen to be doing).

## 9. An hour in the new loop (low-click player, day 3)

1. Opens the game. **Return haul** counts up: Rig Materials from 8 h away, at 30%. The
   **Qidr of Time** is full: brews a new Bubble (+Kerosene).
2. Refinery: one Order is now full from the haul (Naphtha x-step, T2). Two need Mine grade-3
   ore and Oasis roses. Offers a spare Obsidian ore: **Vial unlocked** (32% chance shown).
3. Goes to the Mine, digs the frontier for 3 minutes. **Heat** climbs; Dynamite mastery hits
   **Adept**, so the Pump Jacks now dig faster. A new depth record raises their reach. Back to
   the Refinery: tries Granite + Rose in the Mixer, and **discovers a Compound**.
4. Leaves the game open on the Well (**Watching**): the Qidr of Oil fills. Two **Gushers** pop
   over the next 15 min; taps one.
5. Flares when the top tier's bar says x8, then closes the game. The Crew keeps earning
   Seal hours.

About eight taps of real decisions, and six hits (Bubble, Order, Vial, rank-up, record,
Compound) plus two Gushers, in under 10 minutes of attention.

## 9b. Simulated (sim/redesign/)

The loop is modelled end to end in `sim/redesign/` (`node sim/redesign/run.mjs --assert`) for four
players: active (2 x 45 min a day + an afternoon open), casual (10 min every waking hour), idle
(2 min every 2 hours) and open (game open all day, 10 min hands-on). On seeds 1-6 every target
passes: every session after day 1 has a big hit; hands-on play never goes 60 min without one
(10-34 min); something new (L3) at most every 3 days (1-2.8 d); a weekly-scale moment (L4) at most
every 14 days (7-9 d); Hands-on ≈ 2.5-4x Watching ≈ 2.3-3.3x Away; best run rises every month and a
new x10 record comes at least every 30 days (19-23 d). Best run, month 1 → 12: 1e74-1e93 → 1e191-
1e250. Several rules in this doc came from the sim; its tuning log lists them.

Open concern the sim surfaced: Orders carry many of the hourly hits. (Bubbles came ~8,000 a year;
retuned to about 800, each six times bigger, by owner decision 4.)

## 10. Risks and what has to be proven first

- **This is a MAJOR rework**: a save conversion (old currencies to Materials, Golems to Rigs,
  trees merged), with a migration step and tests (rule 2). It needs owner sign-off on scope.
- **Cascade generators change the economy completely.** The core sim has to be rebuilt for
  cascade production and Flaring before any numbers are picked; the hit-cadence report (`--feel`,
  `--timeline`) and the year-one targets still apply.
- **Orders need a generator** that sizes them to the player's frontier. A sim of Order cadence
  (an Order fillable within one session) comes before UI.
- **Arabic**: every new name (Fractions, Compounds, Rigs, Charters) needs an Arabic name
  (rule 11). Fraction names have standard Arabic terms.

## 11. Suggested phases

1. **Shell**: 5 tabs, currencies folded into Materials, Rigs replacing Golems and drills, the
   three presence states. Feels simpler on day one; economy unchanged.
2. **Refinery core**: Fractions and Orders (replaces WorldLinks, Bounties, Bazaar).
3. **Brewing Hall**: the four Cauldrons and Bubbles feeding the Fractions (sim the Bubble
   cadence first).
4. **Mastery**, wired to Rig efficiency; then **Vials**, the **Mixer** and Compounds (replaces
   Alchemy and the Herbarium).
5. **Well**: cascade generators, Flaring, Pressure, Trials for automation (sim first).
6. **Heat**: replaces Combo, Frenzy and Mana; spells become Flashpoint abilities.
7. **One tree**, Charters, **Crew and Seals**; the old trees converted.
