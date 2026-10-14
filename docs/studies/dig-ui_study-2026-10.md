# Dig: folding in the clutter (UI study, 13 October 2026)

Source: the owner's reference (an idle archer game), the code on `main` (`proto.html`, `proto/ui/app.js`, `proto/proto.css`, every `panels:` in `proto/features/*/ui.js`) and three screenshots (Powder Valley, Golden Wadi, the finish card). Take the ideas, not the look: Dig stays desert, drawn icons, no emoji, desktop.

## 1. What the reference does to cut clutter

| # | Idea | Why it works |
|---|---|---|
| 1 | **The scene is the screen.** Play takes about 55% of the height; nothing sits beside it. | The eye lives on the action. Menus never fight it for space. |
| 2 | **One purse pill.** Every currency is one small rounded strip, icon + number, top left. | Five numbers read as one thing. No labels, no boxes. |
| 3 | **Progress as a track of nodes.** Level number, one fill bar, then a row of diamonds (waves) ending in a boss face. | You see where you are, how many steps are left and what waits at the end, without reading a word. |
| 4 | **Round icon buttons, top right, all the same size.** Settings, map, menu, info. | Things you need rarely are present but quiet. |
| 5 | **One drawer, one tab open.** A vertical icon strip; only the active tab's content shows. | Six systems take the space of one. You choose what to look at. |
| 6 | **Dots only where something is ready.** Two tabs have a small red dot; the rest are plain. | The dot answers "where should I look?" and nothing else. |
| 7 | **Locked tabs show a lock, not a hole.** | You know more is coming, and it costs no space or reading now. |
| 8 | **One action and one plain next line.** "Crafting Lv.1", one Lv. Up button with its price, then "Lv.2: Unlock Armor Crafting". | The next goal is a sentence, not a table. Detail (the slot grid) is there only if you look. |

## 2. Dig today: everything on screen at once

| Where | Element | Need |
|---|---|---|
| Header | Title "Dig", tagline | never (decoration) |
| Header | Stars chip, Your hit chip (pick name + number) | always |
| Header | Auto dig button, Sound button | sometimes |
| Above stage | Goal bar (one line + bar: Gate, Big Rock fight, spend Stars, Second Pick) | always |
| Stage | Coins pill, depth pill, record pill | always |
| Stage | Beat strip ("100 a minute" pips), pick note ("Your pick: Wooden -> Wooden ...") | strip sometimes; note rarely |
| Stage | Combo / oil rush chip, toast, banner, start hint, tool bar | only when happening (already right) |
| Stage | Depth ruler with 25 m marks on the left edge | sometimes |
| Left | **This site**: place, rule, Gate bar, clock, three medal chips, pay line, hard note, Next site button, The Road stamps | the Gate bar always; the rest sometimes |
| Left | **Relics** (+ the fusion book, folded) | sometimes |
| Left | **Your Rafeeqs**, **Foreman** (job grid with keys) | sometimes |
| Left | **Museum wing**, **Contracts** | rarely |
| Right | **Star Tracks** (3 tracks, each with title, step, current card, 3 future steps) | between levels |
| Right | **Second Pick shop**, **coin Shop**, **Forge** | shop often; the others sometimes |
| Footer | Prototype note, Start over | never / rarely |

Count on a mid-game screen: about 11 panels in two scrolling columns, 4 header controls, 6 stage overlays. The Gate progress appears **three times** (goal bar, This site bar, the depth ruler). The right column scrolls before the coin shop, the panel used most, is even seen.

## 3. The proposal

### 3.1 Always on screen (hard limit: these and nothing else)

1. **The dig** (stage) with its live overlays: coins, depth, combo chip, tool bar, toast, banner.
2. **The purse pill**, top left: Stars, metal (once the Forge is open), Your hit. Coins stay on the stage pill because coins fly there.
3. **The level track** above the stage (3.3). It replaces the goal bar and the This site Gate bar.
4. **Three round icon buttons**, top right: Map (opens the world map), Auto dig, Sound. Start over moves into the Sound button's long-press menu or stays in the footer, small.
5. **The drawer's tab strip** (icons only).

The tagline, the record pill, the pick note on the stage and the depth ruler's labels go (the track carries depth now).

### 3.2 One drawer, right of the stage

Layout becomes two columns: the stage, then one drawer (a 56 px icon strip on the outer edge plus about 360 px of content). One tab open at a time; the content scrolls inside only if it must.

| Order | Tab (icon) | Holds today's panels | Locked until | Dot when (really ready, never otherwise) | Next line, one plain sentence |
|---|---|---|---|---|---|
| 1 | Shop (coin) | coin Shop, Second Pick | never | an item you could not afford when you last opened the tab is now affordable | "Next: Second Pick, 12,000 coins." |
| 2 | Stars (star) | Star Tracks | first Stars | a Star step is affordable | "Next: Stone I Pick, 2 Stars. Your hit goes on into the block below." |
| 3 | Rafeeqs (helmet) | Your Rafeeqs, Foreman | first Rafeeq | the Foreman has just arrived (once) | "7 Rafeeqs: the Foreman comes." |
| 4 | Relics (chest) | Relics, fusion book | first chest | two relics can be fused | "Find a chest: pick 1 of 3 relics." |
| 5 | Museum (bone) | Museum wing | level 3 | a set can be finished | "2 more bones finish the Camel set." |
| 6 | Forge (anvil) | Forge | level 4 | a tool is affordable | "Next: the Drill, 40 metal." |
| 7 | Level (flag) | This site (clock, medals, pay, Next site / leave), Contracts | never | the Gate is down and Next site is waiting | "Break the Gate at 100 m to finish." |

- **Locked tab:** greyed icon with a drawn lock. Hover says how it opens, in a resource, never a time: "Opens at Level 3."
- **Dots:** a small dot, no number, no pulse, no sound. It clears when the tab is opened. If nothing is ready, no tab has a dot. A dot is never used to pull the player back.
- **Opening a tab** shows the next line at the top in bold, then the one main button, then the detail (future steps, lists) below it, quieter.
- The open tab is remembered (`localStorage`, a per-viewer convenience).

### 3.3 The level track

```
 Level 6 of 20  Powder Valley          0:19  [Finished][Fast][Hard]
 [====o====o====o====>----------------[GATE]
   25    50    75   you            100 m
```

- One node per Big Rock (every 25 m) and the Gate icon at the end (a drawn stone arch; it turns gold when the Gate is down).
- A node is a small drawn rock: dark before, filled gold once broken, a ring on the next one.
- The fill shows the depth from the top of the level to the Gate; a red segment while a Big Rock fight is on (today's `boss` goal colour).
- The goal text sits on the track line: the first goal that has something to say (the existing `goal` extension point keeps its order: contracts and spend Stars 5, Second Pick 8, Gate 9, Big Rock 10). Its `frac` fills the current segment.
- Below the Gate (digging on): the track shows "Below the Gate" and the Gate icon stays gold.

## 4. Build package (one coder, the coordinator's files)

**Merge order:** the world map (`dig-worldmap`) first. It changes `proto/features/sites/ui.js` and `proto/features/ui.js`; this package touches the second by one line.

**Files**

| File | Change |
|---|---|
| `proto.html` | Two-column `.layout`: `#stage` column, then `<aside id="drawer"><nav id="tabs"></nav><div id="tabbody"></div></aside>`. `#goal` becomes `#track`. Header: `#purse` (left), `#mapbtn #auto #mute` as round buttons (right). |
| `proto/ui/drawer.js` (new) | The tab list: `{ id, at, icon, title, lock(s) -> text or null, dot(s) -> bool, next(s) -> text }`, the default `PANEL_TAB` map (`shop, picks -> shop`; `starshop -> stars`; `crew, foreman -> camp`; `relics, fzbook -> relics`; `wing2 -> museum`; `forge -> forge`; `site, contracts -> level`), build, switch, dot memory ("last seen affordable"). |
| `proto/ui/app.js` | `ui()` accepts `tabs: [...]` and a panel field `tab`. `buildPanels` appends each panel to its tab's body (`p.tab || PANEL_TAB[p.id] || 'level'`) instead of `app.el[p.side]`; `side` stays accepted and is ignored. `updatePanels` updates only panels of the open tab plus `live` ones that a dot reads. The goal loop writes into the track. `app.el.left / right` point at the open tab's body so old `mount` code still works. About 30 lines. |
| `proto/features/track/ui.js` (new) + one line in `proto/features/ui.js` | The level track: reads `G.siteRun`, `G.roadIndex`, the Big Rock state; draws nodes and the Gate in SVG with `icons.js` shapes. |
| `proto/ui/strings.js` | Tab names, lock lines, next lines (plain words). |
| `proto/proto.css` | Drawer, tab strip, dot, lock, purse pill, round buttons, track. Logical properties. |
| Later, by each feature's owner | Move the chips in `sites` and `starshop` `mount()` into the purse; set `tab:` on their panels; delete The Road strip from the site panel once the world map draws the road. |

**World map conflicts:** the map is a modal (`app.modal.open('worldmap')`), so the drawer does not touch it; the modal already pauses the dig and covers the drawer. Its new "Map" ghost button inside the site panel should become the top-right round Map button (key M) calling `nextMap.open(app, { lookOnly })`; keep one, not both. The finish card's "Next site" path (`goNext`) is unchanged.

**Done when**

- [ ] At 1366 x 768 and 1920 x 1080 nothing outside the drawer body scrolls; the stage is at least as big as today.
- [ ] On screen at once: the stage, the purse pill, the track, three round buttons, the tab strip, one tab's content. Nothing else.
- [ ] Every panel that exists today is reachable in exactly one tab; `when(s)` still hides it inside the tab.
- [ ] A tab with no shown panel is locked and says how it opens, in a level or a thing, never a time.
- [ ] Dots: a fresh save shows none; one appears only when its `dot(s)` is true; opening the tab clears it.
- [ ] Each tab shows one next line at the top.
- [ ] The track shows a node per 25 m Rock and the Gate; the fill matches `siteRun`; a Rock fight turns its segment red.
- [ ] The world map and the finish card open over everything and close back to the same tab.
- [ ] No emoji, all words through `t()`, logical CSS, an old save loads, `npm test -- proto` passes, no console errors.
