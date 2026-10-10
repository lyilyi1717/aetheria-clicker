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
