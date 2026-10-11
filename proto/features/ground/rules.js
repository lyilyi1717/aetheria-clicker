// Dig feature: the plain ground. Dirt, stone and hard rock, the four layers of the desert, and the dark.
import { use } from '../../core/registry.js';
import strings from './strings.js';

export const ground = use({
  id: 'ground',
  strings,
  // hp and coin multipliers by block kind (times the depth curves in core/grid.js)
  blocks: {
    dirt:  { at: 10, hp: 1, val: 1, soft: true },
    stone: { at: 20, hp: 3, val: 1.6, soft: true, base: { at: 20, upTo: c => 0.055 + 0.16 + 0.03 * c.L } },
    hard:  { at: 30, hp: 8, val: 4, base: { at: 30, upTo: c => (c.r >= 10 ? 0.25 + 0.03 * c.L + 0.035 + 0.01 * c.L : -1) } },
  },
  // look: the colours the canvas uses. ores: the chance edges for copper, silver, gold, gem (each layer one step richer).
  layers: [
    { id: 'sand',  at: 10, name: 'layer_0', look: { dirt: '#dba65a', stone: '#a79a86', hard: '#5d5348', back: '#5a3d22' }, ores: [0.86, 0.99, 1.0, 1.0] },
    { id: 'clay',  at: 20, name: 'layer_1', look: { dirt: '#c0673f', stone: '#96807a', hard: '#4f3f3f', back: '#4a2418' }, ores: [0.55, 0.88, 0.985, 1.0] },
    { id: 'slate', at: 30, name: 'layer_2', look: { dirt: '#5f86a3', stone: '#7b8c98', hard: '#33414d', back: '#1f3242' }, ores: [0.3, 0.7, 0.94, 1.0] },
    { id: 'deep',  at: 40, name: 'layer_3', look: { dirt: '#8a62b0', stone: '#857a9c', hard: '#3a2f4d', back: '#2a1b3f' }, ores: [0.15, 0.5, 0.86, 1.0] },
  ],
  relics: {
    lamp: { at: 130, max: 2, mods: { sight: (v, s) => v + s.relics.lamp } },   // see further into the ground
  },
});
