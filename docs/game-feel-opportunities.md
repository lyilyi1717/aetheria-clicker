# Game-feel opportunities (audit against the game-feel guide)

**Status:** audit and proposal, written 2026-10-07 against v4.12.0. Research only: no game code
changed. Read `docs/game-feel-guide.md` first; this report uses its principles (P1–P9), tiers
(T0–T3), guardrails (§5) and checklist (§7). Code is referenced by `file:function` because line
numbers drift.

**How it was checked:** every `sound.play*`, `particles.spawn*` and `rewards.notify/toast` call
site in `js/` was read, plus `css/animations.css`, `css/rewards.css`, `css/tokens.css` and the
click/attack/dig handlers in `js/main.js`. The Refinery was also played in Chromium at 1280 px
and 375 px (25 rapid clicks into Frenzy).

---

## 1. Summary: the biggest gaps

1. **Rare is not different (P3).** The game has ten sound functions, but meaning is not
   attached to them. `playBuy` plays for spending Oil, *and* for claiming a contract, claiming
   the Daily Dallah and breaking a gold cache. `playSpell` plays for every spell, Frenzy start,
   a caravan leaving, a brew, buying Chrono Sand and a talent respec. `playGem` plays for gems,
   every harvest, every anomaly and selling at the Bazaar. The player can't tell by ear what
   happened. `playAscension` exists and is never called.
2. **No build-up, no hit-stop, no shake anywhere (P4).** Every T2/T3 moment starts at full
   volume on the frame it happens. Ascension and Transcend start with a browser `confirm()`
   box, which is the opposite of a wind-up.
3. **Boss kills feel like trash kills (P2, P3, P8).** A boss, a Warden and a floor-1 slime all
   end with the same `playDefeat` blip and the same floating number. Only the *first* Warden
   kill gets a ceremony (the trophy). The boss enrage timer is plain text with no urgency as it
   runs out (P7).
4. **The return from offline is silent and static (P6, P8).** The Welcome Back modal is the
   peak-end moment of every session, and it opens with no sound and no count-up; the total is
   printed in a table.
5. **The Monolith click, the most frequent action, piles up (P5, P9, guardrails).** Floating
   numbers stack into an unreadable column on the orb at phone width; the "Tap to pump Oil!"
   tooltip sits over the orb while you tap; the combo bar *empties* the instant you reach a
   Frenzy, which reads like a loss at the best moment; and the Frenzy start is just the generic
   spell whoosh.
6. **First-time unlocks are under-tiered (P2).** The guide makes "the first time something
   unlocks" a T3 moment. `UnlocksUI.reveal` shows a `big` toast, and toasts above `small` play
   the medium bell (`RewardFeedback.toastSound`), so a whole new tab arrives with the same
   sound as an achievement.
7. **One honesty problem (guardrail §5).** Selling at the Bazaar always plays the gem chime
   and a gold "+N gold" toast, even when the player sells below what they paid. That is a loss
   disguised as a win.
8. **No effect budget (guardrails: performance).** `ParticleEngine` has no particle or text
   cap and draws every spark with `shadowBlur` inside `save/restore`. Frenzy, Supernova and
   Dynamite can all stack.
9. **Reduced motion drops one colour cue.** The global `animation: none !important`
   (`css/tokens.css`) also kills `.reward-pulse` (the gold "look here" glow) and
   `.blast-flash` on mining tiles. The guide says keep the colour change under reduced motion.

What already works well and should be reused: the reward grammar in `js/ui/rewardQueue.js`
(tiers, coalescing, a 60 s cooldown on big ceremonies, epic never dropped), the skippable
ceremony with a 0.8 s count-up and a reduced-motion duration (`js/ui/rewards.js`), the four
tier sounds (`playPluck/Bell/Brass/Choir`), crits (own sound, gold colour, 2× sparks, bigger
text), the Strata Relic pity timer, and `isReducedMotion()` everywhere it is checked.

---

## 2. Every moment, scored

Tier = the tier it **should** be (guide §4 P2). "Today" lists what the player gets now.
Abbreviations: snd = sound, fx = sparks/particles, ft = floating text, toast/cer = reward
toast/ceremony from `js/ui/rewards.js`. RM = reduced motion.

### 2.1 Refinery (click loop)

| Moment | Today | Tier | Gaps |
|---|---|---|---|
| Monolith click (`ClickerSystem.handleClick`, `main.js` pointerdown) | snd `playClick(pitch)` (pitch +3 % per combo click, resets every 20); 10 blue sparks; ft "+n"; orb scales to 0.94 for 100 ms. RM: no sparks, ft fades in place, no scale. | T0 | Good base. ft spawns in a ±15 px box and decays slowly, so 10+ taps/s stack into an unreadable column (seen at 375 px). Tooltip covers the orb while tapping (P9). Squash is a hard 100 ms step with no ease back. |
| Crit (`handleClick`, `isCrit`) | snd `playCrit` (3-note sweep); 20 gold sparks; ft "CRIT! +n" 22 px Cinzel. | T1 | Meets T1. No crit-streak escalation (P5). "CRIT!" and the number share one string, so the number fights the label (P7). |
| Combo build (`comboBar.renderCombo`) | Bar fills over 20 clicks, text "22x Combo! (5.0x boost) · Frenzy in 18". Pitch rises slightly. | T0 chain | Escalation is only the bar and +3 % pitch (P5). At the milestone the bar resets from full to empty (it now shows progress to the next Frenzy), which reads as a loss. No milestone feedback at x2/x3/x4/x5. |
| Frenzy start (`ClickerSystem.triggerFrenzy`) | snd `playSpell` (same as every spell); `.frenzy-badge` pulses 3×; header buff chip. | T2 | Not distinct (P3); no build-up although the last clicks before it are predictable (P4); no banner or callout ("FRENZY!") at the orb. Frenzy *extension* is silent apart from the same whoosh. |
| Frenzy end | Badge disappears. | T0 | Fine to keep quiet (no punishment). Could show a small "Frenzy: +n Oil" summary (P8). |
| Golden anomaly appears (`spawnAnomaly`) | `#golden-anomaly` ✨ fades in somewhere on screen. No sound. | T1 | A rare, short-lived (12 s) event appears silently; easy to miss on a long idle session (P1 for events, Cookie Clicker's golden cookie has its own sound). |
| Golden anomaly click (`clickAnomaly`) | snd `playGem`; 35 gold sparks; medium toast (bell) with title per type. | T1 (Supernova, Vein, Cache, Flux) / T2 (Mirage 1 in 12, Caravan Star 1 in 20) | All six types look and sound the same (P3); the rare ones are not rarer-feeling. Supernova's Oil amount is a toast, no count-up (P6). Two sounds stack (gem + bell). |

### 2.2 Buying and spending

| Moment | Today | Tier | Gaps |
|---|---|---|---|
| Generator buy (`BuildingSystem.buyBuilding`) | snd `playBuy`. Card re-renders. | T0 | No visual on the card (no pop, no count tick) (P1 visual half). Buy ×100 / MAX feels the same as ×1 (P2). Milestone counts (25/50/100…, Codex entries) arrive later as a separate quiet toast. |
| Upgrade buy (`UpgradesUI.buy`, `UpgradeSystem.buy`) | snd `playBuy`; small silent toast; source card pulses gold. | T0 / T1 for "Buy all" | OK. "Buy all" with 8 upgrades = one toast, no escalation (P5). |
| Reserve Shop feature (`DustShopUI`) | First rank: big ceremony (brass). Later ranks: medium toast. | T2 first / T0 later | Good tiering. `playBuy` also plays under the ceremony brass. |
| Shard tree node, talent, page upgrade | `playBuy` or `playSpell` + medium toast. | T1 | OK; same sounds as everything else. |
| Pickaxe / Auto-Drill / Golem / Forge | `playBuy` (+ medium toast for Forge). | T0 | No visual on the button. |
| Time Warp (`main.js` warp button, `FastForwardSystem`) | `playSpell` + small toast. Effects are suppressed during the warp, rewards batched. | T1 | The "warp" itself has no visual (no time-blur, no fast-forward sweep); the batched results arrive as separate toasts. |

### 2.3 Combat and the Void Tower

| Moment | Today | Tier | Gaps |
|---|---|---|---|
| Tap the monster (`activeClickAttack`) | snd `playHit`; 8 orange sparks; ft "-n"; card shifts 2 px for 80 ms (`.hit-shake`). RM: no shift. | T0 | Good. No monster flash/recoil on the portrait; amulet crits only change colour. |
| Hero skill (`castHeroSkill`) | `playSpell` + crit-style ft at **screen centre** (not on the monster). | T1 | Strike and Supernova sound like Shield and Leech (P3). ft at `innerWidth/2` misses the monster on desktop (layout has a side nav). |
| Monster kill (`onMonsterDefeated`) | `playDefeat` (square blip). | T0 | Fine for trash mobs. |
| **Boss kill** | Same `playDefeat`, nothing else. Hero level-up may add a medium toast. | **T2** | Biggest combat gap: no hit-stop on the killing blow, no distinct sound, no "Boss down!" callout, no gold count (P2, P3, P4, P8). |
| Boss enrage timer (`main.js` `bossTimerEl`) | Text "⏱️ Enrage: 12.3s". | T0 → urgency | No change as it runs out (P7: when there is a timer, progress-to-target should become obvious). |
| Boss timeout / defeat (`notifySetback`) | Small red toast, coalesces. | — | Honest and quiet. Keep. |
| Warden first kill (`onWardenDefeated`) | Epic ceremony (choir). | T3 | Good. Repeat Warden kills get nothing beyond the trash-mob blip (should be T2 like a boss). |
| Hero level-up | Medium toast (bell). | T1 | OK. |
| Gear drop (`notifyGear`) | Small silent toast, coalesced. | T0 / T1 by rarity | Rarity colour is used for the toast, but a legendary drop sounds like nothing (P3, Diablo row in the guide). |
| Second Wind | Small toast. | T1 | Silent rescue; deserves its own short sound. |

### 2.4 Excavation

| Moment | Today | Tier | Gaps |
|---|---|---|---|
| Dig a tile (`MiningSystem.mineBlock`) | `playDig`; 6 grey sparks; ft "-power". | T0 | Good. Tile itself doesn't crack/recoil. |
| Stone yield | ft "+n STONE". | T0 | Two floating texts per tap (damage and yield) at the same spot. |
| Gem (`revealReward`, gem tiles) | `playGem` + ft "+1 RUBY!" in the gem's colour. | T1 | Same arpeggio for a ruby and a diamond (P3; the guide's rarity colours exist but there is no rarity *sound*). |
| Gold cache | `playBuy` (the spending sound) + gold ft. | T1 | Wrong sound family (a gain plays the "you spent" sound). |
| Aether Ore (rare drop) | ft only, no sound. | T1 | Silent rare drop. |
| Stairs | `playAchievement` + ft "STAIRS FOUND! DEPTH +1". | T1 | OK; the grid then waits `DESCEND_DELAY` with no transition. |
| New stratum | Big ceremony. | T2 | Good. |
| Strata Relic (`rollRelic`) | Big ceremony (brass). | T2 | Good, but no build-up on the tile that dropped it. |
| Dynamite (`useDynamite`, `blastBlocks`) | `playHit` (the combat hit); 10 orange sparks per tile; `.blast-flash` colour flash. RM: global rule removes the flash. | T1 | No explosion sound; RM loses the colour cue. Auto-Blast is silent (correct). |

### 2.5 Garden, Alchemy, Bazaar

| Moment | Today | Tier | Gaps |
|---|---|---|---|
| Harvest (`GardenSystem.harvestPlot`) | `playGem`; up to five floating texts stacked at −0/−15/−30/−45/−60/−75 px (essence, mana, mutant seed, Bazaar drop 300 ms later, golden). | T0 / T1 | Text stack overlaps neighbouring plots at 375 px (P9). Mutant seed (25 %) is text only. |
| Golden harvest (1 %) | `playAchievement` + ft. | T2 | Rarest garden event has no visual beyond text (P3). |
| Breeding (`breedPlots`) | Success: `playAchievement` + ft. **Failure: no sound, no visual** (both harvests run silent). | T1 | P1: a tap that does something must answer. Failure should be a neutral "no hybrid this time" (not a near-miss, §5). |
| Water / Fertilize | `playSpell` + small toast. | T0 | OK. |
| Golem bought | `playBuy`; `main.js` ft "ROW n AUTOMATED". | T1 | OK. |
| Brew (`AlchemySystem.brew`) | `playSpell` + small toast; permanent: medium toast. | T0 / T1 | OK. |
| Recipe discovered | Big ceremony. | T2 | Good. |
| Polish gems | `playGem` + small toast. | T0 | OK. |
| Market buy | `playBuy` + small toast. | T0 | OK. |
| **Market sell** (`MarketSystem.sellCommodity`) | `playGem` + "+n gold" toast, always. | T0 | **Guardrail:** same win feedback when the sale is at a loss. |
| Caravan out / back | `playSpell` + small toast / medium toast with gold. | T0 / T1 | Return is a nice T1 moment; no count-up on the gold. |

### 2.6 Meta, calendar and progression

| Moment | Today | Tier | Gaps |
|---|---|---|---|
| Achievement (`AchievementSystem.unlock`) | Medium toast (bell), coalesces. | T1 | OK. Toast can cover the guide banner's "Less" toggle on desktop (seen at 1280 px) (P9). |
| Contract complete (`BountySystem.checkProgress`) | Medium toast "Claim it on the board". | T1 | OK. |
| Contract claim (`claimBounty`) | `playBuy` only. No toast, no number. | T1 | Collecting a reward plays the spending sound; gold/seals/sand amounts are never shown at the moment of claiming (P7 says show the feeling, but the number must be readable afterwards; here it simply vanishes). Guild Rank-up comes via its own grant. |
| Daily Dallah (`CalendarUI.onClaim`, `CalendarSystem`) | `playBuy` + medium toast (bell) a frame later. | T1 | Two sounds overlap; the daily return ritual has no visual of its own (a pour, steam, the cup filling). |
| Ledger goal / stamp, Seal lit | Medium toasts. | T1 / T2 (stamp, seal) | A lit Seal is permanent and rare (7 total) but is a toast like an achievement (P3). |
| Codex entry / set | Small toast / big ceremony. | T0 / T2 | Good. |
| **Offline return** (`renderOfflineModal`) | Static modal, breakdown table, no sound, no count-up. | **T2** | P6 (count-up), P8 (celebrate the end), two senses (§7). The wording is already honest. |
| Tab unlock (`UnlocksUI.reveal`) | Big toast, plays the medium bell; nav item gets a NEW tag. | **T3** (first time) | Under-tiered; no "look here" on the new nav item beyond the tag. |
| New Well / ascension (`PrestigeSystem.ascend`) | `window.confirm()`, then big ceremony (brass, 2.4 s, Reserves count up 0.8 s). | **T3** | No build-up, native confirm box, `playAscension` unused, ceremony is the same as a Strata Relic. Coalesces under the 60 s big cooldown, so a fast second ascension becomes a toast. |
| New Field / transcend (`PrestigeSystem.transcend`) | `confirm()`, then epic ceremony (choir, 3.6 s). | T3 | Good tier; same card as a Warden trophy (P3), no wind-up. |
| Chronicle stamp / chapter (`chronicle.js`) | Epic / big ceremony. | T3 / T2 | Same card as everything else. |
| Spell cast (`SpellSystem`) | `playSpell` + small toast. | T1 | Every spell sounds the same. |

---

## 3. Ranked improvements

Ranked by impact on how the game feels divided by effort. Effort: S (< ½ day), M (1–2 days),
L (3+ days). Every item below assumes the shared helper in §4 exists (item 1) and goes through
it; the timings are proposals the implementer may tune.

### 1. Shared feedback helper and effect budget (impact: high, effort: M)
Foundation for everything else; see §4. Adds particle/text caps, per-kind sound cooldowns and a
single reduced-motion path. Files: new `js/ui/feedback.js`, `js/engine/ParticleEngine.js`
(caps, text merge), `js/engine/AudioEngine.js` (a few new voices). Test: `test_feedback.js`.

### 2. Boss and Warden kills become T2 (high, S–M)
- Killing blow on a boss/Warden: **hit-stop 90 ms** (freeze the portrait: add
  `.is-hitstop` that sets `animation-play-state: paused` and holds the hit pose; the sim keeps
  running, only visuals pause), white flash on the portrait (opacity 0.6 → 0 over 150 ms),
  card shake 3 px × 3 over 240 ms.
- Sound: new `playBossDown()` = low thud (sine 80 Hz → 40 Hz, 120 ms) at hit-stop end, then
  `playBrass` cut to its last two notes.
- Callout "BOSS DOWN!" (Cinzel, `--gold`) over the portrait for 900 ms; gold count-up chip
  "+n gold" under it (600 ms, P6), readable afterwards in the combat log/hero stats.
- Repeat Warden kills get the same T2; the first kill keeps its epic trophy after it.
- Enrage timer: at ≤ 10 s turn `--danger` and tick once per second (`playPluck` at low volume,
  max 10 ticks); at ≤ 3 s the timer text scales to 1.15. RM: colour only, no scale.
- Files: `CombatSystem.onMonsterDefeated`, `main.js` (only the timer class toggle, or move to
  a small `js/ui/combatFx.js`), `css/style.css`.

### 3. Offline return celebration (high, S)
- On open: `playBell`, then the total counts up from 0 over **1.2 s** (ease-out, capped at
  1.2 s however long the absence); the breakdown rows fade in after the count (120 ms each).
- Gold sparks from the total (24, once). A **Collect** button closes it with `playPluck` and
  the header Oil value pulses (`rewards.pulse('stat-aether')`).
- RM: no count-up or sparks, total shown at once, sounds kept. Skippable by tapping (the count
  snaps to the end).
- Wording stays neutral (no "you lost x while away"). Files: `js/ui/offlineModal.js`,
  `index.html` (button label only), `css/style.css`.

### 4. Monolith loop: readable numbers, combo escalation, a real Frenzy moment (high, M)
- **Floating text merge:** within 150 ms and 40 px, add to the last "+n" instead of spawning a
  new one, and bump its size (16 → max 22 px) — like the toast coalescing. Cap 12 live texts
  near the orb. Crits stay separate.
- **Split label and number on crits:** "CRIT!" pops at the click (scale 1.4 → 1, 160 ms),
  the number floats from under it.
- **Combo escalation (P5):** at combo 5/10/15/20 a small ring pulses on the combo bar and the
  orb glow steps up one notch (4 steps, capped). Click pitch rises one scale step per 4 combo
  clicks instead of a +3 % detune, so the run up to 20 is audibly a climb (cap: 5 steps). Reset
  gently: pitch drops one step per 200 ms of drain, not at once.
- **Frenzy (T2):** on the 18th and 19th click the bar glows (wind-up); at 20: new
  `playFrenzy()` (fast rising 4-note arpeggio + noise swell, 400 ms), "FRENZY!" callout over the
  orb (700 ms), ring burst of 30 sparks, orb tint goes `--danger` while Frenzy lasts. The bar
  should *hold full and glow* for 400 ms before it switches to "next Frenzy" progress, so the
  milestone never reads as a loss. Extension: a smaller "+4 s" chip and `playPluck` high.
- Hide the "Tap to pump Oil!" tooltip after the first tap of a session.
- RM: no ring/sparks/scale; callout text and colour change stay; sounds stay.
- Files: `ClickerSystem.handleClick/triggerFrenzy`, `js/ui/comboBar.js`,
  `ParticleEngine.spawnFloatingText`, `css/style.css`.

### 5. Ascension and Transcend as real T3 ceremonies (high, M–L)
- Replace `confirm()` with an in-game confirm sheet showing the exact trade (it already exists
  as text in `js/ui/prestige.js`); the confirm button is a **hold-to-drill (800 ms)** with a
  rising tone (`playAscension`'s sweep, finally used), which is the build-up.
- Release: screen dims, the Refinery orb sinks (translateY 0 → 40 px, 400 ms), a gusher burst
  (60 particles upward, `--aether` → `--gold`), named callout "NEW WELL!" / "NEW FIELD!", then
  the existing ceremony card with the Reserves count-up. Total ≤ 3.5 s, skippable at any time
  (P2 T3 budget).
- Transcend gets its own signature (purple field map sweep + choir), not the Warden card.
- Ascension ceremonies should bypass the 60 s big-ceremony cooldown (a deliberate player act
  should never be demoted to a toast) — an owner decision, see §6.
- RM: no sink, no burst, 1.6 s/2.4 s card (existing `ceremonyReducedMs`), hold still works
  (or a plain tap if the owner prefers; holds can be hard for some players — see §6).
- Files: `js/ui/prestige.js`, `main.js` (the New Well button handler only),
  `PrestigeSystem.ascend/transcend`, `js/ui/rewards.js` (a `signature` option on the ceremony),
  `css/rewards.css`.

### 6. Give every reward family its own sound (P3) (medium-high, M)
Map sounds to meaning, not to "whatever was closest":

| Family | Sound | Used by |
|---|---|---|
| Spend | `playBuy` (keep) | generators, upgrades, shop, market buy |
| Collect / claim | new `playCoins` (2–3 short bright plucks, random detune ±15 cents) | contract claim, Daily Dallah, gold cache, caravan back, market sell (at a gain) |
| Find (rarity) | `playGem` with rarity: common 2 notes, rare 3, epic 4 + shimmer, legendary 4 + bell partial | gems, gear drops, Aether Ore, mutant seed, anomaly |
| Cast | `playSpell` with a per-spell interval (root, fourth, fifth, octave) | spells, hero skills |
| Boom | new `playBlast` (noise burst + low sine, 250 ms) | Dynamite, Void Cataclysm |
| Milestone | `playBell` / `playBrass` / `playChoir` (keep) | via reward tiers |

Contract claim also shows its amounts (gold/seals/sand) in a small toast so the number is
readable afterwards. Files: `AudioEngine.js`, call sites listed in §2.

### 7. First-time unlocks as T3 (medium, S)
`UnlocksUI.reveal` → a short ceremony (`epic` sound, 2 s, skippable) the *first* time each tab
opens, then the nav item pulses gold 3 times (`dynamic-pulse` rules). Several unlocks at once
coalesce into one ceremony ("2 new places"). Files: `js/ui/unlocks.js`,
`js/ui/rewards.js` (a toast `tier: 'big'` should play brass, not the bell — fix in
`toastSound`).

### 8. Rare anomalies and rare finds look different (medium, S)
- Anomaly appear: soft `playPluck` + a 600 ms shimmer on spawn (once; no looping pulse beyond
  3 per style guide §6).
- Mirage: purple haze vignette for its 60 s (CSS overlay at 6 % opacity, off under RM) +
  distinct sound. Caravan Star: a camel silhouette crosses the header (1.2 s). Supernova: the
  Oil counter counts up (800 ms).
- Golden harvest (1 %): gold ring burst on the plot + `playBrass` short; Mutant seed: `playGem`
  rare; Aether Ore: rare `playGem`.
- Files: `ClickerSystem.clickAnomaly`, `GardenSystem.harvestPlot`, `MiningSystem.revealReward`,
  `css/style.css`.

### 9. Honest Bazaar sale feedback (medium, S — needs a decision)
Sell at a gain: `playCoins` + green "+n gold (+x %)" toast. Sell at or below the reference
price: neutral click + plain toast "Sold for n gold", no chime, no green. What "reference
price" means is an owner decision (§6). Files: `MarketSystem.sellCommodity`.

### 10. Purchases have a visual half (medium, S)
Generator buy: the card's count ticks with a 120 ms pop (`--ease-pop`), and a small "+1"/"+100"
chip rises from the Buy button. Buy ×10/×100/MAX: one chip, size steps with the amount (3 sizes,
capped), `playBuy` pitch up one step per size. Same for Pickaxe/Drill/Golem/Forge buttons.
RM: number changes, chip fades in place. Files: `main.js` building delegation (one call into
the helper), `css/upgrades.css`.

### 11. Reduced-motion colour cues (medium, S)
Under reduced motion, replace the killed animations with **static** states held for the same
time: `.reward-pulse` → a gold outline for 900 ms; `.blast-flash` → the orange inset for
600 ms; boss portrait flash → a red border for 150 ms. Implement as a class swap with a timeout
in the helper (no animation needed). Files: `css/rewards.css`, `css/style.css`,
`js/ui/feedback.js`.

### 12. Breeding and other silent taps answer (low-medium, S)
Failed breed: neutral `playPluck` + ft "No hybrid this time" in `--text-dim` (not "so close",
§5). Audit for other silent actions while building item 1 (any handler with no sound and no
visual change).

### 13. Smaller polish (low, S each)
- Hero skills: ft on the monster, not at screen centre.
- Dig: tile cracks (a 2-step crack overlay at 66 % / 33 % HP).
- Daily Dallah: a pour animation in the cup (1 s) and only one sound.
- Seal lit: big ceremony (it is permanent and there are seven).
- Frenzy end: a small summary toast "Frenzy: +n Oil" (P8).
- Achievement toast should not cover the guide banner controls on desktop (P9): offset the
  toast stack below the banner, or let banner toggles sit above the toast layer.

---

## 4. Proposal: a shared feedback-tier helper

**Goal:** one place decides how loud a moment is, so the tiers stay consistent and the
guardrails (caps, cooldowns, reduced motion, sound settings, Fast Forward suppression) are
enforced once.

**File:** `js/ui/feedback.js` (UI layer; systems call it the way they call `rewards.notify`
today, and it is a no-op without a DOM so node tests keep working). Pure parts
(`budgetFor`, `chainStep`, cooldown bookkeeping) live in `js/ui/feedbackBudget.js` with no DOM,
tested by `test_feedback.js`.

```js
// Sketch, not final API
feedback.fire(tier, {
  kind,          // 'click', 'crit', 'boss-down', ... used for cooldowns and chains
  at,            // {x, y} or an element; where sparks/text/callouts go
  color,         // token or hex; through themeColor()
  sound,         // a sound id from AudioEngine, or false
  label,         // short callout ("CRIT!", "BOSS DOWN!"); T1+ only
  amount, fmt,   // the number (shown small/after, P7)
  target,        // element to shake / hit-stop / pulse
  chain: true,   // escalate with repeated `kind` (P5)
});
feedback.countUp(el, from, to, { ms, fmt });   // shared by rewards.js, offline modal, boss gold
feedback.hitStop(el, ms);                      // visual freeze only, sim keeps running
```

**Budgets per tier** (`budgetFor(tier, { reduced, phone })`):

| | T0 tap | T1 good | T2 great | T3 peak |
|---|---|---|---|---|
| Sparks | 6–10 | 16–24 | 30–40 + ring | 60, ceremony |
| Text | "+n", 16 px, merges | label + n, 20 px | callout 28 px, 900 ms | ceremony card |
| Sound | own voice, no cooldown, pitch from chain | own voice, 250 ms cooldown per kind | distinct voice, 1 s cooldown per kind | ceremony voice |
| Motion | squash 120 ms | pop 160 ms | hit-stop 60–120 ms + shake 3 px ≤ 240 ms | build-up 400–800 ms, release, ≤ 4 s total |
| Reduced motion | no sparks/squash, text fades in place | colour state + sound | colour state + callout + sound, no shake/flash | short card (`ceremonyReducedMs`), sound |
| Phone (≤ 480 px) | sparks × 0.6 | × 0.6 | × 0.6 | × 0.6 |

**Global caps:** 250 live particles (150 on phone), 40 live texts, at most 3 full-screen
flashes per second (the guide's photosensitivity rule), at most one shake running at a time.
Over the cap, the oldest particles fade faster instead of new ones being dropped, so the
newest action always answers (P1).

**Chains (P5):** `chainStep(kind, now)` returns 0..cap; it rises by one per event within the
chain window (e.g. 600 ms) and falls one step per window of silence (gentle reset). The click
pitch, spark count and text size read it.

**Respects:** `isReducedMotion()` (motion.js), `sound.muted/volume` (AudioEngine),
`particles.suppressed` / `sound.quiet` (Fast Forward), and the reward queue (it never opens a
ceremony itself; T3 goes through `rewards.ceremony` so the queue and skip rules still apply).

**Migration path:** helper first with no behaviour change (the current calls re-expressed as
tiers), then one PR per area from §3. Each PR runs the guide's §7 checklist.

---

## 5. Roadmap issues

Filed as R41–R49 (issues #113–#121, rows in the `docs/STATUS.md` Plan table). R41 comes first;
the rest depend on it. Order follows §3.

| Item | Title | Done when |
|---|---|---|
| GF-1 = R41 #113 | Feedback-tier helper and effect budget | `js/ui/feedback.js` + pure budget module with tests; ParticleEngine caps particles (250/150 phone) and texts (40) and merges "+n" texts; existing effects routed through it with no visible change except fewer pile-ups; `npm test` passes. |
| GF-2 = R42 #114 | Boss and Warden kills feel like a win | Boss/Warden kill has hit-stop, flash, shake (motion on), a distinct sound, "Boss down!" callout and a gold count-up; enrage timer turns red and ticks at ≤ 10 s; reduced motion keeps colour + sound only; checked at 375 px. |
| GF-3 = R43 #115 | Welcome-back celebration | Offline modal plays a sound, counts the total up (≤ 1.2 s, skippable), has a Collect button that pulses the Oil counter; reduced motion snaps; wording unchanged. |
| GF-4 = R44 #116 | Monolith combo climb and Frenzy moment | Floating numbers merge and stay readable at 375 px; combo pitch climbs in scale steps (capped) and steps back down; Frenzy has a wind-up on clicks 18–19, its own sound, callout and burst; the bar holds full before resetting; tooltip hides after the first tap. |
| GF-5 = R45 #117 | Ascension and Transcend ceremonies | `confirm()` replaced by an in-game sheet with a hold-to-confirm build-up; distinct release for New Well and New Field (≤ 3.5 s, skippable); `playAscension` used; reduced-motion version; owner decisions in §6 applied. |
| GF-6 = R46 #118 | Sound families by meaning | Spend/collect/find/cast/boom sounds as in §3 item 6; contract claim shows its amounts; Daily Dallah plays one sound; `playGem` scales with rarity. |
| GF-7 = R47 #119 | First-time unlocks and rare events | Tab unlock is a short skippable ceremony + nav pulse; big toasts play brass; Mirage, Caravan Star, Golden harvest, Aether Ore and legendary gear each have their own look and sound. |
| GF-8 = R48 #120 | Honest sale and silent-tap fixes | Bazaar sale at or below the reference price gets neutral feedback (owner rule from §6); failed breeding answers neutrally; no player action is silent and still. |
| GF-9 = R49 #121 | Reduced-motion colour cues | `.reward-pulse`, `.blast-flash` and the boss flash have static colour fallbacks under reduced motion; `test_r24_motion.js` (or a new test) covers them. |

---

## 6. Questions for the owner

These need a decision before the matching issue starts. Until there is an answer, the
implementer should use the default in brackets (AGENTS.md: owner decisions go in issue #23).

1. **Screen shake at all?** The guide allows it "if motion is on". Should T2 shake the whole
   screen, or only the element that was hit? [Only the element.]
2. **Voice callouts.** Candy Crush says "Divine!". Text callouts only, or also short
   synthesised vocal-ish sounds? [Text only.]
3. **Hit-stop and the boss timer.** Hit-stop is visual only in this proposal. Should the enrage
   timer also pause during it? [No; the sim never pauses for juice.]
4. **Ascension cooldown.** Should a player-chosen New Well always get its ceremony, even within
   60 s of another big ceremony? [Yes, player-initiated T3 bypasses the cooldown.]
5. **Hold-to-confirm.** Holding a button can be hard for some players. Hold (800 ms) or a plain
   tap on the in-game confirm sheet? [Hold, with a Settings option "tap to confirm", and plain
   tap under reduced motion.]
6. **Honest sale reference price.** The Bazaar does not track what the player paid. Compare the
   sale to (a) the commodity's base/mean price, or (b) a new saved average buy price per
   commodity (a save field with a default, AGENTS.md rule 2)? [(a), no save change.]
7. **An "Effects" setting.** Add Settings → Effects (Full / Light / Off) separate from Reduce
   Motion, for players who want sound and colour but fewer particles? [Not now; revisit after
   R41 if players ask.]
