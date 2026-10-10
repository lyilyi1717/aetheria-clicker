# js/systems/coreloop: the contract

The new core loop (`docs/core-loop-redesign.md`), built dark: nothing in the live game imports
this folder until the switch (`docs/core-loop-plan.md` Wave D). Every item CL-1…CL-9 is written
against this file, `state.js`, `shared.js` and `params.js`.

The executable spec is `sim/redesign/model.mjs`. A system here is a port of the functions the plan
names, with the differences listed under "Game vs sim" below.

## Rules for every system

1. **Pure logic over the state.** A system is a module of functions that take the core-loop
   state (`createCoreLoopState()`), mutate it and return nothing or a small result. No class
   instances hold state. No DOM, no audio, no `window`.
2. **No hidden inputs.** No `Date.now()`, no `Math.random()`. Time comes in as `dt` (seconds) and
   `state.t`; randomness comes from `rand(state)` (`shared.js`). Same state in, same state out.
   **`state.t` is the start of the step:** a step covers `[t, t + dt)`, and the loop driver adds
   `dt` to `state.t` after every system has stepped (as the sim's `advance` does).
3. **Numbers from `params.js` only** (`P`). No literals for anything tunable. The sim reads the
   same object, so a number changed here changes the sim.
4. **Report moments with `ctx.emit(kind, level, data)`.** `ctx` is the last argument of any
   function that can cause one; default it to `NO_CONTEXT`. Kinds and levels are in the table
   below. The UI turns them into feedback; the sim counts them.
5. **Write only your own part of the state** (table below). Read anything.
6. **Units:** time in seconds (`P.rankHours` and Seal hours are hours, as named); Material
   amounts are plain numbers in "units"; Crude and generator amounts are `BigNum`.
7. **Step signature** for anything that advances with time:
   `step(state, dt, presence, ctx = NO_CONTEXT)` with `presence` one of `PRESENCE.*`.
   Player actions are separate functions that return `true` if they happened
   (`fillOrder(state, slot, ctx)`), so the UI can enable buttons with a matching `can…` function.
8. **Saves:** a new saved field needs a default in `createCoreLoopState` and a line in
   `deserializeCoreLoop`. `test_cl_state.js` fails if a field doesn't survive a save.

## Who writes what

| State | Writer | Notes |
|---|---|---|
| `t`, `rng` | the loop driver (CL-10 sim, later the game loop); `rand()` advances `rng` | |
| `well.*` | `Well.js` (CL-8) | `runCrude`, `runStart`, `bought`, `amount`, `pressure`, `flare` reset on a New Well, done by `Well.resetRun(state)`, which Prestige calls |
| `prestige.*` | `Prestige.js` (CL-9) | includes `crew` and `charter` |
| `fields[i].frontier`, `bestGrade`, `inventory` | `Fields.js` (CL-2) | `Fields.addMaterial / takeMaterial / countAtLeast` are the only way anyone changes an inventory |
| `fields[i].rig`, `rigBestGrade` | `Rigs.js` (CL-2); `rig` is raised by Prestige through `Rigs.build / levelUp` | |
| `mastery[i]` | `Mastery.js` (CL-3) | |
| `refinery.frac[i].level`, `orders`, `weekly` | `Refinery.js` (CL-4) | |
| `refinery.frac[i].bubble` | `Cauldrons.js` (CL-6) | recomputed from `cauldrons.bubbles` |
| `refinery.frac[i].vial`, `.compound` | `Collection.js` (CL-5) | |
| `refinery.frac[i].seal` | `Seals.js` (CL-7) | |
| `cauldrons.*` | `Cauldrons.js` (CL-6) | |
| `collection.*` | `Collection.js` (CL-5) | |
| `seals.*` | `Seals.js` (CL-7) | reads `prestige.crew` |
| `presence.*` | `Presence.js` (CL-1) | |
| `tree.*` | `Tree.js` (CL-24) | banks are filled and rings reset by Prestige through `Tree.earn / resetRing` |
| `guide.*` | `Guide.js` (CL-28) | steps passed, features opened, tabs not looked at yet; never reset |

A Fraction's value is `fracValue(state, i)` in `shared.js`:
`(1 + bubble + vial + compound + seal) x P.orderMult^level`. Sources add inside a Fraction; the
five Fractions multiply what they power (`FIELD_FRAC`, Naphtha for the Well, Gas for hand work,
Bitumen also for the Away rate).

## The Well (`Well.js`, CL-8)

What the items that depend on it can rely on:

- **Slots and generators.** `well.bought[k]` / `well.amount[k]` for slot k = 1..`P.slots` (index 0
  unused). `well.generators` (8..30) never resets; generator n upgrades `generatorSlot(n)`.
- **Production.** `step(state, dt, presence, ctx)` advances the cascade exactly (the sim's
  `wellStep`), banks the Crude through `addCrude` and returns the Crude made. Run `Presence.step`
  before it in a tick: the Hands-on rate reads `presence.heatSeconds`.
- **`addCrude(state, amount, ctx)` is the only way Crude is earned** (the cascade, a Gusher's
  payout of `crudePerSecond(state, PRESENCE.WATCH) x P.gusherSeconds`). It keeps `runCrude`,
  `bestRunChron` and `bestEver` and unlocks generators (`generator` event).
- **Actions**, each with its `can…`: `buy(state, k, count)` (within the current pack of
  `P.packSize`), `buyPressure(state)`, `buyMax(state)` (the sim's `buyAll`; Auto-Buy is the
  driver calling it each tick), `flare(state, byHand, ctx)` (the sim's `maybeFlare`: only when it
  at least multiplies the current Flare by `P.flareMinGain`; `byHand` false is Auto-Flare and
  emits nothing).
- **Resets.** `resetRun(state)` is a New Well's reset: Crude back to `P.startCrude`, `runCrude`,
  `bought`, `amount`, `pressure`, `flare`, and `runStart = state.t`. It keeps `generators`,
  `pressureBest`, `bestRunChron`, `bestEver`, `recordAtChron`. `closeChronicleRecord(state)` is
  the Chronicle's part: `recordAtChron = max(recordAtChron, bestRunChron)`, `bestRunChron = 0`.
  Prestige calls both; it never writes `well.*` itself.
- **Numbers.** Crude, slot amounts, rates, prices and `wellMultiplier` are `BigNum` (multipliers
  are summed in log10, so 2.5^Shares may pass 1e308). `bought`, `pressure`, `flare` and
  `generators` are plain numbers. Compare Crude with gates in log10: `Math.log10(b.m) + b.e`.

## Prestige (`Prestige.js`, CL-9)

- **Each layer is a gate, an action and a suggestion.** `canNewWell` / `newWell`, `canNewField` /
  `newField(state, choice, charter, ctx)`, `canChronicle` / `chronicle`. The sim resets the moment
  it may and picks for the player; the game offers its pick as `suggestedChoice(state)` and its
  Chronicle timing as `suggestChronicle(state)` (full Pages, or the loop has slowed). CL-10's
  driver plays those.
- **New Well:** Reserves are `pendingReserves(state)`; allowed when they are at least
  `newWellNeed(state)` (25% of this layer's Reserves, at least `P.wellMinReserves`) and the run is
  `P.wellMinRunSec` old. That is a rule of the game, not a policy (the redesign doc, §6).
- **New Field:** `fieldChoices(state)` lists what it may be spent on: `{ kind: 'rig', field }`,
  `{ kind: 'level', field }`, `{ kind: 'crew' }`. The first one ever builds a Rig. A Charter
  (`CHARTERS`) may be switched with each New Field and only then; `prestige.charter` is `'none'`
  until the first pick.
- **Chronicle:** Pages by New Fields this Chronicle (`pendingPages`), re-blaze Shares, Rig levels
  back to 1, the record gate closed through `Well.closeChronicleRecord`. Crew, Rigs, generators,
  Trials and everything outside the Well and the prestige counters stay. Collection.js adds its
  own recipe batch when it sees `prestige.chronicles` grow.
- **Trials:** unlocked by `newWell` / `newField` at the counts in `P.trials`;
  `hasAutomation(state, id)` is what the loop driver asks before it buys, flares or opens a New
  Well for the player (Auto-Well also needs Auto-Buy). Until Trials are real challenge runs they
  are won the sim's way: `trials(state, stretchSeconds, ctx)` at the end of a Hands-on stretch.
- **Never writes outside `prestige.*`:** the Well is reset by `Well.resetRun`, Rigs by
  `Rigs.build / levelUp / resetLevels`.

## The one tree (`Tree.js`, CL-24)

- **Three rings** (`P.tree`): inner, bought with the Reserves earned this New Field layer and reset
  by a New Field; middle, bought with the Shares New Fields pay (not the re-blaze ones) and reset by
  a Chronicle (which also resets the inner ring); outer, bought with Pages, never reset.
- **Buying spends a bank** (`state.tree.bank`), never the multiplier: `prestige.reserves`, `shares`
  and `pages` count what was earned.
- **Effects are read where they apply**, through `treeBonus(state.tree, kind, field)`
  (`treeMath.js`): `crude`, `awayWell`, `handsWell` (Well), `heat`, `gusherRate`, `gusherWindow`
  (Presence), `fieldPower` (Fields), `rig`, `hand` (Rigs), `reserves`, `startShares`, `pageBank`,
  `keepPressure`, `startKit` (Prestige, through `Well.resetRun(state, { pressure, kit })`),
  `offlineHours` (Loop). A system that adds a kind reads it the same way.
- **Flags** (`kind: 'flag'`, `Tree.has(state, id)`) are unlocks whose effect belongs to a later
  item, named in the node's `pending` (the Tower's Wardens, Auto-Blast, Brews, ...). They can be
  bought now and do nothing until that item reads them.
- **The model shares the arithmetic:** `sim/redesign/model.mjs` calls the same `treeMath.js` on
  `s.tree`, and its policy is `buyAffordable` (cheapest first), which is also `Tree.buyAll`.
- **Every node of the old Reserve shop, Shard tree, talents, Page upgrades and Quartermaster** is
  in a node's `from` list or in `P.treeElsewhere` (`test_cl_tree.js` fails otherwise), so a
  converted save can be refunded into the tree (CL-18).

## One tick of the loop (the driver's job)

`sim/core-loop.mjs` (`advance`) is the reference driver; the game loop (CL-12) does the same:

1. `Presence.step`, then `Well.step` (it returns the Crude made).
2. A Gusher the player catches: `Presence.catchGusher` returns `{ seconds, presence }`; pay it with
   `Well.addCrude(state, Well.crudePerSecond(state, presence).mul(seconds))` and
   `Rigs.haul(state, seconds)`. A Gusher stays up `P.gusherWindow` seconds: a driver that steps
   further than that at a time must end a step at `presence.nextGusherAt` or it never sees one.
3. `Rigs.step` (hand work and the hauls), `Cauldrons.step`, `Seals.step`, `Collection.step`,
   `Refinery.step`.
4. Automation the player has won (`Prestige.hasAutomation`): `Prestige.newWell` (Auto-Well, with
   Auto-Buy), `Well.buyMax` (Auto-Buy), `Well.flare(state, false)` (Auto-Flare).
5. `state.t += dt`.

Everything else is a player action: brew, fill, offer, mix, level, buy, flare, reset, and
`Presence.noteInput` / `Presence.setHandField`.

## The preview UI (`?loop=2`, CL-12)

- `js/systems/coreloop/Loop.js`: `advance(state, dt, presence, ctx)` is the tick above for the game
  (the player's Gusher tap is `Loop.catchGusher`, a player action between ticks);
  `settleAway(state, seconds, ctx)` plays time away as Away steps of `P.offlineStep`, at most
  `P.offlineMaxHours`.
- `js/ui/coreloop/shell.js` owns the state, the tick (every 250 ms while visible; a hidden page or a
  longer gap is settled as time away), input (any tap = Hands-on), and the save under
  `AETHERIA_CORELOOP_SAVE_V1` (`store.js`). The current game's save is never read or written.
- **A screen** is `js/ui/coreloop/<id>.js` (`well`, `fields`, `refinery`, `prestige`, `codex`)
  exporting `mount(panel, api) -> { update(api) }`. `api.state`, `api.t`, `api.fmt`,
  `api.act((state, ctx) => System.action(state, ..., ctx))` (counts as input, then redraws),
  `api.on(fn)` for events, `api.catchGusher()`, `api.presence()`, and from the guide
  `api.isOpen(feature)`, `api.lockText(feature)`, `api.tapWell()`, `api.go(screen)`. A missing
  module shows a placeholder, so screens land one PR at a time without editing the shell.
- **The shell draws the head of every screen** (its name, one sentence, "How it works") and the
  next-step bar; a screen starts with its content, not with a title or an explanation of itself.
- **A screen is for a person, not a spreadsheet:** one main action that is obvious at a glance,
  the number that matters big and the rest small, words before numbers, the game's names
  (`cl.slot.*`, `cl.name.*`) and never "Tier 1", and a visible response to every tap.
- **Strings:** each screen keeps `js/i18n/coreloop/<id>.en.js` / `.ar.js` and calls
  `registerStrings(en, ar)` (`js/i18n/coreloop/index.js`) at import; use `cl.<id>.*` keys. The
  shared vocabulary (Fractions, Fields, Rigs, Charters, Dallahs, ranks and the Saudi names
  decided on #23) is in `shell.en.js` as `cl.frac.*`, `cl.field.*`, `cl.rig.*`, `cl.name.*`,
  `cl.charter.*`, `cl.dallah.*`, `cl.rank.*`. Dynamic keys go in template literals
  (`` t(`cl.tab.${id}`) ``) so `test_r37_i18n.js` doesn't read them as literal keys.
- Styles: `css/coreloop.css` (tokens only, phone first: tabs at the bottom below 768 px).

## The guide (`Guide.js`, CL-28)

A person who opens the game must know what to do in ten seconds and must never be shown more than
they can use. The guide is the one place that decides both.

- **Features** (`Guide.FEATURES`): a tab (`tab.fields`) or a section of a screen (`well.pressure`),
  each with the rule that opens it. Open is sticky (`state.guide.open`); no reset closes anything.
  **A screen shows a section only when `api.isOpen('<feature>')`.** A closed section is left out,
  or, when it is the next thing coming, shown as one line: `<p class="cl-locked">` with
  `api.lockText('<feature>')`. Screens never invent their own unlock rules.
- **Steps** (`Guide.STEPS`): the first session, one goal at a time. Reaching a step opens what it
  needs. After the last step, `Guide.suggestion(state)` names the one thing most worth doing now.
  `Guide.next(state)` is whichever applies; the shell's gold bar shows it with "Show me".
- **Anchors:** the bar points at the element with `data-guide="<anchor>"` inside the open panel
  (it gets `data-guide-on` while it is the goal and a pulse on "Show me"). A screen must carry its
  anchors: `well.tap` (the tappable well, also where a Gusher is caught), `well.buy.<k>` (the buy
  button of pump k), `well.pressure`, `well.rate`; `fields.work`, `fields.mastery`;
  `refinery.order` (the first fillable Order, else the first Order); `prestige.newwell`,
  `prestige.newfield`, `prestige.chronicle`, `prestige.tree`.
- **The Well can be tapped:** `api.tapWell()` (`Well.tap`): a flat `P.tapCrude`, which matters for
  the first minutes only, plus the input that keeps Heat up. A Gusher is caught on the same spot.
- **The Gusher lesson brings its own Gusher:** while the step is `gusher`, `refresh` calls
  `Presence.summonGusher`, so one surfaces `P.guideGusherDelay` seconds later in any presence, and
  again after a miss. (An ordinary Gusher's wait counts Watching time only, so a player who keeps
  tapping would never see one.)
- `refresh(state, ctx)` runs after every tick and action (the shell does it); the sims never call
  it, so the guide cannot change a simulated year.

## Events

`ctx.emit(kind, level, data)`. Levels are `HIT.MINOR` 1, `HIT.BIG` 2, `HIT.NOVELTY` 3, `HIT.MAJOR` 4.

| Kind | Level | From | Data |
|---|---|---|---|
| `gusher` | 1 | Presence | |
| `flare` | 2 (by hand) | Well | |
| `generator` | 3 | Well | `n` (9..30) |
| `order` | 2 | Refinery | `frac` |
| `weekly` | 4 | Refinery | |
| `bubble` | 2 | Cauldrons | `cauldron` |
| `bubbleFamily` | 3 | Cauldrons | `n` |
| `vial` | 2 | Collection | `key` |
| `vialTier` | 3 | Collection | `key`, `tier` |
| `compound` | 3 | Collection | `recipe` |
| `gilded` / `royal` | 3 / 4 | Collection | `recipe` |
| `rank` | 2; 4 at Legend and every `P.legendTitleEvery` ranks past it | Mastery | `field`, `action`, `rank` |
| `grade` | 3 | Fields | `field`, `grade` |
| `rigGrade` | 3 | Rigs | `field`, `grade` |
| `seal` | 3; 4 from tier `P.sealBigTier` | Seals | `seal`, `tier` |
| `trial` | 4 | Prestige | `id` |
| `newWell` | 1 | Prestige | `reserves` |
| `newField` | 3 | Prestige | `n` |
| `chronicle` | 4 | Prestige | `pages` |
| `guide` | 1 | Guide | `step` |
| `unlock` | 3 for a tab, 2 for a section | Guide | `feature` |

## Game vs sim

| | Sim (`sim/redesign/model.mjs`) | Game (this folder) |
|---|---|---|
| Crude, generator amounts | doubles (fine to 1e300) | `BigNum` |
| State names | short (`a`, `b`, `F`, `inv`, `caul`) | spelled out (`amount`, `bought`, `frontier`, `inventory`, `vats`) |
| Fraction extras | one `extra` field | `compound` and `seal`, one writer each |
| Mastery | inside each field | its own `mastery[i]` |
| Events | `{ t, k, lvl }` pushed on the state | `ctx.emit(kind, level, data)`; not stored |
| Buying | `buyAll` can leave Crude a hair below zero (it rounds an almost-affordable unit up) | Crude never goes below zero |
| Player policy | built in (when to buy, brew, fill, reset) | none: the game exposes actions, the player decides. CL-10's sim supplies the policy |
| Recipes | generated list in the state | content table in `Collection.js`; the state keeps `found / made / tier` |

## Tests

Each system has `test_cl_<name>.js` in the repo root. It must cover the plan's "done when" line and
at least one case that runs the sim's function and the game's function on the same inputs and
compares the results.
