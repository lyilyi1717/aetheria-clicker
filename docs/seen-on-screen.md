# Seen on screen

Owner: screen-checker. What a person (or the checker) has actually looked at, per feature.
Verdict: looks right / broken / confusing / not reachable / never seen.

Seen on 2026-10-14 at version 5.31.1, desktop only, 1500x1000 headless, state set from the console where noted.
Screenshots over about 300 KB are kept on the worktree only (03, 11).

## Fourth pass, 14 October (version 5.34.0 on main dae7c2f, Arabic and the new Settings)
Screenshots in docs/screens/2026-10-14d/ (desktop 1500x1000). Over about 300 KB were not kept (02, 03, 04, 11). State set from the console: money, depth, stamps, hired Rafeeqs, a faked 3-hour gap. Arabic strings were still being edited by the localizer during this pass, so the English left in Arabic mode may shrink.

| Feature | Last seen | Version | Screenshot | Verdict | Note | Issue |
|---|---|---|---|---|---|---|
| Arabic dig screen and HUD (scene not mirrored, panels mirrored) | 2026-10-14 | 5.34.0 | docs/screens/2026-10-14d/01-ar-dig.png | confusing | Scene runs as in English; shop, Rafeeq box and pick pill are on the right, tabs and gold pill mirrored. But the level line, goal line, Museum chip, 'Your hit/Wooden' and 'Buy all' are still English. | #443 |
| Arabic drawer tabs | 2026-10-14 | 5.34.0 | not kept | looks right | Tab tooltips are Arabic ('المتجر', locked ones say what opens them). Icons only, so nothing to mirror. |  |
| Arabic shop card '{a} ← {b}' | 2026-10-14 | 5.34.0 | docs/screens/2026-10-14d/01-ar-dig.png | looks right | 'تراب: الضربات 6 ← 7': the arrow points left, from the old number (right) to the new (left), reads correctly. |  |
| Arabic Big Rock bar and stuck panel | 2026-10-14 | 5.34.0 | not kept (over 300 KB) | looks right | Bar text 'البوابة · الضربات الباقية: نحو 42.0K · 14 س' reads in order. Stuck panel text is right-aligned with Close on the left. The top goal line beside it is English. | #443 |
| Arabic canvas floaters 'بووم -{n}%' | 2026-10-14 | 5.34.0 | not kept (over 300 KB) | looks right | 'بووم -12%' and 'بووم -7%': word on the right, minus stays in front of the number. |  |
| Arabic level line | 2026-10-14 | 5.34.0 | docs/screens/2026-10-14d/01-ar-dig.png | broken | 'Level 1 of 20 · الجزيرة العربية · The Dunes': half English. In the map header it scrambles to '20 Level 10 of'. | #443 |
| Arabic almodeer / almodeera box and name plate | 2026-10-14 | 5.34.0 | not kept (over 300 KB) | broken | Lines are right-aligned, '!' and the full stop land on the left end, plates 'المدير' and 'المديرة' read well. But the Museum chip covers the box. | #444 |
| Arabic Rafeeq bubbles ending '!' and '؟' | 2026-10-14 | 5.34.0 | not kept (over 300 KB) | looks right | Marks sit at the left end of each bubble, as they should in right-to-left. |  |
| Arabic countdown shout '30 ثانية!' | 2026-10-14 | 5.34.0 | not kept (over 300 KB) | looks right | Shown in almodeer's box, digits and mark in the right order (box still partly under the chip). | #444 |
| Arabic Alqahwa and the hakawati story pane | 2026-10-14 | 5.34.0 | docs/screens/2026-10-14d/08-ar-alqahwa-story.png | confusing | Story pane right-aligned, 'التالي' and 'تخطَّ' mirrored, name plate 'الحكواتي' readable. The Stars menu under the room is all English, with full stops at the wrong end. | #443 |
| Arabic story book | 2026-10-14 | 5.34.0 | docs/screens/2026-10-14d/09-ar-book.png | looks right | Chapters and 'المرحلة N' buttons right-aligned, red 'جديد' marks, Close and the scroll bar on the left. |  |
| Arabic Settings: three switch lines | 2026-10-14 | 5.34.0 | docs/screens/2026-10-14d/05-ar-settings.png | looks right | Sound, Share my play times, Reduce motion lines all Arabic and readable; sliders mirrored with numbers on the left. |  |
| Arabic Settings: save-code box | 2026-10-14 | 5.34.0 | docs/screens/2026-10-14d/05-ar-settings.png | confusing | Heading, buttons and help line are right to left. The code itself is right-to-left too, so the last line sits at the right edge and the lines do not line up. | #445 |
| Arabic road map: pan buttons, chips, canvas signs | 2026-10-14 | 5.34.0 | docs/screens/2026-10-14d/10-ar-map.png | confusing | The scene is not mirrored (Arabia at the left) and the button on the right pans toward the right, so buttons agree with the picture. But the land chips run right to left (Arabia at the far right), opposite to the picture. Panel signs ('شرق آسيا / المراحل 9 إلى 12') are Arabic; node names and the info box are English. | #443 |
| English with ?lang=en | 2026-10-14 | 5.34.0 | not kept | looks right | Same screens read as before (settings, away card, drawer, bar). No script errors. |  |
| Settings save code: Show my code | 2026-10-14 | 5.34.0 | docs/screens/2026-10-14d/06-en-savecode.png | looks right | Fills the box (2692 characters), all of it selected, 'Select the text and copy it. Keep it somewhere safe.' (no clipboard in headless). |  |
| Settings save code: a bad, a cut, a good code | 2026-10-14 | 5.34.0 | docs/screens/2026-10-14d/06-en-savecode.png | looks right | Bad: red 'That does not look like a Dig code. Your save was not changed.'. Cut: red 'The code is cut or has a mistake in it...'. Good: white 'Level 1, 0 Stars, saved 10/14/2026.' with 'Replace my dig with this' and Cancel. |  |
| Reduce motion switch | 2026-10-14 | 5.34.0 | not kept (checked by numbers) | looks right | Off by default; on: 40-bit burst becomes 8, no shake, no flash, html gets 'calm'; off again restores 40, shake, flash. Choice is stored (0/1). Not seen as a picture. |  |
| Reduce motion default from the browser | 2026-10-14 | 5.34.0 | not kept | looks right | With the browser asking for less motion, a fresh profile starts On with 'calm' set; the player's choice then wins. |  |
| Play-times line in a fresh profile | 2026-10-14 | 5.34.0 | not kept | looks right | Reads 'Share my play times: Off'; with ?share=1 it reads On. |  |
| Away card at the Gate (Rock Friend) | 2026-10-14 | 5.34.0 | docs/screens/2026-10-14d/07-away-gate.png | looks right | After a simulated 3 h away: 42 m deeper, sieved 2 h 59 min, +104M, Rafeeq lines, then 'Your Rafeeqs dug to the Gate. It is waiting for you.' above 'Open the first chest'. The line is plain white and small, but easy to find. |  |
| Manager on a leg at 0 | 2026-10-14 | 5.34.0 | not kept (over 300 KB) | confusing | Countdown goes red '0:00 over' with a '-0:00' pill; almodeer says 'No time left! I will say it was on purpose.' But the Museum chip covers the first half of his line. | #444 |
| Museum edge arrow | 2026-10-14 | 5.34.0 |  | not reachable | Set a bone under the view, next to open cells; the crew dug on and both bones came into view (glint seen) before the arrow showed. Still needs a real play check. |  |
| Dark Gate lit / unlit tell | 2026-10-14 | 5.34.0 |  | not reachable | Not set up this pass. |  |

Console errors: only the favicon 404.

### First five minutes (Arabic, fresh save)
The screen is easy to read once the shop, Rafeeq box and pick pill sit on the right. A new Arabic player meets, in the first minute, a level line and a goal line in English, a Museum chip in English, and 'Buy all' in English; the Rafeeq Stars menu in Alqahwa is all English. The Arabic that is there (hint 'أشِر إلى الأرض لتحفر', bubbles, almodeer) reads well.

## Third pass, 14 October (version 5.33.0 on main 741db11, Chapter Two and #417)
Screenshots in docs/screens/2026-10-14c/ (desktop 1500x1000, 1366x768 for 03). State set from the console (road stamps, a run at the level, bossesDown to finish it). Shots over about 300 KB were not kept (night level 21, Empty Quarter, dark Gate try).
| Feature | Last seen | Version | Screenshot | Verdict | Note | Issue |
|---|---|---|---|---|---|---|
| Level-20 card "You found Grandpa's bell" | 2026-10-14 | 5.33.0 | docs/screens/2026-10-14c/02-bell-card.png | looks right | Chapter One stamp, the note, gold teaser, totals, Chapter Two line, big "Walk home". The stamp text crosses the arch icon a little. | |
| Level 21+ top line "Chapter 2, level N of 20" | 2026-10-14 | 5.33.0 | not kept | looks right | Reads "Chapter 2, level 1 of 20 - Europe at night - ..." (land name cut with dots at 1500 wide); level 37 reads "level 17 of 20". | |
| Lesson line at a level start with Stars held | 2026-10-14 | 5.33.0 | not kept | broken | "You have Stars. Spend them at t..." still cut under the gold rule, tabs sit on it. | #421 |
| Night sky (Europe at night, level 21) | 2026-10-14 | 5.33.0 | not kept | looks right | Dark blue sky, moon, small stars, castle and windmill dimmed. Ground still readable: light sand tops, dark brown blocks with clear edges and copper ore easy to see; stars are faint. | |
| Empty Quarter look (level 37) | 2026-10-14 | 5.33.0 | not kept | confusing | Orange sky, dune line and a row of small camels far away, light sand on top. But the blocks below are the same dark brown as every land, so it does not read as red dunes. | |
| World map: row of 11 panels, chapter two after the crossroads | 2026-10-14 | 5.33.0 | docs/screens/2026-10-14c/05-map.png | looks right | Eleven tabs (Arabia to The Empty Quarter) with Beyond between; night panels have moon and stars; level 21 glows with the Rafeeq on it. | |
| Map: Beyond crossroads side cards | 2026-10-14 | 5.33.0 | docs/screens/2026-10-14c/05-map.png | broken | Three side nodes overlap each other and their Museum chips at the left edge. | #422 |
| Walk 20 to 21 | 2026-10-14 | 5.33.0 | docs/screens/2026-10-14c/06-walk.png | looks right | After "Walk home" the map opens on level 21 with the Rafeeq at the node and a "Dig here" button (the move itself was over before my 1.4 s look). | |
| Storyteller book shows chapter two | 2026-10-14 | 5.33.0 | docs/screens/2026-10-14c/07-book.png | looks right | Chapters 6 to 10 (Home by Night to The Empty Quarter) follow chapter 5. The book window is small: only three chapters show at once and it scrolls. | |
| Level-40 caravan card | 2026-10-14 | 5.33.0 | docs/screens/2026-10-14c/09-caravan-card.png | looks right | "THE ROAD HOME" stamp, "You found Grandpa's caravan", 40 of 40, "Pick a card". | |
| Finish card at 1366x768 (teaser, chili lines) | 2026-10-14 | 5.33.0 | docs/screens/2026-10-14c/03-finish-1366.png | looks right | Card fits the window; the two big choices and Keep digging stay pinned, the middle scrolls (scroll bar visible). Teaser and "Next chili" line show. The next block peeks under Keep digging, a little untidy. (Fixes #415.) | |
| Top line after the Gate with Stars held | 2026-10-14 | 5.33.0 | docs/screens/2026-10-14c/04-bell-ring.png | looks right | "Below the Gate / Gate broken in 1:40", Done here and medals clear; no lesson line cut. (Fixes #414 after the Gate.) | |
| Alqahwa with no guests while the hakawati talks | 2026-10-14 | 5.33.0 | not kept | looks right | No "No Rafeeqs yet" line seen over him (text check, the story ran through Next). | |
| Level-20 bell hanging in Alqahwa, Story dot | 2026-10-14 | 5.33.0 | docs/screens/2026-10-14c/04-bell-ring.png | looks right | Brass bell hangs from a cord by the window; Story button shows 1 before the telling and no number after. I did not catch the wide swing. | |
| Hakawati name plate | 2026-10-14 | 5.33.0 | docs/screens/2026-10-14c/04-bell-ring.png | confusing | Tiny gold "The hakawati" on the red rug is hard to read. | #423 |
| Dark Gate lit/unlit tell, hint box vs layer banner | 2026-10-14 | 5.33.0 | | not reachable | My set-up could not move the camera to the Black; not looked at. | |
| Manager at 0 on a leg; Museum edge arrow | 2026-10-14 | 5.33.0 | | not reachable | Not set up this pass. | |

Console errors: only the favicon 404.

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
| Reduce motion switch (Settings) and calm mode | never | 5.33.4 | | never seen | Settings has a Reduce motion button after Share my play times. On: no shake, no screen flash, small sparks, still pulsing buttons. Check it starts On when the browser asks for less motion. | |

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
