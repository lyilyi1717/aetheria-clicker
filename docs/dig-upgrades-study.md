# Dig: a study of upgrades and the permanent layer

For the owner. This is a study and a recommendation. No game file was changed.

Your question was: "talents look useless in general, no actual damage progression happens there.
Is it part of a bigger story?"

How to read the evidence in this document:

- **Code** = I read the rule in `proto/`. This is certain.
- **Sim** = one scripted player (the "mixed" player of `sim/proto/player.mjs`, seed 1, 42 New Sites,
  about 7 days), with a probe that wrote down his numbers before every New Site. One seed only.
  It is a robot: it buys the cheapest thing at once and aims worse than you.
- **Play** = nothing. I had no browser. I did not see the page. What the page shows I took from
  the strings and the page code.

Words: nothing in the game is called "talent". I use your word for the permanent things: the
**Star Shop** (eleven perks) and the bonus each Star gives. "Upgrades per map" = the **Shop**
(coins, starts over at every New Site). One correction to how the question was put to me: the
**Forge is not per map**. Metal and tools are kept for ever (`forge/rules.js`: `survives: ['site', 'land']`).

---

## 1. The answer in ten lines

1. **You are right about what you feel, and wrong about the numbers.** Stars do make your hit
   stronger: at New Site 20 your hit is x15 from Stars. But it comes as +7% per New Site, it is
   never shown, and nothing you *buy* with Stars is strength. So it feels like nothing.
2. **Is it part of a bigger story? No. Not today.** There are four permanent systems (Star Shop,
   Forge, contract prizes, Museum). They were built side by side. Each gives small conveniences.
   None of them is "your pick got stronger". The same perk exists two or three times.
3. **The pick is not the hero.** In the sim your own pick does 1 to 23% of the damage to the
   ground. Blasts and chains do 19 to 99%. Their strength comes from the ground, not from your
   pick. This is why "my pick was never strong enough but bombs went out of control".
4. **Two currencies die on day 1.** The Star Shop is sold out at 44 Stars (about New Site 8). The
   Forge is sold out at 1,550 metal (about minute 45). After that Stars and metal pile up.
5. **The per-map Shop is a reflex.** Two of its four items are full after three minutes. The
   other two are the same button twice (x1.25 for x1.5).
6. **The cure is one sentence: the pick is the base of everything.** One number, "Your hit", always
   on screen. Everything that breaks ground is counted in your hits.
7. **Permanent layer:** replace the flat Star bonus and the perk list with **three tracks** you
   spend Stars on: **The Pick** (your hit, x1.5 a step, a new material every 4 steps), **The Camp**
   (Rafeeqs), **The Bag** (coins and chests). The eleven perks you have become steps on the tracks.
8. **A stronger pick must be seen in the first minute.** Today it cannot: a block always costs one
   swing. New rule, **Punch-through**: strength left over after a block breaks goes into the block below.
9. **Per map:** Stronger Pick gets a milestone every 10 levels (x1.5 and a chest). Rafeeq Training
   is folded into the pick. One button buys up to the next milestone.
10. **Three packages, in order:** (1) the Pick track and what is shown, (2) everything counts in
    hits, (3) the Shop with milestones. Each can be play-tested alone.

---

## 2. The power table

### 2.1 Where the numbers are from

Sim, seed 1, mixed player (four 12 minute sessions a day). "Run 5" = the dig that ended with the
fifth New Site. Minute 10 is from the same seed with the twelve paired relics off (on `main` this
seed moved at minute 10 exactly).

| | minute 10 | end of run 1 | end of run 5 | end of run 20 |
|---|---|---|---|---|
| When | 10 min | 10 to 14 min | 35 min | day 2.6 |
| Depth reached | 68 m | 71 to 75 m | 75 m | 100 m |
| Stars he had during the run | 0 | 0 | 20 | 142 |
| Pick level in the Shop | 21 | 24 | 32 | 44 |
| **Your hit** | **108** | **212** | **3,780** | **280,000** |
| of which the Shop (this map) | x108 | x212 | x1,260 | x18,400 |
| of which Stars (for ever) | x1 | x1 | x3.0 | x15.2 |
| Coin bonus, all sources | x2.2 | x2.4 | x26 | x154 |
| of which Stars | x1 | x1 | x5 | x29 |

Who broke the **ground** (share of damage done to blocks, sim):

| | minute 10 | run 1 | run 5 | run 20 |
|---|---|---|---|---|
| Your pick, direct | 8% | 8% | 23% | 7% |
| Blasts, chains, relic spill | 42% | 21% | 22% | 80% |
| Forge tools | 28% | 45% | 4% | 0% |
| Rafeeqs | 22% | 26% | 51% | 13% |

Who broke the **Big Rock** (sim, runs 1 to 20): Rafeeqs 52 to 97%, your pick 2 to 40%, blasts 0 to 15%.
(Eight Rafeeqs hit 32 times a second. You hit about 5 times a second.)

### 2.2 Every source of power

"Per map" = starts over at a New Site. "For ever" = kept.

**Your hit**

| Source | Where, paid with | Kept? | Curve | What it is worth |
|---|---|---|---|---|
| Stronger Pick | Shop, coins | per map | price x1.5, hit x1.25, no end | Nearly all of your hit: x212 in run 1, x18,400 in run 20 |
| Star bonus | automatic, +10% hits per Star ever earned | for ever | a straight line | x3.0 at 20 Stars, x15.2 at 142 Stars |
| Warm Pick | Star Shop, 3 then 6 Stars | for ever | start at 50%, then 70% of your best pick level | A head start. The map ends at the same Rock |
| Big hits | built in; Lucky and Heavy relics | per map | 8% of hits x5 (average x1.3); full relics: 29% x14 | x1.3 to x2 in most runs |
| Oil rush | found | a moment | x3 for 8 seconds | small |
| The crack | aim | skill | x3 on the Big Rock | large for a player who aims |
| Boom, Long, Wide, Echo | chest | per map | 3 hits around; 50 to 100% below; 30 to 70% beside | Scale with your hit. Good |
| TNT, crystal, Dynamite, Drill, fusion bombs | found, chest, Forge | mixed | **by the ground**: TNT = 7 dirt blocks of its row, crystal 4, Dynamite 12, the Drill breaks any block | Most of the ground. Does not grow with your pick |
| Flying Rocks, Landslide, Fire | chest | per map | capped at 4 of your hits; fire 0.5 hit | Tied to the pick already |
| Forge tools | Forge, metal | for ever | 3 levels each, price x5 a level, 1,550 metal for all | All bought by run 6 (minute 43) |

**Rafeeqs**

| Source | Where, paid with | Kept? | Curve | What it is worth |
|---|---|---|---|---|
| Hire a Rafeeq | Shop, coins | per map | price x4.2, at most 8 | Full (8) from run 2 on |
| Rafeeq Training | Shop, coins | per map | price x1.5, hit x1.25: the pick's twin | Level 23 to 43, always within 1 of the pick |
| Star bonus | automatic | for ever | +10% per Star, same as yours | x15 at run 20 |
| Rafeeq Waiting | Star Shop, 1 / 2 / 3 Stars | for ever | 1 to 3 Rafeeqs at the start | Saves the first minute |
| Rock Friend | Star Shop, 4 Stars | for ever | away: they pass Rocks you beat before | Strong for idle play |
| Karak Tea, Faz'a, Borrowed Pick | chest | per map | +50% speed a level; they come to your block | medium |
| Foreman jobs | arrives at 7 Rafeeqs or Rock 3 | for ever | five jobs | a choice, no number |

**Coins**

| Source | Where, paid with | Kept? | Curve | What it is worth |
|---|---|---|---|---|
| Depth | dig | per map | each metre pays x1.10 | the base |
| Ore | found | per map | x6, x16, x45, x160 | large |
| Lucky Sieve | Shop, coins | per map | price x1.7, +10% each, at most 20 | x3, full three minutes into a map |
| Star bonus | automatic | for ever | +20% per Star | x5 at run 5, x29 at run 20 |
| Museum sets | bones | for ever | +25% a set, 3 sets | x1.75, done at about minute 30. Then nothing |
| Combo | play | a moment | up to x3 for your own breaks | hand only |
| Shiny Eye | chest | per map | ore +40% a level | medium |
| Time away | Rafeeqs | | row by row, 12 hours at most | 40 to 90% of all coins after day 1 |

### 2.3 What the table shows

1. **Per map, your damage is one button.** Stronger Pick, 24 to 55 levels a map. Everything else
   is small beside it.
2. **Across maps, your damage is one hidden line.** +10% hits per Star. At run 20 it is x15. And
   Stars also pay coins, which buy about eight more pick levels. Together, Stars carry your dig
   over a wall about 100 times higher. Without them the fourth Big Rock would never break.
   So the progression exists.
3. **But you cannot feel it. Six reasons.**
   - It arrives in crumbs. Runs 6 to 20 all end at the same Rock (100 m) and each pays 8 Stars.
     At run 20 that is +7% hit. A pick level is +25% and you buy one every few seconds.
   - It is not shown. The only text is one line on the New Site card: "Each Star: coins +20%,
     hits +10%, for ever." No total. No "your hit was 12, now it is 13".
   - You end every map at the same pick level (42 in runs 6 to 15) and the same Rock. Nothing
     you see says "stronger than last time".
   - What you *buy* with Stars is not strength. Ten of the eleven perks are head starts and
     conveniences. The one strong perk (Warm Pick) reads like a convenience too.
   - Strength above "one swing per block" is invisible. With a hit of 100 or of 1,000,000 the top
     50 metres take the same time: one swing a block.
   - Most of the ground is not broken by your hit at all. See the next point.
4. **The pick is not the hero.** Blasts and chains do 19 to 99% of the ground damage, and their
   strength is the ground's own hardness. So a stronger pick does not make them stronger, and
   they do not need a strong pick. Your sentence, in numbers.
5. **At the Rock the Rafeeqs do more than you** (sim: 52 to 97%). The robot aims badly, so for
   you the share is lower. But the wall of the whole game is not mainly a test of your pick.

---

## 3. The questions

### Q1. Where does damage progression come from? Is he right?

**Today.** Section 2. Per map: the Stronger Pick button. Across maps: the flat Star bonus, real
but hidden and thin. He is right about the feeling. The Star Shop gives no strength he can see.

| Option | Pro | Con |
|---|---|---|
| A. Only show it (a hit number, a line at the New Site) | Small. No risk to pace | Shows "+7%". That may feel worse |
| B. Make it a thing you buy, in big steps | Each step is felt and named | Needs a new Star curve in the sim |
| C. Leave Stars, add a second strength system | No change to the curve | A fifth permanent menu |

**Recommendation: B, with A inside it.** Size M. Replaces: the flat bonus and the Star Shop list.

### Q2. The per-map Shop

**Today (code and sim).**

| Item | Price | Effect | In the sim |
|---|---|---|---|
| Stronger Pick | 10, x1.5 a level | hit x1.25 | 24 to 55 levels a map |
| Rafeeq Training | 12, x1.5 a level | Rafeeq hit x1.25 | the same level as the pick, always |
| Hire a Rafeeq | 30, x4.2 each, 8 at most | one more Rafeeq | full from run 2 |
| Lucky Sieve | 120, x1.7, 20 at most | +10% coins | full from run 2 to 4 |

It is a reflex. The robot buys the cheapest thing and loses nothing by it. From run 4 on, the
Shop is two buttons with the same curve, pressed about 100 times a map. (The plan already holds an
"auto-buy" prize. A shop you want to automate is a chore.)

**What good per-run shops do.** A milestone every N levels, shown on the button ("3 more: x2").
A choice between milestones when coins are short. Items that answer different questions. A way
to buy many levels with one press. Something that ties the shop to the build (here: relics).

| Option | Pro | Con |
|---|---|---|
| A. Keep four items, add milestones and "buy to the next milestone" | Small. Keeps what works in minute 1 | Late in a map it is still a held button |
| B. Branching: at each milestone choose 1 of 2 skills | Real choices | A second draft next to the chests: two systems, one job |
| C. Remove the Shop, coins buy chests only | Very simple | Loses the best 15 seconds of the game (the first Stronger Pick) |

**Recommendation: A.** Size M. Replaces: the plain level lists.

- **Stronger Pick stays.** Each level x1.2 (was x1.25). **Every 10th level: x1.5 more, and a chest.**
  Ten levels are worth x9.3, the same as today, so the curve does not move. The button shows
  the way to the next one: "4 more: x1.5 and a chest". This is the "next big thing", and it ties
  the Shop to relics.
- **Rafeeq Training goes into the pick.** A Rafeeq hits for a share of your hit. The twin button
  is not depth. It is the same decision asked twice.
- **Hire a Rafeeq stays** (8 at most). What a Rafeeq is for is the other study's subject. I
  assume they stay the idle half of the game.
- **Lucky Sieve: 4 big levels, not 20 small ones.** Each has a thing you see: (1) coins x1.5,
  (2) ore pays double, (3) spare bones pay double, (4) the Big Rock pays double.
- **One "site special" in each site's Shop** (the fourth slot): Powder Valley sells a longer
  fuse (TNT +2 hits a level), Golden Wadi an ore cart (ore gives +1 metal), Valley of Beasts a
  brush (bones break in one hit). This is "upgrades per map" in the plain sense. It waits for the
  other study's answer on maps.
- **One press buys up to the next milestone** (hold the button).

### Q3. The permanent layer ("talents")

**Today.** Eleven perks, 44 Stars for all of them. Sold out at about New Site 8, on day 1 (sim).
After that the player earns 8, then 209, then 6,000 Stars a move and can buy nothing.

**The shapes that work, in Dig.**

| Shape | In Dig | Makes the hit visibly stronger? | Pacing | Risk |
|---|---|---|---|---|
| A. Talent tree, branches, capstones | A tree of 30 nodes | Yes, if the trunk is strength | The sim needs a "best path" | A big screen. Many nodes become "+5%" |
| B. A few deep tracks with ranks | Pick, Camp, Bag: three rows | Yes: the Pick row is only that | Easy: three numbers, like today's bonus | Can be a reflex if one row always wins |
| C. A class picked per run | "Miner, Bomber, Boss" at each New Site | No. It gives variety, not growth | None | Does the job the sites already do |
| D. Prestige currency: numbers and rules | Today, but the number half is automatic | No (that is the complaint) | Today's | Today's |
| E. Equipment that persists | The Forge already is this | Only if the pick is forged too | Metal comes from ore, not from resets: resets stop mattering | Ore-growing relics would print strength |

**Recommendation: B, with capstones taken from A.** Three rows. You see the next steps of each.
Half the steps bring a rule, not a number. Size M to L. Replaces: the Star Shop list and the flat
bonus. Nothing you own is lost: every perk of today is a step on a row.

Why not a tree: three rows a child can read. A tree needs a screen of its own and thirty things to
balance. The rows keep the two things a tree is good for: a visible road and a big prize at the end.

Why it is not a menu of +X%: a step is x1.5, not +10%, so the number on screen jumps. Every
material changes how the pick looks. Every second or fourth step changes a rule. And there are
three buttons to choose from, not eleven.

The full list is in section 4.2.

### Q4. "Is it part of a bigger story?"

**No. Not today.** Here is what the systems are, said plainly.

- **Four permanent menus, four currencies, one job.** Star Shop (Stars), Forge (metal), contract
  prizes (wins), Museum Wing prizes (sets). Each hands out small bends of the rules. None is "you
  are stronger".
- **The same perk, several times.**
  - TNT shows through the dark: Star Shop "Boom Eyes" *and* the prize of the contract "In the Dark".
  - Chests show 4 cards: Star Shop "Wide Hands", the Museum relic "Pearl Eye", and the prize of
    "One Relic Only" (first chest).
  - A head start: Rafeeq Waiting, Warm Pick, Pocket Chest, Treasure Map, and the prize of
    "Rising Sand" (2 m already dug). Five.
- **Dead ends.**
  - Museum: 3 sets, +75% coins, done at about minute 30 (sim). Beside a Star bonus of x29 it is nothing.
  - Star Shop: sold out on day 1.
  - Forge: sold out at minute 43. Metal was 23,000 on day 7 with nothing to buy.
  - Contracts pay 2, 3 or 5 Stars. They open after 14 New Sites, when a move pays 8 to 209.
- **Two systems doing one job.** Stronger Pick and Rafeeq Training. Chest drafts and Forge tools
  both give "a blast" and "pull the ore". Sites and contracts both give "a map with a rule".
- **The real engine is hidden.** Depth is gated by the Big Rock. The Rock falls to Stars. Stars
  arrive as an invisible +10%.

**The story it should be.** One hero: the pick. One sentence a child can say: "My pick gets
stronger. Then I can go deeper."

| When | Who you are | What carries this stretch |
|---|---|---|
| Day 1, first map | A boy with a wooden pick. | The Shop (milestones) and the first chests |
| Day 1 to 3 | Your pick is stone, then copper. Rafeeqs wait for you. | Stars spent on the three tracks: one step at nearly every New Site. Forge tools |
| Week 1 | A bronze pick and a build you like. Rock 4 falls. | Relic builds (the shape of your hit), the Foreman, the first fusions |
| Week 2 | An iron or steel pick. You choose: strong hand or strong camp. | The tracks, deeper. Contracts for rule prizes. The Deep's laws |
| Week 4 | A gold pick. You fall through the first 25 m in a few swings. | Track capstones, the Recipe Book, the Museum Wing (new sites, new relic families) |

**The power map (one page).** Each currency has one job. Each system has one line.

```
YOUR HIT  =  the Pick you keep   x  Stronger Pick      x  the moment
             (Stars, for ever)      (coins, this map)     (big hit, oil, the crack)

Everything that breaks ground is counted in YOUR HITS:
   TNT 8 hits      Boom Pick 3 hits      Drill 6 hits      a Rafeeq: a share of one hit

COINS   this map       the Shop: how strong, right now
CHESTS  this map       relics: the SHAPE of your hit (wide, deep, jumping, burning)
STARS   for ever       three tracks: The Pick (how hard), The Camp (who helps), The Bag (what you find)
METAL   for ever       the Forge: tools, your buttons
BONES   for ever       the Museum: new places and new relic families. No numbers
CONTRACTS              prizes that change a rule. No strength
```

Size: the map itself is a document. Making the game match it is the three packages of section 5.

### Q5. Chest upgrades versus the pick

**Today (code).** Two kinds of effect live side by side.

- Counted in your hits: Boom Pick (3 hits), Long Pick, Wide Swing, Echo, Fire (half a hit),
  Flying Rocks and Landslide (4 hits at most), the Derrick (1.5 hits, but never less than 20% of a
  dirt block).
- Counted in the ground's hardness: TNT (7 dirt blocks of its row), crystal (4), Dynamite (12),
  the two fusion bombs (the broken block's own strength), the Drill (breaks any five blocks).

The second kind is why bombs "went out of control" while the pick felt weak. A barrel at 100 m is
as strong as the ground at 100 m whatever your pick is. `proto/README.md` already says such things
"must scale with the pick's strength". The Big Rock is protected (a blast counts as 12 of your
hits at most). The ground is not.

| Option | Pro | Con |
|---|---|---|
| A. Everything in hits | One rule. The pick is the base. Bombs become multipliers of the pick | Deep TNT is weaker. The curve must be fitted again |
| B. Keep it, cap each effect ("at most N hits") | Small change | Two units stay. The cap is hit all the time, so it is A with more words |
| C. Keep it, nerf TNT | Tiny | Does not fix it. The next relic breaks it again |

**Recommendation: A.** Size M. Replaces: the ground-based numbers, one param each.

**The scaling rule.** One hit = what one swing of your pick does now (pick level, pick material,
oil rush; not a big hit). Every effect has a size in hits and a shape. A relic level changes the
shape or the count of hits. Nothing reads the ground's hardness.

| Thing | Today | Proposed |
|---|---|---|
| TNT | 7 dirt blocks of its row | 8 hits to each block around it. Big Bang: 12, then 16 |
| Crystal line | 4 dirt blocks | 4 hits |
| Dynamite | 12 dirt blocks | 14 hits (its number against the Rock today) |
| Drill | breaks 5 blocks outright | 6 hits a block (its number against the Rock today) |
| Fusion bombs | the block's own strength | 4 hits |
| Derrick | 1.5 hits, at least 20% of a dirt block | 1.5 hits |
| Barrel sets off barrel, ore vein pops | at once | unchanged: they are triggers, and small |
| Feed the Rock prize | 0.3% of the Rock per copper | 2 hits per copper, 4 silver, 8 gold, 16 gem |

**What it does to builds.** A bomb build is still the fastest way through ground you can nearly
break: one swing becomes 60 hits. It stops being a way through ground you cannot break. So the
first thing a bomb build wants is a stronger pick, and Stronger Pick is always worth buying. A
relic card can say its size ("8 hits around"), so you can compare cards.

**What it does to the game.** The ground between two Rocks becomes a wall too. Today a dig runs
free to the next Rock and stops there, so 15 moves in a row end at the same metre. With this rule
a dig stops where your strength ends, a few metres deeper each time. That is the missing "sense of
achievement beyond 100 m".

The wider review studies runaway bomb builds too. If it chooses another cap, the unit "hits" should
still be the one measure for both.

### Q6. Currencies

| Currency | Wanted at every stage? | Evidence | Fix |
|---|---|---|---|
| Coins | Yes inside a map. But two of four sinks are full in 3 minutes | sim | Milestones (Q2) |
| Stars | No. Nothing to buy after 44 Stars (day 1) | code, sim | The three tracks: no end |
| Metal | No. Nothing to buy after 1,550 (minute 43). 23,000 unused on day 7 | code, sim | Tools get more levels, counted in hits (below) |
| Bones | First Museum: no (done at about minute 30). The Wing: yes, 10 sets | sim, code | The other study's subject. In the power map the Museum gives places and things, not +25% |
| Contract wins | Prizes yes. Their Stars (2, 3, 5) no | code | Pay a share of a normal move's Stars |

**Merge any? No.** Four currencies, four jobs, is clear enough. The fault is missing sinks.

Metal sink, size S to M: after level 3 a tool can be **tempered**, without end: Drill +1 hit a
block, Dynamite +2 hits, Magnet +1 block of reach. Price x1.6 a step. It only works once tools
are counted in hits (Q5), so it follows that package.

### Q7. What to show

Today the page shows your hit in two places only: the small white number that flies off a block,
and the Stronger Pick line ("Your hit: 108 → 135"). Stars are a count beside a star.

**The minimum set (four things).** Size S to M. Replaces nothing.

1. **A hit chip, always on screen**, beside the coins: the pick (drawn in its material) and
   "Hit 31". It bumps when it changes.
2. **One line on the New Site card and on the first screen of the new site:**
   "Your pick: Stone II → Stone III. Your first hit: 2.2 → 3.4."
3. **Hits left on the Big Rock.** On the Rock's bar: "about 800 of your hits". It falls when you
   buy a pick level, so you see strength against the wall. On the New Site card: "Last time: 38%
   of this Rock."
4. **A record flag in the ground** at the deepest metre you ever reached. Passing it is a small
   party. It makes "deeper than ever" a moment. It works best after the hits rule (Q5).

Not needed: a damage-per-second readout. It jumps around with blasts and says nothing a child reads.

### Q8. What else matters more

1. **Strength above one swing a block is invisible.** This matters most. Whatever the permanent
   layer gives, you cannot see it in the top of a new map, because each block still costs a swing.
   **Punch-through** fixes it: when your hit breaks a block, the strength left over goes into the
   block below, then the next. With a hit of 58 and three blocks of reach, the first 25 m of one
   column take 13 swings, not 28 (formula). Your permanent pick is felt in the first ten seconds
   of every map.
2. **Fifteen moves at the same Rock.** Runs 6 to 20 all ended at 100 m. No upgrade screen can
   make that feel like growth. The hits rule (Q5) and the record flag are the cure.
3. **The Rock is mostly the Rafeeqs' fight** (sim). If the pick is the hero, the crack should be
   worth more or the Rafeeqs less at the Rock. The other study decides what Rafeeqs are for.
4. **About 100 presses a map on two buttons.** Hold to buy to the next milestone.

---

## 4. The recommended design in full

### 4.1 Per map: the Shop

| Slot | What | Milestones |
|---|---|---|
| Stronger Pick | hit x1.2 a level, price x1.5 | every 10th level: x1.5 more and a chest. The button shows how far it is |
| Hire a Rafeeq | 8 at most. A Rafeeq hits for a share of your hit | as today (the wider review decides) |
| Lucky Sieve | 4 levels | coins x1.5; ore double; spare bones double; Big Rock double |
| Site special | one item that only this site sells | the site's own |

Rafeeq Training is gone as a button. Hold a button to buy up to its next milestone.

### 4.2 For ever: three tracks

Stars are spent, not counted. A Star you have not spent gives nothing. Each track is a row of
steps, bought in order. You choose the track. The next three steps of each row are shown in grey.

**Numbers.** A step is x1.5. The first step of a track costs 2 Stars and each next step costs
x1.5 more: 2, 3, 5, 7, 10, 15, 23, 34, 51, 77, 115, 173, 259, ... A rule that sits on a step
comes with it at no extra price.

**Track 1: The Pick.** Each step: your hit x1.5, for ever. Every 4th step is a new material. The
pick on screen, the pointer and the hit chip change. Three marks on the handle count the steps between.

| # | Step | Material | The rule that comes with it |
|---|---|---|---|
| 1 | Stone Pick | stone | **Punch-through**: strength left over goes into the block below |
| 5 | Copper Pick | copper | **Warm Pick**: a new site starts at half your best pick level (a perk of today) |
| 9 | Bronze Pick | bronze | Punch-through reaches 2 blocks |
| 13 | Iron Pick | iron | Warm Pick starts at 70% (today's level 2) |
| 17 | Steel Pick | steel | **Crack Finder**: the Big Rock's crack moves half as often |
| 21 | Silver Pick | silver | Punch-through reaches 3 blocks |
| 25 | Gold Pick | gold | **Heavy Hand**: a big hit also strikes left and right |
| 29 | Crystal Pick | crystal | Punch-through has no limit (the Big Rock still stops it) |
| 33 | Sky-Iron Pick | meteor iron | **Old Friend**: the first Big Rock of a site is already cracked in half |
| 37 | Star Pick | a star | Capstone, **Falling Star**: your first swing at a new site falls to the first Big Rock |

After step 40 the Star Pick goes on without end ("Star Pick +1").

**Track 2: The Camp** (Rafeeqs). Each step: Rafeeq hits x1.5, for ever.

| # | Step | The rule that comes with it |
|---|---|---|
| 1 | Rafeeq Waiting | one Rafeeq is digging when you arrive (today's perk) |
| 2 | Two Waiting | two (today's level 2) |
| 3 | Three Waiting | three (today's level 3) |
| 5 | Rock Friend | away, they walk past Rocks you have broken before (today's perk) |
| 7 | Good Shoes | Rafeeqs walk twice as fast |
| 9 | Second Kettle | the Foreman's tea break gives its rush with no sitting |
| 12 | Capstone: The Whole Camp | all eight Rafeeqs are waiting when you arrive |

**Track 3: The Bag** (coins and chests). Each step: coins x1.5, for ever.

| # | Step | The rule that comes with it |
|---|---|---|
| 1 | Treasure Map | the first chest of a site is close to the top (today's perk) |
| 2 | Bone Whistle | a bone close to the top (today's) |
| 3 | Oil Sniffer | an oil well close to the top (today's) |
| 4 | Lucky Pocket | one relic crosses the move at level 1 (today's) |
| 5 | Pocket Chest | a chest in your pocket at each site (today's) |
| 6 | Shake the Chest | one free re-roll a site (today's) |
| 7 | Deep Pocket | the kept relic keeps level 2 (today's level 2) |
| 8 | Wide Hands | chests show 4 cards (today's) |
| 9 | Boom Eyes | TNT glows in the dark (today's) |
| 10 | Two Pocket Chests | (today's level 2) |
| 11 | Deepest Pocket | the kept relic keeps level 3 (today's level 3) |
| 14 | Capstone: Second Pocket | a second relic crosses the move |

That is 29 named steps. All eleven perks of today are in it, with every level they have.

**The choice.** Each New Site: Pick, Camp or Bag. A player who clicks buys Pick. A player who is
away buys Camp. Everybody needs some Bag, because coins buy pick levels. By the formula, spending
evenly is stronger than putting everything in one row, so no row is a trap and no row is the only answer.

**The first three purchases.** The first New Site pays 5 Stars: enough for the first two. The
second pays 5 more: the third, and Stone Pick II.

| # | Buy | Stars | What you feel in the first minute of the next map |
|---|---|---|---|
| 1 | Stone Pick | 2 | The pick is grey stone. Hit 1 → 1.5. The first ten rows of a column take 57 swings, not 80. A broken block cracks the one below |
| 2 | Treasure Map (Bag) | 2 | A chest three blocks down: a relic in the first ten seconds. All coins x1.5 |
| 3 | Rafeeq Waiting (Camp) | 2 | Somebody is already digging beside you when you arrive |

Stone Pick II (3 Stars), also after the second move: hit 2.25, and the first block breaks in one
swing (it has 2 hp). Ten rows: 40 swings.

### 4.3 The scaling rule

As in Q5. One unit, the hit. Every relic, tool and block that breaks ground says its size in hits.

### 4.4 What is shown

As in Q7: the hit chip, the New Site line, hits left on the Rock, the record flag. Also: relic and
tool cards give their size in hits.

### 4.5 How the pacing curve must change (`docs/dig-pacing.md`)

The curve stands on `starLift(S)`: how many times higher a wall S Stars carry a dig over. Today:
`(1 + 0.1 S) x (1 + 0.2 S)^0.55`.

**For the tracks (package 1).**

- `sites.starPick` and `sites.starCoin` become 0. The strength comes from the tracks.
- New numbers: `tracks.step` 1.5, `tracks.cost0` 2, `tracks.costGrow` 1.5, `tracks.perMaterial` 4.
- `starLift(S)` becomes the lift of a player who spends evenly. The total price of k steps is
  about `4 x (1.5^k - 1)`, so a track with C Stars in it gives about `1 + C / 4`. With a third of
  the Stars in each row: `starLift(S) = (1 + S / 12)^1.55`.
- That is about half of today's lift for the same Stars (58 against 109 at 153 Stars). **It does
  not move the days.** A move pays a *share* of the Stars it takes to stand where the dig stopped,
  so when a Star is worth less, every move pays more Stars and a layer still costs about
  `0.5 / share` moves. Only the size of the Star numbers changes.
- Check after the change, in this order: the first three moves (they pay the plain count, 3 to 8
  Stars, not a share: `cost0` must let 5 Stars buy two things); then `core.starWall`; then `core.grow[i].share`.
- The scripted player needs a `bot` step for the tracks: buy the cheapest step. That is the even
  spend the formula assumes.
- Punch-through only acts on ground you break with strength to spare. It makes the top of a map
  quicker and leaves every wall where it is. Expect each run about a minute shorter.

**For the hits rule (package 2).**

- New numbers in hits replace `tnt.power`, `crystal.power`, `forge.dynPower`, the Drill's pop,
  `fusion.bombDmg`, the Derrick's floor in `wing2`, `contracts.feedBend`.
- The ground inside a layer becomes a wall. Runs will end between Rocks. The model already counts
  that ground (`wallAt` grows with every metre), but until now blasts paid for it. Expect every
  step of the ladder to come later. Then fit again:
  - `core.grow[i].step`, the jump at a Rock: down, from x8 to about x4 in the Deep. The Rock
    should be a fight, not the only wall.
  - `core.grow[i].share`: up, from 0.03 to about 0.05, for 8 to 10 moves a layer, not 15 to 20.
    Each move then ends deeper than the last.
  - `forge.swingFuel` (tool charges at a wall), which `dig-pacing.md` section 6.3 already names.
- The line "only 10 to 13% of moves end deeper than every dig before" should rise above 60%.

**For the Shop (package 3).**

- `core.powGrow` 1.25 → 1.2, with x1.5 at every 10th level. Ten levels: x9.3 before and after,
  so `core.buyPow` stays 0.55.
- With Training folded in, coins that went to two buttons go to one: about two pick levels more
  a map. Small. Check Big Rock 1 and 2 (the first twelve minutes) in `dig-timeline.mjs`.

---

## 5. The first three work packages

Each can be played alone. Each runs `node sim/proto/dig-month.mjs` before and after.

### Package 1: The Pick you keep (M to L)

What: the three tracks in place of the Star Shop list and the flat bonus. Punch-through. The hit
chip. The New Site line. Pick art for the first four materials (stone, copper, bronze, iron).
`starLift` changed in the core. Old saves: every Star ever earned comes back to spend, and the
perks you own are already ticked on their rows.

Why first: it answers the complaint directly. It is felt in the first minute after the first
New Site. In the model it does not move the days.

Watch for:
- After your first New Site, do you buy Stone Pick without being told? Does the first block feel different?
- At New Site 5 and 10, can you say what your pick is? ("Copper II.")
- Is there a move after which you can buy nothing? That should be rare (fewer than one in three).
- Sim: Big Rock 4 for the mixed player stays inside day 3 to 5.5.

### Package 2: Everything counts in hits (M)

What: the scaling rule of Q5 for TNT, crystal, Dynamite, the Drill, the fusion bombs, the Derrick
and the Feed the Rock prize. Hits left on the Rock's bar. The record flag. Sizes in hits on the
cards. The curve fitted again (`step`, `share`).

Why second: it changes the pace of everything, so it needs the sim. And package 1 gives it
something to stand on: after it, "your hit" is a number the player knows.

Watch for:
- Minute 2: the first two barrels at 8 m must still open a hole. If not, raise TNT's hits.
- Does a bomb build still feel like the best build? It should. Does it carry you past ground your
  pick cannot scratch? It should not.
- Do you end most maps deeper than the last, by a few metres?
- Sim probe: the share of ground damage from blasts falls from 80% to under half. Moves that end
  deeper than ever rise from 10 to 13% to over 60%.

It overlaps the wider review (runaway bomb builds). Agree the unit with that study first.

### Package 3: A Shop with milestones (M)

What: Stronger Pick milestones (every 10th level: x1.5 and a chest). Training folded into the
pick. The Lucky Sieve as four levels. Hold to buy to the next milestone. One site special a site
(after the wider review has settled what maps are).

Watch for:
- Do you ever wait to buy, to reach a milestone first? That is the decision arriving.
- Presses a map: about 100 today. Under 40 is the aim.
- Does a chest from the pick button feel earned or free?

**Later, small:** tool tempering as a metal sink (S to M). Contract Stars as a share of a move
(S). Remove the double perks (S).

---

## 6. Decisions only the owner can make

| # | Decision | My default |
|---|---|---|
| 1 | Stars give nothing until spent. (Today they count by themselves.) | Yes. Old saves get every Star back to spend |
| 2 | Three tracks, or one Pick track with the perk list left as it is | Three tracks. One list, one screen |
| 3 | Rafeeqs: their own track (Camp), or do they copy your pick? | Their own track: "strong hand or strong camp" is a real choice. Depends on the wider review |
| 4 | TNT and the others counted in hits. Deep bombs get weaker | Yes |
| 5 | Fewer, bigger moves: 8 to 10 a layer, not 15 to 20. The days of the ladder may move | Yes, after package 2 |
| 6 | Rafeeq Training folded into Stronger Pick | Yes |
| 7 | Punch-through comes with the pick material, not as a relic | With the material: it is what makes the permanent pick felt |
| 8 | Material names. "Gold pick" and "Glass pick" exist as looks won in contracts | The track sets the material. Contract looks become a trim on the handle |
| 9 | Museum: keep "+25% coins" a set? | Drop the number. Sets open places and relic families. The wider review decides |
| 10 | The capstone "Falling Star" skips the first 25 m of every map | Yes. By then you have dug it a hundred times |
| 11 | One special Shop item per site | Yes, after the wider review on maps |

---

## 7. Bugs found on the way (not design)

1. **The Feed the Rock prize goes round the wall.** `contracts/rules.js`, `feed()`: each ore
   broken near a Big Rock takes a share of the Rock's *whole* hp (0.3% per copper, 2.4% per gem),
   whatever your strength. In the sim, once the prize was won, 97 to 99% of the damage to the
   Rock at 125 m came from it. `docs/dig-pacing.md` lowered `feedBend` from 0.4 to 0.05; it is
   still not tied to the pick. `proto/README.md` says it must be.
2. **Ground-based damage against the README's own rule** ("must scale with the pick's strength,
   never with the hardness of the ground"): `tnt/rules.js` (`dirtHp(b.r) * p.power`),
   `crystal/rules.js` (`dirtHp(q.r) * p.power`), `forge/rules.js` (`dirtHp(q.r) * p.dynPower`, and
   the Drill's `forgePop` breaks any block), `fusion/rules.js` (`b.cell.max * p.bombDmg`, twice),
   `wing2/rules.js` (the Derrick's floor `dirtHp(b.r + k) * 0.2`). The Rock is protected by
   `boss.chainCap`; the ground is not.
3. **"4 cards" can be 5.** Wide Hands (`starshop`) and Pearl Eye (`wing2`) each add one card and
   they add up. Both texts say "4 cards, not 3". The "One Relic Only" prize adds a third on the first chest.
4. **The same perk twice.** "Boom Eyes" (Star Shop, 2 Stars) and the prize of "In the Dark" both
   make TNT show through the dark. A player who has one gets nothing from the other.
5. **Docs out of date.** `docs/dig-pacing.md` section 6.2 says `starsFor` still pays
   `floor(best / 10) - 2`; `sites/rules.js` now calls `starsAt`. `proto/README.md` says "Fourteen
   features are built"; many more are. The work-package table lists `autos`, `map` and `land2` as
   if they had content; their `rules.js` are empty.
6. **Warm Pick locks the Pick button at the start of a map.** It sets the pick level, so the next
   level costs what it would at that level (568,000 coins at level 27) while the top rows pay a few
   coins. For the first minute Stronger Pick cannot be bought and the cheap Rafeeq Training runs
   ahead. Works as written; probably not as meant.
7. **A move at 58 m for 3 Stars** in the middle of a 125 m stretch (sim, move 24). Likely a
   contract that was left or a short dig. Harmless, but the scripted player's rule should not take
   a move worth 0.4% of its Stars.

---

## What rests on what

- **Play:** nothing. I did not see the page.
- **Sim:** the shares of damage, the Stars and levels at each move, when the Star Shop, the Forge
  and the Museum were finished, the 15 moves at one Rock. One seed, one kind of player, a robot.
- **Code:** every rule, price and curve in the tables; the double perks; the bugs.
- **Formula:** the swings in the first rows, Punch-through, the new `starLift`, the costs of the
  tracks. None of the new numbers has been through the month sim. They are an outline for it.
- **Design judgement:** the three tracks, the materials, the order of the packages.
