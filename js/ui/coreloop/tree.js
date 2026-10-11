// The one upgrade tree as a view (docs/core-loop-plan.md CL-24): three rings as three groups,
// innermost first. The Prestige screen mounts it: mountTree(el, api) -> { update(api) }.
// Pure helpers (ringsShown, sortNodes, effectLine, nodeName, ...) turn the state into plain values;
// the DOM is built once per card and update() only changes text, classes and the order of cards.
import { registerStrings } from '../../i18n/coreloop/index.js';
import EN from '../../i18n/coreloop/tree.en.js';
import AR from '../../i18n/coreloop/tree.ar.js';
import { P } from '../../systems/coreloop/params.js';
import { FIELDS } from '../../systems/coreloop/shared.js';
import * as Tree from '../../systems/coreloop/Tree.js';

registerStrings(EN, AR);

export const RING_IDS = Tree.RINGS;

// --- pure views ----------------------------------------------------------------------------------
const ringHasRank = (state, ring) => Tree.nodes(state, ring).some(n => n.rank > 0);
const everHeld = {
  reserves: (s) => s.prestige.wells > 0 || s.prestige.reserves > 0,
  shares: (s) => s.prestige.totalFields > 0 || s.prestige.shares > 0,
  pages: (s) => s.prestige.chronicles > 0 || s.prestige.pages > 0
};

// Which rings show: a ring whose bank has ever held anything or that has a rank. `next` is the one
// ring still to come (it gets one locked line); the one after it is not shown at all.
export function ringsShown(state) {
  const shown = RING_IDS.filter(r => Tree.bank(state, r) > 0 || ringHasRank(state, r) || everHeld[r](state));
  const next = RING_IDS.find(r => !shown.includes(r)) || null;
  return { shown, next };
}

// The part of the game a node needs the player to have met (a guide feature id), or null. A node
// that names a thing not yet met (the Falaj Rig, the Hmar al-Naft Rig, Gushers, Da'sa) waits under
// "Arriving later" until that part is open (feel study R5).
export function needsFeature(n) {
  if (n.kind === 'rig') return 'fields.rig';
  if (n.kind === 'gusherWindow' || n.kind === 'gusherRate') return 'shell.presence';
  if (n.kind === 'heat' || n.kind === 'handsWell') return 'well.heat';
  return null;
}

// A node as the card needs it. A flag is never buyable (its effect belongs to a later item). `isOpen`
// is api.isOpen: a node whose part of the game is not open yet is `later` and cannot be bought.
export function nodeView(state, n, isOpen = () => true) {
  const flag = n.kind === 'flag';
  const complete = n.rank >= n.max;
  const bank = Tree.bank(state, n.ring);
  const need = needsFeature(n);
  const waiting = !flag && !complete && need !== null && !isOpen(need);
  const can = !flag && !complete && !waiting && n.canBuy;
  return {
    id: n.id, ring: n.ring, kind: n.kind, field: n.field, value: n.value, rank: n.rank, max: n.max,
    flag, complete, can, cost: n.cost, bank, later: flag || waiting, needs: waiting ? need : null,
    missing: !flag && !complete && !waiting && !can ? n.cost - bank : 0,
    frac: !flag && !complete && !waiting && n.cost > 0 ? Math.min(1, bank / n.cost) : 0
  };
}

// Where a node sits in its ring: 'now' (can be paid), 'soon' (not yet), 'later' (names a part of the
// game not met yet, or a flag), 'done' (complete)
export const sectionOf = (v) => (v.can ? 'now' : v.complete ? 'done' : v.later ? 'later' : 'soon');

// Buyable first, then by price; the unaffordable by price; complete ones, then flags, last
export function sortNodes(views) {
  const order = new Map(P.tree.map((n, i) => [n.id, i]));
  const rankOf = (v) => (v.can ? 0 : v.flag ? 4 : v.later ? 3 : v.complete ? 2 : 1);
  return [...views].sort((a, b) => rankOf(a) - rankOf(b)
    || (rankOf(a) <= 1 ? a.cost - b.cost : 0)
    || order.get(a.id) - order.get(b.id));
}

const pct = (v) => Math.round(v * 1000) / 10;
// What ONE rank does, in words with the real number
export function effectLine(t, n) {
  const k = n.kind;
  if (k === 'flag') return t('cl.tree.fx.flag');
  if (k === 'fieldPower' && n.field !== undefined) return t('cl.tree.fx.fieldPower.field', { n: pct(n.value), field: t(`cl.field.${FIELDS[n.field]}`) });
  if (k === 'rig' && n.field !== undefined) return t('cl.tree.fx.rig.field', { n: pct(n.value), rig: t(`cl.rig.${FIELDS[n.field]}`) });
  if (k === 'startKit') return t('cl.tree.fx.startKit', { n: n.value, slot: t('cl.tree.kit.units') });
  const plain = ['offlineHours', 'gusherWindow', 'startShares', 'pageBank'].includes(k);
  return t(`cl.tree.fx.${k}`, { n: plain ? n.value : pct(n.value) });
}
export const nodeName = (t, id) => t(`cl.tree.node.${id}`);

// The Crude multiplier the Reserves earned give (spending a bank never lowers it), as "2.2"
export const reserveMult = (state) => Math.round((1 + P.resPer * state.prestige.reserves) * 100) / 100;

// What the Head Start Kit does for this player right now: 'now' (it would fill an empty run at
// once), 'next' (this run already has Buckets, so it starts at the next New Well) or null (not the Kit)
export function kitNote(state, v) {
  if (v.kind !== 'startKit' || v.complete) return null;
  return state.well.amount[1] && state.well.amount[1].lte(0) ? 'now' : 'next';
}

// Buys this ring's affordable nodes, cheapest first (never a flag). Returns the ids bought.
export function buyRing(state, ring, isOpen) {
  const bought = [];
  for (let guard = 0; guard < 500; guard++) {
    const best = sortNodes(Tree.nodes(state, ring).map(n => nodeView(state, n, isOpen))).find(v => v.can);
    if (!best || !Tree.buy(state, best.id)) break;
    bought.push(best.id);
  }
  return bought;
}

// Would "buy all" buy two or more here? (it never touches the real state)
export function buyAllWorthIt(state, ring, isOpen) {
  const probe = { tree: { bank: { ...state.tree.bank }, ranks: { ...state.tree.ranks } } };
  return buyRing(probe, ring, isOpen).length >= 2;
}

// --- DOM -----------------------------------------------------------------------------------------
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const setText = (n, s) => { if (n.textContent !== s) n.textContent = s; };
function flash(node, cls) {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
}

export function mountTree(host, api) {
  if (!document.querySelector('link[data-coreloop-tree-css]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = 'css/coreloop-tree.css'; link.dataset.coreloopTreeCss = '';
    document.head.appendChild(link);
  }
  const t = api.t;
  const root = el('div', 'cl-tree');
  const status = el('p', 'cl-tree-status');
  status.setAttribute('role', 'status');
  const rings = new Map();
  const lockLine = el('p', 'cl-locked');
  host.append(root);

  const price = (ring, n) => t('cl.tree.price', { n: api.fmt(n), cur: t(n === 1 ? `cl.tree.cur1.${ring}` : `cl.tree.cur.${ring}`) });

  function buildCard(ring, id) {
    const card = el('article', 'card cl-tree-card');
    const head = el('div', 'cl-tree-head');
    const name = el('strong', 'cl-tree-name', nodeName(t, id));
    const rankText = el('span', 'cl-tree-rank');
    head.append(name, rankText);
    const fx = el('p', 'cl-tree-fx');
    const note = el('p', 'cl-tree-note');
    const pips = el('div', 'cl-tree-pips');
    pips.setAttribute('aria-hidden', 'true');
    const bar = el('div', 'bar cl-tree-bar'); bar.append(el('i'));
    const btn = el('button', 'btn btn-buy cl-tree-buy');
    btn.type = 'button';
    btn.append(el('span', 'lbl'), el('span', 'cost'));
    const done = el('span', 'chip cl-tree-done');
    btn.addEventListener('click', () => {
      if (btn.getAttribute('aria-disabled') === 'true') return;
      let ok = false;
      api.act((s) => { ok = Tree.buy(s, id); });
      if (ok) status.textContent = t('cl.tree.bought', { name: nodeName(t, id) });
    });
    card.append(head, fx, note, pips, bar, btn, done);
    return { id, ring, card, rankText, fx, note, pips, pipEls: [], bar, btn, done, rank: null };
  }

  function buildRing(ring) {
    const sec = el('section', 'cl-tree-ring');
    sec.dataset.ring = ring;
    const head = el('div', 'cl-tree-bankhead');
    const title = el('h3', 'cl-tree-title', t(`cl.tree.ring.${ring}`));
    const bankBox = el('div', 'cl-tree-bank');
    const bankNum = el('span', 'cl-tree-banknum');
    bankBox.append(bankNum, el('span', 'cl-tree-bankword', t(`cl.tree.spend.${ring}`)));
    head.append(title, bankBox);
    const reset = el('p', 'cl-tree-reset', t(`cl.tree.reset.${ring}`));
    // Spending a bank never lowers the multiplier (it counts what was earned): said where it is spent
    const keep = el('p', 'cl-tree-keep');
    keep.hidden = ring !== 'reserves';
    const all = el('button', 'btn btn-sm cl-tree-all', t('cl.tree.buyall'));
    all.type = 'button'; all.title = t('cl.tree.buyall_hint');
    all.addEventListener('click', () => {
      let bought = [];
      api.act((s) => { bought = buyRing(s, ring, api.isOpen); });
      if (bought.length) status.textContent = t('cl.tree.bought_all', { n: bought.length });
    });
    const lists = { now: el('div', 'cl-tree-grid'), soon: el('div', 'cl-tree-grid') };
    const laterBox = el('details', 'cl-tree-donebox cl-tree-laterbox');
    const laterSum = el('summary', 'cl-tree-sec');
    const laterGrid = el('div', 'cl-tree-grid');
    laterBox.append(laterSum, laterGrid);
    const heads = { now: el('h4', 'cl-tree-sec', t('cl.tree.sec.now')), soon: el('h4', 'cl-tree-sec', t('cl.tree.sec.soon')) };
    const doneBox = el('details', 'cl-tree-donebox');
    const doneSum = el('summary', 'cl-tree-sec');
    const doneGrid = el('div', 'cl-tree-grid');
    doneBox.append(doneSum, doneGrid);
    sec.append(head, keep, reset, all, heads.now, lists.now, heads.soon, lists.soon, laterBox, doneBox);
    const cards = new Map();
    for (const n of P.tree) if (n.ring === ring) cards.set(n.id, buildCard(ring, n.id));
    return { ring, sec, bankNum, bankLast: null, keep, all, lists, heads, laterBox, laterSum, laterGrid, doneBox, doneSum, doneGrid, cards };
  }

  function place(container, wanted) {
    const have = [...container.children];
    if (have.length === wanted.length && have.every((c, i) => c === wanted[i])) return;
    container.replaceChildren(...wanted);
  }

  function updateCard(c, v, first, state) {
    const { card } = c;
    if (c.rank !== v.rank) {
      if (c.rank !== null && v.rank > c.rank) { flash(card, 'is-bought'); }
      c.rank = v.rank;
    }
    // pips
    if (c.pipEls.length !== v.max) {
      c.pips.replaceChildren(...Array.from({ length: v.max }, () => el('i', 'cl-tree-pip')));
      c.pipEls = [...c.pips.children];
      c.pipsOn = 0;
    }
    c.pipEls.forEach((p, i) => {
      const on = i < v.rank;
      if (on && !p.classList.contains('is-on') && !first && c.pipsOn !== undefined) flash(p, 'is-new');
      p.classList.toggle('is-on', on);
    });
    c.pipsOn = v.rank;
    c.pips.hidden = v.flag || v.max === 1;
    setText(c.rankText, v.flag ? '' : t('cl.tree.rank', { a: v.rank, b: v.max }));
    c.rankText.hidden = v.flag || v.max === 1;
    setText(c.fx, effectLine(t, P.tree.find(n => n.id === v.id)));
    card.classList.toggle('is-can', v.can);
    card.classList.toggle('is-done', v.complete);
    card.classList.toggle('is-flag', v.flag);
    c.bar.hidden = !(v.missing > 0);
    if (v.missing > 0) c.bar.firstChild.style.width = Math.round(v.frac * 100) + '%';
    const showBuy = !v.later && !v.complete;
    c.btn.hidden = !showBuy;
    c.done.hidden = showBuy;
    card.classList.toggle('is-later', v.later);
    if (!showBuy) {
      setText(c.done, v.complete ? t('cl.tree.complete') : v.needs ? t(`cl.tree.arrives.${v.needs}`) : t('cl.tree.later'));
    }
    const kn = kitNote(state, v);
    c.note.hidden = !kn;
    if (kn) setText(c.note, t(`cl.tree.kit.${kn}`));
    if (showBuy) {
      c.btn.classList.toggle('btn-primary', v.can);
      c.btn.classList.toggle('is-locked', !v.can);
      c.btn.setAttribute('aria-disabled', String(!v.can));
      setText(c.btn.firstChild, v.can ? t('cl.tree.buy') : t('cl.tree.need', { n: api.fmt(v.missing) }));
      setText(c.btn.lastChild, price(v.ring, v.cost));
    }
  }

  let first = true;
  function update(a = api) {
    const s = a.state;
    const open = a.isOpen('prestige.tree');
    root.hidden = !open;
    if (!open) return;
    const { shown, next } = ringsShown(s);
    // status line sits at the top of the group
    for (const ring of RING_IDS) {
      let r = rings.get(ring);
      if (!shown.includes(ring)) { if (r) r.sec.hidden = true; continue; }
      if (!r) { r = buildRing(ring); rings.set(ring, r); }
      r.sec.hidden = false;
      const bank = Tree.bank(s, ring);
      setText(r.bankNum, a.fmt(bank));
      if (r.bankLast !== null && r.bankLast !== bank) flash(r.bankNum, 'is-bump');
      r.bankLast = bank;
      const views = sortNodes(Tree.nodes(s, ring).map(n => nodeView(s, n, a.isOpen)));
      const by = { now: [], soon: [], later: [], done: [] };
      for (const v of views) by[sectionOf(v)].push(v);
      for (const v of views) updateCard(r.cards.get(v.id), v, first, s);
      place(r.lists.now, by.now.map(v => r.cards.get(v.id).card));
      place(r.lists.soon, by.soon.map(v => r.cards.get(v.id).card));
      place(r.laterGrid, by.later.map(v => r.cards.get(v.id).card));
      place(r.doneGrid, by.done.map(v => r.cards.get(v.id).card));
      r.heads.now.hidden = r.lists.now.hidden = by.now.length === 0;
      r.heads.soon.hidden = r.lists.soon.hidden = by.soon.length === 0;
      r.laterBox.hidden = by.later.length === 0;
      setText(r.laterSum, t('cl.tree.sec.later', { n: by.later.length }));
      r.doneBox.hidden = by.done.length === 0;
      if (ring === 'reserves') {
        r.keep.hidden = !(s.prestige.reserves > 0);
        setText(r.keep, t('cl.tree.keep', { mult: reserveMult(s) }));
      }
      setText(r.doneSum, t('cl.tree.sec.done', { n: by.done.length }));
      r.all.hidden = by.now.length < 2 || !buyAllWorthIt(s, ring, a.isOpen);
    }
    // order: groups innermost first, then the status line and the one locked line
    const wanted = [];
    for (const ring of RING_IDS) if (rings.get(ring) && shown.includes(ring)) wanted.push(rings.get(ring).sec);
    if (next) {
      lockLine.textContent = t(`cl.tree.next.${next}`);
      wanted.push(lockLine);
    }
    wanted.push(status);
    place(root, wanted);
    first = false;
  }
  update(api);
  return { update };
}
