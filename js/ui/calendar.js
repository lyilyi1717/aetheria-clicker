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
import { t } from '../i18n/index.js';

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
  if (d > 0) return t('dur.d_h', { d, h });
  return h > 0 ? t('dur.h_min', { h, m }) : t('dur.min', { n: m });
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
                <div class="eyebrow">${t('cal.daily')}</div>
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
          <section class="card cal-souq" aria-label="${t('cal.souq')}">
            <div class="icon-tile" data-c="souqIcon" aria-hidden="true"></div>
            <div>
              <div class="eyebrow">${t('cal.souq_week')}</div>
              <div class="cal-souq-name" data-c="souqName"></div>
              <div class="cal-dim" data-c="souqDesc"></div>
            </div>
            <span class="chip life">${t('cal.active')}</span>
          </section>
          <section class="card" aria-labelledby="cal-seals-h">
            <div class="card-head"><h3 id="cal-seals-h">${t('cal.seals')}</h3><span class="cal-dim" data-c="sealSummary"></span></div>
            <div class="cal-seals" data-c="seals">
              ${SEALS.map(s => `
                <div class="cal-seal" data-seal="${s.id}" title="${esc(s.desc)}">
                  <div class="cal-seal-lamp" aria-hidden="true">${s.icon}</div>
                  <div class="cal-seal-n">${esc(s.name)}<br>${esc(s.short)}</div>
                  <div class="cal-seal-state" data-state></div>
                  <div class="bar gold" data-bar><i></i></div>
                </div>`).join('')}
            </div>
            <p class="cal-note">${t('cal.seals_note', { n: SEAL_SHARD_BONUS_MAX })}</p>
          </section>
        </div>
        <section class="card cal-ledger" aria-labelledby="cal-ledger-h">
          <div class="card-head">
            <div><div class="eyebrow">${t('cal.ledger')}</div><h2 id="cal-ledger-h" data-c="week"></h2></div>
            <span class="chip" data-c="rotation"></span>
          </div>
          <div data-c="goals"></div>
          <div class="cal-ledger-foot">
            <span class="cal-dim" data-c="ledgerNote"></span>
            <span class="tag" data-c="stampTag"></span>
          </div>
          <div class="cal-stamps">
            <div class="eyebrow">${t('cal.stamps')}</div>
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
      this.tabBtn.title = on ? t('cal.tab_ready') : t('nav.title.dallah_daily_gift_weekly');
    }
  }

  renderDallah() {
    const d = this.sys.getDaily();
    const e = this.el;
    setText(e.dallahTitle, d.canClaim ? t('cal.poured') : t('cal.claimed_today'));
    setText(e.visits, t('cal.visits', { n: d.visits }));
    const days = Math.max(1, d.bank);
    const sand = DALLAH_SAND * days;
    const gift = `<span class="chip sand">${t('dallah.poured_sand', { n: sand })}</span>` +
      `<span class="chip gold">${t(days > 1 ? 'cal.bonus_contracts' : 'cal.bonus_contract', { n: days })}</span>` +
      `<span class="chip life">${t('cal.coffee_chip')}</span>`;
    if (e.gift.dataset.key !== gift) { e.gift.dataset.key = gift; e.gift.innerHTML = gift; }
    const dots = Array.from({ length: DALLAH_BANK_MAX }, (_, i) => `<i class="${i < d.bank ? 'on' : ''}">${i < d.bank ? '✓' : ''}</i>`).join('');
    const bank = `${t('cal.banked')} ${dots} <span>· ${d.bank > 0 ? t(d.bank > 1 ? 'cal.unclaimed' : 'cal.unclaimed1', { n: d.bank }) : t('cal.midnight')}</span>`;
    if (e.bank.dataset.key !== bank) { e.bank.dataset.key = bank; e.bank.innerHTML = bank; }
    setAttr(e.bank, 'aria-label', t('cal.bank_aria', { a: d.bank, b: DALLAH_BANK_MAX }));
    setText(e.claim, d.canClaim ? t(d.bank > 1 ? 'cal.claim_days' : 'cal.claim_day', { n: d.bank }) : t('cal.claimed'));
    setAttr(e.claim, 'aria-disabled', String(!d.canClaim));
    e.claim.disabled = !d.canClaim;
    e.claim.classList.toggle('btn-primary', d.canClaim);
  }

  renderSouq() {
    const m = this.sys.getSouq();
    const e = this.el;
    setText(e.souqIcon, m.icon);
    setText(e.souqName, m.name);
    setText(e.souqDesc, `${m.desc} ${t('cal.souq_ends')}`);
  }

  renderSeals() {
    const seals = this.sys.getSeals();
    const lit = seals.filter(s => s.lit).length;
    setText(this.el.sealSummary, t('cal.seal_summary', { a: lit, b: SEALS.length, n: Math.min(SEAL_SHARD_BONUS_MAX, lit) }));
    for (const s of seals) {
      const el = this.sealEls.get(s.id);
      if (!el) continue;
      el.classList.toggle('lit', s.lit);
      setText(el.querySelector('[data-state]'), s.lit ? t('cal.lit') : `${Math.floor(s.pct * 100)}%`);
      el.querySelector('[data-bar]').hidden = s.lit;
      const fill = el.querySelector('[data-bar] > i');
      const w = `${Math.round(s.pct * 100)}%`;
      if (fill && fill.style.width !== w) fill.style.width = w;
      setAttr(el, 'aria-label', `${t('cal.seal_aria', { name: s.name, state: s.lit ? t('cal.lit_word') : t('cal.of_way', { n: Math.floor(s.pct * 100) }) })} ${s.desc}`);
    }
  }

  renderLedger() {
    const l = this.sys.getLedger();
    const e = this.el;
    setText(e.week, t('cal.week', { n: l.number }));
    setText(e.rotation, t('cal.rotates', { time: fmtRotation(l.msToRotation) }));
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
          <span class="chip" data-chip>${t('ledger.seals', { n: g.seals })}</span>
        </div>`).join('');
    }
    for (const g of l.goals) {
      const row = e.goals.querySelector(`[data-goal="${g.id}"]`);
      if (!row) continue;
      row.classList.toggle('done', g.done);
      setText(row.querySelector('[data-g]'), g.done ? `${g.label} ✓` : g.label);
      setText(row.querySelector('[data-s]'), g.done ? t('codex.done') : `${g.have.toLocaleString('en-US')} / ${g.target.toLocaleString('en-US')}`);
      const bar = row.querySelector('[data-bar]');
      bar.hidden = g.done;
      const fill = bar.firstElementChild;
      const w = `${Math.round((g.have / g.target) * 100)}%`;
      if (fill.style.width !== w) fill.style.width = w;
      const chip = row.querySelector('[data-chip]');
      chip.classList.toggle('life', g.done);
    }
    setText(e.ledgerNote, t('cal.ledger_note', { n: LEDGER_WEEK_DAYS }));
    setText(e.stampTag, l.stamped ? t('cal.stamped') : t('cal.done_count', { a: l.goals.filter(g => g.done).length, b: l.goals.length }));
    const first = Math.max(1, l.number - STAMP_CHIPS + 1);
    let chips = '';
    for (let n = first; n <= l.number; n++) {
      const has = l.stamps.includes(n);
      chips += `<span class="chip${has ? ' gold' : ''}${has || n === l.number ? '' : ' cal-dimchip'}" aria-label="${t('cal.week', { n })}: ${has ? t('cal.stamped') : (n === l.number ? t('cal.in_progress') : t('cal.no_stamp'))}">${t('cal.w', { n })}${has ? ' ✓' : ''}</span>`;
    }
    if (first > 1) chips = `<span class="cal-dim">${t('cal.earlier', { n: l.stamps.filter(n => n < first).length })}</span>` + chips;
    if (e.stamps.dataset.key !== chips) { e.stamps.dataset.key = chips; e.stamps.innerHTML = chips; }
  }
}
