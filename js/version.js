// Single source of truth for the game version and the About tab changelog.
// Every PR that changes what players see or how the game plays adds an entry at the TOP of
// CHANGELOG and sets VERSION to it (rules in AGENTS.md, "Version and changelog").
// test_version.js checks the two agree; CI fails a game-code PR that doesn't touch this file.

export const VERSION = '5.31.0';

export const CHANGELOG = [
  {
    version: '5.31.0',
    date: '2026-10-09',
    title: 'New Wells need a real run',
    changes: [
      'The New Well button now unlocks after a run of at least 2 minutes and counts down the time left.',
      'A New Well now pays more the longer the run: a 10 minute run pays 11% of the Reserves, 15 minutes 25%, and 30 minutes or more pays all of it. The Pending line shows the percentage and when it is full. Your first New Well is not reduced. This ends tapping New Well every few seconds, which paid far more Reserves per hour than playing a real run. Runs of 30 minutes or longer are unchanged.',
      'Opening a New Field or a Chronicle is not delayed.'
    ],
    ar: {
      title: 'البئر الجديدة تحتاج جولة حقيقية',
      changes: [
        'زر البئر الجديدة يُفتح الآن بعد جولة لا تقل عن دقيقتين ويعرض الوقت المتبقي.',
        'البئر الجديدة تعطي الآن احتياطيًا أكثر كلما طالت الجولة: جولة مدتها 10 دقائق تعطي 11٪ من الاحتياطي، و15 دقيقة تعطي 25٪، و30 دقيقة أو أكثر تعطيه كاملًا. سطر المنتظر يعرض النسبة ووقت اكتمالها. أول بئر جديدة لك لا تُخفَّض. هذا يوقف الضغط على البئر الجديدة كل بضع ثوانٍ، وكان يعطي احتياطيًا في الساعة أكثر بكثير من لعب جولة حقيقية. الجولات التي تبلغ 30 دقيقة أو أكثر لا تتغير.',
        'فتح حقل جديد أو بدء سجل جديد لا يتأخر.'
      ]
    }
  },
  {
    version: '5.30.1',
    date: '2026-10-09',
    title: 'Fix Open New Field button on New Well page',
    changes: [
      'The "Open a New Oil Field" button on the New Well tab now opens the confirmation sheet and plays the release ceremony reliably (reported by players).'
    ],
    ar: {
      title: 'إصلاح زر فتح حقل نفط جديد في تبويب البئر الجديدة',
      changes: [
        'زر "فتح حقل نفط جديد" في تبويب البئر الجديدة يفتح الآن نافذة التأكيد ويعمل بالشكل الصحيح مع إطلاق الاحتفال (أبلغ عنه اللاعبون).'
      ]
    }
  },
  {
    version: '5.30.0',
    date: '2026-10-09',
    title: 'Chronicle Pages stop at the 9th New Field',
    changes: [
      'A Chronicle now pays at most 4 Pages from New Fields: 3 at 6 New Fields and 4 from 8. New Fields after the 9th no longer add Pages (they used to add 1 for every 2). Gilded Edges and challenge rewards still add theirs on top.',
      'This slows late-game growth on purpose: New Fields after the 9th cost 3 times the dust of the one before, and staying there for Pages pushed Oil into the hundreds of quintillions late in the year. Once you have your 9 New Fields, beginning the next Chronicle is the better move.',
      'Pages you have already earned are kept, and each still gives +20% Oil.',
      'The Chronicle tab\'s guide now says how Pages are counted, and its hint gives the right number of New Fields (6, or 8 for your first Chronicle; it said 12).'
    ],
    ar: {
      title: 'صفحات الملحمة تتوقف عند الحقل الجديد التاسع',
      changes: [
        'الملحمة تمنح الآن 4 صفحات على الأكثر من الحقول الجديدة: 3 عند 6 حقول جديدة و4 من الحقل الثامن. الحقول الجديدة بعد التاسع لم تعد تضيف صفحات (كانت تضيف صفحة لكل حقلين). ويبقى ما تضيفه الحواف المذهّبة ومكافآت التحديات فوق ذلك.',
        'هذا يبطئ النمو في آخر اللعبة عن قصد: كل حقل جديد بعد التاسع يكلّف 3 أضعاف غبار الحقل الذي قبله، والبقاء هناك من أجل الصفحات كان يدفع النفط إلى مئات الكوينتليونات في آخر السنة. بعد حقولك الجديدة التسعة، بدء الملحمة التالية هو الخيار الأفضل.',
        'الصفحات التي كسبتها تبقى لك، وكل واحدة ما زالت تمنح +20% نفط.',
        'دليل تبويب الملحمة يشرح الآن كيف تُحسب الصفحات، وتلميحه يذكر العدد الصحيح من الحقول الجديدة (6، أو 8 لأول ملحمة؛ كان يقول 12).'
      ]
    }
  },
  {
    version: '5.29.0',
    date: '2026-10-09',
    title: 'Small Moments, Done Right',
    changes: [
      'Hero skills now show their numbers on the monster: the Shield, the Leech heal and the Strike and Supernova damage used to appear at the middle of the screen, which missed the monster on desktop.',
      'Claiming the Daily Dallah pours sand into the cup for one second, with one sound instead of two. With Reduce motion on, the cup fills at once.',
      'Lighting a Seal of Transcendence is now a full celebration card instead of a small pop-up.',
      'When a Frenzy ends, a small toast tells you how much Oil your taps earned during it ("Frenzy: +1.2K Oil").',
      'Pop-ups on desktop no longer cover the Less / More button at the top of each tab.'
    ],
    ar: {
      title: 'لحظات صغيرة بشكلها الصحيح',
      changes: [
        'مهارات البطل تعرض أرقامها الآن فوق الوحش: كان الدرع وشفاء الامتصاص وضرر الضربة والمستعر الأعظم يظهر في منتصف الشاشة فيخطئ الوحش على الحاسوب.',
        'استلام دلّة اليوم يسكب الرمل في الفنجان لمدة ثانية، بصوت واحد بدل صوتين. ومع تقليل الحركة يمتلئ الفنجان دفعة واحدة.',
        'إضاءة ختم من أختام التسامي صارت بطاقة احتفال كاملة بدل إشعار صغير.',
        'عند انتهاء الهيجان يخبرك إشعار صغير بكمية النفط التي جنتها نقراتك خلاله («الهيجان: +1.2K نفط»).',
        'لم تعد الإشعارات على الحاسوب تغطي زر أقل / أكثر في أعلى كل تبويب.'
      ]
    }
  },
  {
    version: '5.28.0',
    date: '2026-10-09',
    title: 'Drill Mastery',
    changes: [
      'New in the Reserve shop: Drill Mastery (35 Reserves, opens after 3 New Wells, one-time buy). With it, your Auto-Drills and Steam Jackhammers use your Stone Workshop techniques and crits, so every drill hit can Shatter, Cleave, Arc and crit like a tap.',
      'This is a nerf if you have not bought it yet: until you do, drill hits are plain pickaxe hits again, as they were before the last update. Your own taps always use your techniques. Like the rest of the shop, it resets when you open a New Field.'
    ],
    ar: {
      title: 'إتقان المثاقب',
      changes: [
        'جديد في متجر الاحتياطي: إتقان المثاقب (35 احتياطيا، يُفتح بعد 3 آبار جديدة، شراء مرة واحدة). معه تستخدم مثاقبك الآلية ومطارقك البخارية تقنيات ورشة الأحجار والضربات الحرجة، فكل ضربة مثقاب قد تُحدث الصدع والشق والقوس والضربة الحرجة مثل نقرتك.',
        'هذا إضعاف إن لم تشتره بعد: حتى تشتريه تعود ضربات المثاقب ضربات معول عادية كما كانت قبل التحديث السابق. أما نقراتك فتستخدم تقنياتك دائما. ومثل بقية المتجر، يُعاد ضبطه عند فتح حقل نفط جديد.'
      ]
    }
  },
  {
    version: '5.27.0',
    date: '2026-10-09',
    title: 'Rare Things Look Rare',
    changes: [
      'Opening a new tab for the first time is now a short celebration: a choir swell and a card that lasts two seconds (tap or press Esc to skip). Then the button of the new tab pulses gold three times. Several tabs opening at once share one card ("2 new places").',
      'Big pop-ups now play the brass fanfare instead of the bell.',
      'Golden Anomalies appear with a soft pluck and a quick shimmer. A Mirage tints the screen edges purple for its 60 seconds and has its own sound. A Caravan Star sends a camel across the top of the screen. A Supernova rolls your Oil counter up instead of jumping it.',
      'A golden harvest bursts in a gold ring with a short brass note. A mutant seed chimes like a rare find. A Legendary item drop gets a gold sweep on its pop-up and its own sound.',
      'With Reduce motion on, the haze, camel and count-up are off, and the flashes become still gold outlines. Sounds stay.'
    ],
    ar: {
      title: 'النادر يبدو نادرًا',
      changes: [
        'فتح تبويب جديد لأول مرة صار احتفالًا قصيرًا: ترنيمة جوقة وبطاقة تدوم ثانيتين (انقر أو اضغط Esc للتخطي). ثم يومض زر التبويب بالذهبي ثلاث مرات. وإذا فُتحت عدة تبويبات معًا تشاركت بطاقة واحدة («٢ أماكن جديدة»).',
        'النوافذ الكبيرة تعزف الآن نفير النحاس بدلًا من الجرس.',
        'تظهر الشذوذات الذهبية بنقرة ناعمة ولمعة سريعة. السراب يصبغ حواف الشاشة بالبنفسجي طوال 60 ثانية وله صوته الخاص. نجمة القافلة ترسل جملًا يعبر أعلى الشاشة. والمستعر الأعظم يرفع عداد النفط تدريجيًا بدل القفز.',
        'الحصاد الذهبي ينفجر بحلقة ذهبية ونغمة نحاس قصيرة. والبذرة الطافرة تُرنّ كاكتشاف نادر. وغنيمة الأسطورية تحصل على لمعة ذهبية في نافذتها وصوت خاص.',
        'مع تفعيل تقليل الحركة يختفي الضباب والجمل والعدّ التصاعدي، وتتحول الومضات إلى إطارات ذهبية ثابتة. تبقى الأصوات.'
      ]
    }
  },
  {
    version: '5.26.0',
    date: '2026-10-09',
    title: 'A Well Worth Drilling',
    changes: [
      'Drilling a New Well and opening a New Oil Field no longer use a pop-up box from your browser. A sheet inside the game shows exactly what you gain and what resets, with Not yet and a confirm button you hold for a moment while a tone rises.',
      'Let go early and nothing happens. Hold it all the way and the screen dims, the orb sinks, a gusher of 60 sparks bursts out and NEW WELL! or NEW FIELD! flashes before the reward card counts up. The whole thing takes 3.5 seconds at most, and a tap or Esc skips straight to the result.',
      'A New Field has its own look and sound: a purple sweep across the screen and the choir. A New Well you choose to drill always gets its celebration, even if another big moment happened in the last minute.',
      'New Settings option, Tap to confirm, replaces the hold with a single tap. With Reduce motion on the button is always a tap, there is no sinking orb or sparks, and the reward card is the short one. What you gain and lose is unchanged.'
    ],
    ar: {
      title: 'بئر تستحق الحفر',
      changes: [
        'لم يعد حفر بئر جديدة أو فتح حقل نفط جديد يستخدم نافذة المتصفح. تعرض ورقة داخل اللعبة بالضبط ما تكسبه وما يُعاد ضبطه، مع «ليس الآن» وزر تأكيد تضغطه مطولًا لحظة بينما ترتفع نغمة.',
        'إن رفعت إصبعك مبكرًا فلن يحدث شيء. وإن أكملت الضغط يخفت الشاشة وتغوص الكرة وينفجر نبع من 60 شرارة ويومض «بئر جديدة!» أو «حقل جديد!» قبل أن تعدّ بطاقة المكافأة. تستغرق العملية 3.5 ثانية كحد أقصى، والنقر أو Esc ينتقل مباشرة إلى النتيجة.',
        'للحقل الجديد شكله وصوته: كنسة بنفسجية عبر الشاشة والجوقة. والبئر الجديدة التي تختار حفرها تحصل دائمًا على احتفالها حتى لو حدثت لحظة كبيرة أخرى في الدقيقة الماضية.',
        'خيار جديد في الإعدادات «النقر للتأكيد» يستبدل الضغط المطول بنقرة واحدة. مع تفعيل تقليل الحركة يكون الزر نقرة دائمًا، بلا غوص للكرة ولا شرر، وبطاقة المكافأة هي القصيرة. ما تكسبه وما تخسره لم يتغير.'
      ]
    }
  },
  {
    version: '5.25.0',
    date: '2026-10-09',
    title: 'The Climb to Frenzy',
    changes: [
      'Tapping the Refinery now builds toward something. The tap sound rises one note for every 4 combo taps (five notes at most) and steps back down when you pause. At 5, 10, 15 and 20 combo a ring pulses on the combo bar and the orb glows brighter.',
      'Taps 18 and 19 wind up: the orb flares, then at 20 Frenzy hits with its own sound, a FRENZY! callout, a ring of sparks and a tinted orb for as long as it lasts. The combo bar stays full and glowing for a moment before it shows progress to the next Frenzy, and a Frenzy that gets extended shows a +4 s chip.',
      'A crit now pops CRIT! at the tap and the number floats up from under it. The Oil numbers from fast tapping are capped at 12 on screen so they stay readable on a phone.',
      'The Tap to pump Oil! hint goes away after your first tap. With Reduce motion on there is no ring, sparks or scale, but the callout, colours and sounds stay. Frenzy pays the same as before.'
    ],
    ar: {
      title: 'الصعود نحو الهيجان',
      changes: [
        'صارت نقرات المصفاة تبني نحو لحظة كبيرة. ترتفع نغمة النقر درجة واحدة كل 4 نقرات متتالية (خمس درجات كحد أقصى) وتنزل مجددا حين تتوقف. عند 5 و10 و15 و20 تنبض حلقة على شريط الكومبو ويزداد توهّج الكرة.',
        'النقرتان 18 و19 تمهّدان للحظة: تلتهب الكرة، ثم عند 20 يبدأ الهيجان بصوته الخاص ونص «الهيجان!» وحلقة من الشرر وتلوّن الكرة طوال مدته. يبقى شريط الكومبو ممتلئا ومتوهجا لحظة قبل أن يعرض التقدم نحو الهيجان التالي، وعند تمديد الهيجان تظهر شارة +4 ث.',
        'النقرة الحرجة تُظهر «CRIT!» عند موضع النقر ويطفو الرقم من تحتها. أرقام النفط الناتجة عن النقر السريع لا تزيد عن 12 على الشاشة لتبقى مقروءة على الهاتف.',
        'يختفي تلميح «انقر لتضخّ النفط!» بعد أول نقرة. عند تفعيل تقليل الحركة لا حلقة ولا شرر ولا تكبير، وتبقى الكلمة والألوان والأصوات. الهيجان يمنح المقدار نفسه كما كان.'
      ]
    }
  },
  {
    version: '5.24.0',
    date: '2026-10-09',
    title: 'Honest Feedback',
    changes: [
      'The Bazaar only cheers for a real profit. Sell above the usual price and you get the coin chime and a green "+gold (+x%)" note. Sell at the usual price or below it and you get a plain click and "Sold for n gold", with no chime and no green. Prices and payouts are unchanged.',
      'A cross-breed that gives no hybrid now answers with a soft pluck and a quiet "No hybrid this time" note instead of silence.',
      'Buying now shows: the count pops and a "+1" (or "+10", "+100") rises from the button. With Reduce motion on, the chip simply shows in place.',
      'Tapping a buy button you cannot use (not enough resources) now gives a soft low click and a brief outline instead of nothing.'
    ],
    ar: {
      title: 'ردود فعل صادقة',
      changes: [
        'السوق لا يحتفل إلا بالربح الحقيقي. إذا بعت بأعلى من السعر المعتاد تسمع رنين العملات وتظهر ملاحظة خضراء «+ذهب (+x٪)». وإذا بعت بالسعر المعتاد أو أقل تسمع نقرة عادية وتظهر «بيع مقابل n ذهب» دون رنين ولا لون أخضر. الأسعار والمبالغ كما هي.',
        'التهجين الذي لا ينتج هجينا صار يردّ بنغمة خفيفة وملاحظة هادئة «لا هجين هذه المرة» بدل الصمت.',
        'الشراء صار مرئيا: يقفز العدّاد وترتفع من الزر إشارة «+1» (أو «+10»، «+100»). مع تقليل الحركة تظهر الإشارة في مكانها فقط.',
        'الضغط على زر شراء لا تستطيع استخدامه (موارد غير كافية) يعطي الآن نقرة منخفضة خفيفة وإطارا قصيرا بدل لا شيء.'
      ]
    }
  },
  {
    version: '5.23.0',
    date: '2026-10-09',
    title: 'Drills Use Your Techniques',
    changes: [
      'Auto-Drills and Steam Jackhammers now hit like your own pickaxe: every drill hit can Seismic Fracture (x10 damage), Quarry Cleave, Arc Conduction and crit (including the Super-Crit shockwave), with the same chances as a tap. Your Stone Workshop upgrades now speed up idle digging too.',
      'Excavation Frenzy still comes only from 7 quick taps of your own, and its x2 still applies only to your taps. Drill procs make no sound, so a busy mine stays quiet.'
    ],
    ar: {
      title: 'المثاقب تستخدم تقنياتك',
      changes: [
        'المثاقب الآلية والمطارق البخارية تضرب الآن مثل معولك: كل ضربة مثقاب قد تُحدث الصدع الزلزالي (ضرر عشرة أضعاف) وشق المحجر وتوصيل القوس والضربة الحرجة (ومعها موجة الضربة الحرجة الفائقة)، بنفس فرص نقرتك. فترقيات ورشة الأحجار تُسرّع الحفر وأنت غائب أيضا.',
        'جنون الحفر ما زال يأتي فقط من 7 نقرات سريعة منك، ومضاعفته تنطبق على نقراتك فقط. ضربات المثاقب الخاصة بلا صوت، فيبقى المنجم المزدحم هادئا.'
      ]
    }
  },
  {
    version: '5.22.0',
    date: '2026-10-09',
    title: 'A Proper Welcome Back',
    changes: [
      'Coming back after time away now feels like a small celebration: a bell rings, your offline Oil counts up (1.2 seconds at most), then the breakdown rows appear and gold sparks fly. Tap anywhere to skip to the total.',
      'The button is now called Collect: it closes the window with a soft pluck and your Oil counter in the header glows. You get exactly the same amount as before.',
      'With Reduce motion on, the total shows at once without sparks; the sounds still play.'
    ],
    ar: {
      title: 'ترحيب لائق بعودتك',
      changes: [
        'العودة بعد الغياب صارت احتفالا صغيرا: يرنّ جرس، ثم يرتفع عدّاد النفط الذي جمعته في غيابك (ثانية وخُمسان على الأكثر)، ثم تظهر تفاصيل الحساب ويتطاير شرر ذهبي. انقر في أي مكان لتنتقل إلى المجموع مباشرة.',
        'صار اسم الزر «استلم»: يغلق النافذة بنغمة خفيفة ويتوهّج عدّاد النفط في الأعلى. تحصل على المقدار نفسه تماما كما في السابق.',
        'عند تفعيل تقليل الحركة يظهر المجموع فورا دون شرر، وتبقى الأصوات.'
      ]
    }
  },
  {
    version: '5.21.1',
    date: '2026-10-09',
    title: 'Colour Cues Without Motion',
    changes: [
      'With Reduce motion on, flashes that used to disappear now show as a steady colour instead: a gold outline around the source of a reward (0.9 s), an orange edge on tiles hit by Dynamite or Void Cataclysm (0.6 s), and a red border on the boss portrait when you land the killing blow.'
    ],
    ar: {
      title: 'إشارات لونية بلا حركة',
      changes: [
        'مع تفعيل «تقليل الحركة»، صارت الومضات التي كانت تختفي تظهر لوناً ثابتاً: إطار ذهبي حول مصدر المكافأة (0.9 ث)، وحافة برتقالية على المربعات التي يصيبها الديناميت أو إعصار الفراغ (0.6 ث)، وإطار أحمر على صورة الزعيم عند الضربة القاضية.'
      ]
    }
  },
  {
    version: '5.21.0',
    date: '2026-10-09',
    title: 'Sounds That Mean Something',
    changes: [
      'You can now tell by ear what happened. Spending still makes the rising "buy" tone; collecting a reward (contract claim, Daily Dallah, gold caches, returning caravans, Bazaar sales) now makes a bright coin chime instead.',
      'Finds sound richer the rarer they are: a ruby is two notes, a diamond three, a Void Amethyst four with a shimmer. Aether Ore and Anomalies now have a rare find sound too.',
      'Each spell is cast at its own pitch, and Dynamite and Void Cataclysm now boom instead of making the combat hit sound.',
      'Claiming a contract shows a small toast with the gold, Seals and Chrono Sand you received.',
      'The Daily Dallah now plays one sound, not two.'
    ],
    ar: {
      title: 'أصوات لها معنى',
      changes: [
        'صرت تعرف بأذنك ماذا حدث. الصرف ما زال بنغمة الشراء الصاعدة، أما استلام مكافأة (عقد، أو الدلّة اليومية، أو كنوز الذهب، أو عودة القافلة، أو بيع في السوق) فيُصدر الآن رنّة عملات ساطعة.',
        'كلما ندر الكنز غنى صوته: الياقوت نغمتان، والألماس ثلاث، وجمشت الفراغ أربع مع لمعان. ولخام الأثير والشذوذات الآن صوت اكتشاف نادر.',
        'لكل تعويذة نغمتها الخاصة، وأصبح للديناميت وإعصار الفراغ دويّ بدل صوت ضربة القتال.',
        'استلام العقد يعرض إشعارا صغيرا بما نلته من ذهب وأختام ورمل الزمن.',
        'الدلّة اليومية تُصدر صوتا واحدا لا اثنين.'
      ]
    }
  },
  {
    version: '5.20.0',
    date: '2026-10-09',
    title: 'See What Each Generator Adds',
    changes: [
      'Every generator buy button now shows how much production the purchase adds (for example +45/s) under its cost, for the amount you have selected (1, 10, 25, 100 or MAX). It counts milestones, upgrades and talents, so a buy that crosses a milestone shows the full jump. It is also shown when you cannot afford it yet, so you can plan.',
      'A small Best value badge marks the generator you can afford right now that gives the most production for its price. Hover or long-press a button for the exact ratio.'
    ]
  },
  {
    version: '5.19.0',
    date: '2026-10-09',
    title: 'Mythic Finds, Barakah and Boss Telegraphs',
    changes: [
      'Bosses now fight back. Every 8 seconds (6 seconds in phase 2) a boss winds up for 1.5 seconds: SMASH (cast Iron Wall), FEAST (cast Heavy Strike or Supernova) or WARD (tap the glowing weak point 5 times). Answer it and the boss is Exposed for 3 seconds, taking 50% more damage. Miss it and SMASH hits you for 25% of your max HP, FEAST heals the boss 8%, WARD cuts your damage to it by 75% for 4 seconds. Up to floor 150 a miss costs nothing, so you can practise. At half HP a boss enters phase 2: it hits 50% harder and winds up sooner.',
      'Sheikhs: every 50th floor that is not a Guardian or Warden floor is a Sheikh with 1.5x boss HP, 60 seconds and two kinds of telegraph. It always drops an Epic or better item.',
      'Zone Guardians guard the end of each zone (floors 50, 150, 300, 500, 750 and 1,000): 3x boss HP, 60 seconds and three phases. Your first kill drops a guaranteed Legendary. Where a Guardian floor is also a Warden floor it is one fight, not two.',
      'Mythic gear, the rarest tier: 0.001% of drops from floor 151 on (more from bosses, Sheikhs and Guardians). Four Mythics, one per slot: the Scepter of the Wasta King (every 30th hit is a WASTA STRIKE for 10x damage; on a boss the bonus is capped at 4% of its HP), the Thobe of Eternal Ironing (once per fight a lethal hit leaves you at full HP), the Nazar of the Haters (telegraphs answer themselves, normal crits hit 3x) and the Royal Decree Seal (+20% damage per telegraph you answered, up to 3). A Mythic is never salvaged by accident and arrives locked.',
      'The Barakah meter in the bag is a visible pity timer for Mythics. Finds and first boss kills fill it; at 20,000 your next find from floor 151 on is a Mythic. After 1,000 points in a day the meter rests: more points that day count a quarter. It never drains and nothing expires, so time away costs you nothing.',
      'Every 10th Legendary without a Cosmic is now a Cosmic. Each boss\'s first kill also gives a spare Void Core, double gold and Barakah.',
      'Al-Wakeel (auto-equip upgrades) is now a Dust shop item (40 dust, after 5 Ascensions). Saves that already had it, from record floor 301, keep it.'
    ],
    ar: {
      title: 'قطع خرافية والبركة وهجمات الزعماء المنذرة',
      changes: [
        'الزعماء يردّون الآن. كل 8 ثوان (6 ثوان في المرحلة الثانية) يستعد الزعيم لثانية ونصف: تحطيم (استخدم الجدار الحديدي)، أو وليمة (استخدم الضربة الثقيلة أو المستعر الأعظم)، أو حماية (انقر نقطة الضعف المتوهجة 5 مرات). إن صددتها يصبح الزعيم مكشوفا 3 ثوان ويتلقى ضررا أكثر بنسبة 50%. وإن فاتتك: يضربك التحطيم بـ25% من صحتك القصوى، وتعالج الوليمة الزعيم 8%، وتخفض الحماية ضررك عليه بنسبة 75% لمدة 4 ثوان. حتى الطابق 150 لا عقوبة على الفوات فتتدرّب بحرية. عند نصف الصحة تبدأ المرحلة الثانية: يضرب أقوى بنسبة 50% ويستعد أسرع.',
        'الشيوخ: كل طابق يقبل القسمة على 50 وليس طابق حارس أكبر أو حارس هو شيخ بصحة تعادل 1.5 ضعف صحة الزعيم ومهلة 60 ثانية ونوعين من الهجمات المنذرة. ويُسقط دائما قطعة ملحمية فما فوق.',
        'حرّاس المناطق عند نهاية كل منطقة (الطوابق 50 و150 و300 و500 و750 و1,000): ثلاثة أضعاف صحة الزعيم ومهلة 60 ثانية وثلاث مراحل. أول قتل لك يُسقط أسطورية مضمونة. وحيث يلتقي طابق حارس أكبر بطابق حارس يكون القتال واحدا لا اثنين.',
        'العتاد الخرافي، أندر الفئات: 0.001% من الغنائم من الطابق 151 فما فوق (والنسبة أعلى من الزعماء والشيوخ والحرّاس). أربع قطع خرافية، واحدة لكل خانة: صولجان ملك الواسطة (كل ضربة ثلاثين هي ضربة واسطة بعشرة أضعاف الضرر، وعلى الزعيم لا تزيد المكافأة على 4% من صحته)، وثوب الكي الأبدي (مرة في كل قتال تتركك الضربة القاتلة بصحة كاملة)، ونظرة الحاسدين (تُصَدّ الهجمات المنذرة تلقائيا وتضرب الحرجة العادية ثلاثة أضعاف)، وختم المرسوم الملكي (+20% ضرر عن كل هجوم منذر صددته حتى 3 مرات). لا تُفكَّك القطعة الخرافية بالخطأ وتأتيك مقفلة.',
        'عدّاد البركة في الحقيبة مؤقّت ضمان ظاهر للقطع الخرافية. تملؤه الغنائم وأول قتل للزعماء، وعند 20,000 تكون غنيمتك التالية من الطابق 151 فما فوق قطعة خرافية. بعد 1,000 نقطة في اليوم تستريح البركة: النقاط الإضافية في ذلك اليوم تُحسب بربعها. لا تنقص أبدا ولا تنتهي صلاحيتها، فغيابك لا يكلّفك شيئا.',
        'كل أسطورية عاشرة دون قطعة كونية تصبح كونية. وأول قتل لأي زعيم يمنحك أيضا لبّ فراغ إضافيا وضعف الذهب وبركة.',
        'الوكيل (تجهيز الترقيات تلقائيا) صار الآن عنصرا في متجر الغبار (40 غبارا بعد 5 صعودات). ومن كان يملكه من قبل، من الطابق القياسي 301، يحتفظ به.'
      ]
    }
  },
  {
    version: '5.18.0',
    date: '2026-10-09',
    title: 'Gear Bag, Rare Finds and Re-Tempering',
    changes: [
      'New Gear Bag on the Tower tab: loot now waits in a 30-slot bag until you equip it. Compare it with what you wear, lock favourites, salvage or sell the rest, and see a green arrow on every upgrade. Gear no longer replaces itself.',
      'Monsters drop an item 8% of the time, bosses always drop one. Rarities now go from x1 (Common) to x5 (Cosmic), with Rare and better items rolling affixes: Might, Vigor, Slayer, Precision, Greed and Fortune. After 600 drops without a Legendary, the next one is Legendary.',
      'Bosses can drop their own signature Legendary (a Fizzing Rukbah Can, a Ladle of Infinite Kabsa and more), each with a special effect.',
      'Re-temper a Legendary or Cosmic item with gold and Void Cores to bring it up to the floor you are on, so a favourite never goes out of date.',
      'Kashta: after two losses at the same gate your hero camps for 5 minutes on a lower floor, farming loot and gold, then tries the gate again. You can switch it off, or camp on purpose, from the bag.',
      'Monster Bones and gear levels are gone. Every level you had is now part of your gear\'s stats (+4% per level), your bones became Gear Scrap (1 per bone banked, 1 per 10 spent on levels), and heavy spenders also get up to 8 extra Rare finds in the bag and up to 20 Void Cores. Salvaging gear now pays Gear Scrap, which Almarai Laban uses instead of bones.',
      'Old gear became Heirlooms: every equipped item keeps exactly the Attack, HP, Crit and Drain it had (level bonuses included), gains a bonus affix, and Legendary and Cosmic ones get a free re-temper. New drops use smaller rarity bonuses (Legendary x4, was x8; Cosmic x5, was x18). Players with a record above floor 300 keep automatic equipping of upgrades.',
      'Gear now grows x1.109 per floor (was x1.105) to make up for the flatter rarities, so the Tower climb keeps its pace. Your gear may put you on a lower floor after the update; your record floor is kept.',
      'Void Cataclysm in the Tower now deals at most 10 hits of your Attack.'
    ],
    ar: {
      title: 'حقيبة العتاد والقطع النادرة وإعادة السقي',
      changes: [
        'حقيبة عتاد جديدة في تبويب البرج: تنتظر الغنائم في حقيبة من 30 خانة حتى تجهّزها. قارنها بما ترتديه، واقفل المفضّل، وفكّك الباقي أو بِعه، وسترى سهما أخضر عند كل ترقية. لم يعد العتاد يستبدل نفسه.',
        'يُسقط الوحش قطعة بنسبة 8% ويُسقط الزعيم قطعة دائما. تتراوح الندرة الآن من ×1 (عادي) إلى ×5 (كوني)، وتحمل القطع النادرة وما فوقها خصائص: القوة، والحيوية، والقاتل، والدقة، والجشع، والحظ. بعد 600 غنيمة دون أسطورية تكون التالية أسطورية.',
        'قد يُسقط الزعماء أسطورياتهم المميّزة (علبة الركبة الفوّارة، ومغرفة الكبسة اللانهائية وغيرها)، ولكل منها تأثير خاص.',
        'أعد سقي قطعة أسطورية أو كونية بالذهب ولبّ الفراغ لترتفع إلى الطابق الذي وصلت إليه، فلا يتقادم عتادك المفضّل.',
        'الكشتة: بعد خسارتين عند البوابة نفسها يخيّم بطلك 5 دقائق في طابق أدنى يجمع الغنائم والذهب، ثم يعيد المحاولة. يمكنك إيقافها أو التخييم متى شئت من الحقيبة.',
        'اختفت عظام الوحوش ومستويات العتاد. صار كل مستوى لديك جزءا من إحصاءات عتادك (+4% لكل مستوى)، وتحوّلت عظامك إلى خردة عتاد (واحدة لكل عظمة محفوظة وواحدة لكل 10 صُرفت على المستويات)، ومن أنفق كثيرا يحصل أيضا على حتى 8 قطع نادرة إضافية في الحقيبة وحتى 20 من لبّ الفراغ. يعطيك تفكيك العتاد خردة عتاد، وتستخدمها وصفة المراعي في الخيمياء بدل العظام.',
        'صار عتادك القديم إرثا: تحتفظ كل قطعة مجهّزة بالهجوم والصحة والضربة الحرجة والامتصاص كما كانت تماما (مع مكافآت المستويات)، وتكسب خاصية إضافية، وتحصل القطع الأسطورية والكونية على إعادة سقي مجانية. الغنائم الجديدة تستخدم مكافآت ندرة أصغر (الأسطوري ×4 بدل ×8، والكوني ×5 بدل ×18). من وصل رقمه القياسي فوق الطابق 300 يحتفظ بالتجهيز التلقائي للترقيات.',
        'ينمو العتاد الآن ×1.109 لكل طابق (كان ×1.105) تعويضا عن الندرة الأقل، فيحافظ تسلق البرج على وتيرته. قد يضعك عتادك بعد التحديث في طابق أدنى؛ ويبقى رقمك القياسي محفوظا.',
        'كارثة الفراغ في البرج لا تتجاوز الآن 10 أضعاف هجومك.'
      ]
    }
  },
  {
    version: '5.17.3',
    date: '2026-10-08',
    title: 'Super-Crits and Shockwaves Actually Fire',
    changes: [
      'Fix: Super-Crits now really happen. About 1 in 5 Refinery crits is a Super-Crit that pays 5x your click (a normal crit pays 3x), with the orange SUPER CRIT! flash.',
      'Fix: the Excavation shockwave now really happens. About 1 in 5 crits on a manual dig is a Super-Crit that also hits the four tiles around it. Auto-drills and other automatic hits never crit.',
      'Hyper-Crits still need more than 200% crit chance, which nothing in the game reaches yet.'
    ],
    ar: {
      title: 'الضربات الفائقة وموجات الصدمة تعمل فعلاً',
      changes: [
        'إصلاح: الضربات الفائقة تحدث الآن فعلاً. نحو واحدة من كل 5 ضربات حرجة في التكرير ضربة فائقة تعطي 5 أضعاف نقرتك (الحرجة العادية 3 أضعاف)، مع وميض «ضربة فائقة!» البرتقالي.',
        'إصلاح: موجة الصدمة في التنقيب تحدث الآن فعلاً. نحو واحدة من كل 5 ضربات حرجة في الحفر اليدوي ضربة فائقة تصيب أيضاً المربعات الأربعة المجاورة. الحفارات الآلية والضربات التلقائية لا تُحدث ضربات حرجة أبداً.',
        'الضربات الخارقة ما زالت تحتاج أكثر من 200% فرصة حرجة، ولا يصل إليها شيء في اللعبة حالياً.'
      ]
    }
  },
  {
    version: '5.17.2',
    date: '2026-10-08',
    title: 'Garden Taps Grow Faster Again',
    changes: [
      'Each paid tap on a growing crop grows it by 5% of its grow time again (was 2% since the last update). The 5 paid taps a second limit stays.'
    ],
    ar: {
      title: 'نقرات الحديقة تنمّي المحاصيل أسرع مجددًا',
      changes: [
        'كل نقرة مدفوعة على محصول نامٍ تنمّيه الآن بنسبة 5% من وقت نموه من جديد (كانت 2% منذ التحديث الأخير). يبقى حد 5 نقرات مدفوعة في الثانية.'
      ]
    }
  },
  {
    version: '5.17.1',
    date: '2026-10-08',
    title: 'Shatter Nerf: Digging Keeps Its Pace',
    changes: [
      'Nerf: Seismic Fracture (Shatter) no longer breaks a tile outright. A proc now hits for x10 pickaxe damage, so a tile still has to be worn down; it was skipping tile HP and let manual diggers drop through the strata far faster than intended.',
      'Excavation depth now follows its intended curve for hands-on players too (about depth 170 after two months of daily play, was over 1,700).'
    ],
    ar: {
      title: 'تخفيف التحطيم: الحفر يحافظ على وتيرته',
      changes: [
        'تخفيف: لم يعد التحطيم (الكسر الزلزالي) يكسر المربع فوراً. أصبحت الضربة تُحدث ضرراً بقوة ×10 بدل تجاوز صلابة المربع، فقد كان يسمح للحفارين اليدويين بالنزول عبر الطبقات أسرع بكثير من المقصود.',
        'عمق التنقيب يتبع الآن منحناه المقصود للاعبين النشطين أيضاً (نحو عمق 170 بعد شهرين من اللعب اليومي بدل أكثر من 1,700).'
      ]
    }
  },
  {
    version: '5.17.0',
    date: '2026-10-08',
    title: 'Boss Kills Feel Like a Win',
    changes: [
      'Defeating a boss or Warden in the Void Tower is now a real moment: the portrait freezes for a split second and flashes, the card shakes, a deep thud and a short fanfare play, and "BOSS DOWN!" (or "WARDEN DOWN!") appears with the gold you won counting up.',
      'The gold from your last boss stays readable above the portrait until the next boss arrives.',
      'The enrage timer now stays calm until the last 10 seconds, then turns red and ticks softly once a second; in the last 3 seconds it grows a little.',
      'With Reduce Motion on there is no shake, flash or growing timer; the colours, callout and sounds stay.'
    ],
    ar: {
      title: 'هزيمة الزعيم تبدو كانتصار',
      changes: [
        'هزيمة زعيم أو حارس في برج الفراغ صارت لحظة حقيقية: تتجمد الصورة لجزء من الثانية وتومض، وتهتز البطاقة، وتُسمع ضربة عميقة ولحن قصير، ويظهر "سقط الزعيم!" (أو "سقط الحارس!") مع عدّ الذهب الذي ربحته.',
        'يبقى ذهب آخر زعيم ظاهراً فوق الصورة حتى يصل الزعيم التالي.',
        'مؤقت الغضب يبقى هادئاً حتى آخر 10 ثوانٍ، ثم يصبح أحمر ويدق بهدوء كل ثانية؛ وفي آخر 3 ثوانٍ يكبر قليلاً.',
        'عند تفعيل تقليل الحركة لا يوجد اهتزاز أو وميض أو تكبير للمؤقت؛ وتبقى الألوان والإعلان والأصوات.'
      ]
    }
  },
  {
    version: '5.16.1',
    date: '2026-10-08',
    title: 'Smooth Excavation Frenzy',
    changes: [
      'Excavation board stability: Removed the pulsing scale animation from the excavation grid during Frenzy mode. Rapid digging now keeps the board completely smooth and stationary with its golden glow intact, eliminating lag and jitter (reported by players).'
    ],
    ar: {
      title: 'تحسين سلاسة حفر الحماس',
      changes: [
        'استقرار لوحة التنقيب: إزالة حركة الاهتزاز والنبض التكبيري من شبكة الحفر أثناء وضع الحماس. أصبح الحفر السريع سلساً تماماً وثابتاً في مكانه مع الحفاظ على التوهج الذهبي، مما يقضي على البطء والتقطيع (بناءً على ملاحظات اللاعبين).'
      ]
    }
  },
  {
    version: '5.16.0',
    date: '2026-10-08',
    title: 'Comprehensive Visual Asset Overhaul',
    changes: [
      'Void Tower Gear Art: All 20 equipment tiers (weapons, armor, amulets, and relics across common, rare, epic, legendary, and cosmic) now display rich, full-color RPG item illustrations with rarity borders.',
      'Hero & Boss Portraits: The Astral Champion now has a custom starlight helmet portrait, and iconic dungeon bosses (Abu Sarwal, Rukbah Soda, Mutawa, Karak Addict) feature unique character art.',
      'Excavation Relics & Gems: Uncovered underground tiles now display custom vector assets for the Ancient Stairs, overflowing Gold Caches, and the 5 cultural gemstone relics (Fawanees, Dallah, Oud Wood, Misbaha, and Mabkhara).',
      'Alchemy & Grimoire Icons: The Alchemical Crucible cards now display custom brewed elixir flasks, and Grimoire spells feature glowing arcane runic sigils.',
      'Botanical Nexus & Anomaly: Plant plots now visually progress through distinct sprout and blooming stages before maturity, Garden Golems carry stone sentry badges, and the Golden Anomaly shines as an orbiting celestial star.'
    ],
    ar: {
      title: 'تحديث شامل للرسومات والأصول البصرية',
      changes: [
        'رسومات العتاد في برج الفراغ: تعرض الآن جميع درجات المعدات العشرين (الأسلحة والدروع والتمائم والآثار من الشائع إلى الكوني) رسومات ملونة بالكامل مع إطارات ندرة مميزة.',
        'صور البطل والزعماء: حصل بطل الأجرام السماوية على صورة شخصية ملحمية، وتتميز زعماء الأبراج (أبو سروال وفنيلة، ركبة صودا، المطوع، مدمن كرك) برسومات كرتونية ساخرة فريدة.',
        'كنوز الحفر والآثار: تكشف بلاطات التنقيب الآن عن رسومات متجهة للدرج القديم وكنوز الذهب والآثار الخمسة (الفوانيس، الدلة، خشب العود، المسبحة، والمبخرة).',
        'رموز الكيمياء والتعاويذ: بطاقات الخيمياء تعرض الآن قوارير الإكسير المتقنة، كما تضيء تعاويذ المخطوطة برموز سحرية متوهجة.',
        'الحديقة والظاهرة الكونية: تنمو النباتات الآن بصرياً عبر مراحل البرعم والإزهار، ويحمل غولم الحديقة شارة الحارس الحجري، وتتألق الظاهرة الكونية كجرم سماوي مداري.'
      ]
    }
  },
  {
    version: '5.15.0',
    date: '2026-10-08',
    title: 'Nectar Surge Rewards Your Own Hands',
    changes: [
      'The Nectar Surge Oil windfall (15 seconds of production per harvest) now pays only when you harvest a plot yourself. Golem harvests and harvests while you are away no longer pay it.',
      'This is a nerf for Golem and offline gardening: those harvests had been multiplying total Oil income by about 3x to 5x, far faster than the rest of the game is paced for. They still give essences and seeds as before.',
      'Harvesting by hand is unchanged.'
    ],
    ar: {
      title: 'دفعة الرحيق تكافئ يديك',
      changes: [
        'دفعة الزيت من الرحيق (١٥ ثانية من الإنتاج لكل حصاد) تُدفع الآن فقط عندما تحصد أنت النبتة بنفسك. حصاد الغولم والحصاد أثناء غيابك لم يعد يمنحها.',
        'هذا تخفيف للبستنة بالغولم وأثناء الغياب: كان هذا الحصاد يضاعف دخل الزيت الكلي من ٣ إلى ٥ أضعاف تقريبا، أسرع بكثير من وتيرة اللعبة. ما زال يعطي الجواهر والبذور كما كان.',
        'الحصاد باليد بلا تغيير.'
      ]
    }
  },
  {
    version: '5.14.0',
    date: '2026-10-08',
    title: 'A Steadier Climb up the Void Tower',
    changes: [
      'Gear now grows a little slower per Tower floor (x1.105 per floor, was x1.11), so the Tower climb keeps its intended pace: about 380 floors after a day, 510 after a week and 520 after a month of play with the game open, instead of racing past 700.',
      'This is a nerf to new gear drops. Gear you already own keeps its stats.',
      'Old saves may move down a floor band: if your Tower floor is higher than your gear can clear now, you restart at the highest floor it can. Your record floor is kept.'
    ],
    ar: {
      title: 'تسلق أكثر ثباتا في برج الفراغ',
      changes: [
        'ينمو العتاد الآن أبطأ قليلا مع كل طابق في البرج (×1.105 لكل طابق بدلا من ×1.11)، فيحافظ التسلق على وتيرته المقصودة: نحو 380 طابقا بعد يوم، و510 بعد أسبوع، و520 بعد شهر من اللعب والمتصفح مفتوح، بدلا من تجاوز 700.',
        'هذا تخفيف لعتاد الغنائم الجديد. العتاد الذي تملكه بالفعل يحتفظ بإحصاءاته.',
        'قد تنزل الحفظات القديمة طابقا أو أكثر: إذا كان طابقك في البرج أعلى مما يستطيع عتادك تجاوزه الآن، تبدأ من أعلى طابق يستطيع تجاوزه. يبقى رقمك القياسي محفوظا.'
      ]
    }
  },
  {
    version: '5.13.0',
    date: '2026-10-08',
    title: 'Garden Taps Share the Click Limit',
    changes: [
      'Tapping growing crops now counts toward the same 5 paid taps a second as the monolith. Faster taps still splash and sound, but grow nothing and pay nothing. This is a nerf: fast tapping through the Garden no longer multiplies your Oil.',
      'A Dewdrop now pays 0.25 s of production (was 1 s), and each tap grows the crop by 2% of its grow time (was 5%).',
      'Fixed a crash when tapping a crop while you produce no Oil yet (reported by players).'
    ],
    ar: {
      title: 'نقرات الحديقة تشارك حد النقرات',
      changes: [
        'النقر على المحاصيل النامية يُحتسب الآن ضمن حد 5 نقرات مدفوعة في الثانية نفسه مع المونوليث. تظل النقرات الأسرع تُصدر الرذاذ والصوت لكنها لا تُنمّي شيئاً ولا تمنح شيئاً. هذا تخفيف: النقر السريع في الحديقة لم يعد يضاعف نفطك.',
        'قطرة الندى تمنح الآن 0.25 ثانية من الإنتاج (كانت ثانية واحدة)، وكل نقرة تُنمّي المحصول بنسبة 2% من زمن نموه (كانت 5%).',
        'إصلاح انهيار عند النقر على محصول قبل أن تبدأ بإنتاج النفط.'
      ]
    }
  },
  {
    version: '5.12.2',
    date: '2026-10-08',
    title: 'Pickaxe Visual Upgrades & Electric Zap',
    changes: [
      'Visual Pickaxe Progression: Your pickaxe now evolves its appearance as you upgrade it through 6 custom vector tiers, from chipped rusty iron to forged steel, glowing mithril, dragon adamantite, and celestial void.',
      'Electric Chain Lightning: Arc Conduction strikes now discharge true branching electric bolts across hit blocks with glowing cyan auras, white-hot cores, and tile reaction flashes.'
    ],
    ar: {
      title: 'ترقيات مظهر الفأس وصاعقة البرق المتسلسلة',
      changes: [
        'مظهر متطور للفأس: يتغير مظهر الفأس الآن بصرياً عبر 6 مستويات متقنة، من الفأس الحديدي الصدئ إلى الفولاذ المطروق والميثريل المشع وصخر التنين حتى فراغ الأجرام السماوية.',
        'برق متسلسل متوهج: يُطلق توصيل الصدمات الآن صواعق كهربائية متفرعة حقيقية تقفز بين الكتل مع هالات متوهجة ونواة بيضاء ساطعة.'
      ]
    }
  },
  {
    version: '5.12.1',
    date: '2026-10-08',
    title: 'Tidier Floating Numbers',
    changes: [
      'Floating numbers no longer pile up: rapid taps on the Refinery add into one "+n" that grows a little instead of stacking dozens of numbers, and Auto-tap numbers do the same.',
      'Sparks and floating text now have a cap (250 sparks, 150 on phones, and 40 texts). When the screen is busy the oldest effects fade out faster, so your newest tap always shows. Phones also draw a bit fewer sparks per effect, which should help long sessions run cooler.',
      'Crit sounds have a short pause between them (a quarter of a second) so fast crit streaks no longer grate; taps in between still play the normal click.'
    ],
    ar: {
      title: 'أرقام عائمة أكثر ترتيباً',
      changes: [
        'لم تعد الأرقام العائمة تتكدّس: النقرات السريعة على المصفاة تُجمع في رقم "+n" واحد يكبر قليلاً بدلاً من عشرات الأرقام فوق بعضها، وكذلك أرقام النقر التلقائي.',
        'للشرارات والنصوص العائمة الآن حدّ أقصى (250 شرارة، و150 على الهواتف، و40 نصاً). عندما تزدحم الشاشة تتلاشى أقدم المؤثرات أسرع، فتظهر نقرتك الأحدث دائماً. كما ترسم الهواتف شرارات أقل قليلاً لكل مؤثر، مما يساعد على بقاء الجهاز أبرد في الجلسات الطويلة.',
        'صار بين أصوات الضربات الحرجة فاصل قصير (ربع ثانية) حتى لا تزعج السلاسل السريعة منها؛ والنقرات بينها ما زالت تُصدر صوت النقر العادي.'
      ]
    }
  },
  {
    version: '5.12.0',
    date: '2026-10-08',
    title: 'Excavation Overhaul: Techniques, Machinery & Explosives',
    changes: [
      'Visual overhaul: Excavation tiles now reflect the distinct rock strata of your depth with progressive fracture cracks as tile durability drops.',
      'Stone Workshop: Upgrade powerful techniques using Stone: Seismic Fracture (2% to 10% chance to obliterate a block in 1 hit), Arc Conduction (chain lightning hitting 2-4 nearby tiles), Quarry Cleave (hits side blocks for 50% damage), and Excavation Frenzy duration.',
      'Excavation Frenzy: Rapid manual digging chains (7 hits within 1.4s) trigger a fiery Frenzy that doubles digging power.',
      'Hidden Bombs: Subterranean explosive tiles now spawn in the rock strata. Detonating a bomb blasts a 3x3 radius and chains into neighboring bombs.',
      'Excavation Machinery: Deploy Steam Jackhammers that focus on the lowest-HP blocks and Seismic Pulverizers that periodically unleash row-clearing shockwaves.'
    ],
    ar: {
      title: 'تطوير شامل للحفر: تقنيات وآلات ومتفجرات',
      changes: [
        'تطوير بصري: مربعات الحفر تعكس الآن طبقات الصخور الخاصة بالعمق مع شقوق تصدع تدريجية مع انخفاض صلابة المربع.',
        'ورشة الأحجار: طوّر تقنيات قوية باستخدام الحجر: صدع زلزالي (فرصة 2% إلى 10% لتحطيم المربع بضربة واحدة)، وتوصيل القوس (برق متسلسل يصيب 2-4 مربعات مجاورة)، وشق المحجر (ضرب المربعات الجانبية بـ 50% ضرر)، وزيادة مدة جنون الحفر.',
        'جنون الحفر: الضربات السريعة المتتالية (7 ضربات خلال 1.4 ث) تُفعّل حالة جنون الحفر وتضاعف قوة الحفر.',
        'قنابل مخفية: قنابل متفجرة تحت الأرض تظهر في الشبكة؛ تفجير القنبلة يدمر مساحة 3×3 ويفجر القنابل المجاورة في سلسلة انفجارات.',
        'آلات الحفر: اشترِ مطارق بخارية تستهدف المربعات الأقل صلابة ومطاحن زلزالية تطلق موجات زلزالية تدمر صفوفًا كاملة بشكل دوري.'
      ]
    }
  },
  {
    version: '5.11.0',
    date: '2026-10-08',
    title: 'Registered Leaderboard & Nicknames',
    changes: [
      'The leaderboard now lists registered players only. Guest entries have been removed; create a free account (Settings) to join.',
      'Creating an account asks for a nickname: that is your name on the leaderboard. Change it any time in Settings, Account.',
      'Accounts without a nickname get a random funny one (like "Sneaky Potato 42") until you pick your own. Your email is never shown.',
      'The old "Save & Join" name box on the leaderboard is gone; if you had picked a name there, your account keeps using it.'
    ],
    ar: {
      title: 'لوحة متصدرين للمسجّلين وأسماء مستعارة',
      changes: [
        'لوحة المتصدرين تعرض الآن اللاعبين المسجّلين فقط. أُزيلت إدخالات الضيوف؛ أنشئ حسابًا مجانيًا من الإعدادات لتنضم.',
        'إنشاء حساب يطلب اسمًا مستعارًا: هو اسمك في لوحة المتصدرين. غيّره متى شئت من الإعدادات، الحساب.',
        'الحسابات بلا اسم مستعار تحصل على اسم طريف عشوائي (مثل "Sneaky Potato 42") حتى تختار اسمك. بريدك لا يظهر أبدًا.',
        'أُزيل مربع "حفظ وانضمام" القديم من لوحة المتصدرين؛ وإذا كنت قد اخترت اسمًا هناك فسيستمر حسابك في استخدامه.'
      ]
    }
  },
  {
    version: '5.10.2',
    date: '2026-10-08',
    title: 'Clearer Account Email Links',
    changes: [
      'Opening a confirmation or password-reset email now takes you to Settings and tells you what happened: "Email confirmed, you are signed in", or why the link did not work.',
      'An expired or already-used link now explains what to do next instead of failing silently.'
    ],
    ar: {
      title: 'روابط بريد الحساب أوضح',
      changes: [
        'فتح رسالة التأكيد أو إعادة تعيين كلمة المرور ينقلك الآن إلى الإعدادات ويخبرك بما حدث: "تم تأكيد بريدك وأنت مسجّل الدخول"، أو سبب عدم عمل الرابط.',
        'الرابط المنتهي أو المستخدم سابقًا يشرح الآن ما عليك فعله بدلًا من الفشل بصمت.'
      ]
    }
  },
  {
    version: '5.10.1',
    date: '2026-10-08',
    title: 'Quieter Drill Geodes',
    changes: [
      'Geode Pockets your drills find on their own now show a small notice instead of the full-screen jackpot celebration, so they no longer pop up over other tabs. Geodes you dig yourself still get the full celebration.'
    ],
    ar: {
      title: 'جيودات المثاقب أهدأ',
      changes: [
        'جيوب الجيود التي تكتشفها المثاقب وحدها تظهر الآن كإشعار صغير بدلاً من احتفال الجائزة الكبرى بملء الشاشة، فلا تظهر فوق التبويبات الأخرى. أما الجيود التي تحفرها بنفسك فما زالت تحظى بالاحتفال الكامل.'
      ]
    }
  },
  {
    version: '5.10.0',
    date: '2026-10-08',
    title: 'Combat Effect Tab Isolation & Interface Polish',
    changes: [
      'Combat text and particle effects now remain cleanly within the Void Tower arena instead of overflowing into Excavation or other tabs.',
      'Mana currency is now cleanly hidden from the header until the Grimoire is discovered and unlocked.',
      'Fixed Arabic unlock teaser progress fraction rendering so progress reads naturally from left to right.'
    ],
    ar: {
      title: 'عزل تأثيرات القتال وتحسينات الواجهة',
      changes: [
        'نصوص وأضرار القتال وتأثيراتها أصبحت محصورة ببرج الفراغ دون الظهور فوق تبويب التنقيب أو التبويبات الأخرى.',
        'تم إخفاء عملة المانا من الشريط العلوي حتى يتم اكتشاف وفتح كتاب التعاويذ.',
        'إصلاح اتجاه عرض كسور التقدم في مؤشرات الفتح باللغة العربية لتقرأ بشكل طبيعي.'
      ]
    }
  },
  {
    version: '5.9.0',
    date: '2026-10-08',
    title: 'Excavation Geode Jackpots, Dewdrop Tapping & Cross-Synergies',
    changes: [
      'Excavation Geode Pockets: unearth hidden jackpot tiles in the underground grid for x3 Gold cache value, 2 free precious gems, and an active Oil rush surge.',
      'Active Garden Dewdrop Tapping: tap growing crop plots to accelerate growth speed with sparks and splash Oil bursts.',
      'Geothermal Warmth & Botanical Rigging: digging deeper into Excavation now warms and speeds up Garden crop cycles, while plant harvests strengthen your pickaxe power.'
    ],
    ar: {
      title: 'جوائز الجيود الكبرى وندى الحدائق والتناغم التبادلي',
      changes: [
        'جيوب الجيود في التنقيب: اكشف عن كتل الجوائز الكبرى تحت الأرض للحصول على 3 أضعاف الذهب وحبتين ثمينتين واندفاعة نفطية نشطة.',
        'نقرات ندى الحديقة النشطة: انقر على الأحواض النامية لتسريع نمو المحاصيل مع تناثر شرارات وقطرات نفطية فورية.',
        'الدفء الجوفي وتجهيز النباتات: الحفر لأعماق أبعد في التنقيب يدفئ ويسرع دورات نمو المحاصيل، وحصاد النباتات يزيد من قوة ضربات الفأس.'
      ]
    }
  },
  {
    version: '5.8.0',
    date: '2026-10-08',
    title: 'Super-Crits, Mining Shockwaves & Subgame Scaling',
    changes: [
      'Critical strikes now cascade: roll into fiery Orange Super-Crits and Prismatic Hyper-Crits across Refinery clicks and Void Tower combat.',
      'Excavation strikes now feature critical hits and shockwaves: critical strikes deal bonus damage, and Super-Crits shatter adjacent blocks simultaneously.',
      'Hydraulic Bore & Subterranean Irrigation: your growing Oil empire now directly supercharges your pickaxe striking power and accelerates Garden crop growth.',
      'Harvesting mature garden crops now rewards an immediate Nectar Surge of active Oil on the spot.'
    ],
    ar: {
      title: 'الضربات الفائقة وموجات التعدين وتسريع الزراعة',
      changes: [
        'الضربات الحرجة أصبحت تتضاعف: احصل على ضربات فائقة نارية برتقالية وبنفسجية في التكرير وبرج الفراغ.',
        'ضربات الفأس في التنقيب أصبحت تشمل الضربات الحرجة وموجات الصدمة: الضربات الفائقة تكسر الكتل المجاورة في وقت واحد.',
        'الضغط الهيدروليكي والري الجوفي: ثروتك النفطية المتنامية تزيد مباشرة من قوة ضربات الفأس وتسرع نمو محاصيل الحديقة.',
        'حصاد المحاصيل الناضجة في الحديقة يمنحك الآن دفعة نفطية فورية من الرحيق.'
      ]
    }
  },
  {
    version: '5.7.0',
    date: '2026-10-08',
    title: 'Drill a New Well whenever you are ready',
    changes: [
      'The 10-minute minimum run restriction on drilling a New Well has been removed. You can now Ascend as soon as you have met the Oil requirement and earned pending Reserves, without waiting on a cooldown.',
      'Auto-Ascend rules and Coming Up estimates now reflect the change, allowing immediate drilling as soon as your criteria are met.'
    ],
    ar: {
      title: 'احفر بئرًا جديدة متى كنت مستعدًا',
      changes: [
        'تمت إزالة شرط الانتظار لمدة 10 دقائق لحفر بئر جديدة. يمكنك الآن الصعود فور استيفاء متطلبات النفط وكسب الاحتياطي، دون انتظار أي مؤقت.',
        'قواعد الصعود التلقائي وتوقعات لوحة القادم أصبحت تعكس هذا التغيير فورًا بمجرد تحقق الشروط.'
      ]
    }
  },
  {
    version: '5.6.0',
    date: '2026-10-08',
    title: 'Vote for bugs and ideas, no GitHub needed',
    changes: [
      'You no longer need a GitHub account to report a bug or suggest an idea: sign in with your game account (Settings → Account) and press Post in the Community tab.',
      'New Vote list in the Community tab: requests from players show up there right away. Like the ones you want (one like per player, not on your own). When a request has 2 likes it goes to the build queue on GitHub within a few hours, and its likes keep counting there.',
      'You can post 3 requests a day, delete your own while they are still in the Vote list, and report spam or abuse: 3 reports hide a request for everyone.',
      'The GitHub way still works for players who prefer it.'
    ]
  },
  {
    version: '5.5.0',
    date: '2026-10-08',
    title: 'Pick a build for each run',
    changes: [
      'New after your first New Well: Run Attunement, in the Ascension tab under the New Well button. Pick one of three for each run; you can change it until you buy your first generator, and it stays with you for every New Well after (Auto-Ascend keeps it too).',
      'Idle: +30% Oil production while you haven\'t tapped for 60 seconds. Auto-tap doesn\'t count as a tap, so it never interrupts the bonus. Everyone starts with Idle, including existing saves.',
      'Steady: generator upgrades are 30% stronger, +26% each instead of +20% (about +34% for a generator with all 6 upgrades).',
      'Focus: +15% Oil production for each side-tab goal you reach in the run (dig 25 and 100 blocks, beat 1 and 5 bosses, harvest 3 and 10 plants), up to +40%.',
      'Changed your mind after buying a generator? Pick another one anyway: it starts with your next New Well.'
    ],
    ar: {
      title: 'اختر أسلوبك لكل جولة',
      changes: [
        'جديد بعد بئرك الجديدة الأولى: تناغم الجولة، في تبويب الصعود تحت زر البئر الجديدة. اختر واحدًا من ثلاثة لكل جولة؛ يمكنك تغييره حتى تشتري أول مولّد، ثم يبقى معك في كل بئر جديدة بعدها (والصعود التلقائي يحتفظ به أيضًا).',
        'الهدوء: +30% من إنتاج النفط ما دمت لم تنقر منذ 60 ثانية. النقر التلقائي لا يُحسب نقرة، فلا يقطع المكافأة أبدًا. الجميع يبدأ بالهدوء، ومنهم أصحاب الحفظ الحالي.',
        'الثبات: ترقيات المولّدات أقوى بنسبة 30%، أي +26% لكل ترقية بدلًا من +20% (نحو +34% لمولّد يملك ترقياته الست كلها).',
        'التركيز: +15% من إنتاج النفط لكل هدف تبلغه في الألعاب الجانبية خلال الجولة (احفر 25 ثم 100 مربع، واهزم زعيمًا ثم 5 زعماء، واحصد 3 ثم 10 نباتات)، حتى +40%.',
        'غيّرت رأيك بعد شراء مولّد؟ اختر غيره على أي حال: يبدأ مع بئرك الجديدة التالية.'
      ]
    }
  },
  {
    version: '5.4.0',
    date: '2026-10-08',
    title: 'Challenge rewards and the Chapter of Salt',
    changes: [
      'Every Chronicle challenge now pays a permanent reward on its first clear, shown on its card: Dry Well +10% Oil, Lights Out +10% offline Oil, Small Souq starts every run with 10 Shawarma Stalls, Sandstorm +1 Page from every Chronicle. Rewards of the same kind add together, and the Oil ones add to Margin Notes rather than multiplying.',
      'Challenges you cleared before this update pay their rewards as soon as you load your save.',
      'The Chapter of Salt follows the Chapter of Sand: for ten weeks the dig hits twice as hard, with no Oil penalty. Its four new challenges stay open after it ends: Still Water (no Auto-tap, no spells; +25% Excavation power), Dark Flats (no spells, 8 generators; +10% Oil), Narrow Caravan (5 generators at half pay; +10% offline Oil) and Dead Sea (Oil ÷10, no Frenzy, no Auto-tap; +15% Oil). They also pay 4 to 6 Pages on the first clear.',
      'If your Chapter of Sand has already ended, the Chapter of Salt starts where it ended. Its stamp is a keepsake and pays no Pages.'
    ],
    ar: {
      title: 'مكافآت التحديات وفصل الملح',
      changes: [
        'صار كل تحدٍّ من تحديات السجل يمنح مكافأة دائمة عند إنجازه أول مرة، وتظهر على بطاقته: البئر الجافة +10% نفط، وانطفاء الأنوار +10% من نفط الغياب، والسوق الصغير يبدأ كل جولة بـ 10 من أكشاك الشاورما، والعاصفة الرملية +1 صفحة من كل سجل. المكافآت من النوع نفسه تُجمع، ومكافآت النفط تُضاف إلى ملاحظات الهامش بدل أن تتضاعف.',
        'التحديات التي أنجزتها قبل هذا التحديث تمنح مكافآتها بمجرد تحميل حفظك.',
        'فصل الملح يأتي بعد فصل الرمل: لعشرة أسابيع يضرب الحفر بضعف القوة، دون أي خصم من النفط. وتبقى تحدياته الأربعة الجديدة مفتوحة بعد انتهائه: الماء الراكد (لا نقر تلقائي ولا تعاويذ؛ +25% من قوة التنقيب)، والسباخ المظلمة (لا تعاويذ، 8 مولّدات؛ +10% نفط)، والقافلة الضيقة (5 مولّدات بنصف العائد؛ +10% من نفط الغياب)، والبحر الميت (النفط ÷10، ولا هيجان، ولا نقر تلقائي؛ +15% نفط). وتمنح أيضًا من 4 إلى 6 صفحات عند أول إنجاز.',
        'إذا كان فصل الرمل قد انتهى عندك، يبدأ فصل الملح من حيث انتهى. ختمه تذكار ولا يمنح صفحات.'
      ]
    }
  },
  {
    version: '5.3.0',
    date: '2026-10-08',
    title: 'Your generators do the work',
    changes: [
      'Clicking is weaker now, on purpose: your generators drive progress and tapping is a small extra. Each tap pays half a second of your current production (at least 1 Oil), instead of a flat amount plus 3% of production.',
      'The 15 click upgrades are gone. If you bought any, their Oil has been refunded to you.',
      'Only 5 taps a second pay. Faster tapping still sparkles, but pays nothing extra.',
      'New in the Reserve Shop: Auto-tap (5 Reserves, after your first New Well). It taps the Refinery once a second whenever you aren\'t tapping, and keeps going while you\'re away: +50% Oil on top of your generators.',
      'Your first New Well comes much sooner: it now pays from 500 Oil in a run (was 10,000), and 500 Oil pays 5 Reserves, just enough for Auto-tap. Bigger runs pay the same as before.',
      'Each generator now has 6 upgrades (was 5), at 1, 3, 8, 15, 30 and 60 owned (was 1, 5, 15, 30 and 60), and they are cheaper: each costs 3× the one before it (was 4×), starting at 3× the generator\'s base price. With the click upgrades gone, a run still offers about as many upgrades as before.',
      'Active play is toned down so idle play keeps up. Playing actively now earns about twice what an idle player with Auto-tap earns (was about 7×). The combo still builds and triggers Frenzy, but no longer multiplies taps (was up to ×5). Frenzy is +25% tap yield (was ×3). Oil Burst pays 10 s of production every 60 s (was 45 s every 45 s). Celestial Alignment is +25% (was +150%). Chrono Warp can be cast every 10 min (was every minute). Supernova pays 30 s of production (was 3 min). Mirage is ×1.5 Oil and gold (was ×2).',
      'Chronicle challenge Dry Well: Frenzy still never starts, and Auto-tap now rests instead of the old combo cap.'
    ],
    ar: {
      title: 'مولّداتك تقوم بالعمل',
      changes: [
        'النقر أضعف الآن عن قصد: مولّداتك هي ما يدفع تقدّمك، والنقر إضافة صغيرة. كل نقرة تدفع نصف ثانية من إنتاجك الحالي (نفط واحد على الأقل)، بدلًا من مقدار ثابت مع 3% من الإنتاج.',
        'أُزيلت ترقيات النقر الخمس عشرة. إن كنت اشتريت شيئًا منها فقد أُعيد إليك نفطها.',
        'خمس نقرات فقط في الثانية تُحتسب. النقر الأسرع ما زال يلمع، لكنه لا يدفع شيئًا إضافيًا.',
        'جديد في متجر الاحتياطي: النقر التلقائي (5 احتياطي، بعد بئرك الجديدة الأولى). ينقر المصفاة مرة كل ثانية حين لا تنقر أنت، ويستمر وأنت غائب: +50% نفط فوق مولّداتك.',
        'بئرك الجديدة الأولى تأتي أبكر بكثير: صارت تدفع ابتداءً من 500 نفط في الجولة (كانت 10,000)، و500 نفط تدفع 5 احتياطي، وهي بالضبط ثمن النقر التلقائي. الجولات الأكبر تدفع كما كانت.',
        'لكل مولّد الآن 6 ترقيات (كانت 5)، عند امتلاك 1 و3 و8 و15 و30 و60 (كانت 1 و5 و15 و30 و60)، وهي أرخص: كل ترقية تكلّف 3× التي قبلها (كانت 4×)، بدءًا من 3× السعر الأساسي للمولّد. ومع إزالة ترقيات النقر، ما زالت الجولة تقدّم عددًا من الترقيات قريبًا مما كان.',
        'خُفّف اللعب النشط حتى يواكبه اللعب الخامل. اللعب النشط يكسب الآن نحو ضعف ما يكسبه لاعب خامل يملك النقر التلقائي (كان نحو 7×). الكومبو ما زال يتراكم ويُطلق الهيجان، لكنه لم يعد يضاعف النقرات (كان حتى ×5). الهيجان +25% من عائد النقر (كان ×3). انفجار النفط يدفع 10 ث من الإنتاج كل 60 ث (كان 45 ث كل 45 ث). الاصطفاف السماوي +25% (كان +150%). طيّ الزمن يُلقى كل 10 دقائق (كان كل دقيقة). المستعر الأعظم يدفع 30 ث من الإنتاج (كان 3 دقائق). السراب ×1.5 نفط وذهب (كان ×2).',
        'تحدي الملحمة «البئر الجافة»: الهيجان ما زال لا يبدأ، والنقر التلقائي يستريح الآن بدلًا من حدّ الكومبو القديم.'
      ]
    }
  },
  {
    version: '5.2.0',
    date: '2026-10-08',
    title: 'Everything else, sized for the new numbers',
    changes: [
      'Oil achievements can be earned again. The eight Oil ladder goals asked for 1e18 to 1e72 Oil in one run, which the new economy never reaches. They now sit at 100,000, 10 million, 100 million, 10 billion, 100 billion, 1e13, 1e14 and 1e16 (with new names), so together with the four original ones there is one Oil goal for every ×10 from 100,000 to 1e16. Achievements you already earned stay earned.',
      'The Oil Forge costs 100 Oil for its first level and ×1.5 more for each level after (was 100,000 and ×5), so the hero keeps getting stronger with today\'s Oil. Forge levels you already have are kept.',
      'Bonuses from other tabs to Oil production now add together instead of multiplying, and all of them together give at most +150%. Each one is smaller to match: Depth Resonance +0.2% per max depth (was +2%), Aetheric Treaty +2% per rank (was +25%), High Enchanter +0.4% per level (was +5%), Philosopher\'s Catalyst +0.2% each (was +2%). Building and Dungeon Mastery are unchanged. This is a nerf: on the new scale these bonuses multiplied to over ×100 and pushed Oil far past the pace the economy is built for. The Oil/s tooltip shows the total.',
      'Bonuses to Crude Reserves from the Dig and the Garden also add together now: Geode Attunement gives +2% per 10 max depth (was +10%) and Honey Offering up to +20% (was up to ×2, same Honey needed for the maximum). Reserve Amplifier is unchanged. This is also a nerf: Reserves grow slowly with Oil now, so a small Reserve bonus is worth a lot of Oil.'
    ],
    ar: {
      title: 'كل ما تبقّى بمقاس الأرقام الجديدة',
      changes: [
        'صار بالإمكان نيل إنجازات النفط من جديد. كانت أهداف سلّم النفط الثمانية تطلب من 1e18 إلى 1e72 نفط في جولة واحدة، ولا يبلغها الاقتصاد الجديد أبدًا. صارت الآن عند 100,000 و10 ملايين و100 مليون و10 مليارات و100 مليار و1e13 و1e14 و1e16 (بأسماء جديدة)، فمع الإنجازات الأربعة الأصلية هناك هدف نفط لكل ×10 من 100,000 إلى 1e16. الإنجازات التي نلتها تبقى لك.',
        'مستوى فرن النفط الأول يكلّف 100 نفط، وكل مستوى بعده ×1.5 أكثر (كان 100,000 و×5)، فيستمر البطل في التقوّي بنفط اليوم. مستويات الفرن التي لديك تبقى.',
        'مكافآت إنتاج النفط القادمة من التبويبات الأخرى تُجمع الآن بدل أن تتضاعف، ومجموعها كلها +150% على الأكثر. وصغُرت كل واحدة لتناسب ذلك: رنين العمق +0.2% لكل مستوى من أقصى عمق (كان +2%)، ومعاهدة النفط +2% لكل رتبة (كانت +25%)، وكبير السحرة +0.4% لكل مستوى (كان +5%)، ومحفّز الحكيم +0.2% لكل محفّز (كان +2%). إتقان المباني وإتقان الزنزانة دون تغيير. هذا إضعاف: على المقياس الجديد كانت هذه المكافآت تتضاعف إلى أكثر من ×100 وتدفع النفط أسرع بكثير مما بُني عليه الاقتصاد. تلميح النفط/ث يعرض المجموع.',
        'مكافآت الاحتياطي الخام من الحفر والحديقة تُجمع الآن أيضًا: تناغم الجيود يعطي +2% لكل 10 مستويات من أقصى عمق (كان +10%)، وقربان العسل حتى +20% (كان حتى ×2، والعسل اللازم للحد الأقصى نفسه). مضخّم الاحتياطي دون تغيير. وهذا إضعاف أيضًا: الاحتياطي ينمو ببطء مع النفط الآن، فمكافأة صغيرة عليه تساوي الكثير من النفط.'
      ]
    }
  },
  {
    version: '5.1.0',
    date: '2026-10-08',
    title: 'Coming up',
    changes: [
      'New "Coming up" panel: tap the goal chip in the header (or the Coming up button under the Refinery on phones and tablets) to see your next 5 unlocks: the next generator, new tabs, Reserve Shop tiers, your next New Field and the generator it opens, Share Tree nodes, Seals and the Chronicle.',
      'Each shows how close you are and, where your income allows a guess, roughly when it lands ("~2 h", "~3 days"). The times are only a guide at your current pace: nothing expires and nothing is lost if you take longer. Tap a row to go to its tab.'
    ],
    ar: {
      title: 'القادم',
      changes: [
        'لوحة جديدة "القادم": اضغط شارة الهدف في الأعلى (أو زر القادم تحت المصفاة على الهاتف والجهاز اللوحي) لترى أقرب 5 أشياء ستُفتح لك: المولّد التالي، والتبويبات الجديدة، وفئات متجر الاحتياطي، وحقلك الجديد التالي والمولّد الذي يفتحه، وعُقد شجرة الأسهم، والأختام، والملحمة.',
        'يُظهر كل منها مدى قربك منه، ومتى سيصل تقريبًا حين يسمح دخلك بالتقدير ("نحو ساعتين"، "نحو 3 أيام"). الأوقات مجرد دليل بحسب وتيرتك الحالية: لا شيء ينتهي ولا تخسر شيئًا إن تأخرت. اضغط أي سطر لتنتقل إلى تبويبه.'
      ]
    }
  },
  {
    version: '5.0.0',
    date: '2026-10-08',
    title: 'Smaller numbers, steadier growth',
    changes: [
      'The whole Oil economy has been rescaled. Numbers used to explode into the dozens of digits within weeks, so a new building or upgrade barely mattered. Now they grow slowly: about a trillion Oil after two months and the low quadrillions after a year, so every purchase is something you notice.',
      'Your progress is kept. Your New Well, New Field and Chronicle counts, Field Shares, Pages, Reserve Shop features, talents and everything outside the Refinery stay. Your current run is refunded: generators and upgrades go back to 0 and the run\'s Oil comes back on the new scale to rebuy them. Your Crude Reserves keep the same place on the way to your next New Field.',
      'Generators: 8 tiers are open at the start (was 14) and each New Field opens one more, up to 20 (was 30). Each tier costs 10× the one below and makes 4× as much. The top 10 generators of the old ladder are retired. Milestone bonuses are ×2 at 10, 25, 50, 100, 150, 200, 250 and 300 owned.',
      'Prestige bonuses now add up instead of multiplying: +1% production per Crude Reserve (was +2%), +25% per Field Share (was ×1.5 each, and Shares no longer raise Reserve gain) and +20% per Chronicle Page (was ×1.4 each).',
      'Drilling a New Well pays from 10,000 Oil in a run: 10 Reserves, doubling for every 32× more Oil. Your first New Field needs 400 lifetime Reserves, then ×1.6 more each time (×3 per step from the 9th Field on).',
      'Generator upgrades open sooner (at 1, 5, 15, 30 and 60 owned) and cost less, so they keep landing every run. Reserve Shop prices are lower to match the new Reserve amounts; Reserve Amplifier ranks are refunded so you can rebuy them at the new price.',
      'Auto-Well has a new ×1.25 rule and it is the default (saves on the old ×2 default move to it); the Reserve rules now wait for a run of at least 30 minutes. A Chronicle opens after 6 New Fields (8 for your first one without Seal set I), and challenge goals are rescaled.',
      'Talent stars for a record New Well now come at every doubling of your best single New Well (from 16 Reserves). The Stars Seal asks for 500 Reserves in one New Well.'
    ],
    ar: {
      title: 'أرقام أصغر ونمو أثبت',
      changes: [
        'أُعيد ضبط اقتصاد النفط كله. كانت الأرقام تنفجر إلى عشرات الخانات خلال أسابيع، فلا يكاد يُلاحظ مبنى جديد أو ترقية. الآن تنمو ببطء: نحو ترليون نفط بعد شهرين وبضعة كوادريليونات بعد سنة، فتشعر بكل شراء.',
        'تقدّمك محفوظ. عدد الآبار الجديدة والحقول الجديدة والملاحم، وأسهم الحقل، والصفحات، وميزات متجر الاحتياطي، والمواهب، وكل ما خارج المصفاة يبقى. جولتك الحالية تُسترد: تعود المولّدات والترقيات إلى 0 ويعود نفط الجولة على المقياس الجديد لتشتريها من جديد. ويبقى احتياطيك الخام في المكان نفسه على الطريق إلى حقلك الجديد التالي.',
        'المولّدات: 8 فئات مفتوحة في البداية (كانت 14) وكل حقل جديد يفتح فئة أخرى حتى 20 (كانت 30). كل فئة تكلّف 10× التي تحتها وتنتج 4× أكثر. أُحيلت أعلى 10 مولّدات من السلّم القديم إلى التقاعد. مكافآت المعالم ×2 عند امتلاك 10 و25 و50 و100 و150 و200 و250 و300.',
        'مكافآت الهيبة تُجمع الآن بدل أن تتضاعف: +1% إنتاج لكل وحدة احتياطي خام (كانت +2%)، و+25% لكل سهم حقل (كان ×1.5 لكل سهم، ولم تعد الأسهم تزيد كسب الاحتياطي)، و+20% لكل صفحة ملحمة (كانت ×1.4 لكل صفحة).',
        'حفر بئر جديدة يدفع ابتداءً من 10,000 نفط في الجولة: 10 احتياطي، تتضاعف مع كل 32× نفطًا أكثر. أول حقل جديد يحتاج 400 احتياطي إجمالًا، ثم ×1.6 أكثر كل مرة (×3 لكل خطوة ابتداءً من الحقل التاسع).',
        'ترقيات المولّدات تُفتح أبكر (عند امتلاك 1 و5 و15 و30 و60) وتكلّف أقل، فتصل في كل جولة. أسعار متجر الاحتياطي أقل لتناسب كميات الاحتياطي الجديدة، ورُدّت رتب مضخّم الاحتياطي لتشتريها بالسعر الجديد.',
        'للحفر التلقائي قاعدة جديدة ×1.25 وهي الافتراضية (الحفظ على الافتراضية القديمة ×2 ينتقل إليها)، وقواعد الاحتياطي تنتظر الآن جولة من 30 دقيقة على الأقل. تُفتح الملحمة بعد 6 حقول جديدة (8 لأولى ملاحمك دون مجموعة الأختام الأولى)، وأُعيد ضبط أهداف التحديات.',
        'نجوم المواهب للبئر القياسية تأتي الآن مع كل تضاعف لأفضل بئر واحدة لك (ابتداءً من 16 احتياطي). وختم النجوم يطلب 500 احتياطي في بئر جديدة واحدة.'
      ]
    }
  },
  {
    version: '4.15.0',
    date: '2026-10-07',
    title: 'Community news',
    changes: [
      'The news strip now carries headlines from other players: the newest ones from the past week, marked 📣 and signed with the player\'s name. You see them without an account.',
      'Signed in? Share any of your own headlines with every player from Settings → News (the new Share button). You can share up to 3 headlines a day, and pick the name shown with them; it does not put you on the leaderboard.',
      'Delete your shared headlines any time. See one that breaks the rules? Tap Report: you won\'t see it again, and a headline reported by 3 players is hidden for everyone until it is reviewed.',
      'Don\'t want other players\' headlines? Untick "Show headlines from other players" in Settings → News. Your own entries stay in your browser until you share them.'
    ],
    ar: {
      title: 'أخبار المجتمع',
      changes: [
        'شريط الأخبار يحمل الآن أخبار اللاعبين الآخرين: أحدثها خلال الأسبوع الماضي، بعلامة 📣 واسم صاحبها. تراها دون حساب.',
        'سجّلت الدخول؟ شارك أيًّا من أخبارك مع كل اللاعبين من الإعدادات ← الأخبار (زر «شارك» الجديد). يمكنك مشاركة 3 أخبار في اليوم، واختيار الاسم الظاهر معها؛ ولا يضعك ذلك في لوحة المتصدرين.',
        'احذف أخبارك المشتركة متى شئت. رأيت خبرًا مخالفًا؟ اضغط «أبلغ»: لن تراه مجددًا، والخبر الذي يبلّغ عنه 3 لاعبين يُخفى عن الجميع حتى يُراجَع.',
        'لا تريد أخبار اللاعبين الآخرين؟ ألغِ «أظهر أخبار اللاعبين الآخرين» في الإعدادات ← الأخبار. وتبقى أخبارك في متصفحك حتى تشاركها.'
      ]
    }
  },
  {
    version: '4.14.0',
    date: '2026-10-07',
    title: 'Arabic version',
    changes: [
      'The game can now be played in Arabic. Pick English or العربية under Language at the top of Settings; the game saves and reloads once in the new language.',
      'In Arabic the whole layout reads right to left, with an Arabic font a little larger than the English one. Numbers stay in the usual digits and read left to right (1.5M, x3, +12%).',
      'On your first visit the game starts in Arabic if your browser asks for Arabic, and in English otherwise. Your choice is saved with your settings; existing saves keep English.',
      'Older changelog entries on this tab stay in English.'
    ],
    ar: {
      title: 'النسخة العربية',
      changes: [
        'يمكنك الآن اللعب بالعربية. اختر English أو العربية من «اللغة» أعلى الإعدادات؛ تُحفظ اللعبة وتُعاد مرة واحدة باللغة الجديدة.',
        'بالعربية تُقرأ الواجهة كلها من اليمين إلى اليسار، بخط عربي أكبر قليلًا من الإنجليزي. وتبقى الأرقام بالأرقام المعتادة وتُقرأ من اليسار إلى اليمين (1.5M و×3 و+12%).',
        'في أول زيارة تبدأ اللعبة بالعربية إذا كان متصفحك يطلب العربية، وبالإنجليزية فيما عدا ذلك. ويُحفظ اختيارك مع إعداداتك؛ والحفظ القديم يبقى بالإنجليزية.',
        'إدخالات سجل التحديثات الأقدم في هذا التبويب تبقى بالإنجليزية.'
      ]
    }
  },
  {
    version: '4.13.0',
    date: '2026-10-07',
    title: 'News strip',
    changes: [
      'A thin news strip now runs under the header: game tips, flavour headlines from the realm and what is new in this version.',
      'Write your own headlines in Settings → News (up to 120 characters, up to 20 entries) and delete them there any time. They show up in the strip between the built-in news. For now they stay in your browser; other players do not see them.',
      'English headlines scroll right to left; Arabic headlines scroll left to right, so each reads naturally.',
      'Hover over the strip or tap it to pause it. With Reduce Motion on, the strip stands still and shows the next headline every 6 seconds.',
      'Don\'t want it? Untick "Show the news strip" in Settings → News.'
    ]
  },
  {
    version: '4.12.0',
    date: '2026-10-07',
    title: 'Oil re-theme: the Refinery, New Wells and New Fields',
    changes: [
      'The clicker is now an Oil Refinery: tap it to pump Oil, which replaces Aether as the main currency. The first tab is called Refinery.',
      'The first prestige is now called Drill a New Well (was Ascend), and it pays Crude Reserves (was Cosmic Dust). They are spent in the Reserve Shop (was the Dust Shop), and Auto-Ascend is now Auto-Well.',
      'The second prestige is now called Open a New Oil Field (was Transcend), and it pays Field Shares (was Fracture Shards), spent in the Share Tree (was the Shard Tree). The Seals of Transcendence are now Field Seals.',
      'A few other names follow the theme: the Oil Forge in the Void Tower, the Oil Burst spell and Oil Shale in Excavation and the Bazaar.',
      'Only the names changed. Your save, numbers, bonuses, costs and progress are exactly as they were.'
    ]
  },
  {
    version: '4.11.0',
    date: '2026-10-07',
    title: 'Themes: Night, Sand and Desert Dusk',
    changes: [
      'New Theme setting at the top of Settings, with three themes for the whole game: Night (the original dark emerald look, still the default), Sand (a light, warm parchment theme with deep brown text and gold; not plain white) and Desert Dusk (dark plum with an orange glow).',
      'Your choice is saved with your settings and stays after a reload. Existing saves start on Night, so nothing changes until you pick another theme.',
      'Every theme keeps the same meaning for each colour (gold is still "you can buy this", pink is still shards), and all text meets the same readability standard in each one. Toasts, floating numbers and click sparks follow the theme too.'
    ]
  },
  {
    version: '4.10.0',
    date: '2026-10-07',
    title: 'Excavation: deeper digging and Auto-Blast',
    changes: [
      'Pickaxe upgrades are much cheaper the further you go: each level now costs ×1.6 the last (was ×2.5). The first upgrade is 160 stone (was 125), level 5 is about 1,000 (was about 4,900) and level 10 about 11,000 (was 4.8 million). Digging no longer stalls in the Voidstone strata: a player with two sessions a day reaches about depth 100 in the first week and the last stratum, Abyssal Heart, in about five to six weeks (it used to take months).',
      'Existing saves keep their depth and pickaxe; only the next upgrades get cheaper, so you will speed up right away.',
      'New Shard Tree node, Auto-Blast (Chronos, 1 shard): Excavation throws its dynamite for you whenever it is ready. Switch it on or off under the Excavation shop. It works while the game is open (also in a background tab and during Fast Forward), like the drills; Excavation does not dig while the game is closed.'
    ]
  },
  {
    version: '4.9.0',
    date: '2026-10-07',
    title: 'Gear levels',
    changes: [
      'Your Void Tower gear can now be levelled up. Under Hero Equipment, spend Monster Bones to raise each item from +0 up to +30. Every level adds +4% to that item\'s main stat (Attack, HP, Crit or Drain), so +30 is +120%.',
      'A level costs 10 Monster Bones at +0, then 10 more for each step (20, 30, ...). Getting one item to +30 takes 4,650 bones.',
      'Levels stay with the slot: when a better drop replaces your weapon, the new one keeps your +level. Nothing is ever lost by upgrading.',
      'Crit (50%) and Drain (30%) keep their caps. An item already at the cap can\'t be levelled, so bones are never wasted.',
      'Old saves start every item at +0, and Monster Bones you have saved up can be spent right away.'
    ]
  },
  {
    version: '4.8.0',
    date: '2026-10-07',
    title: 'Community: bugs and ideas',
    changes: [
      'New tab: Community (in the Records group, or under More on phones). See the bugs players have reported and the ideas they have suggested, with how many 👍 each has.',
      'Bugs are always fixed first, most 👍 first; after that, the ideas with the most 👍 are built next. The Done list shows what has shipped and in which version.',
      'Report a bug or suggest an idea right from the game: fill in a title and a few words, and GitHub opens with everything filled in, including your game version (and your browser, for bugs). Posting and voting with 👍 need a free GitHub account.',
      'The tab is open from the start, and the game only contacts GitHub when you open it (the list refreshes at most every 10 minutes).'
    ]
  },
  {
    version: '4.7.0',
    date: '2026-10-06',
    title: 'Bigger text, a Falafel that fits your screen',
    changes: [
      'Text is bigger everywhere: about 6% on phones and up to 15% on laptop and desktop screens. Numbers, buttons and labels all grew together, and the tiniest badges (8 to 10 px before) are now about 12 px.',
      'The Cosmic Falafel now grows with your window, up to almost twice its old size on a big monitor, and stays in view while you scroll the generator list.',
      'Tabs use more of a wide screen (up to 1440 px, was 1100 px), so there are no big empty bands at the sides. On very wide screens the generators sit in two columns.',
      'Bazaar on phones: the Buy and Sell buttons now sit in one full-width row under each good instead of a squashed column, and are easier to tap.'
    ]
  },
  {
    version: '4.6.1',
    date: '2026-10-06',
    title: 'Names cleanup',
    changes: [
      'Every tab now uses the same item names. Old names that were still showing are gone: Excavation tiles, Alchemy and hybrid recipe costs, the Garden guide and the Ancient Vein reward now say Fanoos, Dallah, Oud Wood, Misbaha and Mabkhara, and Golems cost Stone + Lemon Drops (the same item that used to say "Mana Sap").',
      'The "Gem Hoarder" achievement now reads "Possess at least 1 Fanoos, Dallah, and Oud Wood". It checks the same items as before.',
      'The Nectar Offering on the Ascend screen is now the Honey Offering and counts your Sidr Honey. Same bonus, same rules.',
      'The "Mutawa" Void Tower boss is gone; that boss is now the Saher Camera. Nothing else about the fight changes.'
    ]
  },
  {
    version: '4.6.0',
    date: '2026-10-06',
    title: 'Accounts and cloud save',
    changes: [
      'New in Settings: Account & Cloud Save. Sign in with Google or with an email and password to keep your progress in the cloud and continue on another device or browser. Forgot your password? A reset link comes by email.',
      'Accounts are optional. Without one the game saves in this browser exactly as before.',
      'While signed in, your game saves to the cloud every 3 minutes, when you press Save Game and when you leave the page. Signing in on a new device loads your cloud save.',
      'Your progress is never overwritten without asking: if this device and the cloud have different progress, you choose "Keep this device" or "Keep cloud", with each save\'s time, Ascensions, Transcends, floor and depth side by side.',
      'Your leaderboard entry now belongs to your account, so it follows you to every device. Your old guest entry for this season is replaced by it, so you are only listed once.'
    ]
  },
  {
    version: '4.5.0',
    date: '2026-10-06',
    title: 'Weekly Ledger goals are a real week',
    changes: [
      'Weekly Ledger goals are harder now: they could often be finished in one sitting, which made them feel like dailies. Each goal now asks for about 4.5 of your usual days of progress, so a week takes a few visits but still leaves 2 to 3 days of slack.',
      'Goals are sized to your own pace: the game remembers how much you did of each thing (bosses, blocks, harvests, clicks...) on your last 7 days played and uses a typical day, so the Ledger keeps up as you grow. A single big or idle day barely moves it, and days you do not play are not counted.',
      'Until it has seen 3 of your days, a goal uses a starting target (for example Slay 200 Tower fiends, was 60). No goal is ever easier than before.',
      'Each Ledger goal now pays 10 Guild Seals (was 6), 30 for the full week.',
      'This week\'s goals keep their old targets and old 6-Seal reward until the Ledger rotates on Monday. Missing a week still loses nothing.'
    ]
  },
  {
    version: '4.4.0',
    date: '2026-10-06',
    title: 'Frenzy every 20 clicks',
    changes: [
      'Your click combo now reaches its full x5 boost after 20 clicks (was 50).',
      'Every 20 clicks in a row (20, 40, 60, ...) sets off a Frenzy. When a Frenzy ends your combo keeps going instead of dropping back to 0, so you never have to rebuild 100 clicks again. Only pausing for 2 seconds drains the combo.',
      'Frenzy is shorter and gentler so it can come much more often: x3 click yield for 4 s (was x5 and rapid auto-clicks for 15 s). Reaching the next 20 while a Frenzy is running adds 4 s, up to 30 s. Overall, attentive play earns about the same as before; pure clicking without spells earns a little less, and a Time Flux anomaly is now 25 s of the new x3 Frenzy.',
      'The combo bar fills over the first 20 clicks, then shows your progress to the next Frenzy, with a "Frenzy in N" counter.'
    ]
  },
  {
    version: '4.3.0',
    date: '2026-10-06',
    title: 'Friendlier big numbers',
    changes: [
      'New default number notation, Letters: 1.50K, 2.30M, 4.00B, 7.25T, then aa, ab, ac… after trillion (1.00aa is 1,000 T, 1.00ab is 1,000 aa, and so on). After zz comes aaa, so it never runs out.',
      'If you were on Scientific (the old default), your game now uses Letters. Prefer 1.5e16? Switch back in Settings with one tap. Players who picked Standard or Engineering keep their choice.',
      'The old Standard option (Qa, Qi, Sx…) is still in Settings, now called Named, along with Scientific and Engineering.'
    ]
  },
  {
    version: '4.2.2',
    date: '2026-10-06',
    title: 'Dallah, Codex, Leaderboard and Settings open again',
    changes: [
      'The Dallah, Codex, Leaderboard and Settings tabs showed an empty page unless the Chronicle tab was open. They now open normally.'
    ]
  },
  {
    version: '4.2.1',
    date: '2026-10-06',
    title: 'Dynamite blasts land on the grid',
    changes: [
      'The Excavation 3x3 blast now shows its sparks and rewards on the tiles it actually hit, instead of in the middle of the screen. Blasted tiles flash orange so you can see the 3x3 area.',
      'Blasts near an edge or corner only hit the tiles that are on the grid (4 at a corner, 6 along an edge), as before; only the effects were in the wrong place.',
      'Void Cataclysm also shows its mining effects on the tiles it hits while the Excavation grid is on screen.'
    ]
  },
  {
    version: '4.2.0',
    date: '2026-10-06',
    title: 'Tabs open as you play',
    changes: [
      'A new game starts with just the Falafel. Each other tab opens when you reach its goal, with a gold "NEW" toast and a NEW tag on the tab until you visit it: Codex at 3 achievements, Void Tower at 10 Shawarma Stalls, Excavation after the floor-20 boss, Grimoire after the floor-40 boss, Bounties at depth 10, Garden at depth 15, Alchemy once you can brew a recipe, Ascension once it pays Cosmic Dust (1e9 Aether in one run), Constellations, Leaderboard and the Dallah at your first Ascension, the Bazaar at Ascension 2 and floor 150, and the Chronicle at your first Transcend.',
      'The next tab to open shows in the menu as a locked "???" with its goal and a progress bar, so you always know what is coming. On phones the bottom bar keeps its places with dimmed "Soon" slots.',
      'Some tabs bring a starter gift when they open: 30 stone for Excavation, a full mana bar for the Grimoire and 2 Mint seeds for the Garden.',
      'The Void Tower hero starts climbing when the Tower opens (not before), and the Quick Cast bar appears with the Grimoire.',
      'Contracts and Weekly Ledger goals only ask for things in tabs you have open.',
      'Existing saves keep every tab they have used: if you have Ascended, Transcended or begun a Chronicle, everything stays open; otherwise every tab you played in (or already earned) stays open, with no NEW tags. Settings and About are always open.'
    ]
  },
  {
    version: '4.1.1',
    date: '2026-10-06',
    title: 'Notices no longer hide your buffs',
    changes: [
      'Reward notices now appear below the buff bar instead of on top of it, so you can always see your buff and spell timers. With no buffs running, notices sit where they did before.',
      'On phones the notices stop above the buff bar at the bottom of the screen. On very short screens, a notice that does not fit fades out at the edge instead of covering the bar.'
    ]
  },
  {
    version: '4.1.0',
    date: '2026-10-06',
    title: 'The Dust Shop',
    changes: [
      'Ascension perks are gone. In their place, the Ascension tab has a Dust Shop that sells new features instead of bigger numbers. New shelves open at Ascension 1, 3, 5, 10 and 20, so there is something new to buy as you keep Ascending.',
      'New features: Blueprint Memory (keep the first 2 upgrades of every generator when you Ascend), Auto-Buy (buys the best-value generator every 10 s; switch it on or off above the generator list), Finger of Wasta (+1% production per 100 clicks this run, up to +50%), Golem Covenant (Golems are now bought through this), Hourglass of Al-Ula (5 min and 1 h Fast Forward buttons for 300 and 3,600 Chrono Sand), Blueprint Memory II (keep every upgrade of generators 1-7), Resonant Start (start each run with 1 of each of the first 10 generators) and Dust Amplifier (+10% Cosmic Dust per rank, repeatable).',
      'Cosmic Genesis, Chrono Reservoir, Titan\'s Legacy, Astral Crucible and Automated Leylines are now Dust Shop items with the same effects.',
      'Your old perks carry over: the five kept perks stay bought at the rank you had, for free. Eternal Resonance and Singularity Tap were removed; every bit of dust you spent on them is refunded to your balance. If you already own Golems, you get Golem Covenant for free. The Dust Shop shows a one-time note with what was kept and refunded.',
      'Spending dust still never lowers your production: the dust bonus counts all dust you have earned. Transcending (and beginning a Chronicle) empties the Dust Shop along with your dust, and both confirm panels now say so.',
      'Buying Golems now needs Golem Covenant (Ascension 5). Golems you already own keep working.'
    ]
  },
  {
    version: '4.0.0',
    date: '2026-10-06',
    title: 'The Chronicle: a third prestige layer',
    changes: [
      'New Chronicle tab (Meta group). Once Transcends slow down, begin a Chronicle: at 12 Transcends with all seven Seals of Transcendence lit, or at 24 Transcends without them (after your first Chronicle, 12 is always enough). The panel lists exactly what starts again and what you keep before you confirm.',
      'A Chronicle starts your run, shop upgrades, Cosmic Dust, God Perks, Fracture Shards, the Shard Tree and your Transcend count again (back to 14 generator tiers). You keep everything else: talents, records, the Codex, the Tower, Excavation, Garden, Alchemy, Guild, Bazaar, gold and sand. Wardens and Garden breeding stay unlocked, and your Transcend achievements and talent stars count every Chronicle.',
      'Chronicle Pages: 3 for a Chronicle at 12 Transcends, +1 for every 2 Transcends past that. Every Page you have ever earned gives ×1.4 Aether for good; spending them never lowers it. Spend Pages on six permanent Page upgrades, such as Bookmark (keep Auto-Ascend through a Chronicle) and Ink of Memory (start each Chronicle with 2 Fracture Shards).',
      'Chapter 1, Sand: your first Chronicle opens a ten-week season where Excavation digs ×3 but Aether is halved. Finishing it pays a stamp and 3 Pages.',
      'Four challenges (Dry Well, Lights Out, Small Souq, Sandstorm): side runs with special rules and a goal that pay 3–5 Pages on the first clear. Starting one sets your current run aside; it comes back exactly as it was when you finish or abandon the challenge, even across a reload. Challenges stay open after the Chapter ends, so nothing can be missed.'
    ]
  },
  {
    version: '3.7.0',
    date: '2026-10-06',
    title: 'Idle is the baseline: active play rebalanced',
    changes: [
      'This is a nerf to active income. Being at the screen earned far more than being away, which made every hour offline feel like a loss. Active play still pays more than idle, just much less: an attentive player now earns about 7 times idle instead of about 20 times.',
      'Aether Burst now grants 45 seconds of Aether production (was 2 minutes) and its cooldown is 45 s (was 30 s).',
      'Celestial Alignment is +150% Aether for 30 s (was +300%).',
      'Supernova anomalies grant 3 minutes of Aether production (was 10 minutes).',
      'Two new Golden Anomalies. Mirage (1 in 12): double Aether and double gold for 60 s. Caravan Star (1 in 20): a free large caravan sets out from the Bazaar, or, if one is already on the road, its full return is paid to you at once.',
      'Golden Anomalies now announce themselves with a notice in the corner instead of floating text.',
      'Upgrade shop retuned to match: generator upgrades are x1.2 each (were x1.25, so all five give x2.5 instead of x3) and synergies are +0.1% per building (were +0.3%). Your first Transcend now comes after about four days of casual play rather than one and a half.'
    ]
  },
  {
    version: '3.6.0',
    date: '2026-10-06',
    title: 'The Dallah: something new every day and week',
    changes: [
      'New Dallah tab (Meta group). The Daily Dallah pours a gift on your first visit of each day: +60 Chrono Sand, a ready-to-claim bonus contract and an hour of +25% Aether. Days you miss wait for you, up to 3, and claiming them pays every banked day. There is no streak: the number on the card is just how many days you have visited, and nothing is ever lost by staying away.',
      'Weekly Ledger: every Monday it sets 3 goals from things you can already do (bosses, depths, harvests, brewing, contracts and more). Each goal pays 6 Guild Seals, and finishing all three adds a stamp for the week. Progress counts from the start of the week. A week you skip costs you nothing.',
      'Souq Rotation: one friendly modifier each week, always positive and always coming back: Truffle Season (Desert Truffle grows ×1.5), Falcon Week (Tower boss gold ×1.5), Hourglass Week (Chrono Sand gained ×1.5) and Rosewater Week (every plant grows ×1.25).',
      'Seals of Transcendence: seven lamps that light for good once you reach depth 100, Tower floor 501, 25 Catalysts, 15 Ascensions, Guild Rank 7, a 1e8 Cosmic Dust Ascension and 40% of the Codex. Each lit Seal adds +1 Fracture Shard to spend in the Shard Tree at every Transcend, up to +3 (so up to 3 extra shards to spend on top of the 2 you already get). These extra shards do not raise your ×1.5 shard bonus. Seals are a bonus, not a requirement to Transcend. If you already meet a Seal, it lights the next time you open the game.'
    ]
  },
  {
    version: '3.5.0',
    date: '2026-10-06',
    title: 'The Upgrade Shop',
    changes: [
      'New on the Falafel tab: an Upgrades row above your generators. Each generator has 5 upgrades that appear at 1, 10, 50, 100 and 200 owned; each one makes that generator produce x1.25 (x3 with all five).',
      '15 click upgrades, each doubling your base click (clicks are worth your base click plus 3% of your Aether per second, times combo), and 8 synergies such as "Dallah per Shawarma": +0.3% Giant Dallah output for every Shawarma Stall you own.',
      'Tap an upgrade to see what it does, what it costs and how much Aether you are still missing. "Buy all" buys everything you can afford, cheapest first.',
      'Upgrades last for one run: Ascending (and Transcending) clears them, so every run starts the climb again. Saves from before this update start with no upgrades bought.'
    ]
  },
  {
    version: '3.4.0',
    date: '2026-10-06',
    title: 'The Contract Board',
    changes: [
      'Bounties is now a board of up to 6 guild contracts that you pick from. A new contract is posted every 30 minutes, and the board keeps filling while you are away, so you always come back to a full board. Claiming a contract no longer replaces it at once: the empty slot refills on the timer. Fast Forward does not speed the timer up.',
      'Every contract you claim counts toward Guild Rank (the old limit of one counted claim per 30 minutes is gone). A rank-up pays a Talent Point and 5 Guild Seals, up to about 48 contracts a day.',
      'Each contract has one free reroll, and contracts only come from tabs you can play. Clicking contracts are only posted while you have clicked in the last 5 minutes, so an idle board no longer jams. Contracts grow 15% per Guild Rank (up to about ten minutes of play) and pay Gold equal to 250 x difficulty x your Market Index.',
      'Contracts you already had keep working: they stay on the board and can be claimed as before (an old one that carried a Talent Point still pays it).'
    ]
  },
  {
    version: '3.3.0',
    date: '2026-10-06',
    title: 'The Shard Tree',
    changes: [
      'Fracture Shards can now be spent in the Shard Tree (Ascension tab). Nodes are permanent: Transcend never resets them, and your shard bonus still counts every shard you have earned, so spending never lowers it.',
      'Chronos branch: Auto-Ascend (2 shards) Ascends for you when the Ascension would multiply your dust by ×1.2, ×1.5 or ×2, or on a timer (10 min to 4 h). It never Ascends before the 10-minute minimum run, can be switched off, and shows one quiet notice instead of a celebration each time. Then Long Sleep (2 shards: offline Aether at 100% for 8 more hours) and Hourglass (3 shards: a 6-hour Fast Forward once a day).',
      'Tower branch: Wardens (1 shard) and Second Wind (2 shards: once per boss fight, losing to a boss refills your HP and the timer instead of pushing you back; the boss keeps the damage you dealt).',
      'Change: Wardens are now a Shard Tree node instead of opening at your first Transcend. If you have already Transcended, you keep them for free.',
      'Foundry branch: 16 Deep Blueprints, one per Transcend building tier (15 to 30), each making that tier\'s upgrades 10× cheaper. They go on sale with the building upgrade shop.'
    ]
  },
  {
    version: '3.2.1',
    date: '2026-10-06',
    title: 'Hotfix: the game loads again',
    changes: [
      'Fixed a broken update that stopped the game from loading after the Codex 2.0 release. Your save was not affected.'
    ]
  },
  {
    version: '3.2.0',
    date: '2026-10-06',
    title: 'Codex 2.0',
    changes: [
      'The Codex tab now has three sections: Achievements, Collections and the Generator Codex, with an overall Codex percentage at the top.',
      'Achievements grow from 24 to 88: every lifetime stat (clicks, Aether, play time, generators, Ascensions, Transcends, Tower floors, kills, bosses, depth, blocks, plants, potions, spells, contracts) now has a ladder of goals. Your 24 original achievements keep their +1.5% Aether each; each new rung gives +0.5%. Old saves unlock the rungs they already qualify for the next time the game runs, so expect a one-off bump and a single batched notice.',
      'Collections fill from what you have already done: Warden Trophies, Strata Relics, the Golden Herbarium, Hybrid Herbarium and Hybrid Recipes. Each finished set gives +1% Aether (8% at most across all eight sets).',
      'Generator Codex: all 30 generator tiers, shown as a silhouette until you build one. Own 100, 500 and 1000 of a tier to earn its stars and read its entry. Your best count is kept through Ascensions and Transcends.',
      'Unlock notices are batched: a burst of unlocks becomes one toast such as "12 achievements unlocked".'
    ]
  },
  {
    version: '3.1.0',
    date: '2026-10-06',
    title: 'Talent Points You Earn',
    changes: [
      'Talent points now come from things you achieve: Milestone Stars (your first Ascension, new Excavation depths, new Tower zones, your first Rose of Taif, Date Palm and Sidr Tree, 10, 25 and 50 Catalysts, and each Transcend), Record Ascensions (a point each time your best single Ascension pays ten times more Cosmic Dust than before) and Guild Rank (contracts you claim raise your rank, and each rank pays a point and 5 Guild Seals).',
      'The flat +3 talent points per Ascension and the random 20% chance of a point from a bounty are gone. Every point you already have, spent or unspent, is kept, and nothing you already reached is paid a second time.',
      'The Constellations tab shows where your points have come from and the three stars you are closest to, each with a progress bar.',
      'Until the contract board is reworked, only one claimed contract per 30 minutes (with up to 6 saved up) counts toward Guild Rank. Claiming more still pays Gold, Guild Seals and Chrono Sand as before.'
    ]
  },
  {
    version: '3.0.0',
    date: '2026-10-06',
    title: 'The Long Road (Redesign, Part 1)',
    changes: [
      'Transcend reworked: it now needs 1e9 Cosmic Dust earned since your last Transcend (x10 each time), pays 2 Fracture Shards, and every shard you have ever earned gives x1.5 Aether and x1.5 dust. The Transcend panel shows exactly what you gain and what resets.',
      '16 new buildings (tiers 15 to 30): one more opens with each Transcend. Locked tiers stay hidden until you reach them. Old saves get a refund for the previous Transcend rules.',
      'Cosmic Dust: the dust multiplier now counts all dust earned (+2% each), so spending dust never lowers it. Dust gain grows faster (exponent 1/3, was 1/4), and an Ascension needs a run of at least 10 minutes (the button shows the time left).',
      'Offline progress: 100% Aether for the first 8 hours, 50% up to 24 hours, then nothing; each Chrono Reservoir rank adds 4 hours to both. A welcome-back window shows the breakdown.',
      'Void Tower rebalanced: gear scales x1.11 per floor, bosses have x400 HP and 45 seconds. Very high floors from old saves move to the floor your gear can clear; your record floor is kept.',
      'Wardens guard every 250th floor (x3 boss HP, 60 seconds; each trophy gives +2% Tower gold). Excavation adds Strata Relics (+5% pickaxe power each), Aether Ore and Gem Polishing (5 gems into 1 of the next kind).',
      'Garden breeding: cross two grown plants into hybrids, with a 1% golden mutation and 6 hybrid recipes to discover in Alchemy.',
      'Bazaar: prices drift back toward their normal value, buying and selling has a 5% spread, stock is capped, and caravans can carry cargo (optional).',
      'Leaderboard Season 2 ranks the Tower floor under the new rules; Season 1 stays viewable.',
      'Rewards now pop up as toasts, and big moments (Ascension, Transcend, perks) get a short skippable celebration with its own sound.',
      'New look: a shared colour palette, the Inter font, clearer buy buttons that say how much you are missing, and gear rarity shown as border, symbol and word.',
      'Faster rendering and smaller images; saves now carry a version number so future updates convert them safely.'
    ]
  },
  {
    version: '2.7.1',
    date: '2026-10-06',
    title: 'Boss Portrait & Number Fixes',
    changes: [
      'Void Tower: the boss portrait now sits in a fixed square frame, so the card no longer jumps, overflows or moves the click target, and it works on phones.',
      'Gear, hero and monster stats, XP and combat damage now follow your number notation (e.g. 1.5e12) and update as soon as you change it in Settings.',
      'Counts across Excavation, Garden, Alchemy, Bounties, Bazaar, Codex and the offline popup no longer show long raw numbers.'
    ]
  },
  {
    version: '2.7.0',
    date: '2026-10-06',
    title: 'Fast Forward Returns',
    changes: [
      'Fast Forward is back. Each use costs 3x the last (30, 90, 270, 810 Chrono Sand…), and the price resets after 30 minutes without one.',
      'The Fast Forward button shows its current price, uses this cycle and a reset countdown, and spamming it no longer lags the game.',
      'Fixed lost clicks on the Golden Enchanter button and a shared 1x/10x/MAX setting between the Buildings and the Bazaar.'
    ]
  },
  {
    version: '2.6.0',
    date: '2026-10-06',
    title: 'The Cosmic Falafel Update',
    changes: [
      'Theme: Transformed the central clicker Monolith into a glorious Cosmic Falafel ring topped with sesame seeds (procedural SVG art).'
    ]
  },
  {
    version: '2.5.0',
    date: '2026-10-06',
    title: 'Visual Polish & Audio Rhythms',
    changes: [
      'Audio: Added a rhythmic sound box with 5 selectable scales in Settings (Pentatonic, Hijaz, Mystic, Lofi, Boss).',
      'Visuals: Improved global contrast and adjusted image object-fit to prevent cut-off pictures in Safari/Chrome.'
    ]
  },
  {
    version: '2.4.0',
    date: '2026-10-06',
    title: 'Visual Polish & Number Formatting',
    changes: [
      'UI: Massive numbers in combat (Boss HP, Hero HP, Attack, Damage, XP) now respect your chosen Number Notation from the Settings tab.',
      'Equipment: Overhauled the Hero Gear panel with dynamic CSS rarity backgrounds, glows, and animations (Cosmic tier is now glowing Gold, Legendary is pulsing Red).',
      'Polish: Applied a global custom tooltip system with glassmorphism styling and golden accents.',
      'Visuals: Added a subtle cosmic desert dust animation to the game background.'
    ]
  },
  {
    version: '2.3.0',
    date: '2026-10-06',
    title: 'Saudi Meme Edition',
    changes: [
      'Visuals: Swapped colors to Desert Gold & Emerald Green.',
      'Theme: Transformed to Saudi memes (Kabsa, Drifting Camry, Angry Shayeb, Wasta bosses).',
      'UI: Complete overhaul of icons and images to fit the desert and cosmic meme style.',
      'Mechanics: Added MAX buy for Golden Synergy.',
      'Anti-Cheat: Fast forward disabled with a message.'
    ]
  },
  {
    version: '2.2.1',
    date: '2026-10-05',
    title: 'Anti-Cheat System',
    changes: [
      'Disabled the Fast Forward button.',
      'Added a special surprise pop-up message for anyone trying to cheat time.'
    ]
  },
  {
    version: '2.2.0',
    date: '2026-10-05',
    title: 'Saudi Edition Update',
    changes: [
      'Updated theme colors to a vibrant Saudi aesthetic (Emerald and Desert Gold).',
      'Replaced Void Tower combat zones with iconic local spots (Thumama Dunes, Boulevard World, etc.).',
      'Introduced 12 new Saudi meme bosses including Drifting Camry, Giant Kabsa, and Angry Shayeb.',
      'Added custom generated meme image sprites for the bosses.'
    ]
  },
  {
    version: '2.1.1',
    date: '2026-10-05',
    title: 'Excavation Unstuck',
    changes: [
      'Fixed Excavation sometimes freezing for good after finding the stairs; stuck saves repair themselves on load.',
      'Very deep saves from before v2.0 resume at a depth your pickaxe can dig; your record depth and its bonuses are kept.',
      'Dynamite and Void Cataclysm now hit each tile for 40x your pickaxe power instead of breaking it outright.'
    ]
  },
  {
    version: '2.1.0',
    date: '2026-10-05',
    title: 'Online Leaderboard',
    changes: [
      'New Leaderboard tab: pick a display name and compare Max Floor, Best Run Aether, Ascensions and Max Depth with other players (top 50 each).',
      'See how many players are online right now; a green dot marks anyone who played in the last 2 minutes.',
      'Best Run Aether is tracked from this version on.'
    ]
  },
  {
    version: '2.0.0',
    date: '2026-10-05',
    title: 'The Great Rebalance',
    changes: [
      'Excavation slows down for real: every depth is tougher and gives more Stone. Pickaxe levels and Auto-Drills now cost Stone, the pickaxe has no level cap, and there are 7 strata with richer Void Amethyst deeper down.',
      'Garden plants now take 5 minutes to 2 hours. Water All gives +30s on a 60s cooldown. Fertilize is live (1 Spore Powder doubles a plot’s next yield).',
      'New Garden Golems (up to 4, bought with Stone + Mana Sap): each harvests and replants its row automatically, and keeps working offline at 50% speed for up to 12 hours.',
      'Excavation and Garden now raise Cosmic Dust: +10% per 10 max depth (Geode Attunement), and Ascending offers up your Celestial Nectar for up to x2 dust (Nectar Offering).',
      'Depth now gives +2% Aether per depth and up to +100% mana, mana regen and hero HP. Full mana speeds the Garden x1.5 and Auto-Drills x1.25 (Leyline Overflow).',
      'New buff bar under the header shows every active elixir, spell buff and Frenzy with a countdown; tap one to jump to the tab it powers. On phones it sits at the bottom.',
      'New Masteries panel on the Ascension tab, mastery bonuses in each tab’s Active Bonuses strip, and an Aether/s tooltip showing what multiplies it.',
      'Nerf: Aether buffs now add together (+300% and +200% = x6, was x12) and can be extended to at most 10 minutes.',
      'Nerf: Philosopher’s Catalyst gives +2% Aether per brew (additive) and costs 8% more each time; saves above 50 brews keep 50.',
      'Nerf: Chrono Sand costs 1,000 x Market Index gold per 30s and the bank holds 1,440s; sand above the cap was removed.',
      'Very deep Excavation saves were compressed (e.g. depth 3,752 becomes 120) and capped at 12 Auto-Drills. Plants already growing finish on their old timers.',
      'Fixed: gold caches and stone transmutes paying 0 at extreme depth, Auto-Drills losing hits, and the Void Tower becoming unbeatable around floor 6,200.'
    ]
  },
  {
    version: '1.5.0',
    date: '2026-10-05',
    title: 'Gold Economy Rebalance',
    changes: [
      'Void Tower: gold per kill now grows at the same rate as monster difficulty (1.12x per floor, was 1.15x), so gold no longer outpaces the rest of the game. Gold you already have is kept.',
      'Bazaar: commodity prices and caravans now scale with your deepest Void Tower floor (Market Index), so trading stays worthwhile at every stage. The index is shown on the Bazaar tab.',
      'Bazaar: caravans are now Small (10 min, 1.25x) and Large (60 min, 1.5x); the payout is locked in when you send them.',
      'Bazaar: the Golden Enchanter no longer becomes free at extremely high levels.'
    ]
  },
  {
    version: '1.4.0',
    date: '2026-10-05',
    title: 'Quick Cast & Guild Seals',
    changes: [
      'Quick Cast bar on the Monolith, Void Tower, Excavation and Garden tabs: cast the Grimoire spells that matter there without switching tabs. Each button shows its mana cost, cooldown, or the time left on its buff.',
      'Guild Seals now appear in the top resource bar.'
    ]
  },
  {
    version: '1.3.1',
    date: '2026-10-05',
    title: 'Resource Flow Guides',
    changes: [
      'Every How It Works banner now lists what the tab produces and where those resources are used elsewhere in the game.'
    ]
  },
  {
    version: '1.3.0',
    date: '2026-10-05',
    title: 'Active Bonuses on Every Tab',
    changes: [
      'Each subgame tab now shows an Active Bonuses strip: the Constellation talents, Ascension perks and running elixir/spell buffs that affect that tab, with their current total effect.'
    ]
  },
  {
    version: '1.2.2',
    date: '2026-10-05',
    title: 'Bulk Chrono Transmutation',
    changes: [
      'Alchemy: Gold to Chrono Sand conversion now has x1, x10, x100, x1K and Max buttons (Max shows how much sand you will get).',
      'The Chrono Sand counter now uses your chosen number notation.'
    ]
  },
  {
    version: '1.2.1',
    date: '2026-10-05',
    title: 'Bounty Alerts',
    changes: [
      'A red dot now appears on the Bounties tab whenever a contract is ready to claim.'
    ]
  },
  {
    version: '1.2.0',
    date: '2026-10-05',
    title: 'Scientific Notation & Settings',
    changes: [
      'Large numbers now display in scientific notation by default (1e9, 1.5e10).',
      'New Settings tab: switch number notation between Scientific, Standard (K, M, B…) and Engineering. Your choice is saved with your game.',
      'Excavation: rubies were stored under the wrong name and never reached Alchemy; existing ones are recovered automatically.',
      'The game now autosaves while its tab is in the background.'
    ]
  },
  {
    version: '1.1.1',
    date: '2026-10-05',
    title: 'Garden Timer Fix',
    changes: [
      'Garden: plot timers can no longer count into negative seconds; any fully grown plot is always harvestable (also repairs plots stuck in older saves).'
    ]
  },
  {
    version: '1.1.0',
    date: '2026-10-05',
    title: 'The Great Audit',
    changes: [
      'Bazaar: caravan dispatch buttons now respond reliably (they were rebuilt every frame and swallowed clicks).',
      'Ascension: Transcend button now responds reliably; Fracture Shards now grant +10% All Aether Production each.',
      'Ascension: Automated Leylines, Chrono Reservoir, Titan\'s Legacy and Astral Crucible perks now actually work.',
      'Bounties: contract progress and Claim buttons update live; cards now show the Guild Seals reward.',
      'Constellations: all 15 talents now apply their effects (10 previously did nothing); Leyline Conduit mana bonus no longer resets.',
      'Constellations: Respec asks for confirmation and is disabled when no points are spent.',
      'Garden: fixed plants getting stuck in "blooming" forever after Water All; Water All shows its cooldown.',
      'Garden: Mana Lily now restores mana on harvest; harvest popups show the essence gained.',
      'Alchemy: Midas Elixir now boosts gold; elixirs survive a page reload; ingredient names and owned counts are shown.',
      'Grimoire: Chrono Warp lasts its full 15s and no longer burns other buffs 5x faster; Midas\' Blessing now mints gold per click.',
      'Grimoire: buff spells refresh instead of stacking; Void Cataclysm hits for 40% of max HP and reveals random tiles.',
      'Monolith: Frenzy no longer re-triggers forever; combo label shows the real bonus (max 5x); MAX buy shows the true next cost.',
      'Void Tower: Time Warp no longer auto-fails bosses; equipment panel updates on new loot; amulet crit now works; amulet/relic drops never downgrade.',
      'Added a version label and this About page.'
    ]
  },
  {
    version: '1.0.1',
    date: '2026-10-05',
    title: 'Excavation Shop Fix',
    changes: [
      'Excavation: pickaxe, Auto-Drill and Dynamite buttons now respond to clicks.',
      'Excavation: dug tiles no longer go blank after a purchase or show stale tiles after taking the stairs.',
      'Excavation: Dynamite now blasts a real 3x3 area.'
    ]
  },
  {
    version: '1.0.0',
    date: '2026-10-05',
    title: 'First Public Release',
    changes: [
      'Aetheria Clicker published on GitHub Pages.'
    ]
  }
];

