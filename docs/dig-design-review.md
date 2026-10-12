# Dig: design review after the owner's playtest

Written 2026-10-12. This is a study and a set of choices. Nothing in the game was changed.

**How to read it.** Part 1 is the verdict. Part 2 answers your ten questions one by one. Part 3
puts the answers together into three possible directions. Part 4 is the one I recommend and the
first three pieces of work. Part 5 is the list of choices only you can make. Part 6 is bugs.

**What my conclusions rest on.** I could not open the page: this session had no browser. So:

- **Play:** none. I did not see the game on screen. Everything about how it *looks* and *feels*
  comes from reading the drawing code and from your own words.
- **Sim:** I ran the month sim (`sim/proto/dig-month.mjs`, 3 seeds, 3 players, 30 days) and the
  timeline sim (`dig-timeline.mjs --quick`) on today's `main`. I also drove the real rules from
  node with the sims' scripted player to try your bomb build on Powder Valley (2 seeds, 40 minutes
  each, compared with The Dunes).
- **Code:** I read the core rules, the depth curves and every feature's rules.
- **Other games:** what I say about other idle games is from my own knowledge of them. I did not
  do fresh research for this review.

Each claim below says which of these it rests on.

---

## 1. The verdict in ten lines

1. **The first ten minutes work.** Hit, break, chest, relic, first Big Rock. Keep all of it.
2. **After that the game is one loop: run to the same Rock, stop, move, repeat.** In the sim the
   active player reaches 100 m on day 1 and then ends **eleven digs in a row at exactly 100 m**,
   each paying exactly 8 Stars, until day 5. Only 8 to 13% of moves end deeper than before. This is
   your "no sense of achievement past 100 m". It is the design, not bad luck.
3. **At a Big Rock there is nothing to do and nothing to earn.** In my test the purse did not move
   for 30 minutes while the Rock's bar went from 100% to 57%. This is where a player spends most
   of his time after day 1. It is the dullest part of the game.
4. **Your coin number was real and the display was broken.** "4.30e+37qi" means about 4 x 10^55
   coins. That needed a dig more than 1,000 m deep. The fix that merged after your session stops
   it: today the same build on Powder Valley stops at the 75 m Rock with about 2 million coins,
   the same as The Dunes. Coins no longer run away. The display bug is still there.
5. **"My pick was never strong enough" is true by design.** Bombs, crystals and tools break ground
   by the ground's own hardness, so the pick does not matter inside a layer. The pick only matters
   at the Rock, and the Rock is tuned to stop you. So the pick is only ever seen losing.
6. **Rafeeqs are strong and invisible.** After the first minutes they do 3 to 16 times your damage, and they break half
   the blocks. They earn 5 to 40% of the coins while you play, because they dig the cheapest rows.
   Nothing on screen says what they earn. The number exists in the code and is never shown.
7. **The Museum's reward is a "+25%" next to Stars that already give +1,360% on day 1.** It cannot
   be felt. The Wing's rewards are real things, but they sit in a sixth panel.
8. **Sites have no look and no stakes.** The site list is a menu. In the code a site changes five
   numbers and its name. It draws the same sky, the same palm, the same ground.
9. **The two changes that matter most:** (a) give every dig **an end you can reach** (a site with a
   bottom, a prize and a stamp on a map), so a dig is won, not abandoned; (b) make the **Rock a
   fight that pays**, and show what the Rafeeqs earn.
10. **Do not add systems.** There are ten panels already. The next round should merge them into two
    screens (the Dig and the Camp) and add one thing: the map.

---

## 2. The ten questions

### 2.1 Runaway builds (bombs)

**What is true today**

- *Code.* A TNT barrel hits for 7 dirt blocks **of its own row** (`tnt.power`). It does not ask how
  strong your pick is. The same is true of crystal lines (`crystal.power`), the Forge's dynamite
  and drill, and lava. Powder Valley multiplies TNT by 3.2, so with the Big Bang relic there is a
  barrel in 9 rows of 10 and each blast is 7 by 7 blocks. A layer falls by itself.
- *Code.* A blast pays what the blocks pay: the value of the ground at that depth, times your coin
  bonus. Nothing pays more because it was a blast. So coins can only run away if **depth** runs
  away.
- *Code.* Depth cannot run away now. `sealed()` in `core/rules.js` stops every kind of damage below
  a standing Big Rock. The Rock takes at most 12 of your own pick hits from one blast
  (`boss.chainCap`). Flying rocks and fire have their own caps (`relics2.throwCap`).
- *Node test.* Second site, Powder Valley, the bot taking bomb relics first, 40 minutes, 2 seeds:
  it reached the 75 m Rock in 5 minutes (The Dunes: 10 minutes) and then stopped. Total coins 1.8
  to 2.1 million. The Dunes: 3.1 to 3.7 million. **I could not make coins run away today.**
- *Limits of that test.* Two seeds. The bot found about eight chests, so every relic was level 1
  and nothing was fused. Relics that make new blocks (Twin Stone, Ore Garden, the fused fire
  barrel) can make more blocks at one depth. That is more coins at that depth's price, not an
  explosion. But I did not test a full level 3 build by hand.
- *Your number.* 4.3 x 10^37 "Qi" is 4.3 x 10^55 coins (bug 6.1). Ground pays 10% more per metre,
  so that is a dig of roughly 1,200 m. That was the old leak: fire and TNT dug under the Rocks.

**Is a broken build a bug or the fun?** It is the fun, on one condition: **it must end.** In the
games people love for this (Balatro, Vampire Survivors) a build breaks the game for one run, the
run ends with a score, and the next run starts clean. What went wrong in your session was not that
bombs were strong. It was that the dig had no end, so the number had nowhere to stop, and the pick
had nothing to do.

**Options**

| | Option | For | Against |
|---|---|---|---|
| A | Cap everything by the pick (TNT hits for N pick hits) | The pick always matters | TNT stops feeling like TNT; every relic becomes "+X% pick" |
| B | Diminishing returns on chains (each link weaker) | Simple to tune | The best moment of the game (a long chain) gets weaker the better it is |
| C | **Let it run inside a site; give the site a bottom; move the goalposts between sites** | Keeps the joy; makes the pick matter at the gates; a broken build becomes "I finished in 4 minutes" | Needs sites with an end (question 2.5) |
| D | Leave as it is | No work | The pick stays useless in a layer and useless at the Rock |

**Recommendation: C, with one rule for the whole game.**

> **Width is free. Depth is earned.**
> Anything may break *ground* by the ground's own hardness: barrels, crystals, water, fire, tools.
> Only *your* strength opens a *gate* (a Big Rock, a site's bottom). A blast counts against a gate
> as a fixed number of your own hits. Coins come from blocks, blocks are priced by depth, depth is
> closed by gates. So no build can make coins without passing a gate, and no build can pass a gate
> without your strength.

Most of this rule is already in the code since the last fix. What is missing is the other half:
**a place for the broken build to win** (a bottom to reach, a time to beat), and a number format
that does not break.

**Size: S** for the rule itself (write it into `proto/README.md`, add one test that walks every
feature and fails if anything damages a wall without the cap). The rest is question 2.5.
**Replaces:** per-relic patches.

### 2.2 What your own strength is for

**What is true today** (*code and sim*)

- The pick: x1.25 per level, price x1.5 per level. It resets at each site.
- Rafeeq Training: the same curve. The sim's player buys both level for level (pick 26, training
  25 after 10 minutes).
- Stars: each one is +10% hits and +20% coins **for ever**. The active player has 68 on day 1 and
  205 **million** on day 30. So Stars are the real strength and the pick is a small top-up that is
  rebuilt every five minutes.
- Relics: change how the hit lands. They reset at each site. A site lasts about five to ten
  minutes of real digging, so most relics stay at level 1 (my test: all level 1).
- Inside a layer the ground is broken mostly by things that ignore the pick (2.1). At the Rock only
  the pick counts, and the wall behind the 75 m Rock is 20 times higher (`core.grow[1].step`).

So the four things do not have four jobs. Three of them are "more damage", and the one that should
be yours (the pick) is the weakest of the three.

**Options**

| | Option | For | Against |
|---|---|---|---|
| A | Raise the pick's numbers | One line | Same loop, faster; does not give it a job |
| B | **One job each** (below) | Every purchase answers a question the player has | Stars and the Star curve must be re-tuned |
| C | Remove the coin shop; the pick grows from relics only | Fewer panels | Loses the simplest "I got stronger" button in the game |

**Recommendation: B. One job each, said in one line each.**

| Thing | Its job | The line the player learns | Lives for |
|---|---|---|---|
| **Pick** (coin shop) | Opens gates: Big Rocks and hard rock | "A stronger pick breaks the Rock" | One site |
| **Relics** (chests) | How you dig: shape, chains, tricks | "This time I am a bomb digger" | One site |
| **Rafeeqs** (coin shop) | Income, and work you do not want to do | "My crew earns while I fight" | One site, but the crew itself is kept (2.3) |
| **Stars** (maps, medals) | Options and head starts, not raw power | "I start with a relic and two Rafeeqs" | For ever |
| **Museum** | Opens places and toys | "This set opened Shark Bay" | For ever |

Two changes follow from the table:

1. **Make the Rock answer to the pick in a way you can see.** Show "your hit: 320. This Rock: 9,000
   hits" under the Rock's bar, and after each pick level show the new count. Today the player buys
   a level and the bar looks the same.
2. **Stars stop being the main multiplier.** Keep a small permanent bonus (it feels good), but
   earn Stars in small whole numbers (tens in a week, not millions) and spend them on perks. A
   currency that reaches 205 million has no meaning: the same problem as the old game's "318.51ag".
   This is only possible when progress is measured by sites finished, not by one endless wall
   (2.5, 2.7).

**Size: S** for the Rock's read-out. **M** for the Star change (it needs the month sim re-tuned),
and it only makes sense inside direction A or B of part 3.

### 2.3 Rafeeqs

**What is true today**

- *Timeline sim, 7 seeds.* Rafeeqs break 39 to 56% of all blocks. From minute 5 on their total damage per
  second is 3 to 16 times the hand's (60 minutes in: 138,900 against 19,100). Their share of coins while you
  play: 10%, 33%, 28%, 41%, then **5% and 9%** after minute 40.
- *Month sim.* Over the month, coins earned by Rafeeqs while the player watches: 0 to 2%. Coins
  from time away: 31% (active), 97% (mixed), 67% (idle).
- *Code.* The default job is "the nearest block, top rows first" (`nearest` in `diggers/rules.js`).
  Top rows are the cheapest blocks on screen, and they scroll away when you go down. So eight men
  clean up behind you.
- *Code.* Their income is measured (`s.crewCps`) and **shown nowhere**. No number over their
  heads, no line in a panel.
- *Code.* They are all the same. One Training level for all. They are deleted at every New Site
  and hired again.
- *Code.* They hit the Rock without the crack bonus. At a Rock they do most of the damage, and the
  player cannot see that either.

So your feeling is right and the sim's 25 to 30% is also right. **They are strong in damage, weak
in coins, invisible in both, and nobody's in particular.** The problem is behaviour and
visibility first, the role second. It is not the raw numbers.

**What good idle games do with helpers** (*my knowledge of the genre*)

- **They show the number.** Cookie Clicker prints what each building makes and its share of the
  total. You never wonder whether grandmas are worth it.
- **Helpers overtake the hand early and stay ahead.** In Cookie Clicker and Clicker Heroes the hand
  is the main income for the first minutes only. After that the hand is the *burst and aim* and the
  helpers are the *income*. Here the hand is still 59% of the active player's coins at day 30.
- **Helpers have jobs you can see.** In the Gnorp Apologue each kind of gnorp does one visible
  thing (hits, carries, shoots), and you watch your choice of mix play out. In Kittens Game you
  move workers between jobs and the rates change at once.
- **They are yours.** Names, levels, a hat. Games that keep the same crew across resets get
  attachment for free.

**Options**

| | Option | For | Against |
|---|---|---|---|
| A | **Show and aim** (below) | Small; fixes the feeling without new systems | They are still "more picks" |
| B | Specialists: three kinds of Rafeeq | Real choices; each is visible | A second system to learn; needs art |
| C | You direct them (click a block to send them) | Feels like command | A second verb for the mouse; tiring in an idle game |
| D | Their own growth: a kept crew with names and levels | Attachment; a long-term bar | Needs a save change and a crew panel |

**Recommendation: A now, then D, then a small B. Not C.**

*A. Show and aim (S).*
- A gold "+12" floats from a Rafeeq's block, in his shirt colour. A line under the purse:
  "Rafeeqs: 240 a second (38%)".
- The default job becomes **"dig beside me, and below me"**: the row the player last hit and the
  rows under it. Never the rows that are about to scroll away.
- At a Rock they do not all hit the Rock. Half of them **sieve the rubble** beside it for coins
  (the away rules already do this; see `away.sieveShare`). So the purse moves during a Rock fight.
- The Rock's bar shows two colours: your damage and theirs.

*D. A kept crew (M).* The Rafeeqs you hire are people: a name, a shirt colour, a hat (hats exist
as contract prizes). A Rafeeq gains a level for blocks he has broken, in every site, for ever. At a
new site you bring the crew with you; coins still buy their tools for that site (Training). This
replaces the Star perk "start with a Rafeeq".

*B. Three kinds, earned one at a time (M, later).* Not classes to study. One line each:
- **Digger:** digs down beside you. (Today's Rafeeq.)
- **Blaster:** walks to barrels and oil and sets them off. On Powder Valley he is the star.
- **Scout:** walks to chests, bones and ore he can see, and carries a lamp (he lights the dark).

The Foreman panel then has a reason to exist, or better, it becomes one row of buttons on the
crew panel.

**Target numbers to tune to:** at minute 30 of a site, coins while watching are about 40% hand,
40% Rafeeqs, 20% tools and chains, and the player can read that split on screen.

**Size: S** (A), **M** (D), **M** (B). **Replaces:** the Foreman's separate panel; the "Tea break"
and "Clear the top" jobs; the `sp_head` Star perk.

### 2.4 The Museum

**What is true today**

- *Code.* The Museum has three sets (4, 5 and 6 bones). A bone sits in about one row of thirteen,
  and three bones of four are ones you lack. So fifteen bones need roughly 250 rows. With digs of
  75 to 100 m that is three or four sites: **about an hour**. "Fills up quick" is correct.
- *Code.* Each set is "+25% coins". On day 1 the sim's player has 68 Stars, which is +1,360%
  coins. Three sets move income by a factor of 1.95 next to a factor of 14.6. "No effect" is
  correct too.
- *Code.* The Wing (merged after your session) has ten more sets and they do real things: a hall,
  three relics for the chests, hats, goggles for the dark, a jar of spare bones, and two sites
  (Shark Bay, the Mirage). It opens at 12 m. Its pieces come from eight different places (bones,
  bundles, blasts, ore, chests, oil, Rocks, a named site).
- *Not seen.* I did not see how the Wing looks in play. From the code it is a second panel under
  the first, with its own list.

So there are two museums with opposite ideas, and the one the player meets first is the weak one.

**What collecting should be for in this game.** Not percent. A set should **open something you
then use**: a place, a relic family, a kind of Rafeeq, a room in the camp. And the player should
see the prize *before* the set is done, so the last bone is a hunt.

**Options**

| | Option | For | Against |
|---|---|---|---|
| A | Keep both, raise the +25% | One line | Still a number; still fills in an hour |
| B | **One Museum; every set opens a thing; no percent** | The reward is a thing on the map or in the chest | The three old sets need new prizes |
| C | The Museum earns: visitors pay coins by how full it is | A second idle income you can watch | A new number and a new picture to draw |
| D | Cut the Museum | Less clutter | Loses the only goal that survives every reset |

**Recommendation: B.** One Museum, thirteen sets, one line each.

- Every set card shows its prize from the start, as a picture with the name: "Finish to open:
  **Shark Bay**". The last missing piece says where to look ("in a blast", "under the third Rock").
  The Wing already does this for rare pieces.
- The three old sets get prizes of the same kind. Suggestions: Old Camel: a camel at the camp that
  carries one more chest home when you are away. Sand Whale: opens the Wet Slate's pearls. Lamp of
  the Djinn: one free re-roll of a chest per site.
- Whatever a set opened carries a small bone mark wherever it appears (on the site card, on the
  relic card). That is how the effect is *felt*: you meet the prize again and again.
- Pace: first set inside the first 20 minutes, then about one set every two to three days for the
  month. Thirteen sets in thirty days.
- The Museum is not a panel on the dig screen. It is a room you visit at the camp (2.9). On the
  dig screen a new bone shows a toast and a small counter, as now.

**Size: M.** **Removes:** the +25% set bonus, the second panel, the split between "Museum" and
"Wing".

### 2.5 Maps and sites, and choosing them

**What is true today** (*code*)

- After two Big Rocks the "New Site" panel lights. A card lists every open site. You click one.
- A site is five multipliers: TNT, ore, bones, chests, hardness. Powder Valley is TNT x3.2 and
  hardness x1.25. The two Wing sites also carry one rule each.
- A site has no picture. The sky, the palm, the tent and the ground colours are the same on every
  site (`drawSky` in `ui/render.js` has one sky).
- A site has no end. You leave when you are stuck. The Stars paid depend on how deep you got.
- The sim's player picks "a site I have not seen, else any". There is no reason in the rules to
  prefer one.
- Contracts (ten of them) are sites with a hard rule and a prize. They open after 14 moves, on
  another panel.

**The four ways to choose, compared**

| | How it works | With resets and Stars | With contracts and Wing sites | "This time I will..." |
|---|---|---|---|---|
| **(a) A route map** | A map of the desert. Stops joined by roads. Some roads fork. Each stop shows its rule and its prize. You travel one stop at a time. | A reset is a step on the road. Stars come from reaching a stop's bottom, so they are small whole numbers. | A contract is a stop's hard medal. A Wing site is a side road that a Museum set opens. | **Strong.** You see three stops ahead and plan. |
| **(b) A deal of 3 cards** | The game deals three site cards. Each has a place, a twist and a prize. Pick one. | Works with today's reset unchanged. | A contract is a card with a red border. Wing sites join the deck. | **Good.** The choice is fresh each time, but there is no "ahead". |
| **(c) A fixed campaign** | Sites come in a set order, each a set piece. | Simple to pace. | Contracts are optional replays. | **Weak** after the first pass: no choice. Strong for teaching. |
| **(d) Rotating offers** | Offers change over time. | If they change by the clock, a player who is away misses them. | | **Risky.** A clock offer is fake scarcity. Your rule 8 forbids it. Offers that change *per move* are just (b). |

**Recommendation: (c) for the first four sites, then (b) dealt on (a).**

- **Sites 1 to 4 are fixed** and each teaches one thing: The Dunes (the basics), Powder Valley
  (chains), Golden Wadi (ore and the Forge), Valley of Beasts (bones and the Museum). This is where
  the player learns that a site is a *place with a rule*.
- **From site 5 the road forks.** At each stop the game deals **two or three next stops**. Each
  card shows four things and no more:
  1. the place (its picture and name),
  2. its rule in one line ("Barrels everywhere"),
  3. how deep its bottom is ("75 m, 3 Rocks"),
  4. its prize ("3 Stars, and a piece of the Flying Camel").
- **The cards sit on a map**, so the player sees the road he has travelled, stamped, and the fork
  ahead. The map is a picture of the same data. It can be built second.
- **A site has a bottom.** This is the important part. The last Rock of a site is its **Gate**.
  Break it and the site is *finished*: a ceremony, the prize, a stamp on the map. You may then move
  on, or dig on below for more Stars as today. A site you could not finish can be tried again, and
  you keep the Stars for the depth you reached.
- **Each stop has three medals:** reach the bottom; reach it fast (2.6); reach it under a hard rule
  (today's contracts). So the ten contracts move onto the map and their board goes away.
- **"The game chooses":** the game chooses *what is offered*. The player chooses *among them*. I do
  not recommend the game choosing alone: it removes the one decision that makes a reset feel like a
  plan.

**Why this gives "this time I will...":** the player sees the rule and the prize before he goes,
he has one kept relic to bring (the Star perk exists), and the site can actually be won.

**Size: M** for sites with a bottom, the finish ceremony and the deal of three (rules: a `floor`
on each site, a prize table, a small state for stamps; page: the card and the ceremony). **M** for
the map picture. **Replaces:** the site list, the contracts board, the "stuck, so I move" reset.

### 2.6 Timed runs

**Does it break your rule?** No, if the clock never *gates* anything. "Wait 30 minutes for the
next Order" is a clock gate. "How deep can you get in 3 minutes, if you want to try" is a game you
choose. The line is: **the clock may measure you; it may never make you wait, and it may never
take something away when you are absent.**

**Options**

| | Option | Adds | Risks | Where it sits |
|---|---|---|---|---|
| A | **A stopwatch on every site**: "Finished in 6:40. Your best: 5:12." Bronze, silver, gold. | A reason to replay a finished site. A place for broken builds to shine. | Almost none: nothing counts down. | The finish card and the map (medal 2). |
| B | **Sprint cards**: "Three minutes. How deep?" A countdown you start with your first hit. | A different rhythm; a short session with a clear end. | Stress. A countdown on screen changes the mood of an idle game. | One card type in the deal, never forced. |
| C | **A daily dig**: one seed for everyone, one board. | A reason to open the game today; something to talk about. | It is a clock offer. If it pays anything you cannot get tomorrow, it is fake scarcity. Streaks are worse. | Only as a board, with no prize but your name. Later. |
| D | Sprint sites and marathon sites as two kinds of place | Variety in session length | More content to tune | Falls out of A and B. |

**Recommendation: A now. B later, as a rare card. C only as a no-prize board, if at all.**

Rules I would write down so it never drifts:
- The stopwatch runs only while the page is open and no card is up.
- A medal is won once and kept. Nothing expires. Nothing is daily.
- No medal needs a time a careful, calm player cannot make with a good build.
- A sprint never appears as the only card in a deal.

**Size: S** (A, once sites have a bottom). **M** (B). **Replaces:** nothing.

### 2.7 Sense of achievement after 100 m, and overall progression

**What a player actually gets between 100 m and 200 m** (*month sim, today's `main`*)

| | Day 1 | Day 2 | Day 3 | Day 5 | Day 7 | Day 10 | Day 14 | Day 30 |
|---|---|---|---|---|---|---|---|---|
| Active: deepest ever | 100 m | 101 m | 101 m | 101 m | 125 m | 125 m | 150 m | 225 m |
| Active: New Sites so far | 10 | 21 | 21 | 21 | 22 | 42 | 53 | 104 |
| Active: Stars ever | 68 | 168 | 168 | 168 | 347 | 4,300 | 66,700 | 205 million |
| Active: share of all content found | 62% | 67% | 67% | 68% | 72% | 73% | 77% | 93% |

Read it as a player would live it:

- **Day 1 gives 62% of the game.** Twenty-nine more days give 31%. The game is front-loaded: the
  same mistake as the old game's "four systems in two minutes", stretched to an hour.
- **Days 1 to 5: nothing gets deeper.** The list of the active player's moves reads
  "100 m, 8 Stars" thirteen times in a row. Each of those digs takes a few minutes to reach the
  Rock and then stalls.
- **The reward for a move is a number that is always the same** (8 Stars), then a number too big to
  mean anything (millions).
- **A move gains 1.3 m on average.** 8% of the active player's moves and 13% of the mixed player's
  end deeper than any dig before.
- **There is no record on screen.** The depth in the header is this site's depth and returns to 0
  at each move. The game never says "your best: 100 m" (`s.best` is per site; no all-time record is
  drawn anywhere).
- **The goal bar says the same thing for a month:** "The Big Rock is at N m" or "Break the Big
  Rock!".

`docs/dig-pacing.md` already names this (section 6, point 3). I think it is not a tuning problem.
It is the frame. **A wall that takes fifteen to twenty moves is fifteen to twenty losses and one
win.** No amount of smoothing makes a loss feel like progress. The player needs *wins of a size he
can reach in one or two digs*, and a picture where they add up.

**Options for the frame**

| | Option | For | Against |
|---|---|---|---|
| A | Smooth the wall: lower steps, more moves end deeper | Uses what exists | Still one number (depth) as the only goal; "deeper by 3 m" is not a win |
| B | Records and ranks on today's game: a best-dig board, a rank by total depth | Cheap; gives the player a mirror | Tells you about progress; does not create it |
| C | **A journey: a road of sites with bottoms, stamps and medals (2.5)** | Many small wins; a picture; a clear long-term goal | The Star curve and the month sim must be rebuilt |
| D | A camp or town that grows with what you bring up | A home; a picture of everything you own | Art and a second screen; can become "another screen of buttons" |

**Recommendation: C as the frame, with B inside it and a small D as its home.**

**The first month as one picture**

```
THE CARAVAN ROAD                         long-term goal: reach the Lost City at the end of the road

 [1 Dunes]--[2 Powder Valley]--[3 Golden Wadi]--[4 Valley of Beasts]      day 1: learn, fixed order
   50 m          50 m              75 m               75 m
                                                         |
                                 .-----------[5a]--------+--------[5b]-----------.   days 2 to 7:
                                 |          75 m                  100 m          |   the road forks,
                               [6a]--[7a]             [side road: Shark Bay]   [6b]  2 or 3 cards
                               100 m  100 m           (opened by a Museum set)  100 m
                                 '------------------[8 The Black Well]-----------'   week 2: the Deep
                                                         125 m
                                              [9]--[10]--[11]                        weeks 2 to 4
                                              150 m 175 m 200 m
                                                         |
                                                 [12 THE LOST CITY]                  about day 30
                                                 below 200 m: the next land begins

 Each stop:   (stamp) finished    (medal) fast    (medal) hard rule       3 goals a stop
 The camp:    tent -> crew tents -> Museum hall -> Forge -> map table     grows with stamps
 Always on screen while digging:  depth ruler with "this site's bottom" and "your record"
```

- **Long-term goal, said in one line:** "Follow the old caravan road to the Lost City." A lost
  city under the sand is a real Gulf legend and a seven year old understands it.
- **Middle goal:** the next stop on the road, and its three medals.
- **Short goal:** this site's next Rock, as now.
- **How the player sees himself getting there:** the map, with his stamps on it. Twelve stops and
  two or three side roads, three medals each: about forty goals. The mixed player moves about 130
  times a month, so **roughly one dig in three ends with a stamp or a medal**, against one in ten
  ending deeper today. Tune so that it is at least one in two during the first week.
- **Rank:** a title from stamps: Helper, Digger, Guide, Caravan Leader. One line under the purse.
- **Records:** per site: deepest, fastest, most coins in one dig. Shown on the stop when you hover
  it. This is where a broken bomb build is remembered.
- **Where the Deep goes:** the four laws below 100 m are the rules of stops 8 to 11. Nothing in the
  `deep` feature is lost. Its layers are reached on the days the pacing doc already wanted.
- **Where the endless dig goes:** below a finished site's Gate the ground goes on, as today, for
  players who like one long dig. It pays Stars by depth, slowly.

**Size: L in total, but it is three M pieces** (part 4). **Replaces:** `starsAt` and its share
table as the main source of Stars; the "15 to 20 moves per Rock" target in `docs/dig-pacing.md`;
the planned `map` package (several sites at once).

### 2.8 Depth and map colours and look

**What exists** (*code; I did not see it rendered*)

| Depth | Layer | Dirt colour today | Problem |
|---|---|---|---|
| 0 to 25 m | Sand | `#dba65a` | Fine. |
| 25 to 50 m | Red clay | `#c0673f` | Fine. |
| 50 to 75 m | Slate (water) | `#5f86a3` | Blue. |
| 75 to 100 m | Crystal | `#3b4f7c` | Blue again, only darker. Two blue layers in a row. |
| 100 to 125 m | The Black | `#2b2b3d` | Fine: it should be dark. |
| 125 to 150 m | The Living Rock | `#557f3f` | Fine: the only green. |
| 150 to 175 m | The Angry Layer | `#a63d2d` | Red-brown. Close to the clay at 25 m. |
| 175 m on | The Hot Layer | `#c4581e` | Orange-brown. Close to the Angry Layer and to the clay. Three look-alikes. |

- Sites: no look at all. One sky (`#2b6cb0` to `#f2a65a`), one sun, one palm, one tent.
- Depth: a number in the header, and a dark fade at the bottom of the view. No ruler, no marks.
- At a Rock: a toast with the layer's name, 2.4 seconds after the Rock breaks.

**Proposal: three rules, then the tables.**

1. **Each layer has its own hue, and no two neighbours share one.** Brightness falls as you go
   down, so depth is read even without the number.
2. **Deep layers are dark ground with bright things in it.** Glow carries the identity (crystals,
   mushrooms, lava), not a brighter fill. Then ore and chests stay readable.
3. **The site paints the top and tints the ground. The layer paints the ground.** So "where am I"
   (site) and "how deep am I" (layer) are two separate signals and never fight.

**Layers**

| Layer | Dirt | Stone | Hard rock | Dug-out wall | What is drawn that is only here |
|---|---|---|---|---|---|
| 1 Sand | `#E0B062` | `#B3A58C` | `#6A5D4E` | `#5A3D22` | Roots and small shells near the top; a shaft of daylight for the first 10 m. |
| 2 Red Clay | `#C0673F` | `#96807A` | `#4F3F3F` | `#4A2418` | Broken pots in the wall; cracks in the clay. |
| 3 Wet Slate | `#3F8F8C` (teal) | `#6FA3A0` | `#1F4B4D` | `#12302F` | Drips from the top of the view; a wet shine on blocks; water `#58C7E8`. |
| 4 Crystal Cave | `#7B5BB5` (violet) | `#9484C2` | `#36285A` | `#1D1433` | Crystals `#9BE7FF` light the blocks next to them; small sparkles in the wall. |
| 5 The Black | `#2B2B3D` | `#3B3B50` | `#16161F` | `#07070C` | No light but yours: a soft circle around the pick and each Rafeeq's lamp; mushrooms glow `#7CFFB2`. |
| 6 The Living Rock | `#557F3F` | `#6F8F54` | `#2C4526` | `#16260F` | Moss creeps on the edges of holes; vines hang in the wall; spores drift up. |
| 7 The Angry Layer | `#A8324F` (crimson, away from clay) | `#8C4A5E` | `#4A1626` | `#2A0C16` | Every tenth block has eyes that follow the pick; the wall pulses slowly. |
| 8 The Hot Layer | `#3A2A26` (charcoal) | `#5A3A30` | `#1E1412` | `#160806` | Thin lava veins `#FF7A1A` across blocks; heat shimmer; embers rise. The layer is dark and its cracks are bright. |
| Below 200 m | `#CFC6B0` (pale stone) | `#B8AE96` | `#7C745F` | `#3A3628` | Carved blocks and turquoise tiles `#2BB3A3`. After four dark layers the ground turns pale: you have found walls. This is the Lost City. |

**Sites** (the top of the screen, a light tint on the ground, one drifting thing)

| Site | Sky, top to horizon | On the horizon | Ground tint | Drifting |
|---|---|---|---|---|
| The Dunes | `#7EC8F2` to `#F6D9A0` | Dunes, one palm, the tent | none | A little sand on the wind |
| Powder Valley | `#F29B4B` to `#6B2D2A` (dusk) | Red canyon walls, crates, a warning flag | red, 10% | Soot specks; a far-off bang now and then |
| Golden Wadi | `#9FD8F5` to `#FFF0B8` (noon) | Green bushes, an acacia, a dry river bed | gold glints in the dirt | Dust that sparkles |
| Valley of Beasts | `#E9D7F0` to `#F7E6C8` (dawn) | A giant rib cage as an arch | chalk, 12% paler | Slow birds |
| Shark Bay | `#3FB6C9` to `#DFF6F0` | The sea, a dhow, wet sand | teal, 8% | Gulls; shells in the top rows |
| The Mirage | `#F5B7D0` to `#FDE7B0` | A palm and its upside-down twin; the air wobbles | lavender, 10% | Heat shimmer over the whole view |

**How depth is shown**

- **A depth ruler** on the inner edge of the ground, fixed to the screen. A tick every 5 m, a
  number every 25 m. The ruler is coloured in bands with each layer's dirt colour, so the whole
  site is visible as a striped column. On it: a pick for "you", a small rock face at each Big Rock,
  a flag at "this site's bottom", a dotted line at "your record here".
- **Light falls off.** A daylight shaft for the first 10 m. From 50 m a soft dark frame around the
  view that grows 5% per layer. From 100 m the only bright things are what glows.
- **The wall behind moves slower than the blocks** (two layers of it), so going down has speed.
- **The change is seen coming.** The last two rows above a Rock mix in a few blocks of the next
  layer's colour.
- **At each Big Rock:** the banner names the new ground at once, not 2.4 seconds later. The ruler
  flashes the new band. The background hum changes pitch. The Rafeeqs light their lamps at 100 m.

**Size: S** for the palette (a table of colours per layer; the crystal feature already overrides
its own look). **M** for the ruler, the light and per-site skies. **L** if every prop in the tables
is drawn; do the ruler, the skies and the tints first.

### 2.9 Overall game progress and the clutter problem

**What is on screen once everything is open** (*code*)

- Left: Relics, Foreman, Museum, Recipe Book, Wing, New Site, Contracts. **Seven panels.**
- Right: Star Shop, Shop, Forge. **Three panels.**
- Plus the tool bar, the goal bar, the purse, the Stars chip, the status chip.
- When they open: the Forge at **2.4 minutes** (the plan says 12 to 45). The Recipe Book as soon as
  you hold two relics (about minute 3), long before a fusion is possible. The Wing at 12 m.

**Is the feature set coherent?** The *ground* is: blocks that do things to each other is the heart
of the game and it is rich (water, crystal, the Deep's four laws). The *shell around it* is not: it
grew one package at a time and each package brought a panel. Five of the ten panels are about
things that outlive a site, and they sit beside the dig, asking to be read while you dig.

**One rule to sort them: two screens.**

- **The Dig** shows only what you use while digging: the Shop, your relics, your crew, the tool
  bar, the goal bar, the depth ruler.
- **The Camp** is where you stand between digs: the map (next site), the Museum, the Star Shop, the
  Recipe Book, your records. It is the top of the screen made into a place: a tent, crew tents, a
  Museum hall, a forge, a map table. Each appears when it is earned. Click one to open it.

**Feature by feature**

| Feature | Verdict | Why |
|---|---|---|
| ground, ores, tnt, oil, chest, combo, crits, boss | **Keep** | The first ten minutes. |
| water, crystal, deep | **Keep** | Real depth: rules, not multipliers. Reached later on the road. |
| relics, relics2 | **Keep** | The build. But sites must last long enough to reach level 3 (2.5). |
| shop | **Keep** | Drop Lucky Sieve's plain "+10% coins" or leave it; it is harmless. |
| diggers, moods, foreman | **Merge** into one crew panel | Foreman's jobs become a row of buttons. Cut "Tea break" and "Clear the top". |
| museum, wing2 | **Merge** into one Museum at the camp | 2.4. Remove the +25%. |
| sites, contracts | **Merge** into the map | 2.5. The contracts board goes; the ten contracts stay as hard medals. |
| starshop | **Move** to the camp | Its perks act when a site starts. It does not need to be on the dig screen. |
| fusion | **Hide and delay**; decide after one playtest | 17 recipes need two level 3 relics in one site. In my test nothing passed level 1. If sites with a bottom do not make fusion happen about once in three sites, cut it to the six best pairs. Its book becomes a tab on the relics panel now. |
| forge | **Delay** to site 3 (Golden Wadi teaches it) | It opens in minute 2 today, on top of chests, Rafeeqs and TNT. |
| away | **Keep** | It is the best-measured part of the game and half the income. |
| autos (auto-open, auto-buy) | **Do not build yet** | Automation is the right late reward, but there is nothing tedious enough yet to automate. |
| map (several sites at once, a second crew) | **Do not build as planned** | Two digs at once splits the one picture the game has. The road map replaces it. |
| land2 (the second reset) | **Later** | It is the end of the road: the Lost City. Month 2. |

**Things I would remove outright:** the Wing as its own panel, the Recipe Book as its own panel,
the contracts board, the Foreman's panel, the Museum's +25%, the site list, and the Star curve that
pays millions. None of the *content* in them is lost.

**Size: M** for the two-screen split and the merges (page work; the rules barely change).

### 2.10 What matters more than the above

1. **The Rock fight is empty.** (*Node test.*) Twenty to thirty minutes of holding the mouse on a
   crack, no income, no choices. This is where the game is lost, more than at the reset. A Rock
   should be a fight in pieces: every tenth of its bar it sheds a row of rubble with ore and a
   barrel in it (income, and something to aim at); it changes its crack pattern at half; Rafeeqs
   sieve beside it; the bar shows who did what. **Size: M.** I would do this before any map work
   if I had to choose one thing.
2. **The game never tells you when to move.** The bot moves after 45 stalled seconds because it
   was written to. You played one long dig. The pacing was tuned for the bot. A site with a bottom
   fixes this: the game says "you finished" or "the Gate is too strong: come back with more Stars".
3. **The curve was tuned by a simulator that plays one way.** The feel study said the same of the
   old game ("built from a simulator that plays it with a fixed rule"). Keep the sim as a guard
   against broken numbers. Do not let it decide what is fun. Each package below has a thing to
   *watch in play*, not a number to hit.
4. **No all-time record anywhere.** One line under the depth, "Your record: 100 m", and a flag on
   the ruler. **Size: S.** It is the cheapest "achievement" in this whole document.
5. **Front-loading.** 62% of content on day 1. Moving the Forge, fusion and the Wing's later sets
   down the road spreads it with no new content.

---

## 3. Three directions for the whole game

### Direction A: **The Caravan Road**

*A road of sites, each with a bottom. The game deals the next stops. A crew you keep. A camp that
grows.*

**A session at minute 10.** First site, The Dunes. You broke the first Rock. The ruler shows a
flag at 50 m: "the bottom". Two Rafeeqs dig beside you and small gold numbers rise from their
blocks. You reach the second Rock. It sheds rubble as you break it and the Rafeeqs sieve it. It
falls. "The Dunes: finished in 9:40." A stamp lands on a map with one road on it. The next stop is
Powder Valley: "Barrels everywhere. 50 m. Prize: 2 Stars and the Blaster."

**Day 3.** You have eight stamps. The road forked yesterday and you took the Shark Bay side road
because the Museum's shark set opened it. Today's deal: the Black Well (125 m, always dark, prize:
the Scout) or a hard medal on Powder Valley (barrels only, prize: a gold pick skin). Your crew is
six Rafeeqs with names; Hamad is level 9. You open the camp, spend 3 Stars on "keep one relic" and
take the Boom Pick with you to try for gold time on Powder Valley.

**Week 3.** Stop 10 of 12, the Angry Layer. You have tried its Gate twice. You go back to three
earlier stops for their fast medals, which pay the Stars you need. The Museum has nine of thirteen
sets. The camp has a hall, a forge and a map table. The Lost City is two stops away and its card is
face down.

**What gets built:** sites with a bottom and a finish ceremony; the deal of three; the map; the
Rock fight in pieces; Rafeeq numbers, new default job and sieve; a kept crew; one Museum; the
two-screen split; the stopwatch medals; the palette, ruler and site skies; a new Star curve and a
re-tuned month sim.

**What gets cut:** the site list, the contracts board, the Wing panel, the Foreman panel, the
Recipe Book panel, the +25% sets, `starsAt`'s share table, the planned `map` and `autos` packages.

**Risk.** It is the largest. The month's pacing must be rebuilt around stops, not Rocks. If the
finish ceremony and the deal do not feel like a win in the first playtest, the map on top will not
save it. That is why part 4 builds the finish before the map.

### Direction B: **Deeper and Clearer**

*Keep one endless dig and today's reset. Fix what is felt.*

**A session at minute 10.** As today, but: the ruler shows where you are and where the next Rock
is. Rafeeqs show what they earn. The Rock sheds rubble. When you move, three site cards are dealt
instead of a list, each with a sky of its own.

**Day 3.** You are still working on the 100 m Rock, but the steps are smaller (the 75 m wall is 6
times, not 20), so about one move in three ends a little deeper. A line under the depth says "Your
record: 104 m". The Museum is one panel and its sets open things.

**Week 3.** 175 m. The Deep's laws are the new things. Stars are still large numbers. The loop is
the same loop, better lit.

**What gets built:** Rock fight in pieces; Rafeeq numbers and job; the record line and the ruler;
the deal of three; one Museum; the palette and skies; smaller wall steps and a re-run of the month
sim; panel merges.

**What gets cut:** the +25% sets, the Wing and Recipe Book panels, the site list.

**Risk.** It is safe and it may not be enough. It makes the wall kinder; it does not give the
player a win he can name. The answer to "again?" stays "yes, again". I would expect you to say
"better" and still not come back in week 2.

### Direction C: **The Camp**

*The game is a desert camp that grows into a town with what you bring up. Digging is how you feed
it.*

**A session at minute 10.** You dig as today. Above the ground is your camp: one tent. The first
chest becomes a chest in the tent. The first bone starts a Museum tent. Coins you bring up are
spent on the camp as well as on the pick.

**Day 3.** The camp has a souq (the shop), crew tents (one per Rafeeq, each with his name), a
Museum hall with two skeletons standing in it, a forge with smoke. Visitors walk in and pay. You
choose what to build next.

**Week 3.** A small town. A caravan leaves from it to other dig sites and comes back with goods.
Your goal is the next building and the town's rank.

**What gets built:** a camp scene with ten or more buildings and their art; a building economy; the
sites as caravan trips; everything in B.

**What gets cut:** most side panels (they become buildings).

**Risk.** The highest. It is a second game beside the first, and it is made of the thing this
project has failed at twice: screens where you press what lit up. It needs far more drawing than
anything so far. The good part of it (panels become places, a home that shows what you own) fits
inside A as a strip at the top of the screen, without an economy of its own.

---

## 4. Recommended direction, and the first three work packages

**Direction A, built so that the first two packages are also the heart of B.** If A's first
playtest does not land, you have B's best parts and have lost nothing.

The order is chosen so that each package can be played and judged by itself, and so that the
riskiest idea (a site you can *finish*) is tested second, not last.

### Package 1: **The Rock fight pays, and the Rafeeqs show their work** (M)

- The Rock sheds a row of rubble at every tenth of its bar: ore, a barrel, sometimes a chest.
- Rafeeqs: gold numbers over their blocks; "Rafeeqs: N a second (X%)" under the purse; default job
  "beside me and below"; half the crew sieves at a Rock.
- The Rock's bar in two colours (you, crew), with "your hit / hits left" under it.
- "Your record: N m" under the depth.
- The number format fixed (bug 6.1), and Stars printed through it (6.2).
- Touches: `boss`, `diggers`, `foreman`, the core's `fmt`. No save change beyond one new field for
  the record.

*Watch for in the test:* Does he keep his hand on the mouse at the Rock, and does he look at the
Rafeeqs' number? Does he say anything like "they got that one"? If he still says "I help them more
than they help me" after seeing the number, the role is wrong and the specialists (2.3 B) move up.

### Package 2: **A site has a bottom, and the next one is dealt** (M)

- Each site gets a `floor` (50 m for the first two, 75 m for the next two). Its last Rock is the
  Gate. Breaking it: a full ceremony, "finished in M:SS", the prize, a stamp.
- The first four sites come in a fixed order. After that the game deals three cards: place, rule,
  depth, prize.
- Stars come from finishing and from medals, in small whole numbers. Digging below the Gate still
  pays, slowly.
- The stopwatch and the bronze, silver, gold time medal.
- A plain list of stamped sites stands in for the map (the picture comes in package 3).
- Touches: `sites`, `contracts` (its ten rules become cards), `starshop` (prices in the new Star
  scale), the core's Star curve, `sim/proto` (the bot must learn "finish, then pick a card"),
  `docs/dig-pacing.md` (new targets: stops per day, not Rocks per week).

*Watch for in the test:* the three signs from `redesign-v3.md` §4.6. At the first finish, does he
lean in? When the cards are dealt, does he read them and say why he picks one ("this time I
will...")? Does he try a finished site again for a better time without being asked? If the finish
feels like "again?", stop here and fall back to direction B: nothing built so far is wasted.

### Package 3: **The road, the camp and the look** (M)

- The map: the road as a picture, stamps and medals on it, the fork ahead, side roads from Museum
  sets.
- The camp strip at the top of the screen: tent, crew tents, Museum hall, forge, map table. The
  Museum (merged with the Wing, no +25%), the Star Shop and the Recipe Book open from it and leave
  the dig screen.
- The palette of 2.8: layer colours, six site skies and tints, the depth ruler.
- The Forge moved to site 3; fusion's book folded into the relics panel.
- Touches: page side almost only (`sites/ui`, `museum`, `wing2`, `starshop/ui`, `fusion/ui`,
  `ground`, `ui/render`).

*Watch for in the test:* Can he say where he is and what he is working towards without reading?
Does a new site *look* like a new place in the first two seconds? Does he open the Museum to see
what a set will give?

**After these three:** the kept crew with names and levels; the three kinds of Rafeeq; sprint
cards; the Lost City and the second land.

---

## 5. Decisions for the owner

Each has my default. If you say nothing, the default is used.

1. **Direction.** A (the Caravan Road), B (Deeper and Clearer) or C (the Camp).
   **Default: A, built in the order of part 4**, with B as the fallback after package 2.
2. **Does a site have a bottom?** This is the heart of A. It changes "dig for ever" into "finish
   this place". **Default: yes**, with the endless dig kept below the Gate.
3. **Who chooses the next site?** The game alone, or the game deals and you pick.
   **Default: the first four in a fixed order, then the game deals three and you pick one.**
4. **Timed runs.** **Default: a stopwatch and time medals on every site now; countdown sprints
   later as a rare card; no daily dig.** Nothing ever expires.
5. **Broken builds.** **Default: let them run inside a site** (rule: width is free, depth is
   earned). No more per-relic caps unless something passes a Gate.
6. **Stars.** Keep them as a multiplier that reaches millions, or make them small whole numbers
   you spend on perks. **Default: small numbers**, with a small permanent bonus kept.
7. **The Museum's +25%.** **Default: remove it.** Every set opens a thing, and the two museums
   become one.
8. **Rafeeqs across sites.** Hired again each site (today), or a crew you keep with names and
   levels. **Default: kept**, built after package 3.
9. **Fusion.** **Default: hide it until two relics are at level 3, and decide after the package 2
   playtest** whether to keep 17 recipes or cut to six.
10. **Not building `map` (several sites at once) and `autos`.** **Default: do not build them.** The
    road replaces the first; the second waits until something is tedious enough to automate.
11. **The long-term goal's name.** **Default: "the Lost City"** at the end of "the Caravan Road".
    If you have a better Gulf name a seven year old knows, it goes here.
12. **Colours.** The table in 2.8 changes the look of six layers. **Default: apply it in
    package 3**; say if you want to see two layers as a sample first.

---

## 6. Bugs found on the way

Separate from design. None was fixed.

1. **Big numbers print as a raw float with a suffix.** `fmt` in `proto/core/strings.js` knows six
   suffixes, up to Qi (10^18). From 10^21 it prints "1000Qi", "10000Qi" and so on. From 10^39 it
   prints things like `4.300000000000001e+37Qi`, because JavaScript's `toFixed` switches to
   exponent form at 10^21. Checked by calling `G.fmt(4.3e55)`. Your number was about 4.3 x 10^55
   coins. On today's curve an honest player may reach 10^21 inside the month (my estimate, not measured). Above about 10^308
   the purse would print "0". **Fix:** more suffixes or scientific notation after Qi. Small.
2. **Stars are printed without any format.** The Stars chip and the "Move: +N Stars" button print
   the raw number (`sites/ui.js`). The month sim reaches 205 million to 8.6 trillion Stars.
3. **The Forge opens at about 2.4 minutes.** The pacing target is 12 to 45 minutes. The month sim
   reports it as a miss. Known in `docs/dig-pacing.md` (6.5); still true.
4. **The Recipe Book panel appears when you hold two relics** (`fusion/ui.js`, `when`), around
   minute 3. A fusion needs two relics at level 3.
5. **The Rafeeqs' income is computed and never shown** (`s.crewCps` in `diggers/rules.js` has no
   reader on the page side).
6. **The month sim fails its own check on `main` today** (4 misses): the active player breaks the
   100 m Rock on day 5 (target day 1.5 to 4), the 125 m Rock on day 11 (target 4 to 8), the 175 m
   Rock on day 24 (target 11 to 18); the mixed player has a 3.8 minute stretch with nothing new in
   the first half hour (limit 2.5).
7. **`docs/dig-pacing.md` is out of date in two places.** Section 5 says the dig runs to 12,900 m
   on `main`: no longer true since the Rock was sealed. Section 6 point 2 says Stars are not paid by
   the curve: they are now (`starsFor` calls `starsAt`).
8. **`proto/README.md` says "Fourteen features are built".** Twenty-five are registered.
9. **Not checked again:** `docs/dig-pacing.md` 6.4 (time away can carry a fresh dig to a deep Rock
   where the player may neither move nor win). I did not test whether it still happens.
10. **No all-time depth record is stored for the page** (`s.best` is per site). `wingDeep` and
    `starBoss` hold something close for their own use. This is a gap more than a bug; package 1
    needs it.
