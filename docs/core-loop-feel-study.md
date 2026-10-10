# The first hour of the new loop: a feel study

Subject: `http://localhost:8101/?loop=2` serving `main` (971a246), played 10 Oct 2026 in Chrome,
1920x897 window. All times are minutes:seconds of real time since the fresh save was loaded.
Nothing in the game was changed for this study.

## 1. The finding in one paragraph

The game has one thing a person understands by watching it (pumps that make pumps, and a number
that climbs) and it interrupts that thing, 100 seconds in, to hand the player four more systems
they can only understand by reading. Between 1:40 and 3:40 of my first run a crew, a Tower, a Mine,
Materials, Grades, Orders, five Fractions, Vials and a Collection all arrived, none of them because
of anything I had done, each with a paragraph, and the reward for following the guide through them
was +1.5% to tapping and a 30 minute timer. After that the screen never again agreed with itself
about what to do: the biggest object says "Tap", the gold bar says "Buy", the brightest button is a
third thing, the progress bar is full while the guide says 0 of 12, every locked button says "in 5
h", and when I sat back and watched, as an idle game invites, my income dropped by a third. The
guide does not teach; it reads out the name of the next system and points at it. So the player
follows orders without ever forming the picture "I do this here, so that goes up there", and the
moments that should have felt like rewards (the first doubling, the first New Well, the first
Gusher, which paid 0 Crude) pass with a line of small text. It is not too deep. It is that the
depth is delivered as vocabulary instead of as cause and effect, too early, on a screen where
nothing is clearly the main thing.

## 2. The session log

### How each part was reached

| Part | How | Continuous? |
|---|---|---|
| Desktop run, 0:00 to 21:30 | Real mouse clicks, real waits, no console use except reading a stopwatch | Yes, one unbroken stretch from a wiped save through the first New Well and 3 minutes of run 2 |
| Phone run (375x780 iframe), 0:00 to 9:30 | Real clicks in the iframe, real waits | Yes, one unbroken stretch from a second wiped save |
| Mid game, late game, Arabic | Console (`coreLoop.state`, `coreLoop.api.act`) | Not played; reached by editing state |

What I could not perceive at all: sound, and any animation shorter than the gap between a click and
the screenshot after it (roughly 0.3 to 1 s). When I say "nothing happened" below, it means nothing
was still on the screen a moment later.

One harness note that is also a finding: "Start the preview over" needs its second tap within 4
seconds, but after the 4 seconds are up the label can still read "Tap again to wipe". My first three
tries armed it, waited, tapped again and only re-armed or disarmed it. A person who reads the
confirm text before tapping will hit this.

### Desktop, minute by minute

**0:00 The welcome card.** "You run an oil well. 1. Pumps make Crude. Crude buys more pumps. 2. The
gold bar at the top always says what to do next. 3. The rest of the game opens one part at a time."
Clear. I knew what I was (someone with an oil well). I did not know why I would want more Crude.
Felt: fine, calm.

**0:10 The Well, first look.** What is on the screen: header "Crude 50 0/s", two chips "Hands-on"
and "Da'sa x1.03", a gold bar "NEXT 1 OF 13: Buy your first Bucket", a large glowing barrel labelled
"Tap the well", "0 Crude every second", a meter "Da'sa" with the line "Da'sa x1.03: the Well runs
x1.02 while you keep tapping", then a Bucket row with "You have 0", "Each one makes 1.02 Crude per
second", "x2 in 10 more", a gold "Buy 1 44.67 Crude" and a grey "Buy 10 (to the x2) 446.68 Crude
need 396.68 more", and a dashed box "Opens with your first Hand Pump."
- First reading, wrong: the game is a clicker and my job is to tap the barrel. It is the biggest,
  brightest, most central thing, and it says "Tap". The bar at the top says to buy a Bucket. Two
  different instructions before I have done anything.
- First reading, wrong: "Da'sa" is a place or a person. Nothing says it is a heat meter. It already
  read x1.03 because pressing "Start" on the welcome card counted as a tap.
- "x1.03" next to "x1.02" in one sentence: two multipliers for one thing, neither explained.
- "Each one makes 1.02 Crude per second": why 1.02? (Because Da'sa is already applied to it. The
  number on the thing I am about to buy changes every second, before I own one.)
- "44.67 Crude": an odd price. "(to the x2)": to the what?
- "Every pump makes the one before it": I read it twice. Before what?
- "Opens with your first Hand Pump": what opens?
Counted: 9 terms or numbers I could not place, on the first screen.

**0:20** Tapped the barrel 5 times. Crude 50 to 55. One Crude a tap, a Bucket costs 45. So tapping
is nearly worthless, yet it is the biggest thing on the screen. Felt: mild "is that it?".

**0:35** Bought the Bucket. Rate 0 to 1.16/s. The bar moved to "2 OF 13: Tap the well 10 times,
5/10" (my earlier taps counted). A Hand Pump row appeared reading "Buy 1 3.98K Crude **in 58 min**"
and "Buy 10 ... **in 10 h**". Bucket: "in 28 s".
- First reading, wrong and important: the next thing in this game is an hour away. I did not know
  the estimate would collapse as my rate grew. Every un-affordable button in the game carries one of
  these, and for the first ten minutes they read in hours ("in 5 h", "in 42 h", "in 70 h").
- Da'sa climbed from x1.31 to x1.42 while I only watched. I thought tapping heated it. (Any click
  anywhere, any key, any scroll does.)

**1:00 to 1:40** Tapping 15 times between purchases, buying Buckets at 44.67 each (flat price).
Rate 2.9, then 6, then 9. This stretch feels like a normal clicker and is fine.

**1:40 Something appeared.** A tab bar slid in under the header: "Well | Fields [new]". The whole
page moved down about 45 px under my cursor. The bar at the top still said "Own 10 Buckets" and said
nothing about Fields. Why did it appear? I did not know (rule: 5 Buckets bought). I clicked it,
because it said "new".

**1:50 Fields, first look.** As soon as I opened it a third tab appeared: "Refinery [new]".
On the screen: "Your crew works one Field at a time and hauls Materials. Pick the Field your Orders
ask for." Two boxes "Tower: Your crew is here" and "Mine: Opens when you visit the Refinery." A card
"Tower, Grade 1, Your crew is working, Any tap keeps them going. They rest 30 seconds after your
last tap, [29 s left], Level 1, Next level in 1:32, 9.5 levels to Grade 2, 35.1 Materials hauled
here, Hauling +0.4 a second, [Keep them going], Da'sa x2.00 (a red bar this time), Da'sa builds
while they work, up to x2 after 60 seconds..." A second card "Materials: Orders in the Refinery ask
for Materials. Grade 1 35.1 [Spend them in the Refinery]". "Opens with your first Order." And at
the bottom "Bosses, digging and crops stay in the current game."
- First reading, wrong: a Tower? In an oil game? I have a crew? Since when? They already hauled 35
  "Materials" of nothing in particular. I had done nothing to cause any of it.
- "Level" and "Grade" on one card, with "9.5 levels to Grade 2". Two ladders, one fractional.
- The one gold button is "Keep them going". I pressed it. Nothing changed: the countdown already
  read 29 s because walking to the button reset it. The primary button of the screen has no visible
  effect.
- "They rest 30 seconds after your last tap" with a countdown: I read this as "the game stops if I
  stop". In an idle game.
- Da'sa is here again, red instead of gold, explained differently ("builds while they work" here,
  "while you keep tapping" on the Well).
- New terms on this one screen: Fields, crew, Materials, Tower, Mine, Grade, Level, Orders,
  Refinery, hauling, rest. Eleven.
Felt: this is the moment the game stopped being "an oil well" and became "a control panel".

**2:20** "Show me" took me back to the Bucket row. A "Pressure" box had appeared at the bottom of
the Well ("Every level: all Crude x1.125. Buy a level 1.00K Crude in 60 s"). Bought the last 3
Buckets with "Buy 3 (to the x2)".

**2:25 The first reward, and the first wall, in the same second.** Rate 15 to 30/s: the tenth
Bucket doubled them all. I did not see any celebration in the frame after the click. In the same
frame the Bucket buttons changed to "Buy 1 **446.68K** Crude **in 5 h**" and "Buy 10 4.47M Crude in
42 h". The thing I had been buying for 45 now cost 446,680.
- First reading, wrong: I broke it, or Buckets are finished. (The price steps x10,000 at each tenth
  unit. Nothing on the screen says so in advance; "x2 in 3 more" only promises the good half.)
- Also new in this second: a "This run" box, "936.32 of 1.00M Crude: a New Well starts paying
  Reserves here", with its bar already half full at 0.09% of the target (it is a log bar). And the
  gold bar jumped from step 3 to step 5, "Fill your first Order: An Order takes Materials and gives
  a multiplier you keep", skipping a step I never saw.
New terms in this second: Pressure, This run, New Well, Reserves, Order.

**2:50 Refinery, first look.** Three Order cards, each about five lines: "Gas Order. Wants 45 Tower
Materials, grade 1 or better. You have 56 of 45. Gives you: Gas +1 level. It speeds up your hand
work (taps, Heat, digging) by 1.5% (x1.000 to x1.015). [Fill]". Next to it Naphtha (wants Mine
Materials) and Kerosene (wants Oasis Materials). Below: "Your Fractions": Gas, Naphtha, Kerosene,
Diesel, Bitumen, each "Powers ...". A toast: "New: the Mine".
- The reward for the first Order is 1.5% on "hand work (taps, Heat, digging)". There is no digging.
  "Heat" is a third name for Da'sa. And 1.5% of tapping, which is already worth nothing.
- "(x1.000 to x1.015)": the screen is talking like a spreadsheet.
- New terms: Fraction, Gas, Naphtha, Kerosene, Diesel, Bitumen, Oasis, Heat, Away rate. Nine.

**3:15** Pressed Fill. "Order filled! Gas went from x1.000 to x1.015. You also got a Vial offer."
The slot I just emptied now reads **"New Order in 29 min 58 s"**. A Vials section appeared: "Offer
one Material you hold to try to unlock its Vial, a lasting bonus to the Fraction that Field powers.
Offers left: 4. New offers come every day and with every Order you fill. Tower grade 1: 30% a try;
sure on try 4 (misses: 0) [Offer 1]". And "Opens after 3 Orders."
- Felt: I did what the bar asked and my reward was a 30 minute timer. (This is a clock gate. See
  the diagnosis.)
- Vials read as a slot machine with a pity counter, met at minute 3 with no reason to want one.

**3:40** Pressed "Offer 1" because it was gold. "Vial found: Tower, grade 0." (the card says
"Tower grade 1"). Kerosene went to x1.050. So one lucky click gave three times the bonus of the
Order the guide walked me to. A fifth tab appeared: "Collection [new]". It holds "Vials 1 of 3
found" and "Mastery: 0 of 12 skills ranked. Nothing found yet." Nothing to do there.

**4:10 Two gold things disagree.** Back on the Well the bar said "6 OF 13: Buy a Hand Pump". The
Hand Pump button was grey with a thin gold outline, "in 51 s". Directly under it a full-width solid
gold button: "Buy a level 1.00K Crude" (Pressure). I pressed the gold one. Rate 30 to 33.75; the
Hand Pump moved to "in 66 s"; the next Pressure level is 10.00K. Was that a mistake? I could not
tell.

**4:30 The number went down.** I waited for the Hand Pump without touching anything for about 35
seconds. The rate fell from 33.75 to 22.5. The chips changed from "Hands-on, Da'sa x2.00" to
"Watching". The meter emptied and read "Tap to heat up". Every "in N" estimate got longer.
- This is the first time in the session I did what an idle game invites (sit and watch) and the
  game took a third of my income away for it. It reads as a penalty, not as a bonus that ended.

**5:00** Bought the Hand Pump. Buckets began to count up by themselves: "You have 13", "17.26",
"20.75", "32.01". This is the best moment of the first five minutes: I can see one thing making
another. The bar jumped 6 to 8 (step 7, Pressure, was already done): "Pump until a New Well pays 12
Reserves. Reserves multiply everything and are never lost. More Crude this run means more Reserves.
0 / 12". Also new: a Wanet row ("the pickup that hauls the barrels", 707.95K, "in 6 h"), a "Buy
everything" button with a line of rules under it, a toast "New: Buy everything at once", and a
dashed box "Opens when burning the lower pumps is worth it."
- "Pump until a New Well pays 12 Reserves": I did not know what a New Well was. Nobody had said it
  is a reset.
- "Show me" on this step scrolls to the top and puts a gold outline around the rate number. There
  is nothing to press. The step means "wait".

**5:45 to 9:45 The long middle.** Press "Buy everything" every ten seconds. Rate 99, 156, 405,
8.0K, 15K. This is pleasant in the way any idle game is. But for these four minutes the gold bar
read "0 / 12" and did not move, because Reserves stay at 0 until a run passes 1.00M Crude. The only
moving progress was the "This run" bar, which was 50% full at 936 Crude and 72% full at 20K: it
looked nearly done for the whole stretch.
- At 9:20 "Buy everything" spent 446K, most of what I had, on one Bucket worth +4/s to a 9,000/s
  Well, while I was 60 seconds from a Wanet. The button is called "everything" and I trusted it.
- While I read the screen without clicking, the rate dropped 8.0K to 6.4K ("Watching") again.

**9:45 The milestone that was not.** "1.24M of 1.00M Crude: a New Well starts paying Reserves
here." The bar was full. Nothing else changed. The gold bar still read 0 / 12. No Expand tab. At
11:00 it read "2.18M of 1.00M" and still 0 / 12.

**10:10** Bought a Wanet. Hand Pumps began counting up, Buckets faster. A Derrick row appeared. The
cascade is the game's real toy and it is satisfying to watch. It is also the only thing in the
first 17 minutes that I understood by seeing it rather than by reading about it.

**12:00** "Expand [new]" appeared between Refinery and Collection (Collection moved right). The
"This run" box changed to "A New Well would pay 1 Reserves. It needs 12 Reserves. [Open Expand]"
and its bar, which had been full for two minutes, dropped to 8%. The box grew, so "Buy everything"
moved down 60 px and my next three clicks on it hit empty space.

**12:20 Expand, first look.** "Start over, stronger. A New Well resets only the Well." Three plain
rows: YOU GET "+1 Reserves. All your Crude x1.10." STARTS OVER "Crude, pumps, Pressure and Shabb
al-Daw." YOU KEEP "Fields, Materials, Orders, Mastery, your Collection and every Reserve you have."
"1 of 12 Reserves, the least a New Well pays." This is the clearest screen in the game. Two snags:
"Shabb al-Daw" is something I have never met, listed among the things I will lose; and the tab is
called "Expand" while everything on it is called "New Well".

**12:30 to 16:48** More of the same loop. Reserves 3, 5, 6, 7, 8, 9, 10, 12 of 12. Along the way:
- 14:00 Fields again: Mine and Oasis are now tabs; a Mastery panel has appeared: "School of Saif.
  Field power x1. Sword strikes UNRANKED 0.09 of 0.25 hours to Novice. Caravan guard..." Sword
  strikes, in an oil game. The Mine has "School of Ard: Pickaxe, Dynamite"; the Oasis "School of
  Nakhl: Harvesting, Planting, Watering, Cross-breeding".
- Clicking the Mine tab to look at it moved my crew there. Looking is committing.
- 15:40 Refinery: the banner "Order filled! Gas went from x1.000 to x1.015" from minute 3 was still
  up. "New Order in 17 min 26 s." I tried a Mine Vial: it missed, and the only sign was "misses: 1".
- A Pipeline row appeared. The Well page is now barrel, This run, five pump rows and Pressure: the
  buttons I use are two screens below the barrel.

**16:48** "A New Well would pay 12 Reserves. A New Well is ready." Blue bar, gold "Open Expand",
and the top bar says "9 OF 13: Drill a New Well". All three agree. This is the first time since
minute 1 that the screen and the guide said the same thing.

**17:10 The first New Well.** One click on "New Well: +12 Reserves", no confirm. A moment later the
screen showed: Crude 50, 0/s, "0 of 12 Reserves, the least a New Well pays", "Need 12 more Reserves
first", one line of small green text "New Well! +12 Reserves.", and a toast "New: the upgrade
tree". Whatever played in between, what is left on the screen is a counter back at zero.
- Felt: flat. Seventeen minutes of work, and the screen I am left on tells me how far away the next
  one is.

**17:30 The upgrade tree.** "12 Reserves to spend". "YOU CAN BUY NOW": Head Start Kit (5), Idle
Hands (5), Pressure Memory (10), Time Vault (10), Tower Legacy (10). "SAVING UP FOR": Finger of
Wasta, Falaj Covenant ("+15% from the Falaj"), Drill Mastery ("+15% from the Hmar al-Naft"),
Hourglass ("Gushers stay 10 seconds longer"). Well laid out. Three snags:
- The line above says "Reserves. They multiply all your Crude (x2.20 now)" and the line below says
  "12 Reserves to spend". If I spend them, do I lose the x2.20? I hesitated here longer than
  anywhere else. (No: the multiplier follows lifetime Reserves. The screen does not say so.)
- Falaj, Hmar al-Naft, Gushers: three things I have never seen, for sale.
- I bought Head Start Kit ("Each New Well starts with 10 free Bucket units"). My Well had 0
  Buckets. The first thing I bought with the reward did nothing I could see.

**18:20 The Gusher lesson.** The bar grew to three lines: "A Gusher is coming up: tap the well! It
pays a minute of Crude at once and stays for 20 seconds. After this one, Gushers surface about
every 4 minutes, but only while your hands are off the game." The barrel became a fountain:
"Gusher! Tap! 12 s left". I tapped it. **"The Gusher paid 0 Crude."** My rate was 0/s because I had
just reset; a minute of nothing is nothing.
- And the rule it taught, "only while your hands are off the game", is the opposite of Da'sa, which
  pays only while my hands are on it.

**18:40 to 21:30 Run 2.** "12 OF 13: Drill 3 New Wells. Each run is quicker than the last. 1/3."
It was quicker: 271/s two minutes in, against about 15/s at the same point of run 1. Nothing on the
screen told me so. At 20:30 the Refinery had "You have 150 of 45" on the Naphtha Order; it had been
fillable for three minutes with no mark on the tab. I filled it: "Naphtha went from x1.000 to
x1.015" and a second slot went to "New Order in 29 min 58 s". Two of three slots are now on timers.

### What was different on the phone (375 x 780)

**The guide's target is below the fold on the first screen.** The fold shows: Crude, the two chips,
the gold bar ("Buy your first Bucket", without its second line), the heading, the sentence, the big
barrel "Tap the well", the rate, Da'sa. The Bucket's Buy button is a full screen lower. The only
thing to tap is the barrel.

**The barrel and the buttons are never on the screen together.** After "Show me" the Bucket row
fills the screen and the barrel is gone. To tap I scroll up; to buy I scroll down. Each pump row is
about 300 px tall (its two buttons are stacked), so with three pumps the Well is over three screens
long.

**The sticky header takes a quarter to 40% of the screen.** Crude, chips and the collapsed bar are
about 190 px. For a few seconds after each new step the bar expands to four or five lines and the
header is about 320 px.

**The "Show me" button moves.** The bar changes height when a step changes and again when it
collapses, so the button sat at four different heights in three minutes. I missed it twice.

**"Show me" for "Tap the well 10 times" did not bring the barrel into view.** The page stayed on
the pump rows.

**Things appear under the thumb.** The bottom tab bar arrived at the fifth Bucket and pushed the
content 26 px; two of my Buy taps landed on text. A minute later the "This run" box pushed the
pumps down by most of a screen. Toasts sit just above the tab bar, on top of the buttons.

**Step 4 completed itself.** I had skipped it on desktop by wandering. On the phone I saw it: "Open
Fields and haul 5 Materials, 0/5". I opened Fields. The crew had hauled 56 since second zero. The
step was done before I read the screen, and the bar moved on. I never did the thing it names.

**Waiting as told makes the wait longer.** At 6:30 the bar said "Buy a Hand Pump", "in 76 s". I
waited 40 seconds without touching the screen. It then said "in 52 s": the rate had fallen 30 to 20
("Watching") and the barrel was off screen, so there was nothing in view to tap to stop it.

**What is better on the phone:** the tabs are a bottom bar within thumb reach, the Order that can
be filled is the first card and fits, and the Expand-style plain rows read well at this width.

### Mid game (console: three New Wells, about ten simulated minutes into run 4)

Reached by loading the save from the desktop run and stepping the loop from the console
(`Well.buyMax` + `Loop.advance`, two more `Prestige.newWell`). I read each screen cold.

- **The bar says "13 OF 13: Reach your first Mastery rank. Time spent working a Field ranks its
  skills up."** "Show me" outlines the Mastery panel: "Harvesting 0.12 of 0.25 hours to Novice".
  There is nothing to press. The last step of the first session is "keep the crew working for
  about eight more minutes".
- **Well:** a Generators box has joined the bottom: "A Generator makes one kind of pump 10 times
  stronger for good. The next one is for the Bucket. It comes when your best run reaches 1.00ap
  Crude (best so far 21.56B)." I cannot read "1.00ap". Still "Opens when burning the lower pumps is
  worth it" under it.
- **Refinery is now six sections on one page:** Orders (all three fillable, plus "Fill all 3"),
  Your Fractions, Vials, "Talabiyat al-Jum'a" ("One big Order a week... Closes in 164 h 4 min.
  Nothing open. The next one posts in 164 h 4 min, once every Field has a Rig"), "Brewing Hall"
  (four Dallahs that "brew Bubbles", two of them "Ready"), and "Al-Khalta al-Sirriya" (two
  dropdowns and "Mix", "Compounds found: 0 of 40"). Eight gold buttons are lit at once. The bar at
  the top is asking for none of them. Orders, Vials, Bubbles and Compounds are four different
  machines that all raise the same five Fractions, and nothing ranks them.
- **Expand:** New Well, then the tree, then a New Field card ("Not yet: 20% of the way"), then
  Trials: "Auto-Buy: buys Well slots for you. **Ready in 1 h 53 min.** [Soon]". A second clock.
  ("Well slots" here; "pumps" everywhere else.)
- A welcome-back strip showed after the reload: "While you were away (3 h 16 min): +194.08M Crude,
  +0 Materials." Plain and good. It stays until the page is reloaded.

What matters most on each screen, read cold: Well, yes (the "This run" box, when it agrees with the
bar). Fields, no. Refinery, no. Expand, yes for the top card only. Collection, nothing to decide.

### Late game (console: every feature forced open, Rigs, Crew, Seals, Shares, Pages set by hand)

This state was written by hand, so numbers are not what a real player would have. It shows layout
and wording, not balance.

- **The bar is at its best here:** "NOW: Drill a New Well: +347 Reserves [Show me]". One line, one
  verb, one number.
- **Page lengths at 1920 x 897** (measured): Well 2,550 px, Fields 1,350, Refinery 3,880, Expand
  6,750, Collection 1,800. Expand holds 47 live buttons, 30 of them gold, and about 1,040 words:
  New Well, three rings of upgrades, New Field, Chronicle, Trials, Seals and Crew.
- **The burn is at the very bottom of the Well:** "Shabb al-Daw. light the fire: burn the lower
  tiers for the top one. Lighting it now sets x6.68. Costs: the free units your pumps below the
  Giant Field made. The ones you bought stay. [Light it]". The most dramatic button in the Well is
  2,000 px under the barrel. ("tiers" here, "pumps" elsewhere.)
- **Numbers stop being readable:** "Crude 318.51ag", "You have 64.29ad", "need 39.81aj more",
  "needs 10^67 Crude; it is at 10^37.4". Three notations (K/M/B/T, two-letter suffixes, powers of
  ten) on one screen.
- **Fields:** "Your crew is resting. They only work for 30 seconds after a tap. The level waits
  while they rest." The Rig card lists three rates: "While your crew works: +0.38 a second. While
  you watch: +0.58 a second. While you are away: +0.12 a second." Watching beats working, which
  reads as a mistake.
- **Collection** calls skills "Tower skill 4: Grandmaster"; the Fields screen calls the same thing
  "Sword strikes".

### Arabic

Set `AETHERIA_LANG` to `ar` and reloaded. The page mirrors correctly: tabs, bar, cards and buttons
all flip, nothing overlaps or clips at desktop width on Well, Fields or Refinery. The Saudi names
read more naturally here than in English (الدعسة, ونيت, الفلج). Three things a person would notice:
Latin number suffixes inside Arabic text ("عندك 146.80ad"); the rate in the header renders as
"ث/734.34ag" (the slash lands on the wrong side); and "(x1.000 to x1.015)" renders with the
multiplication signs trailing. None of it breaks the layout. I did not check Arabic at phone width.

### Small defects seen on the way (not the cause of the feel, but cheap)

- Vial toast says "Tower, grade 0"; the card says "Tower grade 1".
- "A New Well would pay 1 Reserves."
- Toast "Done: A Gusher is coming up: tap the well!." (two punctuation marks).
- The "Order filled!" banner in the Refinery never goes away.
- Fields: "Next level in 0:00" with a full bar that does not advance.
- "Each one makes 2 Bucket per second" (singular).
- Reset confirm label outlives its 4 second window (see the harness note above).
- Phone: "Show me" for the tap step does not scroll the barrel into view.
- Head Start Kit does nothing in the run it is bought in, and does not say so.
- "pumps", "slots" and "tiers" are all used for the same thing; "Da'sa" and "Heat" likewise.

## 3. Diagnosis

Each cause has its evidence (times refer to section 2) and the principle behind it. Principles are
marked **[research]** (published and replicated), **[genre]** (common practice in well-regarded
idle games) or **[judgement]** (mine).

First, the split the brief asks for. **Confusing because of presentation:** causes 2, 3, 6, 8, 9.
**Confusing because the loop itself is confusing at that moment:** cause 1 (the second loop arrives
before the first has paid off, and the player has no verb in it), cause 4 (three presence states
with opposite rules) and cause 7 (clock waits). None of these needs a mechanic removed. They need
the mechanic met later, or met through an action instead of a sentence.

### Cause 1. Four systems open in two minutes, on triggers the player did not pull

Evidence: Fields tab at 1:40 (rule: 5 Buckets), Refinery tab at 1:50 (rule: opened Fields),
Pressure and "This run" at 2:20, Orders and Fractions at 2:50, Vials at 3:15, Collection at 3:40.
New terms met: about 9 by 0:30, about 21 by 2:30, about 40 by 5:00, about 60 by 20:00. Guide step 4
("haul 5 Materials") completed itself before I could read it. The first Order pays +1.5% to
tapping. In `Guide.js` every one of these rules is a threshold on something that happens anyway:
`'tab.fields': bought[1] >= 5`, `'tab.refinery': visited fields && materials >= 5`,
`'refinery.vials': ordersFilled > 0`, `'tab.codex': anyVial`.

Why it matters:
- People hold about four new things in mind at once **[research: Cowan 2001; later estimates 3 to
  5]**. Forty in five minutes is not learned; it is skimmed, and skimming is what "I am not sure
  what to click and why" describes.
- Show the advanced things later, when the basic thing is in hand **[research/practice: progressive
  disclosure, Nielsen Norman Group]**. The game does disclose progressively. It discloses on a
  timer of seconds, not on mastery.
- A new system should arrive as the answer to a problem the player already has **[genre]**. In
  Antimatter Dimensions the second layer appears when the first has visibly run out. Here Fields
  arrive while Buckets are still 45 Crude each and fun to buy.
- "Introduce everything at once and you get twelve weak experiences instead of one strong one"
  **[genre: Hyper Hippo on AdVenture Capitalist, via the Global Games Forum write-up]**.
- The player has no verb in the Fields loop. The crew starts by itself, hauls by itself, and the
  only button ("Keep them going") is `api.act(() => {})` in `fields.js`: it does nothing. A loop
  you never act in cannot be learned by doing **[judgement]**.

### Cause 2. The screen does not agree with itself about what to do

Evidence: 0:10 the barrel says "Tap", the bar says "Buy". 4:10 the bar points at a grey button and a
solid gold Pressure button sits under it. 5:00 "Show me" outlines a number. 9:45 the run bar is
full and the guide says 0 / 12. Mid game the Refinery lights eight gold buttons while the bar asks
for a Mastery rank. Late game Expand has 30 gold buttons.

Why it matters: a first screen has to answer three questions without reading: where am I, what can
I do, what should I do first **[practice: standard onboarding heuristics]**. The repo's own contract
says the same ("one main action that is obvious at a glance", README, "The preview UI"). Gold is the
game's word for "do this". When three things are gold, gold means nothing **[judgement]**.

### Cause 3. Progress is not readable at a glance, and what is readable is discouraging

Evidence:
- Every locked button carries a time estimate at today's rate: "in 58 min", "in 5 h", "in 42 h",
  "in 70 h". The truth was 4 minutes. `waitWords` in `well.js` prints any duration.
- The tenth Bucket doubles output and multiplies the price by 10,000 in the same frame, with only
  the good half announced beforehand.
- The run bar is a log bar: half full at 0.09% of the target, 72% at 2%.
- The guide's counter sat at 0 / 12 from 5:00 to 12:00.
- The same bar that was full at 9:45 fell to 8% at 12:00 when it changed meaning.

Why it matters: effort rises as a goal gets visibly closer, and a visible head start raises
persistence **[research: goal gradient, Hull 1932, Kivetz, Urminsky and Zheng 2006; endowed
progress, Nunes and Dreze 2006]**. The game has the right instinct (bars everywhere) but each bar
either lies in the hopeful direction and then takes it back, or does not move. A bar that resets
from full to 8% is the opposite of endowed progress. And a number in hours on the next purchase
tells a first-minute player the game is slow before they have learned that rates compound
**[judgement]**.

### Cause 4. Sitting still makes the number go down

Evidence: 4:30 the rate fell 33.75 to 22.5 after 35 seconds without input; 9:15 again; on the phone
at 6:30 the Hand Pump's wait grew because I waited for it. Fields: "They rest 30 seconds after your
last tap", with a countdown. The meter has three names (Da'sa, Heat, Hands-on), two colours, two
explanations, and started above 1.00 before I touched anything. At 18:20 the Gusher lesson taught
the opposite rule: good things come "only while your hands are off the game".

How it is built: `Presence.js`: any pointer or key press sets Hands-on for `P.handsWindow` = 30 s;
Heat ramps to x2 over 60 s; the Well runs x(1 + 0.5 x heat). The header and the big rate show the
current rate, so they fall when the window lapses.

Why it matters: a loss is felt about twice as strongly as an equal gain **[research: Kahneman and
Tversky 1979]**. The mechanic is a bonus for playing. The presentation is a penalty for not
playing, in a genre whose promise is that the number goes up while you do nothing **[genre]**. The
owner's "no dark patterns" rule (AGENTS.md rule 8, "no punishing absence") is about exactly this
feeling, even though the numbers here are generous. This is the one place where the underlying
loop, not only its wording, confuses: Da'sa rewards hands on, Gushers reward hands off, the crew
needs taps, the Rig prefers watching, and a newcomer meets all four inside 20 minutes.

### Cause 5. There is no single picture of what the player is

Evidence: the welcome card says "You run an oil well". By 1:50 I also have a crew at a Tower. By
14:00 the Tower teaches "Sword strikes" and "Caravan guard", the Oasis teaches "Cross-breeding",
the Refinery brews "Bubbles" in "Dallahs" and offers "Vials", and the header says "Aetheria: The New
Loop". The footer of Fields says "Bosses, digging and crops stay in the current game." The thing I
haul is called "Tower Materials, grade 1 or better".

Why it matters: the well-regarded games of the genre can be said in one line (make cookies; make
paperclips; a fire in a dark room) and every new system is a consequence of that line **[genre]**.
After two minutes a person would say this game is "an oil clicker", which is right. After five they
would say "an oil clicker with some other screens", which is the confusion. The three Fields and
the Refinery are sound mechanics wearing the old game's clothes **[judgement]**.

### Cause 6. The moments that should feel like rewards land flat

Evidence: the first doubling (2:25) shares its frame with a price wall. The first Order pays 1.5%.
The first New Well (17:10) leaves "Need 12 more Reserves first" and one green line on the screen.
The first tree purchase (Head Start Kit) changes nothing visible. The first Gusher pays 0. A missed
Vial shows only "misses: 1". In `feedback.js` the `newWell` event is level 1, the quietest tier,
the same as finishing a guide step; opening a tab is level 3.

Why it matters: the house rules already say it. `docs/game-feel-guide.md` P2 lists "Ascension,
prestige, the first time something unlocks" as T3, a ceremony; P8 says a prestige gets a closing
celebration (peak-end rule, **[research: Kahneman]**); section 2 says a reward worse than expected
feels like a loss (**[research: reward prediction error, Schultz]**). A Gusher announced as "a
minute of Crude at once" that pays 0 is the textbook case. The first reward that actually felt like
one was the Hand Pump making Buckets at 5:00. Five minutes is late for a first reward **[genre:
Cookie Clicker's first auto-income arrives in about 15 seconds]**.

### Cause 7. The clock is gating things, and it is the first thing the guide leads to

Evidence: "New Order in 29 min 58 s" (3:15; `P.orderRefill` = 1800). "Auto-Buy: Ready in 1 h 53
min" (`P.trialDelay` = 7200). "New offers come every day" (`P.vialOffersPerDay`). "Closes in 164 h"
(weekly). Guide step 13 is "Reach your first Mastery rank", which is 15 minutes of crew time with
nothing to press. By 20:30 two of three Order slots were on timers.

Why it matters: owner rule 2. The README draws a line between gates and rates ("how often a Gusher
surfaces" is a rate). An Order slot that is empty for 30 minutes whatever the player does, and an
automation that says "Ready in 1 h 53 min", read as gates to the person looking at them, whatever
the code calls them **[judgement]**.

### Cause 8. The page moves under the hand and the main action is off screen

Evidence: tab bar insertion at 1:40 (desktop) and at the fifth Bucket (phone); "This run" box at
2:25 and its growth at 12:00, which moved "Buy everything" 60 px; the guide bar changing height on
every step; tabs inserted in the middle of the row. On the phone the first step's button is below
the fold and the barrel and the Buy buttons never share a screen. Late game the Well is 2,550 px
tall at desktop width.

Why it matters: the house rule is "effects never move the layout" (`game-feel-guide.md` P9). A
person who taps where a button was and hits nothing concludes the game is unresponsive
**[judgement]**. Tap targets within thumb reach, primary action above the fold **[practice]**.

### Cause 9. The screen talks like a spreadsheet

Evidence: "44.67 Crude"; "Each one makes 1.02 Crude per second"; "(x1.000 to x1.015)"; "9.5 levels
to Grade 2"; "0.09 of 0.25 hours to Novice"; "30% a try; sure on try 4 (misses: 0)"; "Da'sa x1.03:
the Well runs x1.02"; "1.00ap"; "10^37.4". Names with no gloss: Shabb al-Daw, Talabiyat al-Jum'a,
Al-Khalta al-Sirriya, Falaj, Hmar al-Naft (the glosses exist in `shell.en.js` as `*.gloss` keys and
are shown for some and not others).

Why it matters: the contract already says "words before numbers" and "the number that matters big
and the rest small". Precision that the player cannot act on is noise **[judgement]**.

## 4. What the best of the genre does in the same minutes

What the cited sources support: Hyper Hippo's onboarding lesson for AdVenture Capitalist (do not
teach everything at once; use goals to show when the next system unlocks); A Dark Room and Universal
Paperclips reveal new buttons over time on a sparse screen; Antimatter Dimensions' layer order and
thresholds (wiki and the how-to page). The minute-by-minute rows below are **from my own knowledge
of these games and were not re-verified today**; treat the times as approximate.

| | Minute 1 | Minute 5 | Minute 20 | First reset |
|---|---|---|---|---|
| **Cookie Clicker** | One cookie, one counter. Click. The store shows one item you can nearly afford. | 3 or 4 buildings, the first upgrades have appeared as icons. One screen. | 6 or so buildings, a Golden Cookie has probably appeared and been explained by clicking it. One screen. | Hours to days in |
| **Universal Paperclips** | One button: "Make Paperclip". A price. | AutoClippers and wire. Each new line appeared when the last one ran out of things to do. | Marketing, then "Trust" and two more numbers. Still one column of text. | Not a reset game; phase change after an hour or more |
| **A Dark Room** | One button: stoke the fire. A text log. | A stranger arrives; "gather wood" appears. | A few huts, traps, three or four resources. The second screen has just opened. | None |
| **Kittens Game** | One button: gather catnip. | A catnip field; the cost of the next thing is the only goal on screen. | A hut, the first kitten, a job to assign, a second tab. | Days in |
| **Antimatter Dimensions** | 10 antimatter. Buy the 1st Dimension, then the 2nd, which makes 1sts. | Four Dimensions and Tickspeed, all on one screen. "Buy 10" bonus learned by doing it. | Dimension Shifts and Boosts: small resets that each unlock one more row of the same table. Sacrifice appears after 5 Boosts. | First big reset (Infinity) hours in |
| **AdVenture Capitalist** | Tap the lemonade stand. Buy another. | Three businesses, the first manager (it now runs itself). | Five or six businesses, an upgrades list. One screen. | Hours in |
| **Egg, Inc.** | Hold one red button; chickens run. | Housing and a vehicle upgrade, each prompted by a full bar. | Research list; the first egg upgrade is close. | About 15 to 30 min (egg upgrade) |
| **Melvor Idle** | Pick one skill, press one action, watch one bar. | Same skill, second item. Everything else is visible in a sidebar but each page is one verb. | Two or three skills tried. | None |
| **This game** | A barrel that says tap, a bar that says buy, a meter called Da'sa, two chips, four numbers with decimals. | Five tabs. About 40 terms. One Order filled for +1.5%, a slot on a 30 min timer, one Vial, a rate that dropped when I rested. The cascade has just started, and it is the first good moment. | First New Well done at 17 min. About 60 terms. Upgrade tree, a Gusher that paid 0. | 17 min |

Three things stand out.

1. **Every one of them stays on one screen with one verb until the player is bored of that verb**
   **[genre]**. The second system is the cure for that boredom, so it is welcome. Here the second
   system arrives at 1:40, before the first has had its first payoff.
2. **This game's reset timing is fine.** Seventeen minutes to a first New Well is quick and
   Antimatter Dimensions teaches small resets even earlier. What differs is how much else has been
   introduced by then: Antimatter Dimensions reaches its first reset on one table; this game
   reaches it across five tabs.
3. **None of them shows a wait measured in hours in the first session** **[genre]**. They show the
   price and let the player discover that the rate compounds.

## 5. Recommendations

Ranked by confusion removed per unit of work. Each is written so an engineer can build it without
asking. "Stays the same" lists what must not be touched. Work packages at the end say which ones
share files.

### The first five minutes to aim for

This is the target the recommendations below add up to. Nothing in it removes a mechanic; it
changes when each is met. Times assume today's numbers (`P.startCrude` 50, Bucket 44.67, tap 1).

| Time | The player sees | Does | Feels |
|---|---|---|---|
| 0:00 | A dark screen, the barrel in the middle, "You found oil. Tap it." No bar, no chips, no meter, no pump rows. Crude: 50. | Taps. | "Oh, a clicker." |
| 0:01 to 0:05 | Each tap: the barrel squashes, a drop sound a step higher each time, "+1" floats up, the counter ticks. | Taps five times. | It answers me. |
| 0:05 | A Bucket slides up under the barrel: "Bucket. Pumps 1 Crude a second for you. 45 Crude." with the one gold button on the screen. The gold bar appears now, reading the same thing: "Buy a Bucket". | Buys it. | |
| 0:06 | The rate appears for the first time, large: "1 a second". The counter moves by itself. One quiet line: "It pumps while you watch." | Watches for a second, then taps to afford the next. | First reward: income without me. |
| 0:10 to 1:30 | Ten pips on the Bucket row fill one by one: "10 Buckets: all Buckets x2". Price stays "45". The wait reads "in 12 s", never more than a minute. | Buys Buckets 2 to 9, tapping between. | A short, clear goal with a bar that tells the truth. |
| ~1:30 | Tenth Bucket: the pips flash, "Buckets x2!", the rate rolls 15 to 30. Half a second later, in the same row: "The next crate of Buckets costs 447K. A Hand Pump will make Buckets for you." The Hand Pump row slides in with a fill bar and its price, no time estimate. | Reads one sentence. | Second reward, and the wall is explained as the door to the next thing. |
| 1:35 | The bar: "Buy Pressure: everything x1.125". Pressure is the only gold button and it is 30 seconds away. | Waits, taps, buys it. | The gold thing and the bar agree. |
| 2:05 | The bar: "Buy a Hand Pump". Its fill bar is at 25%. Now, in the first real wait, the Da'sa meter appears beside the barrel with one line: "Da'sa (heat): keep playing and the Well runs up to +50% faster." | Taps to fill it. | A reason to tap that I can see working, met when I had nothing else to do. |
| ~3:30 | Hand Pump bought. The Bucket count starts climbing by itself: 11, 12, 13. The bar says "Watch: the Hand Pump makes Buckets" for ten seconds and asks for nothing. | Watches. | Third reward: the cascade. This is the game. |
| 3:45 | "Buy everything" appears. The bar becomes the long goal with one honest bar: "First New Well: 4% of the way". | Presses it now and then. | I know where this is going. |
| ~4:30 | One tab appears, with its reason on the bar: "While the Well pumps, your crew can haul for the Refinery. Open Fields." | Opens it when ready. | The second system arrives as something to do while I wait. |
| 5:00 | One screen learned. Six words: Crude, Well, Bucket, Hand Pump, Pressure, Da'sa. Three rewards. One tab waiting. | | I can say what this game is. |

Minutes 5 to 20 in the target: the crew is sent (a real choice) and the first Order raises the
Well, shown on the Well; Wanet and Derrick arrive; a second and third Order; at about 17 minutes
the first New Well as a ceremony; the tree; then Collection and Vials as things to grow into during
run 2.

### R1. Re-time the first session: one loop until it pays, then the next (about a day)

**The player experiences:** the first four to five minutes on the Well alone, as in the script.
Fields arrive during the first long wait. The Refinery opens only when an Order can be filled on
arrival. Vials, Collection and Mastery arrive after the first New Well, as the things run 2 is for.

**What changes** (`js/systems/coreloop/Guide.js`, `js/i18n/coreloop/guide.en.js` and `.ar.js`,
`test_cl_guide.js`):
- `STEPS` order becomes: `tap` (need 5), `buy1`, `pack`, `pressure`, `slot2`, `work`, `order`,
  `reserves`, `newwell`, `tree`, `gusher`, `wells3`. Remove `rank` (it is a wait; see R7).
- `work` stops completing itself: `have` becomes "the player has chosen a Field at least once since
  the step began" (a new `guide.sent` flag set by `Presence.setHandField` through the Fields
  screen), and its text becomes "Send your crew to a Field".
- `FEATURES`: `tab.fields` opens when `well.bought[2] > 0 && well.pressureBest > 0` (or any New
  Well); `tab.refinery` opens when an Order is fillable and Fields has been visited;
  `refinery.vials` when `ordersFilled >= 3 || wells >= 1`; `tab.codex` when `wells >= 1` only;
  `fields.mastery` when `wells >= 1 || anyRank`; `fields.mine` when the first Order is filled.
- The Gusher lesson is not summoned on an empty Well: in `refresh`, call `Presence.summonGusher`
  only when `state.well.bought[2] > 0` in the current run (so it pays something).
- Each step's `why` says what the player will see, not what the system is. Example: `slot2.why`:
  "Watch the Bucket count: it will climb by itself."

**Stays the same:** every feature and every rule's stickiness; the guide's machinery (features,
steps, anchors, `refresh`); all numbers.

**It worked if:** a fresh player has one tab until at least minute 4; no guide step completes
without a click from the player; the first Gusher pays more than 0; a person asked at minute 5
"what is this game?" answers in one sentence.

### R2. Make the Well tell the truth about progress (about a day)

**The player experiences:** no wait longer than a few minutes is ever printed; the doubling and the
price step are announced together, before they happen; one bar runs from the first Bucket to the
first New Well and never jumps backwards; prices are whole numbers.

**What changes** (`js/ui/coreloop/well.js`, `js/i18n/coreloop/well.en.js` and `.ar.js`,
`Guide.js` `STEPS.reserves.frac`):
- `waitWords` / `whenWords`: above 10 minutes return no time at all. The button shows its price and
  a thin fill bar (Crude held / price). Below 10 minutes keep "in 40 s".
- Pump row, last unit of a pack: the pack button reads "Buy 3: every Bucket x2". For three seconds
  after the doubling the row shows "Buckets x2! The next ten cost 447K each." In the row's steady
  state the pip strip is labelled "Crate 2 of Buckets".
- `runView`: one bar for the whole run, `frac = log10(runCrude) / log10(run needed for
  newWellNeed)`, labelled "First New Well: N% of the way" (later runs: "Next New Well"). Drop the
  two-stage text ("X of 1.00M Crude", then "would pay N Reserves"). The Reserve count appears under
  the bar once it is above 0. Give `STEPS.reserves` the same `frac` so the gold bar moves from the
  first second.
- Numbers under 1,000 print without decimals on prices and "each one makes" (`fmt` in `shell.js`
  takes a `whole` option, or the Well rounds before formatting). "Each one makes" shows the base
  rate; Da'sa is shown once, by the barrel.
- The "This run" card gets a fixed height from its first appearance (see R6).

**Stays the same:** prices, pack size, the x2, the Reserve formula, the log scaling itself (the bar
is still log, but it has one meaning and one label).

**It worked if:** in a fresh 20 minute run no text on the Well contains "h"; the run bar never
decreases; the guide's counter is never at zero for more than a few seconds while the player is
earning.

### R3. One gold thing per screen (hours)

**The player experiences:** at any moment one button on the screen is solid gold. It is the one the
bar is naming if that is on this screen and can be pressed; otherwise it is the single best thing
to press here. Everything else that can be pressed is outlined.

**What changes** (`js/ui/coreloop/well.js` `setBuy` and its callers, `refinery.js`, `tree.js`,
`prestige.js`, `css/coreloop.css`):
- Add a small helper in `js/ui/coreloop/guide.js`: `primaryAnchor(api)` returns the bar's anchor
  when its screen is showing. A screen gives `btn-primary` only to the element carrying that
  anchor; other affordable buttons get a new class `btn-ready` (gold outline, dark fill).
- When the bar's target is on this screen but not yet affordable, nothing else is solid gold.
- When the bar points at another screen, the screen picks one: Well, the cheapest affordable pump
  of the highest tier; Refinery, "Fill all"; Expand, the reset that is ready, else the cheapest
  affordable node.
- The barrel loses its permanent glow ring after the first Bucket; it glows for a Gusher and while
  it is the bar's target.

**Stays the same:** what each button does; "Buy everything".

**It worked if:** a screenshot of any screen at any time has at most one solid gold button, and in
the first session it is always the one the bar names.

### R4. Da'sa as a bonus you earn, not a rate you lose (about a day)

**The player experiences:** the big "Crude every second" number is the steady rate and never falls
because they stopped tapping. Beside the barrel a flame fills while they play: "Da'sa +38%". When
they stop, the flame cools; the big number stays. The crew "works while you play" and is never
shown counting down. Wait estimates do not get longer because the player waited.

**What changes** (`js/ui/coreloop/shell.js` `render`, `well.js` `heroView` / `heatView`,
`fields.js`, their string files; no system file):
- Header rate and hero rate: always `Well.crudePerSecond(state, PRESENCE.WATCH)`. The Da'sa element
  shows the extra as a percentage and, when above 0, "+N a second" in the flame colour.
- `whenWords` estimates use the steady rate.
- Header chips "Hands-on" / "Watching" are hidden until the Gusher step has been reached; after
  that one chip reads "Playing" or "Leaning back: Gushers can surface".
- One name. English strings say "Da'sa" everywhere, with "(heat)" in grey the first three times it
  is shown; remove the word "Heat" from `refinery` and `tree` strings.
- Fields: remove the 30 second countdown bar and the sentence about resting. While working: "Your
  crew is working" and the haul rate. When the window lapses: "Your crew is on a break" and one
  button, "Back to work". Delete the "Keep them going" button (it does nothing today).
- The Gusher step's `why` gains one line that reconciles the two: "Two ways to play: keep your
  hands on for Da'sa, or lean back and catch Gushers."

**Stays the same:** `Presence.js`, `P.handsWindow`, `P.heatRamp`, `P.handsWell`, Gusher timing, all
rates. Only what is shown changes.

**It worked if:** sit for 60 seconds on the Well in the first five minutes: no number on the screen
gets smaller.

### R5. Make the first rewards land (about a day)

**The player experiences:**
- **First New Well:** the screen dims, the well gushes, a card counts up: "Run 1: 17 minutes. +12
  Reserves. Everything now runs x2.2." One button: "Spend them". Later New Wells get a short banner
  with the run time and "x7.0, was x4.6".
- **After it:** they land on the tree with "12 to spend" and, under it, "Spending never lowers your
  x2.2". Back on the Well, a small "x2.2 from Reserves" badge sits by the rate and the run bar says
  "Run 2. Run 1 reached 100 a second in 5:40."
- **Head Start Kit** drops its Buckets into the current run if it has none.
- **A Vial miss** shakes the card and says "Not this time. Try 2 of 4." A find gets the existing cue.
- **The tenth of any pump** gets a T1 moment ("Buckets x2!", rate rolls up).

**What changes:** `js/systems/coreloop/Prestige.js`: emit `newWell` with `first: wells === 1` and
the run's seconds; `js/ui/coreloop/feedback.js` `MAP.newWell`: level 4 when `first`, else 2;
`js/ui/coreloop/prestige.js`: the after-reset state and the "never lowers" line; `tree.js`: nodes
that name things not yet met (Falaj, Hmar al-Naft, Gushers) move to "arriving later" until their
feature is open; `Well.js` `buy`: emit a `pack` event (level 1) and add it to `MAP`;
`Tree.js`/`Well.js`: apply `startKit` on purchase when `well.amount[1]` is zero;
`refinery.js`: the miss feedback. `README.md` events table gets the two changes.

**Stays the same:** what a New Well resets and pays; the tree's contents and prices.

**It worked if:** a person watching over the player's shoulder can tell, without reading, that the
first New Well was a big moment; nobody asks "do I lose the multiplier if I spend?".

### R6. Hold the page still, and keep the main action in reach on a phone (one to two days)

**The player experiences:** nothing they are about to tap ever moves. On a phone the barrel and the
rate are a strip that stays at the top; pump rows are half as tall; "Show me" always lands its
target in view; the bar is always the same height.

**What changes** (`css/coreloop.css`, `js/ui/coreloop/shell.js`, `js/ui/coreloop/guide.js`,
`well.js` markup only):
- Guide bar: fixed height on both layouts. The `why` line is always one line (truncate with the
  full text on tap) on desktop; on phone it opens as an overlay below the bar, not by growing it.
  Remove the 9 second auto-open.
- Tabs: new tabs append at the end of the row in order of arrival for the first session (or reserve
  the row's height from the start on desktop so its arrival moves nothing).
- New sections append below what is in use. The "This run" card moves into the hero card beside the
  barrel (desktop) or under the rate (phone) with a reserved height.
- Phone (`max-width: 767px`): the hero collapses to a sticky strip under the header (barrel 56 px,
  rate, Da'sa flame) once the page scrolls; pump buttons sit side by side; `scroll-margin-top` on
  every `[data-guide]` equal to the header height so "Show me" clears the sticky header.
- Toasts appear under the header, never over the tab bar or buttons.
- Remember scroll position per tab only within a session; returning to a tab after a guide step
  changes scrolls to the top.

**Stays the same:** bottom tab bar on phones; five tabs; all content.

**It worked if:** record a fresh five minute phone session and step through it: no frame where a
button under the last tap position changes; the first step's button is above the fold at 375 x 667.

### R7. Take the clock out of the first hour's gates (a day, plus a sim run; needs the owner's call)

**The player experiences:** filling an Order brings the next Order when they have hauled enough to
deserve it, shown as a bar ("Next Order: 60 of 100 hauled"), not a 30 minute countdown. Auto-Buy
says "Win it: play one run start to finish with your hands on" (or whatever the Trial is), not
"Ready in 1 h 53 min". The guide never asks for something only time can give.

**What changes:** `js/systems/coreloop/Refinery.js` `fillOrder` / `postOrders`: a slot refills after
`P.orderRefillUnits` Materials hauled since it emptied (new param; start at the Materials the
old 1800 s would have produced at the Watching rate, so the sim's year is close) instead of
`refillAt`; `Prestige.js` `trialReady`: replace `P.trialDelay` with a count the player earns (New
Wells since unlock); `sim/redesign/model.mjs` the same; `refinery.js` and `prestige.js` wording;
`docs/core-loop-redesign.md` 4.2 and 5.4. Paste `npm run sim` before and after (AGENTS.md rule 4).

**Stays the same:** three Order slots, what Orders cost and pay, the three Trials and what they
automate. Daily Vial offers and the weekly Order can stay on the calendar: Orders also give Vial
offers, and the weekly Order is a bonus on top (say so on the screen: "A bonus, once a week").

**It worked if:** in the first hour no screen shows a countdown that the player cannot shorten.

### R8. One vocabulary, in the oil world, without the decimals (about a day; strings only)

**The player experiences:** the things they haul have names ("45 Steel", not "45 Tower Materials,
grade 1 or better"). An Order card is three lines. Every Saudi name carries its gloss the first
times it is seen. No number on a card has more than three significant digits or a unit they have
to convert.

**What changes** (`js/i18n/coreloop/*.en.js` and `.ar.js`, `shell.js` `fmt`; ask the owner to
review the Arabic, rule 11):
- Materials: `cl.field.tower.material`, `.mine.`, `.oasis.` (proposal: Steel, Ore, Water; see open
  question 1). Grade becomes a quality word on the chip ("Steel II").
- Order card: "Gas Order / 45 Steel (you have 56) / Taps and Da'sa +1.5%". Drop "(x1.000 to
  x1.015)" and "Gives you: Gas +1 level."
- Fractions: "Gas: your taps and Da'sa. x1.02". Never "digging".
- Mastery: "6 of 15 min", and skill names from the oil world for the preview (or the generic
  "Tower skill 1" already used in Collection, one or the other).
- Fields: show "Level 4 of 10 to Grade 2", never "9.5 levels".
- Vials: "3 in 10 chance. Sure by the 4th try."
- Headings: "Shabb al-Daw · the burn", "Talabiyat al-Jum'a · the Friday order", "Al-Khalta
  al-Sirriya · the secret mix" (the gloss keys exist).
- One word for pumps ("pumps": not slots, not tiers). "Expand" tab: either rename to "New Well" in
  the first session or keep and subtitle it "start over, stronger".
- Lock lines name the thing: "Shabb al-Daw (the burn) opens when..." not "Opens when burning...".
- Remove "Bosses, digging and crops stay in the current game" and its siblings from the screens
  (the footer already says this is a preview).
- Big numbers: one notation. Replace two-letter suffixes with "1.0e45" beyond T, or with named
  short scale; and never print `10^37.4` next to it.

**Stays the same:** the Saudi names; every mechanic; the Arabic layout.

**It worked if:** read any card aloud; it sounds like a person talking.

### R9. Give the crew a verb and the Fields one ladder (about a day)

**The player experiences:** Fields opens on a small map of three places with the crew's marker on
one. Tapping a place shows it; a clear button "Send the crew here" moves them (looking no longer
moves them). The current Order that wants this place's Material is shown on the place ("Wanted:
45 Ore for a Naphtha Order"). One ladder is shown: "Depth 4", with Grade as the milestone every ten.

**What changes** (`js/ui/coreloop/fields.js`, `fields.en.js` / `.ar.js`): field tab click sets a
local `viewing` index only; a new button calls `Presence.setHandField`; the "wanted" line reads
`Refinery.orderInfo`; Level/Grade wording; Mastery panel collapsed to one line until the first rank
is within reach; the Rig card shows one rate (the current one) with the other two behind "How it
works".

**Stays the same:** `Fields.js`, `Rigs.js`, `Mastery.js`; three Fields; hand work and Rigs.

**It worked if:** a new player can answer "where is your crew and why there?".

### R10. Mid and late game: one "ready now" strip per screen, sections folded (one to two days)

**The player experiences:** every screen opens with one strip: "Ready now: 3 Orders, 2 Bubbles
[Collect all]" or "Nothing waiting here. Next: an Order in 40 Ore." Below it, sections are folded
to a title and a one-line status ("Brewing Hall: 2 ready", "Secret mix: 3 pairs untried") and open
on tap. A tab shows a dot when its strip has something. On Expand only the next reset is a full
card; the further ones are one line each ("New Field: 20% of the way"), and the tree is its own
section with one ring open at a time. Shabb al-Daw moves next to the barrel when it can be lit.

**What changes:** `refinery.js`, `prestige.js`, `tree.js`, `codex.js`, `well.js` (flare card
position), `shell.js` `drawTabs` (a `ready` dot from each screen's `readyCount(state)` export),
`css/coreloop.css`.

**Stays the same:** every section and action; "Fill all", "Buy all I can afford".

**It worked if:** on a late save each screen answers "what matters most here right now?" in its
first 200 px; Expand is under two screens tall with sections folded.

### R11. "Buy everything" says what it will buy (hours)

**The player experiences:** the button reads "Buy: 2 Hand Pumps, 1 Pressure" and, when the only
thing it could buy is the first unit of a new crate that would take most of their Crude, it leaves
that out and says so ("Skipping a 447K Bucket: buy it yourself if you want it").

**What changes:** `well.js` (a dry run of `Well.buyMax` on a copy of the state for the label);
optionally `Well.buyMax` gains a rule: never spend more than half the Crude on a unit that adds
under 1% to the rate (economy: sim before and after).

**It worked if:** nobody loses a saved-up purchase to the button.

### R12. Small defects (hours)

The list at the end of section 2.

### Who can work in parallel

| Package | Recommendations | Files it owns |
|---|---|---|
| A. Guide data | R1 | `Guide.js`, `guide.en/ar.js`, guide tests |
| B. The Well screen | R2, R3 (Well part), R4 (Well part), R11 | `well.js`, `well.en/ar.js` |
| C. Shell and layout | R6, R4 (header), R3 (helper + CSS), R10 (tab dots) | `shell.js`, `guide.js` (UI), `coreloop.css` |
| D. Reset moments | R5 | `feedback.js`, `prestige.js` (UI), `tree.js`, small emits in `Prestige.js` / `Well.js` |
| E. Fields screen | R9, R4 (Fields part) | `fields.js`, `fields.en/ar.js` |
| F. Refinery screen | R10 (Refinery), R5 (Vial miss), R7 (wording) | `refinery.js`, `refinery.en/ar.js` |
| G. Clock gates | R7 (systems) | `Refinery.js`, `Prestige.js`, `params.js`, sim |
| H. Words | R8 | `shell.en/ar.js` and a pass over every `*.en/ar.js` |

Collisions: B and C both touch the hero card (agree first who owns its markup: B). D and A both add
to the README events and guide tables. H touches every string file, so run it last or have each
package apply R8 to its own strings and leave H the shared vocabulary in `shell.en/ar.js`. G and F
both touch what an empty Order slot shows. R10's Expand work is in D's file (`prestige.js`): do it
after R5.

Order I would ship in: A, B and D first (they change the first 20 minutes most), then C and E, then
G once the owner has answered question 2, then F, H, R10.

## 6. What I would not change

- **The cascade.** Pumps making pumps, the count climbing by itself, the x2 at ten. It is the one
  thing I understood by watching, and it is good. Do not hide it behind anything.
- **The length of the first run.** About 17 minutes to a first New Well, with rates going from 1 to
  40M a second, is a good first arc. Run 2 really is faster.
- **The New Well card.** "You get / Starts over / You keep" is the clearest writing in the game.
  Use it as the model for every other card.
- **The upgrade tree's layout.** "You can buy now" above "Saving up for", with a bar on each saved
  item, is right.
- **The gold bar once the first session is over.** "NOW: Drill a New Well: +347 Reserves" is one
  line, one verb, one number.
- **The guide's machinery.** Features, steps, anchors and `refresh` are the right tool. The data in
  them (what opens when, in what order, with what words) is what to change.
- **The bottom tab bar on phones**, and five tabs as the ceiling.
- **The Gusher's look.** The barrel turning into a fountain with a countdown is the most game-like
  moment on the Well. It only needs to pay.
- **The welcome-back line** and the fact that nothing is lost while away.
- **The Saudi names.** They read naturally in Arabic and give the English version character. They
  need their glosses, not replacing.
- **Right to left.** It works.
- **One tap to reset, no confirm.** It is in keeping with the pace. (If anything, make the first
  one a ceremony, R5, which is its own confirmation.)

## 7. Open questions for the owner

Only the ones where the answer changes what gets built.

1. **What are the three Fields, in the oil world?** Today: a Tower with sword skills, a Mine, an
   Oasis farm, all hauling "Materials". Recommended: keep the three Fields and every mechanic; give
   each Material a name (Steel, Ore, Water, or Saudi equivalents you choose) and rename the twelve
   skills so none is about combat. This is R8 and R9; without an answer they use "Steel / Ore /
   Water" and the generic "skill 1 to 4".
2. **Do a 30 minute Order refill and a 2 hour Trial delay count as waiting on the clock?**
   Recommended: yes. Replace both with something earned (R7). Daily Vial offers and the weekly Order
   can stay, labelled as bonuses.
3. **May the big rate number be the steady rate, with Da'sa shown as a bonus on top?** It means the
   header no longer shows the true current rate while playing; the true rate is the two added.
   Recommended: yes (R4). It is the cheapest way to stop the game feeling like it punishes rest.
4. **May Fields and the Refinery wait until about minute 4 to 5, Vials until the third Order, and
   Collection and Mastery until after the first New Well?** The design doc wants "always a reason
   to farm somewhere" from early on. Recommended: yes (R1). The reason to farm is stronger when the
   Well has already hit its first wait.
5. **May the very first Order be one that speeds the Well, and may a Fraction's first level pay
   enough to see?** Today the first fillable Order is Gas (+1.5% to taps). Recommended: post a
   Naphtha Order that takes Tower Material first, and consider a one-time larger step for level 1
   of each Fraction (for example +10%, then 1.5% as now), checked in the sim. If no, R1 still
   stands and the Order's effect is shown on the Well as a count-up.
6. **May the game open on the barrel alone, with the Bucket appearing after five taps?**
   Recommended: yes. It makes the first instruction and the biggest object the same thing.

## 8. Limits of this study

**Not observed**
- **Sound.** None. The feel guide leans on sound; some moments I call flat may be less flat with
  it. The first New Well's sound is a bell at the quietest tier, by the code.
- **Motion shorter than about a second.** I saw screenshots taken after each action, not video.
  Floating "+1"s, pulses and cue flashes exist in the code; I can only say what was left on screen.
- **A real phone.** The phone run was a 375 x 780 iframe on a desktop, clicked with a mouse. No
  thumb, no fat-finger misses, no safe areas, no real scrolling inertia, no real frame rate.
- **A second person.** Every reading is mine. I also began knowing the list of mechanics from the
  brief, so I was less lost than a true newcomer; the wrong first readings in section 2 are the
  ones I still had.
- **A real return after hours away,** and anything past the first New Well played by hand.
- **Arabic at phone width**, and whether the Arabic wording reads well to a native speaker.

**How the sessions ran**
- Desktop 0:00 to 21:30 and phone 0:00 to 9:30 were each one continuous real-time stretch. My pace
  includes time spent reading each screen, so the "Watching" drop happened to me about as often as
  it would to a careful reader and more often than to a fast clicker.
- The work was interrupted once, after the phone run and before the mid game. The tab stayed open;
  the mid game was then reached from the saved desktop run by console.
- The late game state was written by hand. It shows wording and layout, not pacing.
- I wiped the preview save that was in the browser when I started (it was at step 10 of 13 with one
  New Well), as the brief said to. I left behind the save from my desktop run (one New Well, step
  12) and set the language back to English.

**Least sure of**
- Whether delaying Fields (R1) weakens the mid game the design doc is built around. I think it
  helps; a sim cannot answer it, a second new player can.
- The economy effect of R7 and of the optional parts of R5 and R11. They need `npm run sim`.
- R4's trade: showing a steady rate hides the true rate a little. I think it is right for the first
  hour and may want a setting later.
- How much of cause 6 is already softened by sound and motion I could not perceive.

## Sources

- Cowan, N. (2001). "The magical number 4 in short-term memory." *Behavioral and Brain Sciences*
  24. https://www.cambridge.org/core/journals/behavioral-and-brain-sciences/article/magical-number-4-in-shortterm-memory-a-reconsideration-of-mental-storage-capacity/44023F1147D4A1D44BDC0AD226838496
- Nunes, J. and Dreze, X. (2006). "The endowed progress effect." *Journal of Consumer Research*.
  https://msbfile03.usc.edu/digitalmeasures/jnunes/intellcont/Endowed%20Progress%20Effect-1.pdf
- Kivetz, Urminsky and Zheng (2006), "The goal-gradient hypothesis resurrected"; Hull (1932).
  Summary: https://en.wikipedia.org/wiki/Goal_pursuit
- Kahneman and Tversky (1979), prospect theory (loss aversion); Kahneman et al. (1993), peak-end
  rule. Cited from memory, as in `docs/game-feel-guide.md`.
- Progressive disclosure: https://en.wikipedia.org/wiki/Progressive_disclosure (the Nielsen Norman
  Group article of the same name is the usual reference; not fetched today).
- Hyper Hippo on AdVenture Capitalist's onboarding:
  https://www.globalgamesforum.com/ctv/idle-game-design-lessons-from-developing-adventure-capitalist
- Pecorella, A., "Idle Games: The Mechanics and Monetization of Self-Playing Games", GDC 2015.
  https://gdcvault.com/play/1022065/Idle-Games-The-Mechanics-and and
  https://www.gamedeveloper.com/design/the-rise-of-games-you-mostly-don-t-play
- A Dark Room: https://informit.com/articles/article.aspx?p=2228802 ; Universal Paperclips:
  https://if50.substack.com/p/2017-universal-paperclips
- Antimatter Dimensions: https://antimatter-dimensions.fandom.com/wiki/Guide and the in-game
  how-to, https://raw.githack.com/jacorb90/IvarK.github.io/master/howto.html
- In this repo: `js/systems/coreloop/README.md`, `Guide.js`, `Presence.js`, `params.js`,
  `js/ui/coreloop/*.js`, `docs/game-feel-guide.md`, `docs/core-loop-redesign.md`.
