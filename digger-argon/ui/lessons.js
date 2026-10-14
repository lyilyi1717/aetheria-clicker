// Dig: lessons. A lesson is a first-sight note ("this is TNT, it chains"). It waits its turn, stays at least
// `min` seconds (or until clicked), and counts as taught only once it was really shown that long.
// Pure logic, no DOM: app.js draws it. Ordinary toasts never touch it. Nothing here gates anything.
export const MIN_SHOW = 3, MAX_SHOW = 6, KEEP = 10;

export function createLessons({ min = MIN_SHOW, max = MAX_SHOW, keep = KEEP, history = [], onTaught = () => {} } = {}) {
  const queue = [];
  const hist = history.slice(-keep);
  let cur = null, dwell = 0;
  const taught = () => {
    if (!cur || cur.done) return;
    cur.done = true;
    hist.push({ flag: cur.flag, text: cur.text, kind: cur.kind });
    while (hist.length > keep) hist.shift();
    onTaught(cur.flag);
  };
  return {
    // false when the same lesson already waits or is on show
    request(flag, text, kind = '') {
      if ((cur && cur.flag === flag) || queue.some(q => q.flag === flag)) return false;
      queue.push({ flag, text, kind, done: false });
      return true;
    },
    has(flag) { return (cur && cur.flag === flag) || queue.some(q => q.flag === flag); },
    // blocked: a banner or a card is up; the lesson waits and its time does not count
    tick(dt, blocked = false) {
      if (!cur && queue.length && !blocked) { cur = queue.shift(); dwell = 0; }
      if (!cur || blocked) return;
      dwell += dt;
      if (dwell >= min) taught();
      if (dwell >= max || (dwell >= min && queue.length)) cur = null;
    },
    click() { if (!cur) return false; taught(); cur = null; return true; },
    get current() { return cur; },
    get waiting() { return queue.length; },
    get history() { return hist.slice(); },
  };
}
