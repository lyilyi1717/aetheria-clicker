# Aetheria UI style guide

The visual rules every UI change follows. The mockups in `docs/ui/mockups/` are built from
exactly these tokens; open `docs/ui/mockups/components.html` in a browser to see every piece
live. Findings that motivate these rules are in `docs/ui-review.md`.

**Direction in one line:** keep the game's dark emerald night and neon currency colours; give
every colour one meaning; put the action first; make "you can buy this now" look the same
everywhere.

---

## 1. Principles

1. **The action comes first.** On every tab the thing you tap (orb, monster, grid, Ascend)
   is above the fold at 1280×800 and at 375×812. Explanations and art come after it or
   collapse.
2. **One meaning per colour.** Each currency or system owns one accent. Gold is the only
   filled button colour and always means "you can buy or claim this now".
3. **One hero number per screen.** The number the player is growing on that tab is the
   biggest thing on it. Everything else is secondary.
4. **Honest states.** Locked things say what's missing and roughly when. Timers say real time.
   No fake urgency, no streak counters (AGENTS.md rule 8).
5. **Reward size matches the moment.** Small, medium, big and epic rewards look and sound
   different (the R11 tiers; see §5.6). Nothing pulses forever.
6. **Phone is a first-class screen.** Everything works one-handed at 375px with 44px targets.

---

## 2. Colour

### 2.1 Tokens

These live in `css/tokens.css` (linked first in `index.html`); the components in §5 live in
`css/components.css`. Use the tokens directly in new CSS; don't copy them.

```css
:root {
  /* Surfaces */
  --bg-0: #050a07;            /* page */
  --bg-1: #0a140f;            /* header, nav, modal */
  --bg-2: #0f1d16;            /* card */
  --bg-3: #16271e;            /* card hover / nested */
  --bg-4: #1e3328;            /* pressed / selected */
  /* Lines */
  --line-1: rgba(148, 163, 184, 0.14);   /* hairline */
  --line-2: rgba(148, 163, 184, 0.28);   /* control border */
  --line-brand: rgba(52, 211, 153, 0.35);/* brand card border (was 0.6) */
  /* Text */
  --text-1: #f1f5f9;          /* primary   15.9:1 on bg-2 (card) */
  --text-2: #b7c3cf;          /* secondary  9.7:1 on bg-2 */
  --text-3: #8795a6;          /* tertiary / captions 5.7:1 on bg-2, 5.1:1 on bg-3 */
  --text-on-accent: #0b1308;
  /* Accents (one per currency / system) */
  --aether: #38bdf8;  --aether-dim: rgba(56, 189, 248, 0.14);
  --gold: #fbbf24;    --gold-dim: rgba(251, 191, 36, 0.14);
  --dust: #c084fc;    --dust-dim: rgba(192, 132, 252, 0.14);
  --shard: #f472b6;   --shard-dim: rgba(244, 114, 182, 0.14);
  --life: #34d399;    --life-dim: rgba(52, 211, 153, 0.14);
  --mana: #60a5fa;    --mana-dim: rgba(96, 165, 250, 0.14);
  --sand: #e7c38a;    --sand-dim: rgba(231, 195, 138, 0.14);   /* Chrono Sand, Chronicle, Souq */
  --danger: #f87171;  --danger-dim: rgba(248, 113, 113, 0.14);
  --ok: #34d399; --warn: #fbbf24; --bad: #f87171;
  /* Rarity (colour-blind safe: lightness ladder + glyph + label, never colour alone) */
  --rarity-common: #9aa5b1;
  --rarity-rare: #56b4e9;
  --rarity-epic: #b388ff;
  --rarity-legendary: #ef8a3c;
  --rarity-cosmic: #ffd84d;
  /* Type */
  --font-display: 'Cinzel', Georgia, serif;
  --font-ui: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  --fs-11: 0.6875rem; --fs-12: 0.75rem; --fs-13: 0.8125rem; --fs-14: 0.875rem;
  --fs-16: 1rem; --fs-18: 1.125rem; --fs-20: 1.25rem; --fs-24: 1.5rem; --fs-32: 2rem;
  --lh-tight: 1.2; --lh-body: 1.45;
  /* Space (4px grid) */
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-5: 24px; --sp-6: 32px; --sp-7: 48px;
  --gutter: 16px;
  /* Radius */
  --r-1: 6px; --r-2: 10px; --r-3: 14px; --r-pill: 999px;
  /* Elevation */
  --el-1: 0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.35);
  --el-2: 0 1px 0 rgba(255,255,255,0.06) inset, 0 12px 32px rgba(0,0,0,0.5);
  --el-3: 0 24px 64px rgba(0,0,0,0.65);
  --glow-gold: 0 0 0 1px var(--gold), 0 0 18px rgba(251,191,36,0.45);
  --glow-dust: 0 0 0 1px var(--dust), 0 0 18px rgba(192,132,252,0.45);
  /* Motion */
  --dur-1: 120ms; --dur-2: 200ms; --dur-3: 320ms;
  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-pop: cubic-bezier(0.2, 1.4, 0.4, 1);
  /* Layout */
  --header-h: 56px; --nav-w: 220px; --rail-w: 64px; --bottom-nav-h: 60px; --tap: 44px;
}
@media (prefers-reduced-motion: reduce) {
  :root { --dur-1: 0ms; --dur-2: 0ms; --dur-3: 0ms; }
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

### 2.2 What each accent means

| Token | Means | Use for | Never for |
|---|---|---|---|
| `--aether` cyan | Aether, the core currency; also focus and links | Aether numbers, active nav item, focus ring | warnings |
| `--gold` amber | Gold, **and "affordable / claimable now"** | the only filled button colour; affordable borders; achievements | decoration |
| `--dust` violet | Cosmic Dust, Ascension layer | Dust numbers, Dust shop buttons, talents | spells (use `--mana`) |
| `--shard` pink | Fracture Shards, Transcend layer | shard numbers, shard tree | anything else, ever |
| `--sand` warm sand | Chrono Sand, Chronicle layer, Souq | Chronicle screens, Fast Forward, daily/weekly | — |
| `--life` green | Health, success, brand | hero HP, "owned", positive deltas | buttons |
| `--mana` blue | Mana and spells | mana bar, spell buttons | Aether |
| `--danger` red | Danger, enrage, loss | boss timer, destructive confirm, "you lose this" | rarity |

New layers get a new accent (as Chronicle gets sand) so a new layer feels like a new place.

### 2.3 Old → new names

The current variables alias these in `css/style.css` (`:root`), so existing CSS keeps working
while tabs migrate.

| Current (`css/style.css`) | New token |
|---|---|
| `--bg-primary` | `--bg-0` |
| `--bg-secondary` | `--bg-1` |
| `--bg-card` / `--bg-card-hover` | `--bg-2` / `--bg-3` |
| `--border-color` (green 0.6) | `--line-1` on cards; `--line-brand` on the active panel only |
| `--accent-cyan` | `--aether` |
| `--accent-gold` | `--gold` |
| `--accent-purple` | `--dust` |
| `--accent-green` | `--life` |
| `--accent-rose` | `--shard` |
| `--accent-red` | `--danger` |
| `--text-main` / `--text-muted` / `--text-dim` | `--text-1` / `--text-2` / `--text-3` |
| `--font-sans` | `--font-ui` (Inter, already loaded in `index.html`) |

### 2.4 Rarity

Colour **and** glyph count **and** the word, always all three. The colours are a lightness
ladder chosen to stay distinct under common colour blindness.

| Rarity | Token | Glyph |
|---|---|---|
| Common | `--rarity-common` | ● |
| Rare | `--rarity-rare` | ●● |
| Epic | `--rarity-epic` | ●●● |
| Legendary | `--rarity-legendary` (orange, not red: red means danger) | ◆◆◆◆ |
| Cosmic | `--rarity-cosmic` | ★★★★★ |

Only Cosmic may glow. Gear cards show rarity as a 4px left border plus the glyph label.

---

## 3. Type

- **UI:** Inter (`--font-ui`), 14px body, line height 1.45.
- **Display:** Cinzel (`--font-display`), only for tab titles, the wordmark, toast titles,
  ceremonies and modal titles. Never for numbers or body text.
- **Numbers:** every changing number gets `.num` (`font-variant-numeric: tabular-nums`) so it
  doesn't jitter. Timers can use `--font-mono`.
- **Scale:** 11 / 12 / 13 / 14 / 16 / 18 / 20 / 24 / 32 px (`--fs-*`). Nothing under 11px.
- **Hero number:** 32px, weight 800, in the currency's accent, with its rate (`+4.4e10 /s`) in
  `--text-3` beneath.
- **Eyebrow labels** (currency names, section labels): 11px, 700, uppercase, 0.08em tracking,
  `--text-3`.

---

## 4. Space, radius, elevation

- **4px grid:** `--sp-1` 4 → `--sp-7` 48. Card padding 16; gap between cards 12; page gutter 16.
- **Radius:** 6 for controls, 10 for cards, 14 for modals and sheets, pill for chips.
- **Elevation:** `--el-1` cards, `--el-2` toasts and tooltips, `--el-3` modals and sheets.
  Glows (`--glow-gold`, `--glow-dust`) only on hover of a primary action or on a "ready" item.

---

## 5. Components

All of these are drawn in `docs/ui/mockups/components.html` with their exact CSS.

### 5.1 Buttons

| Variant | Class | Use |
|---|---|---|
| Primary | `.btn .btn-primary` (gold fill) | buy, claim, confirm. **At most one per card.** |
| Currency action | `.btn-aether`, `.btn-dust` | actions paid in that currency (Dust shop buys, talents) |
| Secondary | `.btn` | neutral actions |
| Ghost | `.btn-ghost` | low-priority (close, sound) |
| Danger | `.btn-danger` (outline) | destructive confirm only |
| Locked | `.btn.is-locked` + `aria-disabled="true"` | shows what's missing: "need 8.0e14", "Asc 5" |
| Buy | `.btn-buy` | two lines: amount ("Buy +10") and cost |

Sizes: 32 (`.btn-sm`), 40 (default), 48 (`.btn-lg`); on touch every button is ≥ 44px. Buy-amount
selectors use the segmented control (`.seg`, pressed = aether fill).

### 5.2 Cards and rows

- `.card`: `--bg-2`, hairline border, 10px radius, `--el-1`.
- `.card-row` for list items (generators, contracts, shop items): icon tile (44px), text block,
  action on the right. States: `.is-affordable` (gold border), `.is-owned` (brand border),
  `.is-locked` (0.72 opacity, but the text stays readable and says why).
- Never stack more than ~8 equal-weight rows without grouping or a "N more" control.

### 5.3 Chips, tags, badges

- **Chip** (`.chip.<accent>`): a value with meaning (`×1.12 Aether`, `+10 dust`). Accent
  matches the currency.
- **Tag** (`.tag`, `.tag.new`, `.tag.tier`): tiny uppercase labels.
- **Badge** (`.badge`) for counts on nav items; **pip** (`.pip`) for "something new here". A
  pip appears only when there is something to do (an unclaimed gift, a ready contract), never
  as a nag.

### 5.4 Progress bars

`.bar` with an `<i style="width:N%">` fill in the system's accent. 8px default, 12px (`.lg`)
for combo and HP, 18px (`.xl`) with the label inside for boss timers. Segmented bars (`.segs`)
for small counts (talent ranks, seals). Always show the number next to the bar (`.bar-row
.val`); never only colour.

### 5.5 Number display

Short form above 1e6 in the player's chosen notation (`BigNum` formatting), with the full value
in the tooltip. Rates in `--text-3` under or after the value. Positive deltas in `--life`,
losses in `--danger`. Count up over 0.8s on big moments (R11), snap otherwise.

### 5.6 Toasts and ceremonies (R11 tiers)

| Tier | Component | Look |
|---|---|---|
| Small | floating text at the source / `.toast.small` | no display font, 0.92 opacity |
| Medium | `.toast.<accent>` | icon, Cinzel title in the accent, value line; 4px accent left border |
| Big | `.toast.big` or the R11 ceremony | accent gradient, thicker border; ceremony dims the game |
| Epic | ceremony with a keep/lose confirm | full screen, unique per layer (Transcend pink, Chronicle sand) |

Toast stack: top right **below the header** (`top: calc(var(--header-h) + 8px)`), max 3, never
blocks input; on phone, full width at the top edge.

### 5.7 Modals and sheets

`.scrim` + `.modal`: `--bg-1`, 14px radius, max 480px, title in Cinzel gold, actions full-width at
the bottom. **On phone a modal becomes a bottom sheet** (full width, rounded top corners,
safe-area padding). Epic confirms (Ascend, Transcend, Chronicle) list exactly what is kept and
what is lost, in two columns.

### 5.8 Tooltips

`.tip .tipbox`: `--bg-1`, `--el-2`, max 300px, 12px text, strong in gold. **Hover is never the
only way in:** on touch, tapping the element (or its ⓘ) opens the same content as a bottom
sheet.

### 5.9 Navigation

- **Desktop ≥1024px:** 220px sidebar with groups (Core / Craft / Meta / Records), active item
  in `--aether-dim` with an aether border.
- **Tablet 640–1023px:** 64px icon rail, labels in tooltips.
- **Phone <640px:** bottom tab bar, 5 slots: Falafel · Tower · Dig · Ascension · More. "More"
  opens a sheet with every other tab as a 4-column grid, plus Fast Forward and sound.
- **Locked tabs (R7):** only the next one shows, as 🔒 "???" with its unlock trigger; the rest
  stay hidden. A newly unlocked tab arrives as a toast plus a gold nav item, never a modal.

### 5.10 Guide banner

First visit to a tab: expanded `.guide.first` (gold border, title, at most 3 numbered steps,
one highlighted action). After that: one line (`.guide`) with a "More" link. The full text
stays available but never pushes the action below the fold again.

---

## 6. Motion

- Durations: 120ms (press, hover), 200ms (state change), 320ms (enter/leave, bar fills). Ease
  out by default; `--ease-pop` only for reward pop-ins.
- Ambient motion (orb spin, particles, background stars) is subtle and stops under reduced
  motion.
- **Reduced motion:** honour `prefers-reduced-motion` and an in-game "Reduce motion" setting
  (sets `data-motion="reduced"` on `<html>`). Under it: no screen shake, no orb spin, no
  background particles, ceremonies shortened (R11 already has `ceremonyReducedMs`), count-ups
  snap.
- Nothing flashes more than 3 times per second. Nothing pulses forever; a "ready" glow pulses
  at most 3 times, then stays still.

---

## 7. Layout

- **Header:** one row, 56px. Wordmark, a currency strip led by the tab's hero currency with its
  rate, a "next goal" chip (desktop), then Fast Forward and sound at the right edge. On phone:
  compact row, currencies scroll horizontally with a fade at the edge; goal chip moves into the
  tab's main card; Fast Forward and sound move to the More sheet.
- **Content:** max width 1100px, 16px gutter. Order on every tab: **action → state → upgrades
  → explanation**. Active-bonus chips collapse to one summary line.
- **Two-column tabs** (Falafel: orb + generators) go to one column below 1024px, action first.
- **Phone bottom stack:** bottom nav (60px + safe area); the buff bar sits directly above it;
  content gets matching bottom padding so nothing hides under either.
- **No horizontal page scroll at 375px.** Wide content (tables, trees) either reflows or
  scrolls inside its own container with a visible edge fade.

---

## 8. Checklist for a UI PR

- [ ] Uses tokens, no new hex values (except new art)
- [ ] One filled (gold) button per card at most; affordable = gold
- [ ] The tab's action is above the fold at 1280×800 and 375×812
- [ ] Tap targets ≥ 44px on touch; no hover-only information
- [ ] Rarity / state not by colour alone
- [ ] Changing numbers use `.num`
- [ ] Works with reduced motion
- [ ] Screenshots at desktop and 375px in the PR
- [ ] Matches the mockup in `docs/ui/mockups/` if there is one, or says why not
