# Redesign v3: a new game, not a better oil well

Written 2026-10-11. This is a proposal plus a prototype you can play now:
**`proto.html`** (see §5 for how to open it). It has its own save
(`DIG_PROTO_SAVE_V1`). It does not read or write the Aetheria save or the `?loop=2` save.

Short version: the oil well is dull because pressing a button is the whole game. I propose a game
where you **dig**. You hold the mouse on the ground and break blocks. You see what you find. Little
diggers work beside you and keep working when you leave. The prototype is the first 10 to 15
minutes of that game.

---

## 1. Why the current design is dull

The feel study (`docs/core-loop-feel-study.md`) asked one question: "does the player understand
the screen?" It found nine reasons the answer was no, and R1 to R12 fixed them. The screen is now
clear. It is still dull. So the study asked the wrong question. The right question is: **"does the
player want to do the thing, even once they understand it?"** Here is what I found when I asked it.

**1. The player's action is "press the button that lit up".**
Buy a pump, buy Pressure, fill an Order, drill a New Well. Each one is the same act: a button
becomes gold, you press it, a number changes. There is no aim, no timing, no place, no skill, no
risk. The study itself shows it: the best minute of its first 17 was "watching one thing make
another" (the Hand Pump making Buckets). The best moment was a moment of *watching*, not doing.

**2. Nothing can surprise you.**
Every result is known before you press. "+1.5%". "x2 at ten". The one random thing (Vials) is a
dice roll with a text result. Fun needs "oh!" moments: something better than expected, or
something you did not know was there. The loop has none, by design: it was built from a simulator
that plays it with a fixed rule.

**3. No decision is interesting.**
The simulator plays the whole year with "buy the cheapest thing". So does the player: the game
even has a "Buy everything" button. When the best move is always "press everything", there is no
game left, only waiting.

**4. There is nothing to look at.**
The game is rows of text and numbers. An idle game is on screen for hours. The good ones give you
something to watch: cookies falling, balls bouncing, a mine getting deeper. Here, growth is a
number with more letters after it ("318.51ag").

**5. The rewards are multipliers on a number that has no meaning.**
Crude buys pumps that make Crude. Orders give "+1.5% to Gas". Vials, Bubbles, Compounds and Seals
are four machines that all push the same five multipliers. That is *width*, not depth. Depth means
a new thing changes *how you play*. Here a new thing changes a decimal.

**6. The reset gives you the same game, faster.**
A New Well puts you back at 50 Crude with a bigger multiplier. Nothing new to do, nothing new to
see. The study called the first one "flat". A ceremony was added. It is still the same 17 minutes.

**What the study missed, in one line:** it treated the game as hard to read. The game is easy to
read now and there is nothing in it to *do*. No amount of polish on buttons makes pressing buttons
fun.

So the fix cannot be another round of the same loop. The core action has to change.

### What the good games do (from the research)

Three sub-agents researched this (what keeps players in the best idle games; honest compulsion;
"juice"). A fourth played hostile critic. The points that matter:

- The games people cannot stop playing in the first 10 minutes have **a thing on screen you act
  on, with a result you can see**: a golden cookie to catch, bricks to break, a hole that gets
  deeper. The number is the scoreboard, not the game.
- **"Pick 1 of 3"** is the strongest cheap mechanic in modern games (Vampire Survivors, Balatro).
  It is a real choice, it is different every time, and your choices add up to "my build".
- **Random on top, certain underneath.** Every block pays. Some blocks pay a lot. Bad luck never
  costs you anything.
- **The return moment**: when you come back, the game hands you things to *open and decide*, not
  only a bigger number.
- **Each reset must add a new rule or a new toy**, or players stop at the first one.
- Recent hits on Steam (Nodebuster, Digseum, Keep on Mining, the Gnorp Apologue) are almost all
  "a small world you watch and poke, with upgrades you can see". Pure number-button games are now
  rare among the hits.

---

## 2. Three concepts

Three different actions and three different dreams. Not three skins of one game.

### Concept A: **Dig** (you break things)

**10-second pitch.** There is treasure under the sand. Hold the mouse on the ground and dig.
Break ore, blow up TNT, open chests, go deeper. Hire diggers who never stop.

| When | What you do |
|---|---|
| Second 5 | Hold the mouse on sand. It cracks, bursts, coins fly to your purse. |
| Minute 5 | You have dug 25 m. You aim for ore and chests, set off TNT next to rock, and pick a relic from each chest. Two diggers work beside you. A Big Rock with a grumpy face blocks the way and you are hitting its glowing crack. |
| Hour 2 | Third or fourth dig site. Each site has its own rule (TNT everywhere; twice the ore). Your relics now work together: one hit explodes, pops a whole vein and goes through three blocks. You hunt the last bone for a Museum set. |
| Day 7 | You open the game and your diggers have gone 60 m deeper and left six chests to open. You plan a site for a contract ("reach 100 m with no diggers"). You forge tools that change how you dig. |
| Month 3 | You run several sites at once, each with its own crew and foreman. You chase rare relic combos, finish the Museum, and take on the deep layers with their own rules. |

**The core action, and why it is fun in itself.** Hit a block: it shakes, cracks, breaks, and
pays. Three things make it more than a button. *Where* matters (you see ore and chests a few
blocks away and choose your path). *What is next to what* matters (TNT beside rock, ore veins that
pop together). And *you never know what the next row holds*, because the ground is dark until you
dig near it.

**Surprises.** What is in the dark. Ore veins. Chests. TNT chains. Oil pockets. Bones for the
Museum. Big hits (8% of hits are x5). The three relics a chest offers.

**The idle half.** Diggers are little people on the screen who dig on their own, row by row. You
can watch them. When you are away they keep going, bank the coins, and stack up the chests they
find *unopened*. They stop at a Big Rock and wait for you. Coming back means: coins, new depth,
and chests to open.

**The long game.** Layers (new ground every 25 m, each with one new thing). New Sites (the first
reset: keep Stars and Museum, pick a site with a rule twist). The Museum (sets of bones, each a
bonus for ever). Relic builds. Later: a forge for tools, contracts, several sites at once,
automation you earn.

**The critic's strongest objection.** "It is still tap, buy, reset. If every block is just coins,
the grid is decoration." **Answer:** agreed, and that is the test of the design. So blocks must
*do* things to each other (TNT, veins, oil, the dark), relics must change the action and combine,
and each site and layer must change a rule. The prototype has the first set of these. If digging
is not fun with them, the concept is wrong (see §4.6).

### Concept B: **The Marble Machine** (you build, then watch)

**10-second pitch.** A tall board full of pegs. Drop marbles from the top. They bounce, score on
every peg, and land in cups. Buy special pegs and place them. Your board is your invention.

| When | What you do |
|---|---|
| Second 5 | Click: a marble drops, pings off pegs, each ping a note higher, lands in a cup. |
| Minute 5 | An auto-dropper feeds marbles. You have placed a splitter (one marble becomes two) above a x3 peg and you watch the score of each marble climb along its path. |
| Hour 2 | Your second board. You are tuning: bumpers to send marbles back up, a magnet to pull them to the golden cup. |
| Day 7 | Boards with new shapes and new peg kinds. A marble collection. |
| Month 3 | A wall of machines, each built for one kind of marble. |

**Why the action is fun.** Watching physics is calming, like a fish tank. A marble that takes a
lucky path is a real surprise. Placing a peg and seeing the stream change is satisfying.

**Idle half.** Natural: the machine runs itself.

**The critic's strongest objection.** "Clicking to drop a marble is not a verb. Then I watch. And
each board has one best layout; once I find it, I am done." **Answer:** an aimed drop and moving
cups would help, but this stays the weakest for *active* play. It is a screensaver with a shop.
Also the physics must feel right, and that is hard to get right in a short time.

### Concept C: **Horde** (you sweep)

**10-second pitch.** No clicking. Your mouse pointer is a hero. Creatures pour in; whatever you
touch bursts into shards. A run lasts 90 seconds. Spend the shards on a big skill tree. Go again
and get further.

| When | What you do |
|---|---|
| Second 5 | Sweep the pointer through a crowd of little blobs. They pop. |
| Minute 5 | Third run. You have chain lightning and a bigger aura. Inside the run you picked 1 of 3 powers twice. |
| Hour 2 | The tree is half open. Turrets fight with you. A boss every five waves. |
| Day 7 | A second world with new creature rules. |
| Month 3 | Worlds, each with its own tree. |

**Why the action is fun.** It is the most physical of the three. A screen full of things popping
is a strong feeling of power. Short runs make "one more" easy.

**Idle half.** Weak. A camp of turrets farms while you are away, but the fun part needs your hand.

**The critic's strongest objection.** "This is an action game. It is tiring, I cannot play it
while I work, and games of this kind are finished in six hours." **Answer:** true. Great for an
evening, wrong for "a full year, idle and active both".

### The critic's ranking

A (Dig) first, C (Horde) second, B (Marbles) third. Its reason: Dig has the most direct action,
the scrolling ground is a natural progress display, and visible diggers are an honest idle half.

---

## 3. Recommendation: build **Dig**

Plainly: **stop work on the oil loop and build Dig.**

Reasons:

1. **The action is fun in second 5**, with no reading. Break a thing, get a thing.
2. **Active and idle are the same activity.** You dig; your diggers dig. Playing is simply faster
   and smarter than watching, and watching is faster than being away. Nobody has to explain
   "Hands-on, Watching, Away".
3. **Progress is something you see**: the hole, the new colours of the ground, the crew, the
   Museum filling up. Depth in metres is a number a 7 year old understands.
4. **Surprise is built in**: you do not know what is under the next block.
5. **Depth can come from rules, not from multipliers**: relics that change the hit, sites that
   change the ground, layers that add a block.
6. **It keeps what was good**: the feel study liked the cascade (things making things, visibly).
   Diggers are that, with faces.
7. **The Gulf flavour fits without wordplay**: desert, dunes, a tent, karak tea for the crew, an
   oil pocket that gushes, a camel's bones, a djinn's lamp. All translate.

### What it can reuse from this repo

| Existing | Use in Dig |
|---|---|
| `js/engine/BigNum.js` | Coins once they pass 1e15 (the prototype uses plain numbers; fine for the first hours). |
| `js/engine/SaveManager.js`, `migrations.js` | The save, versions and migrations, with a new key. |
| `js/engine/CloudSave.js`, account, leaderboard, Community tab | As they are. A depth leaderboard is natural. |
| `js/i18n/` and `t()` | All text. The prototype keeps its words in one file (`proto/strings.js`) ready to move. |
| `js/engine/AudioEngine.js` | Its sound families and volume settings; the prototype's synth recipes move into it. |
| `js/ui/feedbackBudget.js`, `motion.js`, toasts, `wellCeremony.js` | Feedback tiers, reduced motion, the ceremony pattern (for a Big Rock, a Museum set, a New Site). |
| Core-loop **contract** (`js/systems/coreloop/README.md`) | The way of working: pure systems over one state, events out, numbers in one params file, a sim that plays the same code. `proto/game.js` already follows it. |
| Core-loop **Guide** (features open by rule, one goal bar) | The unlock ladder in §4.3. |
| Core-loop **Tree** code | The Star shop later. |
| Core-loop **Collection** idea | The Museum. |
| `docs/game-feel-guide.md` | Still the rule book for feedback. |
| `assets/generated/mining/` | Worth a look for block art later. |
| `version.js`, changelog, CI, tests | As they are. |

What is *not* reused: the Well, Fields, Refinery, Orders, Fractions, Vials, Cauldrons, Seals. They
stay in the repo behind `?loop=2`. Nothing is deleted.

The live game and its saves are untouched. Dig would ship first as its own page, and you decide
later whether it replaces the live game or sits beside it.

---

## 4. Dig in detail

### 4.1 The loop map

```
            you hit blocks                     diggers hit blocks
                  \                                   /
                   v                                 v
   BLOCKS BREAK  ->  coins, and sometimes: a chest, a bone, TNT, oil
        |                 |                |          |
        |                 v                v          v
        |              SHOP            RELIC (1 of 3)  MUSEUM set
        |        (pick, diggers)     changes your hit   bonus for ever
        v                 \                /
     DEPTH  <--------------  you dig faster  
        |
        v
   BIG ROCK every 25 m  ->  new ground below, one new thing each layer
        |
        v
   NEW SITE (reset): keep Stars + Museum, choose a site with a new rule
```

Short loop (seconds): hit, break, coins. Middle loop (a minute): reach the chest or the ore you can
see; afford the next upgrade. Long loop (5 to 10 minutes): the next Big Rock. Longer (15 to 40
minutes): the next site. There is always one of each in progress.

**Rules that hold everywhere**

- A block can be hit when it touches open space. The top row always can. So you are never stuck.
- The ground is dark except near open space. The Lantern relic lets you see further.
- Every block pays. Luck only adds.
- Combo: breaking blocks quickly raises a coin bonus for *your* breaks (up to x3). When it ends,
  nothing is taken away; the diggers' income never changes with it.
- Nothing waits on the clock. Every gate is coins, depth or a Big Rock.
- Away time: diggers keep going at their own speed for up to 12 hours. No loss for longer.

### 4.2 The first 30 minutes, beat by beat

Times are for a new player. The prototype covers 0:00 to about 15:00.

| Time | What happens | New thing |
|---|---|---|
| 0:00 | A strip of desert, sand below, one line: "Hold the mouse on the ground to dig". | The action |
| 0:03 | First block cracks and breaks. A coin flies to the purse. | Coins |
| 0:10 | Copper in the first rows: a brighter sound, a burst of coins. | Ore |
| 0:15 | The shop's one button lights: Stronger Pick, 10 coins. | Upgrades |
| 0:40 | A chest shows two blocks down. "A chest! Dig your way to it." | A goal you can see |
| 0:50 | The chest opens: three relic cards. Pick one. Your hit changes. | Relics, choice |
| 1:20 | "Hire a Digger" appears. A little man starts digging beside you. | The idle half |
| 1:40 | Two TNT barrels side by side. Break one: both go, and a hole opens. | Chain reactions |
| 2:30 | A bone. The Museum panel appears with empty slots. | Collection |
| 3:30 | The Big Rock at 25 m. A face that watches your pick, a crack that moves. | A boss, aiming |
| 4:30 | The Rock breaks. Shower of coins, a chest, red clay below. | A new layer |
| 5:00 | Lucky Sieve joins the shop. The New Site panel appears as a promise. | The next horizon |
| 6:30 | An oil pocket: a black fountain, coins rain, your hits count x3 for 8 seconds. | A burst |
| 5 to 12 | Red clay: silver and gold, harder rock, more TNT, relic levels 2 and 3. | Your build takes shape |
| ~12:00 | The second Big Rock at 50 m. | |
| ~13:00 | New Site opens. Three sites to choose from. You get Stars. | The reset, with a choice |
| 13 to 30 | Second site. With Stars you pass 25 m in a third of the time. A different site rule, new relics, the first Museum set done. Blue slate at 50 m; the third Big Rock at 75 m. | Faster and different |

Count of new things: one about every 45 seconds for the first five minutes, then about one every
three minutes. Each arrives because of something the player did.

### 4.3 The unlock ladder for the first month

Each line is a resource gate, never a wait. "Site n" means the nth reset.

| When (active player) | Opens | What it adds |
|---|---|---|
| Minute 1 to 13 | Pick, relics, diggers, TNT, Museum, Big Rock, Lucky Sieve, oil, New Site | The prototype |
| Hour 1 | Site 3 to 4 | **Star shop**: spend Stars on permanent perks (start with a digger, keep one relic, chests hold 4 cards). |
| Hour 1 to 2 | 75 m and 100 m | Layers 3 and 4: **water** (flows down and washes loose ore out) and **crystal** (breaks in a line). One new block per layer. |
| Hour 2 to 3 | First Museum sets | **Museum wing 2**: sets that unlock things, not only +25% (a set gives a fourth site, a new relic family). |
| Day 1 to 2 | Site 6+ | **The Forge**: melt ore into tools with a use button: a drill (clears a column), dynamite you place, a magnet. Tools are your active skills. |
| Day 2 to 3 | 150 m | **Foreman**: diggers get jobs you set (follow me / strip the top / go for ore). The first automation, earned. |
| Day 3 to 5 | A full relic build (9 relics) | **Relic fusion**: two level 3 relics become one new relic with both effects and a twist. Dozens of pairs to find. |
| Week 1 | Site 10 | **Contracts**: a site with a hard rule and a prize ("100 m with no diggers", "TNT only"). These are the challenge runs of the genre. |
| Week 2 | 250 m | **Second crew, second site at once**: you leave one site running and work another. Sites become a small map. |
| Week 2 to 3 | Contracts done | **Earned automation**: auto-open chests with a rule you set, auto-buy. Each is won, not bought. |
| Week 3 to 4 | Deep layers | **The Deep**: layers with their own law (dark all the time; blocks that grow back; a rock that hits back). |
| Month 1+ | Map complete | **The second reset** (a new land: sea floor, mountain, city ruins), which keeps the Museum and changes every block. |

The rule for every row: **it must change what the player does, not only a number.** If a proposed
unlock is "+X% to Y", it goes in a shop as a small item, not on this ladder.

### 4.4 The numbers model, in outline

All numbers live in `P`, `TYPES`, `UPGRADES` at the top of `proto/game.js`.

- **Block strength** at depth *r* metres: `5 x 1.12^r`, times the block's kind (stone x3, hard
  rock x8, ore x2 to x5). The first three rows are softer, so the first block breaks in two hits.
- **Block pay**: `1.10^r`, times the kind (copper x6, silver x16, gold x45, gem x160).
- So each metre down is 12% harder and pays 10% more. Going deeper is always worth it, a little
  less each metre. That small gap is what makes a wall come, and the wall is what makes upgrades
  and resets matter.
- **Pick**: each level x1.25 to your hit; price x1.5 a level. One level is worth about 2 metres.
- **Diggers**: each hits 1.25 times a second with their own Training level (same curve). Price of
  a new digger x4.2. Rule of thumb: a full crew is about as strong as a player holding the mouse.
  So playing roughly doubles your speed, and aiming (ore, TNT, the crack) adds more on top.
- **Luck**: 8% of your hits are x5. Relics raise both numbers.
- **Combo**: +4% coins per block in a row, up to x3, for your own breaks.
- **Big Rock**: as strong as 20 dirt blocks of its depth. Hits on the crack count x3.
- **Stars** from a New Site: about one per 10 m past 20 m. Each: coins +20%, hits +10%, for ever.
- **Away**: diggers' hits per second x seconds away, spent row by row on the ground below, up to
  12 hours, stopping at a Big Rock.

Measured with a simple scripted player (`node sim/proto/dig-pacing.mjs`): first Big Rock at about
2 minutes, second at 5 to 8, third at 15 to 20, with no reset. A real person is slower
than the script. The curve slows smoothly; there is no cliff.

For the full game this model must be put in `sim/` the way the core loop did it, so a year can be
checked. The outline above is enough for the first hours only.

### 4.5 Build order: vertical slices

Each slice is playable and is judged by playing before the next starts.

1. **The dig (done in the prototype).** Blocks, pick, coins, ore, the dark, combo, big hits,
   sound, shop, chests and 13 relics, TNT, diggers, Museum, Big Rock with the crack, two layers,
   oil, New Site with three sites, away time.
2. **Make it yours.** Move into the real engine: `t()` and Arabic, `SaveManager` and versions,
   settings (volume, reduced motion), tests for `game.js`, a sim in `sim/`. No new features. This
   is the slice that makes it shippable beside the live game.
3. **The first hour.** Layers 3 and 4 with water and crystal. The Star shop. 12 more relics, built
   in pairs that work together. A proper New Site ceremony. Balance the first three sites.
4. **The return.** The away card as a real moment: chests to open one by one, a "what your crew
   did" strip, the Foreman. Test with real 8 hour gaps.
5. **Tools.** The Forge and three tools with a use button. This is where active play gets its
   second verb.
6. **The long game.** Contracts, relic fusion, Museum wing 2.
7. **Many sites.** The map, a second crew, earned automation.
8. **The Deep and the second reset.**

Slices 2 and 3 are about two to three weeks of the pace this repo has kept. Slice 1 exists.

### 4.6 What would prove this wrong

Watch the first real playtest (you, then one person who has never seen it) for these. Any one of
the first three means stop and rethink, not polish.

1. **The player lets go of the mouse in the first two minutes and waits.** Then the action is not
   fun in itself, and nothing built on top will fix it.
2. **At a chest the player picks without reading, every time.** Then relics are not changing how
   it feels to dig, and the build layer is empty.
3. **After the first New Site the player says "again?"** rather than "this time I will...". Then
   the reset is the oil well's reset with sand on it.
4. The player never aims: digs straight down and ignores ore, TNT and the crack. Then position
   does not matter enough; blocks need to do more to each other.
5. The player hires diggers and then only watches them. Then active play is not rewarded enough
   (or holding the mouse is tiring: add a "lock on" toggle).
6. The player does not come back the next day to open the chests. Then the return moment is too
   weak.

What a good first session looks like: the player talks ("ooh, gold", "wait, if I blow that
up..."), leans in at the Big Rock, and stops at a moment of their choosing with a plan for next
time.

---

## 5. About the prototype

**Open:** the page is on the branch `redesign-v3`, not on `main`, so the usual server on 8101 does
not have it yet. From the branch's folder run `python server.py 8130` and open
`http://localhost:8130/proto.html`. (After a merge it would be `http://localhost:8101/proto.html`.)
Desktop only. Sound is on; the button is top right.

**First minute:** hold the left mouse button on the sand and move it around. Buy Stronger Pick
when it lights up. Dig to the first chest and pick a relic.

**Files** (nothing outside these, and nothing in `js/main.js`):

| File | What it is |
|---|---|
| `proto.html`, `proto/proto.css` | The page. The folder is `proto/`, outside `js/` and `css/`, because the main game's tests scan those two for its own theme and translation rules. |
| `proto/game.js` | The rules. Pure functions over one state; no DOM. All numbers at the top. |
| `proto/render.js` | Canvas drawing and effects |
| `proto/audio.js` | All sound, made in code |
| `proto/main.js` | Input, the loop, panels, cards |
| `proto/strings.js`, `icons.js` | Words (one table, ready for Arabic) and drawn icons |
| `test_proto_dig.js` | Tests for the rules (runs in `npm test`) |
| `sim/proto/dig-pacing.mjs` | A scripted player, to check pacing after a number changes |

**Debug:** `proto.html?speed=4` runs the world four times faster. "Start over" is in the footer.
A background tab keeps digging at full speed.

**Known gaps** (it is a prototype):

- English only. The layout uses logical CSS properties, so mirroring should work, but it was not
  tested in Arabic.
- Plain numbers, not `BigNum`. Fine for the first hours.
- The pacing script is rough: one scripted player, 25 minutes, no year-long model.
- Balance was tuned with a scripted player and a little by hand, not by many people.
- The art is all drawn in code. It is clear, not pretty.
- No settings for reduced motion or volume.
- Rows you leave behind when you dive are lost when they scroll off the top. This is on purpose
  (dive or strip is a choice) but it may feel bad; watch for it.
- Not built: Star shop, tools, contracts, layers past the second.
