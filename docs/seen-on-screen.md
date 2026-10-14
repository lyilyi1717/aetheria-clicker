# Seen on screen

Owner: screen-checker. What a person (or the checker) has actually looked at, per feature.
Verdict: looks right / broken / confusing / not reachable / never seen.

Seen on 2026-10-14 at version 5.31.1, desktop only, 1500x1000 headless, state set from the console where noted.
Screenshots over about 300 KB are kept on the worktree only (03, 11).

## Second pass, 14 October (version 5.31.1 on main c42d3c0, items from #408 to #412)
Screenshots in docs/screens/2026-10-14b/. 03, 05 and 06 were over 300 KB and are on the worktree only. Mostly state set from the console (stamps, bossesDown, a lantern block, story read list).
| Feature | Last seen | Version | Screenshot | Verdict | Note | Issue |
|---|---|---|---|---|---|---|
| Coin pill with 150 coins, Museum chip beside it | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14b/01-fresh-coins.png | looks right | "150" is whole, big; the camel chip sits clear in the middle. (Fixes #401.) | |
| Clock on a fresh dig | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14b/01-fresh-coins.png | looks right | Stayed 2:30 for 1.5 s with no hit. | |
| Top line after the Gate breaks: banked text, Tips | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14b/02-gate-broken.png | looks right | "+5:00 banked" at 0.7 s, "Gate broken in 0:00" by 2.2 s; no overlap with the medals; Tips hidden. | |
| Lesson line after the Gate breaks | 2026-10-14 | 5.31.1 | worktree only (03-done-here.png) | broken | "You have Stars. Spend them at t..." sits under the gold rule and is cut. | #414 |
| Done here button | 2026-10-14 | 5.31.1 | worktree only (03-done-here.png) | looks right | Bright gold, dark text, clear of the other things; click reopens the finish card (checked). | |
| Chili: banner before the card | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14b/04-chili-card.png | looks right | The banner shows first; the card opens about 1.5 s later. (The banner itself was seen only by timing, not in a picture.) | |
| Chili: pips on the card | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14b/04-chili-card.png | looks right | 36 px, lit one green and glowing, the rest grey; "+2 Stars", never +0. | |
| Dark Gate (Black), level 7/8 style | 2026-10-14 | 5.31.1 | worktree only (05-dark-gate.png) | looks right | "Too dark: break the lantern above" fits above the bar text; the lantern has a bright ring. Set up on a level 1 run with a depth 125 Rock, so the layout is as real but not a true level 7. | |
| Dark Gate: Lit line and stuck hint | 2026-10-14 | 5.31.1 | worktree only (06-dark-hint-lit.png) | looks right | "Lit: full hits" shows in green (small, over the Rock's eyes). Stuck hint says "too dark: your hits count only 40%. Break the lantern above the Rock first" until lit, then the money advice. The box covers the layer name "The Black". | |
| Goal bar at the Gate reads swings; manager at 0 on a leg | 2026-10-14 | 5.31.1 | | not reachable | Bar reads "about 1.00K swings left, 6 min" (seen). Manager at 0 on a leg not set up this pass. | |
| Alqahwa: hakawati scroll with Next / Skip, Story count | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14b/07-alqahwa-story.png | looks right | Big cream scroll, chapter name, two clear buttons; Story button shows a red 6. The scroll covers the hakawati, so only his feet show. | |
| Alqahwa: guests and manager with the scroll | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14b/09-bell.png | looks right | Four Rafeeqs and the manager sit apart from the hakawati; name tags (almodeera and the manager) are close but readable. | |
| Alqahwa: "No Rafeeqs yet" line | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14b/07-alqahwa-story.png | confusing | With no guests the line is drawn over the hakawati's head. | |
| Story book | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14b/10-book.png | looks right | Chapters with Level buttons, scrolls, Close; New mark on level 20. | |
| Finish-card teaser "hakawati has a new story" | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14b/08-finish-teaser.png | looks right | Gold line under "You broke the Gate". But the card now runs off the window: the two choices are cut. | #415 |
| Level-20 bell ending | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14b/09-bell.png | confusing | Last line and a "Thank you" button show; I did not see a bell picture, and Story still showed 1 after my clicks. Needs a play check. | |
| Museum edge arrow | 2026-10-14 | 5.31.1 | | not reachable | Not set up this pass. | |

Console errors: only the favicon 404.

## Dig (first pass)
| Feature | Last seen | Version | Screenshot | Verdict | Note | Issue |
|---|---|---|---|---|---|---|
| Rock bar text ("about N swings left, T s") | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14/02-rock-fight.png | looks right | Sits on the bar, nothing covers the Rock face. Small white text on blue; "1.70K swings, 9 min" (and "56.0K, 5 h" at the Gate with a Lv 1 pick) is a lot for a newcomer to read. | |
| Countdown in the top line | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14/04-over-almodeera.png | looks right | Big, clear; goes red with "0:24 over". | |
| Countdown over almodeera's head | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14/05-almodeera-closeup.png | looks right | Pill above her head, red "-0:25" when over; readable. | |
| "+m:ss banked" and "Gate broken in m:ss" | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14/07-topline-done.png | broken | Banked text overlaps the medal icons; Tips overlaps Done here; the lesson line is cut by the gold line. | #402 |
| Done here button | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14/07-topline-done.png | broken | Dark and dim, partly under Tips (same issue). Opens the finish card again. | #402 |
| almodeera's burqe3 close up and matcha | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14/05-almodeera-closeup.png | looks right | Face covered from under the eyes, clipboard, clear green matcha with a straw; Arabic name plate reads well. | |
| Alqahwa room and menu board | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14/08-alqahwa.png | looks right | Clear, three menu items, Wardrobe and Leave. With no Rafeeqs the "No Rafeeqs yet" line sits on top of the empty cushions (small). | |
| Finish card: Go to Alqahwa / Next town | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14/06-finish-card.png | looks right | Two big gold-edged buttons, easy to choose. The card is as tall as the window and shows a scroll bar at 1000 px high. | |
| Map walk and auto-enter | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14/09-map-walk.png | looks right | The Rafeeq walks the dotted road, the next level opens by itself after about 3.5 s; "Click to skip" shown. | |
| Chili: finish-card pips | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14/10-chili-banner.png | confusing | Five pips are small and dark; lit one is easy to miss. "+0 Stars" under "Mild cleared!" looks wrong. | #403 |
| Chili: pip-cleared banner | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14/10-chili-banner.png | confusing | The finish card covers the banner within half a second, so it is not seen. | #403 |
| Museum: glint on a bone block | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14/11-museum-glint.png | looks right | White glow, outline and sparkles; easy to spot. | |
| Museum: edge arrow | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14/11-museum-glint.png | not reachable | Not drawn with my setup (a bone one row under the view); needs a real play check. | |
| Museum: set chip (Old Camel 0 of 4) | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14/02-rock-fight.png | broken | Readable, but it sits on top of the coin counter. | #401 |
| Museum: background skeleton | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14/02-rock-fight.png | looks right | Dim skull and hump behind the ground; does not fight the blocks. | |
| Museum: map node silhouettes | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14/09-map-walk.png | looks right | Grey camel with 0/4 under every node. | |
| Coin counter (top-left of the stage) | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14/02-rock-fight.png | broken | Hidden under the Old Camel chip; 100 shows as 10. | #401 |
| Settings panel | 2026-10-14 | 5.31.1 | docs/screens/2026-10-14/12-settings.png | looks right | Three sliders, Sound, Share my play times, Done. The gear icon looks like a sun. "Share my play times" starts On. | |

Console errors in every run: only the missing favicon (404). No script errors.

## First five minutes from a fresh save (latest)
- Date, version: 2026-10-14, 5.31.1 (first two minutes only, via the shot driver).
- Where I got lost: the line under the title shows a clock (2:26) and three grey dots with no word on what they are; the clock starts counting before the first hit. "Point at the ground to dig" is clear, but on a screen with no mouse nothing happens until you point. The right side has a row of dim icons (Rafeeqs, Relics, Museum, Forge, Level) that say "Opens when..." only on hover.
- What I did not notice: the coin counter (under the camel chip); the Tips button; what the three dots (medals) mean.
- What felt good before I read the number: the glowing bone block, the Rock's angry face and the bar, and the almodeera pill. The first block breaks in two hits, which is quick.

## Aetheria / Core loop
| Feature | Last seen | Version | Screenshot | Verdict | Note | Issue |
|---|---|---|---|---|---|---|
| (not looked at this round) | never | | | never seen | | |
