// Arabic text (R37), the same keys as js/i18n/en.js. Needs review by a native speaker before
// players see it. AR_TERMS and AR_ITEMS are the Arabic game terms (js/data/strings.js) and item
// names (js/data/names.js). Numbers stay in Western digits and read left to right.

export const AR_TERMS = {
  currency: 'النفط',
  clicker: 'مصفاة النفط',
  clickerTab: 'المصفاة',
  reset1: 'احفر بئرًا جديدة',
  reset1Noun: 'بئر جديدة',
  reset1Plural: 'آبار جديدة',
  reset1Past: 'حفرتَ بئرًا جديدة',
  reset1Currency: 'احتياطي الخام',
  reset1Short: 'الاحتياطي',
  reset1Shop: 'متجر الاحتياطي',
  autoReset1: 'الحفر التلقائي',
  reset2: 'افتح حقل نفط جديدًا',
  reset2Noun: 'حقل جديد',
  reset2Plural: 'حقول جديدة',
  reset2Past: 'فتحتَ حقل نفط جديدًا',
  reset2Currency: 'أسهم الحقل',
  reset2Short: 'الأسهم',
  shareTree: 'شجرة الأسهم',
  shareBonus: 'مكافأة الأسهم'
};

export const AR_ITEMS = {
  stone: { name: 'حجر', plural: 'حجر' },
  limestone: { name: 'حجر جيري', plural: 'حجر جيري' },
  granite: { name: 'جرانيت', plural: 'جرانيت' },
  obsidian: { name: 'سَبَج', plural: 'سَبَج' },
  voidstone: { name: 'حجر الفراغ', plural: 'حجر الفراغ' },
  rubies: { name: 'فانوس', plural: 'فوانيس' },
  sapphires: { name: 'دلّة', plural: 'دلال' },
  emeralds: { name: 'خشب عود', plural: 'خشب عود' },
  diamonds: { name: 'مسباح', plural: 'مسابيح' },
  voidAmethyst: { name: 'مبخرة', plural: 'مباخر' },
  monsterBones: { name: 'عظمة وحش', plural: 'عظام وحوش' },
  voidCores: { name: 'نواة فراغ', plural: 'أنوية فراغ' },
  bossTokens: { name: 'وسام زعيم', plural: 'أوسمة زعماء' },
  sporePowder: { name: 'نعناع طازج', plural: 'نعناع طازج' },
  manaSap: { name: 'قطرات ليمون', plural: 'قطرات ليمون' },
  solarDew: { name: 'زيت كمأة', plural: 'زيت كمأة' },
  cryoEssence: { name: 'ماء ورد طائفي', plural: 'ماء ورد طائفي' },
  voidPollen: { name: 'تمر ذهبي', plural: 'تمر ذهبي' },
  starNectar: { name: 'عسل سدر', plural: 'عسل سدر' },
  limonana: { name: 'ليمون بالنعناع', plural: 'ليمون بالنعناع' },
  truffleZest: { name: 'قشر ليمون بالكمأة', plural: 'قشر ليمون بالكمأة' },
  roseTruffle: { name: 'مربى ورد بالكمأة', plural: 'مربى ورد بالكمأة' },
  roseDate: { name: 'دبس تمر بالورد', plural: 'دبس تمر بالورد' },
  honeyDate: { name: 'تمر بالعسل', plural: 'تمر بالعسل' },
  mintHoney: { name: 'شاي نعناع بالعسل', plural: 'شاي نعناع بالعسل' }
};

export default {
  'app.title': 'أثيريا: النسخة السعودية',

  'settings.language': 'اللغة',
  'settings.language.intro': 'لغة اللعبة كلها. العربية تُقرأ من اليمين إلى اليسار.',
  'settings.language.en.desc': 'النص الأصلي بالإنجليزية.',
  'settings.language.ar.desc': 'العربية، من اليمين إلى اليسار.',
};
