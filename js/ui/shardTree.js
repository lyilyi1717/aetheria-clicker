// Shard tree panel (R13, docs/redesign-proposal.md §6.3; mockup docs/ui/mockups/shard-tree.html),
// in the Ascension tab under the Transcend panel. main.js only calls init() once and
// update(currentTab) every frame. The DOM is built once and updated in place, so buttons are
// never replaced under the pointer.
//
// It also owns the Auto-Ascend clock: a 1 s interval (it keeps running in background tabs, where
// requestAnimationFrame stops) asks the system whether to Ascend. Auto-Ascensions skip the big
// Ascension ceremony and are announced through rewards.js as one medium toast of kind
// 'auto-ascend' (§10 risk 2): same-kind toasts merge ("Auto-Ascended ×3", dust summed), and while
// the tab is hidden rewards.js holds them in its away batch and shows one on return.
import { BigNum } from '../engine/BigNum.js';
import { sound } from '../engine/AudioEngine.js';
import { rewards } from './rewards.js';
import { TERMS as T } from '../data/strings.js';
import {
  ShardTreeSystem, SHARD_TREE_BRANCHES, SHARD_TREE_NODES, AUTO_ASCEND_RULES, AUTO_ASCEND_TIMER_OPTIONS,
  LONG_WARP_SECONDS, getShardBalance, getSpentShards, getNode, autoAscendRuleMet
} from '../systems/ShardTreeSystem.js';
import { t, bidi } from '../i18n/index.js';

const setText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };
const setAttr = (el, k, v) => { if (el && el.getAttribute(k) !== v) el.setAttribute(k, v); };
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtBig = (d) => (d instanceof BigNum ? d : new BigNum(d)).format('standard', 0);
const SHARD = '◆';

function fmtClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? t('dur.h_min', { h, m: String(m).padStart(2, '0') }) : `${m}:${String(sec).padStart(2, '0')}`;
}

function fmtMult(b) {
  if (b.lt(1e6)) {
    const n = b.toNumber();
    return bidi(`×${n >= 10 ? n.toLocaleString('en-US', { maximumFractionDigits: 1 }) : n.toFixed(2)}`);
  }
  return bidi(`×${b.format('scientific', 2)}`);
}

export class ShardTreeUI {
  constructor(app) {
    this.app = app;
    this.nodeEls = new Map();
    this.timer = null;
    this.filter = 'all';
    this.selectedTier = null;   // Foundry tile picked for the detail row
  }

  get gs() { return this.app.gameState; }
  get sys() { return this.app.shardTreeSystem; }

  init() {
    if (!this.app.shardTreeSystem) {
      this.app.shardTreeSystem = new ShardTreeSystem(this.app.gameState, this.app.prestigeSystem);
    }
    this.gs.shardTreeSystem = this.app.shardTreeSystem;
    this.build();
    if (!this.timer) this.timer = setInterval(() => this.tickAutoAscend(), 1000);
  }

  // Auto-Ascend check; at most one Ascension per call (the 10-min minimum run spaces them anyway)
  tickAutoAscend() {
    this.sys.tick();
    const batch = this.sys.takeAutoAscendBatch();
    if (!batch) return;
    rewards.notify({
      tier: 'medium', kind: 'auto-ascend', icon: '🔁', color: '#c084fc',
      title: batch.count > 1 ? `${T.autoReset1} ×${batch.count}` : T.autoReset1, batchTitle: `${T.autoReset1} ×{n}`,
      amount: batch.dust, fmt: fmtBig, unit: T.reset1Currency
    });
  }

  nodeHtml(n) {
    const req = n.requires.length ? t('st.needs', { list: n.requires.map(r => esc(getNode(r).name)).join(t('list.sep')) }) : t('st.no_prereq');
    return `
      <div class="st-node" data-node="${n.id}">
        <div class="st-orb" aria-hidden="true">${n.icon}</div>
        <div class="st-node-text">
          <div class="st-n">${esc(n.name)}</div>
          <div class="st-e">${esc(n.desc)}</div>
          <div class="st-req" data-req>${req}</div>
        </div>
        <div class="st-act">
          <span class="st-state" data-state hidden>${t('st.owned')}</span>
          <button class="btn btn-sm num" data-buy="${n.id}">${n.cost} ${SHARD}</button>
        </div>
      </div>`;
  }

  build() {
    const cont = document.getElementById('shard-tree-section');
    if (!cont || cont.dataset.built) return;
    cont.dataset.built = '1';

    const foundry = SHARD_TREE_NODES.filter(n => n.branch === 'foundry');
    const tiles = foundry.map(n => `<button class="st-tile num" data-tile="${n.tier}" aria-label="${t('st.tile_aria', { n: n.tier })}">${n.tier}</button>`).join('');
    const nodes = (b) => SHARD_TREE_NODES.filter(n => n.branch === b).map(n => this.nodeHtml(n)).join('');
    const seg = (name, opts) => `<div class="seg" role="group" data-seg="${name}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="false">${l}</button>`).join('')}</div>`;

    cont.innerHTML = `
      <div class="st-wrap">
        <section class="card st-head">
          <div>
            <div class="eyebrow">${T.reset2Currency}</div>
            <div class="st-big num" data-st="balance"></div>
            <div class="st-sub num" data-st="sub"></div>
          </div>
          <div class="st-head-r">
            <div class="bar-row"><span data-st="gateLabel"></span><span class="bar shard"><i data-st="gateFill"></i></span><span class="val" data-st="gatePct"></span></div>
          </div>
        </section>
        <p class="st-intro">${t('st.intro')}</p>
        <div class="st-filter" role="group" aria-label="${t('st.branch_aria')}">
          <button type="button" class="chip" data-filter="all" aria-pressed="true">${t('bb.all')}</button>
          ${SHARD_TREE_BRANCHES.map(b => `<button type="button" class="chip" data-filter="${b.id}" aria-pressed="false">${b.icon} ${esc(b.name)} <span class="num" data-count="${b.id}"></span></button>`).join('')}
        </div>
        <div class="st-tree" data-filter-on="all">
          <section class="card st-branch" data-branch="foundry">
            <h3>${SHARD_TREE_BRANCHES[0].icon} ${esc(SHARD_TREE_BRANCHES[0].name)} <small>${t('st.foundry_sub', { s: SHARD })}</small></h3>
            <div class="st-foundry">${tiles}</div>
            <div class="st-tile-detail">
              <div class="st-tile-text"><div class="st-n" data-fd="name"></div><div class="st-req" data-fd="req"></div></div>
              <button class="btn btn-sm num" data-fd="buy"></button>
            </div>
          </section>
          <section class="card st-branch" data-branch="chronos">
            <h3>${SHARD_TREE_BRANCHES[1].icon} ${esc(SHARD_TREE_BRANCHES[1].name)} <small class="num" data-count2="chronos"></small></h3>
            <div class="st-nodes">${nodes('chronos')}</div>
            <div class="st-auto" data-auto hidden>
              <div class="st-auto-row"><span class="st-lbl">${T.autoReset1}</span>${seg('enabled', [['on', t('ab.on')], ['off', t('ab.off')]])}</div>
              <div class="st-auto-row"><span class="st-lbl">${t('st.when')}</span>${seg('rule', AUTO_ASCEND_RULES.map(r => [r.id, r.id === 'timer' ? r.label : `×${r.mult}`]))}</div>
              <div class="st-auto-row" data-auto-timer><span class="st-lbl">${t('st.every')}</span>${seg('timer', AUTO_ASCEND_TIMER_OPTIONS.map(m => [String(m), m < 60 ? t('dur.min', { n: m }) : t('dur.h', { n: m / 60 })]))}</div>
              <div class="st-auto-status" data-auto-status></div>
            </div>
            <button class="btn btn-sand st-warp" data-warp hidden></button>
          </section>
          <section class="card st-branch" data-branch="tower">
            <h3>${SHARD_TREE_BRANCHES[2].icon} ${esc(SHARD_TREE_BRANCHES[2].name)} <small class="num" data-count2="tower"></small></h3>
            <div class="st-nodes">${nodes('tower')}</div>
          </section>
        </div>
      </div>`;

    const q = (sel) => cont.querySelector(sel);
    for (const n of SHARD_TREE_NODES) {
      if (n.branch === 'foundry') {
        this.nodeEls.set(n.id, { el: q(`[data-tile="${n.tier}"]`) });
      } else {
        const el = q(`[data-node="${n.id}"]`);
        this.nodeEls.set(n.id, { el, btn: el.querySelector('[data-buy]'), state: el.querySelector('[data-state]'), req: el.querySelector('[data-req]') });
      }
    }
    this.el = {
      tree: q('.st-tree'),
      balance: q('[data-st="balance"]'), sub: q('[data-st="sub"]'),
      gateLabel: q('[data-st="gateLabel"]'), gateFill: q('[data-st="gateFill"]'), gatePct: q('[data-st="gatePct"]'),
      filters: [...cont.querySelectorAll('[data-filter]')],
      counts: Object.fromEntries(SHARD_TREE_BRANCHES.map(b => [b.id, q(`[data-count="${b.id}"]`)])),
      counts2: { chronos: q('[data-count2="chronos"]'), tower: q('[data-count2="tower"]') },
      fdName: q('[data-fd="name"]'), fdReq: q('[data-fd="req"]'), fdBuy: q('[data-fd="buy"]'),
      auto: q('[data-auto]'), autoTimer: q('[data-auto-timer]'), autoStatus: q('[data-auto-status]'),
      segs: { enabled: q('[data-seg="enabled"]'), rule: q('[data-seg="rule"]'), timer: q('[data-seg="timer"]') },
      warp: q('[data-warp]')
    };

    cont.addEventListener('click', (e) => {
      const tgt = e.target;
      const buy = tgt.closest('[data-buy]');
      if (buy) return this.buy(buy.dataset.buy);
      const tile = tgt.closest('[data-tile]');
      if (tile) { this.selectedTier = Number(tile.dataset.tile); return this.update('prestige'); }
      if (tgt.closest('[data-fd="buy"]')) return this.buy(`foundry_t${this.currentTier()}`);
      if (tgt.closest('[data-warp]')) return this.longWarp();
      const f = tgt.closest('[data-filter]');
      if (f) { this.filter = f.dataset.filter; return this.update('prestige'); }
      const sb = tgt.closest('[data-seg] button');
      if (sb) {
        const which = sb.parentElement.dataset.seg;
        const v = sb.dataset.v;
        if (which === 'enabled') this.sys.setAutoAscendEnabled(v === 'on');
        else if (which === 'rule') this.sys.setAutoAscendRule(v);
        else if (which === 'timer') this.sys.setAutoAscendTimer(Number(v));
        this.update('prestige');
      }
    });
    this.update('prestige');
  }

  // Foundry tile in the detail row: the picked one, else the first one not owned yet
  currentTier() {
    if (this.selectedTier) return this.selectedTier;
    const next = SHARD_TREE_NODES.find(n => n.branch === 'foundry' && !this.sys.has(n.id));
    return next ? next.tier : 30;
  }

  buy(id) {
    const node = getNode(id);
    if (!node || !this.sys.buy(id)) return;
    sound.playBuy();
    rewards.notify({ tier: 'medium', kind: 'shard-node', icon: node.icon, color: '#f472b6', title: `${T.shareTree}: ${node.name}`, batchTitle: t('st.nodes_batch') });
    this.update('prestige');
  }

  longWarp() {
    const res = this.sys.useLongWarp();
    if (!res) return;
    rewards.notify({
      tier: 'medium', kind: 'long-warp', icon: '⏩', color: '#e7c38a',
      title: t('st.long_warp', { n: LONG_WARP_SECONDS / 3600 }), amount: res.aether, fmt: fmtBig, unit: T.currency,
      detail: res.gardenHarvests ? t('st.harvests', { n: res.gardenHarvests }) : ''
    });
    this.update('prestige');
  }

  update(tab) {
    if (tab !== 'prestige' || !this.el) return;
    const gs = this.gs;
    const sys = this.sys;
    const el = this.el;
    const balance = getShardBalance(gs);
    setText(el.balance, `${balance} ${SHARD}`);
    setText(el.sub, t('st.sub', { a: gs.getShardCount(), b: getSpentShards(gs), x: fmtMult(gs.getShardAetherMult()) }));

    // Next Transcend progress (lifetime dust of this layer vs the gate)
    const ps = this.app.prestigeSystem;
    const gate = ps.getTranscendGate();
    const pct = Math.max(0, Math.min(100, 100 * gs.totalCosmicDust.div(gate).toNumber()));
    setText(el.gateLabel, t('st.next_gate', { n: fmtBig(gate) }));
    const w = `${pct.toFixed(1)}%`;
    if (el.gateFill.style.width !== w) el.gateFill.style.width = w;
    setText(el.gatePct, `${Math.floor(pct)}%`);

    // Branch filter (mainly for phones, where the branches stack)
    setAttr(el.tree, 'data-filter-on', this.filter);
    for (const f of el.filters) setAttr(f, 'aria-pressed', String(f.dataset.filter === this.filter));

    const owned = {};
    for (const n of SHARD_TREE_NODES) {
      const refs = this.nodeEls.get(n.id);
      const reason = sys.getBlockReason(n.id);
      const isOwned = reason === 'owned';
      if (isOwned) owned[n.branch] = (owned[n.branch] || 0) + 1;
      const state = isOwned ? 'own' : reason === null ? 'aff' : 'lock';
      for (const c of ['own', 'aff', 'lock']) refs.el.classList.toggle(c, c === state);
      if (n.branch === 'foundry') {
        refs.el.classList.toggle('sel', n.tier === this.currentTier());
        setAttr(refs.el, 'aria-label', `${t('st.tile_aria', { n: n.tier })}: ${isOwned ? t('st.owned') : (reason || t('st.can_buy'))}`);
        continue;
      }
      const granted = isOwned && gs.shardTree?.granted?.[n.id];
      refs.state.hidden = !isOwned;
      setText(refs.state, granted ? t('st.owned_kept') : t('st.owned'));
      refs.btn.hidden = isOwned;
      refs.btn.classList.toggle('btn-primary', state === 'aff');
      refs.btn.classList.toggle('is-locked', state === 'lock');
      setAttr(refs.btn, 'aria-disabled', String(state !== 'aff'));
      setAttr(refs.btn, 'title', state === 'aff' ? t(n.cost === 1 ? 'st.buy_for1' : 'st.buy_for', { n: n.cost }) : (reason || ''));
      const needsReq = n.requires.some(r => !sys.has(r));
      const reqText = isOwned
        ? (granted ? t('st.kept_free') : '')
        : (reason && needsReq ? reason[0].toUpperCase() + reason.slice(1) : (n.requires.length ? t('st.after', { list: n.requires.map(r => getNode(r).name).join(t('list.sep')) }) : t('st.no_prereq')));
      setText(refs.req, reqText);
    }
    for (const b of SHARD_TREE_BRANCHES) {
      const total = SHARD_TREE_NODES.filter(n => n.branch === b.id).length;
      setText(el.counts[b.id], `${owned[b.id] || 0}/${total}`);
      if (el.counts2[b.id]) setText(el.counts2[b.id], `${owned[b.id] || 0} / ${total}`);
    }

    // Foundry detail row: one buy button for the picked tile
    const tier = this.currentTier();
    const fid = `foundry_t${tier}`;
    const fr = sys.getBlockReason(fid);
    setText(el.fdName, t('st.fd_name', { n: tier }));
    setText(el.fdReq, fr === 'owned' ? t('st.fd_owned') : fr === null ? t('st.fd_will') : t('unlock.locked', { text: fr }));
    el.fdBuy.hidden = fr === 'owned';
    el.fdBuy.classList.toggle('btn-primary', fr === null);
    el.fdBuy.classList.toggle('is-locked', fr !== null);
    setAttr(el.fdBuy, 'aria-disabled', String(fr !== null));
    setText(el.fdBuy, `1 ${SHARD}`);

    this.updateAutoAscend();
    this.updateLongWarp();
  }

  updateAutoAscend() {
    const el = this.el;
    const has = this.sys.has('chronos_auto_ascend');
    if (el.auto.hidden === has) el.auto.hidden = !has;
    if (!has) return;
    const a = this.gs.shardTree.autoAscend;
    const press = (segEl, v) => { for (const b of segEl.children) setAttr(b, 'aria-pressed', String(b.dataset.v === v)); };
    press(el.segs.enabled, a.enabled ? 'on' : 'off');
    press(el.segs.rule, a.rule);
    press(el.segs.timer, String(a.timerMin));
    const isTimer = a.rule === 'timer';
    if (el.autoTimer.hidden === isTimer) el.autoTimer.hidden = !isTimer;

    const ps = this.app.prestigeSystem;
    const now = Date.now();
    const wait = ps.getMinRunRemaining(now);
    const pending = ps.getPendingCosmicDust();
    let status;
    if (!a.enabled) status = t('st.auto.off');
    else if (wait > 0) status = t('st.auto.min_run', { time: fmtClock(wait) });
    else if (pending.lte(0)) status = t('st.auto.first');
    else if (isTimer) {
      const left = a.timerMin * 60 - (now - (this.gs.runStartedAt || 0)) / 1000;
      status = left > 0 ? t('st.auto.next', { time: fmtClock(left) }) : t('st.auto.drilling');
    } else {
      const rule = AUTO_ASCEND_RULES.find(r => r.id === a.rule);
      const need = this.gs.totalCosmicDust.mul(rule.mult - 1).ceil();
      status = autoAscendRuleMet(a, pending, this.gs.totalCosmicDust, Infinity)
        ? t('st.auto.drilling')
        : t('st.auto.pending', { a: fmtBig(pending), b: fmtBig(need) });
    }
    setText(el.autoStatus, status);
  }

  updateLongWarp() {
    const btn = this.el.warp;
    const has = this.sys.has('chronos_long_warp');
    if (btn.hidden === has) btn.hidden = !has;
    if (!has) return;
    const left = this.sys.getLongWarpReadyIn();
    const ready = left <= 0;
    btn.classList.toggle('is-locked', !ready);
    setAttr(btn, 'aria-disabled', String(!ready));
    setText(btn, ready ? t('st.warp_ready') : t('st.warp_wait', { time: fmtClock(left) }));
  }
}
