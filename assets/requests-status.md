# Generated Art: Request Status and Wiring Plan

Source of truth for every request: `assets/requests.json`. Each entry has `id`, `category`, `priority` (1-3), `file`, `size`, `transparent`, `prompt_brief` and `style_notes`.
The generator's prompts and seeds are in `assets/generated/tools/specs.json` and `make_specs.py`.

**House style:** bold thick black outlines, cel shading, saturated colours, warm rim glow, Saudi meme humour. It matches `giant_kabsa.jpg` and `angry_shayeb.jpg`. `merchant.jpg` is a pixel-art outlier; `enchanter_cartoon` (P3) redraws it.
**Format:** WebP. Icons are opaque on a flat dark-charcoal background unless the status table says alpha. They sit on dark cards, so the wiring can use them as plain `<img>`.

## Status (2026-10-06)

**Blocker:** the coordinator paused all GPU work because C: hit 0 bytes free (3.8 GB free at last check). The generator has every P1 and P2 item queued and specs prepped; it will render when the hold clears. No ETA.

Queue order at the generator: 6 gear revisions (specs in `tools/specs_gear_rev2.json`), then its own 5 bosses (zone1_boss1-3, zone2_boss1, zone3_boss1; `tools/specs.json`), then the 32 new P1 items, then the 67 P2 items. P3 (96) has not been sent.

| Category | P1 | P2 | P3 | Delivered & approved | Revision pending | Not yet delivered |
|---|---|---|---|---|---|---|
| boss | 12 | 11 | 18 | 0 | 0 | 41 |
| gear | 20 | 0 | 0 | 14 | 6 | 0 |
| monster | 8 | 1 | 0 | 0 | 0 | 9 |
| building | 8 | 6 | 0 | 0 | 0 | 14 |
| excavation | 7 | 14 | 0 | 0 | 0 | 21 |
| garden | 0 | 15 | 0 | 0 | 0 | 15 |
| alchemy | 0 | 7 | 0 | 0 | 0 | 7 |
| spell | 0 | 6 | 0 | 0 | 0 | 6 |
| hero | 0 | 1 | 4 | 0 | 0 | 5 |
| background | 0 | 3 | 10 | 0 | 0 | 13 |
| splash | 2 | 3 | 2 | 0 | 0 | 7 |
| talent | 0 | 0 | 15 | 0 | 0 | 15 |
| bazaar | 0 | 0 | 4 | 0 | 0 | 4 |
| ascension | 0 | 0 | 7 | 0 | 0 | 7 |
| achievement | 0 | 0 | 24 | 0 | 0 | 24 |
| nav | 0 | 0 | 11 | 0 | 0 | 11 |
| character | 0 | 0 | 1 | 0 | 0 | 1 |
| **total** | **57** | **67** | **96** | **14** | **6** | **200** |

Totals include 25 tracking-only rows: the generator's own 20 gear and 5 bosses. New requests from this audit: 195 (P1 32, P2 67, P3 96).

### Review log
- **Gear (20 delivered, 128px WebP, opaque dark bg, 1-5 KB):** reviewed on a full-size sheet and a 48px sheet.
  - Approved (14): all amulets, all relics, and armor common/rare/epic/cosmic. Rarity escalation reads clearly.
  - Revision requested (6):
    - weapon_* ×5: too thin at icon size, and cosmic reads weaker than legendary. Asked for a chunky diagonal corner-to-corner blade, and for cosmic to be the most epic.
    - armor_legendary: shows a full knight figure. Asked for an empty breastplate and flaming cape only.
  - Note: the gear style is glossy mobile-RPG with outlines. It is slightly more painterly than giant_kabsa.jpg but consistent within its set; accepted.
- **Bosses / P1 / P2:** nothing rendered yet (GPU hold).
- **Flagged for the owner:**
  - Mutawa (a MONSTER_NAMES entry) is drawn as a benign scolding elder with no religious symbols. Swap the name if the owner prefers.
  - Brand names (Almarai, Vimto, Aramco, SABIC, NEOM, Snapchat) are game names only. The art is briefed with no logos or text.

### Still pending after the hold clears
- Re-review: the 6 gear revisions, 5 generator bosses, 32 P1, 67 P2. Check each at its displayed size for readability and house style.
- Send P3 (96): talents, achievements, nav, perks, bazaar, skill icons, zone5-7 bosses, boss2 alternates, tab backgrounds, remaining splash, enchanter redraw.


## Wiring plan (for the wiring agent)

General rules:
- Add one helper in `js/main.js`, `art(path, alt, cls)`. It returns `<img src="assets/generated/${path}" class="${cls}" alt="${alt}" loading="lazy" onerror="this.replaceWith(document.createTextNode(this.dataset.fb||''))" data-fb="${emoji}">`. If a file is missing, the old emoji comes back, so you can wire assets before they are delivered.
- Keep every emoji in the data files (`icon:` fields) as the fallback. Add a separate `art:` field or a lookup map in main.js. Do not replace the emoji.
- Many render paths run every frame and rebuild only on a signature change (see `monsterAvatarEl.dataset.avatar` at `js/main.js:741-751` and `lastGearSig` at `js/main.js:781`). Keep that pattern: build an `<img>` once and change `src` only when the key changes. Do not rebuild `innerHTML` every frame (that is the known 60fps click-swallow bug).
- CSS: add `.art-icon { width:100%; height:100%; object-fit:contain; image-rendering:auto; }` plus per-slot sizes to `css/style.css`.

### 1. Bosses: `assets/generated/bosses/zone<N>_boss<M>.webp` (512)
- Where: `js/main.js:739-751` (`updateCombatUI`, monster avatar block).
- Key: `zone = ZONES.indexOf(combatSystem.getZone(floor)) + 1` and `firstBoss = Math.ceil(zone.minFloor / 10) * 10`. Then `M = (((floor - firstBoss) / 10) % 6) + 1`. Boss names repeat every 6 boss floors (`MONSTER_NAMES[(floor-1)%12]` with `floor%10==0`), so the image always shows the right character for `m.name`.
- `avatarKey = 'boss:z' + zone + '_' + M`. Render `<img src="assets/generated/bosses/zone${zone}_boss${M}.webp" class="art-icon boss">`. Fall back to the existing root `.jpg` by name, then to 👹.
- Size: `.monster-avatar` is currently font-size 5rem with no box (`css/style.css:1067`). Give it `width:160px; height:160px` (200px for bosses), with `border-radius:50%`, `overflow:hidden` and the existing red drop-shadow. For bosses add a pulsing zone-colour ring: `box-shadow: 0 0 25px ${zone.color}`.
- Zone 1 has only 5 boss floors (10-50), so `zone1_boss6` does not exist.

### 2. Regular monsters: `assets/generated/monsters/<slug>.webp` (256)
- Same block, `js/main.js:741-745`. Replace the three hard-coded `includes()` checks with a map from name to file:
  `{'Desert Dhabb':'desert_dhabb','Abu Sarwal Wa Fanila':'abu_sarwal','Karak Addict':'karak_addict','Drifting Camry':'../../drifting_camry.webp'(existing),'Iftar Samosa':'iftar_samosa','Giant Kabsa Monster':'(existing giant_kabsa.jpg)','Snapchat Celebrity':'snapchat_celebrity','Mutawa':'mutawa','Angry Shayeb':'(existing angry_shayeb.jpg)','Rukbah Soda':'rukbah_soda','Dallah of Doom':'dallah_of_doom','Al-Modir':'al_modir'}`.
- Strip the `⚡ BOSS: ` prefix before the lookup.

### 3. Gear: `assets/generated/gear/<slot>_<rarity>.webp` (128)
- Where: `js/main.js:779-804` (gear block in `updateCombatUI`; it already rebuilds only on `lastGearSig` change).
- Inside each `.gear-slot`, add `<img class="gear-art" src="assets/generated/gear/${slot}_${item.rarity.toLowerCase()}.webp">` to the left of the title. Make the slot a flex row.
- CSS goes in `gear.css` (root): `.gear-art{width:48px;height:48px;border-radius:6px;flex:none}`. The rarity border and glow classes already exist (`.gear-common` … `.gear-cosmic`).
- Reward moment: in `CombatSystem.rollLoot` (`js/systems/CombatSystem.js:295-345`), where `particles.spawnFloatingText('NEW WEAPON…')` fires, also call a new `window.game?.showLootPopup(slot, rarity)`. It shows the 128px icon scaled up from 0.3 to 1 for about 1.2s, centre-screen. For Legendary or Cosmic, show `splash/gear_legendary.webp` or `splash/gear_cosmic.webp` behind it.

### 4. Buildings: `assets/generated/buildings/<slug>.webp` (128)
- Where: `js/main.js:626` in `buildBuildingsStructure`: `<div class="b-icon">${def.icon}</div>` becomes an img. It is built once, so it is safe.
- id→file map (`BuildingSystem.js` ids): tapper→shawarma_stall, resonator→bakhour_burner, siphon→foul_tamees, workshop→mandi_restaurant, crucible→kaboos_workshop, obelisk→giant_dallah, harvester→boulevard_kiosk, observatory→riyadh_season_ticket, gateway→king_fahd_causeway, foundry→ghawar_oil_rig, anchor→sabic_factory, dynamo→aramco_hq, loom→neom_the_line, matrix→vision_2030.
- `.b-icon` is 44x44 (`css/style.css:955`). Bump it to 56x56 and add `border-radius:10px; overflow:hidden`.

### 5. Excavation
- Find icons, `assets/generated/mining/<content>.webp`: `js/main.js:897-907` (`tileContent`). Use `<img class="m-art" src=…>` in place of the emoji `.m-icon`; the file name is `b.content`: stairs, gold_cache, ruby, sapphire, emerald, diamond, voidAmethyst, with `stone` as the default.
  - Also add 20px versions in the inventory badges at `js/main.js:944-951` (ruby→Fawanees, sapphire→Dallahs, emerald→Oud Wood, diamond→Misbaha, voidAmethyst→Mabkhara).
  - Reward moment: when a tile flips to revealed at `js/main.js:927-930`, add class `pop` to the tile (CSS keyframe scale 0.6→1.15→1).
- Strata textures, `mining/strata_<slug>.webp`: set `background-image` on `.mine-tile.unrevealed`. Strata slugs come from `MiningSystem.js:9-15` names, lower-case with spaces turned into `_` (limestone … abyssal_heart).
  - Easiest wiring: set the CSS var `--strata-tex: url(...)` on `#mining-grid-board` when the strata changes (next to the title update at `js/main.js:843-848`), plus `.mine-tile.unrevealed{background:var(--strata-tex) center/cover}`.
- Pickaxe tiers, `mining/pick_<L>_<slug>.webp`: `js/main.js:859` hard-codes `cosmic_shovel.webp`. Give the img an id and set `src` in the `setText` block (`js/main.js:877-880`) from `Math.min(level, 5)`. Slugs: 0 rusty, 1 bronze, 2 steel, 3 mithril, 4 adamantite, 5 celestial_void.

### 6. Garden: `assets/generated/garden/*.webp` (96)
- Plot icon: `js/main.js:1139` sets `icoEl.textContent = def.icon`. Replace it with a stage-aware img:
  - seed → `stage_seed`
  - sprout → `stage_sprout`
  - blooming → `${p.seed}_blooming`
  - mature → `${p.seed}_mature`
  - Cache it with `icoEl.dataset.art` so the DOM changes only when the key changes (this runs every frame).
  - Plot stage is `p.stage`, computed in `GardenSystem.js:383-395`.
- Seed picker: `js/main.js:966` `.seed-ico` → `${id}_mature`.
- Golem: the `#garden-golems` header at `js/main.js:1017` (🗿) becomes `garden/golem.webp` at 32px. Optionally overlay a small golem on `.garden-plot.golem-tended` (CSS `::after` background).

### 7. Alchemy: `assets/generated/alchemy/<slug>.webp`
- Recipe card: `js/main.js:1170` `.alchemy-card`. Add `<img class="alc-art">` before `.alc-info`.
- Recipe id→file: swiftness→karak_tea, titans_draught→almarai_laban, aether_surge→cold_vimto, midas_elixir→golden_dallah_brew, perm_might→mandi_feast_nectar, perm_vitality→shawarma_of_life, philosophers_catalyst→royal_wasta_seal.
- Buff bar: in `js/buffBar.js:10-19` (`BUFF_ICONS`) and `:134`, use `<img class="bb-art">` (18px) when an art file exists for `b.id`, with the same map.

### 8. Spells: `assets/generated/spells/<slug>.webp`
- `js/main.js:1273` `.sp-icon`; quick-cast bar `js/main.js:552`; buff bar spell chip `js/buffBar.js:150`.
- Spell id→file: aether_burst→aether_burst, chrono_warp→chrono_warp, midas_touch→midas_blessing, celestial_alignment→celestial_alignment, void_strike→void_cataclysm, astral_refresh→astral_renewal.

### 9. Hero: `assets/generated/hero/`
- `hero.webp`: index.html:213 under `<h3>Astral Champion</h3>` (index.html is static, so insert it from `buildCombatStructure`, `js/main.js:697`). 96px round. Optional: tint its frame with the best equipped rarity colour.
- `skill_<key>.webp`: `js/main.js:700-704` `.combat-skill-btn`, as a 28px icon before `.sk-name`.

### 10. Backgrounds: `assets/generated/backgrounds/`
- Zone: in `updateCombatUI`, when the zone changes (cache it on `this.lastZoneName`), set `#monster-arena-box` `style.backgroundImage = linear-gradient(rgba(5,10,7,.55),rgba(5,10,7,.85)), url(zoneN.webp)` with background-size cover. On a zone change, also fire the `splash/new_zone` overlay.
- Tab: `#tab-<id>` gets `background-image` at low opacity, CSS only (`css/style.css`), e.g. `#tab-garden{background:linear-gradient(...),url(...) center/cover fixed}`.

### 11. Splash overlays: `assets/generated/splash/` (768)
- Add `showSplash(file, text, ms=1500)` in main.js. It shows a fixed, centred, pointer-events:none div with the img and caption, animating scale and fade, plus a CSS keyframe in `css/animations.css`.
- Triggers:
  - boss_kill: `CombatSystem.js:246`, where `totalBossesSlain++` runs. Throttle so it shows only when the boss took more than 5s, or once per zone.
  - gear_cosmic / gear_legendary: `rollLoot`, see section 3.
  - new_zone: the zone-change detect in section 10.
  - ascension: the ascend success path after the confirm at `js/main.js:1610`.
  - level_up: `CombatSystem.js:270` (`h.level++`).
  - frenzy: `ClickerSystem.js:64` (`triggerFrenzy`).
- Do not show more than one splash at a time, and never block clicks.

### 12. P3 icon sets (talents, bazaar, perks, achievements, nav, enchanter)
- Talents: `js/main.js:1327` `.talent-card`. Add an img keyed by `t.id`.
- Bazaar commodities: `js/main.js:1467` `.c-icon`, keyed by `c.id` (ore/silk/amber/shard).
- Ascension perks: `js/main.js:1596` `.perk-card`, keyed by `p.id`.
- Achievements: `js/main.js:1736` `.a-icon`. Show the art when unlocked; when locked, keep 🔒 or show the art with `filter:grayscale(1) brightness(.3)`.
- Nav: `index.html:88-141` `.nav-icon` spans (static HTML). Replace them with `<img>` at 22px, keeping the emoji in `alt`.
- Enchanter redraw: `index.html:433` img src.
