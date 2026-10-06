// Shard tree panel (R13, docs/redesign-proposal.md §6.3), in the Ascension Temple under the
// Transcend panel. main.js only calls init() once and update(currentTab) every frame. The DOM is
// built once; nodes are updated in place so buttons are never replaced under the pointer.
//
// It also owns the Auto-Ascend clock: a 1 s interval (it keeps running in background tabs,
// where requestAnimationFrame stops) asks the system whether to Ascend. Auto-Ascensions skip the
// big Ascension ceremony and are announced as one medium toast per batch through the reward
// system (§10 risk 2): same-kind toasts merge ("Auto-Ascended ×3", dust summed) and while the tab
// is hidden rewards.js holds them in its away batch and shows one on return.
import { BigNum } from '../engine/BigNum.js';
import { sound } from '../engine/AudioEngine.js';
import { rewards } from './rewards.js';
import {
  ShardTreeSystem, SHARD_TREE_BRANCHES, SHARD_TREE_NODES, AUTO_ASCEND_RULES, AUTO_ASCEND_TIMER_OPTIONS,
  LONG_WARP_SECONDS, getShardBalance, getSpentShards, getNode, autoAscendRuleMet
} from '../systems/ShardTreeSystem.js';

const setText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtDust = (d) => (d instanceof BigNum ? d : new BigNum(d)).format('standard', 0);

function fmtClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}:${String(sec).padStart(2, '0')}`;
}

export class ShardTreeUI {
  constructor(app) {
    this.app = app;
    this.nodeEls = new Map();
    this.timer = null;
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
      tier: 'medium', kind: 'auto-ascend', icon: '♾️', color: '#06b6d4',
      title: 'Auto-Ascended', batchTitle: 'Auto-Ascended ×{n}',
      amount: batch.dust, fmt: fmtDust, unit: 'Cosmic Dust'
    });
  }

  build() {
    const cont = document.getElementById('shard-tree-section');
    if (!cont || cont.dataset.built) return;
    cont.dataset.built = '1';

    const branchHtml = SHARD_TREE_BRANCHES.map(b => {
      const nodes = SHARD_TREE_NODES.filter(n => n.branch === b.id);
      const compact = b.id === 'foundry';
      const rows = nodes.map(n => compact ? `
        <div class="st-chip" data-node="${n.id}" title="${esc(n.desc)}">
          <span class="st-chip-name">T${n.tier}</span>
          <button class="st-buy" data-buy="${n.id}"></button>
        </div>` : `
        <div class="st-node" data-node="${n.id}">
          <div class="st-node-head">
            <span class="st-node-name">${n.icon} ${esc(n.name)}</span>
            <span class="st-cost">${n.cost} 💠</span>
          </div>
          <div class="st-desc">${esc(n.desc)}</div>
          ${n.requires.length ? `<div class="st-req">Requires ${n.requires.map(r => esc(getNode(r).name)).join(', ')}</div>` : ''}
          <div class="st-node-foot">
            <span class="st-status"></span>
            <button class="st-buy" data-buy="${n.id}"></button>
          </div>
          ${n.id === 'chronos_auto_ascend' ? this.autoAscendControlsHtml() : ''}
          ${n.id === 'chronos_long_warp' ? '<button class="st-warp btn-action" data-warp="1" hidden></button>' : ''}
        </div>`).join('');
      return `
        <div class="st-branch" data-branch="${b.id}">
          <div class="st-branch-head"><span>${b.icon} ${esc(b.name)}</span><span class="st-branch-count" data-count="${b.id}"></span></div>
          <div class="st-branch-desc">${esc(b.desc)}</div>
          ${compact ? `<div class="st-chips">${rows}</div><div class="st-foundry-note" data-foundry-note></div>` : `<div class="st-nodes">${rows}</div>`}
        </div>`;
    }).join('');

    cont.innerHTML = `
      <div class="st-box">
        <h3>💠 Shard Tree</h3>
        <p class="st-intro">Spend Fracture Shards on permanent nodes. The tree is never reset by Transcend.
          Your shard multipliers count every shard you have <em>earned</em>, so spending never lowers them.</p>
        <div class="st-stats">
          <div class="st-stat"><div class="k">To spend</div><div class="v" data-st="balance"></div></div>
          <div class="st-stat"><div class="k">Spent</div><div class="v" data-st="spent"></div></div>
          <div class="st-stat"><div class="k">Earned (multipliers)</div><div class="v" data-st="lifetime"></div></div>
        </div>
        <div class="st-branches">${branchHtml}</div>
      </div>`;

    for (const n of SHARD_TREE_NODES) {
      const el = cont.querySelector(`[data-node="${n.id}"]`);
      this.nodeEls.set(n.id, { el, btn: el.querySelector('.st-buy'), status: el.querySelector('.st-status') });
    }
    this.el = {
      balance: cont.querySelector('[data-st="balance"]'),
      spent: cont.querySelector('[data-st="spent"]'),
      lifetime: cont.querySelector('[data-st="lifetime"]'),
      counts: Object.fromEntries(SHARD_TREE_BRANCHES.map(b => [b.id, cont.querySelector(`[data-count="${b.id}"]`)])),
      foundryNote: cont.querySelector('[data-foundry-note]'),
      auto: cont.querySelector('.st-auto'),
      autoOn: cont.querySelector('[data-auto="enabled"]'),
      autoRule: cont.querySelector('[data-auto="rule"]'),
      autoTimer: cont.querySelector('[data-auto="timer"]'),
      autoTimerWrap: cont.querySelector('[data-auto-timer-wrap]'),
      autoStatus: cont.querySelector('[data-auto="status"]'),
      warp: cont.querySelector('[data-warp]')
    };

    cont.addEventListener('click', (e) => {
      const buy = e.target.closest('[data-buy]');
      if (buy) { this.buy(buy.dataset.buy); return; }
      if (e.target.closest('[data-warp]')) this.longWarp();
    });
    cont.addEventListener('change', (e) => {
      const t = e.target;
      if (t === this.el.autoOn) this.sys.setAutoAscendEnabled(t.checked);
      else if (t === this.el.autoRule) this.sys.setAutoAscendRule(t.value);
      else if (t === this.el.autoTimer) this.sys.setAutoAscendTimer(Number(t.value));
      this.update('prestige');
    });
    this.update('prestige');
  }

  autoAscendControlsHtml() {
    return `
      <div class="st-auto" hidden>
        <label class="st-auto-row"><input type="checkbox" data-auto="enabled"> Auto-Ascend on</label>
        <label class="st-auto-row">Rule
          <select data-auto="rule">${AUTO_ASCEND_RULES.map(r => `<option value="${r.id}">${esc(r.label)}</option>`).join('')}</select>
        </label>
        <label class="st-auto-row" data-auto-timer-wrap>Every
          <select data-auto="timer">${AUTO_ASCEND_TIMER_OPTIONS.map(m => `<option value="${m}">${m < 60 ? `${m} min` : `${m / 60} h`}</option>`).join('')}</select>
        </label>
        <div class="st-auto-status" data-auto="status"></div>
      </div>`;
  }

  buy(id) {
    const node = getNode(id);
    if (!node || !this.sys.buy(id)) return;
    sound.playBuy();
    rewards.notify({ tier: 'medium', kind: 'shard-node', icon: node.icon, color: '#f472b6', title: `Shard Tree: ${node.name}`, batchTitle: '{n} shard nodes' });
    this.update('prestige');
  }

  longWarp() {
    const res = this.sys.useLongWarp();
    if (!res) return;
    rewards.notify({
      tier: 'medium', kind: 'long-warp', icon: '⌛', color: '#38bdf8',
      title: `${LONG_WARP_SECONDS / 3600} h Fast Forward`, amount: res.aether, fmt: fmtDust, unit: 'Aether',
      detail: res.gardenHarvests ? `${res.gardenHarvests} Garden harvests` : ''
    });
    this.update('prestige');
  }

  update(tab) {
    if (tab !== 'prestige' || !this.el) return;
    const gs = this.gs;
    const sys = this.sys;
    const balance = getShardBalance(gs);
    setText(this.el.balance, `${balance} 💠`);
    setText(this.el.spent, `${getSpentShards(gs)}`);
    setText(this.el.lifetime, `${gs.getShardCount()}`);

    const owned = {};
    for (const n of SHARD_TREE_NODES) {
      const refs = this.nodeEls.get(n.id);
      const reason = sys.getBlockReason(n.id);
      const isOwned = reason === 'owned';
      if (isOwned) owned[n.branch] = (owned[n.branch] || 0) + 1;
      refs.el.classList.toggle('owned', isOwned);
      refs.el.classList.toggle('ready', reason === null);
      refs.el.classList.toggle('locked', !isOwned && reason !== null);
      const granted = isOwned && gs.shardTree?.granted?.[n.id];
      const label = isOwned ? (granted ? 'Owned (kept)' : 'Owned') : `Buy · ${n.cost} 💠`;
      setText(refs.btn, n.branch === 'foundry' ? (isOwned ? '✓' : `${n.cost} 💠`) : label);
      const disabled = reason !== null;
      if (refs.btn.disabled !== disabled) refs.btn.disabled = disabled;
      const tip = isOwned ? (granted ? 'Kept free from before the shard tree' : 'Owned') : (reason || `Buy for ${n.cost} shard${n.cost === 1 ? '' : 's'}`);
      if (refs.btn.title !== tip) refs.btn.title = tip;
      setText(refs.status, isOwned ? '' : (reason || ''));
    }
    for (const b of SHARD_TREE_BRANCHES) {
      const total = SHARD_TREE_NODES.filter(n => n.branch === b.id).length;
      setText(this.el.counts[b.id], `${owned[b.id] || 0} / ${total}`);
    }
    const fr = sys.getBlockReason('foundry_t15');
    setText(this.el.foundryNote, fr === 'opens with the upgrade shop' ? 'Deep Blueprints go on sale with the upgrade shop.' : 'One shard per tier, from Tier 15 (each Transcend opens the next).');

    this.updateAutoAscend();
    this.updateLongWarp();
  }

  updateAutoAscend() {
    const el = this.el;
    const has = this.sys.has('chronos_auto_ascend');
    if (el.auto.hidden === has) el.auto.hidden = !has;
    if (!has) return;
    const a = this.gs.shardTree.autoAscend;
    if (el.autoOn.checked !== a.enabled) el.autoOn.checked = a.enabled;
    if (el.autoRule.value !== a.rule) el.autoRule.value = a.rule;
    if (el.autoTimer.value !== String(a.timerMin)) el.autoTimer.value = String(a.timerMin);
    const isTimer = a.rule === 'timer';
    if (el.autoTimerWrap.hidden === isTimer) el.autoTimerWrap.hidden = !isTimer;

    let status;
    const ps = this.app.prestigeSystem;
    const now = Date.now();
    const wait = ps.getMinRunRemaining(now);
    const pending = ps.getPendingCosmicDust();
    if (!a.enabled) status = 'Off: Ascend by hand.';
    else if (wait > 0) status = `Waiting for the 10-min minimum run (${fmtClock(wait)}).`;
    else if (pending.lte(0)) status = 'Waiting for the first Cosmic Dust of this run (1e9 run Aether).';
    else if (isTimer) {
      const left = a.timerMin * 60 - (now - (this.gs.runStartedAt || 0)) / 1000;
      status = left > 0 ? `Next Auto-Ascend in ${fmtClock(left)}.` : 'Ascending…';
    } else {
      const rule = AUTO_ASCEND_RULES.find(r => r.id === a.rule);
      const need = this.gs.totalCosmicDust.mul(rule.mult - 1);
      status = autoAscendRuleMet(a, pending, this.gs.totalCosmicDust, Infinity)
        ? 'Ascending…'
        : `Pending ${fmtDust(pending)} of ${fmtDust(need.ceil())} dust (${rule.label} lifetime).`;
    }
    setText(el.autoStatus, status);
  }

  updateLongWarp() {
    const btn = this.el.warp;
    if (!btn) return;
    const has = this.sys.has('chronos_long_warp');
    if (btn.hidden === has) btn.hidden = !has;
    if (!has) return;
    const left = this.sys.getLongWarpReadyIn();
    const disabled = left > 0;
    if (btn.disabled !== disabled) btn.disabled = disabled;
    setText(btn, disabled ? `⌛ 6 h Fast Forward in ${fmtClock(left)}` : '⌛ Fast Forward 6 h');
  }
}
