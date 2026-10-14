// Dig: what the screen calls a road level. Chapter one says "Level 7 of 20"; chapter two (levels 21 to 40, the road home)
// says "Chapter 2, level 3 of 20", so the end of chapter one is a surprise and not a 40-level wall on day 1.
import * as G from '../../game.js';

export const levelText = level => { const L = G.levelOf(level); return G.t(L.ch === 2 ? 'ch2_level' : 'fin_next_level', L); };
