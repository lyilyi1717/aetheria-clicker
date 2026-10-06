// Dallah tab (R15, docs/redesign-proposal.md §4.1, §8; mockup docs/ui/mockups/daily-weekly.html):
// Daily Dallah, Souq Rotation, the Seals of Transcendence and the Weekly Ledger. main.js only
// calls init() once and update(currentTab, dt) every frame. The DOM is built once and updated in
// place, so buttons are never replaced under the pointer. Nothing here animates, so reduced
// motion needs no special case; notices go through rewards.notify (which does honour it).
import { rewards } from './rewards.js';
import { sound } from '../engine/AudioEngine.js';
import {
  CalendarSystem, SEALS, SEAL_SHARD_BONUS_MAX, DALLAH_BANK_MAX, DALLAH_SAND, LEDGER_WEEK_DAYS
} from '../systems/CalendarSystem.js';

const TICK_SECONDS = 1;
const STAMP_CHIPS = 8;     // most recent weeks shown as stamps
const setText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };
const setAttr = (el, k, v) => { if (el && el.getAttribute(k) !== v) el.setAttribute(k, v); };
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function fmtRotation(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d} d ${h} h`;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export class CalendarUI {
  constructor(app) {
    this.app = app;
    this.acc = TICK_SECONDS;
    this.goalKey = '';
    this.pipOn = null;
  }

  get gs() { return this.app.gameState; }
  get sys() { return this.app.calendarSystem; }

  init() {
    if (!this.app.calendarSystem) this.app.calendarSystem = new CalendarSystem(this.app.gameState);
    this.sys.notify = (ev) => rewards.notify(ev);
    this.sys.tick();
    this.build();
    this.tabBtn = document.querySelector('.side-nav .nav-tab[data-tab="calendar"]');
    this.update('', 0);
  }

  build() {
    const root = document.getElementById('calendar-root');
    if (!root || root.dataset.built) return;
    root.dataset.built = '1';
    root.innerHTML = `
      <div class="cal">
        <div class="cal-col">
          <section class="card cal-dallah" aria-labelledby="cal-dallah-h">
            <div class="cal-dallah-top">
              <div class="cal-cup" aria-hidden="true">☕</div>
              <div>
                <div class="eyebrow">Daily Dallah</div>
                <h2 id="cal-dallah-h" data-c="dallahTitle"></h2>
                <div class="cal-dim" data-c="visits"></div>
              </div>
            </div>
            <div class="cal-gift" data-c="gift"></div>
            <div class="cal-dallah-foot">
              <div class="cal-bank" data-c="bank" role="img"></div>
              <button type="button" class="btn btn-primary" data-c="claim"></button>
            </div>
          </section>
          <section class="card cal-souq" aria-label="Souq Rotation">
            <div class="icon-tile" data-c="souqIcon" aria-hidden="true"></div>
            <div>
              <div class="eyebrow">Souq Rotation · this week</div>
              <div class="cal-souq-name" data-c="souqName"></div>
              <div class="cal-dim" data-c="souqDesc"></div>
            </div>
            <span class="chip life">✓ Active</span>
          </section>
          <section class="card" aria-labelledby="cal-seals-h">
            <div class="card-head"><h3 id="cal-seals-h">Seals of Transcendence</h3><span class="cal-dim" data-c="sealSummary"></span></div>
            <div class="cal-seals" data-c="seals">
              ${SEALS.map(s => `
                <div class="cal-seal" data-seal="${s.id}" title="${esc(s.desc)}">
                  <div class="cal-seal-lamp" aria-hidden="true">${s.icon}</div>
                  <div class="cal-seal-n">${esc(s.name)}<br>${esc(s.short)}</div>
                  <div class="cal-seal-state" data-state></div>
                  <div class="bar gold" data-bar><i></i></div>
                </div>`).join('')}
            </div>
            <p class="cal-note">A lit Seal never goes dark. Each lit Seal adds +1 Fracture Shard to spend at every Transcend, up to +${SEAL_SHARD_BONUS_MAX} (they do not raise the shard bonus).</p>
          </section>
        </div>
        <section class="card cal-ledger" aria-labelledby="cal-ledger-h">
          <div class="card-head">
            <div><div class="eyebrow">Weekly Ledger</div><h2 id="cal-ledger-h" data-c="week"></h2></div>
            <span class="chip" data-c="rotation"></span>
          </div>
          <div data-c="goals"></div>
          <div class="cal-ledger-foot">
            <span class="cal-dim" data-c="ledgerNote"></span>
            <span class="tag" data-c="stampTag"></span>
          </div>
          <div class="cal-stamps">
            <div class="eyebrow">Stamps</div>
            <div class="cal-stamp-row" data-c="stamps"></div>
          </div>
        </section>
      </div>`;
    this.el = {};
    for (const el of root.querySelectorAll('[data-c]')) this.el[el.dataset.c] = el;
    this.sealEls = new Map(SEALS.map(s => [s.id, root.querySelector(`[data-seal="${s.id}"]`)]));
    this.el.claim.addEventListener('click', () => this.onClaim());
  }

  onClaim() {
    const r = this.sys.claimDaily();
    if (r) sound.playBuy?.();
    this.update(this.app.currentTab, 0);
  }

  // Called every frame; the calendar itself only moves once a second
  update(tab, dt) {
    if (!this.sys) return;
    this.acc += dt;
    if (this.acc >= TICK_SECONDS) {
      this.acc = 0;
      this.sys.tick();
      this.updatePip();
    }
    if (tab !== 'calendar' || !this.el) return;
    this.renderDallah();
    this.renderSouq();
    this.renderSeals();
    this.renderLedger();
  }

  updatePip() {
    const on = this.sys.getDaily().canClaim;
    if (on === this.pipOn) return;
    this.pipOn = on;
    this.tabBtn?.classList.toggle('has-notif', on);
    if (this.tabBtn) {
      this.tabBtn.title = on ? 'Dallah: a cup is poured and ready to claim.' : 'Dallah: daily gift, weekly goals, Seals and the weekly Souq modifier.';
    }
  }

  renderDallah() {
    const d = this.sys.getDaily();
    const e = this.el;
    setText(e.dallahTitle, d.canClaim ? 'Fresh coffee is poured' : 'Today\'s cup is claimed');
    setText(e.visits, `Day ${d.visits} of visits · no streaks, nothing to lose`);
    const days = Math.max(1, d.bank);
    const sand = DALLAH_SAND * days;
    const gift = `<span class="chip sand">+${sand} Chrono Sand</span>` +
      `<span class="chip gold">+${days} bonus contract${days > 1 ? 's' : ''}</span>` +
      `<span class="chip life">+25% Aether · 1 h</span>`;
    if (e.gift.dataset.key !== gift) { e.gift.dataset.key = gift; e.gift.innerHTML = gift; }
    const dots = Array.from({ length: DALLAH_BANK_MAX }, (_, i) => `<i class="${i < d.bank ? 'on' : ''}">${i < d.bank ? '✓' : ''}</i>`).join('');
    const bank = `Banked ${dots} <span>${d.bank > 0 ? `· ${d.bank} unclaimed day${d.bank > 1 ? 's' : ''}` : '· a new cup is poured at midnight'}</span>`;
    if (e.bank.dataset.key !== bank) { e.bank.dataset.key = bank; e.bank.innerHTML = bank; }
    setAttr(e.bank, 'aria-label', `Banked days: ${d.bank} of ${DALLAH_BANK_MAX}`);
    setText(e.claim, d.canClaim ? `Claim ${d.bank} day${d.bank > 1 ? 's' : ''}` : 'Claimed');
    setAttr(e.claim, 'aria-disabled', String(!d.canClaim));
    e.claim.disabled = !d.canClaim;
    e.claim.classList.toggle('btn-primary', d.canClaim);
  }

  renderSouq() {
    const m = this.sys.getSouq();
    const e = this.el;
    setText(e.souqIcon, m.icon);
    setText(e.souqName, m.name);
    setText(e.souqDesc, `${m.desc} Ends Monday; comes back later in the year.`);
  }

  renderSeals() {
    const seals = this.sys.getSeals();
    const lit = seals.filter(s => s.lit).length;
    setText(this.el.sealSummary, `${lit} / ${SEALS.length} lit · +${Math.min(SEAL_SHARD_BONUS_MAX, lit)} ◆ to spend at each Transcend`);
    for (const s of seals) {
      const el = this.sealEls.get(s.id);
      if (!el) continue;
      el.classList.toggle('lit', s.lit);
      setText(el.querySelector('[data-state]'), s.lit ? '✓ Lit' : `${Math.floor(s.pct * 100)}%`);
      el.querySelector('[data-bar]').hidden = s.lit;
      const fill = el.querySelector('[data-bar] > i');
      const w = `${Math.round(s.pct * 100)}%`;
      if (fill && fill.style.width !== w) fill.style.width = w;
      setAttr(el, 'aria-label', `Seal of the ${s.name}: ${s.lit ? 'lit' : `${Math.floor(s.pct * 100)}% of the way`}. ${s.desc}`);
    }
  }

  renderLedger() {
    const l = this.sys.getLedger();
    const e = this.el;
    setText(e.week, `Week ${l.number}`);
    setText(e.rotation, `Rotates Mon · ${fmtRotation(l.msToRotation)}`);
    const key = l.goals.map(g => g.id).join(',');
    if (key !== this.goalKey) {
      this.goalKey = key;
      e.goals.innerHTML = l.goals.map(g => `
        <div class="cal-goal" data-goal="${g.id}">
          <div class="icon-tile sm" aria-hidden="true">${g.icon}</div>
          <div class="cal-goal-main">
            <div class="cal-goal-g" data-g>${esc(g.label)}</div>
            <div class="bar gold" data-bar><i></i></div>
            <div class="cal-goal-s num" data-s></div>
          </div>
          <span class="chip" data-chip>+${g.seals} Guild Seals</span>
        </div>`).join('');
    }
    for (const g of l.goals) {
      const row = e.goals.querySelector(`[data-goal="${g.id}"]`);
      if (!row) continue;
      row.classList.toggle('done', g.done);
      setText(row.querySelector('[data-g]'), g.done ? `${g.label} ✓` : g.label);
      setText(row.querySelector('[data-s]'), g.done ? 'Done' : `${g.have.toLocaleString()} / ${g.target.toLocaleString()}`);
      const bar = row.querySelector('[data-bar]');
      bar.hidden = g.done;
      const fill = bar.firstElementChild;
      const w = `${Math.round((g.have / g.target) * 100)}%`;
      if (fill.style.width !== w) fill.style.width = w;
      const chip = row.querySelector('[data-chip]');
      chip.classList.toggle('life', g.done);
    }
    setText(e.ledgerNote, `Sized to about ${LEDGER_WEEK_DAYS} of your usual days, so it takes a few visits. All 3 → a Ledger stamp (cosmetic). Missing a week loses nothing.`);
    setText(e.stampTag, l.stamped ? 'Stamped' : `${l.goals.filter(g => g.done).length} / ${l.goals.length} done`);
    const first = Math.max(1, l.number - STAMP_CHIPS + 1);
    let chips = '';
    for (let n = first; n <= l.number; n++) {
      const has = l.stamps.includes(n);
      chips += `<span class="chip${has ? ' gold' : ''}${has || n === l.number ? '' : ' cal-dimchip'}" aria-label="Week ${n}: ${has ? 'stamped' : (n === l.number ? 'in progress' : 'no stamp')}">W${n}${has ? ' ✓' : ''}</span>`;
    }
    if (first > 1) chips = `<span class="cal-dim">${l.stamps.filter(n => n < first).length} earlier</span>` + chips;
    if (e.stamps.dataset.key !== chips) { e.stamps.dataset.key = chips; e.stamps.innerHTML = chips; }
  }
}
