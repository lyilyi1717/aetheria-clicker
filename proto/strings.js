// Dig prototype: every word the player reads, in one place, so it can be translated
// (Arabic later: add an `ar` table with the same keys and switch on the page's lang).
const en = {
  title: 'Dig',
  tagline: 'There is treasure under the sand.',
  hint_start: 'Hold the mouse on the ground to dig',
  coins: 'Coins',
  depth: '{n} m',
  goal_rock: 'The Big Rock is at {n} m',
  goal_boss: 'Break the Big Rock!',
  goal_site: 'New: you can move to a New Site (on the left).',
  combo: 'Combo x{n}',
  rush: 'Oil rush! Hits x3',

  shop: 'Shop',
  up_pick: 'Stronger Pick', up_pick_d: 'Your hit: {a} → {b}',
  up_crew: 'Hire a Digger', up_crew_d: 'Digs by himself, also while you are away. You have {a}.',
  up_crewPow: 'Digger Training', up_crewPow_d: 'Each digger hit: {a} → {b}',
  up_luck: 'Lucky Sieve', up_luck_d: 'All coins +10%. Now +{a}%.',
  maxed: 'Full',
  locked_crew: 'Opens when you have dug a little.',
  locked_more: 'More opens as you go deeper.',

  relics: 'Relics', relics_none: 'Find a chest. Each chest lets you pick 1 of 3 relics.',
  lv: 'Lv {n}',
  r_boom: 'Boom Pick', r_boom_d: 'Every {n}th hit explodes.',
  r_vein: 'Vein Popper', r_vein_d: 'Break one ore and its neighbours of the same kind pop too.',
  r_lucky: 'Lucky Hand', r_lucky_d: 'Big hits come more often (+7%).',
  r_heavy: 'Heavy Hand', r_heavy_d: 'Big hits are bigger (+3x).',
  r_deep: 'Long Pick', r_deep_d: 'Your hit also strikes the block below.',
  r_wide: 'Wide Swing', r_wide_d: 'Your hit also strikes left and right.',
  r_bang: 'Big Bang', r_bang_d: 'TNT blasts are bigger, and there is more TNT.',
  r_karak: 'Karak Tea', r_karak_d: 'Diggers work 50% faster.',
  r_shiny: 'Shiny Eye', r_shiny_d: 'Ore and gems pay 40% more.',
  r_streak: 'Hot Streak', r_streak_d: 'Your combo climbs faster.',
  r_nose: 'Treasure Nose', r_nose_d: 'Chests turn up more often.',
  r_lamp: 'Lantern', r_lamp_d: 'See one block further into the dark.',
  r_echo: 'Echo', r_echo_d: 'Sometimes your hit lands twice.',

  chest_title: 'A chest! Pick one',
  chest_more: '{n} more chests after this',
  chest_btn: 'Open chest',
  chest_new: 'New', chest_up: 'Level {n}',
  take: 'Take',

  museum: 'Museum', museum_none: 'Old bones are buried deeper. A full set pays for ever.',
  set_camel: 'Old Camel', set_whale: 'Sand Whale', set_djinn: 'Lamp of the Djinn',
  set_bonus: 'Full set: all coins +25%',
  set_done: 'Done: +25% coins',
  set_locked: 'Deeper down',

  t_chest_seen: 'A chest! Dig your way to it.',
  t_chest_crew: 'Your diggers found a chest.',
  t_tnt: 'TNT! It blows up the blocks around it.',
  t_fossil_new: 'New bone for the Museum: {set}',
  t_fossil_dup: 'A bone you already have: sold for {n} coins',
  t_set: '{set} is complete! All coins +25% for ever.',
  t_gusher: 'Oil! +{n} coins',
  t_layer: 'New ground: {name}',
  t_boss: 'The Big Rock! Hit the glowing crack: 3 times the damage.',
  t_digger: 'A digger joins. He never stops.',
  t_combo: 'Combo x{n}!',
  boss_down: 'The Big Rock is broken!',
  boss_down_sub: '+{n} coins and a chest. New ground below.',
  layer_1: 'Red Clay', layer_2: 'Blue Slate', layer_3: 'The Deep', layer_0: 'Sand',

  away_title: 'Your diggers kept going',
  away_line: 'You were away {t}.',
  away_coins: '+{n} coins',
  away_metres: '{n} m deeper',
  away_chests: '{n} chests to open', away_chest1: '1 chest to open',
  away_boss: 'They reached the Big Rock and wait for you.',
  away_ok: 'Back to the dig',

  site_title: 'New Site',
  site_d: 'Pack up and dig somewhere new. You start at the top with a new shop and new relics.',
  site_get: 'You get: {n} Stars. Each Star: coins +20%, hits +10%, for ever.',
  site_keep: 'You keep: Stars and the Museum.',
  site_btn: 'Move: +{n} Stars',
  site_pick: 'Where do you dig next?', site_stay: 'Not yet. Keep digging here.',
  site_now: 'You are at: {name}',
  site_dunes: 'The Dunes', site_dunes_d: 'Plain sand. Nothing strange.',
  site_boom: 'Powder Valley', site_boom_d: 'TNT everywhere. The rock is a little harder.',
  site_gold: 'Golden Wadi', site_gold_d: 'Twice the ore. Harder rock, fewer chests.',
  site_bones: 'Valley of Beasts', site_bones_d: 'Bones and chests everywhere. Harder rock.',
  site_wait: 'Break the second Big Rock (50 m) to open this.',
  site_done: 'A new site! You now have {n} Stars.',
  stars: 'Stars',

  mute: 'Sound: on', unmute: 'Sound: off',
  auto_on: 'Auto dig: on (A)', auto_off: 'Auto dig: off (A)',
  reset: 'Start over', reset_sure: 'Click again to wipe this save',
  footer: 'A prototype of a new game. It has its own save and does not touch your Aetheria save.',
  min: '{n} min', hours: '{h} h {m} min',
};

export function t(key, vars) {
  let s = en[key];
  if (s === undefined) return key;
  if (vars) for (const k of Object.keys(vars)) s = s.replace(`{${k}}`, vars[k]);
  return s;
}

export function fmt(n) {
  if (!isFinite(n)) return '0';
  if (n < 1000) return String(Math.floor(n));
  const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi'];
  let u = -1;
  while (n >= 1000 && u < units.length - 1) { n /= 1000; u++; }
  return (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)) + units[u];
}
