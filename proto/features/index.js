// Dig: the list of features (rules side). One line per feature, kept in A to Z order.
// A feature registers itself when its module loads, and every registry sorts itself, so the order
// of these lines never changes the game. Adding a feature is one line here; nothing else is edited.
export * from './away/rules.js';
export * from './boss/rules.js';
export * from './chest/rules.js';
export * from './combo/rules.js';
export * from './crits/rules.js';
export * from './diggers/rules.js';
export * from './ground/rules.js';
export * from './museum/rules.js';
export * from './oil/rules.js';
export * from './ores/rules.js';
export * from './relics/rules.js';
export * from './shop/rules.js';
export * from './sites/rules.js';
export * from './tnt/rules.js';
