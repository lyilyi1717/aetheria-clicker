// Core-loop strings (docs/core-loop-plan.md Wave C). Each core-loop UI item keeps its keys in its
// own pair of files, js/i18n/coreloop/<item>.en.js and .ar.js, and registers them here when its
// module loads, so no two items edit js/i18n/en.js or ar.js. Registered keys work with t() like
// any other; test_r37_i18n.js checks their Arabic once the module is imported.
import EN from '../en.js';
import AR from '../ar.js';

export function registerStrings(en, ar) {
  for (const k of Object.keys(en)) {
    if (k in EN && EN[k] !== en[k]) throw new Error(`core-loop string ${k} is already defined`);
  }
  Object.assign(EN, en);
  Object.assign(AR, ar);
}
