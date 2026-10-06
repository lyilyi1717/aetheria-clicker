// Cloud save and player accounts (R38). Supabase Auth (Google OAuth, email + password) and
// one row per account in public.saves (supabase/cloud_saves.sql, Row Level Security: a
// player only ever reads or writes their own row). REST only, no SDK, like js/leaderboard.js.
//
// Playing without an account is unchanged: nothing here runs until the player signs in.
// The cloud holds the same JSON the game keeps in localStorage (GameState.serialize()), so a
// downloaded save loads through deserialize + migrations like any local one.
//
// Never silently overwrite: uploads are compare-and-swap on saved_at (the cloud copy must be
// the one this device last synced). When the cloud changed elsewhere, decideSync() returns
// 'conflict' and the UI asks "Keep this device / Keep cloud".
import { BigNum } from './BigNum.js';

// Same project as the leaderboard. The publishable key is public by design.
export const SUPABASE_URL = 'https://hutjfgbjjagqdjjeszqj.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_mxWGt9Ul4V2q4Wb0DEmV9Q_UhBH6T-f';

const SESSION_KEY = 'AETHERIA_ACCOUNT_SESSION';
const SYNC_KEY = 'AETHERIA_CLOUD_SYNC';       // { userId, cloudSavedAt }: the cloud copy this device last matched
const PKCE_KEY = 'AETHERIA_PKCE_VERIFIER';
export const AUTO_SYNC_MS = 3 * 60 * 1000;    // background upload while signed in
const KEEPALIVE_MAX_BYTES = 60000;            // browsers cap keepalive request bodies at 64 KB

// --- Pure helpers (unit-tested in test_cloud_save.js) -----------------------------------

const log10Of = (j) => {
  const b = BigNum.fromJSON(j);
  return b.m > 0 ? b.e + Math.log10(b.m) : 0;
};

// A save with nothing worth keeping: a brand-new game or one just wiped. Downloading over it
// loses nothing, and uploading it never replaces real progress without asking.
export function isFreshSave(data) {
  if (!data || typeof data !== 'object') return true;
  if ((data.ascensionCount || 0) > 0 || (data.transcendenceCount || 0) > 0) return false;
  if ((data.hero?.maxFloor || 1) > 1) return false;
  return log10Of(data.totalAetherEarned) < 4;   // under 10,000 Aether this run
}

// What the keep-device / keep-cloud prompt shows for each side
export function summarizeSave(data) {
  const d = data && typeof data === 'object' ? data : {};
  const floor = Number(d.hero?.indexFloor ?? d.hero?.maxFloor);
  return {
    savedAt: Number(d.savedAt) || 0,
    ascensions: d.ascensionCount || 0,
    transcends: d.transcendenceCount || 0,
    floor: Number.isFinite(floor) && floor >= 1 ? Math.floor(floor) : 1,
    depth: Math.max(1, Number(d.mining?.maxDepth) || 1),
    dust: BigNum.fromJSON(d.totalCosmicDust),
    runAether: BigNum.fromJSON(d.totalAetherEarned),
    fresh: isFreshSave(d)
  };
}

// local: the save on this device (raw JSON). cloud: { savedAt, data } or null when the
// account has no cloud save yet. sync: what this device last matched ({ userId, cloudSavedAt }).
// Returns 'upload' | 'download' | 'in-sync' | 'conflict'.
export function decideSync(local, cloud, sync, userId) {
  if (!cloud) return 'upload';
  const localAt = Number(local?.savedAt) || 0;
  if (localAt && localAt === cloud.savedAt) return 'in-sync';
  const localFresh = isFreshSave(local);
  const cloudFresh = isFreshSave(cloud.data);
  const cloudUnchanged = !!sync && sync.userId === userId && sync.cloudSavedAt === cloud.savedAt;
  // The cloud is the copy this device last synced: local is simply newer. Still ask before a
  // fresh (wiped or brand-new) game replaces real progress.
  if (cloudUnchanged) return localFresh && !cloudFresh ? 'conflict' : 'upload';
  if (localFresh && !cloudFresh) return 'download';
  if (cloudFresh) return 'upload';
  return 'conflict';
}

// Tokens or errors that Supabase Auth puts in the URL after Google sign-in, an email
// confirmation link or a password-reset link. Returns null when the URL carries none.
export function parseAuthCallback(href) {
  let u;
  try { u = new URL(href); } catch { return null; }
  const hash = new URLSearchParams(u.hash.replace(/^#/, ''));
  const query = u.searchParams;
  const err = hash.get('error_description') || query.get('error_description') || hash.get('error') || query.get('error');
  if (err) return { kind: 'error', error: err.replace(/\+/g, ' ') };
  if (hash.get('access_token')) {
    return {
      kind: 'tokens',
      type: hash.get('type') || '',
      access_token: hash.get('access_token'),
      refresh_token: hash.get('refresh_token') || '',
      expires_in: Number(hash.get('expires_in')) || 3600
    };
  }
  if (query.get('code')) return { kind: 'code', code: query.get('code') };
  return null;
}

// The URL without auth parameters, for history.replaceState after a callback
export function cleanCallbackUrl(href) {
  const u = new URL(href);
  for (const k of ['code', 'error', 'error_code', 'error_description']) u.searchParams.delete(k);
  u.hash = '';
  return u.toString();
}

const AUTH_MESSAGES = {
  invalid_credentials: 'Wrong email or password.',
  email_not_confirmed: 'Please confirm your email first: open the link we sent you.',
  user_already_exists: 'That email already has an account. Log in instead.',
  email_exists: 'That email already has an account. Log in instead.',
  weak_password: 'Please choose a longer password (at least 6 characters).',
  over_email_send_rate_limit: 'Too many emails sent. Please wait a minute and try again.',
  over_request_rate_limit: 'Too many attempts. Please wait a minute and try again.',
  validation_failed: 'Please check the email address.',
  signup_disabled: 'New accounts are switched off right now.',
  provider_disabled: 'Google sign-in is not switched on yet. Use email and password for now.'
};

// Player-readable text for a Supabase Auth error body
export function authErrorMessage(body, status) {
  const code = body?.error_code || body?.code;
  if (code && AUTH_MESSAGES[code]) return AUTH_MESSAGES[code];
  const msg = body?.msg || body?.error_description || body?.message || body?.error;
  if (typeof msg === 'string' && /provider is not enabled/i.test(msg)) return AUTH_MESSAGES.provider_disabled;
  if (typeof msg === 'string' && msg) return msg;
  return `Sign-in failed (${status || 'network'}).`;
}

function base64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function pkcePair() {
  const raw = new Uint8Array(48);
  crypto.getRandomValues(raw);
  const verifier = base64url(raw);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: base64url(new Uint8Array(digest)) };
}

class AuthError extends Error {}

// --- Client -----------------------------------------------------------------------------

export class CloudSave {
  // saveManager: SaveManager (load/save/applySaveData). Everything else is injectable for tests.
  constructor(saveManager, { fetchFn, storage, now, url = SUPABASE_URL, key = SUPABASE_KEY } = {}) {
    this.saveManager = saveManager;
    this.fetch = fetchFn || ((...a) => globalThis.fetch(...a));
    this.storage = storage || globalThis.localStorage;
    this.now = now || (() => Date.now());
    this.url = url;
    this.key = key;
    this.session = this.read(SESSION_KEY);
    this.status = 'idle';        // idle | syncing | ok | conflict | error
    this.message = '';
    this.conflict = null;        // { local, cloud } while the player has to choose
    this.paused = false;         // "Decide later": no uploads until the player picks a side
    this.lastCloudAt = 0;        // when this device last uploaded or confirmed the cloud copy
    this.needsNewPassword = false;
    this.busy = null;
    this.listeners = new Set();
  }

  // --- storage ---
  read(k) { try { return JSON.parse(this.storage.getItem(k)) || null; } catch { return null; } }
  write(k, v) {
    try { v == null ? this.storage.removeItem(k) : this.storage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ }
  }

  get signedIn() { return !!this.session?.access_token; }
  get email() { return this.session?.email || ''; }
  get provider() { return this.session?.provider || 'email'; }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { for (const fn of this.listeners) { try { fn(this); } catch (e) { console.error(e); } } }
  setStatus(status, message = '') { this.status = status; this.message = message; this.emit(); }

  get syncRecord() { return this.read(SYNC_KEY); }
  setSyncRecord(cloudSavedAt) {
    this.write(SYNC_KEY, { userId: this.session?.user_id, cloudSavedAt });
    this.lastCloudAt = this.now();
  }

  // --- auth REST ---
  async authFetch(path, { method = 'POST', body, token } = {}) {
    const headers = { apikey: this.key, 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    let res;
    try {
      res = await this.fetch(`${this.url}/auth/v1/${path}`, { method, headers, body: body == null ? undefined : JSON.stringify(body) });
    } catch {
      throw new AuthError('Could not reach the server. Check your connection.');
    }
    let data = null;
    try { data = await res.json(); } catch { /* empty body */ }
    if (!res.ok) {
      const e = new AuthError(authErrorMessage(data, res.status));
      e.status = res.status;
      throw e;
    }
    return data;
  }

  setSession(d, extra = {}) {
    const user = d.user || {};
    this.session = {
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expires_at: this.now() + (d.expires_in || 3600) * 1000,
      user_id: user.id || this.session?.user_id,
      email: user.email || this.session?.email || '',
      provider: user.app_metadata?.provider || this.session?.provider || 'email',
      ...extra
    };
    this.write(SESSION_KEY, this.session);
    this.emit();
  }

  clearSession() {
    this.session = null;
    this.write(SESSION_KEY, null);
    this.conflict = null;
    this.paused = false;
    this.needsNewPassword = false;
    this.status = 'idle';
    this.message = '';
    this.emit();
  }

  // Which sign-in methods the project has switched on ({ google, email }). Null if unknown.
  async providers() {
    try {
      const d = await this.authFetch('settings', { method: 'GET' });
      return { google: !!d?.external?.google, email: d?.external?.email !== false };
    } catch { return null; }
  }

  redirectUrl() {
    const l = globalThis.location;
    return l ? `${l.origin}${l.pathname}` : this.url;
  }

  // Returns true when the account is signed in now; false when the player must confirm by email.
  async signUp(email, password) {
    const d = await this.authFetch(`signup?redirect_to=${encodeURIComponent(this.redirectUrl())}`, { body: { email, password } });
    if (d?.access_token) { this.setSession(d); return true; }
    // Email confirmation is on. Supabase answers "success" for an existing confirmed address
    // too (no identities) so it doesn't leak which emails have accounts.
    return false;
  }

  async signIn(email, password) {
    this.setSession(await this.authFetch('token?grant_type=password', { body: { email, password } }));
  }

  async resetPassword(email) {
    await this.authFetch(`recover?redirect_to=${encodeURIComponent(this.redirectUrl())}`, { body: { email } });
  }

  async setNewPassword(password) {
    const s = await this.activeSession();
    if (!s) throw new AuthError('Your reset link expired. Ask for a new one.');
    await this.authFetch('user', { method: 'PUT', token: s.access_token, body: { password } });
    this.needsNewPassword = false;
    this.emit();
  }

  // Google: the browser leaves the page and comes back with ?code=... (PKCE)
  async googleUrl() {
    const { verifier, challenge } = await pkcePair();
    this.write(PKCE_KEY, verifier);
    return `${this.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(this.redirectUrl())}`
      + `&code_challenge=${challenge}&code_challenge_method=s256`;
  }

  // Finish a sign-in that came back through the URL. Returns { signedIn, error, recovery }.
  async handleCallback(href) {
    const cb = parseAuthCallback(href);
    if (!cb) return null;
    if (cb.kind === 'error') return { error: authErrorMessage({ msg: cb.error }) };
    try {
      if (cb.kind === 'code') {
        const verifier = this.read(PKCE_KEY);
        this.write(PKCE_KEY, null);
        if (!verifier) return null;   // not our redirect
        this.setSession(await this.authFetch('token?grant_type=pkce', { body: { auth_code: cb.code, code_verifier: verifier } }));
      } else {
        this.setSession({ access_token: cb.access_token, refresh_token: cb.refresh_token, expires_in: cb.expires_in });
        const user = await this.authFetch('user', { method: 'GET', token: cb.access_token });
        this.session.user_id = user.id;
        this.session.email = user.email || '';
        this.session.provider = user.app_metadata?.provider || 'email';
        this.write(SESSION_KEY, this.session);
        if (cb.type === 'recovery') this.needsNewPassword = true;
      }
      this.emit();
      return { signedIn: true, recovery: this.needsNewPassword };
    } catch (e) {
      return { error: e.message };
    }
  }

  // A valid session for REST calls (refreshed when close to expiry), or null when signed out.
  // The leaderboard uses this too, so a signed-in player's leaderboard row is their account.
  async activeSession() {
    const s = this.session;
    if (!s?.access_token) return null;
    if (this.now() < s.expires_at - 60000) return s;
    try {
      this.setSession(await this.authFetch('token?grant_type=refresh_token', { body: { refresh_token: s.refresh_token } }));
      return this.session;
    } catch (e) {
      if (e.status >= 400 && e.status < 500) {   // refresh token revoked or expired: signed out
        this.clearSession();
        this.setStatus('error', 'You were signed out. Sign in again to keep saving to the cloud.');
        return null;
      }
      throw e;
    }
  }

  async signOut() {
    const s = this.session;
    this.clearSession();
    if (s?.access_token) {
      try { await this.authFetch('logout', { token: s.access_token }); } catch { /* local sign-out is what matters */ }
    }
  }

  // --- saves REST ---
  async rest(path, { method = 'GET', body, prefer, keepalive = false } = {}) {
    const s = await this.activeSession();
    if (!s) throw new Error('signed out');
    const headers = { apikey: this.key, Authorization: `Bearer ${s.access_token}` };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (prefer) headers.Prefer = prefer;
    const res = await this.fetch(`${this.url}/rest/v1/${path}`, { method, headers, body, keepalive });
    if (res.status === 404) {
      let code = '';
      try { code = (await res.clone().json())?.code; } catch { /* no body */ }
      if (!code || code === 'PGRST205' || code === '42P01') throw new Error('Cloud saves are not switched on yet. Your progress is safe on this device.');
    }
    return res;
  }

  async fetchCloud() {
    const uid = this.session.user_id;
    const res = await this.rest(`saves?select=data,version,saved_at&user_id=eq.${uid}`);
    if (!res.ok) throw new Error(`Cloud load failed (${res.status}).`);
    const rows = await res.json();
    if (!rows.length) return null;
    const r = rows[0];
    return { data: r.data, version: r.version, savedAt: r.saved_at ? Date.parse(r.saved_at) : 0 };
  }

  rowFor(local) {
    return {
      user_id: this.session.user_id,
      data: local,
      version: Number(local.version) || 0,
      saved_at: new Date(Number(local.savedAt) || this.now()).toISOString()
    };
  }

  // Overwrite only if the cloud still holds expectedAt (ms). Returns true when it did.
  async casUpload(local, expectedAt, keepalive = false) {
    const body = JSON.stringify(this.rowFor(local));
    const at = encodeURIComponent(new Date(expectedAt).toISOString());
    const res = await this.rest(`saves?user_id=eq.${this.session.user_id}&saved_at=eq.${at}&select=saved_at`, {
      method: 'PATCH', body, prefer: 'return=representation', keepalive: keepalive && body.length < KEEPALIVE_MAX_BYTES
    });
    if (!res.ok) throw new Error(`Cloud save failed (${res.status}).`);
    return (await res.json()).length > 0;
  }

  // Create or replace the row. Only after decideSync() or the player chose "Keep this device".
  async forceUpload(local) {
    const res = await this.rest('saves?on_conflict=user_id', {
      method: 'POST', body: JSON.stringify(this.rowFor(local)), prefer: 'resolution=merge-duplicates,return=minimal'
    });
    if (!res.ok) throw new Error(`Cloud save failed (${res.status}).`);
  }

  localSave() {
    this.saveManager.save();
    return this.saveManager.load();
  }

  // Main entry: 'login' (sign-in or page load) always compares with the cloud; 'auto',
  // 'manual' and 'hide' upload straight away when the cloud is still the copy we last synced.
  // Returns the decision taken, or null when nothing ran.
  sync(reason = 'auto') {
    if (!this.signedIn || this.paused || this.conflict) return Promise.resolve(null);
    if (this.busy) return reason === 'hide' ? Promise.resolve(null) : this.busy;
    this.busy = this.runSync(reason).finally(() => { this.busy = null; });
    return this.busy;
  }

  async runSync(reason) {
    if (reason !== 'hide') this.setStatus('syncing', reason === 'login' ? 'Checking your cloud save…' : 'Saving to the cloud…');
    try {
      const local = this.localSave();
      if (!local) return null;
      const rec = this.syncRecord;
      const uid = this.session.user_id;
      if (reason !== 'login' && rec?.userId === uid && rec.cloudSavedAt && !isFreshSave(local)) {
        if (await this.casUpload(local, rec.cloudSavedAt, reason === 'hide')) {
          this.setSyncRecord(Number(local.savedAt));
          this.setStatus('ok');
          return 'upload';
        }
        // Someone else saved to this account since: fall through and compare
      }
      const cloud = await this.fetchCloud();
      const decision = decideSync(local, cloud, rec, uid);
      if (decision === 'upload') {
        await this.forceUpload(local);
        this.setSyncRecord(Number(local.savedAt));
      } else if (decision === 'in-sync') {
        this.setSyncRecord(cloud.savedAt);
      } else if (decision === 'download') {
        this.applyCloud(cloud);
      } else {
        this.conflict = { local, cloud };
        this.setStatus('conflict', 'Your cloud save and this device differ. Choose which one to keep.');
        return decision;
      }
      this.setStatus('ok');
      return decision;
    } catch (e) {
      this.setStatus('error', e.message || 'Cloud save failed. Retrying shortly.');
      return null;
    }
  }

  // Replace this device's progress with the cloud copy (through deserialize + migrations).
  // The caller reloads the page afterwards, as Import does.
  applyCloud(cloud) {
    if (!cloud?.data || typeof cloud.data !== 'object' || Array.isArray(cloud.data)) throw new Error('The cloud save is damaged.');
    if (!this.saveManager.applySaveData(cloud.data)) throw new Error('The cloud save could not be loaded.');
    this.setSyncRecord(cloud.savedAt);
    this.downloaded = true;
  }

  // The player's answer to the conflict prompt
  async resolve(choice) {
    const c = this.conflict;
    if (!c) return false;
    if (choice === 'later') { this.conflict = null; this.paused = true; this.setStatus('error', 'Cloud saving is paused until you choose which save to keep.'); return false; }
    try {
      if (choice === 'cloud') this.applyCloud(c.cloud);
      else { const local = this.localSave(); await this.forceUpload(local); this.setSyncRecord(Number(local.savedAt)); }
      this.conflict = null;
      this.paused = false;
      this.setStatus('ok');
      return true;
    } catch (e) {
      this.setStatus('conflict', e.message);
      return false;
    }
  }

  // Ask again after "Decide later"
  reopenConflict() {
    this.paused = false;
    return this.sync('login');
  }
}
