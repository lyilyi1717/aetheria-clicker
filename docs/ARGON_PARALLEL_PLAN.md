# Master Parallel Execution Plan: The Subterranean Triad (Argon Model)

> **Document:** Master Parallel Execution Plan & Decoupled Workstream Roadmap  
> **Source Blueprint:** `C:\Users\BigB\dev\game desgin\mobile-game-success-model.md`  
> **Target System:** Digger Argon Engine (`C:\Users\BigB\dev\digger-argon\`)  
> **Mirrored To:** `C:\Users\BigB\dev\clicker\docs\ARGON_PARALLEL_PLAN.md`  
> **Verification Command:** `node run_tests.mjs` (All unit tests green in < 5s)  
> **Architecture Principle:** 100% Decoupled Workstreams for Zero-Conflict Parallel Subagent Fanning Out

---

## 0. Executive Synthesis & Architectural Blueprint

The master game design document (`mobile-game-success-model.md`) establishes the **Subterranean Triad**:
1. **Layer 1 — The Floor (The 9 Mobile Non-Negotiables):** Instant tactile engagement within 10 seconds, single-thumb drag-hold rhythm flow, frictionless retry with Gate Ghost Memory (60% banked damage), and peak-moment celebration ("Yalla!" Fever Mode).
2. **Layer 2 — The Ceiling (Bounded Economy & Non-Predatory Progression):** A strictly bounded three-tier economy ($10^9$ run coins, $10^{15}$ meta-stars, discrete Era Keystones), with rich environmental physics (hydraulics, magma kilns) and zero pay-to-skip dark patterns.
3. **Layer 3 — The Asset Engine (Unbounded Irrational Value & Belonging):** The engine of long-term 365-day retention. Players own graded antiquities (PSA-Style Gem Mint 10 vs Weathered 7), bond with specialized Rafeeq companions (Naqqab, Baroodi, Ghawwas, Muhandis), share viral daily run cards ("Wordle of Mining"), and collaborate on the Global Subterranean Borehole.

```
+---------------------------------------------------------------------------------------+
|                       THE 3-LAYER SUBTERRANEAN SUCCESS TRIAD                          |
+---------------------------------------------------------------------------------------+
| LAYER 3 — THE ASSET ENGINE (Ownership, Craftsmanship & Community)                     |
|   * Museum PSA-Style Condition Grading (PSA 10 Gem Mint vs Grade 7 Weathered)         |
|   * Living Caravan: Rafeeq Specializations (Naqqab, Baroodi, Ghawwas, Muhandis)       |
|   * Social Tokens: Shareable Daily Dig Run Cards & Global Subterranean Borehole       |
|   * Celestial Restoration: Rebuilding Grandpa's Lost Astrolabe Caravan Engine        |
+---------------------------------------------------------------------------------------+
| LAYER 2 — THE CEILING (Bounded Economy & Macro-Progression)                           |
|   * Bounded Three-Tier Economy ($10^9$ Local Coins | $10^{15}$ Stars | Era Keystones) |
|   * Hydraulic Sluices & Thermal Basalt Kilns (Water Flow, Obsidian Cleaving, Heat)    |
|   * Ethical Patron Passes & Permanent Museum Wing Sponsorships                        |
+---------------------------------------------------------------------------------------+
| LAYER 1 — THE FLOOR (The 9 Mobile Non-Negotiables & Kinetic Juice)                    |
|   * One-Thumb Rhythmic Drag-Hold Groove (16-Step Sequencer @ 100–160 BPM)             |
|   * Gate Ghost Memory (60% Banked Damage & Persistent Fracture Visuals)               |
|   * "Yalla!" Fever Mode (Darbuka Double-Time, Gold Arabesque Border, Overkill Sand)   |
|   * Tactile Haptic Hierarchy (T0–T3) & Pentatonic Audio Scale Chimes (<16ms)          |
+---------------------------------------------------------------------------------------+
```

---

## 1. Decoupled Parallel Execution Architecture (Zero Merge Conflicts)

To enable multiple subagents to implement this blueprint in parallel without git merge collisions or file locks, the implementation is partitioned into **4 strictly isolated Workstreams**:

```
+------------------------------------------------------------------------------------+
|                       PARALLEL WORKSTREAM ISOLATION MATRIX                         |
+--------------------+--------------------------------+------------------------------+
| WORKSTREAM         | CORE DOMAIN / LAYER            | EXCLUSIVE FILE BOUNDARIES    |
+--------------------+--------------------------------+------------------------------+
| **Workstream A**   | Layer 1: Kinetic Juice &       | `proto/features/picks/`      |
| Rhythm & Feedback  | Rhythmic Mastery               | `proto/features/boss/`       |
| (Issues A1, A2, A3)| (M1, M2, M5)                   | `test_proto_rhythm_groove.js`|
+--------------------+--------------------------------+------------------------------+
| **Workstream B**   | Layer 3: Living Caravan &      | `proto/features/museum/`     |
| Antiquity Assets   | Antiquity Asset Engine         | `proto/features/antiquities/`|
| (Issues B1, B2)    | (M6, M8)                       | `proto/features/guilds/`     |
|                    |                                | `proto/features/rafeeqs/`    |
|                    |                                | `test_proto_museum_grading.js`|
+--------------------+--------------------------------+------------------------------+
| **Workstream C**   | Layer 3: Social Tokens &       | `proto/features/runcard/`    |
| Virality & Global  | Community Virality             | `proto/features/borehole/`   |
| (Issues C1, C2)    | (M7, M11)                      | `test_proto_runcard.js`      |
|                    |                                | `test_proto_borehole.js`     |
+--------------------+--------------------------------+------------------------------+
| **Workstream D**   | Layer 2: Macro-Progression &   | `proto/features/aquifers/`   |
| Environmental Deep | Environmental Depth            | `proto/features/geothermal/` |
| (Issues D1, D2)    | (M9, M12)                      | `proto/features/cradle/`     |
|                    |                                | `proto/features/astral/`     |
|                    |                                | `test_proto_hydraulic_celestial.js`|
+--------------------+--------------------------------+------------------------------+
```

Each workstream operates on a distinct set of feature directories under `proto/features/`. Central registries (`proto/features/index.js` and `proto/features/ui.js`) maintain simple, alphabetical one-line entries for each feature.

---

## 2. Detailed Workstream Specifications

---

### Workstream A: Kinetic Juice & Rhythmic Mastery (Layer 1 Floor)

#### Issue A1 (M1): One-Thumb Rhythmic Drag-Hold Groove
* **Layer:** Layer 1 (The Floor)
* **Psychology Driver:** Flow State, Motor Immediacy, Zero Fatigue
* **Objective:**
  Elevate pick swinging from frantic, fatigue-inducing screen tapping into an effortless musical groove. The player holds their thumb on the screen to activate continuous rhythmic digging governed by the 16-step musical sequencer (`picksSeq` in `beat.js`). The pick strikes in rhythmic sync with sixteenth notes at 100–160 BPM. Dragging guides the pick smoothly through sand, ore, and rock.
* **Exact Files to Modify / Create:**
  - `proto/features/picks/beat.js` (Refine 16-step bar accents, tempo interpolation 100–160 BPM)
  - `proto/features/picks/rules.js` (Rhythmic drag-hold swing dispatch, timing window evaluation)
  - `proto/features/picks/ui.js` (Touch drag-hold gesture handling, thumb position tracking)
  - `proto/features/picks/picks.css` (Visual groove ripple styling)
  - `proto/features/picks/strings.js` (Bilingual string entries)
* **Step-by-Step Technical Algorithm:**
  1. **Touch Drag-Hold Listener:** In `picks/ui.js`, capture `pointerdown`, `pointermove`, and `pointerup`. On `pointerdown`, set `state.isHolding = true` and record target block coordinates `(row, col)`.
  2. **16-Step Sequencer Synchronization:** Every animation frame, calculate current sixteenth-note step:
     $$\text{stepIndex} = \left\lfloor \frac{\text{audioClock}}{\frac{15}{\text{BPM}}} \right\rfloor \pmod{16}$$
  3. **Accented Hit Window:** Check if current step corresponds to an accented beat (`'X'`). If the player swings within $\pm 100\text{ms}$ of an accented beat:
     - Apply $1.5\times$ to $2.5\times$ "Good Hit" damage multiplier.
     - Emit `goodHit` event, incrementing `s.picks.accentStreak`.
     - Spawn golden sparkle particles at block impact coordinates.
  4. **Smooth Directional Dragging:** As the thumb slides across the screen, update target excavation column without resetting the beat clock.
  5. **Multitier Mobile Haptic Feedback:**
     - T0 (Soft Dirt): 10 ms subtle tactile tick.
     - T1 (Hard Rock / Ore): 25 ms crisp impact tap.
     - T2 (Crack / Crit): Heavy double-pulse.
     - T3 (Gate Shatter): 350 ms resonant rumble wave.
* **Acceptance Criteria & Unit Tests (`test_proto_rhythm_groove.js`):**
  - Continuous drag-hold executes strikes strictly in sync with the 16-step grid.
  - Accented hits within the $\pm 100\text{ms}$ window register as Good Hits with damage multipliers.
  - Dragging thumb across columns smoothly re-targets the swing vector.
  - Zero performance stutters; timing calculations run in $< 0.1\text{ms}$.

---

#### Issue A2 (M2): Gate Ghost Memory & 60% Banked Damage Indicator
* **Layer:** Layer 1 (The Floor)
* **Psychology Driver:** Loss Aversion Removal, Frictionless Retry, Visible Sunk Investment
* **Objective:**
  Eliminate the frustration of failing a Big Rock Gate encounter. When a player retreats or times out, **60% of all inflicted damage is permanently banked into the Gate** (`boss.gateShare = 0.6`). On subsequent attempts, the Gate visibly spawns pre-fractured, displaying a luminous "Ghost Tick" marker (`gateGhostX` / `gateBestPct`) at the deepest damage point previously reached.
* **Exact Files to Modify / Create:**
  - `proto/features/boss/rules.js` (Ensure `gateShare: 0.6`, `gateCap: 0.9` persistence across site re-entries)
  - `proto/features/boss/ui.js` (Render luminous Ghost Tick vertical line and pre-fractured sprite overlays)
  - `proto/features/boss/swings.js` (Accurate swing estimations taking banked damage into account)
  - `proto/features/boss/strings.js` (Hakawati cultural consolation dialogue for repeated retreats)
* **Step-by-Step Technical Algorithm:**
  1. **Damage Banking on Retreat:** When a site run ends before the Gate is broken:
     $$\text{bankedDamage} = \text{damageDealt} \times 0.60$$
     $$\text{s.run.gateBestPct} = \max\left(\text{s.run.gateBestPct} \mathbin{||} 0, \; \text{round}\left(\frac{\text{bankedDamage}}{\text{gateMaxHp}} \times 100\right)\right)$$
  2. **Pre-Fractured State Initialization:** When the player returns to the Gate, initialize Gate current HP to:
     $$\text{gateHp} = \text{gateMaxHp} - \text{bankedDamage}$$
  3. **Visual Ghost Tick Marker:** In `boss/ui.js`, draw a high-contrast 2px golden/white vertical indicator line on the Gate HP bar at:
     $$x = \text{barWidth} \times \left(\frac{\text{gateBestPct}}{100}\right)$$
     Annotate with badge text: `"Best: N%"`.
  4. **Stepped Rubble Chimes:** Rubble shedding every 10% steps up monotonically in pitch:
     $$\text{frequency} = \text{baseFreq} \cdot 2^{(\text{tenth} / 12)}$$
  5. **Hakawati Consolation Trigger:** If `stuckTries >= 2`, trigger Alqahwa campfire dialogue: *"Grandpa failed that very basalt gate twice before he learned to bring the water bucket. Drink your tea; the mountain is not running away."*
* **Acceptance Criteria & Unit Tests (`test_proto_rhythm_groove.js`):**
  - Retreating from a Gate at 50% damage banks exactly 30% HP (60% of 50%).
  - Next entry spawns the Gate with reduced HP and visible Ghost Tick marker at 30%.
  - Zero loss of collected coins, relics, or fossils on retreat.
  - Consolation dialogue triggers on the second retreat.

---

#### Issue A3 (M5): "Yalla!" Fever Mode
* **Layer:** Layer 1 (The Floor)
* **Psychology Driver:** Peak-End Rule, Sensory Crescendo, Flow Climax
* **Objective:**
  Provide an explosive dopamine peak every 1–2 minutes of rhythmic mastery. Landing 20 consecutive Good Hits fills the circular Fever Gauge and ignites **Fever ("Yalla!")** for 8 seconds (20 seconds in extended mode). The screen border ignites in glowing gold Arabesque filigree, percussion kicks into high-tempo darbuka rolls, crew members shout *"YALLA!"*, and pick strikes trigger **Overkill Sand-Bursts**, vaporizing adjacent soft blocks.
* **Exact Files to Modify / Create:**
  - `proto/features/picks/rules.js` (Fever gauge charging, active timer countdown, overkill trigger)
  - `proto/features/picks/ui.js` (Golden Arabesque frame overlay canvas, double-time beat trigger)
  - `proto/features/picks/picks.css` (Screen flash, golden border animations)
  - `proto/core/rules.js` (Overkill sand-burst radius calculation and multi-block shatter)
  - `proto/ui/audio.js` (Darbuka roll sample / synthetic polyrhythmic drum acceleration)
* **Step-by-Step Technical Algorithm:**
  1. **Gauge Accumulation:** Each on-beat Good Hit increments `s.picks.feverStreak`. Upon reaching 20:
     - Set `s.picks.feverActive = true` and `s.picks.feverTimer = 8.0` (or 20.0s).
     - Reset `s.picks.feverStreak = 0`.
  2. **Sensory Flourish:**
     - Render radiating Arabesque filigree border around the viewport.
     - Dispatch audio event: Play vocal *"YALLA!"* cheer and accelerate drum kit tempo.
     - Screen shake (2px subtle vibration) and ambient gold particle drift.
  3. **Mechanical Payoff During Fever:**
     - Pick swing rate multiplied by $2.0\times$.
     - Critical hit chance locked at $100\%$.
     - **Overkill Sand-Burst:** When pick damage exceeds cell HP, residual shockwave deals $50\%$ damage to all adjacent orthogonal cells (`(r±1, c)`, `(r, c±1)`), vaporizing soft sand blocks instantly.
  4. **Clean Expiration:** When `feverTimer` reaches 0, smoothly fade out filigree border and restore standard tempo without audio clipping or UI stutter.
* **Acceptance Criteria & Unit Tests (`test_proto_rhythm_groove.js`):**
  - 20 consecutive on-beat hits cleanly trigger Fever mode.
  - Fever timer decrements accurately during play and expires after duration.
  - Overkill Sand-Burst correctly propagates damage to orthogonal neighbor cells.
  - Arabesque frame UI renders cleanly and dismisses upon expiration.

---

### Workstream B: Living Caravan & Antiquity Asset Engine (Layer 3 Asset)

#### Issue B1 (M6): Museum PSA-Style Condition Grading & Restoration Lab
* **Layer:** Layer 3 (The Asset Engine)
* **Psychology Driver:** Endowment Effect, Craftsmanship, Status Showcase, Collector Obsession
* **Objective:**
  Elevate unearthed fossils from dry numerical counters (+1 Bone) into **graded physical specimens**. Fossil condition ranges from **Grade 10 (PSA 10 Gem Mint)** to **Grade 7 (Weathered / Fractured)**, determined by excavation precision. Weathered fossils can be restored in the Alqahwa Restoration Lab via a tactile brush-and-chisel minigame. Restored masterpieces unlock equippable Antiquity powers in 3 active loadout slots.
* **Exact Files to Modify / Create:**
  - `proto/features/museum/rules.js` (Specimen grading data model, excavation condition tracking)
  - `proto/features/museum/ui.js` (Graded slab visual display: Gem Mint gold badge, silver Mint, bronze Weathered)
  - `proto/features/museum/strings.js` (Bilingual grading labels and Hakawati lore notes)
  - `proto/features/antiquities/rules.js` (Active antiquity socketing: 3 equipment slots, active buffs)
  - `proto/features/antiquities/ui.js` (Restoration minigame: tactile dust-brushing canvas, socket drawer)
  - `proto/features/antiquities/antiquities.css` (Slab styling, velvet display case aesthetics)
* **Step-by-Step Technical Algorithm:**
  1. **Excavation Condition Physics:** When a fossil block is broken in `museum/rules.js`:
     - If broken with a **fine pick tip on an accented beat** (Good Hit) $\rightarrow$ assign **Grade 10 (Gem Mint)**.
     - If broken with a standard pick swing $\rightarrow$ assign **Grade 9 (Mint)**.
     - If broken with multiple chipped swings ($> 2$ hits) $\rightarrow$ assign **Grade 8 (Near Mint)**.
     - If obliterated by collateral **TNT shockwaves** $\rightarrow$ assign **Grade 7 (Weathered / Fractured)**.
  2. **Specimen Data Structure:**
     ```javascript
     s.museum.specimens[fossilId] = {
       id: fossilId,
       grade: 10,           // 10, 9, 8, or 7
       clean: true,         // true if broken without explosive damage
       restored: false,     // true if restored in Alqahwa lab
       excavatedAt: Date.now()
     };
     ```
  3. **Alqahwa Restoration Minigame:**
     - For Grade 7/8 specimens, opening the specimen in Alqahwa presents a 100x100 restoration canvas.
     - The player performs 5 tactile brush strokes across encrusted rock.
     - Each stroke clears $20\%$ debris with crisp brushing SFX.
     - Completing the minigame elevates the specimen condition to **Grade 9 (Restored Mint)**.
  4. **Active Antiquity Powers:** Completing a full restored set unlocks its active Antiquity:
     - *The Scarab Compass:* Illuminates all hidden chests and rare ore on the active level.
     - *The Obsidian Siphon:* Diverts $5\%$ of all TNT blast energy directly into the Big Rock Gate.
     - *The Golden Mortar:* Triples Rafeeq swing speed for 15 seconds after any Big Rock breach.
* **Acceptance Criteria & Unit Tests (`test_proto_museum_grading.js`):**
  - Clean on-beat pick strikes award PSA 10 Gem Mint specimens.
  - TNT blasts award Grade 7 Weathered specimens.
  - Restoration minigame successfully elevates Grade 7 to Grade 9.
  - Restored Antiquities can be equipped into 3 active slots and apply registered gameplay modifiers.

---

#### Issue B2 (M8): Rafeeq Specialized Callings & Camaraderie
* **Layer:** Layer 3 (The Asset Engine)
* **Psychology Driver:** Emotional Bonding, Crew Attachment, Strategic Synergy
* **Objective:**
  Transform the 8 Rafeeq crew seats from generic automated diggers into beloved, specialized companions. Players assign one of **4 architectural Callings** (*Naqqab, Baroodi, Ghawwas, Muhandis*) at the Alqahwa Guild Hall. Each Rafeeq tracks a permanent lifetime ledger (blocks broken, relics discovered, favorite tea). Pairing complementary Callings unlocks powerful squad synergies.
* **Exact Files to Modify / Create:**
  - `proto/features/guilds/rules.js` (Calling definitions, synergy calculations, squad bonuses)
  - `proto/features/guilds/ui.js` (Guild Hall UI drawer, Calling assignment badges)
  - `proto/features/guilds/strings.js` (Calling lore, titles, Arabic honorifics)
  - `proto/features/rafeeqs/rules.js` (Lifetime ledger tracking: `blocksBroken`, `relicsFound`, `traits`)
  - `proto/features/rafeeqs/ui.js` (Companion dossier modal, campfire dialogue)
* **Step-by-Step Technical Algorithm:**
  1. **The 4 Specialized Callings:**
     - **Naqqab (The Breaker):** Strikes focus exclusively on Big Rock glowing cracks (+100% crack critical damage).
     - **Baroodi (The Pyrotechnician):** Doubles TNT explosion radius and directs blast propagation vectors downward.
     - **Ghawwas (The Prospector):** Sifts broken rubble for bonus fossils, gems, and amber (+50% fossil drop rate).
     - **Muhandis (The Engineer):** Erects structural scaffolding in dark layers, automatically planting lanterns and preventing living rock regrowth.
  2. **Synergy Squad Combos:**
     - *Naqqab + Baroodi (The Breaching Charge):* Gate arrival instantly deals a pre-emptive $10\%$ blast to the Gate.
     - *Ghawwas + Muhandis (The Deep Dredge):* Reveals unexcavated fossil locations within a 4-block radius of any lantern.
  3. **Rafeeq Lifetime Ledger:**
     ```javascript
     s.rafeeqs.roster[seatId] = {
       name: 'Tariq',
       calling: 'baroodi',
       trait: 'Eager',
       lifetimeBlocks: 3420,
       relicsDiscovered: 4,
       joinedAtLevel: 2
     };
     ```
* **Acceptance Criteria & Unit Tests (`test_proto_museum_grading.js`):**
  - Callings can be freely assigned and swapped at Alqahwa Guild Hall.
  - Naqqab delivers $+100\%$ bonus damage to Big Rock cracks.
  - Baroodi modifies TNT blast propagation vectors downward.
  - Roster ledger increments lifetime stats accurately across excavation runs.

---

### Workstream C: Social Tokens & Community Virality (Layer 3 Asset)

#### Issue C1 (M7): Shareable Daily Dig Run Cards ("The Wordle of Mining")
* **Layer:** Layer 3 (The Asset Engine)
* **Psychology Driver:** Social Proof, Status Display, Friendly Comparison, Zero-Cost Virality
* **Objective:**
  Implement the daily social loop inspired by *Wordle* and *Banana*. Every day opens a unique **Daily Expedition Site** generated from a deterministic date seed (`YYYY-MM-DD`). Upon run conclusion, the game generates a sleek 600x600 high-contrast visual graphic card summarizing the expedition (depth, swings, medal, fossil condition, and path glyphs). Players share this card directly to Twitter, Discord, WhatsApp, or Reddit with a single tap.
* **Exact Files to Modify / Create:**
  - `proto/features/runcard/rules.js` (Daily expedition seed generation, run telemetry aggregation)
  - `proto/features/runcard/canvas.js` (Headless 600x600 canvas card renderer with high-contrast badge aesthetics)
  - `proto/features/runcard/ui.js` (Run summary modal, "Share Card" button, Web Share API / clipboard copy)
  - `proto/features/runcard/strings.js` (Bilingual share text, Hakawati proverbs)
  - `proto/features/runcard/runcard.css` (Modal styling, card preview layout)
* **Step-by-Step Technical Algorithm:**
  1. **Seeded Daily Expedition:** In `runcard/rules.js`, hash current UTC date string `YYYY-MM-DD` into a 32-bit integer seed for deterministic terrain, ore, and fossil generation.
  2. **Run Telemetry Recording:** Track metrics throughout the daily run:
     - `depthReached`: Final metre depth.
     - `swingsTaken`: Total pick strikes.
     - `maxTntChain`: Highest musical TNT chain achieved.
     - `bestSpecimen`: Highest graded fossil discovered (e.g., "PSA 10 Whale").
     - `pathGlyphs`: 4x4 matrix of block type emojis/glyphs representing the descent path:
       `[D] [D] [O] [*]`  
       `[~] [~] [B] [~]`  
       `[!] [!] [!] [!]`  
       `[= GATE DOWN =]`
  3. **Canvas Card Rendering (`runcard/canvas.js`):**
     - Dimensions: 600x600 pixels, dark desert obsidian background (`#12100e`).
     - Ornate golden border with Arabic corner geometric flourishes.
     - Header: `"AETHERIA: THE DAILY DIG #N"` with depth and medal rank badge.
     - Center: Render the 4x4 descent path glyph matrix and run statistics.
     - Footer: Hakawati proverb quote and clean URL (`aetheria.dev/dig`).
  4. **Single-Tap Sharing:**
     - If `navigator.share` is supported, share image blob directly.
     - Fallback: Copy formatted text summary and base64 PNG image to system clipboard.
* **Acceptance Criteria & Unit Tests (`test_proto_runcard.js`):**
  - Same calendar date generates identical daily excavation seeds.
  - Telemetry aggregator accurately calculates swings, chains, and best specimen grade.
  - Card generator outputs valid 600x600 image canvas and formatted text snippet.
  - Web Share API and clipboard copy fallbacks operate without console errors.

---

#### Issue C2 (M11): Global Subterranean Borehole Tracker
* **Layer:** Layer 3 (The Asset Engine)
* **Psychology Driver:** Collective Belonging, Macro-Cooperation, Global Movement
* **Objective:**
  Connect individual single-player excavations into a massive, collaborative global mega-project: **The Global Subterranean Borehole**. Every metre excavated by any player worldwide contributes to drilling toward the Earth's Core. Mileposts (1 Million, 10 Million, 100 Million metres) unlock universal Alqahwa cosmetic festivals, community-designed pick skins, and rare Hakawati story chapters for all players.
* **Exact Files to Modify / Create:**
  - `proto/features/borehole/rules.js` (Global depth telemetry, local offline contribution buffering, milestone unlock checks)
  - `proto/features/borehole/ui.js` (Borehole monument widget at Alqahwa, live progress bar, milestone celebrations)
  - `proto/features/borehole/strings.js` (Bilingual celebration banners, global status announcements)
  - `proto/features/borehole/borehole.css` (Monument graphics, depth counter animation)
* **Step-by-Step Technical Algorithm:**
  1. **Local Contribution Accumulator:** In `borehole/rules.js`, every broken block adds to `s.borehole.pendingMetres`.
  2. **Global Sync Engine:** When connected, sync buffered metres to global endpoint (or deterministic simulated global progression during offline play):
     $$\text{globalDepth} = \text{baseDepth} + \text{globalSimRate} \cdot (\text{currentTime} - \text{epochTime}) + \text{playerContribution}$$
  3. **Milestone Verification:**
     - 1,000,000m: Unlocks *The Lantern of the Deep* pick skin.
     - 10,000,000m: Unlocks *The Golden Sieve Festival* at Alqahwa.
     - 100,000,000m: Unlocks *The Lost Scroll of the Core* Hakawati chronicle.
  4. **UI Monument at Alqahwa:** Render a towering brass drill shaft with animated depth counter, showcasing recent global contributors and the active community milestone.
* **Acceptance Criteria & Unit Tests (`test_proto_borehole.js`):**
  - Excavated blocks reliably increment player contribution ledger.
  - Milestones trigger universal rewards and unlock event flags when reached.
  - Alqahwa widget displays animated depth counter with bilingual text formatting.

---

### Workstream D: Environmental Depth & Macro-Progression (Layer 2 Ceiling)

#### Issue D1 (M9): Hydraulic Sluices & Thermal Basalt Kilns
* **Layer:** Layer 2 (The Ceiling)
* **Psychology Driver:** Emergent Physics, Tactical Variety, Discovery Delight
* **Objective:**
  Expand the excavation space into a living, responsive geological environment. In the Sunken Aquifers (Chapter 3), breaking pressurized wells releases cascading water channels that erode soft silt downhill, powering the *Waterwheel Sieve* ($3\times$ coin multiplier). In the Geothermal Kiln (Chapter 4), diverting water channels into molten lava quenches basalt into brittle **Obsidian Glass**, which cleaves entire horizontal rows when struck.
* **Exact Files to Modify / Create:**
  - `proto/features/aquifers/rules.js` (Fluid cellular automaton, water pressure propagation, silt erosion)
  - `proto/features/aquifers/ui.js` (Water flow particle rendering, waterwheel animations)
  - `proto/features/aquifers/aquifers.css` (Water channel styling)
  - `proto/features/geothermal/rules.js` (Lava-water quenching into Obsidian Glass, heat accumulation meter)
  - `proto/features/geothermal/ui.js` (Lava cooling steam particles, Magma Burst pick glow)
* **Step-by-Step Technical Algorithm:**
  1. **Aquifer Cellular Automaton:** Water moves down if cell below is empty; spreads horizontally (left/right) if blocked below.
  2. **Silt Erosion:** Blocks of type `BLOCKS.SILT` dissolve instantly upon contact with moving water.
  3. **Waterwheel Sieve Bonus:** Any rubble or coin falling through an active water stream awards $3\times$ coins.
  4. **Thermal Quenching Reaction:** When a cell of type `BLOCKS.LAVA` is adjacent to an active water stream:
     - Replace cell with `BLOCKS.OBSIDIAN`.
     - Emit steam puff particle event and hissing quench audio.
  5. **Obsidian Glass Cleave:** Striking an obsidian block shatters all stone blocks in that entire horizontal row.
  6. **Heat Storage & Magma Burst:** Striking hot basalt blocks adds $+5$ Heat to the pick meter. At 100 Heat, the next 10 swings activate **Magma Burst**, destroying a $3\times 3$ area per hit.
* **Acceptance Criteria & Unit Tests (`test_proto_hydraulic_celestial.js`):**
  - Breaching a water well propagates water downwards and sideways into open spaces.
  - Silt dissolves instantly on water contact.
  - Lava adjacent to water transforms into obsidian blocks.
  - Striking obsidian blocks cleaves the entire horizontal row.
  - Heat reaches 100 and powers 10 Magma Burst swings ($3\times 3$ cleave).

---

#### Issue D2 (M12): Celestial Astrolabe Engine & The Cosmic Cradle
* **Layer:** Layer 2 (The Ceiling) & Layer 3 (The Asset Engine)
* **Psychology Driver:** Narrative Closure, Ultimate Mastery, Infinite Horizon
* **Objective:**
  Deliver the grand 365-day narrative and mechanical climax. Across Months 1 through 12, the player discovers the 12 dispersed components of **Grandpa's Celestial Astrolabe Engine** (Grandpa's Camel Bell at Lvl 20, Abandoned Outpost at Lvl 40, Horizon Ring, Gnomon, Gyroscope). In Month 12, assembling all 12 Keystones at the Earth's Core awakens **The Cosmic Cradle**, granting the numbered **Master Architect Token** and unlocking the **Eternal Horizon** (infinite procedural starlight vault expeditions).
* **Exact Files to Modify / Create:**
  - `proto/features/cradle/rules.js` (12 Keystones assembly ritual, Eternal Horizon procedural generator)
  - `proto/features/cradle/ui.js` (Grand Engine assembly animation, starlight vault map)
  - `proto/features/cradle/strings.js` (Climax narrative chronicle, Hakawati finale dialogue)
  - `proto/features/cradle/cradle.css` (Cosmic Cradle golden celestial styling)
  - `proto/features/astral/rules.js` (Inverted gravity physics: rubble floats upward, magnetic pick)
* **Step-by-Step Technical Algorithm:**
  1. **Keystone Collection Check:** Verify player has acquired all 12 Era Keystones:
     `[aquifer, magma, cog, spore, acoustic, prism, meteor, astral, void, chrono, solar, celestial]`.
  2. **Grand Engine Assembly Ritual:** At Level 240 (Earth's Core), interacting with the central pedestal initiates the restoration sequence:
     - Each Keystone slots into the Astrolabe Engine with an escalating orchestral chime.
     - Emits `engineAwakened` event; unlocks the **Cosmic Cradle** wonder structure.
  3. **Master Architect Token:** Issue an immutable player badge:
     `s.cradle.architectToken = { id: '#0042', awardedAt: Date.now(), title: 'Master Astrolabe Architect' }`.
  4. **The Eternal Horizon:** Unlocks procedural infinite expeditions beyond Level 240 featuring dynamic contract modifiers (e.g., zero-gravity, double-time rhythm, darkness).
* **Acceptance Criteria & Unit Tests (`test_proto_hydraulic_celestial.js`):**
  - Assembly ritual verifies presence of all 12 Keystones.
  - Restoring the Engine grants the Master Architect Token.
  - Unlocks the Eternal Horizon procedural expedition mode.
  - Inverted gravity physics correctly causes rubble to float upward.

---

## 3. Parallel Execution & Subagent Fanning-Out Instructions

To implement all 4 workstreams concurrently without file conflicts or cross-agent interference, follow these operational rules:

### Subagent Allocation & Model Tiering

```
+----------------+--------------------+-------------+------------------------------------+
| WORKSTREAM     | ASSIGNED ROLE      | MODEL TIER  | PRIMARY OBJECTIVE                  |
+----------------+--------------------+-------------+------------------------------------+
| Workstream A   | Kinetic Rhythm Eng | `pro`       | Implement M1, M2, M5 in picks/boss |
| Workstream B   | Antiquity Curator  | `pro`       | Implement M6, M8 in museum/guilds  |
| Workstream C   | Virality Engineer  | `pro`       | Implement M7, M11 in runcard/bore  |
| Workstream D   | Geological Architect| `pro`      | Implement M9, M12 in aquifers/cradle|
+----------------+--------------------+-------------+------------------------------------+
```

### Git Branch & Workspace Isolation Rules

1. **Independent Feature Folders:** Each subagent works exclusively within its designated feature directories (`proto/features/<assigned_features>/`).
2. **Dedicated Unit Test Suites:** Each subagent implements and runs its dedicated test file:
   - Workstream A: `test_proto_rhythm_groove.js`
   - Workstream B: `test_proto_museum_grading.js`
   - Workstream C: `test_proto_runcard.js` and `test_proto_borehole.js`
   - Workstream D: `test_proto_hydraulic_celestial.js`
3. **Registry Discipline:** New features are added in alphabetical order to `proto/features/index.js` and `proto/features/ui.js`.
4. **Verification Gate:** Before completion, every subagent must confirm:
   ```bash
   node run_tests.mjs
   ```
   All test suites must pass 100% green with zero regressions.

---

*Authored by the Lead Master Blueprint Planner (Argon).*  
*Approved for immediate parallel fanning out across independent subagents.*
