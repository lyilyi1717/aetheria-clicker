// Dig: the rules, as one import. Tests, sims and the page all use this:
//   import * as G from './proto/game.js'
// The core is in proto/core/, every feature in proto/features/<id>/. See proto/README.md.
export * from './core/rng.js';
export * from './core/registry.js';
export * from './core/grid.js';
export * from './core/rules.js';
export * from './core/state.js';
export * from './core/strings.js';
export * from './core/tuning.js';
export * from './features/index.js';
// the old names of two tables
export { BLOCKS as TYPES, ITEMS as UPGRADES } from './core/registry.js';
export { MAX_SITE_DEPTH, MAX_LEGS } from './core/rules.js';

