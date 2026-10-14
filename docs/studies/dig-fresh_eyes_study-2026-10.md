# Dig with fresh eyes: power you can feel, walls with doors, hard mode worth it (14 October 2026)

Builds on `design_improvements.md` (Good Hit, Fever, Gate tricks, Five steps of hard, story of the night), `ui_study.md` and `pick_rafeeq_study.md`. It does not repeat them. Work already handed to other agents (TNT on Rocks, smoother Gate HP, finish-card return, Buy all, earlier fusion, visible Museum pieces) is taken as done.

## 0. What the numbers say (read from the code, not guessed)

| Fact | Where | What it means for the player |
|---|---|---|
| A Stronger Pick level is x1.25 for x1.5 the price | `core/rules.js` `powGrow`, `shop` `grow` | Coins turn into hits slowly. |
| The Black (100 to 125 m) gets x1.20 harder **every metre**, and starts x3 harder than the row above | `core/rules.js` `grow[2]` | One Stronger Pick level is used up by about **one metre** of ground. |
| In one 25 m leg coins rise about x10.8, enough for about 6 pick levels = x3.8 hit. The ground rises x95 | `valGrow 1.10`, `hp 1.20` | Even spending every coin, hits per block **grow about 25 times from the top of the leg to the bottom**. This is "a lot of hits that do not feel natural". |
| Level 6 (prove) is the 100 m ground x6. Level 7's Gate sits under the Black: about x3 x 95 x 1.3, roughly **x370** the 100 m ground | `sites.proveHp 6`, `grow[2..3]` | Level 6 to level 7 is a jump of about **x60** per block. At x1.5 a Star step that is about 10 steps of The Pick. That is the wall the owner hit. |
| Contract goals are fixed small depths: 40 m bare, 30 m dark, 24 m TNT, 50 m blind | `contracts/rules.js` `bareDepth` etc. | The board opens after 8 finished levels (`openFinished`). By then the player starts 100 m levels with Star strength, so every 30 to 50 m goal falls in the first minute. All win at once. The Hard medal uses the same contracts (`hardOf`), so Hard is not hard either. |
| A bone is 7.5% a row; the Museum picks the piece | `museum` `chance`, `wingFind` | The player cannot aim at a missing piece; nothing on the map says where pieces are. |

So three of the owner's seven complaints come from two numbers: ground that grows faster than any upgrade, and contract goals that do not grow with the level.

## 1. The felt power curve

**What the best games do.**
- **Clicker Heroes, Idle Slayer, Cookie Clicker:** the number goes up, but the *felt* proof is that old content melts. Zone 1 monsters die in one click after an hour. Idle Slayer shows enemies popping as you run past.
- **Motherload, SteamWorld Dig, Dome Keeper:** each drill upgrade changes a thing you see every second: dirt that took three bumps now takes one; a rock you could not dig now breaks. Upgrades cross **thresholds** (can / cannot, three hits / one hit), not percentages.
- **Vampire Survivors:** every level-up changes the screen (a new weapon, a bigger circle). The screen is the progress bar.
- **Terraria:** pickaxe tiers are named and drawn (copper, iron, gold, molten); each tier opens an ore you could not mine.

**What Dig does now.** Your hit is a number in a pill. A block takes N hits and N quietly rises as you go down, so buying Stronger Pick in the deep part changes nothing you can see within a metre. Upgrades are percentages, never thresholds.

**Proposal: "hits to break" is the unit of power.**
1. **Steady ground, sharp Rocks.** Inside a leg, hits per block at the player's expected pick should stay in a narrow band (target: 2 to 6 hits for dirt, never above 8). Move the difficulty out of the per-metre growth and into the Rock and Gate, where the crack, TNT and the Rafeeqs make it a fight. Starting numbers for the sim: Deep layers 1.08 a row (was 1.14 to 1.21), the rest of each layer's growth moved into the step behind each Big Rock. Coins per leg still buy about x3.8, so a pick bought mid-leg now cuts a block from 6 hits to 4: you feel it at once.
2. **Shatter.** A block whose health is under your hit breaks in one swing with a sand-burst and no hit sound, and the leftover damage carries into the next block in line (overkill carries; Punch-through becomes the rule, not a Star step, and its Star step becomes "carries two blocks"). The top legs of every level now shatter in long runs: that is the Clicker Heroes "old ground melts" feeling, for free.
3. **Say it in hits.** The Stronger Pick button reads "Blocks here: 5 hits, then 4". The pointer shows small crack marks on the block (one per hit left, up to 5; more shows "5+").
4. **Pick tiers you can see.** Every 10 pick levels the pick's head changes material (wood, stone, copper, iron, silver, gold, crystal) with a ring sound and a banner. Pick materials already exist in some form (fault 15 says they were never looked at): make them the tier ladder.

**Cost.** `core/grid.js` curve and `core/rules.js` `grow` (economy change: sim before and after); `core/rules.js` `swing` for overkill carry; shop button text in `features/shop/ui.js`; pointer marks in the dig render; pick look in `features/picks/`. M to L.

## 2. Walls: a choice with a visible way out

**What the best games do.**
- **Clicker Heroes:** the boss has 30 s. Fail, and the game drops you one zone back into farm mode and shows your damage against the boss's health. You always know how short you were.
- **Royal Match:** the first hard level is held back to level 39; hard levels are **marked before you start** and pay more (3 shields, super hard 5). The early game sits at about 1.1 tries per win.
- **Slay the Spire, Hades:** you see the act boss's face before the act. Losing pays something (Hades: Darkness and Keys toward permanent upgrades), so a lost run is a step, not a waste.
- **Egg Inc.:** every research shows exactly what it adds and how long until you can afford it.

**What Dig does now.** The Gate bank (`gateShare 0.6`) and the stuck hint (`bossAdvice`) exist, but they speak after you have failed, one line at a time. The map stone does not warn that level 7 is three times the work of level 6.

**Proposal.**
1. **Ready meter on the map stone.** Before "Dig here": "Your hit: 1,200. This Gate wants about 3,000." A bar in three colours: green (go), yellow (a long fight), red (come back stronger). The number is the sim's expected-hit for that Gate, compared with the live hit.
2. **Three doors, with numbers.** When the meter is red, or after a lost try, one card shows three ways out side by side, each with what it gives: "Alqahwa: The Pick step, +50% hit, 40 Stars (you have 31)", "Side level: Golden Wadi Fast medal, pays 12 Stars", "Replay level 5 with 1 chili: pays 18 Stars". One click each. This replaces the single advice line.
3. **Your best try, drawn.** The Gate bar keeps a thin white tick where your best try got to ("best: 62%"). The next try races the tick. The Gate's memory already banks damage; this makes it visible, like a ghost in a racing game.
4. **Mark the hard ones.** Level 7, 11, 13, 15 stones get a drawn rock-with-teeth badge and "Hard level: pays x1.5". Royal Match's move: warn and pay, never surprise.

**Cost.** `features/worldmap/` (meter, badge), `features/boss/` (best tick, doors card replaces the hint), `features/sites/rules.js` (expected hit per road level, a small table from the sim). M.

## 3. Hard mode, challenges, contracts done right

**What the best games do.**

| Game | The ladder | Why it works |
|---|---|---|
| Slay the Spire | Ascension 1 to 20, each adds one rule, opened by winning the one below | One new rule at a time, always learnable. Many players' main reason to play hundreds of hours. Hades' designers name it as their model. |
| Hades | Pact of Punishment: 15 rules, you pick which; each adds Heat. Bounties (Titan Blood, Diamonds, Ambrosia) paid per weapon per Heat | The player builds his own challenge; the reward is announced before the run. |
| Balatro | Eight stakes; each keeps the ones before; winning puts a coloured sticker on every joker you used | The win is shown on your things, for ever. |
| Egg Inc. | Each contract has three goals, each with a prize shown up front; the last is the hard one | A contract is never "all done in a minute": the first goal is easy, the third is a stretch. |

**What Dig does now.** One Hard medal per level whose rule is a contract with a fixed small goal (section 0). The board opens late with 10 contracts in 3 tiers. Hard pays half a level's worth of Stars and no more.

**Proposal: Chili levels (one ladder for hard, contracts and the Hard medal).**
- Every finished level's stone gets **five chili pips**. Pip N is the level again with N rules on, chosen by the player from the ones opened (Hades), or in a fixed order on the road (Ascension). Recommend: fixed for pips 1 to 3, free choice at 4 and 5.
- **Each pip makes the Gate and ground harder**: ground x1.25 and Gate x1.5 per pip (pip 5: ground x3, Gate x7.6). The rule is the twist; the numbers are the teeth.
- **Rules** (reuse the contracts' hooks): Rafeeqs on tea break (crew half speed), no chain (TNT breaks alone), the dark, rising sand, the glass pick, one relic only, bare pick (no relics).
- **The goal is always the Gate**, never a fixed depth. Contracts keep their names and stamps but become pip rules, so the board's "all done at once" goes away.
- **Rewards, shown on the stone before you start:**

| Pip | Stars (x the level's worth) | Also |
|---|---|---|
| 1 Mild | 0.5 | |
| 2 Hot | 0.75 | Its rule's hat for the Wardrobe |
| 3 Shatta | 1.0 | Your hit +3% for ever (the "spicy arm") |
| 4 Fire | 1.5 | A drawn chili sticker on your pick, like Balatro's |
| 5 "Ya Mama!" | 2.0 | Your hit +5% for ever, the stone turns gold, the manager toasts you at Alqahwa |

- **The damage buff is the progressive part:** 20 levels give at most +160% hit from chilies, about 2.4 Star steps, so it helps the next wall without replacing the road. Every chili won anywhere helps the level you are stuck on: a wall gets a third door ("win 2 chilies on old levels").
- Names a child gets, with Gulf humour: Mild, Hot, Shatta, Fire, "Ya Mama!". Almodeer has a line per pip ("Shatta? My grandmother puts more in breakfast").

**Cost.** `features/sites/rules.js` (pip state per stamp, HP scale, pay), `features/contracts/rules.js` (goal = the Gate, rules become toggles), `features/worldmap/` (pips and reward line on the stone), a small `chili` buff in `core` folds, Wardrobe items. Save: old Hard medals count as pip 1 won. L. Economy change: sim before and after.

## 4. Collection pull

**What the best games do.**
- **Vampire Survivors:** the Collection is a grid of every item with **dark silhouettes and question marks** for the missing ones; many unlocks say how to get them. Empty slots pull harder than full ones.
- **Animal Crossing, Pokemon:** the museum and the dex show where you are short; each new piece gets a ceremony (the owl talks, the dex entry plays).
- **Melvor Idle:** the Completion Log and Mastery give a percent per skill and per item, with bonuses at set points (10, 25, 50, 95%).
- **Royal Match:** the meta is a room you decorate; each star fills a visible spot.

**What Dig does now.** 13 sets in a list tab. A bone block gives a piece the Museum chooses; the map does not say where pieces are; pieces you already own turn into coins quietly.

**Proposal.**
1. **Pieces live in places.** Each set belongs to two or three road levels (the camel in the Valley of Beasts, the shark at Shark Bay...). The map stone shows small bone silhouettes: filled for found, dark for missing ("2 bones still here").
2. **A glint for a missing piece.** When a bone in sight is a piece you lack, it shines and the Museum tab icon pulses. A duplicate looks plain. You learn to chase the shiny one.
3. **No bad luck forever.** A level's missing piece is certain by its fourth bone (a counter, not a timer). Honest odds, no fake scarcity.
4. **Set reward up front.** Each set's card shows what it opens before you start it, and the empty skeleton is drawn on the Museum wall.
5. **Percent on the cover.** "Museum 41%" on the Museum tab and the map's legend, with a small prize at 25, 50, 75, 100% (hats, a Rafeeq visitor in the Museum, a gold frame).

**Cost.** `features/wing2/sets.js` (a `where` per set), `wing2/rules.js` (`wingFind` prefers the site's sets; the pity counter), `features/worldmap/` (silhouettes), the dig render (glint). M.

## 5. Coming back, with no dark patterns

**What the best games do.**
- **Hades:** every return moves the story; characters have something new to say. The pull is curiosity, not loss.
- **Egg Inc., Melvor, Cookie Clicker:** time away pays honestly, capped, and the return screen shows what it bought.
- **Animal Crossing:** letters and small changes in town. Some of its daily pull is clock-based, which Dig's rules forbid; the part that fits is "something new to look at".
- **Zeigarnik effect:** people remember unfinished tasks better. Ending a session near a named, nearly done goal is the cleanest hook there is.

**What Dig does now.** The crew digs up to 12 hours; the away card is totals and a joke (the story of the night is proposed but not built). The last thing seen before leaving is whatever was on screen.

**Proposal.**
1. **The goodbye line.** When the page hides or after a finish, the finish card's bottom line names the nearest goal with its distance: "Next time: 2 chilies on Powder Valley; the Camel set needs 1 bone; The Pick step needs 9 Stars". Three short lines, picked by closeness.
2. **The crew works on that goal while away.** A share of away coins goes to the pinned goal, and the away card says "Saif dug toward your Second Pick: 3,400 of 12,000". This is fault 10's fix with a face.
3. **New talk each visit, not each day.** Alqahwa's Rafeeqs and the manager have a line bank keyed to what happened since the last visit (a new chili, a set done, a wall broken). Nothing expires; nothing is lost by missing it.
4. **One wish at a time.** On return, one small optional task appears ("Break a Gate with 3 Rafeeqs alive", pays a few Stars). It stays until done; the next comes only after. No expiry, no streak.

**Cost.** `features/away/` (goal share, card lines), `features/chatter/` (visit lines), finish card (`proto/ui` finish card code), a tiny `wish` list. S to M.

## 6. The first 10 minutes and the first session's end

**What the best games do.** Royal Match keeps the first 20 levels at about 1.1 tries per win and holds the first hard one to level 39. Vampire Survivors levels you up every 20 to 40 seconds early. Cookie Clicker shows the next building as a dark shape before you can buy it. All end the first session on a reveal, not on a quiet screen.

**What Dig does now.** Level 1 in 8 to 10 minutes; levels 1 to 4 in about 30 minutes. It is close. Two gaps: nothing marks the end of the first session, and the first Big Rock is fought with a pick that may still need many hits per block.

**Proposal: a beat sheet the sim checks.**

| Minute | Something new on screen |
|---|---|
| 0:00 | First block in 2 hits, coins fly |
| 0:30 | First Stronger Pick: blocks visibly go from 3 hits to 2 |
| 1:30 | First TNT chain |
| 2:30 | First Rafeeq hired, he says his name |
| 4:00 | First Big Rock, the crack lesson |
| 6:00 | First chest, pick 1 of 3 |
| 8 to 10 | Gate down, the finish card, the first Stars, Alqahwa opens |
| 30 | Level 4 done: the map pans to Africa, its drums play, the five chili pips on level 1 light up for the first time |

The first session ends on that pan: a new land seen, a new ladder shown. The goodbye line from section 5 names both.

**Cost.** Mostly tuning and one map moment: `features/worldmap/`, lesson timing, a sim check in `sim/proto/` that records the minute of each first. S to M.

## 7. Ranked build list

| # | Package | What the player sees | Done when |
|---|---|---|---|
| 1 | **Contracts scale with the level** (quick win before Chili) | Every contract and Hard medal goal is the Gate of the level it is played on; three goals per contract (half way, three quarters, the Gate) with their prize shown | Sim: a player at level 9 wins at most 1 contract on the day the board opens; Hard medal takes 2+ tries on average |
| 2 | **Chili levels** | Five pips per finished level stone, rule and reward shown before you start, +3%/+5% hit for ever at pips 3 and 5 | Old Hard medals become pip 1; sim shows pip 3 takes 2 to 4 tries; the chili buff never moves a road Gate more than one try sooner |
| 3 | **Steady ground, sharp Rocks** | Hits per block stay between 2 and 6 in a leg; the fight is at the Rock | Sim: hits per dirt block at the expected pick never above 8 on levels 1 to 15; Gate tries unchanged within one |
| 4 | **Shatter and overkill carry** | Weak blocks burst in one swing in runs; leftover damage goes on | You can watch a top leg melt; sim pace change recorded |
| 5 | **Three doors at a wall** | Ready meter on the stone; after a loss one card with three ways out and their numbers | Level 7 stone shows red/yellow before the first try; each door is one click |
| 6 | **Best-try tick on the Gate bar** | A white tick where your best try reached | The tick moves only forward; shows on every Gate after the first try |
| 7 | **Museum on the map** | Bone silhouettes per stone, a glint on missing pieces, a pity count, Museum % | Every set has a home level; a missing piece is certain by the 4th bone there |
| 8 | **Say it in hits, pick tiers** | Shop button "5 hits, then 4"; crack marks; a new pick head every 10 levels | Pick looks checked on screen (fault 15) |
| 9 | **The goodbye line and the goal-share away** | Three "Next time" lines; away card names the Rafeeq who worked on your goal | Lines always name a real, reachable goal; fault 10 sim share recorded |
| 10 | **First-session beat sheet** | A new thing every one to two minutes; the Africa pan at level 4 | Sim prints the minute of each first; all inside the table's windows |

Order note: 1 is small and fixes the owner's contract complaint at once; 2 is the "progressive hard mode with damage buffs" already queued, built on 1. 3 and 4 answer "a lot of hits does not feel natural" and should go together with one sim.

## 8. Decisions for the owner

1. **Chili rules: fixed order or player's choice?** Recommend fixed for pips 1 to 3, choice at 4 and 5.
2. **Permanent hit from chilies** (+3% at pip 3, +5% at pip 5, up to +160% over the road): accept? It makes hard mode pay into the main road.
3. **Steady ground, sharp Rocks** moves difficulty from the ground to the Rocks. It changes the economy; accept the direction before the sim work?
4. **Contracts board:** fold it into Chili (one ladder), or keep it as a separate list of stamps?
5. **Bones tied to places:** accept that each Museum set lives at two or three levels, which makes replays purposeful?
6. **Names:** Mild, Hot, Shatta, Fire, "Ya Mama!" for the pips; the rock-with-teeth badge for hard levels.

## Sources

- [Hades Pact of Punishment: heat, modifiers and rewards (RPG Site)](https://rpgsite.net/feature/10287-hades-pact-of-punishment-heat-modifiers-and-how-to-maximize-your-rewards)
- [Supergiant on Slay the Spire's Ascension inspiring the Pact (Tom's Guide)](https://www.tomsguide.com/uk/features/hades-exclusive-interview-supergiant)
- [Hades endgame (Kotaku)](https://kotaku.com/everything-you-need-to-know-about-hades-endgame-1845239105)
- [Why Royal Match waits for its first hard level and live op (Gamigion)](https://www.gamigion.com/why-does-royal-match-wait-22-levels-to-introduce-their-first-live-op/)
- [Royal Match level design and difficulty analysis (Medium)](https://medium.com/@ekinmelissezer/game-analysis-for-royal-match-and-toon-blast-9c4bff8ef48b)
- [How Royal Match uses near wins (This Week in LiveOps)](https://thisweekinliveops.substack.com/p/how-royal-match-uses-almost-wins)
- [Melvor Idle achievement stats (Steam)](https://steamcommunity.com/stats/1267910/achievements)
- Game knowledge (no single link): Clicker Heroes boss timer and farm mode; Egg Inc. three-goal contracts; Balatro stakes and stickers; Vampire Survivors collection silhouettes; Motherload / SteamWorld Dig / Terraria drill and pick tiers.
