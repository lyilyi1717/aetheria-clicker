# Aetheria Clicker: Gear, Bag and Boss Fights (Void Tower 2.0)

**Status:** design spec, written 2026-10-06 against `main` at `6437f1f`. That commit
includes:
- **R8:** gear at `GEAR_FLOOR_BASE = 1.11`, monsters and gold at 1.12, bosses ×400 HP with
  a 45 s timer, the legacy hero rebase and `indexFloor`
- **R18:** Wardens every 250 floors after the first Transcend
- **`SAVE_VERSION` 4** in `js/engine/migrations.js`

It extends `docs/redesign-proposal.md` (R8, R18) and `docs/gamification-roadmap.md`.

**Author:** the game-theory / gamification designer agent (owner of
`docs/gamification-roadmap.md`, `docs/game-theory-progression.md`). Read-only on game
code; everything below is a spec for implementation passes.

**Conventions:**
- Same as the roadmap: additive within a category, multiplicative across categories.
  Meaning-bearing rewards ride log-paced curves. Near-misses are true. No FOMO, no streak
  loss.
- Code is referenced by **function or constant name** (line numbers drift; see
  `AGENTS.md`).

**Method:** headless node sim of the real `js/systems/*.js` classes (`gsim.mjs` in the
session scratchpad, not committed), run against a frozen copy of `main` `6437f1f`. Audio and
particles are stubbed, `setTimeout` is synchronous and `Date.now` is pinned to sim time
(§0.4). It extends the roadmap's `msim.mjs` with:
- **Tower open time.** Combat only runs while the tab is open; offline gives Aether, garden
  and sand, not kills (`SaveManager.js:68-98`). Economy and spells keep running.
- **Talent points** on the Wave 1 schedule (roadmap §3.2): casual 2 / 17 / 26 / 45 TP at
  1 h / 1 d / 1 w / 1 m, engaged 3 / 20 / 35 / 65.
- **Profiles** (§6.1).
- **The new gear model** (§1–§4), **boss mechanics** (§5) and a bot that equips by Combat
  Rating at each check-in, re-tempers Legendaries and salvages the rest.

---

## 0. Key findings

### 0.1 The wall is a log of total power, and 1.11 sits ~1.3–1.5× ahead of target

Gear grows `g^f` and monsters `1.12^f`. The floor wall therefore sits where

```
f_wall ≈ ln(K · Rarity · Multipliers) / ln(1.12 / g)
```

so every ×X of hero power moves the wall by a fixed number of floors:

| Gear base g | Floors per ×2 power | Floors per ×10 power |
|---|---|---|
| 1.11 (slice) | +77 | +257 |
| 1.1075 | +62 | +205 |
| **1.105 (recommended)** | **+51** | **+171** |
| 1.10 | +39 | +129 |

**Why the slice runs ahead of the roadmap (149/414/498).** The Aether core has accelerated
since v2.6.0, so the Aether Forge (`×(1 + 0.25·L)`) reaches L≈20 by 6 h and 30+ by 1 week.
The roadmap measured 25–31 at 1 week. Forge 30 = ×8.5 = +165 floors at 1.11.

There are two ways to pull the arc back:
- **(a) Rein in the Forge**, Enchanter or other multipliers. This would touch the
  roadmap's decision (b), the Forge persisting, and the Aether core. It also would not stop
  the next core speed-up from leaking into the Tower again.
- **(b) Lower the gear base to 1.105.**
  - One constant, already isolated as `GEAR_FLOOR_BASE` in `CombatSystem.js`.
  - It also cuts the floor value of *every* multiplier by a third. That is exactly the
    protection a loot system with rare power spikes needs.
  - **Recommended: (b), `GEAR_FLOOR_BASE = 1.105`.** Forge, Enchanter and talents are
    left alone.

### 0.2 With the old auto-replace gear, 1.105 walls too flat

Old gear goes ×1 to ×18 by rarity and auto-equips by raw number. At 1.105 it lands near
target at 1 week, then the curve goes flat (§6.2), because there is nothing left to chase
once a Cosmic drops. The bag system fixes the shape, not the height:
- re-tempering Legendaries
- affix rolls
- uniques
- boss loot

### 0.3 Two exploits found (must ship with gear wave 1)

1. **Void Cataclysm (`SpellSystem.castSpell`, `void_strike`) deals 40% of monster max HP
   regardless of floor.**
   - Automated Leylines auto-casts it.
   - As soon as crit damage exceeds ×2.5 (any crit-damage affix), two casts kill any
     monster, and the sim climbed to floor 3,600 in a week.
   - Even today it kills mobs the hero cannot touch.
   - **Fix:** in the Tower its damage is `min(40% max HP, 10 × hero Attack)` and it never
     crits.
2. **Camping on a boss floor.** With a "stay on floor" mode, the hero can farm a boss whose
   loot is guaranteed (sim: 745 boss kills in a day). **Kashta never camps on a boss
   floor** (§2.6).

### 0.4 Sim hygiene note (for any future sim)

- `PrestigeSystem.getMinRunRemaining` is wall-clock. A headless sim that does not pin
  `Date.now` produces load-dependent Ascension counts, with ±25% floor swings between
  identical runs. Stub `Date.now` to sim time. (`sim/tower-pacing.mjs` sidesteps this with a
  fixed power schedule.)
- Sims that import the live `js/` tree pick up merges mid-run. This happened during this
  study. Freeze a copy.

---

## 1. Gear structure

### 1.1 Slots

| Slot | Primary stat | Scales with item level? | Wave |
|---|---|---|---|
| ⚔️ Weapon | Attack, `10 · g^(ilvl−1) · R` | yes | 1 (exists) |
| 🛡️ Armor (Thobe) | Max HP, `40 · g^(ilvl−1) · R` | yes | 1 (exists) |
| 📿 Amulet | Crit chance, `min(50%, 5% + 5%·t + 0.02%·ilvl)` | weakly, capped | 1 (exists) |
| 🏺 Relic | Lifesteal, `min(30%, 2% + 2%·t + 0.01%·ilvl)` | weakly, capped | 1 (exists) |
| 🧥 **Bisht** (cloak) | **Fortune**: `+3%·(t+1)` drop chance and Barakah gain, cap +25% | no | 2 (new) |

- `t` is the rarity tier: Common 0 … Mythic 5. `g` is `GEAR_FLOOR_BASE`.
- Only weapon and armor carry the floor curve. The other three are **bounded-% slots**:
  rarity matters, floor barely does, so they cannot inflate the wall.
- **The Bisht is deliberately a non-combat slot.** Its primary stat and its affix pool are
  economy-only (Fortune, Greed, Delver, Verdant, Brewer, Leyline). Adding it changes no
  combat number except through its Mythic (§1.5). This is what makes the owner's "legendary
  cloak" safe.

### 1.2 Rarities

| Rarity | Colour (existing CSS) | Power mult R (old) | Affixes | Special |
|---|---|---|---|---|
| Common | grey `.gear-common` | 1 (1) | 0 | — |
| Rare | blue `.gear-rare` | **2** (2) | 1 | — |
| Epic | purple `.gear-epic` | **3** (4) | 2 | — |
| Legendary | red, pulsing | **4** (8) | 2 | **named unique effect**; can be re-tempered |
| Cosmic | gold glow | **5** (18) | 3 | unique effect **or** set piece; re-temper |
| **Mythic** (new) | prismatic / teal shimmer | **7** | 3 | **one of 5 Mythic powers**; re-temper |

- The old ×18 Cosmic is replaced by "×5 base + affixes + unique". The ceiling is similar
  (a perfect Cosmic ≈ ×5 × 1.3 Might × 1.15 unique ≈ ×7.5 in its slot), but players now
  *build toward* it instead of getting it in one roll.
- Rarities 1/2/3/4/5/7 were calibrated in the sim against 1/1.6/2.5/4/6/8 and
  1/2/3/4.5/6/8. The flatter top keeps the Cosmic chase from overshooting at week 1 (§6).

### 1.3 Item level (ilvl)

| Source | ilvl |
|---|---|
| Regular mob | the floor it died on |
| Boss / Sheikh / Guardian / Warden | floor **+5** (boss loot is "from the future": ×1.65 primary) |
| Re-temper (§2.4) | raised to `maxFloor − 1` (never above the record) |

- **Gear lifetime.** An item stays competitive while `g^(Δilvl) < R_new / R_old`. A
  Legendary (×4) beats fresh Commons for `ln 4 / ln 1.105 ≈ 14` floors. Late game that is
  days.
- With re-tempering, a favourite Legendary lasts forever. This is the "my weapon" bond
  the owner asked for.

### 1.4 Affixes

Rule: **at most one of each affix per item** (no triple-Might weapon). This caps the
min-maxer's headroom at about ×1.6 over the sim's "typical" build (+24 floors at 1.105).

| Affix | Value per tier t (Rare 1 … Mythic 5) | Category (additive inside) | Pool |
|---|---|---|---|
| **Might** | +4–8%·t Attack | Gear Might (×(1+Σ) on Attack) | combat |
| **Vigor** | +5–10%·t Max HP | Gear Vigor | combat |
| **Slayer** | +6–12%·t damage vs bosses | Slayer | combat |
| **Precision** | +0.10–0.20·t crit multiplier (base ×2) | Crit Damage | combat |
| **Haste** | −2–4%·t hero skill cooldowns (cap −40%) | Haste | combat |
| **Greed** | +5–10%·t Tower gold | Gold (with Plunderer Greed) | economy |
| **Fortune** | +2–4%·t drop chance (cap +100% total) | Fortune (with Fortune Favor) | economy |
| **Delver** 🪨 | +5–10%·t pickaxe power | Excavation | economy (synergy) |
| **Verdant** 🌱 | +4–8%·t Garden growth | Garden | economy (synergy) |
| **Brewer** ⚗️ | +5–10%·t potion duration | Alchemy | economy (synergy) |
| **Leyline** 🔮 | +0.2–0.4·t mana regen | Spells | economy (synergy) |

**Why these matter beyond bigger numbers:**
- The synergy affixes make real choices. A Delver/Verdant relic is worse in the Tower but
  speeds the log-paced Excavation and Garden, which carry the meaning layer (roadmap §0.1).
  That is a genuine trade-off, not a dominated option.
- Loadout presets (wave 3) and Al-Wakeel's "Climb / Dig / Garden" modes (§4) build on this.

### 1.5 Named items: Legendary uniques, Mythics, sets

Each unique effect carries a declared `ratingMult`, which is its rated value as a damage
or survival multiplier. Auto-equip and the ▲ arrows use it. Every effect is bounded:
**no unique is worth more than about ×1.25 in its category.**

**Boss signatures** (wave 1). When a boss rolls Legendary, 50% of the time it is that
boss's signature. Bosses cycle through 6 names (`MONSTER_NAMES[(f−1)%12]` on `f%10==0`).

| Boss (first floor) | Item | Slot | Effect |
|---|---|---|---|
| Rukbah Soda (10) | **Fizzing Rukbah Can** | Relic | Lifesteal overheal becomes Shield (up to 25% max HP). "Pssshhh." |
| Mutawa (20) | **Stick of Discipline** | Weapon | +40% damage to a boss during its telegraph window; a crit during the wind-up interrupts it |
| Giant Kabsa Monster (30) | **Ladle of Infinite Kabsa** | Weapon | Each kill: +2% Attack for 20 s, stacks 10 ("seconds, please") |
| Iftar Samosa (40) | **Samosa Buckler** | Armor | The first monster hit each fight is fully blocked ("crunch") |
| Abu Sarwal Wa Fanila (50) | **Sacred Fanila of Abu Sarwal** | Armor | +20% HP; below 30% HP, regen ×10 for 5 s (60 s cooldown) |
| Al-Modir (60) | **Wasta Stamp of Al-Modir** | Amulet | "APPROVED!": boss timers +5 s |

**Mob signatures** (wave 2). When a regular mob of that name rolls Legendary, 25% of the
time it is its signature.

| Mob | Item | Slot | Effect |
|---|---|---|---|
| Angry Shayeb | **Grandma's Sandal of Doom** | Weapon | Every 10th click throws the Sandal: 500% Attack, always crits, stuns 1 s. The sandal flies across the portrait. |
| Dallah of Doom | **Golden Dallah** | Relic | +40% Tower gold; every kill "pours a cup": +2% Attack for 20 s, stacks 10 |
| Desert Dhabb | **Dhabb-Scale Thobe** | Armor | +15% HP, reflects 10% of damage taken |
| Karak Addict | **Bottomless Karak Thermos** | Relic | Potion durations +50%; Almarai Laban is ×3.0 instead of ×2.5 |
| Snapchat Celebrity | **Ring Light of Vanity** | Amulet | A crit "blinds": the monster's next attack misses (10 s internal cooldown) |
| Drifting Camry | **Camry Hubcap Chakram** | Weapon | Overkill damage carries into the next monster (fast-farm item) |

**Zone sets** (wave 3). Three pieces each, dropped by that zone's Sheikhs and Zone Guardian. Set
bonuses go into the categories above, so they stay additive inside a category.

| Zone | Set | 2-piece | 3-piece |
|---|---|---|---|
| Thumama Dunes | **Kashta Kit** (Primus Stove, Camping Rug, Sheesha) | +15% HP | Kashta camp: +50% drops and gold |
| Tahlia Street | **Drift King** (Hilux Wheel, Racing Shmagh, Shabab Sneakers) | +10% Attack | every 5th auto-attack "drifts" and hits twice |
| Al-Batha Market | **Souq Haggler** (Scales, Coin Purse, Haggler's Ring) | +30% gold | sell prices ×2, salvage +50% |
| Empty Quarter | **Bedouin Nomad** (Bisht of Dunes, Falcon Glove, Waterskin) | +20% HP | boss timers +10 s |
| Kingdom Centre | **Corporate Wasta** (Lanyard, Ergonomic Chair, Stamp) | −15% skill cooldowns | a telegraph answered resets Heavy Strike |
| Boulevard World | **Riyadh Season** (Ticket, Glowstick, Bucket Hat) | +20% crit damage | boss kill → fireworks: +50% damage for 10 s |

**Mythics** (wave 2). Five items, one per slot. Each is a *mechanic*, rated about
×1.3–1.5. That is equal to 13–21 floors at 1.105. The item says ×10 where it can, but the
power is never ×10 (see §3.5 for why).

| Mythic | Slot | Power | Rated | Juice |
|---|---|---|---|---|
| **Bisht of the Wasta King** | Bisht | Every 20th hit (auto, click or skill) is a **WASTA STRIKE: ×10 damage** | ×1.45 | gold screen-edge flash, "WASTA!" stamp, coin shower |
| **The Royal Decree Pen** | Weapon | Each telegraph answered this fight: +20% damage, stacks 3 | ~×1.3 vs bosses | parchment unrolls |
| **Thobe of Eternal Ironing** | Armor | Once per fight, a lethal hit leaves 1 HP and fully restores HP ("freshly ironed") | survival | steam puff |
| **Nazar of the Haters** | Amulet | Telegraphs auto-succeed (idle plays like active); crits ×3 | ~×1.3 idle | the evil-eye blinks |
| **Flying Majlis Carpet** | Relic | The Tower keeps fighting while the tab is closed: Kashta at 25% speed, up to 8 h | QoL; more drops | a carpet flies off-screen |

---

## 2. The bag (inventory)

### 2.1 Capacity

- 30 slots (a 5×6 grid that fits a phone).
- **Saddlebag upgrades:** +5 slots each, cap 60. Cost in Tower gold:
  `1e5 · M · 3^n`, where `M` is the Market Index. This is a real gold sink alongside the
  Enchanter.
- Equipped items do not use bag slots.

### 2.2 Flow of a drop

1. The drop goes into the bag with a "NEW" pip.
2. The item tile flies from the monster to the bag tab icon, coloured by rarity.
3. Legendary and better: centre-screen card reveal (the `showLootPopup` spec in
   `assets/requests-status.md`), with the unique's name and effect line.
4. Auto-salvage filter (default **Common**; options up to Epic):
   - Matching items are salvaged on arrival, and a running "+12 🦴" ticker shows it.
   - It **never** salvages an item marked ▲ (upgrade) or a Legendary+.
5. **Bag full:**
   - The incoming item is salvaged if it is the worst. Otherwise the oldest unlocked,
     non-▲ item goes.
   - Always shown with a toast: "Bag full: salvaged Rare Armor (+2 🦴)". There are no
     silent losses.

### 2.3 Salvage and sell

| | Common | Rare | Epic | Legendary | Cosmic | Mythic |
|---|---|---|---|---|---|---|
| **Salvage →** 🦴 Monster Bones | 1 | 2 | 4 | 8 | 16 | — (cannot salvage; can be locked away) |
| **Salvage →** 💠 Void Cores | — | — | 1 | 3 | 8 | — |
| **Sell →** gold (× gold-per-kill at the item's ilvl) | 2 | 5 | 15 | 60 | 200 | — |

- **Where the currencies go:**
  - Bones feed Almarai Laban (`AlchemySystem.js:25`) and Reforge.
  - Cores feed Mandi Feast Nectar (`:53`), re-tempering and Reforge.
  - Gold feeds re-tempering, Saddlebags and the Enchanter.
  - Selling is the "I need gold now" route; salvaging is the "I'm building a Legendary"
    route.
- **Reforge** (wave 2): reroll one affix on an Epic+ item for `4·2^k` Bones + `1·2^k` Cores,
  where `k` is that item's previous rerolls. This sink keeps scaling.

### 2.4 Re-temper (the anti-obsolescence sink)

- Raises a **Legendary+** item's ilvl to `maxFloor − 1`.
- Cost:
  - gold `50 × goldPerKill(target) × √(levels raised)`
  - plus Void Cores: 2 (Legendary), 4 (Cosmic), 8 (Mythic)
- In the sim the bot re-tempers 70–110 times a month. That keeps Void Cores and gold under
  steady pressure without starving the Enchanter (Enchanter levels stay within 10% of the
  baseline).

### 2.5 UI (mobile first)

- **Hero panel:** five slot cards. Art is `gear/<slot>_<rarity>.webp`; uniques use
  `gear/unique_<id>.webp`.
- **Combat Rating** is a single number under the hero, with "▲ +12%" when the bag holds an
  upgrade.
- **Bag:** a bottom sheet. 64 px tiles with a rarity border, and slot and ilvl corner
  badges. ▲ marks an upgrade.
  - Sort chips: **Rating ▼** (default) · Rarity · Slot · ilvl · Newest. Filter by slot.
- **Tap a tile:** a compare sheet shows the item next to the equipped one.
  - Green/red deltas for Combat Rating %, Attack, HP and each affix.
  - The unique effect in italics.
  - Buttons: **Equip** · 🔒 **Lock** · **Salvage** · **Sell** · **Re-temper** (if eligible).
- **Long-press** toggles 🔒. Locked items are never auto-salvaged, auto-sold or swapped
  out by Al-Wakeel.
- **Bulk:** "Salvage all unlocked ≤ [Rare]" shows its count and yield before confirming.
  This is the only confirm in the bag.
- **Performance:** build tiles once and patch classes on change. Use the `lastGearSig`
  signature pattern (`main.js:784`), never per-frame `innerHTML`. This avoids the known
  60 fps click-swallow bug.

### 2.6 Kashta (camp) mode

- The hero normally pushes. After **2 consecutive failures at the same gate** (boss timeout
  or death), it auto-camps on the highest **non-boss** floor below the gate for 5 minutes.
- During the camp it kills, loots and gathers gold. A 🏕️ chip shows "Kashta: retry in 3:12".
- Then it retries the gate.
- A manual toggle lets the player camp on purpose.
- Kashta multiplies loot at the wall about ×20: 2,500–3,500 kills per Tower-hour, against
  roughly 100 for a hero bouncing on a boss timer.

---

## 3. Drop tables and odds

### 3.1 Recommended table

| Source | Drop chance | Common | Rare | Epic | Legendary | Cosmic | **Mythic** |
|---|---|---|---|---|---|---|---|
| Regular mob | **8%** × Fortune | 70% | 24% | 5.7% | **0.25%** | **0.05%** | **0.001%** |
| Boss (f%10) | 100% | — | 50% | 38% | 10% | 2% | 0.01% |
| Sheikh (f%50) | 100% | — | — | 75% | 20% | 5% | 0.02% |
| Zone Guardian, first kill | 100% | — | — | — | **guaranteed** (signature or zone set) | — | — |
| Guardian / R18 Warden, repeat | 100% | — | — | — | 60% | 40% | 0.05% |

- **Fortune:** Fortune Favor +15%/rank, Fortune affixes and the Bisht. The total is capped
  at +100%.
- **Mythics** only roll on floors ≥ 151 (zone 3+), so a 12-minute-old save cannot get one.
  The sim saw first Mythics at 0.2 h on some seeds without this gate.

### 3.2 Cadence this produces

Measured in Kashta at the wall: ~2,000 kills and ~300 drops per Tower-hour (full design,
1.105, both profiles).

| Rarity | Per Tower-hour (measured) | Casual (2 h/day) | Engaged (12 h/day) | Feels like |
|---|---|---|---|---|
| Rare | ~75 | constant | constant | small (30 s) |
| Epic | ~18 | ~every 3 min | — | medium |
| Legendary | **~1.4** (incl. boss rolls and pity) | **~3 a day** | ~16 a day | big (a few per session). Most are salvaged for Cores; the *right* Legendary is the chase. |
| Cosmic | ~0.22 | **~3 a week** | ~2–3 a day | big–epic |
| Mythic (natural 0.001%) | ~0.003 | 1 per ~150 days | 1 per ~30 days | epic |

If Legendaries feel too common in playtests, the knob is the mob Legendary weight (0.25%
→ 0.15%). Pity then carries more of it.

### 3.3 Bad-luck protection

| Tier | Rule |
|---|---|
| **Legendary pity** | 600 drops without a Legendary+ → the next drop is Legendary. That is ~1.8× the mean, about 2–3 Tower-hours. |
| **Cosmic pity** | every 10th Legendary without a Cosmic upgrades to Cosmic |
| **Mythic: Barakah meter** | **visible** gauge on the bag. Points per find: Rare 1 · Epic 5 · Legendary 50 · Cosmic 250. First kills: boss 20 · Sheikh 250 · Zone Guardian 1,000. **At 20,000 the next drop is a Mythic.** A natural Mythic also resets it. **Daily soft-cap:** after 1,000 points in a calendar day, further points count ×0.25. The gauge says so ("Barakah resting"), so it is not hidden FOMO; it only narrows the casual/engaged gap. The meter carries over: nothing decays or expires. |

### 3.4 Is 0.001% fun? Expected time to first Mythic

| | Casual (2 h Tower/day) | Engaged (12 h tab/day) |
|---|---|---|
| Natural only, 0.001% per mob drop (+0.01% boss) | mean **~150 days**; over a third never see one in 5 months | mean ~30 days |
| **With the Barakah meter at 20,000** | **~day 20–25**. Measured fill: ~600 points/day from finds, plus ~7.5k first-kill points (bosses, Sheikhs, Guardians to floor 500) in the first two weeks. About 15% get a natural one first. | **~day 8–10** (soft-capped at ~1,500/day). About 25% get a natural one first. (The sim's 25k meter fired at day 16.5–17.5.) |

**Verdict:**
- **Alone, 0.001% is too rare.** A casual player is more likely to quit than to see one,
  and an invisible lottery is not a goal.
- **As a lottery on top of a visible pity meter, it is great:**
  - The meter is the goal gradient ("Barakah 14,200 / 20,000").
  - "1 in 100,000" stays a legend.
  - The natural roll makes the moment a surprise.
- **Recommendation:** keep **0.001% per mob drop** (0.01% boss, 0.02% Sheikh, 0.05%
  repeat Guardian), with **Barakah pity at 20,000** and the 1,000/day soft-cap.

### 3.5 What a ×10 item does to the curve

Measured: casual profile, final config (1.105, rarities 1/2/3/4/5/7, boss mechanics), with
the Mythic **forced on day 14**.

| Mythic forced on day 14 (casual, full, 1.105) | 2 w | 1 m | Δ at 1 m |
|---|---|---|---|
| none | 500 | 500 | — |
| **Wasta Strike** (every 20th hit ×10 = ×1.45 avg) | 500 | **520** | **+20** |
| ×10 additive in Gear Might (+900%) | 500 | 630 | +130 |
| **×10 multiplicative on Attack** | 500 | **620** | **+120 in 16 days** (theory: +171 at 1.105, +257 at 1.11) |

**Reading it:**
- **×10 multiplicative on Attack** is +171 floors of wall at 1.105 (+257 at 1.11).
  - In the sim it broke the 500 Guardian on the spot and reached 620 (Kingdom Centre, the
    Seal of the Tower) by day 30, and it was still climbing (2 Tower-hours a day).
  - Without it, the same save sits at 500. The roadmap puts 620 at about month 2–3.
  - So one lucky drop skips 1–2 months of the arc, and an early natural drop (one seed got
    one at hour 0.2) would skip even more.
  - It also makes everything else in the build irrelevant. **It breaks the arc.**
- **×10 additive inside the Gear Might category** (+900%) is effectively ×5–7, since
  Might is usually only +30–80%. Nearly as bad.
- **×10 of one bounded stat** (gold, drop chance) is harmless but boring. ×10 gold is
  `log2.5(10)` = +2.5 Enchanter levels.
- **Recommended alternative: ×10 as a *moment*, not a *multiplier*.** The **Wasta Strike**
  is every 20th hit ×10:
  - The ×10 is visible about every 15 s.
  - Its average effect is `1 + 9/20` = **×1.45**, which is +19 floors at 1.105.
  - In the sim it added +20 floors by day 30. That is "my best week ever",
    not a skipped zone.
  - **All Mythics are rated ×1.3–1.5 by the same rule.**

---

## 4. Auto-equip: the **Al-Wakeel** keystone

"My wakeel handles it."

| | |
|---|---|
| Tree position | **Warlord branch keystone** (large star node, same pattern as roadmap §3.4 keystones). It sits after **Gladiator Vigour rank 3**, so it reads as a Warlord capstone, not a starter. |
| Cost | **2 TP** (same as Hourglass of Al-Ula and Golem Covenant). Excluded from respec. |
| Requirement | **maxFloor ≥ 301** (Empty Quarter zone star) **and 100 items salvaged**, which proves the player has used the bag by hand |
| Unlock timing | casual **~day 2–3** (floor 301 at ~day 2; ~19–22 TP banked), engaged ~day 1 |
| Teaser | from the first ▲ arrow: a greyed "Al-Wakeel: auto-equip (Constellations)" chip on the bag header |
| What it does | 1) Equips a ▲ item the moment it drops. 2) Smart auto-salvage: also salvages items **strictly dominated** by something equipped or locked. 3) A mode switch: **Climb** (combat only), **Dig**, **Garden**. Economy affixes get weights in Dig and Garden. |

**How it decides "best":**

```
CombatRating = sqrt(DPS_mob · DPS_boss) · sqrt(EHP)
  DPS_mob  = Attack · (1 + crit · (critMult − 1)) · Π unique ratingMult(dmg)
  DPS_boss = DPS_mob · (1 + Slayer)
  EHP      = MaxHP · (1 + 2 · lifesteal) · Π unique ratingMult(surv)
Score(loadout) = CombatRating · (1 + Σ w_mode[affix] · value)   // w = 0 in Climb
```

- It evaluates the **whole loadout with the swap applied**, so set bonuses and category
  caps are counted.
- It swaps only on a gain above **+2%** (hysteresis, so it never flip-flops).
- It **never touches a locked item or a pinned slot.**
- The same function drives the ▲ arrows and the Combat Rating, so manual players see
  exactly what the Wakeel would do. The talent sells convenience, not information.

**Before the keystone** there is no bulk "Equip all ▲" button: one tap per item, on
purpose. The first ~day of choosing is the point.

**Legacy saves** that relied on auto-replace get Al-Wakeel free as a Founder's Keystone
if `maxFloor ≥ 301` (§7).

---

## 5. Boss fights

### 5.1 Tiers

All tiers are relative to the **R8 boss** (`BOSS_HP_MULT = 400`, `BOSS_TIMER_SECONDS = 45`).

| Tier | Floors | HP | Timer | Mechanics | Loot | First kill |
|---|---|---|---|---|---|---|
| Boss (R8) | every 10 | ×1 (400·1.12^f) | 45 s | 1 telegraph type, phase 2 at 50% | Rare+ guaranteed, ilvl +5, 50% signature on Legendary | ×2 gold, +1 💠, +20 Barakah |
| **Sheikh** (milestone) | every 50 that isn't a Guardian | ×1.5 | 60 s | 2 alternating telegraph types, phase 2 | Epic+ guaranteed | Epic+ chest, +250 Barakah |
| **Zone Guardian** | zone ends 50/150/300/500/750/1000 | ×3 | 60 s | **3 phases** (one type, then the other, then both and faster) | first kill: **guaranteed Legendary** (signature or zone set) + 3 💠 + 1,000 Barakah | zone star (roadmap S1) |
| **Warden** (R18, after the first Transcend) | every 250 | ×3 (R18) | 60 s (R18) | as Zone Guardian | R18 trophy (+2% Tower gold) + Guardian first-kill loot if not yet claimed | — |

- **Zone Guardians** are a layer-1 tier at the zone-end floors.
  - They line up with zone stars and the art grid.
  - The sim shows them as natural plateaus: engaged parks at 500 and casual at 450 until gear
    catches up. That is the intended "wall boss" feel.
- **Coexistence with R18 Wardens (layer 2):**
  - Where the two overlap (250, 500, 750, 1000), the fight is one boss, with ×3 HP once (not
    ×9), 60 s, and both reward sets.
  - R18's trophy, challenge list and `hero.wardens` stay as built.
- **Guardian names:**
  - **The Great Dhabb of Thumama** (50)
  - **Hilux Prime, Lord of the Drift** (150)
  - **The Haggler Supreme** (300)
  - **The Rub' al Khali Sandstorm** (500)
  - **Al-Modir Al-Aam, the General Manager** (750)
  - **The Boulevard Showrunner** (1000)
  - Zone 7 R18 Wardens: **Wasta Incarnate**

### 5.2 Telegraphed attacks

Every 8 s (6 s in phase 2) the boss winds up for **1.5 s**:
- an icon over the portrait
- a coloured screen-edge pulse
- a fill bar
- a distinct sound

There are three types, each skinned per boss:

| Type | Bosses (flavour) | Counter (inside the wind-up) | Success | Miss |
|---|---|---|---|---|
| 🔴 **SMASH** | Mutawa "Stick of Discipline swing" · Abu Sarwal "Flying Shib-Shib" | cast **Iron Wall** (any shield) | "BLOCKED!" + boss **Exposed** 3 s (+50% damage taken) | 40% max HP damage (Shield absorbs) |
| 🟢 **FEAST** | Giant Kabsa "Second Plate" · Iftar Samosa "Iftar Cannon" | **Heavy Strike** or **Supernova** | "INTERRUPTED!" + Exposed | boss heals 10% max HP |
| 🔵 **WARD** | Rukbah Soda "Fizz Shield" · Al-Modir "In a Meeting" | **tap the glowing weak point 5×** (a bubble on the portrait) | "BROKEN!" + Exposed | boss takes −75% damage for 4 s |

- **Phase 2 (below 50% HP):**
  - attack ×1.5
  - portrait shake and red tint
  - the music switches to the Boss scale (`main.js:181`)
- **Gentle zones:** floors ≤ 150 telegraph in "practice" mode. A miss has no penalty and a
  success still gives Exposed, which teaches the counters. The calibration sims include
  this.
- **Idle players** miss telegraphs, so bosses are harder AFK. That is the active
  advantage, and it is bounded:
  - Kashta keeps idle progress moving.
  - Nazar of the Haters and the Corporate Wasta set close the gap.
- **Quick Cast** (roadmap #12) puts Iron Wall / Heavy Strike one tap away, so a counter is
  never a menu dig.
- **Near-miss** (roadmap §4.2): "Boss escaped at 4%", with Retry.
- **Readability:** one telegraph at a time; 3–6 per fight; fights last 30–60 s.

### 5.3 State (for the implementer)

- `monster.boss = { kind:'boss'|'sheikh'|'guardian'|'warden', mech:[...], tele, windup, ward, exposed, phase }`,
  set in `CombatSystem.initMonster`.
- Damage multipliers apply in `CombatSystem.dealDamageToMonster`.
- The weak-point bubble and wind-up bar are **static children of the portrait frame**,
  toggled by class (the `MonsterPortrait` pattern in `bossArt.js`).
- `gs.bossFirstKills = { [floor]: true }`.

### 5.4 Boss-specific loot

- Signature uniques (§1.5): 50% of a boss's Legendary rolls.
- Sheikhs and the Zone Guardian of zone N drop zone-N set pieces (wave 3); before wave 3 they drop
  signatures.
- **Every boss drop is ilvl +5.** That is why pushing a new boss feels rewarding even when
  the boss is the wall.

### 5.5 Art

- Bosses use `assets/generated/bosses/zone<N>_boss<M>.webp`. An exact id beats cycling
  (`bossArt.js:56-66`), so special art needs no code change.
- **Zone Guardians** are the last M of each zone: `zone1_boss5`, `zone2_boss10`,
  `zone3_boss15`, `zone4_boss20`, `zone5_boss25`, `zone6_boss25`.
- Zone 7 is endless, so its R18 Wardens need one id, `zone7_warden`. That requires a
  3-line resolver addition in `bossArt.js`.
- **Sheikhs** reuse the cycled art inside a gold ring frame (CSS) with a "SHEIKH" ribbon.
  Exact art can come later.

### 5.6 Void Cataclysm in the Tower

In the Tower it deals `min(40% max HP, 10 × Attack)` and never crits (§0.3).
- It is still a big hit, worth about 10 auto-attacks.
- It no longer ignores the wall.

---

## 6. Numbers

### 6.1 Profiles

| Profile | Tower open | Active (clicks, skills, telegraph answers) | Clicks | Check-ins (equip, buy) |
|---|---|---|---|---|
| **casual** | 2 sessions/day × 1 h | first 15 min of each | 2/s | 30 s active / 15 min idle |
| **engaged** | tab open 12 h/day (hidden mostly; 5 Hz background tick) | 3 × 20 min | 3/s | 10 s / 5 min |

The engaged profile is closest to the roadmap's "casual" row (an AFK tab), so the roadmap
targets (149 / 414 / 498 / ~560 at 1 h / 1 d / 1 w / 1 m) are compared against it. The
casual-session profile is stricter: it gets about 1/6 of the Tower time.

### 6.2 Floor curve (maxFloor)

All runs use `main` `6437f1f` (R8 bosses ×400 / 45 s), 30 days, seed 7 unless noted.
- **"Old gear"** is today's auto-replace (×1–×18).
- **"Full"** is this design: rarity mults 1/2/3/4/5/7, the §3.1 odds, Kashta, re-temper,
  the bot equipping by Combat Rating, telegraphs above floor 150, Sheikh/Guardian tiers, and
  a natural Wasta Bisht if one drops.

| Config | Profile | 1 h | 1 d | 1 w | 2 w | 1 m |
|---|---|---|---|---|---|---|
| **Roadmap target** (AFK-tab profile) | — | 149 | 414 | 498 | — | ~560 |
| Old gear, **1.11** (= `main` today) | engaged | 290 | 579 | 790 | 850 | 850 |
| Old gear, 1.11 | casual | 190 | 470 | 720 | 770 | 810 |
| Old gear, 1.105 | engaged | 270 | 370 | 420 | 450 | 450 |
| Old gear, 1.105 | casual | 120 | 336 | 400 | 410 | 420 |
| Wave 1 only (bag, odds, Kashta, re-temper; no telegraphs), 1.105 | engaged | 170 | 380 | 514 | 550 | 560 |
| Wave 1 only, 1.105 | casual | 90 | 240 | 500 | 500 | 500 |
| **Full, 1.105** | **engaged** | **170** | **360** | **500** | **540** | **580** |
| Full, 1.105, seed 11 | engaged | 190 | 360 | 472 | 500 | 568 |
| **Full, 1.105** | **casual** | **90** | **210** | **485** | **500** | **520** |
| Full, 1.105, seed 11 | casual | 60 | 195 | 493 | 500 | 506 |
| Full, 1.1075 | engaged | 195 | 410 | 660 | 680 | 710 |
| Full, 1.1075 | casual | 80 | 230 | 582 | 600 | 640 |

Per tower-hour (full, 1.105):
- **Kills:** ~2,100 casual-session, ~1,900 engaged
- **Drops:** ~300
- **Re-tempers:** 35–60 a month
- **Void Cores:** never starved
- **Enchanter levels:** within ±10% of the old-gear runs

### 6.3 What the curve shows

- **1.11 with old gear (today's `main`) overshoots** at every checkpoint: about ×1.4–1.6 by
  floor, and Kingdom Centre (501) by day 1–3. This reproduces the slice agent's
  160 / 629 / 730.
- **Old gear at 1.105 hits the 1-day target, then goes flat** (420–450 for a month).
  - A single Cosmic roll saturates rarity, and nothing else moves the wall except the Forge.
  - That is the "gear doesn't matter" complaint in numeric form.
- **The full design at 1.105 hits the roadmap curve almost exactly** for the AFK-tab
  profile (170 / 360 / 500 / 580 against 149 / 414 / 498 / ~560). It also keeps the
  log-shaped late climb that old gear loses:
  - re-temper
  - Legendary and Cosmic chases
  - affix rerolls
  - boss loot
- **The casual-session player** (1/6 of the Tower time) is ~40% behind on day 1. They catch
  up by week 1 (485), because the wall, not the clock, is the limit there.
- **Zone Guardians are visible plateaus.** 500 (Rub' al Khali Sandstorm) holds the casual
  player from about day 7 to day 14, until re-tempered Cosmics break it. That is the
  intended "one big wall per zone" beat.
- **1.1075 is the fallback** if the owner wants a faster arc: about +60–160 floors, with
  Kingdom Centre at about day 3–5.
- **Seed spread is ±5% at 1 week.** Pity timers keep the unlucky seed (11) on curve.
- **Caveats:**
  - The bot equips perfectly at each check-in, and real players will lag a little.
  - Telegraph pressure is modelled coarsely: a reacted telegraph is 85% for an active
    player and 0% when idle. Most wall bosses in the sim end by timeout or hero death
    before many telegraphs fire.
  - Ascension-reset economy effects are inherited from the real classes.

---

## 7. Save migration (a new `MIGRATIONS` step, `SAVE_VERSION` 4 → 5)

- Append `{ to: 5, migrate(data) }` to `js/engine/migrations.js`. Never edit a shipped step.
- Add an old-shaped fixture to `test_saves.js`.
- The live-stats half (the floor step-down) reuses `CombatSystem.rebaseLegacyFloor` by
  setting `hero.pendingFloorRebase`, exactly like R8's step 3.

| Field | Fresh | Legacy migration |
|---|---|---|
| `GEAR_FLOOR_BASE` | 1.105 | Rebase weapon/armor primaries from 1.11 to 1.105. Infer `f_item` from `stat / (base · oldMult[rarity])` at 1.11 (R8's step 3 has already moved pre-R8 saves onto 1.11). Then flag `pendingFloorRebase`, so `rebaseLegacyFloor` steps the floor down to what the new kit clears. **`maxFloor` is kept as the record; `indexFloor` = the rebased floor.** |
| Equipped `h.gear.{weapon,armor,amulet,relic}` | default Commons (+ Rare weapon gift) | Convert each to an item: `{uid, slot, rarity (same name), ilvl = clamp(f_item, 1, maxFloor), affixes: [], uniqueId: null}`. Amulet/relic `ilvl` is inferred from `(crit − 0.02)/(0.001·oldMult)`; capped values get `ilvl = maxFloor`. Primaries are recomputed with the new mults (Legendary 8→4, Cosmic 18→5). |
| Compensation for the nerf | — | Each converted item gets **"Heirloom"**: one random affix of its tier (Rare+), a cosmetic badge, and **one free re-temper** (Legendary+). The step-down then sees the new kit, so no one is stranded. |
| `h.gear.bisht` | Common Bisht | Common Bisht |
| `gs.bag` | `{items:[], cap:30, nextUid:1, autoSalvage:'Common'}` | the same, plus a **Welcome Bag**: one Rare per slot at `indexFloor` |
| `gs.loot` | `{legDry:0, legSinceCosmic:0, barakah:0, barakahDay:null, barakahToday:0, salvaged:0}` | the same, plus `barakah: 2,000` head start |
| `gs.bossFirstKills` | `{}` | every boss floor ≤ `maxFloor` is marked killed **with no payout** (no double-dip, as in roadmap §8). Zone Guardians passed grant their first-kill Barakah only (no Legendary). R18 Warden trophies stay as R18 built them. |
| Al-Wakeel keystone | locked | **Founder's Keystone granted** if `maxFloor ≥ 301`. They had auto-replace and must not lose automation. |
| Talent `loot_fortune` | — | unchanged (now also feeds the Fortune cap) |
| Unknown or garbled gear | — | replaced by a Common at `indexFloor`; the problem is logged to the console |

**Changelog line:** "Void Tower 2.0: a gear bag, named Legendaries, boss mechanics and the
Barakah meter. Your old gear became Heirlooms."

---

## 8. Asset needs (for the art agent)

House style per `assets/requests-status.md`: bold black outlines, cel shading, Saudi meme
humour, WebP.

| Group | Files | Size | Count | Priority |
|---|---|---|---|---|
| Rarity × slot (existing requests) | `gear/<slot>_<rarity>.webp` for weapon/armor/amulet/relic × common/rare/epic/legendary/cosmic | 128 | 20 (already requested) | P1 |
| Mythic rarity frames | `gear/<slot>_mythic.webp`, 5 slots | 128 | 5 | P2 |
| Bisht slot | `gear/bisht_<rarity>.webp`, 6 rarities | 128 | 6 | P2 |
| Boss signatures | `gear/unique_rukbah_can`, `unique_stick_of_discipline`, `unique_kabsa_ladle`, `unique_samosa_buckler`, `unique_sacred_fanila`, `unique_wasta_stamp` | 128 | 6 | **P1** |
| Mob signatures | `gear/unique_grandmas_sandal`, `unique_golden_dallah`, `unique_dhabb_thobe`, `unique_karak_thermos`, `unique_ring_light`, `unique_camry_hubcap` | 128 | 6 | P2 |
| Mythics | `gear/mythic_wasta_bisht`, `mythic_decree_pen`, `mythic_eternal_thobe`, `mythic_nazar`, `mythic_majlis_carpet` | 128 + a 512 splash each (`splash/mythic_<id>.webp`) | 5 + 5 | P2 |
| Zone sets | `gear/set_<zone>_<piece>.webp`, 6 sets × 3 | 128 | 18 | P3 |
| Zone Guardians + zone-7 Warden | `bosses/zone2_boss10`, `zone3_boss15`, `zone4_boss20`, `zone5_boss25`, `zone6_boss25`, `zone7_warden` (`zone1_boss5` exists) | 512 | 6 | **P1** |
| Telegraph icons | `ui/tele_smash.webp` (raised stick), `ui/tele_feast.webp` (kabsa plate), `ui/tele_ward.webp` (fizz bubble), `ui/weak_point.webp` (alpha) | 128 | 4 | **P1** |
| Bag/UI | `ui/bag.webp`, `ui/salvage_bones.webp`, `ui/void_core.webp`, `ui/lock.webp`, `ui/barakah_meter.webp` (a dallah filling with gold), `ui/kashta_tent.webp`, `ui/first_kill_chest.webp`, `ui/wakeel.webp` (talent node) | 128 | 8 | P1–P2 |
| Splash | `splash/gear_legendary.webp`, `splash/gear_cosmic.webp` (already in the wiring plan), `splash/gear_mythic.webp`, `splash/wasta_strike.webp` (gold stamp overlay, alpha) | 512 | 2 + 2 | P2 |

---

## 9. Ranked implementation plan

Effort: S < 30 lines, M 30–120, L > 120 or new UI.

### Wave 1: the minimal set that makes gear a choice

| # | Change | Impact | Effort |
|---|---|---|---|
| 1 | **`GEAR_FLOOR_BASE` 1.11 → 1.105** + **Void Cataclysm cap in the Tower** (`SpellSystem.castSpell`, `void_strike`) + extend `sim/tower-pacing.mjs` to model the bag, Kashta and re-temper (AGENTS rule 4) | Very high: puts the arc back on target, closes the bypass | S |
| 2 | **Item model**: uid, slot, rarity (mults 1/2/3/4/5), ilvl, boss +5, affixes (Might, Vigor, Slayer, Precision, Greed, Fortune; one of each per item); `CombatRating` function; stat aggregation in `getTotalAttack` / `getTotalMaxHp` | Very high | M |
| 3 | **Bag**: 30 slots, ▲ markers, compare sheet, Equip / Lock / Salvage / Sell, auto-salvage Common, bag-full toast | Very high (owner's #1) | L |
| 4 | **Drop table §3.1** (no Mythic yet) + **Legendary pity** + the **6 boss-signature Legendaries** | High | M |
| 5 | **Re-temper** (Legendary+, gold + Void Cores) | High (keeps favourites; the sink) | S–M |
| 6 | **Kashta auto-camp** (never on a boss floor) + 🏕️ chip | High (loot rate at the wall) | S |
| 7 | **Al-Wakeel keystone** (rides the roadmap keystone framework, wave-1 #7) | High (idle and legacy players keep automation) | S |
| 8 | **Save migration §7** | Required | M |

Wave 1 alone (no telegraphs) was simmed as `wave1_*`. See §6.2.

**Filing:** wave 1 is one new roadmap issue ("Gear bag and loot", items #1–8). It touches `CombatSystem.js`, `migrations.js` and a new `js/ui/gear.js`, so it can
run in parallel with non-Tower items.

### Wave 2: bosses that fight back, and the Mythic chase

| # | Change | Impact | Effort |
|---|---|---|---|
| 9 | Telegraphs (SMASH/FEAST/WARD), phase 2, practice zones ≤150, Exposed, juice text | Very high (bosses become events) | M–L |
| 10 | Sheikh and Zone Guardian tiers, first-kill rewards and chest, Guardian art ids (+`zone7_warden` resolver), merge with R18 Wardens on shared floors | High | M |
| 11 | Bisht slot + Mythic rarity + 5 Mythic powers + floor ≥151 gate | High (epic layer) | M |
| 12 | **Barakah meter** (visible, 20k, daily soft-cap) + Cosmic pity | High (goal gradient) | S–M |
| 13 | 6 mob-signature Legendaries | Medium | S–M |
| 14 | Synergy affixes (Delver, Verdant, Brewer, Leyline, Haste) + Wakeel modes | Medium–high (cross-tab choices) | M |
| 15 | Reforge + Saddlebag upgrades (sinks) | Medium | S |

### Wave 3: collections and depth

| # | Change | Effort |
|---|---|---|
| 16 | Zone sets (6 × 3) from Sheikhs/Guardians | M |
| 17 | Gear Museum collection (roadmap §5.3) extended with uniques, sets and Mythics | S–M |
| 18 | Loadout presets (Climb / Dig / Garden), swap in one tap | S–M |
| 19 | Flying Majlis Carpet's offline Kashta (needs an offline combat estimator) | M |

---

## 10. Open questions for the owner

1. **Gear base 1.105 (recommended) vs reining in the Forge.** 1.105 keeps the Forge,
   Enchanter and talents exactly as they are. The alternative is a Forge at +15%/level,
   which needs a Forge-only re-sim.
2. **Mythic power.** Is "×10 as a moment" (the Wasta Strike: ×10 every 20th hit, ×1.45
   average) acceptable, or do you want a literal ×10 multiplier? A literal one needs a cap
   such as "×10 for 10 s after a boss phase change" and its own sim.
3. **Barakah daily soft-cap.** Keep it (it narrows the casual/engaged gap to ~3×), or drop
   it and let engaged players reach a Mythic in ~1 week?
4. **Zone Guardians** (zone-end walls in layer 1) alongside the R18 Wardens (every 250 floors, layer 2): are both tiers wanted, or should the Guardians wait for the Transcend like the Wardens do?
5. **Old-gear nerf on migration.** Is the Heirloom compensation enough? The alternative is
   to keep legacy items' old multipliers as a "Founder's" rarity.
6. **Shard tree "Tower" node** (proposal §R13: "gear stays one tier of rarity higher on
   roll"). Under the new tables that is about ×1.5 power for every drop (+21 floors).
   Proposed replacement: "+25% Legendary+ chance and Barakah ×1.25".
7. **No "Equip all" before Al-Wakeel.** Keep the one-tap-per-item friction for the first
   ~2 days, or add the button from the start?
