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
| Chapter One / Two | الفصل الأول / الثاني | short form «الفصل 2» (English "Chapter 2") in the level line; never «ف2» or "Ch. 2" |
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
| Sites (chapter one) | الكثبان، وادي البارود، وادي الذهب، وادي الوحوش | The Dunes, Powder Valley, Golden Wadi, Valley of Beasts |
| Twists | الأرض الثقيلة، العتمة، البراميل | Hard ground, Dim, Barrels; a site with a twist: «الكثبان، العتمة» (`site_twist`) |
| The Black (ground layer) | الطبقة السوداء | always dark |
| Medal chips | منتهية، سريعة، صعبة | Finished, Fast, Hard: adjectives of «ميدالية» («ميدالية صعبة!»); in a sentence the glossary forms stay («ميدالية السرعة»، «الميدالية الصعبة») |
| Fast under {t} | السرعة: أقل من {t} | |
| Step (of a Star track) | الخطوة | «ضربتك ×1.5 في كل خطوة»; Arabic uses × where English writes x |
| Pick materials | الخشب، الحجر، النحاس، البرونز، الحديد، الفولاذ، الفضة، الذهب، البلّور، حديد السماء، النجمة | a pick is «معول» + material: «معول النحاس II»، «معول النجمة +2» |
| Star track steps (Pick) | الضربة النافذة، المعول الدافئ، المعول الأدفأ، كاشف الشقوق، اليد الثقيلة، الصديق القديم، النجمة الساقطة | Punch-through, Warm Pick, Warmer Pick, Crack Finder, Heavy Hand, Old Friend, Falling Star |
| Star track steps (Camp) | رفيق ينتظرك، اثنان ينتظرانك، ثلاثة ينتظرونك، صديق الصخور، أحذية جيدة، الإبريق الثاني، المخيّم كله | Rafeeq Waiting ... The Whole Camp |
| Star track steps (Bag) | خريطة الكنز، صفّارة العظام، شمّام النفط، الجيب المحظوظ، صندوق الجيب، هزّ الصندوق، الجيب العميق، الأيدي الواسعة، عيون البووم، صندوقا جيب، أعمق جيب، الجيب الثاني | Treasure Map ... Second Pocket; Boom Eyes keeps the sound word |
| Museum sets named so far | طقم شاي الجدة، عُدّة الطيّار الضائع، قلادة اللؤلؤ، قرش الكثبان، منصة النفط القديمة | Grandma's Tea Set, Lost Pilot's Kit, Pearl Necklace (not «عقد»: that is a contract), Dune Shark, Old Oil Rig. `wing2` (pass 4) must use these |
| Museum sets (all 13) | الجمل العجوز، حوت الرمل، مصباح الجنّي، الضبّ، عملات القافلة، طقم شاي الجدة، عُدّة الطيّار الضائع، الخنفساء العملاقة، قرش الكثبان، قلادة اللؤلؤ، منصة النفط القديمة، الجمل الطائر، وحش الرمل العظيم | Old Camel ... The Great Sand Beast (pass 4); «اكتمل {set}!» needs no «طقم» before a set name |
| Dusty Bundle / Bone Jar / wish | الصُّرّة المغبرّة (الصُّرر) / جرّة العظام / الأمنية | Shark Dunes = كثبان القرش, Mirage Dunes = كثبان السراب |
| Forge tools: Drill, Dynamite, Magnet | المثقاب، عصا الديناميت، المغناطيس | the tool is «عصا الديناميت» so it never collides with TNT «الديناميت» |
| Relics two | المعول القافز، الحجر التوأم، الصخور الطائرة، المغناطيس، المعول الملتهب، براميل النار، البوميرانغ، الانهيار، المعول المستعار، الفزعة، حديقة الخام، قِدر الصهر | Jumping Pick ... Melting Pot; Faz'a stays the Gulf word «الفزعة»; chest relics: الدينار المحظوظ، عين اللؤلؤ، برج الحفر |
| Recipe Book / Fuse | كتاب الوصفات / ادمج | fusion names in `fusion/strings.js` (معول المرآة، صخور الفشار ...) |
| Deep layers | الطبقة السوداء، الصخر الحيّ، الطبقة الغاضبة، الطبقة الحارّة | Grump = «كتلة زعلانة» (the Gulf word for sulky), Thief block = «كتلة الحرامي», lava = حمم, ember = جمرة |

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
| Jiddo (Grandpa's own name in his notes) | جدّو | «الجد» in the hakawati's telling, «جدّو» where he signs |
| Uncles (the old bones) | الأعمام / «يا أعمامي» | Grandpa's joke stays: the bones are the oldest uncles |
| Clue (each story's last line) | الدليل: | always the first word, then a colon |
| Chatter (panel) / Rafeeqs talk | الأحاديث / كلام الرفقاء: مشغّل، مطفأ | |
| Cheer | هتاف | «يرفع كل الرفقاء معاولهم ويهتفون «يلا»» |

### Memes and calls (kept as they are)
| English (Arabizi) | Arabic | Note |
|---|---|---|
| ar7boooo (welcome back) | أرحبووو | the owner's meme; three «و», never «أهلاً» |
| Zoooooo6 (the extra-time gotcha) | زووووووط | keep the long vowel; the number of «و» may vary as the English does |
| habibi / habibis | حبيبي / يا حبايب | almodeera's warmth; she says it, he does not |
| matcha / karak / tea | الماتشا / الكرك / الشاي | almodeera drinks matcha (feminine noun: «الماتشا باردة»), almodeer tea |
| Team / Everyone / Rafeeqs (a manager's call) | almodeer: «يا جماعة»، «الكل»، «يا رفقاء»; almodeera: «فريقي»، «الكل»، «رفقائي» | two voices, two ways to call the crew |
| on shift / the client / the memo | الدوام / العميل / التعميم | Gulf office words: they make the managers sound like an office |

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
| Dig | `proto/features/*/strings.js`, `proto/ui/strings.js` (`npm run dig:i18n`) | **2,196 / 2,196 strings** after pass 4 (14 Oct 2026), plus the inline «Buy all» table (4). Every folder is in `COMPLETE`; `test_dig_i18n.js` now fails on a folder missing from `COMPLETE` and on an inline `addStrings({ en` table with no `ar`. |
| Changelog (About tab) | `js/version.js` | every entry has Arabic; Dig entries 5.32.0 to 5.35.1 reviewed 14 Oct 2026 |

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

**Decided (14 Oct 2026, by localizer): pass 3 also takes `story`** (the hakawati's 40 levels, moved from pass 4), because the hakawati's first story opens after level 1, inside the first hour, and the story needs the owner's ear most: the sooner it is in a PR, the sooner he reads it. Pass 3 done: chatter 668, moods 47, story 154 = 869.

**Decided (14 Oct 2026, by localizer): the switch stays hidden after pass 3** (this replaces "the switch goes live after pass 3"), because `sites` (161) and `starshop` (102) still have no Arabic: the finish card and the Star tracks come in the first hour, and half English there is what the hidden switch is for. The switch, its Settings button and its changelog entry ship with pass 2b, once the open sites/starshop rules work has merged.

**Decided (14 Oct 2026, by localizer): the two managers are two voices in Arabic too.** almodeer calls «يا {name}، ...», uses Gulf office words (الدوام، العميل، «سنقول: زحمة») and blusters; almodeera calls «{name}، ...» with no «يا», speaks of herself in the feminine («أنا هادئة»، «أنا التي أكتب الساعة»), writes things down («سجّلتُ»، «في دفتري») and calls the crew «فريقي» and «رفقائي». Her lines are her own jokes, not his with a feminine ending. "A woman needs her matcha" became «المديرة تحتاج الماتشا», the same joke about her and her matcha, without a line about women in general.

**Decided (14 Oct 2026, by localizer): the memes stay themselves** («أرحبووو»، «زووووووط»، «حبيبي»), written in Arabic letters, because they are the owner's Saudi jokes and a Gulf child reads them as sound; the nickname lines keep the nickname's own joke («ضربة نشمية» for alnashmi, «كفو» for alkafo, «بكرة صار اليوم» for bokrah, «الكشتة بعد الدوام» for alkashat).

**Decided (14 Oct 2026, by localizer): a word joke that dies in Arabic gets a new joke of the same size**: "La la la, dig!" would read «لا لا لا» (no, no, no), so the singer says «ترا لا لا، نحفر!»; "Tick, tock, half a clock" rhymes as «تك، تاك، طار نصف الوقت»; "Hungry and angry" as «جوعان وزعلان»; "They call me Muscles" as «ينادونني أبو العضلات».

**Decided (14 Oct 2026, by localizer): the countdown keeps Western digits where the English has digits** («30 ثانية»، «10 ثوانٍ»، «10! 9!») and words where it shouts a word ("TEN!" = «عشرة!»), with the real grammar for each fixed number, since these never change. Rafeeq bubbles keep the house rule: five words at most, no digits (checked for the Arabic too).

**Decided (14 Oct 2026, by localizer): speech on the canvas is drawn right to left in Arabic.** The scene never mirrors, but a bubble's words do: `g.direction = DIR` for the Rafeeq bubbles, the name tag and almodeer's box, whose lines start from the box's right edge in Arabic. Without it a line ending in «!» or «؟» shows the mark on the wrong side. English draws exactly as before.

**Decided (14 Oct 2026, by localizer): the language switch goes live now, with pass 4 still in English.** Settings shows «Language / اللغة» with two buttons, each language named in its own script (English, العربية), for every player; choosing one calls `setLangChoice` and reloads. The hidden switch was there to keep the first hour from being half English, and the first hour is now whole (30 folders). The six pass 4 folders (Museum wing two, relics two, fusion, the Forge, the deep levels) open well after the first hour; there `t()` falls back to English, and the 5.35.0 changelog says so plainly, so nobody is surprised. Holding the switch until those 372 strings are done would keep a finished Arabic first hour from every Arabic reader for no gain, and a player who dislikes the mix is one click from English. The language names are data in `settings/ui.js`, not `t()` keys, because each must show in its own script whatever the page language is, and the test forbids Arabic in an English table.

**Decided (14 Oct 2026, by localizer): a medal chip names the kind of medal as an adjective of «ميدالية»** («منتهية»، «سريعة»، «صعبة»), because `medal_got` builds «ميدالية {name}!» from it and a 7 year old reads «ميدالية صعبة!» at once. Sentences keep «ميدالية السرعة» and «الميدالية الصعبة».

**Decided (14 Oct 2026, by localizer): a pick is «معول» + its material as a noun** (`pick_title` «معول {name}», materials «الحجر»، «النحاس»، «حديد السماء»), because the idafa works for every material and for «معول النجمة +2», and the material alone on the hit chip («النحاس II») still reads. Roman numerals stay as the English shows them: they are part of the pick's look.

**Decided (14 Oct 2026, by localizer): the finish card's finds keep the singular tamyeez** («3 صندوق»، «5 خام»، «2 عظمة» after «وجدت:»), the same rule as prices, because they sit inside one list built by `listOf()`; a colon form per item would put two colons in one line.

**Decided (14 Oct 2026, by localizer): Rock Friend says it never passes the Gate** (`rule_wake_d`, English and Arabic: «لكنهم لا يعبرون أبداً بوابة المرحلة التي أنت فيها»), because since 5.34.0 the away walk stops at the Gate of the level in play (`awayPassable` in `sites/rules.js`) and the step's card promised more than it does.

**Decided (14 Oct 2026, by localizer): 5.34.0 reworded** (wording only, as before): the step names are in «» («صديق الصخور»، «النجمة الساقطة») as button and label names are; "the away card" is the «أهلاً بعودتك» card (the glossary's name for it); «أيضاً» with the house spelling; "8.9 times" is «8.9 ضعف ... والآن 3 أضعاف» (was «8.9 أضعاف ... والآن 3»); "2 to 6 times smaller" is «أصغر بمرتين إلى ست مرات» (was «من مرتين»); "softer" is «أسهل», the word a child knows (was «ألين»); the nerf note says what is weaker: «هذا إضعاف لما يجلبه الغياب هناك».

**Decided (14 Oct 2026, by localizer): pass 4 closes Dig's Arabic** (wing2 166, relics2 62, fusion 56, deep 45, forge 32, museum 11, and the 4 «Buy all» strings that lived outside any `strings.js` and so were never counted). From now on every folder must be whole: the test fails on a folder not in `COMPLETE` and on an inline table without `ar`, which is option (b) of section 5 made a rule.

**Decided (14 Oct 2026, by localizer): an English line that still reaches Arabic text is wrapped in a first-strong isolate** (U+2068 ... U+2069, in `t()`), because #443 showed what an unwrapped English fallback does in right to left: "Level 10 of 20" became "20 Level 10 of" and full stops jumped to the wrong end. With all strings translated this should never fire; it is the net for a future key that slips through.

**Decided (14 Oct 2026, by localizer): clocks and signed values are isolated like numbers** («1:40»، «+12%»، «-0:25» go in a left-to-right isolate in `t()`, as «12.5K» already did), because a minus or plus sign at the start of a number is a neutral character and in right to left it can land at the far end.

**Decided (14 Oct 2026, by localizer): the road map's land chips run left to right in Arabic too** (Arabia first, on the left), with each chip's words right to left. The map picture never mirrors (section 6), and the chips are a strip of buttons that jump along that picture; in right to left they ran opposite to it (Arabia at the far right while Arabia is drawn at the far left), so a child pressing the first chip saw the map move the other way. The pan buttons already follow the picture (decided above); the chips now agree.

**Decided (14 Oct 2026, by localizer): the Forge's Dynamite is «عصا الديناميت»**, because TNT barrels are «الديناميت» (glossary) and two things must not share one name; the stick is also what the Forge draws.

**Decided (14 Oct 2026, by localizer): "Every {n}th hit" keeps the pass 1 form «كل ضربة رقم {n}»** (as «معول الانفجار»), and "every {n} Rafeeq hits" is «ضربة واحدة من كل {n} من ضربات الرفقاء»; block counts use «كتلاً عددها {n}», all right for any number. "Tool is ready" is «يمكنك استعمال {name} الآن», because «جاهز» would need a gender per tool (المثقاب، عصا الديناميت).

**Decided (14 Oct 2026, by localizer): the level line says «الفصل 2، المرحلة 17/20» and "Chapter 2, level 17/20"** (was «ف2» and "Ch. 2"), because a one-letter abbreviation is a riddle for a 7 year old in either language, and the screen-checker's fifth pass named «ف2» as one of the three things a new Arabic player trips on. The full word costs five letters; the level part of that line never shrinks, and the place name after it is the part that gives way with dots, so nothing is cut. The digit 2 matches the English and the «1/20» beside it; the long sentences keep «الفصل الثاني».

**Decided (14 Oct 2026, by localizer): every line of words drawn on a canvas, or sitting on the left-to-right stage, takes its direction from its own letters** (#451). The scene never mirrors, so the stage and its canvases are left to right; until now only the Rafeeq bubbles and almodeer's box set `g.direction`, and the Museum chip, the Gate and record flags, the Big Rock's bar and warnings, the floating numbers, the map's land signs and level names, and Alqahwa's names and bubbles were laid out left to right, so «وجدت 0 من 4» showed as «4 وجدت 0 من». Canvas: `g.direction = textDir(str)` (`proto/core/lang.js`), which is right to left only on an Arabic page and only for a line with an Arabic letter, so a bare «-12.5K» or «1:40» keeps its sign in front; a line pinned to a left point keeps `textAlign = 'left'`, and the map's land sign starts Arabic at its right edge. Page: `unicode-bidi: plaintext` on the stage's `p`, `b`, `span` and `#hud-record`, which turns the words without moving any box (moving the boxes is the scene's layout, not the language's). Plain one-word names with no number or mark («المدير»، «القهوة»، «الحكواتي») draw the same either way and were left alone.

**Decided (14 Oct 2026, by localizer): the track row stays in its places, and its words read right to left** (#462). The row (where you are, the message line, Tips, the goal) is part of the left-to-right `.mid` column, so its level line was laid out left to right: its two parts swapped («الكثبان · الفصل 2، المرحلة 20/17 · الربع الخالي») and 17 and 20, each in its own isolate, swapped too. Now the "where you are" block (`#trk-head`: the level line, the Gate note, the clock, the medals) and the message line (`#trk-msg`, the lessons) get `dir` from the page (`track/ui.js`), so in Arabic they read from the right; the boxes of the row and the stage do not move. A count with a slash is one left-to-right run written into the Arabic string (`trk_ch2` «الفصل 2، المرحلة ⁦{n}/{of}⁩», `goal_pick2` «… ⁦{a} / {b}⁩»), because two numbers isolated one by one with a neutral «/» between them take the line's direction and swap. The goal line keeps its box and its end alignment; its words go in a first-strong isolate (`ownDir()` in `proto/core/lang.js`), so a goal ending in a number («… 12 من 40») keeps the number at its left end. One-run labels (Tips, «انتهيت هنا», the goal chip) read the same either way and were left alone.

**Decided (14 Oct 2026, by localizer): the goal chip's tip says «اضغط لتنتقل إلى الهدف التالي»** (was «اضغط للهدف التالي», #463), because "tap for the next goal" means the tap moves the chip on, and «للهدف التالي» alone reads as "tap for the sake of the next goal". The 5.35.6 entry now says «المرحلة 5 … المرحلة 7 … بقية المراحل» (it said «المستوى»: a road level is «المرحلة», «المستوى» is a relic's level), wording only. «خطوط البلّور» for "crystal lines" stays: it is the glossary's «البلّور» and a child sees lines of crystal.

**Decided (14 Oct 2026, by localizer): a plain Camp step says its number** (5.36.1): the title is «ضربة الرفيق +{p}%» ("Rafeeq hit +{p}%") and the next step adds the hit before and after, «ضربة الرفيق: {a}% من ضربتك، ثم {b}%», because since 5.36.0 the step adds 2% of your hit and «رفقاء أقوى» said nothing a child could check. «ضربة الرفيق» is the words the Rafeeq row already uses (`crew_share`), so both places name one number the same way; «ثم» rather than an arrow, because the line is a sentence, not an old/new pair. The 5.36.0 entry is reworded (wording only): «صار لكل خطوة» (was «كل خطوة … صار», wrong gender), the Gates of 18 and 20 now each say their own size, and a road level is «المرحلة» throughout (it said «المستوى»).

## 6. Dig: plumbing and passes

### What exists
`proto/core/strings.js`: `addStrings({ en, ar }, owner)` fills per-language tables (a duplicate key throws); `t(key, vars)` reads `TABLES[lang]` then falls back to English; `setLang(l)`, `langNow()` (for data that carries its own script, such as the nicknames), `missingStrings(l)`, `listOf()` (uses `Intl.ListFormat(lang)`). `proto/core/lang.js` picks the language at load (`?lang=`, then `DIG_PROTO_LANG`, else English) and `proto.html` sets `lang`/`dir` before first paint; the Settings language buttons call `setLangChoice` (5.35.0).

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
| 2b (done) | `sites` 161, `starshop` 102, plus the Settings language buttons | 263 | the finish card and Star tracks |
| 3 (done) | `chatter` 668, `moods` 47, `story` 154 (moved from pass 4) | 869 | the crew's voices, heard from the first hire, and the hakawati |
| 4 (done) | `wing2` 166, `museum` 11, `relics2` 62, `fusion` 56, `forge` 32, `deep` 45, plus «Buy all» 4 | 376 | Museum, fusion: arrive later |

Total 2,169. Each pass is one worktree and one draft PR (pass 3 splits into `chatter` lines by trait if it grows past review size); the owner reviews the Arabic in the PR. screen-checker takes one RTL screenshot set after pass 1 (`?lang=ar`): the dig, the shop tab, the finish card, and the drawer, at desktop width only.

### Builder brief: Dig Arabic plumbing (pass 0)
> **Goal.** Dig can run in Arabic, right to left, without any Arabic text yet. Done when `proto.html?loop=3&lang=ar` loads with `<html lang="ar" dir="rtl">`, `t()` returns English for every key (fallback), the scene is not mirrored, panels and cards are, and `?lang=en` or no parameter is unchanged.
> **Read.** `docs/arabic.md` section 6, `docs/ui-style-guide.md` 7.1, `proto/core/strings.js`, `js/i18n/lang.js` (copy the idea, not the Aetheria dependency; Dig must not import Aetheria files), `proto/proto.css`, `proto/main.js`.
> **Do.** (1) A small `proto/core/lang.js` with no imports: picks the language (`?lang=`, then `DIG_PROTO_LANG`, else `en`), exposes `LANG`, `DIR`, `setLangChoice(id)` (stores and reloads). (2) An inline script at the top of `proto.html` sets `lang` and `dir` on `<html>` before first paint, and `main.js` calls `setLang(LANG)` before features register. (3) `addStrings` also loads a sibling `strings.ar.js` default export if a feature has one (optional; features without it are fine). (4) Move `boss_name_ar`, `bossf_name_ar`, `qh_name_m`, `qh_name_f` out of the `en` tables as described. (5) Logical CSS in `proto.css` and feature CSS; Cairo and Noto Kufi Arabic; `[lang=ar]` turns off uppercase and letter spacing; canvas wrapper `direction: ltr`; canvas `text()` helper uses the language's font stack. (6) `test_dig_i18n.js` and `npm run dig:i18n` as in section 6, with `COMPLETE = []`. (7) No visible switch, no changelog entry (nothing a player sees); label the PR `no-changelog`.
> **Do not.** Add Arabic strings; change English text; touch the Dig save; mirror the canvas; use `left`/`right`.
> **Files.** `proto.html`, `proto/core/lang.js` (new), `proto/core/strings.js`, `proto/main.js`, `proto/proto.css`, `proto/features/*/*.css`, `proto/features/chatter/strings.js`, `proto/features/worldmap/strings.js`, `test_dig_i18n.js` (new), `package.json` (script only; not the `test` script).
> **Checks.** `npm test`; ask screen-checker for `?lang=ar` and `?lang=en` screenshots to confirm no layout change in English and a mirrored panel layout in Arabic.
