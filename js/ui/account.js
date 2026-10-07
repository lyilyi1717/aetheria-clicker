// Settings → Account & Cloud Save (R38). Sign in with Google or email + password, cloud sync
// status, and the "Keep this device / Keep cloud" prompt. All network work is in
// js/engine/CloudSave.js; this file only draws and wires buttons.
// Playing without an account is unchanged: signed out, nothing here touches the network
// except the one-time check of which sign-in methods are switched on.
import { CloudSave, AUTO_SYNC_MS, summarizeSave, cleanCallbackUrl } from '../engine/CloudSave.js';
import { formatDuration } from './offlineModal.js';
import { rewards } from './rewards.js';

const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// "5 min ago" for the status line and the conflict prompt
export function agoText(ms, now = Date.now()) {
  if (!ms) return 'never';
  const s = (now - ms) / 1000;
  if (s < 45) return 'just now';
  return `${formatDuration(s)} ago`;
}

// Rows of the conflict prompt for one side: [label, value]. Pure, for tests.
export function conflictRows(data, now = Date.now()) {
  const p = summarizeSave(data);
  const when = p.savedAt ? new Date(p.savedAt) : null;
  return [
    ['Saved', when ? `${agoText(p.savedAt, now)} (${when.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })})` : 'unknown'],
    ['New Wells', p.ascensions.toLocaleString()],
    ['New Fields', p.transcends.toLocaleString()],
    ['Tower floor', p.floor.toLocaleString()],
    ['Max depth', p.depth.toLocaleString()],
    ['Crude Reserves earned', p.dust.format('standard', 2)],
    ['Oil this run', p.runAether.format('standard', 2)]
  ];
}

const GOOGLE_G = `<svg class="acct-g" viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.7 1.2 9.2 3.6l6.9-6.9C35.9 2.4 30.4 0 24 0 14.6 0 6.6 5.4 2.7 13.3l8 6.2C12.6 13.6 17.9 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.5 5.8c4.4-4 6.8-10 6.8-17.2z"/><path fill="#FBBC05" d="M10.7 28.5c-.5-1.4-.8-2.9-.8-4.5s.3-3.1.8-4.5l-8-6.2C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l8-6.2z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.3 2.3-6.1 0-11.4-4.1-13.3-9.7l-8 6.2C6.6 42.6 14.6 48 24 48z"/></svg>`;

export class AccountUI {
  constructor(app) {
    this.app = app;
    this.cloud = new CloudSave(app.saveManager);
    app.cloudSave = this.cloud;   // the leaderboard signs in with the account when there is one
    this.mode = null;
    this.note = '';               // last message from a button (sign-in errors, "check your inbox")
    this.noteKind = '';
    this.googleOn = null;         // null: unknown, true/false from the project's auth settings
  }

  async init() {
    this.root = document.getElementById('settings-account');
    this.cloud.onChange(() => this.render());
    if (this.root) this.root.addEventListener('click', (e) => this.onClick(e));
    if (this.root) this.root.addEventListener('submit', (e) => { e.preventDefault(); this.onSubmit(e.submitter?.dataset.act || 'login'); });
    this.render();

    // Back from Google, an email confirmation link or a password-reset link
    const cb = await this.cloud.handleCallback(location.href);
    if (cb) {
      try { history.replaceState(null, '', cleanCallbackUrl(location.href)); } catch { /* file:// */ }
      if (cb.error) this.say(cb.error, 'bad');
      else if (cb.recovery) { this.say('Choose a new password below.', 'ok'); this.app.switchTab?.('settings'); }
      this.render();
    }

    // Uploads: every few minutes, on manual save, and when the page is hidden
    setInterval(() => this.cloud.sync('auto'), AUTO_SYNC_MS);
    document.getElementById('btn-manual-save')?.addEventListener('click', () => this.syncNow('manual'));
    const onHide = () => { if (document.visibilityState === 'hidden') this.cloud.sync('hide'); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', () => this.cloud.sync('hide'));
    setInterval(() => this.renderStatus(), 30000);

    if (this.cloud.signedIn && !this.cloud.needsNewPassword) await this.afterSignIn(!!cb?.signedIn);
    else if (!this.cloud.signedIn) this.cloud.providers().then(p => { this.googleOn = p ? p.google : null; this.render(); });
  }

  say(text, kind = '') { this.note = text; this.noteKind = kind; this.renderStatus(); }

  // --- flows ---
  async afterSignIn(fresh) {
    if (fresh) rewards.notify({ tier: 'small', kind: 'account', icon: '☁️', title: `Signed in as ${this.cloud.email}`, color: 'var(--aether)' });
    if (this.app.leaderboard) this.app.leaderboard.lastPush = 0;   // move the leaderboard row to the account now
    const d = await this.cloud.sync('login');
    this.afterSync(d);
  }

  afterSync(decision) {
    if (this.cloud.downloaded) {
      this.say('Loaded your cloud save. Restarting…', 'ok');
      setTimeout(() => location.reload(), 600);
    } else if (decision === 'conflict') {
      this.showConflict();
    }
  }

  async syncNow(reason) {
    if (!this.cloud.signedIn) return;
    if (this.cloud.paused) return;   // only "Choose which save to keep" reopens the prompt
    const d = await this.cloud.sync(reason);
    if (d === 'upload' && reason === 'manual-cloud') rewards.notify({ tier: 'small', kind: 'cloud-saved', icon: '☁️', title: 'Saved to the cloud', color: 'var(--aether)' });
    this.afterSync(d);
  }

  async reopen() {
    const d = await this.cloud.reopenConflict();
    this.afterSync(d);
  }

  fields() {
    const f = this.root.querySelector('form');
    return {
      email: f?.querySelector('[name=email]')?.value.trim() || '',
      password: f?.querySelector('[name=password]')?.value || ''
    };
  }

  async withBusy(fn) {
    if (this.busy) return;
    this.busy = true;
    this.root.querySelectorAll('button').forEach(b => { b.setAttribute('aria-disabled', 'true'); });
    try { await fn(); } catch (e) { this.say(e.message || 'Something went wrong. Please try again.', 'bad'); }
    finally {
      this.busy = false;
      this.root.querySelectorAll('button').forEach(b => b.removeAttribute('aria-disabled'));
    }
  }

  onSubmit(act) {
    const { email, password } = this.fields();
    if (act === 'newpass') {
      if (password.length < 6) return this.say('Please use at least 6 characters.', 'bad');
      return this.withBusy(async () => {
        await this.cloud.setNewPassword(password);
        this.say('Password changed.', 'ok');
        await this.afterSignIn(false);
      });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return this.say('Please enter your email address.', 'bad');
    if (act === 'reset') {
      return this.withBusy(async () => {
        await this.cloud.resetPassword(email);
        this.say(`If ${email} has an account, a reset link is on its way. Open it on this device.`, 'ok');
      });
    }
    if (password.length < 6) return this.say('Passwords have at least 6 characters.', 'bad');
    return this.withBusy(async () => {
      if (act === 'signup') {
        this.say('Creating your account…');
        if (await this.cloud.signUp(email, password)) { this.say(''); await this.afterSignIn(true); }
        else this.say(`Almost there: we sent a link to ${email}. Open it to confirm your account and you will come back here signed in.`, 'ok');
      } else {
        this.say('Signing in…');
        await this.cloud.signIn(email, password);
        this.say('');
        await this.afterSignIn(true);
      }
    });
  }

  onClick(e) {
    const btn = e.target.closest('button[data-act]');
    if (!btn || btn.type === 'submit') return;
    const act = btn.dataset.act;
    if (act === 'google') {
      if (this.googleOn === false) return this.say('Google sign-in is not switched on yet. Use email and password for now.', 'bad');
      return this.withBusy(async () => {
        this.app.saveManager.save();   // the page leaves for Google and comes back
        location.href = await this.cloud.googleUrl();
      });
    }
    if (act === 'signup' || act === 'reset') return this.onSubmit(act);
    if (act === 'sync') return this.syncNow('manual-cloud');
    if (act === 'choose') return this.reopen();
    if (act === 'signout') {
      return this.withBusy(async () => {
        await this.cloud.sync('manual');
        await this.cloud.signOut();
        this.say('Signed out. This device keeps your progress and saves locally as before.', 'ok');
        this.app.leaderboard && (this.app.leaderboard.lastPush = 0);
        this.cloud.providers().then(p => { this.googleOn = p ? p.google : null; this.render(); });
      });
    }
  }

  // --- drawing ---
  render() {
    if (!this.root) return;
    const c = this.cloud;
    const mode = !c.signedIn ? 'out' : c.needsNewPassword ? 'newpass' : 'in';
    if (mode !== this.mode || mode === 'out') this.build(mode);
    this.renderStatus();
  }

  build(mode) {
    const c = this.cloud;
    if (mode === 'out' && this.mode === 'out') {
      // Keep what the player typed; only the Google button state can change
      const g = this.root.querySelector('[data-act=google]');
      if (g) g.classList.toggle('is-locked', this.googleOn === false);
      return;
    }
    this.mode = mode;
    if (mode === 'out') {
      this.root.innerHTML = `
        <p class="acct-lead">Optional. Sign in to keep your progress in the cloud and continue on any device. Without an account the game saves in this browser, as always.</p>
        <button type="button" class="btn btn-block acct-google ${this.googleOn === false ? 'is-locked' : ''}" data-act="google">${GOOGLE_G}<span>Sign in with Google</span></button>
        <div class="acct-or"><span>or with email</span></div>
        <form class="acct-form" novalidate>
          <label class="acct-field"><span>Email</span><input name="email" type="email" autocomplete="email" inputmode="email" spellcheck="false"></label>
          <label class="acct-field"><span>Password</span><input name="password" type="password" autocomplete="current-password" minlength="6"></label>
          <div class="acct-actions">
            <button type="submit" class="btn btn-primary" data-act="login">Log in</button>
            <button type="button" class="btn" data-act="signup">Create account</button>
          </div>
          <button type="button" class="btn btn-ghost btn-sm acct-forgot" data-act="reset">Forgot password?</button>
        </form>
        <p class="acct-status" role="status" aria-live="polite"></p>`;
    } else if (mode === 'newpass') {
      this.root.innerHTML = `
        <p class="acct-lead">Signed in as <strong>${esc(c.email)}</strong>. Choose a new password.</p>
        <form class="acct-form" novalidate>
          <label class="acct-field"><span>New password</span><input name="password" type="password" autocomplete="new-password" minlength="6"></label>
          <div class="acct-actions"><button type="submit" class="btn btn-primary" data-act="newpass">Save password</button></div>
        </form>
        <p class="acct-status" role="status" aria-live="polite"></p>`;
    } else {
      this.root.innerHTML = `
        <div class="card-row is-owned acct-who">
          <div class="icon-tile sm" aria-hidden="true">☁️</div>
          <div class="acct-who-text">
            <div class="acct-email">${esc(c.email || 'Signed in')}</div>
            <div class="acct-sub">${c.provider === 'google' ? 'Google account' : 'Email account'} · <span class="acct-cloud"></span></div>
          </div>
        </div>
        <div class="acct-actions">
          <button type="button" class="btn btn-primary" data-act="sync">Save to cloud now</button>
          <button type="button" class="btn" data-act="choose" hidden>Choose which save to keep</button>
          <button type="button" class="btn btn-ghost" data-act="signout">Sign out</button>
        </div>
        <p class="acct-note">Saves to the cloud every few minutes, when you press Save Game and when you leave the page. Your leaderboard entry belongs to this account too.</p>
        <p class="acct-status" role="status" aria-live="polite"></p>`;
    }
  }

  renderStatus() {
    if (!this.root) return;
    const c = this.cloud;
    const st = this.root.querySelector('.acct-status');
    if (st) {
      const text = this.note || (c.status === 'error' || c.status === 'conflict' ? c.message : '');
      st.textContent = text;
      st.dataset.kind = this.note ? this.noteKind : (c.status === 'error' || c.status === 'conflict' ? 'bad' : '');
      st.hidden = !text;
    }
    const cloudEl = this.root.querySelector('.acct-cloud');
    if (cloudEl) {
      cloudEl.textContent = c.status === 'syncing' ? c.message
        : c.paused ? 'cloud saving paused'
        : c.lastCloudAt ? `cloud saved ${agoText(c.lastCloudAt)}` : 'cloud save on';
    }
    const choose = this.root.querySelector('[data-act=choose]');
    if (choose) choose.hidden = !c.paused;
    const sync = this.root.querySelector('[data-act=sync]');
    if (sync) sync.hidden = c.paused;
  }

  showConflict() {
    const c = this.cloud.conflict;
    if (!c) return;
    document.querySelector('.acct-scrim')?.remove();
    const local = c.local, cloud = { ...c.cloud.data, savedAt: c.cloud.savedAt || c.cloud.data?.savedAt };
    const newer = (Number(local.savedAt) || 0) >= (Number(cloud.savedAt) || 0) ? 'local' : 'cloud';
    const side = (key, title, data) => `
      <section class="acct-side ${newer === key ? 'is-newer' : ''}">
        <div class="acct-side-head"><span class="eyebrow">${title}</span>${newer === key ? '<span class="tag new">Newer</span>' : ''}</div>
        <dl>${conflictRows(data).map(([k, v]) => `<dt>${k}</dt><dd class="num">${esc(v)}</dd>`).join('')}</dl>
        <button type="button" class="btn btn-block" data-choice="${key}">${key === 'local' ? 'Keep this device' : 'Keep cloud'}</button>
      </section>`;
    const scrim = document.createElement('div');
    scrim.className = 'acct-scrim';
    scrim.innerHTML = `
      <div class="acct-modal" role="dialog" aria-modal="true" aria-labelledby="acct-cf-title">
        <h2 id="acct-cf-title">Which save do you want to keep?</h2>
        <p>This device and your cloud save (${esc(this.cloud.email)}) have different progress. The one you keep replaces the other. Nothing changes until you choose.</p>
        <div class="acct-compare">${side('local', 'This device', local)}${side('cloud', 'Cloud', cloud)}</div>
        <p class="acct-status" role="status" data-kind="bad" hidden></p>
        <p class="acct-note">Tip: Export Save (Settings) copies this device's save as a backup before you choose.</p>
        <button type="button" class="btn btn-ghost btn-block" data-choice="later">Decide later (cloud saving pauses)</button>
      </div>`;
    document.body.appendChild(scrim);
    scrim.querySelector('[data-choice=local]').focus();
    scrim.addEventListener('click', async (e) => {
      const b = e.target.closest('button[data-choice]');
      if (!b || this.resolving) return;
      this.resolving = true;
      const choice = b.dataset.choice;
      const ok = await this.cloud.resolve(choice);
      this.resolving = false;
      if (choice === 'later' || ok) scrim.remove();
      else { const st = scrim.querySelector('.acct-status'); st.textContent = this.cloud.message; st.hidden = false; }
      if (ok && choice === 'cloud') { this.say('Loaded your cloud save. Restarting…', 'ok'); setTimeout(() => location.reload(), 400); }
      else if (ok) rewards.notify({ tier: 'small', kind: 'cloud-saved', icon: '☁️', title: 'Cloud save replaced with this device', color: 'var(--aether)' });
      this.render();
    });
  }
}
