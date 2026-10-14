# Dig: a world map between levels (study, 13 October 2026)

> **Evidence, not the design.** The one design file for Dig is [`docs/dig-design.md`](../dig-design.md): what was taken from this study, what is built and what the owner still decides (section 9) live there. Where this file disagrees with it, that file wins.

## 1. What the games do

| Game | Players (source, how sure) | Map type | How progress shows | After a level | What makes it feel good |
|---|---|---|---|---|---|
| Candy Crush Saga (and Farm Heroes, Toon Blast, Royal Match) | About 80 to 90 million a month in 2025 (third-party trackers Business of Apps and Udonis; one King executive said over 200 million). Sure it is the largest by far; the exact number is a guess. | One long winding path up a scrolling board, cut into "episodes" of about 15 levels, each a land with its own look. | 1 to 3 stars under every node; done nodes coloured, next one glows, later ones grey; your marker sits on the next node. | Back on the map, the marker hops to the next node, the stars drop onto the finished one, the next node pops open. | Always one obvious next button; every finished node is a little trophy; a new land is a new picture. Its bad parts (lives that refill by clock, gates that ask for friends or money) are what Dig must leave out. |
| Super Mario World (SNES) | 20.6 million copies (Guinness, from a 2014 estimate; it was packed with the console). Sure. | Region map of Dinosaur Land: islands linked by dotted paths; red dots have a second, secret exit that opens a side path; Star Road shortcuts. | Yellow dot = one exit, red = two; finished dots turn solid; new path dots draw in one by one; a save count of exits. | Mario walks the path, the new path draws itself in with a sound, the camera follows. | The path drawing itself in. Free walking back to any finished level. Secrets you can see but not reach yet. |
| Super Mario Bros. 3 (NES) | About 18 million copies (one older article; fairly sure). | Eight small worlds, each one screen, a grid with forks, locks and wandering enemies. | Finished panels turn into an "M" card; locks open when a castle falls. | Mario moves one panel at a time. | Each world is one screen you can read at a glance. |
| Legends of IdleOn | Hundreds of thousands to low millions: Steam about 843k units (SteamPulse estimate), all-time peak about 21k online; plus phones. Low confidence. | World map of 6 to 7 worlds; each world is a node graph of named areas around a town. | Locked areas grey; a portal needs a kill count ("4,500 kills") on the area before it. | You walk to the portal yourself; no map ceremony. | Many paths to chip at; the map is a menu more than a reward. Its gates are counts that need hours of play, so it is slow to read for a child. |
| Angry Birds | Rovio says over 5 billion downloads across the series (company number; downloads, not players). | Episode picture, then a grid of numbered levels. | 3 stars per level, total stars per episode. | Back to the grid. | The 3 stars. The grid itself is flat. |
| Slay the Spire | Several million copies (1.5 million by 2019, GDC talk; sequel 3 million in its first weeks of 2026). Medium. | Branching node graph per act, picked by the player, one act at a time. | The line you walked is drawn; icons say what each node holds. | You choose the next node among the 2 or 3 joined to yours. | A real choice every step, and you see what each road costs before you take it. |

## 2. The pick

**The owner asked for the game with the most users: that is Candy Crush Saga.** It is a good fit, not a poor one: Dig's road is already one fixed line of 20 levels cut into lands, and a saga map is exactly that, with medals in place of stars. What a saga map lacks is side roads, and Dig has them (twists, the two Museum places, the deal after level 20). For those, take Super Mario World's two best ideas: **the path drawing itself in, and side paths branching off the main road.** Leave out IdleOn's map: it is a menu with kill-count gates, and Dig already has a menu (the cards).

**Recommendation: a Candy Crush road with Super Mario World branches.**

## 3. The map for Dig

**Shape.** One world map, left to right, five lands side by side: Arabia (4 nodes), Africa, East Asia, the Americas, Europe (4 each), then a sixth panel "Beyond" for after level 20. Each land is a panel about one screen wide with its own sky colour and ground tint, and its horizon drawn by the existing `makeZoneProps` in `proto/features/look/zones.js` (Arabia: dunes). The camera opens on the land of the next level; drag or arrows pan between lands. Desktop only.

**Nodes.**
- Road level: a round stone on a dotted path, its number inside (1 to 20). A prove level is bigger with a hammered rim and the word "Hard ground".
- Under each finished node, three medal pips: Finished, Fast, Hard (the same `medal_*` icons and `medalsHtml` the cards use). Empty pip = not won yet.
- Side levels hang off the road as short branches with a smaller node: a twist node off the level you are stuck on (only when the deal gives one), the two Museum places as islands off the Arabia coast joined by a dotted sea path, shown once that place is open (`siteOpen`).

**Locks.** A node is locked (grey, path not drawn) until the level before it is finished. Nothing else locks it: no clock, no count of plays, no Stars. Locked nodes still show their name and depth, so the player sees where the road goes.

**What can be clicked.** Only the cards `dealCards(s)` returns are "go" nodes. The road level glows and bobs with a big Dig button; side cards glow softly. Clicking any other finished node shows its medals and best time, nothing more (playing old levels from the map would be a rule change; owner decision, not in this package).

**After a finish.** The finish card stays as it is (keep, kit, Spend). Its gold Next button opens the map instead of the "Next site" card:
1. The camera sits on the level just finished. Its new medal pips pop in one at a time (tick sound each).
2. The path to the next node draws in dot by dot (about 0.8 s), then the digger marker walks it (about 1 s). Into a new land: the camera pans across and the land's arrival sting plays.
3. The next node opens with a small burst; the panel beside it shows name, land, "Level 6 of 20", gate depth, the new thing, the Stars it pays. Big button: Dig here.
The whole walk is skippable by any click. Nothing waits.

**After level 20.** The path runs on into "Beyond": a crossroads where three short paths fan out, one per card of the deal (stretch, new place, medal, twist), each node labelled like today's cards. The one picked becomes a node on the map; the next deal draws three new paths from there.

**Where else it opens.** The site panel's "Next site" button opens the map too (view-only when `canNewSite` is false: "Break the Gate to move on"). The old card modal stays as a fallback if the map fails to draw.

## 4. Data it needs (all already exported, no rule changes)

| Need | From |
|---|---|
| Node list, order, land, prove | `ROAD`, `ZONES` |
| Medals and best time per node | `s.road.stamps[siteKey(site, floor)]` (`fin`, `fast`, `hard`, `best`, `n`); twists `site:floor:twist` |
| Next road level, its number, tries | `fixedNext(s)`, `roadLevel(s)` |
| Clickable nodes, side cards, the deal after 20 | `dealCards(s)` (cards with `kind`, `level`, `stars`, `medals`) |
| Land of a side level | `roadZone({ run: { floor } })` |
| Go | `pickCard(s, card, app.ev)`, then `app.save(); app.refresh(true)` |
| Museum places open | `siteList(s)` / `siteOpen` |
| Text for the info panel | existing keys: `site_*`, `look_zone_*`, `fin_next_level`, `next_gate`, `newThingKey` (sites/ui.js, export it) |

The walk needs "from where": the `siteFinished` event already carries `key`, `site`, `floor`; pass it to the map.

## 5. Build package (one coder)

Note: `proto/features/map/` is reserved for another package (several sites at once); use a new folder.

| File | What |
|---|---|
| `proto/features/worldmap/ui.js` | `openMap(app, { from })`: modal with one canvas, layout, camera, walk, info panel, Dig button |
| `proto/features/worldmap/layout.js` | Pure: node positions per land (fixed hand-placed curve per panel), branch positions, path points; returns a list from `ROAD` + stamps + deal |
| `proto/features/worldmap/draw.js` | Canvas painting: land panels (sky, tint, `makeZoneProps` horizon), dotted path, nodes, pips, marker |
| `proto/features/worldmap/strings.js` | en + ar: "Dig here", "Break the Gate to move on", "Beyond", locked line |
| `proto/features/worldmap/worldmap.css` | modal size, info panel |
| `proto/features/sites/ui.js` (small edit) | Next buttons call `openMap`; export `newThingKey`, `medalsHtml` |
| `test_worldmap.js` | layout tests |

Drawing: one 2D canvas, redrawn each frame only while animating; hit-testing by node circles; no images, no emoji.

**Done when**
- [ ] After any finish, Next opens the map on the finished node; pips pop, path draws, marker walks, next node opens; one click skips it all.
- [ ] Only nodes from `dealCards` start a dig; the road level is the glowing one; Dig here calls `pickCard` and the right level starts.
- [ ] All 20 road nodes show in the right land with correct Finished / Fast / Hard pips from a real save; locked ones grey with name and depth.
- [ ] Stuck at a level (2 tries): its side cards show as branches. Museum islands appear only when open.
- [ ] After level 20: three paths fan out in Beyond, one per card.
- [ ] Old saves with stamps from before draw without errors; a save with no stamps shows level 1 glowing.
- [ ] Each land panel uses its own sky and horizon; crossing into a land plays its sting.
- [ ] `npm test` passes (layout tests: 20 road nodes, 5 lands, clickable set equals `dealCards`); text in English and Arabic; changelog entry.
