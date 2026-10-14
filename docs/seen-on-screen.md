# Seen on screen

Owner: screen-checker. What a person (or the checker) has actually looked at, per feature.
Verdict: looks right / broken / confusing / not reachable / never seen.

Seen on 2026-10-14 at version 5.31.1, desktop only, 1500x1000 headless, state set from the console where noted.
Screenshots over about 300 KB are kept on the worktree only (03, 11).

## Eighth pass, 14 October (version 5.36.4 on main 998d940, lessons, goals and Camp)
Screenshots in docs/screens/2026-10-14h/ (zoomed top-line crops at 1366x768 unless named). Window sizes: the headless viewport is 1474x900 for "1500x1000" and 1340x668 for "1366x768". Lessons were requested from the console (`dig.app.lesson`, with the real game text), so each was seen as the game would draw it, but not reached by play. Line counts, boxes and overlaps were measured by script for all 18 lessons, English and Arabic, at both sizes. About 10 shots. The shot driver's Chrome was gone after every run (checked at the end).

| Feature | Last seen | Version | Screenshot | Verdict | Note | Issue |
|---|---|---|---|---|---|---|
| #475 Long lessons (crystal, grump, torch crate, "This relic has a partner"), English, 1366 and 1500 | 2026-10-14 | 5.36.4 | docs/screens/2026-10-14h/04-en-partner-1366-zoom.png | looks right | Whole text, no dots. At 1366 most take two lines (box y 53 to 83, stage starts at 94); at 1500 one line, only the torch crate and the partner lesson take two. No lesson in the game needs three lines. Gold bar on the left. | |
| #475 Same, Arabic, 1366 and 1500 | 2026-10-14 | 5.36.4 | docs/screens/2026-10-14h/02-ar-grump-1366-zoom.png | looks right | Whole text, right aligned, bar on the right, vowel marks (shadda, kasra) whole. A script says the box is a pixel or two short of its text on every Arabic lesson, but nothing is cut on screen. | |
| #475 Tips and the goal step aside, then come back | 2026-10-14 | 5.36.4 | | looks right | With Stars held: during a lesson Tips and the goal are display none, the level line, Gate note, clock and medals stay. They are back about a second after the lesson goes, and right after a click on it. A 72-letter lesson stays about 8.6 s if nothing else waits. | |
| #475 Lesson reaches the stage / Map and mute buttons | 2026-10-14 | 5.36.4 | docs/screens/2026-10-14h/03-ar-partner-1366-zoom.png | looks right | Box bottom 83 at most, stage top 94, nothing else under it. The Map and mute buttons are at x 1016 and up (Arabic: 194 to 286), far from the box. A three-line case does not exist in the game today, so that was not seen. | |
| #475 Reduce motion | 2026-10-14 | 5.36.4 | | looks right | With `calm` the lesson's animation is none (a plain show); without it, lessonIn (lessonInRtl in Arabic). Seen by numbers, not as a moving picture. | |
| #474 Star pointer after a New Site with Stars | 2026-10-14 | 5.36.4 | docs/screens/2026-10-14h/05-en-starptr-1366-zoom.png | looks right | 'Spend Stars at Alqahwa.' two lines, beside Tips, no dots. Arabic 'أنفق نجومك في القهوة.' two lines at 1366, one at 1500. | |
| #474 Star refund toast | 2026-10-14 | 5.36.4 | docs/screens/2026-10-14h/06-ar-refund-1366-zoom.png | looks right | 'Your Stars are back: 123K' and 'عادت نجومك: 123K': two lines at 1366, no dots, number whole. | |
| #474 First glass block lesson | 2026-10-14 | 5.36.4 | | not reachable | I found no lesson text for a glass block in the game files (only the glass pick lines 'Crack! The glass pick...'), so there was nothing to look at. | |
| #472 Stars sentence once; chip's own goal under the chip | 2026-10-14 | 5.36.4 | docs/screens/2026-10-14h/05-en-starptr-1366-zoom.png | looks right | The Stars line shows once, beside Tips. Under the chip: 'The Gate of The Dunes ...' (the Gate goal, cut with dots at 1366). The old 'You have Stars. Spend them at...' line is gone (now the pointer above). | |
| #472 Arabic Second Pick goal keeps '3.00K / 12.0K' whole | 2026-10-14 | 5.36.4 | docs/screens/2026-10-14h/07-ar-pick2goal-1366-zoom.png | looks right | 'المعول الثاني: 3.00K / 12.0K', label on the right, count to its left, chip inside the stage (right edge 712 of 712). English: 'Second P... 3.00K / 12.0K', label cut, numbers whole. Same at 1500. The Arabic chip's arrow looks like an up chevron, not a pointer to the left (small, not sure). | |
| #468 Camp track plain step | 2026-10-14 | 5.36.4 | docs/screens/2026-10-14h/08-ar-camp-1366.png | looks right | English: title 'Rafeeq hit +2%', line 'Rafeeq hit: 70% of yours, then 72%.' (60% then 62% at the first plain step). Arabic 'ضربة الرفيق +2%' and 'ضربة الرفيق: 70% من ضربتك، ثم 72%.' with the numbers in order; the last '72%.' wraps onto a line of its own. | |
| Dark Gate lit / unlit tell | 2026-10-14 | 5.36.4 | | not reachable | Not set up this pass. | |
| Museum edge arrow | 2026-10-14 | 5.36.4 | | not reachable | Not set up this pass; it still needs a real play check. | |

Console errors: only the favicon 404.

### First five minutes (English, fresh save, 5.36.4)
What a new player trips on first: (1) the first lessons now read whole, but on a laptop two lines of gold text push Tips and the goal away for 3 to 9 s, so the goal vanishes just when it is useful; (2) the 'Next: Stronger Pick, 15 coins.' line in the drawer and the lesson are the same colour and weight, so the eye jumps between two lines; (3) at 1366 the goal under the chip is cut ('The Gate of The Dunes ...') so the number of metres is only in the small 'N m to the Gate' note.

## Seventh pass, 14 October (version 5.36.0 on main 8fbc177, the top line fits, Arabic order, Camp)
Screenshots in docs/screens/2026-10-14g/ (1366x768 unless named). Over about 300 KB were not kept (level 37 at 1500 and 1366 in English and Arabic, the clock-over shot, the Wardrobe). Window sizes: the headless viewport is 1474x900 for "1500x1000" and 1340x668 for "1366x768". State set from the console (a level-37 site, bossesDown, road stamps, picks.pin, a toast). Positions were also measured by script. About 14 shots.

| Feature | Last seen | Version | Screenshot | Verdict | Note | Issue |
|---|---|---|---|---|---|---|
| #466 Top line at level 37, toast + Tips + goal chip, English, 1366 and 1500 | 2026-10-14 | 5.36.0 | not kept (over 300 KB) | looks right | Stage 194 to 712; the chip ends at 712 (its right dots at 703 and 712), the goal words end at 712. The gold 'Next:' line starts at 728. Level line ends in dots ('The Emp...'), 'Gate at N m', clock and medals whole. Message line is two lines ('Found: Tail (1 / of 4)'). | |
| #466 Same, Arabic, 1366 | 2026-10-14 | 5.36.0 | not kept (over 300 KB) | looks right | Mirrored: chip at 626 to 712 inside the stage, drawer words start at 794. Gate note, clock and medals whole and read from the right. | |
| #466 Museum tab open at level 37 | 2026-10-14 | 5.36.0 | docs/screens/2026-10-14g/04-en-museum-1366.png | looks right | Chip inside the stage; 'Dig up bones to fill the sets.' sits clear above the first card. | |
| #466 Clock over time (144:14 over) | 2026-10-14 | 5.36.0 | not kept (over 300 KB) | looks right | The chip is squeezed to 'Th...' with its arrow and dots, still inside the stage; Tips and the toast stay apart. | |
| #466 After the Gate | 2026-10-14 | 5.36.0 | docs/screens/2026-10-14g/06-en-done-1366.png | looks right | 'Below the Gate', 'Gate broken in 0:00', medals and 'Done here' all whole; the chip is gone. | |
| #466 Fresh save: first hint vs 'A new site!' banner | 2026-10-14 | 5.36.0 | not kept | looks right | The hint fades to 0 while a banner shows, back to full about 3.5 s later. On a plain fresh save no banner shows at all. | |
| Lesson sentence twice in the top line | 2026-10-14 | 5.36.0 | docs/screens/2026-10-14g/04-en-museum-1366.png | confusing | With Stars held the same line 'You have Stars. Spend them at the Alqahwa.' shows beside Tips and again under the chip, both cut with dots. | #470 |
| #465 Arabic level line | 2026-10-14 | 5.36.0 | docs/screens/2026-10-14g/08-ar-goal-zoom.png | looks right | Starts at the right: 'الفصل 2، المرحلة 17/20 · الربع ال...', numbers in order; the Gate note, clock and medals run right to left. | |
| #465 Arabic lesson line starts at the right | 2026-10-14 | 5.36.0 | docs/screens/2026-10-14g/08-ar-goal-zoom.png | looks right | 'معك نجوم. أنفقها في...' begins at the right edge. | |
| #465 Arabic Second Pick goal 'a / b' | 2026-10-14 | 5.36.0 | docs/screens/2026-10-14g/09-ar-goal-zoom2.png | broken | Text is in order but too long for one line: the player sees 'المعول الثاني: 3.00K /', the target '12.0K' sits on a hidden second line. | #469 |
| #463 Finish card of level 4: next-level box | 2026-10-14 | 5.36.0 | docs/screens/2026-10-14g/10-en-l4-card.png | looks right | 'Level 5 starts with ... Level 5 of 20, Gate at 100 m, New: crystal lines' (at 1366x768 the box is hidden by design). The words are 'Level 5 starts with', not 'Next: Level 5'. | |
| #463 Map stones 5 and 7 | 2026-10-14 | 5.36.0 | docs/screens/2026-10-14g/11-en-map.png | looks right | Stone 5: 'New: crystal lines'. Stone 7 (clicked): 'New: the Black, always dark', 'Finish level 6 first.' | |
| #463 Goal chip tip and tap | 2026-10-14 | 5.36.0 | | looks right | English: 'Goal: The Gate. Tap for the next goal.'; Arabic 'الهدف: البوابة. اضغط لتنتقل إلى الهدف التالي.'; a tap steps to Second Pick. | |
| #467 Camp plain steps raise the Rafeeq share | 2026-10-14 | 5.36.0 | docs/screens/2026-10-14g/12-en-camp.png | confusing | Shop card 'Rafeeq hit' rises 60 (steps 0 to 3), 62, 64, 68 (step 10), 70, 72, 74 (step 14), so plain steps count. But the Camp menu says only 'Rafeeq perks: waiting at the start, good shoes, a second kettle'; the share shows only on the shop's Hire card, never on the Camp. | |
| Wardrobe | 2026-10-14 | 5.36.0 | not kept (over 300 KB) | looks right | The Wardrobe button in Alqahwa closes it and opens 'Dress your Rafeeqs' in the Rafeeqs tab: All / This Rafeeq, hat, clothes, colour, cloth, Surprise me. | |
| Dark Gate lit / unlit tell | 2026-10-14 | 5.36.0 | | not reachable | Not set up this pass. | |
| Museum edge arrow | 2026-10-14 | 5.36.0 | | not reachable | Not set up this pass. | |

Console errors: only the favicon 404.

### First five minutes (English, fresh save, 5.36.0)
What a new player trips on first: (1) with Stars held the same 'Spend them at the Alqahwa' sentence is printed twice in the top line, both cut (#470); (2) in Arabic the Second Pick goal loses its target number (#469); (3) the Camp's Rafeeq share cannot be seen on the Camp itself, only on the shop's Hire card.

## Sixth pass, 14 October (version 5.35.5 on main e00e007, text floor, Arabic order, red sand)
Screenshots in docs/screens/2026-10-14f/ (1500x1000, and 1366x768 where named). Over about 300 KB were not kept: the Empty Quarter start (level 36 to 37 without a reload), the Arabic level 37 top line, the Arabic Rock bar, the 3-Rafeeq crew and bubble shots at 1366, the night-after-day shot. State set from the console (road stamps, a teleport to just above the Gate, hired Rafeeqs, a fake finished run). About 14 shots. A script found no HTML text under 13 px on every screen below; canvas text was judged by eye.

| Feature | Last seen | Version | Screenshot | Verdict | Note | Issue |
|---|---|---|---|---|---|---|
| #457 Empty Quarter (level 37 from 36, no reload) | 2026-10-14 | 5.35.5 | not kept (over 300 KB) | looks right | Lit rows red-orange, unlit rows dark brick red, darker going down; copper ore on the lit rows is easy to read. Orange sky and camels as before. | |
| #457 Night land right after a day land (level 20 to 21) | 2026-10-14 | 5.35.5 | not kept (over 300 KB) | looks right | Dark blue sky, moon, castle and windmill; the sand top and brown rows stay readable. | |
| #457 Top line: toast, Tips and goal chip together | 2026-10-14 | 5.35.5 | docs/screens/2026-10-14f/03-en-l37-1366.png | broken | The toast, Tips and 'The Gate' chip all show, and 'Gate at N m' is whole (it also fits in Arabic). But the chip and goal words are laid out 95 to 215 px outside the stage and sit on the drawer's gold 'Next: ...' line; at 1366 the goal words are also cut by the first drawer button. Same in the Museum tab shot. | #461 |
| #457 Tapping the goal chip steps the goal | 2026-10-14 | 5.35.5 | docs/screens/2026-10-14f/03-en-l37-1366.png | looks right | The button inside steps 'The Gate' to 'Second Pick' and back, and the dots flip (10 to 01). Tapping the box around it does nothing. While a lesson is showing, the goal line stays the lesson, so a step is only seen on the chip. | |
| #457 Three Rafeeqs talking at 1366 | 2026-10-14 | 5.35.5 | not kept (over 300 KB) | looks right | Three lines sent at once: two show, stacked one above the other, no overlap; the third waits. almodeera's own bubble sits apart. Rafeeq bubbles did not show on their own in 14 s, I forced them. | |
| #457/#450 Manager name plate and countdown pill | 2026-10-14 | 5.35.5 | not kept (over 300 KB) | looks right | Plate in the sky band, under his feet, clear of the pill above his head; both 'almodeer' and 'almodeera' plates. Small Museum chip under the depth sign, clear. | |
| #457 Alqahwa with no Rafeeqs: strip under the room | 2026-10-14 | 5.35.5 | docs/screens/2026-10-14f/06-en-alqahwa-empty.png | looks right | 'No Rafeeqs yet. Hire one and they will come here to rest.' on a dark strip under the room, nothing over the hakawati; 'The hakawati' plate readable. | |
| #457 Settings save-code box aria-label | 2026-10-14 | 5.35.5 | | not reachable | Set in code (savecode-ui.js line 16); I did not open the box in this pass. | |
| #450 Track line, goal two lines max | 2026-10-14 | 5.35.5 | docs/screens/2026-10-14f/03-en-l37-1366.png | confusing | Nothing is cut in the level line or 'Gate at N m'; the goal words are one line and clipped under the drawer at 1366 (see #461). | #461 |
| #450 Map labels | 2026-10-14 | 5.35.5 | docs/screens/2026-10-14f/07-ar-map.png | looks right | Land chips, panel signs, node names and depths, all readable and apart. | |
| #450 Alqahwa name tags, Star board | 2026-10-14 | 5.35.5 | docs/screens/2026-10-14f/05-ar-alqahwa-3.png | looks right | Name tags readable, Star board prices and steps readable at 1366. The Wardrobe window was not opened in this pass. | |
| #450 Museum hall (drawer tab) | 2026-10-14 | 5.35.5 | docs/screens/2026-10-14f/11-en-museum.png | looks right | Set names, bone lines and prizes all readable; the list scrolls. The 'Dig up bones...' line collides with the goal chip (#461). | #461 |
| #450 Finish card at 1366 (Arabic) | 2026-10-14 | 5.35.5 | docs/screens/2026-10-14f/12-ar-finish-1366.png | looks right | Fits, middle scrolls, big button and 'Keep digging' pinned. With my faked run the '+0 stars' line sits half hidden behind the pinned block until scrolled. | |
| #456 Arabic level line, Chapter 2 | 2026-10-14 | 5.35.5 | docs/screens/2026-10-14f/13-ar-levelline-zoom.png | broken | The line is left-to-right: from the right it reads 'الكثبان · الفصل 2، المرحلة 20/17 · الربع الخالي'. Land name in the wrong place and the count backwards. English says 'Chapter 2, level 17/20'. | #462 |
| #456 Arabic road map level names and signs | 2026-10-14 | 5.35.5 | docs/screens/2026-10-14f/07-ar-map.png | looks right | 'الفصل الثاني، المرحلة 3 من 20', 'أوروبا ليلاً، المراحل 1 إلى 4', node names, 'المتحف: الجمل العجوز، وجدت 0 من 4' all in order. | |
| #456 Arabic Alqahwa names and bubbles | 2026-10-14 | 5.35.5 | docs/screens/2026-10-14f/05-ar-alqahwa-3.png | looks right | Names read well; story pane marks at the left end. | |
| #456 Arabic Tips list | 2026-10-14 | 5.35.5 | docs/screens/2026-10-14f/14-ar-tips.png | looks right | Right-aligned, both lines read in order; the box covers the Museum chip while open. | |
| #456 Arabic Rock bar line | 2026-10-14 | 5.35.5 | not kept (over 300 KB) | looks right | 'البوابة · الضربات الباقية: نحو ...' reads in order on the bar. The numbers were silly (my teleport), so the end of the line was not judged. The warning line (dark, hot) was not seen: no cure above the Rock in my set-up. | |
| #456 Arabic Museum chip side spot; Gate and record flags; boom pop-up | 2026-10-14 | 5.35.5 | | not reachable | Centre chip seen in the right order ('الجمل العجوز / وجدت 0 من 4'); the side chip, flags and the pop-up were not set up this pass. | |
| Dark Gate lit / unlit tell | 2026-10-14 | 5.35.5 | | not reachable | Not set up this pass. | |
| Museum edge arrow | 2026-10-14 | 5.35.5 | | not reachable | Not set up this pass. | |

Console errors: only the favicon 404.

### First five minutes (English, fresh save, 5.35.5)
What a new player trips on first: (1) a gold 'Next: ...' line above the drawer and the goal chip draw on each other once the chip shows (#461); (2) the 'A new site! You now have N Stars.' floater runs across the middle of the ground over 'Point at the ground to dig' for about two seconds; (3) in Arabic the level line reads in the wrong order (#462).

## Fifth pass, 14 October (version 5.35.2 on main 5a7dec0, full Arabic and the layout fixes)
Screenshots in docs/screens/2026-10-14e/ (desktop 1500x1000; 1366x768 for the crew shots). Over about 300 KB were not kept (crew shots at both sizes, relics and fuse, Empty Quarter, deep). State set from the console (crew, bones, relics, stars, a level-37 site, fired events). About 16 shots. Text checks: every Arabic screen listed was scanned for English words and found none; `node scripts/dig-i18n.mjs` shows 2196/2196.

| Feature | Last seen | Version | Screenshot | Verdict | Note | Issue |
|---|---|---|---|---|---|---|
| #444: 3 Rafeeqs, English and Arabic, 1500x1000 and 1366x768 | 2026-10-14 | 5.35.2 | not kept (over 300 KB) | looks right | Small Museum chip under the depth sign; almodeer's box, his countdown pill and the pill stay clear in all four. Bubbles can still overlap each other at 1366 (two Rafeeq lines on top of each other). | |
| #444: 2 Rafeeqs, full chip at top centre | 2026-10-14 | 5.35.2 | not kept | looks right | 'Old Camel / 0 of 4 found', big, in the middle, nothing under it. | |
| #444: a new piece while the chip is small | 2026-10-14 | 5.35.2 | not kept | looks right | The chip grows to '1/4' and stays clear of the box; 'Found: Tail (1 of 4)' shows in the top line. But the 'The Gate' / 'Museum set' pills sit on the 'Gate at 50 m' note and cut it. | #453 |
| #445: Arabic 'Show my code', lines start at the left | 2026-10-14 | 5.35.2 | docs/screens/2026-10-14e/06-ar-code.png | looks right | Direction ltr, text-align left, every line starts at the left edge; heading, buttons and help line stay right to left. The box has no aria-label. | #454 |
| Arabic Museum chip, canvas | 2026-10-14 | 5.35.2 | docs/screens/2026-10-14e/09-ar-chip-zoom.png | broken | Count line reads '4 وجدت 0 من' (should be 'وجدت 0 من 4'). | #451 |
| Arabic Museum tab: set cards, «تمّ», jar line | 2026-10-14 | 5.35.2 | docs/screens/2026-10-14e/07-ar-museum.png | looks right | Cards right-aligned, «تمّ» in green at the left, '4 من 5' correct. The jar line shows only after the Giant Scarab is done; its text is in the table but I did not see it on screen. | |
| Arabic road map: land chips, Museum line | 2026-10-14 | 5.35.2 | docs/screens/2026-10-14e/12-ar-map.png | looks right | Chips run Arabia (left) to Empty Quarter (right), as the picture does; node names and the info box all Arabic, 'المتحف: الجمل العجوز، وجدت 0 من 4' reads in order. | |
| Arabic Lamp wish card | 2026-10-14 | 5.35.2 | docs/screens/2026-10-14e/11-ar-wish.png | looks right | Title, 'اختر واحدة.' and three option cards (first at the right) all Arabic. | |
| Arabic Relics: Recipe Book and Fuse button | 2026-10-14 | 5.35.2 | not kept (over 300 KB) | looks right | 'كتاب الوصفات', '17 من 1', 'لم تكتشف بعد', purple 'ادمج 1' button and the hint line all Arabic. The hint is two lines and a little cramped at the top. | |
| Arabic Forge tab and tools | 2026-10-14 | 5.35.2 | docs/screens/2026-10-14e/08-ar-forge.png | looks right | 'المثقاب · مستوى 0', 'يحفر عموداً عمقه 6 كتل...', metals line all Arabic. The tool bar and tooltips did not appear in my set-up (no tool bought), so tooltips not seen. | |
| Arabic deep toasts and canvas floaters | 2026-10-14 | 5.35.2 | not kept (over 300 KB) | looks right | 'طاخ!' with the mark at the left, toast 'مظلم جداً!' fine. The shove floater faded before the shot. | |
| Arabic 'Buy all', clock line, level line, goal line | 2026-10-14 | 5.35.2 | not kept (over 300 KB) | looks right | 'اشترِ الكل (24)', 'السرعة: أقل من 5:00', 'ف2، المرحلة 17/20 · الربع الخالي · الكثبان', 'بوابة الكثبان على عمق 300 م': no English left, order right. 'ف2' for chapter 2 is short but readable. The Buy-all toast was not seen. | |
| Arabic Alqahwa and the Stars board (2.56T) | 2026-10-14 | 5.35.2 | docs/screens/2026-10-14e/14-ar-alqahwa-stars.png | looks right | All Arabic now (menu, steps, prices, buttons). Pill width stayed 100 px while Stars changed from 2.34T to 2.56T; gold fill and number readable. 'لا رفقاء بعد' line still sits over the coffee sign. | |
| Empty Quarter look (level 37) | 2026-10-14 | 5.35.2 | not kept (over 300 KB) | confusing | Orange sky, dune line, camels far away, red-orange top; but blocks below the top two rows are still the usual dark brown, so they do not read as red sand. | #452 |
| Dark Gate lit / unlit tell | 2026-10-14 | 5.35.2 | | not reachable | Not set up this pass. | |
| Museum edge arrow | 2026-10-14 | 5.35.2 | | not reachable | Not set up this pass; still needs a real play check. | |

Console errors: only the favicon 404.

### First five minutes (Arabic, fresh save, 5.35.2)
No English is left on the dig screen, the drawer, the map, the Museum, Relics, Forge, Alqahwa or Settings. What a new Arabic player trips on first: (1) the 'Museum chip' count line is in the wrong order; (2) the top line is crowded when a toast, the Tips button and the pills all show at once; (3) 'ف2' in the level line and the small bubbles that overlap at 1366 wide.

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
