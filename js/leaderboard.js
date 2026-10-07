// Online leaderboard (Supabase REST, no SDK). Players sign in anonymously; the
// publishable key below is public by design. Database rules
// (supabase/leaderboard.sql, supabase/leaderboard_season2.sql) only let each player write
// their own row.
import { getIndexFloor } from './systems/CombatSystem.js';
import { getLifetimeTranscends } from './systems/ChronicleSystem.js';

const SUPABASE_URL = 'https://hutjfgbjjagqdjjeszqj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mxWGt9Ul4V2q4Wb0DEmV9Q_UhBH6T-f';
const SESSION_KEY = 'AETHERIA_LB_SESSION';
const PUSH_INTERVAL_MS = 60000;   // stats + heartbeat
const BOARD_REFRESH_MS = 30000;   // while the tab is open
const ONLINE_WINDOW_MS = 2 * 60 * 1000;
export const SEASON_PROBE_MS = 10 * 60 * 1000;  // how often to look for the Season 2 table while it is missing

// Seasons. Season 1 (public.leaderboard) ran on the pre-R8 Tower, where old saves keep floor
// records up to ~723k; it is frozen as a read-only Hall of Fame. Season 2 and later live in
// public.leaderboard_season, one row per (season, player), and rank the post-R8 floor
// (hero.indexFloor). Until the owner runs supabase/leaderboard_season2.sql that table does
// not exist, and the client keeps writing to and showing Season 1 as before.
const floorBoard = { id: 'floor', label: 'Max Floor', column: 'max_floor', value: r => `Floor ${r.max_floor.toLocaleString()}` };
const aetherBoard = { id: 'aether', label: 'Best Run Oil', column: 'aether_log10', value: r => r.aether_text };
const ascBoard = { id: 'ascensions', label: 'New Wells', column: 'ascensions', value: r => r.ascensions.toLocaleString() };
const transcendBoard = { id: 'transcends', label: 'New Fields', column: 'transcends', value: r => (r.transcends || 0).toLocaleString() };
const depthBoard = { id: 'depth', label: 'Max Depth', column: 'max_depth', value: r => `Depth ${r.max_depth.toLocaleString()}` };

export const CURRENT_SEASON = 2;
export const SEASONS = {
  1: {
    id: 1, label: 'Season 1 · Hall of Fame', table: 'leaderboard', filter: '', conflict: 'user_id',
    boards: [floorBoard, aetherBoard, ascBoard, depthBoard],
    cols: 'user_id,display_name,aether_log10,aether_text,max_floor,ascensions,max_depth,last_seen'
  },
  2: {
    id: 2, label: 'Season 2', table: 'leaderboard_season', filter: 'season=eq.2&', conflict: 'season,user_id',
    boards: [floorBoard, aetherBoard, ascBoard, transcendBoard, depthBoard],
    cols: 'user_id,display_name,aether_log10,aether_text,max_floor,ascensions,transcends,max_depth,last_seen'
  }
};
export const BOARDS = SEASONS[CURRENT_SEASON].boards;

// PostgREST answers 404 (code PGRST205, or 42P01 on older versions) for a table it doesn't know.
export async function isMissingTable(res) {
  if (res.status === 404) return true;
  if (res.status < 400) return false;
  try { const b = await res.clone().json(); return ['PGRST205', '42P01'].includes(b?.code); } catch { return false; }
}

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
    this.liveSeason = null;     // season we write to: CURRENT_SEASON once its table answers, 1 while it is missing
    this.seasonCheckedAt = 0;
    this.viewSeason = null;     // season on screen; null follows the live one
  }

  get name() { return this.gs.settings.lbName || ''; }

  // Season shown: the one picked in the switcher, never newer than the live one
  get shownSeason() {
    const live = this.liveSeason || 1;
    return this.viewSeason && this.viewSeason <= live ? this.viewSeason : live;
  }

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
    // Signed in to a player account (R38, js/engine/CloudSave.js): the row is the account's,
    // so it follows the player to every device. Signing out goes back to the guest player.
    const acct = await this.app.cloudSave?.activeSession();
    if (acct) {
      if (this.session?.user_id !== acct.user_id) await this.retireGuestRow(acct.user_id);
      this.session = { access_token: acct.access_token, user_id: acct.user_id, expires_at: acct.expires_at, account: true };
      return;
    }
    if (this.session?.account) this.session = loadSession();
    await this.ensureGuest();
  }

  async ensureGuest() {
    const s = this.session;
    if (s && s.access_token && Date.now() < s.expires_at - 60000) return;
    if (s && s.refresh_token) {
      try { await this.auth('token?grant_type=refresh_token', { refresh_token: s.refresh_token }); return; } catch { /* fall through to a fresh anonymous user */ }
    }
    await this.auth('signup', {});
  }

  // The guest row this browser posted before the player signed in would list them twice:
  // delete it (current season only; Season 1 is a frozen record). Needs the delete policy in
  // supabase/cloud_saves.sql; without it this is a no-op and the old row just stops updating.
  async retireGuestRow(accountId) {
    const guest = loadSession();
    if (!this.name || !guest?.refresh_token || guest.user_id === accountId) return;
    try {
      this.session = guest;
      if (Date.now() >= guest.expires_at - 60000) await this.auth('token?grant_type=refresh_token', { refresh_token: guest.refresh_token });
      const s = SEASONS[CURRENT_SEASON];
      await this.rest(`${s.table}?${s.filter}user_id=eq.${this.session.user_id}`, { method: 'DELETE', auth: true });
    } catch { /* best effort */ }
  }

  // --- REST -------------------------------------------------------------------------
  async rest(path, opts = {}) {
    const headers = { apikey: SUPABASE_KEY, ...(opts.headers || {}) };
    if (opts.auth) headers.Authorization = `Bearer ${this.session.access_token}`;
    return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers });
  }

  // Which season to write to. Once the Season 2 table answers we stay on it; while it is
  // missing we use Season 1 and look again every SEASON_PROBE_MS (or at once with force).
  async resolveSeason(force = false) {
    const now = Date.now();
    if (!force && this.liveSeason === CURRENT_SEASON) return this.liveSeason;
    if (!force && this.liveSeason === 1 && now - this.seasonCheckedAt < SEASON_PROBE_MS) return 1;
    const s = SEASONS[CURRENT_SEASON];
    const res = await this.rest(`${s.table}?select=user_id&${s.filter}limit=1`);
    if (res.ok) this.liveSeason = CURRENT_SEASON;
    else if (await isMissingTable(res)) this.liveSeason = 1;
    else throw new Error(`season ${res.status}`);
    this.seasonCheckedAt = now;
    return this.liveSeason;
  }

  seasonMissing() {
    this.liveSeason = 1;
    this.seasonCheckedAt = Date.now();
  }

  currentStats(season = this.liveSeason || 1) {
    const gs = this.gs;
    // Best single-run Aether (totalAetherEarned resets on Ascend), tracked in the save
    const runLog = bigLog10(gs.totalAetherEarned);
    if (runLog > (gs.stats.bestRunAetherLog10 || 0)) {
      gs.stats.bestRunAetherLog10 = runLog;
      gs.stats.bestRunAetherText = gs.totalAetherEarned.format('scientific', 2);
    }
    const stats = {
      display_name: this.name,
      aether_log10: gs.stats.bestRunAetherLog10 || 0,
      aether_text: gs.stats.bestRunAetherText || '0',
      max_floor: Math.max(1, gs.hero?.maxFloor || 1),
      ascensions: gs.ascensionCount || 0,
      max_depth: Math.max(1, gs.miningGrid?.maxDepth || 1)
    };
    if (season >= 2) {
      // Post-R8 floor: legacy saves keep maxFloor (up to ~723k) only as their Season 1 record
      stats.season = season;
      stats.max_floor = getIndexFloor(gs.hero);
      stats.transcends = getLifetimeTranscends(gs);   // every Chronicle's Transcends (R20)
    }
    return stats;
  }

  async postRow(season, version) {
    const s = SEASONS[season];
    const row = { user_id: this.session.user_id, ...this.currentStats(season), game_version: version,
      updated_at: new Date().toISOString(), last_seen: new Date().toISOString() };
    return this.rest(`${s.table}?on_conflict=${s.conflict}`, {
      method: 'POST', auth: true,
      headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(row)
    });
  }

  async push(version) {
    if (!this.name) return;
    await this.ensureSession();
    let season = await this.resolveSeason();
    let res = await this.postRow(season, version);
    if (!res.ok && season !== 1 && await isMissingTable(res)) {
      // The season table went away: keep the player on Season 1 rather than drop the update
      this.seasonMissing();
      res = await this.postRow(1, version);
    } else if (!res.ok && season === 1 && [401, 403].includes(res.status)) {
      // Season 1 was frozen since the last look, so Season 2 should be up now
      season = await this.resolveSeason(true);
      if (season !== 1) res = await this.postRow(season, version);
    }
    if (!res.ok) throw new Error(`save ${res.status}: ${(await res.text()).slice(0, 120)}`);
    this.lastPush = Date.now();
  }

  async fetchBoard() {
    await this.resolveSeason();
    const s = SEASONS[this.shownSeason];
    const b = s.boards.find(x => x.id === this.board) || s.boards[0];
    this.board = b.id;
    const res = await this.rest(`${s.table}?select=${s.cols}&${s.filter}order=${b.column}.desc,updated_at.asc&limit=50`);
    if (!res.ok) {
      if (s.id !== 1 && await isMissingTable(res)) { this.seasonMissing(); return this.fetchBoard(); }
      throw new Error(`load ${res.status}`);
    }
    this.rows = await res.json();
    this.rowsSeason = s.id;

    // "Playing now" counts heartbeats on the live season, whichever season is on screen
    const live = SEASONS[this.liveSeason || 1];
    const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
    const cnt = await this.rest(`${live.table}?select=user_id&${live.filter}last_seen=gte.${encodeURIComponent(since)}`, {
      method: 'HEAD', headers: { Prefer: 'count=exact' }
    });
    const range = cnt.headers.get('content-range');
    this.online = range ? parseInt(range.split('/')[1], 10) : null;
    // If the player switched season or board while this was loading, fetch again next tick
    this.lastFetch = s.id === this.shownSeason && b.id === this.board ? Date.now() : 0;
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
      <div id="lb-season-tabs" class="lb-board-tabs" hidden></div>
      <div id="lb-board-tabs" class="lb-board-tabs"></div>
      <div id="lb-table" class="lb-table"></div>
    `;
    document.getElementById('lb-name-input').value = this.name;
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.id === 'lb-name-save') {
        this.setName(document.getElementById('lb-name-input').value, this.app.version);
      } else if (btn.dataset.season) {
        const season = Number(btn.dataset.season);
        if (season === this.shownSeason) return;
        this.viewSeason = season;
        this.rows = [];
        this.lastFetch = 0;
        this.render();
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
    const shown = SEASONS[this.shownSeason];
    const live = this.liveSeason || 1;

    // Season switcher: only once there is more than one season to show
    const seasonTabs = document.getElementById('lb-season-tabs');
    seasonTabs.hidden = live < 2;
    if (live >= 2) {
      const ids = Object.keys(SEASONS).map(Number).filter(id => id <= live).sort((a, b) => b - a);
      seasonTabs.innerHTML = ids.map(id => `<button class="btn-action lb-board-btn lb-season-btn ${id === shown.id ? 'active' : ''}" data-season="${id}">${SEASONS[id].label}</button>`).join('');
    }
    const board = shown.boards.find(x => x.id === this.board) || shown.boards[0];
    document.getElementById('lb-board-tabs').innerHTML = shown.boards
      .map(b => `<button class="btn-action lb-board-btn ${b.id === board.id ? 'active' : ''}" data-board="${b.id}">${b.label}</button>`).join('');

    const statusEl = document.getElementById('lb-status');
    statusEl.textContent = this.status
      || (shown.id < live ? `${shown.label.split(' · ')[0]} has ended. These are its final standings.`
        : this.name ? `Playing as ${this.name}. Your stats update every minute.` : 'Pick a display name to join the leaderboard.');
    const onlineEl = document.getElementById('lb-online');
    onlineEl.textContent = this.online == null ? '' : `🟢 ${this.online} playing now`;

    const me = this.session?.user_id;
    if (!this.rows.length || this.rowsSeason !== shown.id) {
      table.innerHTML = `<div class="lb-empty">${this.lastFetch && this.rowsSeason === shown.id ? 'No players yet. Be the first!' : 'Loading…'}</div>`;
      return;
    }
    const onlineCut = Date.now() - ONLINE_WINDOW_MS;
    table.innerHTML = this.rows.map((r, i) => `
      <div class="lb-row ${r.user_id === me ? 'me' : ''}">
        <span class="lb-rank">${i + 1}</span>
        <span class="lb-name">${new Date(r.last_seen).getTime() >= onlineCut ? '<span class="lb-dot" title="Playing now"></span>' : ''}${escapeHtml(r.display_name)}</span>
        <span class="lb-value">${escapeHtml(board.value(r))}</span>
      </div>
    `).join('');
  }
}
