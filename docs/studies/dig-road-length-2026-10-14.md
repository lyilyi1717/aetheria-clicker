# Dig: a longer road, levels that feel the same (study, 14 October 2026)

Owner: "road length: don't change the game progress feel but increase the length." Target (decision 6 default): the mixed
player finishes the road on day 18 to 25. Measured on `main` at 69bb0f5: day 8.2 / 11.0 (`docs/pacing-targets.md`).
Out of scope: making a level slower by its price or HP (that brings the walls back). Builds on ideas bank N5 (storyteller).

## 1. What the code says

- **The road** is `ROAD` in `proto/features/sites/rules.js`: 4 lessons, then `LAND(zone, d)` x4 (Africa 100, East Asia 150,
  the Americas 200, Europe 250). A level is keyed by `site` + `floor` (`siteKey`, `road.stamps`), so the same place and depth
  cannot be a second road level as things stand. `maxFloor` 300. After level 20 the map shows the **Beyond** panel
  (`worldmap/layout.js`, `hub`), and `dealCards` deals three cards with no end.
- **Pace per level, late road.** Levels 13 to 20: day 4.0 to 8.2 (seed 1) and 5.0 to 11.0 (seed 2), so **0.5 to 0.75 days a
  level**, rising toward the end (17 to 20: 0.7 / 0.9). Levels 5 to 20 together: **7.2 to 10.8 days**.
- **What grows with depth.** Ground per 25 m below 225 m: `1.175^25 x step` = x110 to x170 (`core/rules.js` `grow`, the last
  entry goes on for ever). Stars per floor x4.5 (`starsAt`, `core/grid.js`). Par x1.45 per 25 m (`parBase` 300,
  `parGrow`): **275 m is already 8,500 s; 425 m would be 79,000 s (22 hours)**. Legs: one Big Rock per 25 m from the
  surface, so a 275 m level has 11 Rock fights and a 425 m level 17.
- **No law below 200 m** (`deep/rules.js`: black, living, angry, hot). Levels 15 to 20 are "deeper ground" already.

So going **deeper** makes each level longer (more legs, a longer par) and Star numbers bigger (fault 12). Going **again**
over the same depths keeps the legs, par, Gate table and rhythm exactly.

## 2. Games that add length without stretching a step

**Candy Crush Saga.** Levels come in episodes of about 15, each with its own place and look; length is added by new
episodes of the same shape, never by making old levels longer. Dig's lands are episodes of four. [Wikipedia; Windows
Phone update notes]

**The Legend of Zelda (1986), Second Quest.** Finish the game and it starts again on a new map: dungeons moved, harder
layouts, the same tools and rules. The second journey is as long as the first and feels like it because each step is
the same size. [Zelda Wiki]

**Melvor Idle, Into the Abyss.** After the last boss, an Abyssal Realm adds "Abyssal levels" 1 to 60 to every skill the
player already knows: the same actions, a new world, new items and a story that carries on from the ending. [Epic store
page; Pocket Gamer]

**Slay the Spire, Ascension.** Twenty levels, each adds one rule on top of the last; losing never takes a level away.
Same three acts, more length from mastery. Dig already has this as chili (2.3d), so it is not a new answer. [Steam
discussions; Pocket Gamer]

**Hades, Heat.** Each weapon keeps its own Heat level and bounties; same regions, a separate ladder per weapon. Again
the chili idea, already built. [Prima Games; RPG Site]

**SteamWorld Dig 2.** Length comes from areas, each with a new tool or trick, and a story that pulls you to the
next. A new area with nothing new in it would feel like padding. (Game knowledge.)

The lesson: games that keep each step the same size add **another run of the same steps in a new place with a story
reason** (Zelda, Melvor, Candy Crush). Ladders of harder rules (Ascension, Heat) add replay, not a road; Dig has
that already.

## 3. Three options

### A. Chapter Two: the road home (recommended)

**Built 14 October 2026** (`docs/dig-design.md` 2.4). Where it differs from this text: the factors came out at `ch2Hp` 3e12 and `ch2Stars` 2e5 (the player arrives about 10^12 times stronger); the Beyond panel sits between the two chapters on the map and holds the free deal as a side branch; the caravan Museum set and the sparser night bar are not built; Stars by day 30 rise to tens of T (the fault-12 check above fails).

**What the player sees.** After level 20 the storyteller's end card: Grandpa's camel bell is found under the Golden Wadi
with a note, "the caravan went home the long way". The map zooms out, the Beyond sign becomes the start of a night road,
and the digger turns for home: **Europe, the Americas, East Asia, Africa** (the lands in reverse, at night), then a
**new home land, the Empty Quarter**, where the caravan is found at the last Gate. The screen says "Chapter 2, level 1
of 20". Each Ch2 Gate gives one drawn piece of the caravan (a Museum set of 20: camels, tents, the pot, Grandpa's
coffee pot last), which fills in behind the digger on the map.

**Rhythm kept.** Levels 21 to 36 are the same 16 depth slots as levels 5 to 20 (100 to 275 m, learn then prove, the same
laws at the same depths, the same legs and par, the same `gateMul` table), on ground and Stars multiplied by two chapter
factors (`sites.ch2Hp`, `sites.ch2Stars`), set by test like `gateMul`: the Gate in swings at arrival and the digs
between must match Ch1's per-level column. Levels 37 to 40 (the Empty Quarter) are two new depths, 300 m and 325 m.

**Days added.** 16 levels at the measured 7.2 to 10.8 days, plus 4 levels at 0.8 to 1.1 = **+10.4 to +15.2 days. Road
end day 18.6 / 26.2** on the two seeds. If the sim lands above 25, the Empty Quarter shrinks to 2 levels (one depth).

**Content to build.**
- Rules: `ROAD2` and a chapter field in `road` (stamps keyed `c2:site:floor`; sites slice `version` 3 with a migrate
  that sets `chapter: 1`); `fixedNext` and `roadLevel` read the chapter; the two factors; `maxFloor` 325; par for 300 and
  325 m held at 275 m's par x1.1 (no 3-hour par).
- Looks: a night variant per land (sky and ground tint in `look/`, data only) and one new land look (the Empty
  Quarter: red sand, high dunes). Beats: the land beats at night (lower pitch, sparser; `picks/beat.js` data) and one
  new home beat (the old kit with the tabl and the clap, slower).
- Map: a second road on the same panels (or the panels mirrored) and the Empty Quarter panel; the caravan set on the
  map. Museum: one set of 20 pieces.
- Story: N5's storyteller lines stretched to 40 levels (three lines per level; the end card of level 20 becomes the
  turn of the story, not the end).
- After level 40 the three-card deal stays, as today after level 20.

**Cost: M** (rules M, art S-M, music S, map M). No new laws.
**Sim to check:** `dig-levels.cjs` for levels 21 to 40: tries 1 to 3, digs between at most 6, Gate swings at arrival
within x1.5 of the same slot in Ch1, road end day 18 to 25 on both seeds, Stars by day 30 not above today's 1.2 B
by more than x10 (fault 12).

**Risk.** The first rows of a Ch2 level: the coin pick starts bare, so the factor that makes the Gate right can make
row 0 a wall or a breeze. Check hits per dirt block in the first leg of level 21 against level 5 (target the same band).

### B. Three more lands, deeper (levels 21 to 32, 300 to 425 m)

**What the player sees.** Three new lands after Europe (default: South Asia, Oceania, the Ice), four levels each, the same
learn/prove pairs, "Level 21 of 32". Caravan found at level 32.
**Days added.** 12 levels at 0.8 to 1.1 days, but each is longer: 12 to 17 Rock fights against 11 at level 20 (up to
+55% minutes per level). About **+10 to +14 days, end day 18 to 25**, with the per-level minutes drifting up (the
thing the owner asked to keep).
**Content.** 3 land looks, 3 beats, 3 map panels; without a new law per depth these are 12 more "deeper ground" levels,
so ideally 3 to 6 new laws (block tables, Rock twists, strings, sim). `gateMul` for 12 slots; par capped; `maxFloor` 425;
Stars per floor reach 3 x 4.5^15 = 1.9e10 (fault 12 grows).
**Cost: L** (M without new laws, and then the new lands are a sky and a beat only).
**Sim:** as A, plus minutes per level at 21 to 32 within x1.3 of level 20.

### C. Land seals from chili and the Museum (no new levels)

**What the player sees.** A land's last Gate (levels 8, 12, 16, 20) wears a seal: "Clear 2 chili pips in this land and
finish its Museum set". The caravan story moves on each seal.
**Days added.** About 6 chili digs and a few bone digs per land, at 7.9 digs a day: **+2 to +4 days, end day 10 to 15**.
Short of the target alone.
**Content.** Map seal, rule in `fixedNext`, strings. **Cost: S.**
**Feel.** It turns optional replays into a toll in front of the next land: the rhythm of learn/prove gets a grind step
between lands. Not the owner's "same feel". Use only as a light extra: the seal gives the caravan piece; it never
blocks.

## 4. Recommendation

**Build A, Chapter Two: the road home, 20 more levels (16 same-depth slots at night, then 4 in the Empty Quarter at 300
and 325 m), with the caravan found at level 40.** It is the only option where each level is the same size as one the
player has already done (same legs, par, Gate table and laws), so "the feel" is kept by construction, not by tuning.
The numbers say +10 to +15 days, which puts the end at day 18 to 26. Order of work for the coordinator:
1. Rules and save (chapter field, `ROAD2`, two chapter factors, par cap), one sim to set the factors. (balance-analyst)
2. Night looks, the Empty Quarter look and beat, the second road on the map.
3. The caravan set and the storyteller lines to level 40 (N5 stretched).

## 5. Decisions only the owner can make

| # | Question | Default |
|---|---|---|
| 1 | Chapter Two (A), deeper lands (B), or both later? | **A** now; B parked until real players finish Ch2 |
| 2 | Where is the caravan found? | Level 40, under the Empty Quarter at home; level 20 finds Grandpa's bell and his note |
| 3 | What does the screen say: "Level 23 of 40" from the start, or "of 20", then "Chapter 2, level 3 of 20"? | **"of 20", then Chapter 2**: the end of Ch1 is a surprise, not a 40-level wall on day 1 |
| 4 | Ch2 lands in reverse (walking home) or the same order? | **Reverse**; laws stay by depth, so only the sky and beat order change |
| 5 | Old saves past level 20 | Ch2 opens at the next "Next town"; the Beyond deal stays as a side branch |

## 6. What to cut or fold

- Fold C into A: the caravan piece is the reward of each Ch2 Gate; no seals that block.
- Fold N5 (storyteller) into A: one legend over 40 levels, the turn at level 20.
- Hold the Pick price change past step 20 (`pacing-targets.md`, smallest next change) until Ch2's factors are set: it moves
  the road end one day earlier and Ch2 reuses those steps.
- Park B (new laws) for a Chapter Three; "deeper ground with no law" is not more road, only bigger numbers.

## 7. Rows for `docs/ideas-bank.md`

| # | Idea | From game | Cost | Sim number | Status |
|---|---|---|---|---|---|
| L1 | Chapter Two: the road home at night, 20 levels, caravan found at level 40 | Zelda Second Quest, Melvor Into the Abyss, Candy Crush episodes | M | Road end day 18-25; tries 1-3 and digs between at most 6 for levels 21-40 | proposed |
| L2 | Three deeper lands, levels 21-32 at 300-425 m | Candy Crush episodes, SteamWorld Dig 2 | L | Minutes per level within x1.3 of level 20; end day 18-25 | parked |
| L3 | Land seals from chili pips and the Museum | Hades Heat, Slay the Spire Ascension | S | End day moves +2 to +4 | rejected as a block; folded into L1 as a reward |

## Sources

- [Candy Crush Saga (Wikipedia)](https://en.wikipedia.org/wiki/Candy_Crush_Saga), [15 new levels, a new episode (Nokia Power User)](https://nokiapoweruser.com/candy-crush-saga-for-windows-phone-updated-with-15-new-levels-brand-new-episode/)
- [Second Quest (Zelda Wiki)](https://zeldawiki.wiki/wiki/Second_Quest), [Dungeons (Zelda Wiki)](https://zeldawiki.wiki/wiki/Dungeons)
- [Melvor Idle: Into the Abyss (Epic Games Store)](https://store.epicgames.com/p/melvor-idle-into-the-abyss-8dbc43), [Into the Abyss (Pocket Gamer)](https://www.pocketgamer.com/melvor-idle/into-the-abyss-dlc-expansion)
- [Ascension (Steam discussion)](https://steamcommunity.com/app/646570/discussions/0/4033599096399886489), [Ascension guide (Pocket Gamer)](https://www.pocketgamer.com/slay-the-spire/ascension-guide)
- [Pact of Punishment and Heat (Prima Games)](https://primagames.com/gaming/hades-guide-pact-of-punishment-modifiers-heat), [Heat and rewards (RPG Site)](https://www.rpgsite.net/feature/10287-hades-pact-of-punishment-heat-modifiers-and-how-to-maximize-your-rewards)
