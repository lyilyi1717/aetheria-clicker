# Dig: the contract

> The design of the game (levels, what is built, what is broken, what is next) is in `docs/dig-design.md`. This file is only about the code.

Dig is built from a small core and many features. A feature is a folder of its own plus nothing
else. This file says what a feature may add, how, and what it must not touch. Read it before you
write a line. Words for players: the diggers are called **Rafeeq** (plural **Rafeeqs**) in every
string; the code keeps `diggers`, `crew`, `crewPow`.

## Layout

```
proto.html                 the page: a skeleton with empty slots (features fill them)
proto/
  main.js                  page entry
  game.js                  the rules as one import:  import * as G from './proto/game.js'
  proto.css                the core's styles
  core/                    COORDINATOR ONLY
    rng.js                 rnd(), setRng(), seedRng(): the one source of chance
    registry.js            use(), every table, hooks (run / fold), params, unlocks, emit()
    grid.js                the grid, depth curves, genRow, reachable, visibleMask
    rules.js               damage, breakCell, swing, step, shops, tools
    state.js               newState, reset, parkSite/withSite, serialize/deserialize, MIGRATIONS
    strings.js             t(), fmt(), addStrings()
  ui/                      COORDINATOR ONLY
    app.js                 ui(), the loop, input, save, toast/banner/modal, panels, goal, status, tool bar
    render.js              canvas core, effects, addArt(), addDraw()
    shop.js                shopPanel(): a panel for any registered shop
    audio.js, icons.js     core sounds and icons, addSfx(), addIcons()
  features/
    index.js               one line per feature (rules)      \ every planned feature already
    ui.js                  one line per feature (page side)  / has its line: do not edit these
    <id>/rules.js          use({...})        rules, numbers, state      (no DOM)
    <id>/strings.js        export default { en: {...} }
    <id>/ui.js             ui({...})         panels, art, sounds, icons, feedback
    <id>/<id>.css          optional
test_proto_dig.js          the first slice's rules
test_proto_registry.js     every extension point once, old saves, the rules below
test_proto_<id>.js         one per feature
sim/proto/dig-timeline.mjs seeded players; counts content from the registries
sim/proto/dig-month.mjs    the first month for three players, against docs/dig-pacing.md (--assert)
sim/proto/player.mjs       the scripted player both sims share
sim/proto/dig-pacing.mjs   a rough 25 minute check
```

Fourteen features are built (`away boss chest combo crits diggers ground museum oil ores relics
shop sites tnt`). They are the worked examples: copy the one nearest to yours.

## Who may touch what

- **A feature's author** edits only `proto/features/<id>/` and `test_proto_<id>.js`.
- **Nobody but the coordinator** edits `proto/core/`, `proto/ui/`, `proto/game.js`,
  `proto/main.js`, `proto.html`, `proto/proto.css`, `proto/features/index.js`,
  `proto/features/ui.js`, another feature's folder, `test_proto_dig.js`,
  `test_proto_registry.js`, `sim/proto/`, this file.
- A new feature that is not in the indexes yet adds **one line to each index, in A to Z order**.
  If two branches add lines at the same spot, keep both lines; order has no effect on the game.
- If you need a hook, an event field or a slot the core does not have, **do not add it yourself**.
  Say so in your PR (what, where, why); the coordinator adds it for everyone.
- You may `import` what another feature exports (`blastAt` from `tnt/rules.js`). You may not edit it.
- Ids are global: block kinds, relics, items, sites, state keys, strings, icons, sounds, exports of
  `rules.js`. A clash throws at load (exports: the name silently vanishes from `G`, so prefix yours).

## The rules

1. **Rules are pure.** `rules.js` is functions over one state `s`. No DOM, no audio, no timers,
   no `Date`. What should be seen or heard is reported: `emit(s, ev, kind, data)`.
2. **One source of chance.** Rules call `rnd()` (`core/rng.js`), never `Math.random`. (Canvas
   effects may: they do not touch the state.)
3. **State is plain data** (JSON- and `structuredClone`-safe). No classes, no functions, no Maps.
4. **Every number is a param**: `params: {...}` in your def, read as `p.x`. No magic numbers in
   the logic.
5. **No clock gates.** Every gate is a resource: coins, depth, a Big Rock, Stars, a set. A tool
   has charges or a cost, never a cooldown in seconds. Nothing punishes being away.
6. **Words go through `t()`**, keys in your `strings.js`. No emoji. Icons are drawn
   (`addIcons`), from the shapes in `ui/icons.js`. Names a seven year old understands.
7. **Logical CSS** (`inset-inline-start`, `margin-block`, `text-align: start`): the page will
   run right to left.
8. **Never break a save.** New state is a slice with a default. Changing what a saved field means
   needs a migration (below).
9. **It must change what the player does**, not only a number. A plain "+X%" is a shop item.
10. Tutorial moments are placed, not left to luck (see `s.seen` in `tnt/rules.js`).

## A feature in one file

```js
// proto/features/crystal/rules.js
import { use, emit } from '../../core/registry.js';
import { rnd } from '../../core/rng.js';
import { cellAt } from '../../core/grid.js';
import { later } from '../../core/rules.js';
import strings from './strings.js';

const p = { share: 0.04, reach: 3 };

export const crystal = use({
  id: 'crystal', params: p, strings,
  blocks: { crystal: { hp: 2, val: 3, notice: true,
    base: { w: c => (c.layer.id === 'deep' ? p.share : 0) },      // 4% of the Deep's cells
    broke(s, b, ev) {                                             // breaks in a line
      for (let k = 1; k <= p.reach; k++) for (const dc of [-k, k]) if (cellAt(s, b.r, b.c + dc)) later(s, 0.05 * k, 'pop', { r: b.r, c: b.c + dc, src: b.src, chain: 1 });
      emit(s, ev, 'shatter', { r: b.r, c: b.c });
    } } },
});
```

`use(def)` takes any of the fields below. `at` (a number) orders things everywhere; without it a
thing sorts after the ones that have one, by id. Import order never matters.

## Extension points (rules side)

**Numbers.** `params: {...}`. A sim reaches any of them by path: `crystal.share`,
`ITEMS.crew.base`, `BLOCKS.gold.val`, `SITES.boom.tnt`, `RELICS.boom.max`, or a table you expose
with `tables: { NAME: obj }`. `G.setParam(path, v)` returns an undo function.

**State.** `state: { key: { init: () => default, survives: ['site'], perSite: true, transient: true } }`
- `survives`: the resets it lives through. `'site'` = New Site, `'land'` = the second reset.
  Not listed = it starts over. Nothing is hard-coded in `newSite`.
- `perSite`: belongs to one dig site (rows, diggers, the boss). See "Several sites".
- `transient`: not saved; rebuilt as `init()` on load.
- Missing slices, and missing keys of an object slice, are filled on load.
- Changing the meaning of your own slice: `version: 2, migrate(s, from) {...}` in your def
  (it must be safe on default data). `SAVE_VERSION` / `MIGRATIONS` in `core/state.js` are for
  the coordinator.

**Block kinds.** `blocks: { id: { hp, val, ...flags, base, damage, hit, broke } }`
- `hp`, `val`: multipliers on the depth curves. `val: 0` pays nothing.
- flags: `soft` (a special may replace it), `ore`, `wall` (blasts and spill-over stop),
  `chain` (a blast pops it a beat later), `notice` (a player goes for it; the sim bot does),
  `unlock: false` (not counted as content).
- `base: { at, w(ctx) }`: its share of plain cells (taken from dirt). Or list it in a layer's
  `blocks` table and give no `base`.
- `damage(s, r, c, cell, dmg, src, ev, info)`: replaces the hp logic (the Big Rock).
- `hit(s, r, c, cell, dmg, src, ev, info)`: after a hit that did not break it.
- `broke(s, b, ev)`: after it broke. `b = { r, c, cell, t, B, src, byHand, chain, info, coins }`.
- Each step: a `step` hook that scans `s.rows` (water that flows). Keep it cheap.
- Placing specials: `gen: { row: [{ at, fn(ctx) }] }` with `ctx.put(kind)`, `ctx.set(col, kind)`,
  `ctx.free()`, `ctx.r`, `ctx.s`, `ctx.site`, `ctx.layer`. Also `gen.claim` (take a cell before
  the roll: veins) and `gen.whole` (make the whole row: the Big Rock).

**Layers.** `layers: [{ id, at, land: 'desert', name: 'layer_4', look: { dirt, stone, hard, back }, ores: [..4 edges], fill, blocks: { kind: share }, law: { hooks, mods } }]`
- Every layer is 25 rows; layers of a land stack in `at` order; the last goes on for ever.
- `law`: hooks and mods that are in force while the dig's deepest row is in this layer.
  Always dark: `law: { mods: { sight: () => 0 } }`. Blocks grow back: `law: { hooks: { step } }`.
  A rock that hits back: a `step` hook that reads `s.boss`.
- A new land: layers with `land: 'sea'`; the land switches with `s.land` and `reset(s, 'land')`.

**Relics.** `relics: { id: { max, at, when(s), pair, vars(lv), hooks, mods } }`
- `hooks` / `mods` are the same as a feature's but run only while the relic is held; the level is
  `s.relics.id`.
- `when(s)`: may it be offered. `pair: 'otherId'`: its partner (fusion reads this).
- The draft itself bends with the `draftPool` and `draftCards` mods.
- Strings `r_<id>`, `r_<id>_d`; icon `<id>`.

**Shops.** `shops: { star: { wallet: 'stars', levels: 'starUp', survives: ['site'] } }` and
`items: { id: { shop, at, base, grow, max, cost(s, lv), open(s), bought(s, lv, ev), levels: 'core' | 'grind' } }`
- `wallet` and `levels` are state keys; the levels slice is made for you.
- `G.buy / canBuy / upgradeCost / itemLevel / itemOpen` work for every shop.
- Page side: `panels: [shopPanel({ id, shop: 'star', title, coin: 'star' })]` and
  `items: { id: { desc(s, lv) } }`. Strings `up_<id>`; icon `up_<id>`.

**Sites and contracts.** `sites: { id: { at, hp, ore, tnt, bone, chest, blocks, open(s), hooks, mods } }`
- The multipliers bend what the ground holds; `hooks` / `mods` are the site's own rules.
- `contracts: { id: { hooks, mods, ...yours } }`: rules in force while `s.contract === id`.
  Start one with `G.newSite(s, site, ev, { contract: id })`. Judge the goal in your own `step`
  hook and `emit(s, ev, 'contractDone', { id })`.

**Digger jobs.** `policies: { id: (s, digger) => [r, c] | null }`. `s.crewJob` picks the policy
for all; `digger.job` for one.

**Tools.** `tools: { id: { key: '1', aim, keep, open(s), can(s, r, c), use(s, r, c, ev) } }`.
The page shows a button and the hotkey; a click on the ground calls `G.useTool`. `aim: false` =
fires where the pick points. Strings `tool_<id>`; icon `tool_<id>`.

**Delayed effects.** `queue: { kind(s, q, ev) }`, ordered with `later(s, seconds, kind, q)`.
Built in: `pop` (break a cell), `dmg`, `blast` (`blastAt` in `tnt/rules.js`).

**Hooks** (`hooks: { name: fn | { at, fn } }`): `run(name, s, ...)` calls each.

| hook | arguments | when |
|---|---|---|
| `step` | `s, dt, ev` | every step. Core: delayed effects at 500, scroll at 900. Built: oil 100, combo 200, Big Rock 300, crew 600 |
| `swing` | `s, sw` | before your hit lands; `sw = { r, c, B, dmg, crit, twice }` may be changed (big hits) |
| `swung` | `s, sw, ev` | after it landed and after Punch-through (spill-over, echo) |
| `breaking` | `s, b` | a block is about to pay |
| `broke` | `s, b, ev` | a block broke (after its own `broke`) |
| `earned` | `s, n, src` | coins were paid |
| `row` | `s, ctx` | a row was generated |
| `mask` | `s, m` | the visibility mask was built |
| `scrolled` | `s, n` | the view moved down |
| `resetting`, `reset` | `s, name, keep` | before and after a reset wipes the slices |
| `bossDown` | `s, r` | a Big Rock broke |
| `awayStop`, `awayRow`, `awayEnd` | `s, r, out` / `s, out, ev` | time away; return `true` from `awayStop` to end it |

**Mods** (`mods: { name: (v, s, ...) => v }`): `fold(name, s, v, ...)` passes the value through.
`coinMult`, `pickPower`, `crewPower`, `crewRate`, `critChance`, `critMult`, `sight`, `swingDmg`,
`punch (v, s)` (Punch-through: how many blocks below a broken one a hit's left-over strength reaches;
0 none, `Infinity` no limit; a Big Rock, an empty cell or a block it does not break stops it),
`damage (v, s, cell, src, info, r)`, `canSwing (v, s, r, c)`, `blockPay (v, s, b)`,
`breakCoins (v, s, b)`, `chestChance`, `draftPool`, `draftCards`, `awayDps`.
A feature may open its own: `fold('myPoint', s, v)` in your code, and say so in your header.

**Events** (`emit(s, ev, kind, data)`): `swing hit break chest blast fossil set gusher rushEnd
bossDown buy relic comboEnd newSite scroll tool unlock punch`. Add your own kinds freely; never change
the fields of one that exists.

**Content and first times.** The list of content is `G.unlocks()`: built from the registries
(block kinds, relics and their levels, items, sites, tools, contracts, layers) plus
`unlocks: [{ id, cat: 'core' | 'grind', group }]`. `firsts: { eventKind: (d, s) => id | [ids] }`
says which event means "found"; the rules then send `ev('unlock', { id, cat, group })` once per
save. The page and the timeline sim both read this, so a new feature is counted with no edit.

**The sim bot.** `bot: { shop(s, api) }` is called when the scripted player looks at the shop:
buy from your shop, set a job, use a tool. Return how many things it did.

## Extension points (page side)

```js
// proto/features/crystal/ui.js
import { ui } from '../../ui/app.js';
import { baseBlock, centre, ring } from '../../ui/render.js';
import { gap, tone } from '../../ui/audio.js';

ui({
  id: 'crystal',
  sfx: { shatter() { if (gap('shatter', 0.1)) tone(1568, { d: 0.2, vol: 0.1 }); } },
  art: { crystal: { rich: true, twinkle: true, colour: '#9be7ff', sprite: (g, look, v) => baseBlock(g, '#9be7ff', v, 1) } },
  on: { shatter(d, app) { const [x, y] = centre(d.r, d.c); ring(x, y, 90, '#9be7ff'); app.sfx.shatter(); } },
});
```

| field | what |
|---|---|
| `art: { kind: {...} }` | `sprite(g, look, v)` (64 x 64, cached), `colour`, `rich` (ring, sparks, bigger coins), `coin`, `hard`, `twinkle`, `glow: 'r,g,b'`, `over(g, s, cell, x, y)` (drawn every frame), `row(g, s, r, y)` (draws its whole row), `hit(d, x, y, col)` (return true: own hit feedback), `hitSfx()`, `firstSight: { flag, text, kind }` (a toast the first time it is seen) |
| `draw: [{ at, fn(g, s, dt) }]` | a canvas layer. `AT` in `render.js`: back 100, sky 200, blocks 300, fog 400, actors 500, fx 600, pick 700; from 790 on it is fixed to the screen |
| `on: { kind(d, app) }` | feedback for a rules event (yours or anyone's). Also `modalClosed`, `awayDone` |
| `panels: [{ id, side, at, title, when(s), build(el, app), update(el, s, app), live }]` | a side panel. Redrawn on `app.dirty(id)`, or every tick if `live` |
| `items: { id: { desc(s, lv), noLevel } }` | a shop item's line of text |
| `goal: { at, fn(s) => { text, frac, cls } }` | the goal bar; the first non-null wins |
| `status: { at, fn(s) => { text, cls, k } }` | the chip under the purse |
| `mount(app)`, `start(app)`, `tick(s, app)` | build your own DOM once (`app.el.top / left / right / stage`); after load; every 0.1 s |
| `away(seconds, app)` | the page was closed or asleep for over a minute |
| `keys: { k: fn(app) }` | a hotkey |
| `cadence: { frame(dig, app) }` | owns the swing rhythm (one feature only; `picks` has it). Called every frame, also through a hit-stop; `dig` = the player is digging now (held or auto dig, something under the pick). The core then swings nothing by itself: the feature calls `G.swing` (or `G.picksStrike`) at `app.target()` when its beat says so |
| `icons`, `sfx`, `css` | `addIcons`, `addSfx`, `css: new URL('./x.css', import.meta.url).href` |

`app`: `state`, `ev` (pass it to rules calls), `toast(text, kind)`, `banner(title, sub)`,
`modal.open(id, html)` (one card at a time; returns null if another is up; the dig pauses),
`modal.close()`, `dirty(panelId)`, `refresh(force)`, `save()`, `hitStop(sec)`, `fire(kind, d)`,
`bump(el)`, `unlockAudio()`, `target()` (the block the pick would hit now, worked out afresh: `[r, c]` or null),
`flags.hand` (set it above 0 while an extra pick of yours swings: the core then leaves its own pick still). A handler that throws is logged and skipped; it cannot stop the rules.
Follow `docs/game-feel-guide.md`: the moment should feel good before the number is read.

## Several sites at once

The site on screen lives flat on the state. A site that is not on screen is a **bag**: a plain
object holding the `perSite` slices. `freshSite(s, siteId)` makes one, `parkSite` / `loadSite`
swap, and `withSite(s, bag, st => G.step(st, dt, ev))` runs any rule on a parked site. Keep the
bags in a slice of your own (`sitesMap: { init: () => [], survives: ['site'] }`). What is shared
(coins, relics, Stars) and what is per site is each slice's `perSite`; the map feature may change
another feature's choice from its own file with `reslice('relics', { perSite: true })`.
A second crew is diggers in another bag.

## Tests and sims

```bash
node test_proto_<id>.js                         # yours: import * as G from './proto/game.js'
npm test -- proto                               # all Dig tests
node sim/proto/dig-timeline.mjs --seeds 7       # ~1 min: when each piece of content is first reached
node sim/proto/dig-timeline.mjs --quick --ab '{"crystal.share":0.08}'   # A/B a number
node sim/proto/dig-month.mjs --assert           # ~1 min: three players, 30 days, against the pacing curve
node sim/proto/dig-pacing.mjs active '{"hpGrow":1.13}'
```

A test seeds chance with `G.seedRng(1)` and builds its case by hand (`s.rows[0][3] = { t, hp, max, s }`).
Put the timeline's before and after in your PR when you touch pace or coins. Check the page:
`python server.py 8131`, `http://localhost:8131/proto.html?speed=4`, desktop width, no console errors.

## The numbers: pacing

The curve for the first month, the model behind it and what is still off are in `docs/dig-pacing.md`.
In short:

- **Depth curves** (`core/grid.js`, numbers in `PARAMS.core`): one entry per layer,
  `{ hp, val, step, share }`. Layers 1 and 2: `hpGrow` 1.12, `valGrow` 1.10. Below, `PARAMS.core.grow`:
  water 1.14 with a step of 2; crystal 1.17, step 20; the Deep's four 1.20, step 8; below 200 m 1.22, step 10.
  A layer may bring its own: `layers: [{ id, ..., grow: { hp, val, step, share } }]` wins over the table.
- **The Big Rock is the wall**: 20 dirt blocks of the row behind the step, times `1 + 0.5 x layer`.
- **Stars for a move**: `starsAt(best, land, have)` in the core. A share (`grow[i].share`, 0.35 down
  to 0.024) of the Stars it takes to stand where the dig stopped, at least the plain count (one per
  10 m, less 2), at most `starCap` times the Stars earned so far. The sites feature must pay by it.
- **Unlocks**: Foreman at 7 Rafeeqs or the third Big Rock; contracts after 14 New Sites.
- **Check**: `node sim/proto/dig-month.mjs --assert` (three players, 30 days, about a minute).
  Re-tune in this order: `core.grow[i].share`, `core.grow[i].step`, `core.starWall`, `boss.layerHp`.
- **A package that touches pace or coins** runs the month before and after
  (`--ab`, or `--without <feature>` for its relics). Anything that breaks ground or hurts a Big
  Rock must scale with the pick's strength, never with the hardness of the ground: the walls
  cannot hold otherwise.

## Work packages

Each has its folder and its index lines already. "Needs" = must be merged first.

| id | what | needs |
|---|---|---|
| `water` | layer 3 block: flows down, washes loose ore out | |
| `crystal` | layer 4 block: breaks in a line | |
| `starshop` | Star shop: start with a Rafeeq, keep one relic, 4 cards | |
| `relics2` | twelve relics in pairs | |
| `away` | the return: chests one by one, "what your crew did" | |
| `foreman` | jobs for the crew | |
| `forge` | ore becomes tools: drill, placed dynamite, magnet | |
| `wing2` | Museum sets that unlock a site or a relic family | |
| `contracts` | sites under a hard rule, for a prize | |
| `deep` | layers 5+: always dark, blocks grow back, a rock that hits back | `water`, `crystal` |
| `fusion` | two full relics become one | `relics2` |
| `autos` | auto-open chests by a rule, auto-buy, each won | `contracts` |
| `map` | several sites at once, a second crew | `foreman`, `starshop` |
| `land2` | the second reset: a new land | `deep`, `map` |

## Sound in time: the mixer and the bar

`ui/audio.js` has one mixer slot. `setMixer(name => null | false | { at, gain })` is asked each time a
sound function runs (`sfx.hit`, `sfx.break`, a feature's own from `addSfx`): `null` plays it now,
`false` drops it, `{ at, gain }` plays the same sound `at` seconds later with every volume times
`gain`. `tone`, `noise` and `gap` read that shift, so the sound itself is never changed.
`audioTime()` is the audio clock (null before the first click).

The `picks` feature uses both. The player's swings are the notes of a 16-step bar
(`features/picks/beat.js`): each pick count has its groove, a tempo sets the step (15 / bpm seconds),
picks that land on one step are one note, and no two notes are closer than `picks.floor` (75 ms).
The page hands a note's hits to the rules up to `picks.look` (40 ms) before the note and schedules
the sounds those hits make at the note's exact audio time. While the bar plays, Rafeeq hits wait for
the next off-beat and delayed hits, chain breaks and coin ticks for the next step (`picks.crewMix`,
`picks.backMix`). A sound a feature adds joins the grid if its name is put in `picks.back`.
`node test_proto_picks.js --table` prints the bars. The sim's hand follows the same bar:
`G.picksPace(s)` (1 = one pick at the first tempo = the old held mouse) scales every profile's `hps`.
