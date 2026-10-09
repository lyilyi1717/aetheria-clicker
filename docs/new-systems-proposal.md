# New systems proposal: Cauldrons, Vials, Mastery, Seals

Status: proposal (2026-10-09), companion to `docs/economy-v6-proposal.md`. All four systems
are kept and wired into the loop in `docs/core-loop-redesign.md`: Cauldrons fill per presence
state and add Bubbles into the five Fractions; Vials sit beside Mixer Compounds; Mastery sets Rig
efficiency; Seals run on Crew from New Fields. Where the two docs differ, that one wins. That doc tunes what
exists. This one adds **new mechanics**, borrowed from Legends of IdleOn's Alchemy and Orb of
Creation (the owner asked for "Orb of Destruction"; no game by that name turned up, and Orb of
Creation's use-based spell levelling matches the description). It uses the dopamine taxonomy from
economy-v6 §1 (kind x loop).

## 1. What the two games actually do

### Legends of IdleOn: Alchemy

Sources: [idleon.wiki Alchemy](https://idleon.wiki/wiki/Alchemy),
[Sigils](https://idleon.wiki/wiki/Sigils),
[Steam guide thread](https://steamcommunity.com/app/1476970/discussions/0/591763667545008609),
[bubble tier list](https://gameslikefinder.com/article/idleon-alchemy-guide/).

- **Brewing cauldrons.** Four cauldrons (Power, Quicc, High-IQ, Kazam). Characters are assigned
  to a cauldron and fill its bar. A full bar is spent on **one of two things**: unlock a new
  **bubble** (breadth) or upgrade the cauldron itself (speed, cost, luck, chance of a double:
  depth). The cost of the next bubble climbs steeply: 0.01, 0.15, 0.75, 5, 20, 88, 277, 677,
  1.4K, 2.8K, 5.1K … 494K at bubble 20, 73M at bubble 34.
- **Bubbles.** 100+ in total. Small ones are passive and account-wide; big ones are **active and
  must be equipped** (1 slot, later 2 and 3). Bubbles level with liquid, and effects **saturate**:
  e.g. +50·L/(100+L)% brew speed. Early levels give most of the effect, later ones little, so the
  player spreads out instead of maxing one.
- **Liquids.** Cauldrons make liquid over time up to a cap. Different liquids unlock with
  Alchemy level (Water 1, Nitrogen 20, Seawater 35, Mercury 80) and are spent on bubbles, vials
  and a shop with a daily price reset.
- **Vials.** Every new resource the player finds anywhere can be **dropped into the cauldron for
  a chance to unlock its vial**. Each vial is a permanent bonus, levelled with liquid. Every item
  in every other system is a potential new collection entry.
- **Sigils.** Characters are assigned to a sigil to earn hours of sigil XP. Each sigil climbs
  **named permanent tiers**: Unlocked → Boosted → Ionized → Ethereal → Eclectic, costing
  2 / 100 / 50K / 250K / 10M. A very long ladder for idle time.

### Orb of Creation (Marple)

Sources: [Steam page](https://store.steampowered.com/app/1910680/),
[spell levelling guide](https://prodigygamers.com/?p=35142),
[review](https://www.dlcompare.com/gaming-news/orb-of-creation-redefining-non-idle-incremental-games).

- **Mastery by use.** A spell doesn't get a level you buy; it gets better by **being cast**. A
  hidden bar fills as you use it, and higher mastery makes the spell **cheaper**, not only
  stronger.
- **Schools.** Mastering a spell also levels its category, which helps every spell in it.
- **Layers that intertwine.** Alchemy, agronomy and rituals arrive one after another, and each
  new layer consumes what the earlier ones produce.
- **Combos.** The order and timing of casts makes bursts.

## 2. Why these fit Aetheria's gaps

From the measurements (economy-v6 §3, §6, and the first-week timeline):

| Gap | Which new idea fills it |
|---|---|
| Novelty runs out: tabs by week 1, subgames' species, strata and zones by weeks 1-3 | A **pipeline of 100+ small unlocks** (bubbles, vials) on a steady clock |
| Subgame wins don't reach the main game (one capped pool) | **Vials**: every item from every tab becomes a permanent bonus |
| Everything resets; nothing permanent grows beside prestige | **Cauldrons and Seals are account-wide**: they survive every reset |
| Quiet stretches for the idle player (day-0 hours 5-12, days 5-7) | Cauldrons and Seals fill on **idle time**, so something is ready at every check-in |
| Active play only boosts numbers | **Mastery by use**: playing a system makes it cheaper, plus named ranks |
| The D x D x D idea | **Bubbles add within a cauldron; cauldrons multiply each other.** Saturating bubbles keep it from running away |

## 3. The proposals

### 3.1 The Four Cauldrons (rebuild of Alchemy)

Four cauldrons, each filled from a different part of the game, so every playstyle fills one:

| Cauldron | Fills from | Its bubbles boost |
|---|---|---|
| **Qidr of Oil** | a trickle siphoned from Oil production (idle) | generators, Overclock, tier costs |
| **Qidr of the Hand** | taps, crits, combos (active) | clicking, spells, Frenzy |
| **Qidr of the Sands** | subgame actions: a boss, a tile, a harvest each add charge | Tower, Excavation, Garden |
| **Qidr of Time** | real time, online or offline | offline gains, dust, Transcend, Chronicle |

- **A full bar is a choice**: brew a **new bubble** (drawn from that cauldron's pool, ~25 each,
  100 total) or **upgrade the cauldron** (speed, luck, chance of a double fill). Breadth vs depth
  is a real decision every time, and it takes one tap.
- **Bubble unlock cost grows polynomially, not exponentially** (cost of bubble n ∝ n^k), while
  fill speed grows with cauldron upgrades, so new bubbles keep coming at a steady pace. Target
  cadence with the four cauldrons together: a new bubble every **30-60 min on day 0**, a few
  a day in week 1, then one or two a day for months. That's the hourly Novelty hit the core loop
  lacks.
- **Bubbles level with Essence** (the Garden's essences, renamed if needed) and **saturate**:
  effect = A·L/(B+L). The first levels are the punchy ones (economy-v6's "Expansion" phase), so
  every new bubble starts with a felt jump.
- **D x D x D:** within one cauldron, bubble effects **add**; the four cauldrons **multiply**.
  Oil x (1 + Σ Oil-bubbles) x (1 + Σ Hand-bubbles) x … With saturating bubbles, each factor
  has a ceiling that only new bubbles raise. That's what makes it safe.
- **Active bubbles**: the big bubbles go in **3 equip slots** (1 at the start; slots 2 and 3 from
  milestones). Choosing a loadout for idle vs active play is a Mastery decision.
- **Account-wide**: cauldrons, bubbles and levels are never reset by Ascension, Transcend or
  Chronicle.
- The current recipes stay as **Brews**: timed buffs paid from a cauldron's bar instead of
  crafted from items.

Hits: new bubble (Novelty L2-L3, T2), bubble level (Growth L1, T0-T1), a double fill (Surprise
L1, T1), full bar (Completion L2, T1), loadout swap (Mastery).

### 3.2 Vials: every item becomes a collection entry

- Every distinct item already in the game gets a vial: ores and gems (Excavation), crops,
  hybrids and golden forms (Garden), gear scrap, Void Cores, Boss Tokens and relics (Tower), and
  Bazaar commodities. That's **~50 vials with no new art**: the item's own icon in a glass.
- **Offer** an item to a cauldron for a chance to unlock its vial. **Show the chance and a pity
  bar** (rule 8: honest odds). A few free offers a day plus ones earned in play, never sold.
- Each vial is a **small permanent bonus** to a stat near its source (ruby vial: +crit;
  date-palm vial: +Garden speed; Warden token vial: +boss timer) and **levels with Essence**, with
  named tiers like IdleOn's (Clay → Glass → Crystal → Gold → Aether).
- Vials go into their source's subgame Dimension (economy-v6 §6.1), so a lucky drop in the
  mine is a permanent step on the main screen.

Hits: vial unlock (Novelty + Surprise L2-L3, T2), vial tier (Novelty L4, T3), pity bar
(Completion L2).

### 3.3 Mastery by use (Orb of Creation)

Every repeated action gets a hidden-then-visible mastery bar that fills **by doing it**:

| Action | Mastery makes it… | School |
|---|---|---|
| Casting each spell | cheaper mana, shorter cooldown | **Wasta** (clicker and spells) |
| Overclocking each generator tier | lower Overclock threshold, +output | **Wasta** |
| Each hero skill, each boss type beaten | stronger skill, slower boss timer | **Saif** (Tower) |
| Dynamite, each pickaxe ability, each stratum dug | cheaper, stronger | **Ard** (Excavation) |
| Harvesting each crop species | faster growth, better mutation odds | **Nakhl** (Garden) |

- **Named ranks** per action: Novice → Adept → Master → Grandmaster → Legend. Each rank-up
  is a T2 moment; Legend is T3.
- **Schools level from all their actions' mastery** and give a school-wide bonus. Playing one
  part of the game a lot spreads to the rest of that school.
- **Idle-friendly**: automated actions (drills, golems, Auto-tap, Auto-Overclock) earn mastery
  at a reduced rate, so a low-click player still climbs, just slower. Active play is rewarded,
  absence isn't punished.
- Mastery persists through every reset. A re-run after a prestige is faster and cheaper, so the
  player *feels* the gain.

Hits: rank-up (Growth + Novelty L2-L3), school level (Growth L3), first Legend (T3).

### 3.4 Seals of Time (IdleOn's Sigils)

- 12 **Seals**, one per month theme of the year (oasis, falcon, pearl, caravan, …). The player
  **assigns a Golem** (the Garden's Golems, new uses) to a Seal; it earns Seal hours online and
  offline.
- Each Seal climbs **named permanent tiers** with costs on IdleOn's shape (2 / 100 / 50K /
  250K / 10M hours-equivalent, scaled to the year): Unlocked → Gilded → Blessed → Radiant →
  Eternal, each a **bigger, different bonus**.
- Designed so a tier lands roughly **every 1-2 weeks across the year** for a player who keeps
  Golems assigned. That's the L4 Novelty clock the late game lacks, and it needs no attention
  between check-ins (a Return hit).
- Golem slots grow with Chronicles, which ties the top layer to the long ladder.

Hits: Seal tier (Novelty L4, T3), Golem slot (Novelty L4), Seal hours on return (Return L3).

### 3.5 Layers that intertwine (Orb of Creation)

Each new system consumes what the others make, so nothing becomes a dead tab:

```
Generators ──Oil trickle──▶ Qidr of Oil ──bubbles──▶ generators, Overclock
Taps ───────────────────▶ Qidr of the Hand ───────▶ clicks, spells
Tower/Mine/Garden actions ▶ Qidr of the Sands ─────▶ subgames
Items from every tab ──offer──▶ Vials ─────────────▶ subgame Dimensions
Garden essences ──▶ bubble and vial levels
Golems ──▶ Seals of Time ──▶ year-long tiers
Every action ──use──▶ Mastery ──▶ cheaper actions + Schools
```

## 4. When each one opens (novelty calendar)

| When | Unlock | Cadence it adds |
|---|---|---|
| Day 0, ~30 min | Qidr of Oil + first bubble | a bubble every 30-60 min on day 0 |
| Day 0, ~2 h | Mastery bars become visible (first rank-up) | rank-ups every session |
| Day 1 (Excavation open) | Qidr of the Sands, Vials | vial unlocks from drops |
| First Ascension | Qidr of the Hand | |
| First Transcend | Qidr of Time, active-bubble slot 2 | |
| Week 2 | Seals of Time (first Golem slot) | a Seal tier every 1-2 weeks |
| Each Chronicle | +1 Golem slot, new liquid type that unlocks a new bubble pool | new pools keep bubble novelty going all year |

## 5. Guardrails

- **No dark patterns (rule 8):** odds and pity always shown, offers earned not bought, nothing
  decays or stops while away. IdleOn's liquid cap stops production when full; ours overflows
  into a jar at a reduced rate instead.
- **Economy:** saturating bubbles plus the economy-v6 record gate keep the ceiling controlled.
  Every number here needs a sim model (`sim/cauldrons.mjs`) before it ships, measured with the
  hit-cadence report (`--feel`, `--timeline`).
- **Saves:** all new state is new fields with defaults (rule 2); old saves start with empty
  cauldrons and get a starter bubble based on progress so far.
- **Content cost:** bubbles, vials and Seals are mostly text, numbers and existing icons. The
  art budget goes on cauldron and Seal visuals, and each needs Arabic (rule 11).

## 6. Suggested order

1. A sim model of the four cauldrons and bubble cadence against the targets in §3.1.
2. Qidr of Oil plus 25 bubbles plus the bar choice (one cauldron end to end, UI to style guide).
3. Mastery by use for spells and Overclock (the Wasta school), then the other schools.
4. Vials (needs the Sands cauldron).
5. Seals of Time (needs Golem changes).
