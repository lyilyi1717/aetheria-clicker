// Player-facing game terms (R36). The one place the names of the main currency, the clicker and
// the two prestige layers live, next to the item names in names.js. Internal keys (`aether`,
// `cosmicDust`, `ascend()`, save fields, CSS tokens) keep their old names so saves never break;
// only the text here changes. A re-theme or translation (Arabic) edits this file only.

export const TERMS = {
  // Main currency (internal key: aether)
  currency: 'Oil',
  currencyIcon: '🛢️',
  // The clicker on the first tab (internal tab id: monolith)
  clicker: 'Oil Refinery',
  clickerTab: 'Refinery',
  clickerIcon: '🏭',
  // First prestige layer (internal: ascend(), ascensions, cosmicDust)
  reset1: 'Drill a New Well', // the action, on buttons
  reset1Noun: 'New Well', // one reset ("your first New Well")
  reset1Plural: 'New Wells',
  reset1Past: 'drilled a new well', // "you drilled a new well"
  reset1Currency: 'Crude Reserves',
  reset1CurrencyIcon: '🛢️',
  // Second prestige layer (internal: transcend(), transcendences, shards)
  reset2: 'Open a New Oil Field',
  reset2Noun: 'New Field',
  reset2Plural: 'New Fields',
  reset2Past: 'opened a new oil field',
  reset2Currency: 'Field Shares',
  reset2CurrencyIcon: '📜'
};
