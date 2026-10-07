// English text (R37). Every player-facing string the game draws goes through t(key) and lives
// here; js/i18n/ar.js holds the same keys in Arabic (test_r37_i18n.js fails on a missing one).
// `{name}` is a placeholder: from t()'s params, else a game term from js/data/strings.js.
// Item names stay in js/data/names.js and game terms in js/data/strings.js.

export default {
  'app.title': 'Aetheria: Saudi Edition',

  // Settings: language
  'settings.language': 'Language',
  'settings.language.intro': 'The language of the whole game. Arabic reads right to left.',
  'settings.language.en.desc': 'The original text.',
  'settings.language.ar.desc': 'Arabic, right to left.',
};
