# Dig: 365-Day Long-Term Pacing & Progression Architecture
**Date:** 14 October 2026  
**Role:** Pacing & Retention Systems Architect  
**Scope:** `proto/`, `docs/dig-pacing.md`, `docs/dig-design.md`, `sim/proto/`  
**Target:** 1 Full Year (365 Days) of engaging, non-repetitive gameplay for Active, Mixed, and Idle players without exponential number runaway or multi-hour slogs.

---

## 1. Executive Summary & Diagnostic

### 1.1 The Problem: The 30-Day Wall and Why Vertical Scaling Breaks
The current Dig prototype (`proto/`) is tuned for a road of 40 levels across Chapter 1 (levels 1–20) and Chapter 2 (levels 21–40). As measured on `main` (`#437`, Run 5 in `docs/pacing-targets.md`):
- Chapter 1 completes at day 14.6–15.0 for the baseline mixed player (4 x 12 min/day).
- Chapter 2 completes at day 23.2–24.4.
- At level 20 (depth 275 m), raw par time is already **8,500 seconds (~2.36 hours)**. If scaled by formula without caps, depth 425 m reaches **79,000 seconds (22 hours)**.
- Stars explode from 3.1k at day 7 to **8.4 Trillion** by day 30 (`ch2Stars` = 5,000).
- Ground HP in Chapter 2 is scaled by `3e12 * ch2Hard[level]`.
- Damage distribution (`dump.dmg.by`): 68–71% of ground destruction comes from TNT blast chains, ~10% from falling blocks/tools, and only ~5% from the player's pick swings.

If this design simply scales deeper vertically into Months 2 through 12 (Chapters 3 to 12):
1. **Exponential Runaway ($10^{100}$ HP trap):** Every 25 m below 225 m currently multiplies ground by $1.175^{25} \times \text{step} \approx 110\times \text{ to } 170\times$. At 1,000 m (40 layers), ground HP would reach $10^{80}$, and Stars would reach $10^{26}$.
2. **Fatigue & Slog:** A 500 m level has 20 Big Rock boss fights per dig. Even with offline auto-walk (`awayPassable`), active sessions degenerate into waiting 15 minutes for a single Gate.
3. **Loss of Tactile Sensation:** When dirt blocks have 14,000 HP and a pick swing does 80 HP, the rhythmic tactile joy of the musical swing is completely decoupled from the screen. Barrels do everything; the pick does nothing.
4. **Mechanical Monotony:** Digging through the same dirt, water, black, living, angry, and hot layers for 365 days—merely with larger exponent tags—inevitably causes churn within 4 to 6 weeks.

### 1.2 The 365-Day Solution: The Horizontal-Expedition & Paradigm-Shift Model
To sustain a full year of play without dark patterns, absence penalties, or pay-to-skip, Dig must transition from a **single deep vertical well** into a **multi-front subterranean expedition with four seasonal eras and paradigm shifts**.

```
+-----------------------------------------------------------------------------------+
|                           THE 4 GEOLOGICAL ERAS OF DIG                            |
+-----------------------------------------------------------------------------------+
| ERA 1 (M1-M3): The Terrestrial Frontier & Fluid Hydraulics                        |
|   Verbs: Pick rhythm, TNT chaining, Aquifers/Pressure, Magma Kiln/Obsidian        |
+-----------------------------------------------------------------------------------+
| ERA 2 (M4-M6): Subterranean Civilization & Rafeeq Guilds                          |
|   Verbs: Antiquity restoration, Rafeeq classes, Clockwork pneumatic machinery     |
+-----------------------------------------------------------------------------------+
| ERA 3 (M7-M9): The Abyssal Biosphere & Prismatic Acoustics                        |
|   Verbs: Bioluminescent flora planting, Spore chains, Harmonic resonance shatters |
+-----------------------------------------------------------------------------------+
| ERA 4 (M10-M12): The Celestial Core & The Cosmic Cradle                           |
|   Verbs: Gravity inversion, Meteor magnetic levitation, Awakening the Cradle      |
+-----------------------------------------------------------------------------------+
```

---

## 2. Pacing Mathematics: Taming the Exponential Runaway

### 2.1 The Principle of Bounded Local Depth
**Rule:** No single dig level ever exceeds **350 metres** in depth or **10 Big Rock legs**.
- Instead of extending depth to 1,000 m, depth represents the *local depth of an expedition zone*.
- A site in the *Abyssal Gardens* or *The Clockwork Depths* runs from 50 m to 250 m within that biome's unique geological coordinate system.
- Level par times are strictly capped between **300 s (5 min) and 720 s (12 min)** of attended play. This guarantees that any session (even a 12-minute mixed session) can achieve tangible milestone progress.

### 2.2 Mathematical Model for Ground & Pick Harmony
In `proto/core/rules.js`, ground HP growth per metre is decoupled from the runaway formula.
Instead of continuous exponential compounding $1.175^r$, ground HP is normalized so that:
$$\text{Hits per dirt block mid-leg} \in [1, 4]$$
The pick's felt power is preserved by sizing the ground's row hardness to track the expected pick level of that expedition:

$$\text{dirtHp}(r) = \text{baseHp} \cdot (1 + 0.05 \cdot r) \cdot \text{BiomeFactor} \cdot \text{EraScale}$$

Where:
- $\text{BiomeFactor}$ reflects structural resistance (e.g., Basalt $1.4\times$, Pumice $0.7\times$, Crystal $1.2\times$).
- $\text{EraScale}$ is indexed to the player's Era milestone, preventing legacy zones from becoming trivial while ensuring new zones are immediately readable.

### 2.3 Sizing the Gate: Bounded Swings-at-Arrival
The Gate multiple table (`sites.gateMul`) must maintain a strict human-scale rhythm across all 365 days:
$$\text{Gate Swings at Arrival} \in [800, 3,500] \text{ swings}$$
At 4 swings/second team rate (player + Rafeeqs), a Gate fight lasts **200 to 500 seconds (3 to 8 minutes)** on the first try.
With the Gate remembering 60% of damage (`boss.gateShare = 0.6`), a player who fails try 1 finishes try 2 in **80 to 200 seconds**.
No Gate in the 365-day design ever requires more than 3 tries for a properly prepared player.

### 2.4 The Three-Tier Decoupled Economy
To prevent the $10^{100}$ currency inflation trap:
1. **Coins (Local Run Economy):** Reset each level. Purchases within a level scale by $1.5\times$ to $2\times$, keeping coin values within $10^0$ to $10^9$.
2. **Stars (Alqahwa Camp Economy):** Earned from finished sites, medals, and chilies. Step costs on the 3 main tracks (Pick, Camp, Bag) follow a damped growth curve:
   $$\text{cost}(n) = \begin{cases} 
   2 \cdot 1.5^n & \text{for } n \le 20 \\
   \text{cost}(20) \cdot 1.25^{n - 20} & \text{for } 20 < n \le 50 \\
   \text{cost}(50) \cdot (1 + 0.15 \cdot (n - 50))^{2.2} & \text{for } n > 50 
   \end{cases}$$
   This maintains Star costs within the Billions/Trillions bracket permanently rather than skyrocketing into $10^{60}$.
3. **Era Keystones (Macro Meta-Economy):** Non-inflationary, discrete currencies (e.g., *Aquifer Pearls*, *Gilded Cogs*, *Abyssal Spores*, *Astral Shards*). Exactly 1 to 5 awarded per major chapter milestone, spent exclusively on **horizontal unlocks and new mechanical verbs** in the Alqahwa Workshop.

---

## 3. Macro-Pacing: The 12-Month Progression Roadmap

```
+-------+-------------------------+----------------------------------+-----------------------------+
| Month | Season / Chapter Title   | Core Geological Setting          | New Mechanical Verb         |
+-------+-------------------------+----------------------------------+-----------------------------+
| M1    | The Caravan's Trail     | Arabia -> Europe -> Empty Qtr    | Rhythmic Pick & TNT Chains  |
| M2    | The Sunken Aquifers     | Subterranean River & Sluices     | Water Pressure & Hydro-Drill|
| M3    | The Geothermal Kiln     | Basalt Strata & Magma Ducts      | Magma Tempering & Obsidian  |
| M4    | The Necropolis of Bones | Ancient Catacombs & Reliquaries  | Antiquity Reconstruction    |
| M5    | The Guilds of Alqahwa   | Caravanserai Deep Outposts       | Rafeeq Specializations      |
| M6    | The Clockwork Spire     | Pneumatic Pipes & Gear Halls     | Automata Pulses & Steam     |
| M7    | The Bioluminescent Deep | Fungal Caverns & Mycelium        | Spore Planting & Luminescence|
| M8    | The Resonant Chasm      | Acoustic Crystals & Echo Caves   | Harmonic Beat Shatter       |
| M9    | The Prismatic Vaults    | Optical Calcite & Mirror Shafts  | Light Beam Laser Excavation |
| M10   | The Meteor Strata       | Impact Craters & Starlight Ore   | Magnetic Float & Levitation |
| M11   | The Tectonic Well       | Void Pockets & Fault Lines       | Chrono-Blocks & Grav-Pumps  |
| M12   | The Celestial Cradle    | The Earth's Core / Engine Room   | Master Awakening & Cosmos   |
+-------+-------------------------+----------------------------------+-----------------------------+
```

### Detailed Breakdown by Quarter and Month

#### ERA 1: The Terrestrial Frontier & Subterranean Elements (Months 1–3)
- **Month 1: The Caravan's Trail (Chapters 1 & 2)**
  - *Setting:* The 5 Old World lands, the Night Road, and the Empty Quarter (Levels 1–40).
  - *Narrative:* Grandpa's camel bell found; the night caravan track leads back to the Empty Quarter oasis.
  - *Systems:* Foundations of Pick tempo, TNT chains, initial relics, Alqahwa 3 tracks.
  - *Pacing:* Day 0 to 25. Mixed player finishes Chapter 2 around Day 22–24. Days 25–30 introduce the first chili pips and side expeditions.
- **Month 2: The Sunken Aquifers (Chapter 3: Levels 41–60)**
  - *Setting:* Underground subterranean lakes, pressurized limestone, stalactites.
  - *New Verb — Hydraulic Sluicing (`proto/features/aquifers/`):*
    - Breaking *Pressure Wells* creates flowing water streams that automatically erode soft silt blocks downhill.
    - *Waterwheel Sieve:* Rubble caught in flowing water yields 3x coins and automatic fossil extraction.
    - *Hydro-Pick Forge Tool:* Pressurized water jet strikes 5 vertical blocks in a line.
  - *Pacing:* Day 31 to 60. Levels 41–60 (depths 75 m to 275 m).
- **Month 3: The Geothermal Kiln (Chapter 4: Levels 61–80)**
  - *Setting:* Black volcanic basalt, glowing magma veins, obsidian crust.
  - *New Verb — Thermal Tempering (`proto/features/geothermal/`):*
    - Diverting lava into water creates *Obsidian Glass* (breaks into directional crystal lines).
    - *Magma Kiln in Forge:* Hitting hot blocks stores "Heat" on the pick. At 100 Heat, the next 10 swings trigger *Magma Burst*, cleaving a $3\times 3$ area.
  - *Era 1 Wonder:* **The Great Siphon** built in Alqahwa, converting water and heat into passive Star generation.

#### ERA 2: Subterranean Civilization & Rafeeq Guilds (Months 4–6)
- **Month 4: The Necropolis of Bones (Chapter 5: Levels 81–100)**
  - *Setting:* Ancient pre-desert catacombs, hieroglyphic slate, fossilized titans.
  - *New Verb — Antiquity Restoration (`proto/features/antiquities/`):*
    - The Museum expands into the *Restoration Lab*.
    - Reconstructing complete fossils unlocks *Active Antiquities* equipped into 3 relic relic slots (e.g., *Scarab Compass* reveals chest locations; *Chariot Axle* doubles swing velocity for 10 s after breaking a Big Rock).
- **Month 5: The Guilds of Alqahwa (Chapter 6: Levels 101–120)**
  - *Setting:* Ancient deep subterranean trading posts, salt pillars, cavern crossroads.
  - *New Verb — Rafeeq Specializations (`proto/features/guilds/`):*
    - Rafeeqs can be assigned one of 4 Guild callings at Alqahwa:
      1. *Naqqab (Breaker):* Hits focus strictly on the nearest Big Rock or hard block; +100% crit chance on cracks.
      2. *Baroodi (Blaster):* When hitting TNT, doubles the explosion radius and directs blast vectors downward.
      3. *Ghawwas (Sifter):* Gathers ore and coins from broken blocks automatically; drops extra fossils.
      4. *Muhandis (Engineer):* Erects lanterns and scaffolding, reducing dark penalties and preventing cave-in regrowth.
    - Dual-Rafeeq combos: Pairing a Naqqab and a Baroodi triggers *Coordinated Blast* on Gate arrival.
- **Month 6: The Clockwork Spire (Chapter 7: Levels 121–140)**
  - *Setting:* Subterranean brass machinery, giant ticking pendulums, steam vents.
  - *New Verb — Pneumatic Automata (`proto/features/clockwork/`):*
    - Piston blocks in the walls strike downward in sync with the musical tempo.
    - *Steam Forge Tool:* Emits a steam whistle that wakes all sleeping Rafeeqs, giving a 30-second hyper-tempo burst.
  - *Era 2 Wonder:* **The Clockwork Orrery** at Alqahwa, permanently syncing all Rafeeq hits to the music's downbeat.

#### ERA 3: The Abyssal Frontier & Primeval Biosphere (Months 7–9)
- **Month 7: The Bioluminescent Deep (Chapter 8: Levels 141–160)**
  - *Setting:* Phosphorescent cavern roofs, giant mushroom forests, living roots.
  - *New Verb — Spore Cultivation (`proto/features/flora/`):*
    - Breaking *Spore Pods* releases fungal mycelium that spreads through adjacent rock.
    - Spore-infected rock softens from 100 HP to 10 HP.
    - *Glow-Moss Farming:* Players can point-and-plant luminous seeds to permanently illuminate dark rooms.
- **Month 8: The Resonant Chasm (Chapter 9: Levels 161–180)**
  - *Setting:* Acoustic cavern domes, quartz singing stones, deep sub-bass echoes.
  - *New Verb — Harmonic Shatter (`proto/features/acoustics/`):*
    - Hitting blocks precisely on the musical beat (quarter-note accents) builds a *Resonance Bar*.
    - At full resonance, an *Acoustic Shockwave* shatters every stone block in the visible viewport.
    - New tempo options unlock: 180 and 200 BPM modes with polyrhythmic swing meters.
- **Month 9: The Prismatic Vaults (Chapter 10: Levels 181–200)**
  - *Setting:* Giant optical prisms, iridescent calcite, crystal mirrors.
  - *New Verb — Light Beam Excavation (`proto/features/prisms/`):*
    - Breaking a mirror block reorients a light beam from the surface.
    - When the beam hits a prism, it refracts into 3 laser lines that vaporize rock blocks horizontally across the screen.
  - *Era 3 Wonder:* **The Crystal Resonance Spire** at Alqahwa, amplifying all crystal line chain reactions by $3\times$.

#### ERA 4: The Celestial Core & The Cosmic Cradle (Months 10–12)
- **Month 10: The Meteor Strata (Chapter 11: Levels 201–220)**
  - *Setting:* Sunken prehistoric meteorite fragments, zero-gravity pockets, floating stardust.
  - *New Verb — Gravity Inversion (`proto/features/astral/`):*
    - Certain layers have *Inverted Gravity*: rubble and loose blocks fall *upward*.
    - *Magnetic Pick Upgrade:* Pulls distant floating ore directly to the player.
    - *Meteor Strikers:* Blasts that pierce through the top of the screen and rain starfire down onto the Big Rock.
- **Month 11: The Tectonic Faults & Void Wells (Chapter 12: Levels 221–240)**
  - *Setting:* Fractured bedrock, spatial rifts, ancient runic seals.
  - *New Verb — Chrono-Mining (`proto/features/void/`):*
    - *Echo Blocks:* Breaking an echo block records your last 10 swings and continuously replays them in that column for 30 seconds.
    - *Rift Anchors:* Stabilize tectonic shifting plates, opening secret shortcut shafts.
- **Month 12: The Celestial Cradle / The Heart of Eternity (Chapter 13: Levels 241–260 & The Core)**
  - *Setting:* The golden geometric core of the world—an ancient astrolabe engine buried before the desert was born.
  - *The Climax:* Grandpa's caravan was not lost; it was recruited centuries ago as guardians of the *Celestial Cradle*.
  - *The Master Ritual:* Assembling the 12 Era Keystones activates the Great Engine.
  - *The Master Ending:* The world map blossoms into the *Eternal Horizon* (an infinite, procedural star-vault expedition mode with endless cosmetic prestige and custom expedition contracts).

---

## 4. Anti-Repetition Systems: Deep Dive into New Verbs

To guarantee that player engagement remains fresh across 52 weeks, the core interaction must periodically receive qualitative verb evolutions:

```
Month 1: "I point and mine dirt to a beat."
Month 2: "I channel water currents to wash away silt and drown obstacles."
Month 3: "I temper my pick in magma to unleash fire bursts."
Month 4: "I reconstruct ancient artifacts and slot them into my loadout."
Month 5: "I position my specialist Rafeeqs to execute coordinated squad assaults."
Month 6: "I harness steam pistons and pneumatic pulses for rhythmic demolition."
Month 7: "I infect rock with fungal spores to turn hard stone into brittle moss."
Month 8: "I lock into the rhythm to unleash whole-screen acoustic shockwaves."
Month 9: "I redirect light beams through calcite prisms to laser-cut deep shafts."
Month 10: "I mine in reversed gravity, catching floating meteor fragments."
Month 11: "I place chrono-rifts that echo my swings infinitely."
Month 12: "I awaken the ancient planetary engine and harmonize all systems."
```

### 4.1 System Spotlight: Rafeeq Guilds (`proto/features/guilds/`)
Currently, Rafeeqs are passive characters with cosmetic traits and names (`proto/features/rafeeqs/`). They hit for 60% of your hit.
In Month 5, the **Guild Hall** opens at Alqahwa:
- **Calling Assignment:** Each of the 8 seats can be assigned a Calling:
  - **Naqqab (Breaker):** Hits automatically target the Big Rock's crack; crack damage multiplier increased from $3\times$ to $5\times$.
  - **Baroodi (Pyrotechnician):** Converts regular pick strikes near TNT into flint sparks, detonating barrels without spending tool cooldowns.
  - **Ghawwas (Prospector):** Increases fossil, chest, and rare ore discovery rates by $+50\%$.
  - **Muhandis (Engineer):** Deploys automated lanterns in dark layers and places bracing struts that stop rock regrowth.
- **Synergy Combos:** When 2 Naqqabs dig adjacent cells, their pick strokes synchronize, creating a mini shockwave that damages an entire row.

### 4.2 System Spotlight: Archaeological Antiquities (`proto/features/antiquities/`)
Currently, Museum sets are collected passively from bone drops (`proto/features/wing2/`).
In Month 4, completing a Museum set doesn't just grant a flat $+3\%$ bonus:
- Reconstructed relics possess **active socketable powers**:
  - *The Astrolabe of Sinbad:* Marks the location of all hidden chests on the current level track.
  - *The Obsidian Siphon:* Converts 5% of all TNT blast damage directly into pick swing damage against the Gate.
  - *The Golden Mortar:* Grinds rubble into healing poultices that double Rafeeq digging speed for 60 seconds after a Big Rock breaks.

---

## 5. Milestone Cadence: Weekly, Monthly & Yearly Rhythms

```
+-------------------------------------------------------------------------------+
|                             WEEKLY PULSE CADENCE                              |
+-------------------------------------------------------------------------------+
| Monday:    The Caravan Moves (New Land variant / Expedition deal available)   |
| Wednesday: Almodeer's Inspection (Mid-week contract challenge with medal bonus)|
| Friday:    The Hakawati's Night Tale (Weekly special lore beat at Alqahwa)    |
| Weekend:   The Golden Sieve Event (2x bone/ore drop rates on replay levels)   |
+-------------------------------------------------------------------------------+
```

### 5.1 Weekly Pulses (The Friday Caravanserai)
- Every Friday, the hakawati at Alqahwa tells a **Caravanserai Tale** (`proto/features/story/`):
  - A special weekly expedition deal appears at the Beyond Crossroads: a 3-floor expedition with unique rules (e.g., *Double Water Pressure + No TNT*, or *Inverted Light + Echo Blocks*).
  - Completing the weekly expedition rewards a rare cosmetic hat/robe for the Rafeeqs and an antiquity fragment.
  - Non-punitive: If a player skips a week, past weekly tales are archived in the hakawati's book and can be enjoyed at any time.

### 5.2 Monthly Chapter Climaxes
- At the end of each month (every 20 levels), the player faces a **Grand Colossus Gate**:
  - A massive multi-stage Big Rock with unique phase mechanics (e.g., the *Steam Colossus* venting hot steam, requiring water cooling; the *Prismatic Titan* reflecting hits unless struck from illuminated angles).
  - Defeating the Colossus unlocks the new monthly biome on the world map and plays a fully voiced Arabic/English hakawati chapter resolution.

### 5.3 Quarterly Seasonal Wonders
- At the close of each quarter (Months 3, 6, 9, 12), the player constructs a **Seasonal Wonder** in the courtyard of Alqahwa:
  - *Quarter 1:* **The Grand Geothermal Siphon**
  - *Quarter 2:* **The Clockwork Astrolabe Spire**
  - *Quarter 3:* **The Prismatic Resonator**
  - *Quarter 4:* **The Celestial Engine of Eternity**
- Wonders visibly alter Alqahwa, adding ambient animations, new background music layers, and lasting convenience perks (e.g., automatic chest opening, free tea breaks).

---

## 6. Player Retention Psychology: The 3 Archetypes & Fair Play

### 6.1 Accommodating the 3 Archetypes Across 365 Days

| Player Archetype | Daily Routine | Monthly Progress | How the Architecture Serves Them |
|---|---|---|---|
| **Active (90 min/day)** | 1 long session; clears 1-2 road levels, grinds chilies, optimizes relics and guild loadouts. | Clears monthly chapter in 18–22 days; spends remaining days mastering chilies, museum sets, and speed medals. | High mechanical depth; relic fusion recipes; guild synergy crafting; chili pip challenges. |
| **Mixed (4 x 12 min/day)** *(Primary Target)* | 4 short sessions; checks Alqahwa, purchases Star steps, breaks 1 leg or Gate per session. | Clears monthly chapter in 24–28 days; perfectly syncs with the monthly cadence. | Sized perfectly so 1 leg or 1 boss fight fits cleanly into a 12-minute window. |
| **Idle (2 x 4 min/day)** | 2 brief visits; collects offline away rubble, breaks the Gate waiting for them, buys upgrades. | Clears monthly chapter in 32–38 days; catches up smoothly via the Tailwind mechanic. | Rafeeqs dig honestly to the Gate; Gate is waiting on return; away sieve rewards pinned goals. |

### 6.2 The "Generous Absence" Principle & Grandpa's Tailwind
Strict adherence to Rule 8 (No dark patterns, no punishment for absence):
- **No Daily Login Penalties:** Missing days never breaks a streak.
- **Grandpa's Tailwind (`proto/features/tailwind/`):**
  - If a player is absent for more than 48 hours, their Rafeeqs do not just sit idle.
  - Upon return, the hakawati announces: *"Grandpa left a cache of trail spices in the camp kettle."*
  - The player receives **Grandpa's Tailwind**: For their next 3 dig sites, Rafeeq digging speed is doubled, and Gate damage banking is increased from 60% to 80%.
  - This allows a returning player to catch up effortlessly to the current monthly pacing without stress or guilt.

### 6.3 Honest Away Digging
Following the landmark design decision 13 (`#430`, "The Gate is yours"):
- Away digging always prices hard ground, prove factors, and biome resistances honestly (`away.rowCost`).
- Rafeeqs dig through the ground and wait at the Gate, sieving rubble.
- On return, the player is always greeted with: *"Your crew dug to the Gate. It is waiting for you."* The player enjoys the climactic boss fight without having the victory hollowed out while offline.

---

## 7. Modular Code Architecture & Feature Specifications

All new mechanics are designed to slot directly into the existing modular hook architecture (`proto/README.md`, `proto/core/registry.js`) without modifying core engine files or breaking save compatibility.

```
proto/features/
├── sites/              (Road & chapter orchestration: ROAD1..ROAD12)
├── aquifers/           (Month 2: Water pressure & sluice dynamics)
├── geothermal/         (Month 3: Magma tempering & obsidian)
├── antiquities/        (Month 4: Active museum relics)
├── guilds/             (Month 5: Rafeeq specializations)
├── clockwork/          (Month 6: Steam automata & beat sync)
├── flora/              (Month 7: Bioluminescent spore cultivation)
├── acoustics/          (Month 8: Harmonic resonance shockwaves)
├── prisms/             (Month 9: Light refraction laser beams)
├── astral/             (Month 10: Inverted gravity & meteor ore)
├── void/               (Month 11: Chrono-mining & echo blocks)
└── cradle/             (Month 12: The Celestial Engine climax)
```

### 7.1 Architecture of a Typical Modular Expansion: `proto/features/guilds/`
```javascript
// proto/features/guilds/rules.js
import { use, emit } from '../../core/registry.js';

export const guilds = use({
  id: 'guilds',
  state: {
    calling: { init: () => ({}), survives: ['site', 'land'] }, // seatIdx -> 'naqqab' | 'baroodi' | 'ghawwas' | 'muhandis'
    guildLevels: { init: () => ({ naqqab: 0, baroodi: 0, ghawwas: 0, muhandis: 0 }), survives: ['site', 'land'] },
  },
  mods: {
    // Naqqab doubles crack crit multiplier
    crackMult: (v, s, seat) => (s.calling[seat] === 'naqqab' ? v * 1.6 : v),
    // Ghawwas boosts fossil find rates
    fossilChance: (v, s) => v * (1 + 0.2 * (s.guildLevels.ghawwas || 0)),
  },
  hooks: {
    // Baroodi directs blast vectors
    broke(s, b, ev) {
      if (b.t === 'tnt') {
        const blasters = Object.values(s.calling).filter(c => c === 'baroodi').length;
        if (blasters > 0) emit(s, ev, 'guildShapedBlast', { r: b.r, c: b.c, bonusRows: blasters * 2 });
      }
    },
  },
});
```

### 7.2 Save State Schema & Backward Compatibility
- Adheres strictly to Rule 2 (Never break existing saves):
- `SAVE_VERSION` remains at version 2 in `proto/core/state.js`.
- Each new modular feature declares its own `version` and `migrate(s, from)` function.
- All new state fields provide pure default initializers via `init: () => defaultVal`.
- Old saves loading in any era will cleanly populate defaults without error.
- Save fixtures added to `test_fixtures/` for every monthly chapter release.

---

## 8. Simulation & Verification Blueprint

To maintain mathematical control over the 365-day pacing, the simulation suite (`sim/proto/`) is extended with automated multi-month validation tools.

### 8.1 Year-One Macro Simulation (`sim/proto/dig-year.mjs`)
A high-speed headless Monte Carlo simulator modeling all 365 days across the 3 player archetypes:
```bash
node sim/proto/dig-year.mjs --seeds 5 --jobs 3 --check-pace
```
**Verification Assertions:**
1. **Pacing Windows:**
   - Month 1 (Ch 1 & 2): Day 18–25 (Mixed).
   - Month 3 (Era 1 Wonder): Day 75–85 (Mixed).
   - Month 6 (Era 2 Wonder): Day 165–180 (Mixed).
   - Month 9 (Era 3 Wonder): Day 255–270 (Mixed).
   - Month 12 (Celestial Cradle): Day 350–365 (Mixed).
2. **Session Length Discipline:**
   - 95th percentile of attended dig duration strictly $\le 12.0$ minutes.
   - Longest dead zone with no upgrade/find/beat strictly $\le 300$ seconds.
3. **Number Boundedness:**
   - Ground HP never exceeds $10^{15}$ at any point in the year.
   - Stars never exceed $10^{14}$.
   - Block hits by hand mid-leg never exceed 4 hits.

---

## 9. Next Immediate Implementation Steps

To transition this blueprint into code, the development sequence follows the project's established modular pattern:

1. **Step 1 (Ground & Gate Normalization):**
   - Apply the bounded ground growth formula in `proto/core/rules.js` and `proto/core/grid.js` to eliminate the 14,000 hits/block distortion before expanding past Level 40.
2. **Step 2 (The Chapter Road Expansion):**
   - Extend `ROAD` in `proto/features/sites/rules.js` with modular chapter arrays (`ROAD3`, `ROAD4` ... `ROAD12`).
   - Implement `chapterOf(level)` helper and zone definitions.
3. **Step 3 (Module Prototyping in `proto/features/`):**
   - Build `proto/features/aquifers/` (Month 2) and `proto/features/geothermal/` (Month 3) to complete Era 1.
4. **Step 4 (Alqahwa Expansion):**
   - Add the Workshop and Guild Hall doors to `proto/features/worldmap/alqahwa.js`.
5. **Step 5 (Grandpa's Tailwind):**
   - Implement absence recovery in `proto/features/tailwind/` to guarantee zero churn for lapsed players.
6. **Step 6 (Simulation Harness):**
   - Create `sim/proto/dig-year.mjs` and wire into `npm run test` and CI.
