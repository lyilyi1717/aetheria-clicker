// Player accounts and cloud save (R38): the sync decision, auth callbacks, and a full
// two-browser round trip against a mocked Supabase (Auth + REST with per-user row access).
// Run: node test_cloud_save.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import { GameState } from './js/systems/GameState.js';
import { SaveManager } from './js/engine/SaveManager.js';
import { particles } from './js/engine/ParticleEngine.js';
import {
  CloudSave, decideSync, isFreshSave, summarizeSave, parseAuthCallback, cleanCallbackUrl,
  authErrorMessage, pkcePair
} from './js/engine/CloudSave.js';
import { Leaderboard } from './js/leaderboard.js';

globalThis.window ??= { innerWidth: 800, innerHeight: 600 };
particles.suppressed = true;

// One localStorage per simulated browser; SaveManager reads the global one
let current = new Map();
const storageOf = (m) => ({
  getItem: k => (m.has(k) ? m.get(k) : null),
  setItem: (k, v) => m.set(k, String(v)),
  removeItem: k => m.delete(k)
});
globalThis.localStorage = { getItem: k => storageOf(current).getItem(k), setItem: (k, v) => storageOf(current).setItem(k, v), removeItem: k => storageOf(current).removeItem(k) };
const tick = () => new Promise(r => setTimeout(r, 3));

// --- Pure: decideSync ------------------------------------------------------------------
const fresh = { savedAt: 100, ascensionCount: 0, totalAetherEarned: { m: 5, e: 2 } };
const played = (savedAt, asc = 3) => ({ savedAt, ascensionCount: asc, totalAetherEarned: { m: 1, e: 30 } });
const U = 'user-1';
{
  assert.equal(isFreshSave(fresh), true);
  assert.equal(isFreshSave(null), true);
  assert.equal(isFreshSave(played(1)), false);
  assert.equal(isFreshSave({ totalAetherEarned: { m: 2, e: 5 } }), false, '200k Aether in a first run is progress');
  assert.equal(isFreshSave({ hero: { maxFloor: 12 } }), false);

  assert.equal(decideSync(played(5), null, null, U), 'upload', 'no cloud save yet: upload');
  assert.equal(decideSync(played(5), { savedAt: 5, data: played(5) }, null, U), 'in-sync');
  // Cloud is the copy this device last synced: local is just newer
  assert.equal(decideSync(played(9), { savedAt: 5, data: played(5) }, { userId: U, cloudSavedAt: 5 }, U), 'upload');
  // ...unless this device was wiped: never replace real progress with a fresh game unasked
  assert.equal(decideSync(fresh, { savedAt: 5, data: played(5) }, { userId: U, cloudSavedAt: 5 }, U), 'conflict');
  // Cloud changed elsewhere and both have progress: ask
  assert.equal(decideSync(played(9), { savedAt: 7, data: played(7) }, { userId: U, cloudSavedAt: 5 }, U), 'conflict');
  assert.equal(decideSync(played(9), { savedAt: 7, data: played(7) }, null, U), 'conflict', 'first sign-in on a played device');
  // A record from another account doesn't count
  assert.equal(decideSync(played(9), { savedAt: 5, data: played(5) }, { userId: 'other', cloudSavedAt: 5 }, U), 'conflict');
  // New device: nothing to lose locally, so the cloud save loads
  assert.equal(decideSync(fresh, { savedAt: 7, data: played(7) }, null, U), 'download');
  // Empty cloud save (made from a fresh device): local progress goes up
  assert.equal(decideSync(played(9), { savedAt: 7, data: fresh }, null, U), 'upload');

  const s = summarizeSave({ savedAt: 42, ascensionCount: 4, transcendenceCount: 1, hero: { maxFloor: 900, indexFloor: 610 },
    mining: { maxDepth: 77 }, totalCosmicDust: { m: 2.5, e: 8 }, totalAetherEarned: { m: 1, e: 20 } });
  assert.deepEqual([s.savedAt, s.ascensions, s.transcends, s.floor, s.depth, s.fresh], [42, 4, 1, 610, 77, false]);
  assert.ok(s.dust instanceof BigNum && s.dust.e === 8);
  assert.equal(summarizeSave(undefined).floor, 1);
}

// --- Pure: URL callbacks and messages --------------------------------------------------
{
  const page = 'https://game.example/aetheria/index.html';
  assert.equal(parseAuthCallback(page), null);
  assert.deepEqual(parseAuthCallback(`${page}?code=abc`), { kind: 'code', code: 'abc' });
  const t = parseAuthCallback(`${page}#access_token=AT&refresh_token=RT&expires_in=3600&token_type=bearer&type=recovery`);
  assert.equal(t.kind, 'tokens'); assert.equal(t.access_token, 'AT'); assert.equal(t.type, 'recovery');
  const e = parseAuthCallback(`${page}?error=invalid_request&error_code=bad_oauth_state&error_description=Unsupported+provider%3A+provider+is+not+enabled`);
  assert.equal(e.kind, 'error');
  assert.match(authErrorMessage({ msg: e.error }), /Google sign-in is not switched on yet/);
  assert.equal(cleanCallbackUrl(`${page}?code=abc&x=1#access_token=1`), `${page}?x=1`);
  assert.equal(authErrorMessage({ error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400), 'Wrong email or password.');
  assert.equal(authErrorMessage(null, 500), 'Sign-in failed (500).');
  const { verifier, challenge } = await pkcePair();
  assert.ok(verifier.length >= 43 && /^[A-Za-z0-9_-]+$/.test(challenge) && challenge !== verifier);
}

// --- A fake Supabase: Auth + public.saves with "only your own row" access ---------------
function fakeSupabase({ autoconfirm = true, savesTable = true } = {}) {
  const db = { users: new Map(), tokens: new Map(), saves: new Map(), lb: new Map(), log: [], seq: 0, google: false, down: false };
  const json = (status, body) => new Response(body == null ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const issue = (user) => {
    const at = `at-${++db.seq}`, rt = `rt-${db.seq}`;
    db.tokens.set(at, user.id); db.tokens.set(rt, user.id);
    return { access_token: at, refresh_token: rt, expires_in: 3600, user: { id: user.id, email: user.email, app_metadata: { provider: 'email' } } };
  };
  globalThis.fetch = async (url, opts = {}) => {
    if (db.down) throw new TypeError('Failed to fetch');
    const u = new URL(url);
    const method = opts.method || 'GET';
    const body = opts.body ? JSON.parse(opts.body) : null;
    const bearer = (opts.headers?.Authorization || '').replace('Bearer ', '');
    const who = db.tokens.get(bearer);   // the auth.uid() of this request
    db.log.push({ method, path: u.pathname + u.search, keepalive: !!opts.keepalive, who });
    if (u.pathname.startsWith('/auth/v1/')) {
      const p = u.pathname.slice(9);
      if (p === 'settings') return json(200, { external: { google: db.google, email: true } });
      if (p === 'signup') {
        if (!body.email) { const anon = { id: `anon-${++db.seq}`, anon: true }; db.users.set(anon.id, anon); return json(200, issue(anon)); }
        if ([...db.users.values()].some(x => x.email === body.email)) return json(422, { code: 'user_already_exists', msg: 'User already registered' });
        const user = { id: `uid-${++db.seq}`, email: body.email, password: body.password, confirmed: autoconfirm };
        db.users.set(user.id, user);
        return autoconfirm ? json(200, issue(user)) : json(200, { id: user.id, email: user.email });
      }
      if (p === 'token') {
        const g = u.searchParams.get('grant_type');
        if (g === 'password') {
          const user = [...db.users.values()].find(x => x.email === body.email && x.password === body.password);
          if (!user) return json(400, { error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
          if (!user.confirmed) return json(400, { error_code: 'email_not_confirmed', msg: 'Email not confirmed' });
          return json(200, issue(user));
        }
        if (g === 'refresh_token') {
          const id = db.tokens.get(body.refresh_token);
          return id ? json(200, issue(db.users.get(id))) : json(400, { error_code: 'refresh_token_not_found' });
        }
      }
      if (p === 'user') return who ? json(200, { id: who, email: db.users.get(who).email }) : json(401, { msg: 'no' });
      if (p === 'recover') return json(200, {});
      if (p === 'logout') return new Response(null, { status: 204 });
      return json(404, {});
    }
    const table = u.pathname.replace('/rest/v1/', '');
    if (table === 'leaderboard_season' || table === 'leaderboard') {
      if (method === 'DELETE') {
        const uid = u.searchParams.get('user_id').replace('eq.', '');
        if (uid === who) db.lb.delete(uid);
        return new Response(null, { status: 204 });
      }
      if (method === 'POST') { if (body.user_id !== who) return json(403, {}); db.lb.set(body.user_id, body); return new Response(null, { status: 201 }); }
      return json(200, [...db.lb.values()]);
    }
    if (table !== 'saves' || !savesTable) return json(404, { code: 'PGRST205', message: 'Could not find the table' });
    if (!who || db.users.get(who)?.anon) return json(401, { code: '42501' });
    // Row Level Security: every request only ever sees the caller's own row
    const uid = u.searchParams.get('user_id')?.replace('eq.', '');
    const mine = db.saves.get(who);
    if (method === 'GET') return json(200, mine && (!uid || uid === who) ? [{ data: mine.data, version: mine.version, saved_at: mine.saved_at }] : []);
    if (method === 'POST') {
      if (body.user_id !== who) return json(403, { code: '42501', message: 'new row violates row-level security policy' });
      db.saves.set(who, { ...body, saved_at: body.saved_at.replace('Z', '+00:00') });
      return new Response(null, { status: 201 });
    }
    if (method === 'PATCH') {
      const at = u.searchParams.get('saved_at')?.replace('eq.', '');
      const hit = mine && uid === who && Date.parse(mine.saved_at) === Date.parse(at);
      if (hit) db.saves.set(who, { ...body, saved_at: body.saved_at.replace('Z', '+00:00') });
      return json(200, hit ? [{ saved_at: body.saved_at }] : []);
    }
    return json(405, {});
  };
  return db;
}

// One browser: its own localStorage, game state, SaveManager and CloudSave
function browser(name) {
  const mem = new Map();
  current = mem;
  const gs = new GameState();
  const sm = new SaveManager(gs);
  const cloud = new CloudSave(sm, { storage: storageOf(mem) });
  return { name, mem, gs, sm, cloud, use() { current = mem; return this; } };
}

// --- Two browsers, one account: upload, download, conflict, never silent -------------------
{
  const db = fakeSupabase();
  const A = browser('A');
  A.gs.aether = new BigNum(3, 25);
  A.gs.totalAetherEarned = new BigNum(7, 26);
  A.gs.ascensionCount = 5;
  A.gs.hero = { floor: 321, maxFloor: 321, indexFloor: 321 };
  A.gs.settings.lbName = 'Wanderer';
  A.sm.save();

  // Playing without an account: nothing touches the network
  db.log.length = 0;
  assert.equal(await A.cloud.sync('auto'), null);
  assert.equal(db.log.length, 0, 'signed out: no requests');

  // Sign up (email confirmation off), then the first sync uploads
  assert.equal(await A.cloud.signUp('a@example.com', 'hunter22'), true);
  assert.equal(A.cloud.signedIn, true);
  assert.equal(await A.cloud.sync('login'), 'upload');
  const uidA = A.cloud.session.user_id;
  assert.equal(db.saves.get(uidA).data.ascensionCount, 5);
  assert.equal(db.saves.get(uidA).version, A.sm.load().version, 'version column = save format version');

  // Later saves are compare-and-swap PATCHes
  await tick();
  A.gs.ascensionCount = 6;
  db.log.length = 0;
  assert.equal(await A.cloud.sync('auto'), 'upload');
  assert.deepEqual(db.log.map(l => l.method), ['PATCH']);
  assert.equal(db.saves.get(uidA).data.ascensionCount, 6);

  // Page hide uses keepalive so the upload survives the tab closing
  await tick();
  db.log.length = 0;
  await A.cloud.sync('hide');
  assert.equal(db.log[0].keepalive, true);

  // Browser B, brand-new game: logging in loads the cloud save through deserialize + migrations
  await tick();
  const B = browser('B');
  B.sm.save();
  await B.cloud.signIn('a@example.com', 'hunter22');
  assert.equal(await B.cloud.sync('login'), 'download');
  assert.equal(B.cloud.downloaded, true);
  const bSave = B.use().sm.load();
  assert.equal(bSave.ascensionCount, 6);
  assert.equal(bSave.hero.maxFloor, 321);
  assert.equal(BigNum.fromJSON(bSave.aether).e, 25, 'BigNum survives the round trip');
  assert.equal(bSave.settings.lbName, 'Wanderer', 'leaderboard name travels with the save');
  // Reloading B (as the UI does) starts from that save
  const B2gs = new GameState(); B2gs.deserialize(bSave);
  assert.equal(B2gs.ascensionCount, 6);
  assert.equal(B2gs.totalAetherEarned.e, 26);

  // B plays on and uploads: B matched the cloud, so the CAS goes through
  await tick();
  B.use(); B.gs.deserialize(bSave); B.gs.ascensionCount = 9; B.sm.save();
  assert.equal(await B.cloud.sync('manual'), 'upload');
  assert.equal(db.saves.get(uidA).data.ascensionCount, 9);

  // A, still open, tries its routine upload: the cloud moved, so A must ask, not overwrite
  await tick();
  A.use(); A.gs.ascensionCount = 7;
  assert.equal(await A.cloud.sync('auto'), 'conflict');
  assert.equal(db.saves.get(uidA).data.ascensionCount, 9, 'cloud untouched by the conflict');
  assert.equal(A.cloud.status, 'conflict');
  assert.equal(A.cloud.conflict.cloud.data.ascensionCount, 9);
  assert.equal(A.cloud.conflict.local.ascensionCount, 7);
  // While the prompt is open nothing uploads
  db.log.length = 0;
  assert.equal(await A.cloud.sync('auto'), null);
  assert.equal(db.log.length, 0);

  // "Decide later": still nothing uploads
  await A.cloud.resolve('later');
  assert.equal(A.cloud.paused, true);
  assert.equal(await A.cloud.sync('manual'), null);
  assert.equal(db.saves.get(uidA).data.ascensionCount, 9);

  // Reopen and keep the cloud: A's game becomes the cloud save
  assert.equal(await A.cloud.reopenConflict(), 'conflict');
  assert.equal(await A.cloud.resolve('cloud'), true);
  assert.equal(A.use().sm.load().ascensionCount, 9);
  assert.equal(db.saves.get(uidA).data.ascensionCount, 9);

  // Conflict again, and this time keep the device
  await tick();
  B.use(); B.gs.ascensionCount = 11; B.sm.save();
  await B.cloud.sync('auto');
  await tick();
  A.use(); A.gs.deserialize(A.sm.load()); A.gs.ascensionCount = 10;
  assert.equal(await A.cloud.sync('manual'), 'conflict');
  assert.equal(await A.cloud.resolve('local'), true);
  assert.equal(db.saves.get(uidA).data.ascensionCount, 10);
  // ...and B is now the one asked, never overwritten silently
  await tick();
  B.use(); B.gs.ascensionCount = 12;
  assert.equal(await B.cloud.sync('auto'), 'conflict');

  // A wiped device never replaces real progress without asking
  await tick();
  const C = browser('C');
  await C.cloud.signIn('a@example.com', 'hunter22');
  C.use(); C.sm.save();
  // pretend C had synced this cloud copy before, then was wiped
  C.cloud.setSyncRecord(Date.parse(db.saves.get(uidA).saved_at));
  assert.equal(await C.cloud.sync('login'), 'conflict');
  assert.equal(db.saves.get(uidA).data.ascensionCount, 10);

  // A second account can't see or overwrite the first account's save
  const D = browser('D');
  await D.cloud.signUp('d@example.com', 'secret99');
  D.use(); D.gs.ascensionCount = 1; D.gs.totalAetherEarned = new BigNum(1, 12); D.sm.save();
  assert.equal(await D.cloud.fetchCloud(), null, 'D sees no save');
  assert.equal(await D.cloud.sync('login'), 'upload');
  assert.equal(db.saves.get(uidA).data.ascensionCount, 10, 'A untouched');
  assert.equal(db.saves.size, 2);

  // Sign out: back to local-only, nothing else changes
  A.use();
  await A.cloud.signOut();
  assert.equal(A.cloud.signedIn, false);
  assert.equal(A.sm.load().ascensionCount, 10, 'local progress stays after sign-out');
}

// --- Email confirmation, bad passwords, missing table, offline ----------------------------
{
  const db = fakeSupabase({ autoconfirm: false });
  const E = browser('E');
  assert.equal(await E.cloud.signUp('e@example.com', 'secret99'), false, 'confirm email first');
  assert.equal(E.cloud.signedIn, false);
  await assert.rejects(E.cloud.signIn('e@example.com', 'secret99'), /confirm your email/);
  await assert.rejects(E.cloud.signIn('e@example.com', 'nope'), /Wrong email or password/);
  await assert.rejects(E.cloud.signUp('e@example.com', 'secret99'), /already has an account/);

  // Coming back from the confirmation link signs in
  const uid = [...db.users.values()].find(x => x.email === 'e@example.com').id;
  db.users.get(uid).confirmed = true;
  db.tokens.set('linkAT', uid);
  const cb = await E.cloud.handleCallback('https://g.example/#access_token=linkAT&refresh_token=linkRT&expires_in=3600&type=signup');
  assert.deepEqual(cb, { signedIn: true, recovery: false });
  assert.equal(E.cloud.session.user_id, uid);
  assert.equal(E.cloud.email, 'e@example.com');

  // Password reset link: signed in and asked for a new password
  db.tokens.set('recAT', uid);
  const rc = await E.cloud.handleCallback('https://g.example/#access_token=recAT&refresh_token=x&expires_in=3600&type=recovery');
  assert.equal(rc.recovery, true);

  // Google with PKCE: verifier stored, then exchanged (fake has no pkce grant: error surfaces)
  const url = await E.cloud.googleUrl();
  assert.match(url, /\/auth\/v1\/authorize\?provider=google&redirect_to=.*&code_challenge=[\w-]+&code_challenge_method=s256$/);
  assert.ok(E.mem.get('AETHERIA_PKCE_VERIFIER'));
  assert.equal(await E.cloud.handleCallback('https://g.example/?code=zzz') !== null, true);
  assert.equal(E.mem.has('AETHERIA_PKCE_VERIFIER'), false, 'verifier is single-use');
  assert.equal(await E.cloud.handleCallback('https://g.example/?code=zzz'), null, 'a ?code= that is not ours is ignored');

  assert.deepEqual(await E.cloud.providers(), { google: false, email: true });

  // Cloud table not created yet: a clear message, local game untouched
  fakeSupabase({ savesTable: false });
  const F = browser('F');
  await F.cloud.signUp('f@example.com', 'secret99');
  F.use(); F.gs.ascensionCount = 2; F.sm.save();
  assert.equal(await F.cloud.sync('login'), null);
  assert.equal(F.cloud.status, 'error');
  assert.match(F.cloud.message, /not switched on yet/);
  assert.equal(F.use().sm.load().ascensionCount, 2);

  // Network down: error status, retried by the next sync
  const db3 = fakeSupabase();
  const G = browser('G');
  await G.cloud.signUp('g@example.com', 'secret99');
  db3.down = true;
  assert.equal(await G.cloud.sync('login'), null);
  assert.equal(G.cloud.status, 'error');
  db3.down = false;
  assert.equal(await G.cloud.sync('login'), 'upload');

  // Expired session refreshes itself; a revoked one signs out cleanly
  let clock = Date.now();
  const H = browser('H');
  H.cloud.now = () => clock;
  await H.cloud.signUp('h@example.com', 'secret99');
  const oldToken = H.cloud.session.access_token;
  clock += 2 * 3600 * 1000;
  const fresh = await H.cloud.activeSession();
  assert.notEqual(fresh.access_token, oldToken);
  db3.tokens.delete(H.cloud.session.refresh_token);
  clock += 2 * 3600 * 1000;
  assert.equal(await H.cloud.activeSession(), null);
  assert.equal(H.cloud.signedIn, false);
}

// --- Leaderboard: a signed-in player's row is the account's ------------------------------
{
  const db = fakeSupabase();
  const L = browser('L');
  L.gs.settings.lbName = 'Linker';
  const app = { gameState: L.gs, saveManager: L.sm };
  const lb = new Leaderboard(app);
  lb.resolveSeason = async () => 2;
  // Guest first
  await lb.push('t');
  const guestId = lb.session.user_id;
  assert.ok(db.lb.has(guestId));
  // Sign in: the next push writes the account's row and removes the guest row
  await L.cloud.signUp('l@example.com', 'secret99');
  app.cloudSave = L.cloud;
  await lb.push('t');
  assert.equal(lb.session.user_id, L.cloud.session.user_id);
  assert.ok(db.lb.has(L.cloud.session.user_id));
  assert.equal(db.lb.has(guestId), false, 'guest row retired, player listed once');
  // Sign out: back to the guest player
  await L.cloud.signOut();
  await lb.push('t');
  assert.equal(lb.session.user_id, guestId);
}

console.log('Cloud save tests passed.');
