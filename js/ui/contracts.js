// The Bounties tab's contract board (roadmap 4.4, R10; mockup docs/ui/mockups/contract-board.html).
// Draws the Guild Rank header, the refill strip and the board. The rules live in BountySystem;
// this file only reads state and forwards clicks. Public API:
//   buildContractsBoard(app)   full redraw (tab opened, contract claimed or rerolled)
//   updateContractsBoard(app)  cheap per-frame update: progress, timer; redraws when the board changed
//   bindContracts(app)         one delegated click handler (claim, reroll) on #tab-bounties
import { BigNum } from '../engine/BigNum.js';
import { BOARD_SIZE, CONTRACT_INTERVAL_MS, TAB_NAMES, contractTitle, contractTask } from '../systems/BountySystem.js';
import { contractsForRank, guildTitle, guildRankFor } from '../systems/TalentSources.js';
import { t } from '../i18n/index.js';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);
const fmt = (n) => BigNum.formatNumber(n, 2);
const pctOf = (b) => Math.min(100, Math.max(0, (b.current / b.required) * 100));
const mmss = (sec) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const setText = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
const setWidth = (el, w) => { if (el && el.style.width !== w) el.style.width = w; };

let lastSig = '';

// What forces a redraw: a contract appeared, left, completed, or lost its reroll
function signature(app) {
  const bs = app.bountySystem;
  return app.gameState.bounties
    .map(b => `${b.id}:${b.completed ? 1 : 0}${bs.canReroll(b) ? 1 : 0}`).join('|');
}

function rankInfo(gs) {
  const rec = gs.records || {};
  const claimed = rec.contractsClaimed || 0;
  const rank = rec.guildRank ?? guildRankFor(claimed);
  const next = contractsForRank(rank + 1);
  const prev = contractsForRank(rank);
  return {
    rank, claimed, left: Math.max(0, next - claimed),
    pct: Math.min(100, Math.max(0, ((claimed - prev) / Math.max(1, next - prev)) * 100))
  };
}

function contractCard(b, canReroll) {
  const tab = TAB_NAMES[b.tab] || '';
  const ready = b.completed;
  const seals = b.rewards.seals;
  const title = contractTitle(b);
  const chips = `<span class="chip gold">${t('ct.gold', { n: fmt(b.rewards.gold) })}</span>`
    + (b.rewards.chrono ? `<span class="chip sand">${t('ct.sand', { n: fmt(b.rewards.chrono) })}</span>` : '')
    + (seals ? `<span class="chip life">${t(seals === 1 ? 'ct.seal' : 'ct.seals', { n: fmt(seals) })}</span>` : '')
    + (b.rewards.talentPoint ? `<span class="chip dust">${t('ct.tp')}</span>` : '');
  const reroll = canReroll
    ? `${t('ct.free_reroll')} <button class="btn btn-ghost btn-sm reroll-btn" data-reroll="${esc(b.id)}" aria-label="${esc(t('ct.reroll_aria', { name: title }))}">${t('ct.reroll')}</button>`
    : (b.rerolled ? t('ct.rerolled') : '');
  const foot = ready
    ? `<span class="reroll">${t('ct.complete')}</span><button class="btn btn-primary" data-claim="${esc(b.id)}">${t('ct.claim')}</button>`
    : `<span class="reroll">${reroll}</span><span class="dim num count" id="ct-count-${esc(b.id)}">${fmt(b.current)} / ${fmt(b.required)}</span>`;
  return `<article class="contract ${ready ? 'ready' : 'active'}">
    <div class="icon-tile" aria-hidden="true">${esc(b.icon)}</div>
    <div class="ct-body">
      <div class="h"><h3>${esc(title)}</h3>${tab ? `<span class="tabchip">${esc(t('ct.from', { tab }))}</span>` : ''}</div>
      <div class="d">${esc(contractTask(b))}</div>
      <div class="bar gold" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pctOf(b))}" aria-label="${esc(t('ct.progress', { name: title }))}"><i id="ct-fill-${esc(b.id)}" style="width:${pctOf(b)}%"></i></div>
      <div class="rew">${chips}</div>
      <div class="f">${foot}</div>
    </div>
  </article>`;
}

export function buildContractsBoard(app) {
  const root = document.getElementById('bounties-list-container');
  if (!root) return;
  const gs = app.gameState;
  const bs = app.bountySystem;
  const info = rankInfo(gs);
  const cards = gs.bounties.map(b => contractCard(b, bs.canReroll(b))).join('');
  const empty = gs.bounties.length < BOARD_SIZE
    ? `<div class="contract empty"><div><div class="empty-ic" aria-hidden="true">📜</div>${t('ct.next_in')} <b class="num c-sand" id="ct-empty-time">--:--</b><div class="dim note-s">${t('ct.ff_note')}</div></div></div>`
    : '';
  root.innerHTML = `
    <section class="guild-head">
      <div class="rank">
        <div class="medal" aria-hidden="true">🏅</div>
        <div class="rank-main">
          <div class="eyebrow">${t('stars.src.guild')}</div>
          <div class="rank-line"><b class="rank-num num" id="ct-rank">${info.rank}</b><span class="dim" id="ct-rank-text"></span></div>
          <div class="bar gold" aria-hidden="true"><i id="ct-rank-fill" style="width:${info.pct}%"></i></div>
        </div>
      </div>
      <div class="rank-stats"><span>${t('ct.seals_label')} <b class="c-life num" id="ct-seals">${fmt(gs.guildSeals || 0)}</b></span><span>${t('ct.claimed')} <b class="num" id="ct-claimed">${fmt(info.claimed)}</b></span></div>
    </section>
    <div class="next"><span aria-hidden="true">🕒</span><span id="ct-next-text"></span><span class="bar sand" aria-hidden="true"><i id="ct-next-fill" style="width:0%"></i></span><span class="num c-sand" id="ct-next-time"></span><span class="dim num" id="ct-slots"></span></div>
    <div class="board">${cards}${empty}</div>`;
  lastSig = signature(app);
  updateContractsBoard(app, true);
}

export function updateContractsBoard(app, justBuilt = false) {
  const gs = app.gameState;
  if (!justBuilt && signature(app) !== lastSig) { buildContractsBoard(app); return; }
  // the free-slot card appears or goes away with the board size
  const hasEmpty = !!document.getElementById('ct-empty-time');
  if (!justBuilt && hasEmpty !== (gs.bounties.length < BOARD_SIZE)) { buildContractsBoard(app); return; }
  for (const b of gs.bounties) {
    setWidth(document.getElementById(`ct-fill-${b.id}`), `${pctOf(b)}%`);
    setText(document.getElementById(`ct-count-${b.id}`), `${fmt(b.current)} / ${fmt(b.required)}`);
  }
  const info = rankInfo(gs);
  setText(document.getElementById('ct-rank'), String(info.rank));
  setText(document.getElementById('ct-rank-text'),
    `${guildTitle(info.rank)} · ${t(info.left === 1 ? 'ct.to_rank1' : 'ct.to_rank', { n: info.left, r: info.rank + 1 })}`);
  setWidth(document.getElementById('ct-rank-fill'), `${info.pct}%`);
  setText(document.getElementById('ct-seals'), fmt(gs.guildSeals || 0));
  setText(document.getElementById('ct-claimed'), fmt(info.claimed));

  const sec = app.bountySystem.secondsToNext();
  setText(document.getElementById('ct-slots'), t('ct.slots', { a: Math.min(gs.bounties.length, BOARD_SIZE), b: BOARD_SIZE }));
  if (sec === null) {
    setText(document.getElementById('ct-next-text'), t('ct.full'));
    setText(document.getElementById('ct-next-time'), '');
    setWidth(document.getElementById('ct-next-fill'), '100%');
  } else {
    setText(document.getElementById('ct-next-text'), t('ct.refills'));
    setText(document.getElementById('ct-next-time'), mmss(sec));
    setText(document.getElementById('ct-empty-time'), mmss(sec));
    setWidth(document.getElementById('ct-next-fill'), `${Math.min(100, (1 - (sec * 1000) / CONTRACT_INTERVAL_MS) * 100)}%`);
  }
}

export function bindContracts(app) {
  const tab = document.getElementById('tab-bounties');
  if (!tab) return;
  tab.addEventListener('click', (e) => {
    const claim = e.target.closest('[data-claim]');
    if (claim) {
      app.bountySystem.claimBounty(claim.dataset.claim);
      buildContractsBoard(app);
      return;
    }
    const reroll = e.target.closest('[data-reroll]');
    if (reroll) {
      app.bountySystem.rerollBounty(reroll.dataset.reroll);
      buildContractsBoard(app);
    }
  });
}
