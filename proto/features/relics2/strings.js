// Every level of a relic is one whole sentence (never glued from parts), so Arabic can be added line by line.
// `r_<id>_d` is the slot the chest card reads; the relic's vars(lv) fill it with that level's sentence.
export default { en: {
  r2_goes: 'Goes with your {name}',
  r2_pair: 'Pair: {name}',

  r_hop: 'Jumping Pick', r_hop_d: '{d}',
  r_hop_d1: 'Your hit jumps on to the next block of the same kind.',
  r_hop_d2: 'Your hit jumps twice, to blocks of the same kind.',
  r_hop_d3: 'Your hit keeps jumping for as long as it breaks blocks.',

  r_twin: 'Twin Stone', r_twin_d: '{d}',
  r_twin_d1: 'After {n} blocks your pick glows. The next ore or TNT you break gets a twin.',
  r_twin_d2: 'After {n} blocks your pick glows. The next ore or TNT you break gets two twins.',
  r_twin_d3: 'Your glowing pick now makes twins of bones and oil too.',

  r_fling: 'Flying Rocks', r_fling_d: '{d}',
  r_fling_d1: 'Blocks you break fly off and smash into another block.',
  r_fling_d2: 'Flying rocks bounce: a block they break flies off too.',
  r_fling_d3: 'Everything that breaks flies, and rocks bounce three times.',

  r_magnet: 'Magnet', r_magnet_d: '{d}',
  r_magnet_d1: 'Every {n}th hit pulls the nearest ore one step toward your pick.',
  r_magnet_d2: 'Your magnet also pulls chests, bones and oil toward your pick.',
  r_magnet_d3: 'Your magnet pulls every treasure in reach at once.',

  r_fire: 'Hot Pick', r_fire_d: '{d}',
  r_fire_d1: 'Blocks you break set the soft ground around them on fire.',
  r_fire_d2: 'Your fire spreads further and burns hard rock and ore too.',
  r_fire_d3: 'Your big hits throw a fireball.',

  r_fuse: 'Fire Barrels', r_fuse_d: '{d}',
  r_fuse_d1: 'TNT leaves fire behind, and fire sets off TNT. You get one barrel now.',
  r_fuse_d2: 'TNT fire spreads further. You get one more barrel now.',
  r_fuse_d3: 'Burned blocks sometimes leave a TNT barrel in the ashes.',

  r_rang: 'Boomerang', r_rang_d: '{d}',
  r_rang_d1: 'Your pick flies along the row and back, and hits {n} blocks twice. It hits hard, but you swing slower.',
  r_rang_d2: 'Your boomerang flies all the way to the wall. You still swing slower.',
  r_rang_d3: 'Your boomerang comes back along the row below.',

  r_fall: 'Landslide', r_fall_d: '{d}',
  r_fall_d1: 'Blocks with nothing under them fall, and crack what they land on.',
  r_fall_d2: 'Falling TNT goes off. A long fall hits harder.',
  r_fall_d3: 'A block that lands also shakes the blocks beside it.',

  r_borrow: 'Borrowed Pick', r_borrow_d: '{d}',
  r_borrow_d1: 'Every {n}th Rafeeq hit is a swing of your pick, with all your relics.',
  r_borrow_d2: 'Every {n}th Rafeeq hit is a swing of your pick, with all your relics.',
  r_borrow_d3: 'When a borrowed swing breaks a block, the next Rafeeq borrows your pick too.',

  r_fazaa: 'Faz\'a', r_fazaa_d: '{d}',
  r_fazaa_d1: 'Two Rafeeqs run to the block you are hitting and help.',
  r_fazaa_d2: 'All your Rafeeqs run to the block you are hitting.',
  r_fazaa_d3: 'Rafeeqs at your block hit in time with you.',

  r_garden: 'Ore Garden', r_garden_d: '{d}',
  r_garden_d1: 'Ore grows. Every {n} blocks broken, an ore turns the ground beside it into the same ore. You get one seed now.',
  r_garden_d2: 'Two ores grow at a time. You get one more seed now.',
  r_garden_d3: 'New ore sometimes grows one kind better.',

  r_melt: 'Melting Pot', r_melt_d: '{d}',
  r_melt_d1: 'Three of the same ore that touch melt into one of the next ore up.',
  r_melt_d2: 'Three gems that touch melt into a chest.',
  r_melt_d3: 'Two of the same ore are enough to melt.',
}, ar: {
  r2_goes: 'يتماشى مع {name}',
  r2_pair: 'شريكه: {name}',

  r_hop: 'المعول القافز', r_hop_d: '{d}',
  r_hop_d1: 'ضربتك تقفز إلى الكتلة التالية من النوع نفسه.',
  r_hop_d2: 'ضربتك تقفز مرتين، إلى كتل من النوع نفسه.',
  r_hop_d3: 'ضربتك تظل تقفز ما دامت تكسر الكتل.',

  r_twin: 'الحجر التوأم', r_twin_d: '{d}',
  r_twin_d1: 'بعد كسر كتل عددها {n} يتوهّج معولك. الخام أو الديناميت التالي الذي تكسره يأتي معه توأم.',
  r_twin_d2: 'بعد كسر كتل عددها {n} يتوهّج معولك. الخام أو الديناميت التالي الذي تكسره يأتي معه توأمان.',
  r_twin_d3: 'معولك المتوهّج يصنع الآن توائم للعظام والنفط أيضاً.',

  r_fling: 'الصخور الطائرة', r_fling_d: '{d}',
  r_fling_d1: 'الكتل التي تكسرها تطير وتصطدم بكتلة أخرى.',
  r_fling_d2: 'الصخور الطائرة ترتدّ: الكتلة التي تكسرها تطير هي أيضاً.',
  r_fling_d3: 'كل ما ينكسر يطير، والصخور ترتدّ ثلاث مرات.',

  r_magnet: 'المغناطيس', r_magnet_d: '{d}',
  r_magnet_d1: 'كل ضربة رقم {n} تسحب أقرب خام خطوة نحو معولك.',
  r_magnet_d2: 'مغناطيسك يسحب أيضاً الصناديق والعظام والنفط نحو معولك.',
  r_magnet_d3: 'مغناطيسك يسحب كل كنز في متناوله دفعة واحدة.',

  r_fire: 'المعول الملتهب', r_fire_d: '{d}',
  r_fire_d1: 'الكتل التي تكسرها تُشعل النار في الأرض اللينة حولها.',
  r_fire_d2: 'نارك تنتشر أبعد وتحرق الصخر الصلب والخام أيضاً.',
  r_fire_d3: 'ضرباتك الكبيرة ترمي كرة نار.',

  r_fuse: 'براميل النار', r_fuse_d: '{d}',
  r_fuse_d1: 'الديناميت يترك ناراً خلفه، والنار تفجّر الديناميت. تحصل على برميل واحد الآن.',
  r_fuse_d2: 'نار الديناميت تنتشر أبعد. تحصل على برميل آخر الآن.',
  r_fuse_d3: 'الكتل المحترقة تترك أحياناً برميل ديناميت في الرماد.',

  r_rang: 'البوميرانغ', r_rang_d: '{d}',
  r_rang_d1: 'يطير معولك على طول الصف ويعود، ويضرب كتلاً عددها {n} مرتين. ضربته قوية، لكنك تضرب أبطأ.',
  r_rang_d2: 'البوميرانغ يطير حتى الجدار. ما زلت تضرب أبطأ.',
  r_rang_d3: 'البوميرانغ يعود على طول الصف الذي تحته.',

  r_fall: 'الانهيار', r_fall_d: '{d}',
  r_fall_d1: 'الكتل التي لا شيء تحتها تسقط، وتشقّ ما تقع عليه.',
  r_fall_d2: 'الديناميت الساقط ينفجر. السقطة الطويلة تضرب أقوى.',
  r_fall_d3: 'الكتلة التي تقع تهزّ الكتل التي بجانبها أيضاً.',

  r_borrow: 'المعول المستعار', r_borrow_d: '{d}',
  r_borrow_d1: 'ضربة واحدة من كل {n} من ضربات الرفقاء تكون ضربة بمعولك، بكل آثارك.',
  r_borrow_d2: 'ضربة واحدة من كل {n} من ضربات الرفقاء تكون ضربة بمعولك، بكل آثارك.',
  r_borrow_d3: 'حين تكسر ضربةٌ مستعارة كتلة، يستعير الرفيق التالي معولك أيضاً.',

  r_fazaa: 'الفزعة', r_fazaa_d: '{d}',
  r_fazaa_d1: 'يركض رفيقان إلى الكتلة التي تضربها ويساعدانك.',
  r_fazaa_d2: 'يركض كل رفقائك إلى الكتلة التي تضربها.',
  r_fazaa_d3: 'الرفقاء عند كتلتك يضربون معك في الوقت نفسه.',

  r_garden: 'حديقة الخام', r_garden_d: '{d}',
  r_garden_d1: 'الخام ينمو. كلما كسرت كتلاً عددها {n}، يحوّل خامٌ الأرضَ التي بجانبه إلى الخام نفسه. تحصل على بذرة واحدة الآن.',
  r_garden_d2: 'ينمو خامان في كل مرة. تحصل على بذرة أخرى الآن.',
  r_garden_d3: 'الخام الجديد ينمو أحياناً أفضل بدرجة.',

  r_melt: 'قِدر الصهر', r_melt_d: '{d}',
  r_melt_d1: 'ثلاث قطع من الخام نفسه تتلامس تذوب وتصير قطعة من الخام الأعلى منه.',
  r_melt_d2: 'ثلاث جواهر تتلامس تذوب وتصير صندوقاً.',
  r_melt_d3: 'قطعتان من الخام نفسه تكفيان للذوبان.',
} };
