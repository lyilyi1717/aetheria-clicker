// Dig feature: Rafeeq moods. LOOKS ONLY. This file has no state and changes no number; it exists so the
// strings are registered and so other features have one call to make a Rafeeq feel something.
//
// FOR OTHER FEATURES (from your own rules.js, no page code needed):
//   import { moodsPoke } from '../moods/rules.js';
//   moodsPoke(s, ev, 'wet', { r, c });          // the Rafeeq nearest to that block
//   moodsPoke(s, ev, 'cold');                   // every Rafeeq
//   moodsPoke(s, ev, 'scared', { who: 0 });     // Rafeeq number 0 (s.diggers[0])
// Moods you can poke: angry kick happy rich laugh sooty tea doze guilty scared dizzy proud cold wet.
// An optional { secs } sets how long it lasts. From page code you can also `app.fire('mood', {...})`.
// It only emits the 'mood' event; moods/ui.js draws it. Nothing here touches the dig.
import { use, emit } from '../../core/registry.js';
import strings from './strings.js';

export const moods = use({ id: 'moods', strings });

export function moodsPoke(s, ev, mood, where = {}) { emit(s, ev, 'mood', { mood, ...where }); }
