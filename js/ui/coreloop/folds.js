// Folded sections shared by the Expand and Collection screens (feel study R10). A fold is a
// <details>; this remembers what the player chose for the session and lets a screen open one for
// them once (a section that has just become ready), without fighting a tap that closes it again.
export function makeFold(el) {
  let last = el.open;       // the state we last set or saw; a toggle that differs is the player's
  let user;                 // undefined until the player (or popOpen) has decided
  el.addEventListener('toggle', () => {
    if (el.open !== last) { last = el.open; user = el.open; }
  });
  const set = (v) => { if (el.open === v) return; last = v; el.open = v; };
  return {
    el,
    get user() { return user; },
    // open or close by the screen's rule, unless the player has decided; `force` opens it
    // whatever the player chose (the one full card of a screen) without changing their choice
    resolve(auto, force) { set(force ? true : user === undefined ? !!auto : user); },
    // open it once for the player; it stays open until they close it
    popOpen() { user = true; set(true); },
    // the player's own decision, from code (a tap on a button that opens it)
    choose(v) { user = v; set(v); }
  };
}
