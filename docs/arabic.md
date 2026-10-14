# Arabic and right to left

Owned by the localizer. Updated every pass. Rules for everyone: AGENTS.md rule 11, `docs/ui-style-guide.md` 7.1.

## 1. How we write Arabic

- **UI text: Modern Standard Arabic**, short, in words a 7 year old can read. Characters may carry light Gulf flavour (a "yalla", "wallah", "abshir"), never a full dialect sentence.
- **Translate meaning and fun, not words.** A joke stays a joke. A Saudi meme name stays itself. One whole sentence per key; never glue fragments.
- **Same placeholders** as English (`{n}`, `{name}`), same meaning, same numbers. No emoji.
- **Quotes** for button and label names inside a sentence: « ». Western digits (1, 2, 3), read left to right. Units K, M, B stay Latin (as in Aetheria).
- **Gender:** the player is addressed in the masculine singular imperative used in Aetheria ("أنفق", "اكسر"). Characters keep their own gender (almodeera is feminine).
- **Changelog:** every entry has `ar` with `title` and `changes`, one Arabic line per English line, written for players.

## 2. Glossary

Use these exactly. If a word is not here and is new, add it here in the same PR.

### Games and big things
| English | Arabic | Note |
|---|---|---|
| Aetheria | أثيريا | as in `ar.js` |
| Dig (the game, `?loop=3`) | الحفر | **Decided 14 Oct 2026**: one name for the game in every text. Not «التنقيب» (that is Aetheria's Mining tab and means prospecting). |
| Chapter One / Two | الفصل الأول / الثاني | short form «ف2» only in tight labels |
| Level / medal / twist | المرحلة / الميدالية / التحدّي الخاص | «twist» card = بطاقة تحدٍّ |
| Chili level | مرحلة الشطة | Fast medal = ميدالية السرعة, Chili medal = ميدالية الشطة |
| Save (old save) | الحفظ (الحفظ القديم) | as in Aetheria |

### Places and lands
| English | Arabic | Note |
|---|---|---|
| Alqahwa (the coffee house) | القهوة | the Gulf coffee house; never «المقهى» |
| The road / road map | الطريق / خريطة الطريق | |
| Next town | البلدة التالية | |
| Arabia | الجزيرة العربية | land 1 |
| Africa | أفريقيا | |
| East Asia | شرق آسيا | |
| The Americas | الأمريكتان | |
| Europe | أوروبا | |
| (land) at night | (الأرض) ليلاً | «أوروبا ليلاً» |
| The Empty Quarter | الربع الخالي | |
| Museum | المتحف | |
| Crossroads | مفترق الطرق | |

### Things and upgrades
| English | Arabic | Note |
|---|---|---|
| Pick | المعول | not «الفأس» |
| Stronger Pick / Second Pick | معول أقوى / المعول الثاني | |
| Rock / Big Rock | الصخرة / الصخرة الكبيرة | |
| Gate | البوابة | dark Gate = البوابة المظلمة; lantern = الفانوس |
| TNT | الديناميت | |
| Coins / Stars | العملات / النجوم | Stars are spent at Alqahwa |
| Star Tracks: The Pick, The Camp, The Bag | مسارات النجوم: المعول، المخيّم، الحقيبة | |
| Contract | العقد | |
| Relic / Fusion / Forge | الأثر / الدمج / المصهر | |
| Wardrobe | خزانة الملابس | |
| Chest | الصندوق | |
| Beat (pick rhythm) | الإيقاع | rhythm names (Boom-tak, Gulf clap) stay as the sound: «بوم تك»، «التصفيق الخليجي» |
| Away summary | ملخّص الغياب | |
| Block / Ore / Metal | الكتلة / الخام / المعدن | ore is «الخام» so it never collides with the Forge's metal «المعدن» |
| Dirt, Stone, Hard rock | تراب، حجر، صخر صلب | Copper, Silver, Gold, Gem = نحاس، فضة، ذهب، جوهرة |
| Ground layers: Sand, Red Clay, Blue Slate, The Deep | الرمل، الطين الأحمر، الحجر الأزرق، الأعماق | Crystal Cave = كهف البلّور; crystal = بلّورة, prism = منشور |
| Lantern (relic, dark Rock) / Lamp (wish) | الفانوس / المصباح | the genie Lamp is not the lantern |
| Torch / torch crate | المشعل / صندوق المشاعل | |
| Combo | كومبو ×{n} | as Aetheria's «الكومبو»; multiplier sign × |
| Relic level (Lv) | المستوى | a road stage is «المرحلة»; a relic's level is «المستوى» |
| Record (deepest dig) | الرقم القياسي | |
| Swing / hit | الضربة | «الضربات الباقية: نحو {n}» (count after a colon, no plural agreement to get wrong) |
| Beat, beats a minute | الإيقاع، في الدقيقة | Faster Hands = أيدٍ أسرع |
| Goal / Save for it | الهدف / ادّخر له | |
| Tips | نصائح | |
| Save code / Show my code / Load a code | رمز الحفظ / «اعرض رمزي» / «حمّل رمزاً» | Settings labels in pass 2 must use these |
| Reduce motion | تقليل الحركة | |
| Units m, s, min, h | م، ث، د، س | «{n} م»; K/M/B stay Latin |
| Site | الموقع | a dig place on the road |
| Side path / Beyond (the hub) | الدرب / ما بعد الطريق | «اختر درباً»; the road stays «الطريق» |
| Hard medal | الميدالية الصعبة | the third medal (win the hard rule); not the chili levels |
| On / Off (a switch) | مشغّل / مطفأ | agrees with its noun: «مشاركة أوقات لعبي: مشغّلة» |
| Welcome back (away card) | أهلاً بعودتك | |
| Menu (Alqahwa) | القائمة | «بيت القهوة» only as the subtitle for "The coffee house" |
| Contract board / tier / rule / prize / stamped | لوحة العقود / الدرجة / الشرط / الجائزة / المختومة | tier is «الدرجة», never «المستوى» (that is a relic or pick level) |
| Contracts | بيديك فقط، في الظلام، الرمل الزاحف، الديناميت فقط، المعول الزجاجي، أثر واحد فقط، غني وكسول، أطعم الصخرة، الرمل الجاف، وحدك في الظلام | Bare Hands, In the Dark, Rising Sand, TNT Only, Glass Pick, One Relic Only, Rich and Lazy, Feed the Rock, Dry Sand, Blind and Alone |
| Chili levels | خفيفة، حارّة، شطّة، نار، يا يمّه! | Mild, Hot, Shatta, Fire, Ya Mama! (the Gulf cry keeps the joke) |
| Wardrobe slots | غطاء الرأس، الملابس، اللون، النقشة | Hat, Clothes, Colour, Cloth |
| Gulf clothes | غترة، ثوب، بشت، صديري، طاقية، مربعات الشماغ، زري ذهبي | Ghutra, Thobe, Bisht, Vest, Cap, Shemagh Check, Gold Thread (the bisht's gold edge) |
| Museum sets named so far | طقم شاي الجدة، عُدّة الطيّار الضائع، قلادة اللؤلؤ، قرش الكثبان، منصة النفط القديمة | Grandma's Tea Set, Lost Pilot's Kit, Pearl Necklace (not «عقد»: that is a contract), Dune Shark, Old Oil Rig. `wing2` (pass 4) must use these |

### Characters
| English | Arabic | Note |
|---|---|---|
| The Rafeeqs (the crew) | الرفقاء (رفيق، رفيقة) | friend of the road |
| almodeer (manager, man) | المدير | drinks tea; stern, fond |
| almodeera (manager, woman) | المديرة | drinks matcha behind her burqe3; dry, fond |
| The hakawati (storyteller) | الحكواتي | |
| The Foreman (Abu Nasser) | المشرف (أبو ناصر) | jobs: «اتبعوني»، «إلى الخام»، «بجانبي»، «احفروا للأسفل»، «استراحة شاي» |
| Grandpa / his bell / his caravan | الجد / جرسه / قافلته | the lost caravan = القافلة الضائعة |
| Traits: Eager, Sleepy, Joker, Careful, Proud, Hungry | متحمّس، نعسان، مرِح، حذر، فخور، جوعان | |

### Rafeeq nicknames (61)
The Arabic script lives in `proto/features/rafeeqs/names.js` (`ar:` field; the `id` is the owner's Arabizi). **Do not retranslate or "correct" them**: they are the owner's Saudi-meme names. Only the `line` (trait line, English) needs an Arabic line, as key `nk_line_<id>`. Tone: one short line, as a friend teasing a friend, e.g. الداشر -> «دائماً يتمشّى بعيداً».

## 3. Tone per character

| Voice | How he/she sounds | Do | Do not |
|---|---|---|---|
| Narration, UI | calm, plain MSA | verb first, short | long clauses, rare words |
| almodeer | a stern uncle; clipped orders, secretly proud | «يا {name}، ...» then the order | insults, shouting in capitals |
| almodeera | dry and brisk; matcha jokes; kind under it | «{name}، ...» a quiet teasing | copy almodeer's lines with a feminine ending only: give her own wit |
| The hakawati | a storyteller: warm, a little grand, "once upon a road" rhythm, light classical words (كان يا ما كان) | past tense, images (sand, bells, camels) | modern slang |
| Eager Rafeeq | exclamations, "يلا!" | 1-4 words | |
| Sleepy | yawns, trailing «...» | «ممم»، «خمس دقايق» | |
| Joker | puns and boasts | a joke that survives translation, else a new joke of the same size | word-for-word puns |
| Careful | "انتبه"، checks twice | | |
| Proud | chest out, «والله»، «أبشر» | | |
| Hungry | food, dates, coffee | «هات التمر» | |

Rafeeq speech bubbles are at most five words, whole lines, Gulf-flavoured MSA (the owner's names set the register).

## 4. State per game

Counted 14 Oct 2026.

| Game | Where | Arabic / total |
|---|---|---|
| Aetheria | `js/i18n/en.js` + `ar.js` (`node test_r37_i18n.js`) | **2,307 / 2,307 keys** and 465 data keys; 4,055 checks pass |
| Core loop (`?loop=2`) | `js/i18n/coreloop/` | paused; not counted |
| Dig | `proto/features/*/strings.js`, `proto/ui/strings.js` (`npm run dig:i18n`) | **693 / 2,195 strings** after pass 2 (14 Oct 2026). 25 folders complete and listed in `COMPLETE` (`test_dig_i18n.js`). Switch hidden (`?lang=ar` only). |
| Changelog (About tab) | `js/version.js` | every entry has Arabic; Dig entries 5.32.0 to 5.33.6 reviewed 14 Oct 2026 |

Dig strings per file (largest first): chatter 670, wing2 166, sites 161, story 154, starshop 102, rafeeqs 96, contracts 92, worldmap 79, wardrobe 69, picks 68, relics2 62, fusion 56, moods 47, deep 45, ui 42, boss 41, forge 32, away 28, shop 22, foreman 15, look 14, chest 13, settings 12, diggers 11, museum 11, water 9, crystal 8, relics 8, ground 7, track 7, telemetry 5, combo 4, crits 4, ores 4, tnt 3, oil 2. (Count with a throwaway script that imports each `strings.js` default and counts `en` keys; a count kept in the repo is part of the plumbing brief.)

## 5. Decisions

**Decided (14 Oct 2026, by localizer): the name of the game in Arabic is «الحفر», not «التنقيب»** because Dig is about swinging a pick at blocks, a 7 year old knows "حفر", and «التنقيب» already names Aetheria's Mining tab (two games must not share a name). The changelog entries 5.32.0 to 5.33.3 now all say «الحفر».

**Decided: Alqahwa is «القهوة» everywhere**, never «المقهى», because the building is a Gulf coffee house and the entries 5.32.0 and 5.32.1 already used it; one name per place.

**Decided: the pick is «المعول»** (5.33.3 said «فأس», 5.33.0 «معول»), because «معول» is a digging pick and «فأس» is an axe.

**Decided: a medal is «ميدالية»** (5.32.0 said «وسام»), the same word as the card text in 5.33.1.

**Decided: a wording-only fix of shipped changelog entries needs no new version.** AGENTS.md asks for an entry per PR that changes what players see or how the game plays; correcting the wording of an Arabic line inside a past entry adds no change to describe. The PR touches `js/version.js`, so the changelog CI check passes without the `no-changelog` label, and `VERSION` stays 5.33.3. A new player-visible Arabic feature (for example the Dig language switch) does get its own entry.

**Decided: Dig gets Arabic in four passes, plumbing first, by what a new player meets first** (section 6). This replaces option (a) of dig-design decision 5 ("English until the road is tuned, then one pass for every string"): the road is tuned, and doing it in folders is the same mechanical work, safer, and lets the owner review each pass. Option (b) ("every new string gets Arabic from now on") is adopted for new Dig strings after plumbing lands: a new key ships with its `ar` entry, and the Dig test fails otherwise.

**Decided: the Arabic switch is hidden until pass 3 is merged.** Before that it works only with `?lang=ar` (for the owner and screen-checker), because half Arabic and half English in the first hour is worse than all English. The Settings button is added with pass 3, together with its changelog entry.

**Decided (14 Oct 2026, by localizer): pass 1 ships 18 folders and moves `away`, `settings` and `telemetry` to pass 2**, because other agents have open work in those folders today (away code, settings, telemetry) and a translation must not race their edits; they are small (62 strings) and pass 2 takes them first. Pass 1 done: ui 42, picks 68, boss 41, shop 22, foreman 15, look 14, chest 13, diggers 11, water 9, crystal 8, relics 8, ground 7, track 7, combo 4, crits 4, ores 4, tnt 3, oil 2 = 286.

**Decided (14 Oct 2026, by localizer): Arabic for a small folder lives in the same `strings.js` as an `ar:` table**, not in `strings.ar.js`, because it needs no change to the feature's `index.js` (no `stringsAr` import), keeps English and Arabic side by side for review, and cannot conflict with code edits. `strings.ar.js` stays for the big generated tables (chatter, rafeeqs).

**Decided (14 Oct 2026, by localizer): counts go after a colon** («الضربات الباقية: نحو {n}»، «رفقاء يحفرون بجانبك: {n}») wherever the English puts a number before a plural noun, because Arabic noun agreement changes with the number (3 to 10 plural, 11 and up singular) and one fixed string cannot be right for every `{n}`. Where the colon form reads badly (prices: «{n} عملة»، «{n} نجمة») the singular tamyeez is kept, as Arabic games do.

**Decided (14 Oct 2026, by localizer): arrows from old to new value point left (←)** in Arabic («ضربتك: {a} ← {b}»), because the line reads right to left; → would point back at the old value.

**Decided (14 Oct 2026, by localizer): the sound words stay sounds** (BOOM = «بووم»، plop = «بلوب»، clink = «طنّ»), and the soggy TNT joke keeps its shape: «ديناميت مبلول. لا يقول إلا «بلوب».».

**Decided (14 Oct 2026, by localizer): pass 2 ships 7 folders and moves `sites` and `starshop` to pass 2b**, because a roadmap-architect is editing `sites/rules.js` and `starshop/rules.js` today (open PR "the Gate is yours"). Pass 2 done: away 28, settings 33, telemetry 6, worldmap 79, rafeeqs 98 (61 nickname lines), wardrobe 69, contracts 92. Pass 2b (sites 161, starshop 102) goes before pass 3, so the switch still goes live only when the whole first hour has Arabic.

**Decided (14 Oct 2026, by localizer): `away` keeps its Arabic in `away/strings.ar.js`**, not as an `ar:` table in `strings.js`, because the open "Gate is yours" PR adds a key and an `ar:` table to `away/strings.js`; a sibling file cannot conflict with it. When that PR merges, its `away_gate` Arabic may move into `strings.ar.js` (either place loads).

**Decided (14 Oct 2026, by localizer): a switch says its whole line per language** (`set_sound_is_on` «الصوت: مشغّل», `set_tel_is_on` «مشاركة أوقات لعبي: مشغّلة»), replacing "label: On" glued from two keys, because in Arabic "on" must agree with the noun (مشغّل / مشغّلة) and one shared «On» cannot. The page's own mute button now says «مشغّل» too (was «يعمل»), one word for one meaning.

**Decided (14 Oct 2026, by localizer): in Arabic a Rafeeq's nickname is his name in Arabic script** (`names.js` `ar`), never the Arabizi id; English shows the id as before. Keeping the Arabic name in the rename box keeps the nickname (it is not a hand name), and the card's line shows the script in brackets only in English («(الداشر)» would repeat the name in Arabic). The save keeps the id, so switching language never changes a save.

**Decided (14 Oct 2026, by localizer): no more glued text in the crew row, the level line and the road map.** «يغربل، كسر: {b}، عملات: {c}» is one key (`crew_row_sv`); the level line uses `trk_head`, `trk_then`, `trk_full`; a site and its twist use the existing `site_twist` everywhere (the road map canvas and the level line built it from `', '` before), so Arabic gets «،» once `sites` has its Arabic.

**Decided (14 Oct 2026, by localizer): the road map's pan buttons are named by where they point on screen** (`wm_pan_left` = «يمين» in Arabic), because in right to left the start button sits on the right and pans right (`worldmap/ui.js`, `rtl()`); a button on the right labelled «يسار» would lie.

**Decided (14 Oct 2026, by localizer): a goal with a count may also say «عددها {n}»** («أنهِ مراحل عددها {n}»، «فُز بعقود عددها {n}»), next to the colon form, because it reads as a sentence and is right for every number; a fixed small number in a prize gets its real grammar («نجمتان»، «3 نجوم»، «5 نجوم»), since it never changes.

**Decided (14 Oct 2026, by localizer): the Hard medal is «الميدالية الصعبة»**, the plainest word for a 7 year old, and kept apart from the chili levels («مرحلة الشطة»).

**Decided (14 Oct 2026, by localizer): 5.33.6 reworded** (wording only, no new version, as decided for pass 1): the title said play times themselves were «مطفأة»; it is the sharing that is off («مشاركة أوقات لعبك مطفأة حتى تشغّلها أنت»). Also «من تلقاء نفسه», «أرسل إليك», «ويبقى الإطفاء محفوظاً» for "Off is kept", and «لا تحمل اسمك» for "anonymous".

**Decided (14 Oct 2026, by localizer): rhythm names are translated by picture, not word** (Gallop = «ركض الخيل»، Clave = «كلافي»، Samba and Carnival kept as the loanwords a child knows), because a 7 year old hears them as sounds and places.

## 6. Dig: plumbing and passes

### What exists
`proto/core/strings.js`: `addStrings({ en, ar }, owner)` fills per-language tables (a duplicate key throws); `t(key, vars)` reads `TABLES[lang]` then falls back to English; `setLang(l)`, `langNow()` (for data that carries its own script, such as the nicknames), `missingStrings(l)`, `listOf()` (uses `Intl.ListFormat(lang)`). `proto.html` is `lang="en" dir="ltr"`. Nothing calls `setLang`.

### What the plumbing must do
1. **Choose the language once, at load, and reload to change it** (as Aetheria: `js/i18n/lang.js`). Order: `?lang=ar|en`, then localStorage key `DIG_PROTO_LANG`, else English (no browser sniffing for Dig yet). The Dig save is untouched: language is not game state. Call `setLang` before any `addStrings` consumer renders and before `main.js` builds the DOM.
2. **Set `<html lang="ar" dir="rtl">`** from the same inline code that picks the language (no flash). The Dig **scene (canvas, its overlaid hits, HUD numbers on the canvas) never mirrors**: force `direction: ltr` on the canvas wrapper. Panels, cards, drawer text, toasts, the map list and the Alqahwa menu follow `dir`. The drawer stays on the same side of the dig.
3. **Arabic table beside each `en`**: each `strings.js` exports `{ en: {...}, ar: {...} }`; the loader already merges them. Keep the one-whole-sentence-per-key rule. For generated keys (`chat_<trait>_<moment>_<k>`, `nk_say_<id>`) the Arabic table uses the **same generated key names** and the same `_n` counts; builder writes the `ar` lines in a sibling file `strings.ar.js` (default export `{ ar: {...} }`) to keep each file small, and `addStrings` loads both.
4. **Move the stray Arabic out of the `en` table**: `boss_name_ar`, `bossf_name_ar` (in `chatter/strings.js`) and `qh_name_m/f` become real `ar` entries for `boss_name`, `bossf_name`, `qh_name_m/f`; the nickname `ar` field in `names.js` stays as data and is shown in Arabic mode as the name, with the Arabizi `id` never shown.
5. **Numbers**: `fmt()` keeps Western digits and Latin K/M/B units. Wrap numeric params in an isolate as Aetheria's `t()` does (`bidi`/`<bdi>`). `toLocaleString()` only with `'en-US'`.
6. **CSS**: replace `left/right/margin-left/padding-left/text-align:left` in `proto/proto.css` and feature `*.css` with logical properties; fonts: Cairo for UI and Noto Kufi Arabic for display (the same Google Fonts link as `index.html`), with a larger root size in Arabic. **Canvas text** (`text()`, `ctx.font`): add an Arabic-capable font to the stack and set `ctx.direction`/`textAlign` by language; letter spacing and `text-transform: uppercase` off for `[lang=ar]` (the `.panel h2` rule is uppercase today).
7. **Test**: `test_dig_i18n.js` (the repo's `run_tests.mjs` picks it up): every `en` key has an `ar` key with the same `{placeholders}`; no `ar` key without `en`; generated `_n` counts agree; no Latin words left in Arabic values except placeholders and the units K/M/B; `t()` falls back to English for a missing key. **While passes are open, the test takes a list of folders that must be complete** (`COMPLETE = ['ui', 'shop', ...]`), and each pass adds its folders. It does not fail on the not-yet-translated folders.
8. **Tooling**: `npm run dig:i18n` prints one line per folder: `folder  ar/en`, so a pass can read progress without a long report.

### Order of passes (what a new player sees first)
| Pass | Folders | Strings | Why |
|---|---|---|---|
| 0 | plumbing (above) | 0 | no text |
| 1 | `ui` 42, `shop` 22, `picks` 68, `boss` 41, `away` 28, `foreman` 15, `settings` 12, `look` 14, `chest` 13, `diggers` 11, `water` 9, `crystal` 8, `relics` 8, `ground` 7, `track` 7, `telemetry` 5, `combo` 4, `crits` 4, `ores` 4, `tnt` 3, `oil` 2 | 327 | the first five minutes: the dig, the first pick, the first Rock and Gate |
| 2 (done) | `away` 28, `settings` 33, `telemetry` 6 (moved from pass 1), `worldmap` 79, `rafeeqs` 98 (with the 61 nickname lines), `wardrobe` 69, `contracts` 92 | 405 | the first hour: road map, Alqahwa, the crew, the welcome-back card |
| 2b | `sites` 161, `starshop` 102 | 263 | the finish card and Star tracks; waits for the open sites/starshop rules work |
| 3 | `chatter` 670, `moods` 47 | 717 | the crew's voices, heard from the first hire; the switch goes live after this pass |
| 4 | `story` 154, `wing2` 166, `museum` 11, `relics2` 62, `fusion` 56, `forge` 32, `deep` 45 | 526 | hakawati, Museum, fusion: arrive later; the story needs the owner's ear most |

Total 2,169. Each pass is one worktree and one draft PR (pass 3 splits into `chatter` lines by trait if it grows past review size); the owner reviews the Arabic in the PR. screen-checker takes one RTL screenshot set after pass 1 (`?lang=ar`): the dig, the shop tab, the finish card, and the drawer, at desktop width only.

### Builder brief: Dig Arabic plumbing (pass 0)
> **Goal.** Dig can run in Arabic, right to left, without any Arabic text yet. Done when `proto.html?loop=3&lang=ar` loads with `<html lang="ar" dir="rtl">`, `t()` returns English for every key (fallback), the scene is not mirrored, panels and cards are, and `?lang=en` or no parameter is unchanged.
> **Read.** `docs/arabic.md` section 6, `docs/ui-style-guide.md` 7.1, `proto/core/strings.js`, `js/i18n/lang.js` (copy the idea, not the Aetheria dependency; Dig must not import Aetheria files), `proto/proto.css`, `proto/main.js`.
> **Do.** (1) A small `proto/core/lang.js` with no imports: picks the language (`?lang=`, then `DIG_PROTO_LANG`, else `en`), exposes `LANG`, `DIR`, `setLangChoice(id)` (stores and reloads). (2) An inline script at the top of `proto.html` sets `lang` and `dir` on `<html>` before first paint, and `main.js` calls `setLang(LANG)` before features register. (3) `addStrings` also loads a sibling `strings.ar.js` default export if a feature has one (optional; features without it are fine). (4) Move `boss_name_ar`, `bossf_name_ar`, `qh_name_m`, `qh_name_f` out of the `en` tables as described. (5) Logical CSS in `proto.css` and feature CSS; Cairo and Noto Kufi Arabic; `[lang=ar]` turns off uppercase and letter spacing; canvas wrapper `direction: ltr`; canvas `text()` helper uses the language's font stack. (6) `test_dig_i18n.js` and `npm run dig:i18n` as in section 6, with `COMPLETE = []`. (7) No visible switch, no changelog entry (nothing a player sees); label the PR `no-changelog`.
> **Do not.** Add Arabic strings; change English text; touch the Dig save; mirror the canvas; use `left`/`right`.
> **Files.** `proto.html`, `proto/core/lang.js` (new), `proto/core/strings.js`, `proto/main.js`, `proto/proto.css`, `proto/features/*/*.css`, `proto/features/chatter/strings.js`, `proto/features/worldmap/strings.js`, `test_dig_i18n.js` (new), `package.json` (script only; not the `test` script).
> **Checks.** `npm test`; ask screen-checker for `?lang=ar` and `?lang=en` screenshots to confirm no layout change in English and a mirrored panel layout in Arabic.
