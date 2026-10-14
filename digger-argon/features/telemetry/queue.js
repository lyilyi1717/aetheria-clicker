// Dig feature: anonymous play data, the sending side without a page. Plain functions over injected parts (storage, fetch,
// clock), so a test runs them with fakes and no network. The page (ui.js) hands it real ones.
//
// What it keeps: a random player id made on the device (no account, no email), a consent switch (stored 'on' or 'off'; nothing stored means off), a start day, and a queue of
// rows waiting to go. What it never does: send from a test, sim, `?speed=` or local page (see telemetryGate), send when the
// switch is Off, or throw into the game (every call is guarded; offline simply leaves the rows queued, up to a cap).
export const TEL_TABLES = { tries: 'dig_tries', choices: 'dig_choices', pace: 'dig_pace', sessions: 'dig_sessions' };
export const TEL_KEYS = { consent: 'DIG_TELEMETRY', pid: 'DIG_PID', start: 'DIG_TEL_START', queue: 'DIG_TEL_Q', last: 'DIG_TEL_LAST' };
// batch = the most rows one request carries, per table: the server (supabase/dig_telemetry.sql, dig_guard) skips rows past these per player per
// minute, and a skipped row still answers 200, so the client would delete it. gapMs = one request per table per this long; the rest stays queued.
export const TEL_LIMITS = { perTable: 200, batch: { tries: 12, choices: 60, pace: 12, sessions: 6 }, gapMs: 60000 };

// May this page send at all? Only the published site; never a test, sim or speed-up run (players reach Dig through ?loop=3, so that one is allowed), never localhost or a bare IP,
// never an automated browser, unless the address carries ?telemetry=1.
export function telemetryGate({ hostname = '', protocol = '', search = '', webdriver = false } = {}) {
  const q = new URLSearchParams(search);
  if (q.get('telemetry') === '1') return true;
  if (protocol !== 'https:' && protocol !== 'http:') return false;
  for (const k of ['speed', 'test', 'sim']) if (q.has(k)) return false;
  if (webdriver) return false;
  const h = String(hostname).toLowerCase();
  if (!h || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.includes(':') || /^[0-9.]+$/.test(h)) return false;
  return h.includes('.');
}

const uuid = rand => {
  const h = []; for (let i = 0; i < 16; i++) h.push(Math.floor(rand() * 256));
  h[6] = (h[6] & 15) | 64; h[8] = (h[8] & 63) | 128;
  const x = h.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
};

// env: { store, fetch, url, key, ver, now (ms), rand, allowed }
export function createTelemetry(env) {
  const get = k => { try { return env.store.getItem(k); } catch { return null; } };
  const set = (k, v) => { try { env.store.setItem(k, v); } catch { /* a blocked store: nothing is kept */ } };
  const del = k => { try { env.store.removeItem(k); } catch { /* ignore */ } };
  let q = null, busy = false;
  const lastAt = {};                       // table -> when it last sent (this page only)

  const load = () => {
    if (q) return q;
    q = {};
    try { const o = JSON.parse(get(TEL_KEYS.queue) || '{}'); for (const t of Object.keys(TEL_TABLES)) q[t] = Array.isArray(o[t]) ? o[t] : []; } catch { for (const t of Object.keys(TEL_TABLES)) q[t] = []; }
    return q;
  };
  const save = () => { const n = size(); if (n) set(TEL_KEYS.queue, JSON.stringify(q)); else del(TEL_KEYS.queue); };
  const size = () => { load(); return Object.keys(TEL_TABLES).reduce((a, t) => a + q[t].length, 0); };

  const api = {
    // Off unless the player (or the share link) turned it on: a device that never chose counts as off (dig-design decision 16)
    consent: () => get(TEL_KEYS.consent) === 'on',
    // a ?share=1 link turns it on and stores that, unless this device was set to Off on purpose (that choice wins)
    applyShare(search = '') {
      let on = false; try { on = new URLSearchParams(search).get('share') === '1'; } catch { /* no flag */ }
      if (on && get(TEL_KEYS.consent) !== 'off') set(TEL_KEYS.consent, 'on');
      return api.consent();
    },
    // Off: nothing is sent and what waits is dropped; rows already sent stay
    setConsent(on) { if (on) set(TEL_KEYS.consent, 'on'); else { set(TEL_KEYS.consent, 'off'); q = {}; for (const t of Object.keys(TEL_TABLES)) q[t] = []; del(TEL_KEYS.queue); } },
    active: () => !!env.allowed && api.consent(),
    pid() {
      let id = get(TEL_KEYS.pid);
      if (!id || !/^[0-9a-f-]{36}$/.test(id)) { id = uuid(env.rand); set(TEL_KEYS.pid, id); }
      return id;
    },
    // days since this device started playing (the start is set the first time it is asked)
    days() {
      let st = Number(get(TEL_KEYS.start));
      if (!(st > 0)) { st = env.now(); set(TEL_KEYS.start, String(st)); }
      return Math.max(0, Math.round((env.now() - st) / 8640000) / 10);
    },
    size,
    queued: t => (load(), q[t].length),
    peek: () => (load(), q),
    // add a row for a table; the player, version and day are put on here
    add(table, row) {
      if (!TEL_TABLES[table] || !api.active()) return false;
      try {
        load();
        q[table].push({ pid: api.pid(), ver: String(env.ver).slice(0, 16), ...row, days: api.days() });
        if (q[table].length > TEL_LIMITS.perTable) q[table].splice(0, q[table].length - TEL_LIMITS.perTable);
        save();
        return true;
      } catch { return false; }
    },
    // send what waits: one request per table with rows, at most batch[table] rows and one per minute; the rest waits (the queue is capped). Offline or a server error keeps the rows; a refusal (4xx) drops them.
    async flush(keepalive = false) {
      if (busy || !api.active() || !size()) return 0;
      busy = true; let sent = 0;
      try {
        load();
        for (const t of Object.keys(TEL_TABLES)) {
          const rows = q[t].slice(0, TEL_LIMITS.batch[t]);
          if (!rows.length) continue;
          if (lastAt[t] !== undefined && env.now() - lastAt[t] < TEL_LIMITS.gapMs) continue;       // at most one send per table per minute
          lastAt[t] = env.now();
          let res;
          try {
            res = await env.fetch(`${env.url}/rest/v1/${TEL_TABLES[t]}`, {
              method: 'POST', keepalive,
              headers: { apikey: env.key, Authorization: `Bearer ${env.key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
              body: JSON.stringify(rows),
            }).catch(() => null);
          } catch { break; }                                    // offline: try again later
          if (res && (res.ok || (res.status >= 400 && res.status < 500))) { q[t].splice(0, rows.length); if (res.ok) sent += rows.length; save(); }
          else break;
        }
      } catch { /* never reaches the game */ } finally { busy = false; }
      return sent;
    },
    // when the page last went away, for "time away" on the next session
    markLast() { set(TEL_KEYS.last, String(env.now())); },
    awayBefore() { const l = Number(get(TEL_KEYS.last)); return l > 0 ? Math.max(0, Math.round((env.now() - l) / 1000)) : null; },
  };
  return api;
}
