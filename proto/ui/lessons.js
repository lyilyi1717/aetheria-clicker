// Dig: lessons. A lesson is a first-sight note ("this is TNT, it chains"). It waits its turn, stays at least
// `min` seconds, longer for a long one (or until clicked), and counts as taught only once it was really shown that long.
// Pure logic, no DOM: app.js draws it. Ordinary toasts never touch it. Nothing here gates anything.
export const MIN_SHOW = 3, MAX_SHOW = 6, KEEP = 10;

// A long lesson stays long enough for a child to read it (art-and-sound decision 14): up to 30 letters keep the usual
// 3 to 6 s; each 15 letters more add 1 s to both, up to 6 s shown before the next may come (and 9 s at most).
export function readTime(text, min = MIN_SHOW, max = MAX_SHOW) {
  const extra = Math.min(3, Math.max(0, (String(text || '').length - 30) / 15));
  return { min: min + extra, max: max + extra };
}

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
      queue.push({ flag, text, kind, done: false, ...readTime(text, min, max) });
      return true;
    },
    has(flag) { return (cur && cur.flag === flag) || queue.some(q => q.flag === flag); },
    // blocked: a banner or a card is up; the lesson waits and its time does not count
    tick(dt, blocked = false) {
      if (!cur && queue.length && !blocked) { cur = queue.shift(); dwell = 0; }
      if (!cur || blocked) return;
      dwell += dt;
      if (dwell >= cur.min) taught();
      if (dwell >= cur.max || (dwell >= cur.min && queue.length)) cur = null;
    },
    click() { if (!cur) return false; taught(); cur = null; return true; },
    get current() { return cur; },
    get waiting() { return queue.length; },
    get history() { return hist.slice(); },
  };
}
