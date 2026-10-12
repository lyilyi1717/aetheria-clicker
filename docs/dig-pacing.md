# Dig: the pacing curve for the first month

What should arrive when, how the numbers make that happen, how to check it, and what is still off.
The numbers live in `proto/core/rules.js` (`PARAMS.core`) and the curves in `proto/core/grid.js`.
The check is `node sim/proto/dig-month.mjs`.

## 1. The target

Three players. Early steps are in attended minutes (the same for everyone); later ones in real days.

- **active**: one 90 minute session a day.
- **mixed**: four 12 minute sessions a day with gaps of 4 to 10 hours. This is the player the curve is built for.
- **idle**: two 4 minute visits a day.

| Step | active | mixed | idle |
|---|---|---|---|
| Big Rock 1 down (25 m) | 2.5 to 4.5 min | 2.5 to 4.5 min | 3 to 6 min |
| Big Rock 2 down (50 m), first water | 6 to 12 min | 6 to 12 min | 7 to 15 min |
| first New Site, Star Shop | 9 to 20 min | 9 to 20 min | 10 to 30 min |
| Foreman | 12 to 45 min | 12 to 45 min | 12 to 60 min |
| Forge (first gold after the first New Site, `forge.openSites`) | 12 to 45 min | 12 to 45 min | 12 to 60 min |
| Big Rock 3 down (75 m), crystal | day 1 | day 1 to 2.5 | day 2 to 7 |
| Contracts | day 1 to 2.5 | day 1.5 to 3.5 | day 6 to 16 |
| Big Rock 4 down (100 m), the Deep | day 1.5 to 4 | day 3 to 5.5 | day 8 to 18 |
| Big Rock 5 (125 m) | day 4 to 8 | day 7 to 11 | later |
| Big Rock 6 (150 m) | day 7 to 13 | day 11 to 17 | later |
| Big Rock 7 (175 m) | day 11 to 18 | day 16 to 23 | later |
| Big Rock 8 (200 m) | day 15 to 24 | day 21 to 30 | later |

Also: no attended stretch longer than about 2.5 minutes in the first half hour, or 5 minutes later,
with nothing bought, found or beaten; 1.5 to 6 New Sites a day for the mixed player.

Two changes to the shape that was first proposed, and why:

- **Big Rock 2 stays at 6 to 12 minutes**, not 10 to 15. The first two layers keep their old numbers
  so the first ten minutes play as they did. Water starts three rows under that Rock, so the first
  water is seen at about a quarter of an hour, and the water layer is dug through on day 1.
- **The first New Site is at 9 to 20 minutes**, not the moment the second Rock breaks. The scripted
  player now moves when the dig has stalled (section 4), which is what a person does.

## 2. The mechanism

1. **One entry per layer** (`PARAMS.core.grow`, or a layer's own `grow` field): `{ hp, val, step, share }`.
   `hp` and `val` are the growth per metre, `step` is how many times harder the ground gets behind
   the Big Rock that opens the layer. Layers 1 and 2 are unchanged (1.12 and 1.10 a metre).
2. **The Big Rock is the wall.** Inside a layer the ground can be passed without much strength
   (until the hits rule below, TNT, crystals, tools and several relics broke ground by the hardness of
   the ground itself, not by the strength of the pick). The Rock cannot: its hp is 20 dirt blocks of the row below the
   step, times `1 + 0.5 x layer`. So each layer is `step` times a real wall, and the walls get
   higher: x2 at 50 m, x20 at 75 m, x8 at each Rock of the Deep, x10 below 200 m.
3. **Stars follow the wall** (`starsAt` in `core/grid.js`). `starLift(S)` says how many times higher
   a wall S Stars carry a dig over: `(1 + 0.1 S) x (1 + 0.2 S)^0.55` (hits, and coins turned into
   hits). `starsToStand(row)` inverts it: the Stars it takes to stand at a row. A move pays `share`
   of that number for the layer the dig stopped in, never less than the old plain count (one per
   10 m, less 2), and never more than `starCap` (1) times all the Stars earned so far.
4. **So a layer costs a set number of moves, not a set strength.** A dig that is stopped by a Rock
   pays the same Stars each time, and the Rock falls when the total reaches about half of
   `starsToStand` there: about `0.5 / share` moves. Shares: 0.35 (water), 0.03 (crystal and the
   Black), down to 0.024 (the Hot Layer). That is 2 to 3 moves for the third Rock, about 15 for the
   fourth, about 20 for each Rock of the Deep.
5. **The cap** stops a lucky dig from running away: however far it tunnels, one move at most
   doubles the Stars.
6. **Unlocks moved** (numbers in the features' params): the Foreman comes with 7 Rafeeqs or the third
   Big Rock (was 3 or the second); the contracts board opens after 14 New Sites (was 3).
7. **Everything that breaks ground is counted in hits** (`pickPower` times a count; a Rafeeq's blast in
   Rafeeq hits). TNT `tnt.power` 8 hits to each block around it (Big Bang adds `bangHits` 4 a level: 12,
   16); crystal line `crystal.power` 4; Dynamite `forge.dynPower` 14; the Drill `forge.drillPower` 6 a
   block; fusion bombs `fusion.bombHits` 4; the Derrick pulse 1.5 hits with no floor from the ground;
   Feed the Rock `contracts.feedUnit` 6 hits per copper inside the contract and `feedBend` 2 hits per
   copper for the prize (silver x2, gold x4, gem x8). Flying and falling blocks were already capped at
   `relics2.throwCap` 4 hits and stay as they are. Water and lava only wash or turn soft blocks and
   ore and deal no damage. `boss.layerHp` is 0.5 (deeper Rocks are sturdier).
8. **Away is unchanged.** It was measured as 0.7 to 3 times five active minutes for two hours away.
   With the Rock as the wall it does what it should: the Rafeeqs bring the dig to the Rock and sieve;
   the Rock is the player's. Half of the mixed player's coins come from time away.

**Old saves.** Nothing is migrated and nothing is wiped. Ground already in the save keeps its hp;
the next rows are generated by the new curve, so a player who is deep under the old numbers meets
the new wall a few rows down and moves. His Stars count as before.

## 3. The check

```bash
node sim/proto/dig-month.mjs                       # 3 seeds, 3 players, 30 days
node sim/proto/dig-month.mjs --assert              # exit 1 when a headline target is missed by more than 25%
node sim/proto/dig-month.mjs --without relics2     # the same month with one feature's relics never offered
node sim/proto/dig-month.mjs --ab '{"core.grow.2.share":0.05}' --only mixed
node sim/proto/dig-timeline.mjs --quick --only active --seeds 5    # the first hours, event by event
```

It prints the ladder (target and simulated, per player), depth, New Sites and Stars by day, every
New Site of one seed with the Stars the player had against the Stars the model says he needed,
dead zones, and where the coins came from. The attended step is 0.05 s; `--dt 0.1` halves the time
and moves early times by up to about 10%. A healthy month takes about a minute; a month in which a
dig runs away takes ten.

**Tolerance.** `--assert` fails when a median is more than 25% outside its range, or when fewer than
half the seeds get there. Dead zones: 150 s early, 300 s later (95th percentile; not checked for the
idle player, whose visits are shorter than that).

## 4. The scripted player's move policy

It moves to a New Site when all of these hold: the move is allowed and no contract is running; no
new metre for 45 attended seconds (mid player), and a Big Rock in view is not about to break; the
next pick or training level is more than 90 seconds of income away; the Stars on offer are at least
20% of all his Stars. After 4 stalled minutes it moves for 5%; below that it closes the page and
lets the Rafeeqs work. It takes an open contract first, else a site it has not seen. It buys every
feature's things through the feature's own `bot` step.

## 5. Where it stands (seeds 1 to 3, 30 days, `--assert` passes)

| Step | active | mixed | idle |
|---|---|---|---|
| Big Rock 1 | 3.1 min | 3.2 min | 4.6 min |
| Big Rock 2 | 10.0 min | 9.3 min | 11 min |
| first New Site | 16.9 min | 14.6 min | 15.3 min |
| Foreman | 23.3 min | 18.6 min | 10.3 min |
| Forge | 18.4 min | 15.4 min | 16.9 min |
| Big Rock 3 | 0.9 h | 14 h | day 2 |
| Big Rock 4 (100 m) | day 3.0 | day 3.2 | later |
| Big Rock 5 | day 9 | day 8 | never |
| Big Rock 6 | day 15 | day 13.2 | never |
| Big Rock 7 | day 20 | day 16.6 | never |
| Big Rock 8 (200 m) | day 28.5 (2 of 3 seeds) | day 22.4 | never |

Before the hits rule (main, 2 seeds) the mixed player was at Rock 7 on day 11.8 and Rock 8 on day 16.8
(both too early) and the active player at Rock 4 on day 5.0 (too late). Both now sit inside their ranges.

Where the damage to the ground comes from (attended play, the report prints it): your swings and
Rafeeqs' own swings 6% / 3% / 12% (active / mixed / idle) before, 15% / 15% / 27% after. A TNT barrel
is still 8 hits on each of up to 8 blocks, and a chain of them is the point of the build; what changed
is that the size of a barrel no longer grows with the depth. The Big Rock took 76 to 94% of its damage
from the pick before, 73 to 92% now.

**The curve changes.** `core.grow[2..5].step` 8 to 6 and `core.grow[6].step` 10 to 8; the shares and
`core.powGrow` (1.25) are unchanged. The study asked for about x4 and shares of 0.05. Both were tried
(14-day runs, mixed): step 4 to 5 with share 0.05 puts Rock 5 on day 4 to 6 and Rock 8 on day 11 to 14,
far ahead of the ladder. A move pays a share of the Stars it takes to stand where the dig stopped, so
a lower wall and a higher share both bring every Rock closer. Step 6 with the old shares is the
setting that keeps the ladder where the targets are.

## 6. What is off

1. **Moves do not end deeper.** The share of moves that end deeper than every dig before is 8 / 12 / 12%
   (was 9 / 13 / 10%). The target (above 60%) was not reached and no setting tried moved it (step 3
   to 8, ground growth 1.20 to 1.29 a metre, share 0.03 to 0.05: 9 to 17% in every case). A dig still
   ends at the Rock: Rafeeqs, relics and the pick's own growth carry it through the ground between
   Rocks, and the sim player moves when it stalls at the Rock. A fix needs a different lever than a
   hardness curve (for example that a move is only worth taking when the dig has gone deeper, or a
   ground hp that grows faster than the pick), and is the next job.
2. **Blasts are still most of the ground damage** (73 to 85%), though counted in hits. Under 50% would
   need a barrel of about 3 hits; at that size the barrels at 8 m do not open a hole for a new player.
3. **Flying and falling blocks, fire, Echo and the other relics** were already counted in hits. Water
   and lava turn or wash soft blocks and ore and deal no damage, so there was nothing to convert.
4. **A player can be carried past the point where he may move** (Star perk that lets Rafeeqs walk past
   beaten Rocks): `canNewSite` can then be false at a Rock that cannot be broken. Not touched.
5. **Contract Stars are fixed** (2, 3, 5): worth something in the first days only.
6. **Big Rock 3 is early** for the mixed player (14 h; the range is 0.4 to 2.5 days). The idle player
   reaches 125 m in a month, not 150.
7. **The model's weak points.** The scripted player buys the instant it can, never tires, and resets by
   a rule; a person plays longer digs and aims better. It was tuned on three seeds. Rock fights under
   the Deep's laws are played without the care a person would take (torches, water).

## 7. How to re-tune

Run `node sim/proto/dig-month.mjs --only mixed` and read the New Site list: the bracket shows Stars
held / Stars needed. Then, in this order:

1. **`core.grow[i].share`**: moves spent at the Rock that closes layer `i + 2` (about `0.5 / share`).
   The first knob for "a layer comes too early or too late".
2. **`core.grow[i].step`**: how high the wall is. Raise it when something new chips Rocks or adds
   strength; it also sets how fast Star numbers grow.
3. **`core.starWall`**: where the model thinks a dig with no Stars stops (in walls of 50 m). Turn it
   when the bracket is far from "half of needed" on every layer at once.
4. **`boss.layerHp`**, then the unlock numbers (`foreman.needCrew`, `contracts.openSites`).

New relics and Museum sets add strength in small steps: a few percent of a wall. A relic or tool
that breaks ground or hurts a Rock by anything but the pick's strength is not a tuning matter: it
has to be counted in hits (section 2.7).
