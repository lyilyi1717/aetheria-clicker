# Dig: what to improve next (design study, 13 October 2026)

> **Evidence, not the design.** The one design file for Dig is [`docs/dig-design.md`](../dig-design.md): what was taken from this study, what is built and what the owner still decides (section 9) live there. Where this file disagrees with it, that file wins.

Study only. Nothing in the game was changed, nothing was run. Numbers about Dig come from `docs/dig-design.md` and the pick and Rafeeq study. It does not repeat the map, screen, Rafeeq or pick studies; where it leans on them it says so.

**The short answer.** Dig has a thing no other digging game has: the pick hits on a beat. But the player only hears the beat. He does not play it. Make the beat something he does, give each level one surprise of its own, and make coming back feel like a present. Those three do more for "addictive" than any new system.

---

## 1. Where Dig stands

### The three strongest things

| # | What | Why it is strong |
|---|---|---|
| 1 | **The beat of the picks.** Up to four picks on a 16-step bar, a drum kit per land. | No game in the research does this. Motherload, SteamWorld Dig, Dome Keeper and Mr. Mine all dig in silence or to background music. It is also the thing you liked first. |
| 2 | **Ground that acts on itself, plus pick 1 of 3.** TNT chains, water, crystal lines, 17 fusions. | This is the Peglin and Balatro engine: one hit sets off ten things. It is where surprise comes from. |
| 3 | **A road with an end, and Rafeeqs who are somebody.** Twenty levels on a map, names, hats, a manager. No clock, no tricks. | The player always knows what is next and has someone to like. Most idle games have neither. |

### The three weakest things

| # | What | The evidence |
|---|---|---|
| 1 | **The swing asks nothing.** You hold the mouse. The only choice is where to point, and most ground is broken by blasts anyway. Big hits are luck (one in twelve). | The design file says of the beat: "nobody has yet listened to it with care". The combo only pays coins and is easy to miss. |
| 2 | **The back half is a wall and a repeat.** Lands differ in sky and drums, not in the ground. The same four Arabian places are dug in every land. | Level 15 takes 6 tries and about 75 other digs. Prove levels 6, 8, 10, 12 fall in one try. The older month sim: 277 digs, 52 new. Europe is not reached in a month. |
| 3 | **The Rafeeqs are loved but do not matter, and coming back is a sum.** | After day 1 they break about 4% of the ground while you play. The away card is totals and a joke. |

One more, said plainly: **the game is not simple.** There are 35 features, three things that behave like money (coins, Stars, metal), five jobs, three medals, contracts, twists, wishes. "Simple, easy" is in your goal, and the game has drifted from it. Section 4 is about that.

---

## 2. What the best similar games do that Dig does not

| Game | The idea | In Dig, in one line | Cost | Risk |
|---|---|---|---|---|
| Hi-Fi Rush | On the beat you hit harder. Off the beat nothing bad happens. | Tap on the loud beat for a Good Hit; holding the mouse works as today. | medium | Feels like homework if the window is tight. Keep it wide. |
| Crypt of the NecroDancer | Staying on the beat builds a coin multiplier; a miss only resets it. | A streak of Good Hits fills a Fever bar. | small (on top of the first) | Losing a long streak can sting. Drop it by half, not to zero. |
| Balatro, Peglin | The sound climbs with every link of a chain; the score counts up in front of you. | Each TNT pop in a chain plays one note higher, with "Chain 14!" on screen. | small | None worth naming. |
| Vampire Survivors | The chest is a show (its maker came from slot machines). The card tells you what it combines with. | Relic cards say "1 more for Barrel Boom". | small | More words on a card. |
| Brotato | You pick a character before the run; each one bends the rules (a strength and a weakness). | Pick a Head Digger hat at the start of a level: "Powder Man: TNT twice as big, pick half as strong". | medium | Balance. One hat may beat all others. |
| Dome Keeper | Every upgrade is felt at once, and many add a new move, not a number. "If the upgrades never change or add mechanics, it's a bit boring." | Star steps that are x1.5 become moves (section 4). | large | Touches the whole economy. |
| SteamWorld Dig 2 | A hand-made world: secrets you can see but not reach yet; a new tool just when you got comfortable. | One authored thing buried in each level, in the same spot for everyone. | medium per land | Hand work: 20 things to draw. |
| Motherload | Deeper always pays more, and the deep holds strange things nobody told you about. | Rare buried oddities (a bus, a fridge, a satellite) that go to the Museum. | small | None. |
| Mr. Mine | Things turn up in the mine while you are away: chests, a trader, caves. (It uses timers and paid skips. Leave those out.) | On return, the Rafeeqs have left one wrapped find in the ground for you to break open. | small | Must not grow with hours away, or it punishes short visits. |
| Cookie Clicker, Melvor Idle | A long list of small feats and a completion number. People chase "214 of 300" for months. | The Book of the Dig: drawn stamps, each for one feat. | small to start | A list of chores if the feats are dull. |
| Balatro | After you win, stakes: the same game with one more hard rule each time. | Contracts become a ladder of five steps per level. | medium | Only for the keen. Keep it off the main road. |
| Idle Miner Tycoon | A manager per shaft with one visible skill. | Already here (the Foreman, the manager). Nothing to add. | | |

---

## 3. My ideas

Size: S = about a day, M = a few days, L = a week or more.

### A. The minute-to-minute dig

| # | Idea | What the player does or sees | Why | What could go wrong | Size |
|---|---|---|---|---|---|
| 1 | **Good Hit** | One step of the bar is the loud one. A ring closes on the pick as it comes. Tap Space (or click again) on it: the pick flashes, the drum cracks, the hit counts four times. Miss: nothing happens. Holding the mouse still digs. | "Active rewarding" in one move. The beat becomes a skill. | Too tight a window. Sound delay on some PCs. Start wide (a fifth of a beat each side). | M |
| 2 | **Fever ("Yalla!")** | Eight Good Hits in a row fill a bar. Then, for the next 32 hits, every Rafeeq hits on your beat, a new instrument joins, coins fly bigger. A miss halves the bar. | The dopamine peak, earned, every minute or two. It also makes the Rafeeqs visibly yours. | Too strong: the walls stop holding. Cap it and sim it. | M |
| 3 | **The chain sings** | Every pop in a chain is one note higher. A counter grows: "Chain 9!". Your best chain is kept and shown. | Free pleasure from what is built. Makes TNT a thing you set up. | Noise on huge chains. Stop climbing at two octaves. | S |
| 4 | **Keystones** | Now and then a block has a drawn crack. Break it and the blocks above it fall and break. You start to look for them. | Makes "where do I point" a real choice. | If too common, the dig plays itself. About one in four rows. | M |

### B. The level

| # | Idea | What the player does or sees | Why | What could go wrong | Size |
|---|---|---|---|---|---|
| 5 | **One buried surprise per level** | Placed by hand, same for everyone. Examples: a fuse that runs the whole length of Powder Valley, lit at the top; a sleeping dhab that wakes, runs and leaves a tunnel; a buried bus full of chests; a well that floods the three rows below; a lost Rafeeq with a lamp in the Black, who joins you. | Cures "repeat". Twenty levels become twenty memories. | Hand work. Do one land at a time. | M per land |
| 6 | **A Gate with a trick** | Each land's Gate has its own rule. Africa: the crack jumps on the drum, and it shows where it goes next. East Asia: four plates, broken in the order the bells ring. Americas: it hits back, so you whistle the Rafeeqs clear. Europe: two cracks, both to be hit in the same bar. | A boss that is more than a bar. And "prove it" can mean "do the trick", not "the same rock four times harder". | A trick a child cannot read. Each needs one drawn hint. | M each |

### C. Builds

| # | Idea | What the player does or sees | Why | What could go wrong | Size |
|---|---|---|---|---|---|
| 7 | **Named sets** | Three relics of one family make a set with a name and a badge, and change the pick: Powder Man (you throw TNT where you point), Water Carrier (water follows your pick and washes ore to you), Camp Boss (your pick is weak, the Rafeeqs copy every hit). | A build becomes a way of playing. | Three sets is enough to start. More is clutter. | M |
| 8 | **The card tells you, and Throw Back** | Cards show "1 more for Barrel Boom". Once a level you may throw the three cards back for three new ones. | You chase a build, you are not dealt one. | None worth naming. | S |

### D. The long game (no new money)

| # | Idea | What the player does or sees | Why | What could go wrong | Size |
|---|---|---|---|---|---|
| 9 | **The Book of the Dig** | A book of drawn stamps: "A chain of 20", "A Gate with no Rafeeqs", "All four Arabian surprises". Each pays a hat, a pattern, or only the stamp. A count on the cover: 41 of 150. | Week 3: something to chase on every visit. | Dull feats. Each must be a thing you would tell a friend. | S to start |
| 10 | **Five steps of hard** | After a level is finished, its stone on the map has five small pips. Each pip is the level again with one more hard rule. | Month 3: mastery of levels you know. Folds contracts, twists and the Hard medal into one idea. | Must stay off the main road. | M |

### E. Idle

| # | Idea | What the player does or sees | Why | What could go wrong | Size |
|---|---|---|---|---|---|
| 11 | **The story of the night** | Three small drawn panels from what really happened: "Saif hit water at 62 m." "Hamad found a chest and sat on it." Then one wrapped find sits in the ground. You break it open yourself. | Coming back becomes a present, opened with your own pick. | The find must not grow with hours away. One per return, sized by depth. | S to M |
| 12 | **A wish before you go** | One tap when you leave: "Look for bones", "Look for coins", "Go deep". The story shows how it went. | Idle becomes a choice with a result. | A wrong choice must still pay well. | S |

### F. Collection and pride

| # | Idea | What the player does or sees | Why | What could go wrong | Size |
|---|---|---|---|---|---|
| 13 | **The Museum as a room** | A drawn hall. Skeletons stand up bone by bone. The oddities sit on shelves. Small visitors come as it fills. A wall of records: deepest, best chain, fastest level, with the Rafeeq of each level's portrait. | Something to show. Today the Museum is a list. | Art time. Start with the wall of records only. | S, then L |

### G. The land

| # | Idea | What changes in the ground | Size |
|---|---|---|---|
| 14 | **Africa: roots** | A baobab root runs down through ten rows, hard as stone. Cut it at the top and the whole root dries and crumbles. | M |
| 15 | **East Asia: bell pots** | Clay pots ring a note when hit. Hit a row of them from low to high and they all burst with coins. | M |
| 16 | **Americas: carved stones** | Big stone blocks sit on small ones. Break the small one and the big one slides down and crushes what is below. | M |
| 17 | **Europe: the old mine** | Rails and a cart. Hit the cart and it rolls along the row and smashes it. Empty cellars with one chest. | M |

For all four: why is "each land is a new game for a few minutes"; what could go wrong is four more things to learn, so each land gets **one**, and it replaces something from Arabia (less TNT in East Asia, for example).

---

## 4. What to cut or simplify

| What | Why it does not earn its place | Do instead |
|---|---|---|
| Rafeeq Training | One decision asked twice (the pick study). | Merge it, as that study says. |
| The lucky big hit (one in twelve) | Luck does what skill should do. | When Good Hit works, lower it to one in thirty. |
| The combo coin bonus | Hard to notice; a second "streak" beside Fever would confuse. | Fever replaces it. |
| Metal and the Forge as a shop | It is a third kind of money for three tools. | The road gives the tools: the Drill at level 4, and so on. |
| Contracts, twists, Fast and Hard medals, side cards | Four ideas for "the level again, harder". | One: the five pips (idea 10). Keep the Fast medal. |
| The Foreman's five jobs | Five buttons; most players will use one. | Three: Beside me, Go for ore, Tea break. |
| x1.5 Star steps | Numbers, not moves. Stars reach millions. | Slowly turn each step into a move. A large job; not now. |
| Digging on below the Gate, on the road | It blurs "a level ends". | Only after level 20. |
| Several sites at once, earned automation, a second reset | Not built. | Leave them unbuilt. |
| The same four Arabian places in every land | It is why travel feels fake. | A place name per land, even before its ground thing exists. |

---

## 5. The top 8 to build next

The pick and Rafeeq merge is still waiting for your answer and is not ranked here. It fits before number 2.

| Rank | What | Smallest first version (a day) | How you would know it worked |
|---|---|---|---|
| 1 | **Good Hit** (idea 1) | Space on the loud beat counts four times. A closing ring. One new sound. Arabia's bar only. | You start tapping without being told, inside two minutes. You notice when you miss. Sim: a player who never taps is no slower than today; one who always taps is about a fifth faster. |
| 2 | **The chain sings** (3) | Rising notes and the counter. No rule changes. | You set up a chain on purpose. You say a number out loud. |
| 3 | **Fever** (2) | The bar, 32 hits, Rafeeqs on your beat. No new art. | You fight to keep the streak. Sim: Rafeeqs' share of ground while playing moves from 4% toward 15%; no Gate falls more than one try sooner. |
| 4 | **The story of the night** (11) | Three text lines with names, plus one wrapped block to break. Panels drawn later. | On opening the game you read the lines before you look at the coins. |
| 5 | **A Gate with a trick** (6) | Africa only: the crack jumps on the drum. Prove levels there drop from 4 times to 2 times as hard. | Sim: levels 6 and 8 take 2 to 3 tries, not 1. You lose once and want to go again. |
| 6 | **One surprise per level** (5) | Level 2's long fuse, and level 3's dhab. | You tell someone about it. On a replay you go looking for it. |
| 7 | **The card tells you, and Throw Back** (8) | The hint line and one throw a level. | You pass a strong card to wait for a pair. Sim: fusions made per level go up. |
| 8 | **Africa's roots** (14) | The root block and "cut the top". Africa's levels only. | Level 5 feels like a new place in its first three minutes. Sim: first new thing on screen inside three minutes of level 5. |

Numbers 5 and 8 are also the honest fix for the long wait at level 15: the wall there is made of the same ground repeated. Do not soften that wall again before the lands have ground of their own.

---

## 6. Decisions only you can make

| # | Question | My default |
|---|---|---|
| 1 | May tapping on the beat make an active player clearly faster (about a fifth)? | Yes. It never costs the one who only holds the mouse. |
| 2 | Drop metal and the Forge shop, and let the road hand out the tools? | Yes. |
| 3 | "Prove it" = the same rock much harder (today), or a Gate with a trick at twice as hard? | The trick. |
| 4 | Lands: keep the four Arabian places everywhere, or a named place and one ground thing per land, built one land at a time? | New places, Africa first. |
| 5 | After level 20: the random deal of three (today), or five pips of hard on every level? | The five pips. |

---

## Appendix: the games, in a few lines each

How sure: "read today" = from a source below. "From memory" = what is widely known of the game; not checked today. I give almost no sales or player numbers, because I could not check them.

| Game | The hook | What keeps people for months | When a run ends | How sure |
|---|---|---|---|---|
| Motherload / Super Motherload | Dig down, fill the hold, go up, sell, buy a better drill. Deeper pays more. | The pull of "a little farther down". Reviewers call the upgrades the best part and the trips up and down a grind. Super Motherload added bases underground to cut the trips. | No runs; one long descent. | Read today (reviews, Wikipedia). |
| SteamWorld Dig 1 and 2 | The same loop in a hand-made world with secrets. | A new tool just as you get comfortable; cogs you can move between upgrades at any time. Short games, about 10 hours. | No runs; a story with an end. | Read today (reviews); length from memory. |
| Dome Keeper | Dig calmly, then run home to fight. Each half gives the other a reason. | Simple parts, depth from how they meet. Every upgrade strong and felt at once. Sound warns of what is coming. Reviews say builds narrow after a few runs. | A score, new domes and gadgets opened. | Read today (maker interview). |
| Mr. Mine | A drill that goes down by itself; you sell and upgrade. | Chests in the shafts (gold ones about 1 in 158, maker's blog, may have changed), a trader, caves, 90 or so quests. Uses timers and paid skips. | No runs. | Read today (maker's blog, store page). |
| Idle Miner Tycoon | Shafts, a lift, a store; a manager makes each run alone. | Managers with skills, a reset that pays a lasting bonus, many mines. | The reset is the "run end": start over, earn faster. | Read today (wiki, guides). |
| Deep Town | Drill down through layers; build a chain of smelting and crafting. | The chain of crafts, new zones. One review: fun early, then waiting. | No runs. | Read today (store page, one review). |
| Vampire Survivors | Walk; weapons fire alone; pick 1 of 3 at each level-up. | Weapon pairs that evolve; a huge list of unlocks; chests as a show (the maker worked on slot machines). | A list of what you unlocked and gold for lasting upgrades. Runs are capped near 30 minutes. | Read today (Wikipedia, reviews); the 30 minutes from memory. |
| Brotato | Short waves, a shop between each. | Dozens of characters, each bending the rules, so every run starts as a different puzzle. | Unlocks a new character or item. | From memory; today's search confirmed only the basics. |
| Cookie Clicker | A number goes up. | Golden cookies (a reason to watch), a reset for lasting chips, hundreds of feats. Its sugar lumps ripen on a 24 hour clock: not for Dig. | The reset: you choose when. | Read today (wiki). |
| Melvor Idle, IdleOn | Many skills that level while away. | A completion log; many bars to fill at once. Melvor counts away time fully (a 24 hour cap was reported by players in 2022; not sure it still holds). | No runs. | Read today (forums; weak sources). |
| Peglin, Balatro | One action sets off a chain that counts up in front of you. | Relics and jokers that multiply each other; in Balatro, harder stakes after a win. Boss rounds that take one rule away. | Straight back to a new run; new cards opened. | Basics read today; stakes from memory. |
| Crypt of the NecroDancer | Move on the beat. | A coin multiplier for staying on the beat; a miss only resets it. | Diamonds for lasting unlocks. | Read today (Wikipedia). |
| Hi-Fi Rush | Fight on the beat. | "Rewarded for playing on the beat, not punished for not playing on the beat" (its director). | Not a run game. | Read today (reviews quoting the director). |
| Dig Dug | Not relevant: it is about enemies, not digging. | | | From memory. |

### Sources

- Dome Keeper, maker interview: https://www.gamedeveloper.com/road-to-igf-2023/how-dome-keeper-focuses-on-systems-that-feed-into-one-another
- Dome Keeper review: https://shacknews.com/article/132448/dome-keeper-review
- SteamWorld Dig 2 reviews: https://Gamespot.com/reviews/steamworld-dig-2-review/1900-6416767/ and https://www.godisageek.com/reviews/steamworld-dig-2-review
- Super Motherload: https://en.wikipedia.org/wiki/Super_Motherload , https://gamingtrend.com/reviews/dig-deeper-super-motherload-review/ , https://www.gameinformer.com/games/super_motherload/b/playstation4/archive/2013/11/22/digging-deep-shallow-play.aspx
- Mr. Mine: https://blog.mrmine.com/?p=86 , https://blog.mrmine.com/?p=2450 , https://apps.apple.com/app/id1659735369
- Idle Miner Tycoon: https://www.bluestacks.com/blog/game-guides/idle-miner-tycoon/idt-beginner-guide-en.html , https://www.appgamer.com/idle-miner-tycoon/strategy-guide/idle-miner-hints-and-tips
- Deep Town: https://www.commonsensemedia.org/app-reviews/deep-town , https://apps.apple.com/us/app/idle-mining-factory-deep-town/id1202240058
- Vampire Survivors: https://en.wikipedia.org/wiki/Vampire_Survivors , https://avclub.com/vampire-survivors-is-an-addictive-castlevania-parody-1848883748
- Brotato: https://www.allkeyshop.com/blog/en-us/pixel-sundays-brotato-news-k
- Cookie Clicker: https://cookieclicker.wiki.gg/wiki/Sugar_Lumps
- Melvor Idle: https://steamcommunity.com/app/1267910/discussions/0/591762563949134719
- Balatro: https://rogueliker.com/balatro-interview/ , https://gamedeveloper.com/design/balatro-creator-unveils-a-few-slick-signposting-strategies
- Peglin: https://en.wikipedia.org/wiki/Peglin
- Crypt of the NecroDancer: https://en.wikipedia.org/wiki/Crypt_of_the_NecroDancer
- Hi-Fi Rush: https://gameluster.com/a-deeper-look-into-hi-fi-rush/ , https://www.tuni.fi/playlab/an-upbeat-beat-em-up-on-the-beat-hi-fi-rush-review/
