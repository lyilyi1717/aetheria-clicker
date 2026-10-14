# Rafeeqs: names, wardrobe, personality (design study, 13 October 2026)

Read from the code, nothing run. Every proposal keeps section 7 of `docs/dig-design.md`: no clock gates, no power in a look, plain words, drawn art, desktop, old saves load, strings through `t()`.

## 1. What Rafeeqs are today

| Topic | Fact (file) |
|---|---|
| How many | Up to 8. Shop item `crew`, `max: 8`, first costs 30 coins, x4.2 each (`diggers/rules.js`). |
| How hired | Coin shop "Hire a Rafeeq" (opens at 60 coins earned). Also given free: the Camp Star track ("Rafeeq Waiting" 1/2/3, "The Whole Camp" 8, `starshop/rules.js`) and a level's start kit (`sites/rules.js`). |
| Do they last | No. `s.diggers` is `perSite` with no `survives`: every New Site starts with an empty list and refills it. A Rafeeq is only "the i-th entry of `s.diggers`". |
| What they do | Walk (6 blocks a second, x2 with Good Shoes) to a block chosen by a job, hit it 4 times a second. At a Big Rock every 2nd one sieves rubble for coins. They dig while you are away (up to 12 h). |
| Jobs | Foreman Abu Nasser arrives at 7 Rafeeqs or 3 Big Rocks: Beside me, Follow me, Go for ore, Dig down, Tea break (sit 6 s, then x2 for 8 s; Second Kettle removes the sitting). One job for all; `digger.job` for one exists but has no UI. |
| Moods | 14, looks only, page side, never saved (`moods/ui.js`): angry, kick, happy, rich, laugh, sooty, tea, doze, guilty, scared, dizzy, proud, cold, wet. Triggers: hard blocks, ore, chests, TNT (sooty, the others laugh and point), Big Rock near (scared), Rock down (proud), slacking with tea or a nap, caught by your pick (guilty). |
| Speech | 31 short lines, keyed by mood. One bubble per 4 s on screen, one per Rafeeq per 14 s, 55% chance. |
| Looks | All the same: blue bean, yellow head, goggles, red fez. 8 near-equal blues (`BLUES` in `diggers/art.js`). |
| Hats | Two from contracts (`cap`, `crown`), one for all, chosen on the contract board (`equip`, `s.contractLook.hat`). The Museum's Grandma's Tea Set also puts hats on all. Both are drawn as an overlay by another feature (`contracts/ui.js drawHats`, `wing2/ui.js`) while `drawRafeeq` only hides the fez (`hatsOn`). |
| Tally | Each has `id`, `broke`, `coins` for this site only. Rafeeqs from Stars or a kit are pushed without an `id` (Noticed, harmless today). |
| Rafeeqs tab | Drawer tab `camp`: a list "Rafeeq 3: 120 broken, 4.5K coins" with a blue dot, and the Foreman's job buttons. The code already says "a name can be given later". |
| Away card | Coins, metres, sieve time, bones, chests, one of 8 jokes about "a Rafeeq". Nobody is named. |

The gap in one line: they have moods but no self. Nothing stays with a Rafeeq from one level to the next, so there is nobody to dress or to like.

## 2. Every dimension

### 2.1 Identity

- **Exists:** a number. **Missing:** a name, and a self that outlasts a level.
- **Proposal: eight seats.** Seat `i` is the i-th Rafeeq at any site. The seat (name, trait, clothes, life record) survives New Site and Land; the body on the ground is rebuilt each level. "Saif" is always the first one waiting for you.
- **Names** (22, short, easy to say): Saif, Hamad, Nasser, Majed, Fahad, Salem, Rashid, Jaber, Talal, Bandar, Khalid, Sultan, Mansour, Faris, Ziad, Omar, Yousef, Hadi, Sami, Tariq, Badr, Nawaf. The first time a seat is filled it takes a random unused name (through `rnd()`), then keeps it for ever.
- **Renaming:** a pencil button on the wardrobe page. Up to 12 letters, any script, shown with `textContent`. Empty goes back to the given name. Free, any time.

### 2.2 Looks

- **Exists:** one fez, two contract hats, one Museum hat, all-or-nothing. **Missing:** clothes, per-Rafeeq choice.
- **Proposal:** three slots: head, body (cloth shape), cloth (colour and pattern). Everything is a look only; no item carries a number. (The Tea Set's existing hit bonus stays on the Museum set, not on the hat.)

| Slot | Free from the start | Earned by play |
|---|---|---|
| Head | Fez, Ghutra with agal, Hard Hat, Bare Head | Red Cap, Crown (contracts, already won ones count); Tea Cosy (Grandma's Tea Set); Pilot Cap (Lost Pilot's Kit); Pearl Band (Pearl Necklace); Straw Hat, Rice Hat, Wide Hat, Flat Cap (finish any level in the 2nd to 5th land); Gold Fez (all three medals on one level) |
| Body | Work Shirt, Thobe, Vest | Bisht (a robe with a gold edge: 5 Hard medals); Diver Suit (Dune Shark set); Oil Overalls (Old Oil Rig set) |
| Colour | Blue, Sand, Green, Red, White, Teal, Purple, Orange | Gold thread (10 medals), Night black (reach the Deep) |
| Pattern | Plain, Stripes, Shemagh check, Big dots | Zigzag (Sadu weave: 3 contracts won), Stars (finish level 20) |

Patterns are two-colour and at least 3 px wide so they read on a 30 px body. A locked item is shown grey with what earns it ("Finish a level in the second land"), never a timer, never a price.

### 2.3 The wardrobe page

First panel of the Rafeeqs tab (`tab: 'camp'`, above the list), inline so the dig keeps running:

```
  [ All Rafeeqs | This Rafeeq ]
        <   Saif   (pencil)   >        prev / next Rafeeq
        .--------------------.
        |   Rafeeq, drawn    |          canvas 120 x 140, same drawRafeeq,
        |   x3, idle, blinks |          he waves when a part changes
        '--------------------'
     <   (head icon)  Ghutra   >
     <   (body icon)  Thobe    >
     <   (cloth icon) Green    >        colours
     <   (weave icon) Stripes  >        patterns
        Eager: runs to shiny things.    one trait line
        [ Surprise me ]
```

- **All Rafeeqs:** arrows change everyone; the preview shows seat 1; prev/next is hidden.
- **This Rafeeq:** arrows change only him. A seat with its own choice keeps it when "All" changes later only if the owner says so (decision 2; default: "All" overwrites, with one "Undo").
- Arrows wrap, skip nothing: a locked item shows greyed with its unlock line and cannot be kept. Left/Right keys work when a row has focus. Clicking a row in the Rafeeq list opens this page on that Rafeeq.

### 2.4 Personality

**Decision: traits are pure flavour.** They change what you see and read, never a number. Reasons: no Rafeeq can be a wrong pick; no sim is needed (the owner's CPU is limited and the away sums are already wrong in two places); the owner's rule for this request is "pure cosmetics". If effects are wanted later, the only safe form is a sidegrade pair of equal weight (Eager walks 10% faster and hits 10% slower), tested by sim. Not in this build.

| Trait | What you see | Talks |
|---|---|---|
| Eager | Hops on the spot before a swing; first to cheer; never dozes | a lot |
| Sleepy | Yawns, slow blink; picks the nap, not the tea; last to notice things | little |
| Joker | Laughs twice as often; starts the laugh at a sooty mate; spins his pick | a lot |
| Careful | Looks left and right before TNT; taps a block before the first hit; wipes his goggles | medium |
| Proud | Chest out when idle; bows after an ore; hates being sooty | medium |
| Hungry | Looks at the kettle; first to the tea break; pats his belly | medium |

One trait per seat, dealt so the first six seats differ. Shown on the wardrobe page and the card. Fixed for now.

### 2.5 Speech

- **Exists:** mood bubbles with good rate limits. **Missing:** names in lines, trait voice, moments (new land, finish, hired), talk between two.
- **Rules:** keep the existing limits (one bubble on screen per 4 s, per Rafeeq 14 s). A reply is the only exception: one answer, 0.8 s after the first line, then both are quiet for 20 s. Nothing while a modal is open or during a Rock fight's last third. Max 5 words. A "Quiet Rafeeqs" switch in the tab.

| Moment | Eager | Sleepy | Joker | Careful | Proud | Hungry |
|---|---|---|---|---|---|---|
| Hired | "Me first!" | "Is it morning?" | "Who ordered a digger?" | "I brought my own pick." | "The best is here." | "Is there lunch?" |
| Ore | "Again, again!" | "Oh. Shiny." | "I planted that." | "Slowly now..." | "I knew it was there." | "Looks like candy." |
| TNT near | "Light it!" | "Wake me after." | "Not my eyebrows!" | "Step back, all." | "I am not scared." | "Smells like toast." |
| Big Rock | "Let me at it!" | "It is so big..." | "Nice rock. Bad rock." | "Aim for the crack." | "It should fear me." | "Rock for dinner?" |
| New land | "New sand! Yalla!" | "Long walk." | "Same sand, new hat." | "Watch your step here." | "They will know my name." | "What do they eat here?" |
| Finish | "One more level!" | "Now we nap." | "We broke the floor!" | "All safe. Good." | "Bow to us." | "Now we feast." |
| Patted | "Wallah, thanks!" | "Mmm." | "Careful, I am ticklish." | "Mind the hat." | "Yes, I know." | "Got dates?" |

To each other (pairs): "Tea, Salem?" / "Always." ... "Race you down!" / "You go. I watch." ... "Nice hat." / "It is new." ... "Was that you?" / "It was the rock."

### 2.6 Player to Rafeeq

- **Exists:** your pick near a slacker makes him guilty. **Missing:** anything on purpose.
- **Proposal:** the left button stays the dig. Resting the pick on a Rafeeq for half a second shows a name tag (name, trait, "312 broken"). A **right click** on him is a pat: he jumps, hearts are not used, a small drawn star pops, one line. A right click on the name in the tab list makes him wave on the dig so you can find him (a ring under his feet for 2 s). **Cheer** (key C or a button in the tab): all raise their picks and shout "Yalla!"; looks only, limited by the bubble rule, not by a cooldown number the player waits on.

### 2.7 Rafeeq to Rafeeq

- **Exists:** laughing together when close, pointing at a sooty one. **Missing:** who likes whom.
- **Proposal:** each seat has one **friend** and one **rival**, dealt once (friend: the seat hired next to him; rival: Proud with Proud or with the Joker when there is one). Friends high-five when a chest opens beside both, and sit together at the tea break. Rivals look at each other's tally: when one passes the other on blocks this level, the leader flexes and the other stamps. No number changes. The card says "Friend: Hamad. Rival: Talal."

### 2.8 Rafeeq to the world

| Thing | Reaction (new unless marked) |
|---|---|
| TNT | Careful steps back before it pops; Joker checks his eyebrows after (sooty and laugh exist) |
| Big Rock | scared exists; add: all look up when it comes into view; at one third health Eager shouts |
| Rock down | proud exists; add a group jump in a wave from left to right |
| New land | first 5 s: look around, one "new land" line, the land's hat is tried on if owned |
| The Deep | dark layer: they stand closer together; cold and wet exist |
| Chest, gem | happy and rich exist; friends high-five |
| Finish | all throw hats up (their own hats), then the finish card |

### 2.9 Growth and records

- **Exists:** blocks and coins this site. **Missing:** a life record, a best find, any praise.
- **Proposal:** a **Rafeeq card** (opens from the list and the name tag): his portrait in his clothes, name, trait, friend and rival, this level and all time: blocks broken, coins brought, best find (the richest block he broke, by name), levels finished. **Rafeeq of the level** on the finish card: the one with the most coins this level, drawn in his clothes with one trait line ("Saif brought 4.2K coins. 'One more level!'"). A tie goes to the lower seat. No prize, only the honour, and a small drawn ribbon on his row until the next finish.

### 2.10 Time away

- **Exists:** totals and a joke about nobody. **Missing:** who.
- **Proposal:** the away sums stay as they are; the card adds up to three named lines chosen from what really happened: "Saif went {n} m down." "Hamad sieved the rubble." "Salem found {n} chests." The joke takes a real name and fits his trait when it can ("Jaber napped in the shade, then worked twice as hard to hide it" goes to the Sleepy one). The split of the total is shown by seat order, not simulated.

### 2.11 Staying light on screen

No new always-on element. Name tags only under the pick. One bubble at a time as today. The wardrobe and cards live in the Rafeeqs tab. Patterns are cached sprites per (body, colour, pattern), 8 at most. Reduced motion turns off hops and waves. "Quiet Rafeeqs" turns bubbles off.

## 3. What to build first: three packages

Rafeeq number `i` everywhere below is his index in `s.diggers` (0 to 7) = his seat. Packages read each other only through `G` (`proto/game.js` re-exports every `rules.js`), with a fallback when the export is not merged yet (`G.rafeeqName ? G.rafeeqName(s, i) : t('crew_name', { n: i + 1 })`), so the three merge in any order. Each adds its own line to `features/index.js` and `features/ui.js` (the README allows it; the coordinator may add all three lines first).

### A. `rafeeqs`: names, traits, records

- **Owns:** `proto/features/rafeeqs/` (rules, strings, ui, css), `proto/features/diggers/ui.js` (the list rows, the card), `proto/features/away/ui.js` and `away/strings.js` (named lines), the one "Rafeeq of the level" line in `proto/features/sites/ui.js`, `test_proto_rafeeqs.js`.
- **State:** `rafeeqSeats: [{ name, given, trait, friend, rival, life: { broke, coins, best, levels } }]`, survives `site` and `land`. `rafeeqLevel` (who led this level) is per site. Seats are filled in a `step` hook when `s.diggers.length` is larger than the seat list, so the shop, Star and kit hires are all covered without touching `diggers/rules.js`. Life totals are banked in the `resetting` hook from each digger's `broke` / `coins`; best find from the `broke` hook (`b.src === 'crew'`, the digger whose `tr, tc` is that block).
- **Exports:** `rafeeqName(s, i)`, `rafeeqTrait(s, i)`, `rafeeqRename(s, i, text)`, `rafeeqStats(s, i)` -> `{ level: { broke, coins }, life: { broke, coins, best, levels } }`, `rafeeqPair(s, i)` -> `{ friend, rival }`, `rafeeqBest(s)` -> seat of the level, `RAFEEQ_TRAITS`, `RAFEEQ_NAMES`.
- **Tests:** a save without the slice loads and gets seats; names are unique and stable over `newSite`; rename trims, falls back when empty; totals bank on reset; kit and Star Rafeeqs (no `id`) get seats.
- **Done when:** the list shows names; a row opens the card; the finish card names one Rafeeq; the away card names up to three; `npm test -- proto` passes.

### B. `wardrobe`: looks and the page

- **Owns:** `proto/features/wardrobe/` (rules, strings, ui, css, `items.js` with the drawings), `proto/features/diggers/art.js`, the hat overlay in `proto/features/contracts/ui.js` (`drawHats` and the "Rafeeq hat" row of the board) and in `proto/features/wing2/ui.js` (the hat part only), `test_proto_wardrobe.js`.
- **State:** `wardrobe: { mode: 'all', all: { head, body, colour, pattern }, one: [null x 8], seen: {} }`, survives `site` and `land`. No migration: when `all.head` is empty, the wear falls back to `s.contractLook.hat`, then the Tea Set hat, then the fez, so an old save looks as it did.
- **Exports:** `wardrobeWear(s, i)` -> `{ head, body, colour, pattern }` (always whole, always owned), `wardrobeItems(slot)`, `wardrobeOwns(s, slot, id)`, `wardrobeWhy(s, slot, id)` (the unlock line's key), `wardrobeSet(s, who, slot, id)` with `who` = `'all'` or a seat, `wardrobeStep(s, who, slot, dir)` for the arrows, `wardrobeRandom(s, who)`.
- **Tests:** every item has a string and a drawing; a locked item cannot be set; "all" then "one" then "all" follows decision 2; old save with `contractLook.hat = 'crown'` wears the crown; no item id appears in any mod or hook (looks carry no power).
- **Done when:** the page matches the layout in 2.3; eight Rafeeqs in eight outfits can be told apart on the dig at normal zoom; contract and Museum hats are items here and no longer drawn twice.

### C. `chatter`: bubbles, traits on screen, interactions

- **Owns:** `proto/features/chatter/` (rules, strings, ui), `proto/features/moods/` (all three files: trait-weighted moods, the reply rule, the Quiet switch), `test_proto_chatter.js`.
- **State:** `chatterQuiet: false`, survives `site` and `land`. Everything else is page memory, as moods are today.
- **Exports:** `chatterSay(s, ev, i, moment)` (other features may make a Rafeeq speak), `chatterLines(trait, moment)` (for the test and the card's quote), `chatterCheer(s, ev)`.
- **Reads:** `G.rafeeqTrait`, `G.rafeeqName`, `G.rafeeqPair` (fallbacks: trait by `i % 6`, no pairs).
- **Tests:** every trait x moment has a line, at most 5 words, with no digits and no emoji; the rate rule never allows two bubbles inside 4 s except one reply; Quiet stops all; nothing in the folder writes a saved number.
- **Done when:** name tag under the pick, right-click pat, cheer, friend high-five, rival flex, the reactions in 2.8, and a ten-minute read of the dig never shows more than one bubble plus one reply.

### The shared seam

`drawRafeeq(g, s, d, i, bob, dt)` in `proto/features/diggers/art.js` is the one place a Rafeeq is drawn, and today it hard-codes `BLUES[i % 8]`, the fez and `hatsOn`. **Package B owns that change:** `drawRafeeq` asks `G.wardrobeWear(s, i)` for head, body, colour and pattern, draws them itself (so poses, the lying and sooty states carry the hat correctly), and exports `drawRafeeqAt(g, wear, size)` for the wardrobe preview, A's card and the finish card. The name is never drawn by the sprite: whoever needs it calls `G.rafeeqName(s, i)` (A). A and C never open `art.js`; B never opens `diggers/ui.js` or `moods/`.

## 4. Open decisions (defaults in use until answered)

1. **Traits: flavour or a small effect?** Default: flavour only.
2. **"All Rafeeqs" after single choices:** overwrite everyone or leave hand-dressed ones alone? Default: overwrite, with one Undo.
3. **Click on a Rafeeq:** the left button is the dig. Default: rest the pick for the name tag, right click to pat.
4. **Wardrobe as a panel in the tab or a full card that pauses the dig?** Default: panel in the tab.
5. **Names:** male Gulf names only, or a mixed list? Default: the 22 above; any can be renamed.

## Noticed (not part of this work)

- Rafeeqs given by Stars (`starshop/rules.js`) or a start kit (`sites/rules.js`) are pushed without `id`, `broke`, `coins`; the list shows them by position, and `crewGain` carries `id: undefined`.
- `foreman` supports a job per Rafeeq (`digger.job`) with no way to set it. A trait-flavoured "his favourite job" would be the natural next step after this work, and is a balance question.
