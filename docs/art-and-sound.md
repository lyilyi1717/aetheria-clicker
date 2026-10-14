# Art and sound

Owner: art-director. Looks, characters, layout, readability, sound and music for each game. Written from what the code draws
today (14 October 2026, v5.35.0; updated v5.35.7). Decisions are at the end of each game's page; the owner can still reverse any of them.

- **Aetheria (live)** and **Core loop (paused):** the rules are `docs/ui-style-guide.md` (tokens, type, motion, Arabic) and
  `docs/game-feel-guide.md` (feedback tiers T0 to T3). Nothing more here until someone works on them.
- **Dig (active):** this page.

House rules for every game: drawn in code (canvas, SVG), never emoji or pasted images; words a 7 year old knows; no text the
player must read under 13 px; colour is never the only signal (pair it with shape, text or place); the game never gets louder
without a slider for it; reduced motion is honoured; Arabic reads right to left in panels while the scene stays as it is.

---

# Dig

## 1. Palette

**Page tokens** (`proto/proto.css` `:root`; Dig has its own, not the live game's theme):

| Token | Value | Use |
|---|---|---|
| `--bg` | `#17110d` | page |
| `--panel` / `--panel-2` | `#241a13` / `#2f2218` | drawer, cards / rows, buttons |
| `--line` | `#4a3626` | borders |
| `--ink` | `#f6ead8` | text |
| `--muted` | `#b9a58c` | second line, locked |
| `--gold` / `--gold-ink` | `#ffd23f` / `#3a2a00` | money, "ready", primary buttons and the text on them |
| `--good` / `--bad` | `#59d37a` / `#e5533d` | gained, new / over time, dot on a tab |
| Ink (outlines on canvas) | `#1b1410` (`#2b1a0c` hakawati) | every character and prop outline |
| Paper (text boxes, story pane) | `#fffdf2` | almodeer's box, bubbles, the hakawati scroll |
| HUD pill | `rgba(15,10,6,.72)` + 1 px `rgba(255,255,255,.14)` | coin and depth pills, Museum chip |

**Ground** (`proto/features/look/palette.js`): `LAYER_LOOK` gives each layer dirt, stone, hard, back and glow
(sand, clay, slate, deep; then black, living, angry, hot). `SITE_LOOK` gives each place a sky and a light tint
(dunes, boom, gold, bones, shark, mirage). `ZONE_LOOK` gives each land its sky, far ground and a ground nudge, the place keeping
30% of its own sky. `lookFor` also gives `dark`, the block the lamp has not reached (the wall colour shaded -25% unless a land sets
its own). Block sprites are cached per land, site, zone and layer (`render.js` `key0`), so a land never shows another's blocks.
Ores (`ORES`) always keep at least 2.6:1 against the block behind them (`oreBacking`, `MIN_CONTRAST`).

## 2. Land looks

| Land (zone) | Sky | Horizon (`look/zones.js`) | Ground nudge |
|---|---|---|---|
| Arabia (`arabia`) | the place's own | the place's own | none |
| Africa | orange to gold | low sun, ridges, baobab, acacias, a far herd | orange 16% |
| East Asia | pale grey-green | misty layered hills, pagoda, bamboo | sage 16% |
| The Americas | blue to peach | red mesas, jungle, step pyramid | red 16% |
| Europe | grey-blue | clouds, green hills, castle, windmill | green 16% |
| Night lands (`n_europe` ... `n_africa`, chapter two) | deep blue (`#101a36` to `#5a3a4a`) | the day props under a 50% blue veil, 40 small stars, a crescent moon at x 78% | the land's colour, bluer |
| The Empty Quarter (`emptyquarter`) | red-orange `#e2683a` to `#ffc27a` | low sun, three rows of high red dunes, five far camels | its own red palette for the four ground layers (`ZONE_LOOK.emptyquarter.layers`, decision 7): sand dirt `#e4844a`, clay `#c95530`, slate `#b0452e`, deep `#94344a`, darker with depth; unlit blocks dark brick red (`dark`, `#8a3a20` at the top); the deep feature layers keep their look with red `#d9501c` at 40% |

Night and day share every shape: the land is known by its props, night by the dark sky and the moon (not by colour alone).

## 3. Characters

All share one style: round shapes, a 2 px dark ink outline (`#1b1410`), flat fills with one highlight, faces from dots and a
line, no gradients on bodies. Reduced motion stops the bob, sway, wave and steam.

| Who | Drawn in | Shape and size (canvas px) | Colours | Signs |
|---|---|---|---|---|
| **Rafeeq** | `proto/features/diggers/art.js` `drawRafeeq`, `drawRafeeqAt` | a bean body 25 wide, head r 9.5 at (0,-11), feet at y 21; height varies by -1 to +1 px | body blue (8 near blues `BLUES`) or a Wardrobe colour (`wardrobe/items.js` `COLOUR`, 10); head `#ffc83d`; red fez with tassel by default | big goggles, stick arms, pick over the shoulder; hat (14), clothes (6), pattern (6) from the Wardrobe; moods change face and head tint |
| **almodeer** (the manager) | `proto/features/chatter/manager.js` `bossFigure` | a thobe 28 wide, head r 9 at y -50, figure 92 tall with the ghutra | white thobe `#f5efe1`, skin `#c58b5b`, white ghutra with black agal | clipboard, whistle, a glass of tea (istikana, `#a8431a`, gold rim) with steam |
| **almodeera** | same file, `fem` | same figure | dark thobe `#2f2a3a`, purple-grey headscarf `#4a3f5e`, **burqe3** black `#16121c` from under the eyes (`bossVeil`) | lanyard and card, a clear cup of **matcha** `#7fb24a` with a gold straw; her mood is in the eyes and brows only |
| **The hakawati** | `proto/features/story/ui.js` `drawHakawati` | sits cross-legged on a cushion 60 wide; head r 12 at y -58 | purple cushion `#7b3a8c`, grey thobe `#d8d2c0`, white beard and ghutra, red book `#8f2a1f` | waves one hand while he talks; the camels of the finale are drawn in the same file |

The manager is not a Rafeeq: never the Rafeeq bean, never a Wardrobe item. Name plates: gold `#ffd23f` on `#2b2118`.

## 4. The dig screen: layout map

The page (`proto.html`): top line (purse with Stars and your hit, Map, Sound, Settings) / the track (40 px: level, countdown,
medals, message line, goal; spots T1 to T4 below) / the stage on the left, the drawer on the right. The stage is a 640 x 680 canvas (`W`, `H`; the
sky band is the top 104 px, `SKY`), scaled to the window (452 to 640 px wide), with page elements laid over it. The stage
never mirrors in Arabic.

**Reserved spots on the stage** (canvas px at full size; page elements do not scale with the canvas, so spots keep a margin):

| Spot | Where | Who lives there | Notes |
|---|---|---|---|
| S1 top start | x 10 to ~160, y 10 to 48 | coin pill `#hud-coins` | grows with the number |
| S2 under S1 | x 10, y 58 (52 under 800 px high) | combo banner `#combo` | only while a combo runs |
| S3 top centre | the middle of the sky band | **the Museum chip**, full (pieces, set name, "N of M found") | only while the manager is off screen (under 3 Rafeeqs) |
| S4 manager | figure at x 250, feet at y 92; countdown pill above his head (y 3 to 21); name plate under his feet | almodeer / almodeera | from 3 hired Rafeeqs |
| S5 manager's text box | x 286 to 486, y 24 to ~100 (`BOX_WRAP` 180 + 20) | his orders and countdown shouts | nothing else is drawn or laid here while he is on screen |
| S6 top end | x ~530 to 630, y 10 to 48 | depth pill `#hud-depth` | |
| S7 under S6 | end side, 10 px in, y 56 | **the Museum chip, small** (pieces 44 px and "a/b") | while the manager is on screen; the old best-depth note `#hud-record` here stays hidden |
| S8 dig | y 104 down | blocks, Rafeeqs, Rock and its bar | nothing is laid on the Rock's bar (#367) |
| S9 bottom start / end | 12 px from the corners | tools / Tips list, chest button, fuse button (70 px up) | the Museum arrow is drawn along the bottom edge |
| S10 hint | centred, y 128 | "Point at the ground to dig" | first seconds only; hidden while a banner shows (decision 11) |
| S11 bubbles | over each Rafeeq (y - 52), else up to 3 steps up, else down (`moods/spot.js` `bubbleSpot`) | Rafeeq speech bubbles, **two at most** | a third waits up to 3 s for room, then is dropped (decision 6) |

**Reserved spots in the track** (the 40 px line over the stage, `track/track.css`; decisions 5 and 10). All four always fit
inside the stage's width (452 to 640 px; 518 at a 1366 x 768 laptop); the gap between spots is 8 px.

| Spot | Who lives there | Size rule |
|---|---|---|
| T1 start | level line; under it the "Gate at N m" note, the countdown and the medals (`#trk-head`) | never narrower than the second line; the level line does not size the spot (`contain: inline-size`), it takes what is left and ends in dots, the place name first, then the land (full text in its title); grows 3 to T2's 1; at most 62% |
| T2 middle | the message line: lesson or toast (`#trk-msg`; a lesson wins) | 96 px, grows with spare room, never under 96 px, two lines at most, clipped inside its spot |
| T3 | Tips button; "Done here" takes this place when the dig is done | its own width (about 42 px) |
| T4 end | the goal: one goal chip (`#goal-pin`, only with 2 or more choices) over one line of goal words, or two lines of words without the chip; progress line along the foot | at most 180 px, gives way to what is left; the chip's word ends in dots before anything spills (the step mark and dots stay); the words' full text is in their title; the chip hides when the dig is done |

Rule: a new thing on the stage takes a free spot from this table (or a new row added here); it never sits on S4 or S5 while the
manager is on screen. `test_proto_art.js` checks the S5 and S7 numbers.

## 5. Text and contrast

- 13 px floor for anything the player must read (page and canvas). Numbers that fly and fade (hit floaters) may be smaller.
- Text on the gold button is `--gold-ink`; body text on panels is `--ink` or `--muted` (both above 4.5:1 on `--panel`).
- Every state that colour shows also has a shape or a word: medal chips dim vs lit, "over" with a minus sign, locked tabs with
  a lock and a line that says what opens them.
- Codes, numbers alone and anything in Latin letters that must line up read left to right on an Arabic page
  (`direction: ltr`, `dir="ltr"`), like the save code.
- **Big numbers** (decision 3): one short form everywhere, `fmt` in `proto/core/strings.js`: three figures and a letter
  (`2.10T`), K M B T then Qa Qi Sx..., tabular figures so the pill does not jump.

Known debt (brief B1): many labels are 10 to 12.5 px today (track line, map node labels, name plates, Museum hall, Wardrobe,
Star board notes).

## 6. Motion

`proto/ui/motion.js`: Reduce motion (Settings, default from the browser) adds `calm` to `<html>`: no shake, no screen flash,
bursts of at most 8 bits, pulses and bounces become one fade (`proto.css`). Canvas characters read
`prefers-reduced-motion` and stop their idle motion.

## 7. Sound

Everything is made in code (`proto/ui/audio.js` `tone`, `noise`), no files. **Mix:** three sliders in Settings, kept on the
device (`proto/ui/volume.js`): Master 80 (gain 0.5), Music 70 and Effects 90 (each bus gain 1 at its default), then a
compressor. Mute wins. Each sound has a `gap` so it cannot stack. **Music bus:** `break`, `coin`, `comboUp`, `star` (the
pentatonic notes); everything else is **Effects**. Loudness below is the loudest single voice (`vol`) before the buses.

**The beat** (`proto/features/picks/`): up to four picks on a 16-step bar, 100 to 160 beats a minute (Faster Hands). Note
loudness by gain only: accent `X` 1, plain `x` 0.7, soft `o` 0.48; Rafeeq hits 0.7 on the off-beat. Each land has its own
bar (same 8 hits a pick, so the same damage) and its own kit (`kits.js`): Arabia the game's own sounds; Africa djembe; East Asia
taiko, bell, wood block; the Americas conga, clave, cowbell; Europe march drum, snare, glockenspiel; night lands their day kit
x0.84 lower with sparser accents (decision 4); the Empty Quarter a tabl and claps on the home bar. Deeper layers lower every
note 5% a layer and add a low tail under hits. A three-note sting opens each new land.

| Sound | When | Bus | Loudness |
|---|---|---|---|
| hit / crit / crew | a pick lands / a lucky hit / a Rafeeq's swing | fx | 0.3 / 0.5 / 0.07 |
| break | a block breaks; its note climbs with the combo | music | 0.2 |
| coin | coins counted, map pips | music | 0.035 |
| comboUp | a combo step | music | 0.09 |
| star | a land crossed on the map | music | 0.2 |
| buy / deny | a buy / a buy refused | fx | 0.09 / 0.06 |
| picksSting | a level in a new land | fx | 0.46 peak |
| bossHit, rubble, record, bossDown | the Big Rock is hit, sieved rubble, a new best, the Rock falls | fx | 0.45, 0.4, 0.18, 0.6 |
| chestFound, chestOpen, relic | chests and relics | fx | 0.2, 0.2, 0.08 |
| blast | TNT | fx | 0.6 |
| waterBurst, waterSplash, waterPlop, waterClink, waterFree | water | fx | 0.32, 0.18, 0.3, 0.14, 0.18 |
| chime, shatter | crystal chain | fx | 0.12, 0.09 |
| gusher | oil | fx | 0.35 |
| deep* (11 sounds) | the four deep layers | fx | 0.1 to 0.3 |
| job, arrive | the Foreman | fx | 0.14, 0.16 |
| forgeOpen ... forgeBoom | the Forge | fx | up to 0.55 |
| fzPing, fzThump | fusion | fx | 0.12, 0.2 |
| relics2* (7 sounds) | relic effects | fx | 0.05 to 0.3 |
| fossil, wingPiece, wingHop | a bone, a Museum piece, the hall | fx | 0.2, 0.2, 0.1 |
| chili | a chili pip cleared (one more note per pip) | fx | 0.3 |
| stamp, glass, sand, throwOre | contracts | fx | 0.25, 0.2, 0.3, 0.06 |

Loudest moments (0.55 to 0.6): the Rock falling, TNT, the Forge's blast. Nothing new may go above 0.6.

The test page for every sound: `proto/soundboard.html`.

## 8. Decisions

1. **Decided (14 Oct 2026, by art-director): from 3 Rafeeqs the top centre of the dig is the manager's; the Museum chip moves to
   spot S7 under the depth pill and shows only the pieces and "a/b"** (#444). Because his words and countdown are what the
   player must read at that moment, and the chip is a reminder the drawer, the map and the goal line already carry; hiding the
   chip each time he speaks (every 20 to 30 s) would blink, and the box drawn over the chip would still cover the countdown
   pill. The box's widest line drops from 190 to 180 px so it ends at x 486, clear of S7 at every window size. Under 3
   Rafeeqs the chip keeps its full form at the top centre, where a new player learns what it is.
2. **Decided (14 Oct 2026, by art-director): codes and other Latin text that must line up always read left to right** (#445),
   on `.sc-area` by CSS and `dir="ltr"`; the code is 13 px.
3. **Decided (14 Oct 2026, by art-director): a trillion-sized Star number reads like every other, three figures and a letter
   (`2.10T`), on the pill, the board, the cards and the toasts** (design decision 14). Because the pill keeps one width, a child
   compares the next step by the board's gold fill bar (`starshop/ui.js`, Stars / price) rather than by reading letters, and
   long words ("2.1 trillion") would not fit the pill. Stars by day 30 are about 2 T, so names past T (Qa, Qi) are rare; looked
   at again if players reach them. The Arabic letters for K M B T are the localizer's call.
4. **Decided (14 Oct 2026, by art-director): no slower tempo in the Empty Quarter; night lands sound sparser by loudness, not by
   notes.** A slower tempo would take back the Faster Hands the player bought and change the hits (a balance change for a
   mood); fewer notes cannot hold 8 hits a pick on one pick. So at night only the notes on the beat keep their accent and the
   rest play soft (0.48): same notes, same hits, quieter, never louder. The Empty Quarter plays the home bar with the home
   bar's own accents (the Gulf 3 + 3 + 2), so the caravan's land sounds like home. `picks/beat.js`, checked in
   `test_proto_art.js`.

5. **Decided (14 Oct 2026, by art-director): the track line has four reserved spots (T1 to T4 in section 4) and the goal choice
   is one chip, not a row of three** (#453). Because at 1366 wide the stage is 612 px and the level, the Gate note, the message
   line, Tips and three pills (about 280 px) cannot share it; the pills pushed the head under them and cut "Gate at 50 m", and
   the message line had no room. One chip shows the goal on the bar; a tap steps to the next choice and the goal words change at
   once, so a child learns it by tapping; a dot per choice (the filled one is this, by place and fill, not colour alone) says
   there are more, and a drawn step mark says it moves on. With the chip the goal words keep one line (full text in the title).
6. **Decided (14 Oct 2026, by art-director): two Rafeeq bubbles at most on the dig, each placed clear of the other** (S11).
   Because two lines at once is already a conversation (a line and its answer); a third (a pat at the same moment) is noise, and
   the old one-step nudge could bounce between two bubbles at the top edge and end on top of one. The third line keeps its time
   while it waits, so a pat still answers.
7. **Decided (14 Oct 2026, by art-director): the Empty Quarter is red sand at every depth, lit or unlit** (#452). Because the
   40% nudge only showed on the two lit rows: every block below was the lamp's dark (the brown wall shaded down), and the block
   pictures were cached without the land, so a visit that came from another land kept that land's blocks. Now the four ground
   layers have their own reds (lighter at the top, darker down, so depth still reads by brightness; slate keeps its shine;
   stones stay a warm stone colour, not sand), the unlit block is a dark brick red, block pictures are kept per land, and the
   land is set before the sky's early return. The deep feature layers (black, living, angry, hot) keep their own look plus the
   nudge, because each one is a law the player must know at a glance. Every ore keeps 2.6:1 (`test_proto_look.js`).
8. **Decided (14 Oct 2026, by art-director): in Alqahwa the "No Rafeeqs yet" line is a caption strip under the room, dark
   `#2b1a0c` with `#fff6e0` text at 14 px.** Because the room never mirrors but the line did: laid over the scene it fell on the
   hakawati in English and on the coffee sign in Arabic. Under the room it covers nothing in either language.
9. **Decided (14 Oct 2026, by art-director): the save code box is named for screen readers by the section title** (#454): the
   `aria-label` line had been swallowed by a comment; it is code again, and `test_proto_art.js` checks it is not in a comment.

10. **Decided (14 Oct 2026, by art-director): the track never spills past the stage; the goal shrinks to the room left, and the
    drawer's "Next:" line stays where it is** (#461). Because the spill came from the track, not the drawer: the level line
    ("Chapter 2, level 17/20 · The Empty Quarter · The Dunes", about 350 px) was allowed to set T1's width, so at 518 px (1366
    laptop) T1, T2, Tips and a 210 px goal needed about 740 px and the goal was pushed 95 to 215 px past the stage, over the
    drawer. Moving the "Next:" line would only have hidden the spill. Now the second line (Gate note, clock, medals) is T1's
    floor and the level line ends in dots inside it (the map and the land's look say the land too, and the full text is in its
    title); T2 keeps its 96 px for lessons, which a new player needs most; the goal is at most 180 px and gives way last, its
    chip word ending in dots before it could ever cross the edge. Budget at 518 px: 216 (second line) + 96 + 42 (Tips) + 3 gaps
    of 8 = 378, leaving 140 for the goal, enough for "Second Pick" with its dots (about 130). When the dig is done the chip
    hides, so "Gate broken in 12:34" and "Done here" fit.
11. **Decided (14 Oct 2026, by art-director): the first hint and a banner never show at once; the hint waits.** Because "A new
    site! You now have N Stars." is 40 px gold words over the middle of the ground for 3.6 s, wrapping to two or three lines at
    laptop width, and moving every banner (chili starts, chili won, ...) would change their place for all players to solve a
    first-minute clash. The hint waits while `#banner.show` is on (one CSS rule, `proto.css`), then fades in; a player who digs
    first has learnt it already.

## 9. Briefs for builders

**B1. The 13 px floor** (after the localizer's string and HUD pass lands, to avoid two PRs on the same lines).
Raise to 13 px (canvas fonts to `bold 13px` or more) every label the player reads: `#goal-text` and `#toast/#lesson`
(`proto.css`), `track/track.css` (`#trk-head`, tips), the manager's name plate (`chatter/manager.js`, 11 px; move the plate up 3
px so it stays in the sky band), Alqahwa name tags (`worldmap/alqahwa.js`, 11 px; #423), map node labels (`worldmap/draw.js`,
11 to 12.5 px), `starshop.css`, `sites.css` (10.5 px chip), `wing2.css` (10 to 12 px), `wardrobe.css`, `story.css`,
`contracts.css`, `picks.css`, `relics2.css`, `forge.css`, `fusion.css`, `foreman.css`. Floaters that fly and fade are exempt.
*Done when* a search for `font-size` and canvas `font` under 13 px in `proto/` finds only the exempt floaters, and screen-checker
sees at 1500x1000 and 1366x768, in English and Arabic: the track line not cut, the level name and goal readable, map labels
not overlapping, the manager and hakawati name plates readable, the Star board and the Museum hall without clipped text.

## 10. What screen-checker should look at next

- The dig with 3 Rafeeqs, English and Arabic: the small Museum chip under the depth pill, the manager's box and countdown pill
  fully clear, at 1500x1000 and 1366x768; with 2 Rafeeqs the full chip at the top centre.
- A new Museum piece while the chip is small: the pop still shows.
- Settings, Show my code: the box has aria-label 'Save code' (Arabic: the Arabic title).
- The Empty Quarter at level 37 (v5.35.4), reached from level 36 in the same visit (not by reload): red sand on lit rows, dark
  brick red on unlit rows, darker red going down, ores readable; a night land after a day land shows its own blue-ish blocks.
- The track line with a toast, Tips and the goal chip all showing, English and Arabic, 1500x1000 and 1366x768: the "Gate at
  N m" note whole, the toast inside its spot, the chip over one line of goal words; tapping the chip steps the goal.
- Three Rafeeqs talking at once at 1366x768 (a pair and a pat): two bubbles at most, never overlapping.
- Alqahwa with no Rafeeqs, English and Arabic: the "No Rafeeqs yet" strip under the room, the coffee sign and the hakawati clear.
- The Stars pill and the Alqahwa board with Stars near 2 T: the pill width does not jump, the gold fill reads.
- By ear (the owner): a night land and the Empty Quarter on `proto/soundboard.html`.
- (v5.35.7, #461) The track at 1366x768 and 1500x1000, English and Arabic, at level 37 (Chapter 2, Empty Quarter) with a toast
  and the goal chip showing, and in the Museum tab: the goal chip and its words end inside the stage's right edge, nothing on
  the drawer's gold "Next:" line or its first button; the level line ends in dots, the Gate note, clock and medals whole; the
  message line still two readable lines. Also with the clock over time ("1:23 over"): the chip may end in dots but stays inside.
  After the Gate: "Done here" and "Gate broken in ..." whole, no chip.
- (v5.35.7) A fresh save: "Point at the ground to dig" is not shown while "A new site!" is up, and appears right after it.
