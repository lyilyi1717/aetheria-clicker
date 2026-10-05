// Online leaderboard (Supabase REST, no SDK). Players sign in anonymously; the
// publishable key below is public by design. Database rules
// (supabase/leaderboard.sql) only let each player write their own row.

const SUPABASE_URL = 'https://hutjfgbjjagqdjjeszqj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mxWGt9Ul4V2q4Wb0DEmV9Q_UhBH6T-f';
const SESSION_KEY = 'AETHERIA_LB_SESSION';
const PUSH_INTERVAL_MS = 60000;   // stats + heartbeat
const BOARD_REFRESH_MS = 30000;   // while the tab is open
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export const BOARDS = [
  { id: 'floor', label: 'Max Floor', column: 'max_floor', value: r => `Floor ${r.max_floor.toLocaleString()}` },
  { id: 'aether', label: 'Best Run Aether', column: 'aether_log10', value: r => r.aether_text },
  { id: 'ascensions', label: 'Ascensions', column: 'ascensions', value: r => r.ascensions.toLocaleString() },
  { id: 'depth', label: 'Max Depth', column: 'max_depth', value: r => `Depth ${r.max_depth.toLocaleString()}` }
];

const BLOCKED_WORDS = ['fuck', 'shit', 'cunt', 'nigg', 'fag', 'bitch', 'rape', 'nazi', 'hitler', 'whore', 'slut', 'retard'];

export function validateName(name) {
  const n = (name || '').trim();
  if (n.length < 3 || n.length > 20) return 'Name must be 3–20 characters.';
  if (!/^[A-Za-z0-9 _-]+$/.test(n)) return 'Use only letters, numbers, spaces, _ and -.';
  const flat = n.toLowerCase().replace(/[^a-z]/g, '');
  if (BLOCKED_WORDS.some(w => flat.includes(w))) return 'Please choose a different name.';
  return null;
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch { return null; }
}
function saveSession(s) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch { /* private mode: session lasts this page load */ }
}

function bigLog10(b) {
  if (!b || b.m <= 0) return 0;
  return b.e + Math.log10(b.m);
}

export class Leaderboard {
  constructor(app) {
    this.app = app;
    this.gs = app.gameState;
    this.session = loadSession();
    this.board = 'floor';
    this.rows = [];
    this.online = null;
    this.status = '';
    this.lastPush = 0;
    this.lastFetch = 0;
    this.busy = false;
  }

  get name() { return this.gs.settings.lbName || ''; }

  // --- Auth -------------------------------------------------------------------------
  async auth(path, body) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`auth ${res.status}`);
    const d = await res.json();
    this.session = {
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expires_at: Date.now() + (d.expires_in || 3600) * 1000,
      user_id: d.user?.id
    };
    saveSession(this.session);
  }

  async ensureSession() {
    const s = this.session;
    if (s && s.access_token && Date.now() < s.expires_at - 60000) return;
    if (s && s.refresh_token) {
      try { await this.auth('token?grant_type=refresh_token', { refresh_token: s.refresh_token }); return; } catch { /* fall through to a fresh anonymous user */ }
    }
    await this.auth('signup', {});
  }

  // --- REST -------------------------------------------------------------------------
  async rest(path, opts = {}) {
    const headers = { apikey: SUPABASE_KEY, ...(opts.headers || {}) };
    if (opts.auth) headers.Authorization = `Bearer ${this.session.access_token}`;
    return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers });
  }

  currentStats() {
    const gs = this.gs;
    // Best single-run Aether (totalAetherEarned resets on Ascend), tracked in the save
    const runLog = bigLog10(gs.totalAetherEarned);
    if (runLog > (gs.stats.bestRunAetherLog10 || 0)) {
      gs.stats.bestRunAetherLog10 = runLog;
      gs.stats.bestRunAetherText = gs.totalAetherEarned.format('scientific', 2);
    }
    return {
      display_name: this.name,
      aether_log10: gs.stats.bestRunAetherLog10 || 0,
      aether_text: gs.stats.bestRunAetherText || '0',
      max_floor: Math.max(1, gs.hero?.maxFloor || 1),
      ascensions: gs.ascensionCount || 0,
      max_depth: Math.max(1, gs.miningGrid?.maxDepth || 1)
    };
  }

  async push(version) {
    if (!this.name) return;
    await this.ensureSession();
    const row = { user_id: this.session.user_id, ...this.currentStats(), game_version: version,
      updated_at: new Date().toISOString(), last_seen: new Date().toISOString() };
    const res = await this.rest('leaderboard?on_conflict=user_id', {
      method: 'POST', auth: true,
      headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(row)
    });
    if (!res.ok) throw new Error(`save ${res.status}: ${(await res.text()).slice(0, 120)}`);
    this.lastPush = Date.now();
  }

  async fetchBoard() {
    const b = BOARDS.find(x => x.id === this.board);
    const cols = 'user_id,display_name,aether_log10,aether_text,max_floor,ascensions,max_depth,last_seen';
    const res = await this.rest(`leaderboard?select=${cols}&order=${b.column}.desc,updated_at.asc&limit=50`);
    if (!res.ok) throw new Error(`load ${res.status}`);
    this.rows = await res.json();

    const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
    const cnt = await this.rest(`leaderboard?select=user_id&last_seen=gte.${encodeURIComponent(since)}`, {
      method: 'HEAD', headers: { Prefer: 'count=exact' }
    });
    const range = cnt.headers.get('content-range');
    this.online = range ? parseInt(range.split('/')[1], 10) : null;
    this.lastFetch = Date.now();
  }

  // --- Background loop (called from the render tick) ---------------------------------
  tick(isTabOpen, version) {
    if (this.busy) return;
    const now = Date.now();
    const needPush = this.name && now - this.lastPush >= PUSH_INTERVAL_MS;
    const needFetch = isTabOpen && now - this.lastFetch >= BOARD_REFRESH_MS;
    if (!needPush && !needFetch) return;
    this.busy = true;
    (async () => {
      try {
        if (needPush) await this.push(version);
        if (needFetch) await this.fetchBoard();
        this.status = '';
      } catch (e) {
        this.status = `Leaderboard offline (${e.message}). Retrying shortly.`;
        this.lastPush = this.lastFetch = now - Math.max(PUSH_INTERVAL_MS, BOARD_REFRESH_MS) + 15000;
      } finally {
        this.busy = false;
        this.render();
      }
    })();
  }

  async setName(name, version) {
    const err = validateName(name);
    if (err) { this.status = err; this.render(); return; }
    this.gs.settings.lbName = name.trim();
    this.app.saveManager.save();
    this.status = 'Saving…';
    this.render();
    this.lastPush = 0;
    this.lastFetch = 0;
  }

  // --- UI ---------------------------------------------------------------------------
  build() {
    const root = document.getElementById('leaderboard-root');
    if (!root) return;
    root.innerHTML = `
      <div class="lb-name-row">
        <label for="lb-name-input">Your display name</label>
        <input id="lb-name-input" type="text" maxlength="20" placeholder="3–20 letters, numbers, _ -" autocomplete="off">
        <button id="lb-name-save" class="btn-action">Save &amp; Join</button>
        <span id="lb-online" class="lb-online"></span>
      </div>
      <div id="lb-status" class="lb-status"></div>
      <div class="lb-board-tabs">
        ${BOARDS.map(b => `<button class="btn-action lb-board-btn" data-board="${b.id}">${b.label}</button>`).join('')}
      </div>
      <div id="lb-table" class="lb-table"></div>
    `;
    document.getElementById('lb-name-input').value = this.name;
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.id === 'lb-name-save') {
        this.setName(document.getElementById('lb-name-input').value, this.app.version);
      } else if (btn.dataset.board) {
        this.board = btn.dataset.board;
        this.lastFetch = 0;
        this.render();
      }
    });
    document.getElementById('lb-name-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('lb-name-save').click();
    });
    this.render();
  }

  render() {
    const table = document.getElementById('lb-table');
    if (!table) return;
    document.querySelectorAll('.lb-board-btn').forEach(b => b.classList.toggle('active', b.dataset.board === this.board));
    const statusEl = document.getElementById('lb-status');
    statusEl.textContent = this.status || (this.name ? `Playing as ${this.name}. Your stats update every minute.` : 'Pick a display name to join the leaderboard.');
    const onlineEl = document.getElementById('lb-online');
    onlineEl.textContent = this.online == null ? '' : `🟢 ${this.online} playing now`;

    const b = BOARDS.find(x => x.id === this.board);
    const me = this.session?.user_id;
    if (!this.rows.length) {
      table.innerHTML = `<div class="lb-empty">${this.lastFetch ? 'No players yet. Be the first!' : 'Loading…'}</div>`;
      return;
    }
    const onlineCut = Date.now() - ONLINE_WINDOW_MS;
    table.innerHTML = this.rows.map((r, i) => `
      <div class="lb-row ${r.user_id === me ? 'me' : ''}">
        <span class="lb-rank">${i + 1}</span>
        <span class="lb-name">${new Date(r.last_seen).getTime() >= onlineCut ? '<span class="lb-dot" title="Playing now"></span>' : ''}${escapeHtml(r.display_name)}</span>
        <span class="lb-value">${escapeHtml(b.value(r))}</span>
      </div>
    `).join('');
  }
}
