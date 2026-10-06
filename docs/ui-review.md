# UI/UX review (R21, #42)

**Inputs.** Screenshots of every tab, desktop 1280×800 and phone 375×812, from a fresh save and a
progressed save (Ascension VII, floor 60, depth 58), in `docs/ui/screenshots/`
(`<fresh|progressed>-<desktop|phone>-<tab>.webp`, plus the R11 ceremony, R11 toasts and the R12
offline modal). The fixes are drawn in `docs/ui/mockups/` and specified in
`docs/ui-style-guide.md`. Taken on `main` at `6437f1f` (after R11).

The screenshots, mockups and the token set come from the design review persona (Kai Moreno,
principal game UI/UX designer). The written findings below were finished from that material
after the review session was cut off.

Screenshot caveat: the sandbox could not reach Google Fonts, so display titles render in the
serif fallback instead of Cinzel. That is not a bug in the game.

---

## Verdict

The game has a real identity: a dark emerald night, neon currency colours, the falafel orb and
meme flavour. The newest pieces (R11 toasts and ceremonies, the R12 welcome-back modal) are
the best-designed UI in the game. Keep that look.

The problems are layout, not style. **On a phone the game is unplayable.** The header and the
fixed sidebar fill the whole first screen, and the falafel, the one thing you tap, is never
visible. **On desktop the most important thing on every tab sits below the fold**, under a
two-row header, a 120–190px "How It Works" essay and a strip of bonus chips. A clicker whose
click target is off-screen loses its dopamine loop before it starts.

Fix the shell (header, navigation, guide banners) once and every tab improves at the same time.
That is follow-up issue **UI-1** below and the first thing to build.

---

## Ranked findings

Impact: **H** blocks play or hides the core loop · **M** slows the player down or reads badly ·
**L** polish.

| # | Impact | Finding | Where | Fix |
|---|---|---|---|---|
| 1 | H | **Phone: no content.** The fixed 220px sidebar plus a ~260px wrapped header leave a ~130px column at 375px. The falafel, monster and dig grid are off-screen; guide text wraps one word per line. | `fresh-phone-*.webp`, `progressed-phone-*.webp`; `#side-nav` `width: 220px` in `css/style.css` | Bottom tab bar (Falafel · Tower · Dig · Ascension · More) + "More" sheet below 640px, icon rail 640–1023px. See `mockups/app-shell.html`. **UI-1** |
| 2 | H | **Desktop: the core action is below the fold.** On Falafel at 1280×800 the orb starts at ~y 740; on Excavation the 6×6 grid is entirely below the fold, under a 250px decorative shovel image; the Ascend button sits under an empty-looking art panel. | `progressed-desktop-monolith.webp`, `-mining.webp`, `-prestige.webp` | Header to one row (56px), guide banner collapsed to one line, art panels removed or shrunk to a 64px icon beside the title. The action (orb, grid, monster, Ascend) is the first thing in every tab. |
| 3 | H | **The header costs 130px on desktop and ~260px on phone** to show six currencies, Fast Forward, a sound toggle and a volume slider. Mana is a bar among numbers; nothing says which number matters now. | every screenshot; header markup in `index.html` | One-row header: Aether as the hero number with its /s, then Gold and Dust; other currencies only on the tabs that use them. Fast Forward and sound move into the header's right edge (desktop) or the More sheet (phone). A "next goal" chip shows the nearest target. |
| 4 | H | **Every tab opens with a "How It Works" essay** (11 of them, 3–6 lines each, 120–190px), forever, including for a player at Ascension VII. | `index.html` (11 `How It Works` blocks) | Show it expanded only on the first visit (R7 first-visit banner: one highlighted action, one starter gift), then collapse to a one-line hint with "More". See `mockups/tab-unlock.html` phase 3. |
| 5 | H | **Fresh save shows all 14 tabs.** A new player sees Constellations, Bounties, Bazaar and Ascension with nothing in them. | `fresh-desktop-*.webp` | R7 progressive unlock: the nav starts with Falafel plus one "???" teaser that shows its live unlock trigger. See `mockups/tab-unlock.html`. |
| 6 | M | **Combat floating numbers leak onto other tabs.** Hero damage numbers (`-52,083`) and particles draw over the Excavation guide and the Tower quick-cast chips. | `progressed-desktop-mining.webp`, `progressed-desktop-combat.webp` | Clip combat floating text to the arena, and skip spawning it when the Tower tab is hidden. This is a bug, so it goes in STATUS.md "Noticed", not a UI item. |
| 7 | M | **Unstyled buttons.** Talent "+ Upgrade" buttons render as white browser-default buttons, the only ones in the game. | `progressed-desktop-talents.webp`; `js/main.js` talent card render | Use `.btn .btn-sm .btn-dust`. The card shows the rank as a segmented bar, not "Rank 2 / 10" text. |
| 8 | M | **Too many accent colours with no meaning.** Cyan, gold, purple, green, rose and red are used for borders, titles and buttons interchangeably. Purple marks both Dust and spells; gold marks both Gold and achievements; the card border is a 0.6-alpha green on every card. | all tabs; `:root` in `css/style.css` | One accent per currency or system (style guide §2). Gold is the only filled button colour, so "you can buy this" reads the same everywhere. Card borders go to a neutral hairline; the brand green stays on the active panel only. |
| 9 | M | **Affordability is hard to see.** Generator buy buttons look the same whether affordable or not (cyan outline either way). | `progressed-desktop-monolith.webp` | Affordable: gold border on the row + gold button. Not affordable: neutral button that says what's missing ("need 2.1e13"). |
| 10 | M | **"Active bonuses" strip grows without limit** (7 chips on Falafel at Asc VII, more later) and pushes content down. | `progressed-desktop-monolith.webp` | Collapse to one line ("7 bonuses · ×4.1 Aether") that expands on tap; per-chip detail in a tooltip/sheet. |
| 11 | M | **Toasts overlap the header** on desktop: the stack starts at y≈72 and covers the currency row. | `progressed-desktop-toasts.webp`; `css/rewards.css` | Anchor the stack below the header (`top: calc(var(--header-h) + 8px)`); on phone, top edge full-width (already done). |
| 12 | M | **The UI font is not the one loaded.** `index.html` loads Inter from Google Fonts but `--font-sans` is Segoe UI / system, so Inter is downloaded and unused, and the game looks different on every OS. | `index.html` fonts link; `--font-sans` in `css/style.css` | Make Inter the UI font (`--font-ui`), Cinzel for display titles only (tab titles, ceremonies, toasts). |
| 13 | M | **Numbers jitter.** Currency values are proportional-width, so the header jumps every tick. | header, generator yields | `font-variant-numeric: tabular-nums` on every changing number (`.num`). |
| 14 | M | **Hover-only information.** Bonus chips, gear and buffs explain themselves only on hover; phones have no hover. | all tabs | Tooltip component that opens as a bottom sheet on touch (style guide §5.8). |
| 15 | L | **Rarity is colour-only and Legendary is red,** which collides with danger and fails for red-green colour blindness. | `progressed-desktop-combat.webp` (Epic purple, Legendary red border) | Colour + glyph count + word on every item; Legendary moves to orange (style guide §2.4). |
| 16 | L | **Reduced motion is partial.** R11 rewards respect `prefers-reduced-motion`; the orb spin, background particles, screen shake and nav hover slide do not, and there is no in-game toggle. | `css/rewards.css` has the media query; `css/style.css` / `animations.css` don't | Global reduced-motion rule (style guide §6) plus a Settings toggle that sets `data-motion="reduced"` on `<html>`. |
| 17 | L | **Small text and low contrast in places**: 0.65–0.75rem captions in `--text-dim` on card backgrounds, the mana number over its bar. | header, generator rows | Minimum 11px, captions in `--text-3` (5.7:1 on cards); never text on a coloured bar without a shadow. |

### What already works (keep it)

- **R11 ceremony** (`progressed-desktop-ceremony.webp`): big, readable, skippable ("Tap or press
  Esc"), dims rather than hides the game. The model for every "big" moment.
- **R12 welcome-back modal** (`progressed-phone-offline-modal.webp`): the one screen that already
  works at 375px; clear hero number, an honest table of what was paid and why, one button.
- **Generator rows**: icon, name, count, flavour text and yield in one row is the right density.
  Only affordability and the buy button need work (#9).
- **Currency colour identities**: Aether cyan, Gold amber, Dust violet are already learned by
  players. The style guide keeps all three.

---

## Per screen

| Screen | Main issue | Direction (mockup) |
|---|---|---|
| Shell (all) | #1, #3, #4, #10 | `app-shell.html` |
| Falafel | orb below the fold; upgrades (R5) need room | orb first, generators beside it on desktop, under it on phone; R5 upgrades as a compact scroller (`components.html`, R5 note) |
| Void Tower | arena below the fold; 4 skill buttons as plain text boxes | arena first; skills as icon buttons with a cooldown sweep; gear with rarity glyphs (#15) |
| Excavation | grid below a decorative image | grid first, image removed; depth and pickaxe in one line above it |
| Garden | 16-plot grid fine on desktop, 2 columns too narrow on phone | 4×4 grid at 375px with 72px plots; Water/Fertilize as a sticky action row |
| Alchemy / Grimoire | long lists of recipes with equal weight | brewable first, gold border; the rest dimmed with "missing X" |
| Constellations | browser-default buttons (#7); 5 branches look identical | branch colour stripe + segmented rank bar; upgrade buttons `.btn-dust` |
| Bounties | will be replaced by R10 | `contract-board.html` |
| Bazaar | price table is readable; buy/sell buttons too small on phone | 44px tap targets; price trend arrows |
| Ascension | Ascend button below an art panel; perk list will be replaced by R6 | `dust-shop.html` (Ascend hero card at the top shows gain / reset / keep in one line) |
| Codex | 24-card wall today; R14 is reshaping it | `components.html` R14 note: one Codex %, collection tiles, ladders grouped |
| Settings / Leaderboard | fine; save/export/import must stay reachable when tabs are gated | keep in Settings, reachable from the More sheet |
| New screens | — | Dust shop `dust-shop.html` · tab unlock `tab-unlock.html` · contract board `contract-board.html` · shard tree `shard-tree.html` · daily/weekly `daily-weekly.html` · Chronicle `chronicle.html` |

---

## First session (onboarding)

- **0–60 s.** Today: 14 tabs, a header with six zeros, a paragraph of instructions, and the orb
  half off-screen. Target: the orb in the middle, one line "Tap the falafel", the Aether number
  counting up, and the first generator's buy button turning gold as soon as it's affordable.
- **First 10 min.** Each new tab arrives as an R7 reveal (toast + gold nav item, never a
  modal), with a first-visit banner that highlights exactly one action and gives a starter
  gift. Only the next locked tab is teased, with its live trigger and progress (for example "Tower: own N Shawarma Stalls ·
  7/N"; the real triggers are in `docs/gamification-roadmap.md` §2).
- **First session.** The "next goal" chip in the header always shows the nearest target (next
  unlock, next milestone, Ascension at X). Something visibly approaches every few minutes; that
  anticipation is the hook the redesign is built on.

## Accessibility checklist (applies to every UI PR)

- Text contrast ≥ 4.5:1 (body) and ≥ 3:1 (large/bold numbers); the tokens are pre-checked.
- Tap targets ≥ 44px on touch (`@media (pointer: coarse)`).
- Rarity and state never by colour alone: glyph or word too.
- Reduced motion honoured (OS setting and in-game toggle); nothing flashes more than 3 times a
  second; screen shake off under reduced motion.
- Every hover tooltip has a tap equivalent.
- Focus is visible (`:focus-visible` outline) and every control is a real `<button>`.

---

## Proposed follow-up issues

Ready to paste into GitHub. Each is larger than any single roadmap item should absorb.

### UI-1: Responsive app shell (header, navigation, guide banners)

- **Goal:** Make the game playable at 375px and put each tab's main action above the fold on
  desktop. Findings #1–#4, #10, #11.
- **Spec:** `docs/ui-review.md` findings 1–4, 10, 11; `docs/ui-style-guide.md` §7 (layout);
  `docs/ui/mockups/app-shell.html`.
- **Files:** `index.html` (header, nav, guide banners), `css/style.css` (shell), new
  `css/tokens.css`, new `js/ui/shell.js` (bottom nav, More sheet, collapsible guide), small
  wiring in `js/main.js` (`switchTab`).
- **Done when:**
  - [ ] Desktop ≥1024px: 220px sidebar, one-row 56px header; 640–1023px: 64px icon rail; <640px:
    bottom tab bar (Falafel · Tower · Dig · Ascension · More) and a More sheet with the rest
  - [ ] The buff bar, which is fixed to the bottom on phones (`.buff-bar` in `css/style.css`), sits above the bottom nav
  - [ ] "How It Works" collapses to one line after the first visit (state saved in settings)
  - [ ] Toasts start below the header
  - [ ] Screenshots of every tab at 1280×800 and 375×812 in the PR; no horizontal scroll at 375px
  - [ ] `npm test` passes

### UI-2: Design tokens and base components

- **Goal:** One set of colours, type, spacing and button/card styles, so every tab and every
  new screen looks like the same game. Findings #7–#9, #12, #13, #15, #17.
- **Spec:** `docs/ui-style-guide.md` §2–§5; `docs/ui/mockups/components.html`.
- **Files:** new `css/tokens.css` (from style guide §2–§4, imported first in `index.html`), new
  `css/components.css` (`.btn`, `.card`, `.chip`, `.bar`, `.num`, rarity), `css/style.css` (old
  variable names aliased to the new tokens, then migrated tab by tab), talent and generator
  render code in `js/main.js` (class names only).
- **Done when:**
  - [ ] Tokens and components exist; old `--accent-*` / `--text-*` names alias to them so nothing
    breaks
  - [ ] Inter is the UI font; all changing numbers use tabular figures
  - [ ] Talent buttons, generator buy buttons and gear cards use the new components; affordable
    = gold
  - [ ] Rarity shows colour + glyph + word; Legendary is orange
  - [ ] Before/after screenshots of Falafel, Tower and Constellations in the PR
  - [ ] Can land before or after UI-1; if both are in flight, UI-2 owns `css/tokens.css`

### UI-3: Reduced motion and touch tooltips

- **Goal:** Respect players who need less motion, and make hover-only information reachable on
  phones. Findings #14, #16.
- **Spec:** `docs/ui-style-guide.md` §5.8, §6.
- **Files:** `css/animations.css`, `css/style.css`, `js/engine/ParticleEngine.js` (respect the
  setting), new `js/ui/tooltip.js`, Settings markup in `index.html`.
- **Done when:**
  - [ ] Settings toggle "Reduce motion" (defaults to the OS setting) sets `data-motion="reduced"`
  - [ ] Under it: no orb spin, no screen shake, no background particles, ceremonies short (R11
    already supports this)
  - [ ] Bonus chips, gear and buffs open their tooltip as a bottom sheet on tap
  - [ ] `npm test` passes

### Bug (add to STATUS.md "Noticed")

- Combat floating damage text and particles render over other tabs (finding #6;
  `progressed-desktop-mining.webp`). A fix was attempted in `1ae4d47` for auto-attacks; some
  spawn path still leaks.
