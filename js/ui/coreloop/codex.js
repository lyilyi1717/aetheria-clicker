// Core-loop Collection screen (CL-16, CL-32, behind ?loop=2; the module id stays `codex`): what the
// player has found (Vials, Compounds, Bubbles, Mastery, generators, Seal tiers) and points back to the
// current game for the leaderboard, community, settings and about. Read only.
// A section shows once the player has found one of its things or its feature is open; each says
// "N of M found", what the found ones give in total and where more come from. Unfound entries are
// not drawn, only counted. The one closed section that comes next shows as a single locked line.
// CL-45: it opens with one strip (what is new since the last visit, or where the next find comes
// from, with one button); each section is folded to its title and "N of M found" and opens on a tap.
// mount(panel, api) -> { update(api) }. Logic is in the pure helpers (test_cl_ui_prestige.js).
import { t } from '../../i18n/index.js';
import { registerStrings } from '../../i18n/coreloop/index.js';
import EN from '../../i18n/coreloop/codex.en.js';
import AR from '../../i18n/coreloop/codex.ar.js';
import { P } from '../../systems/coreloop/params.js';
import { FIELDS, FRACTIONS } from '../../systems/coreloop/shared.js';
import * as Collection from '../../systems/coreloop/Collection.js';
import * as Cauldrons from '../../systems/coreloop/Cauldrons.js';
import * as Mastery from '../../systems/coreloop/Mastery.js';
import * as Well from '../../systems/coreloop/Well.js';
import { makeFold } from './folds.js';

registerStrings(EN, AR);

const STYLE_ATTR = 'data-coreloop-prestige-css';

// ================================================================== pure helpers
// One cell per grade the Field has reached: { grade, tier } (tier 0 = not found)
export function vialCells(state, field) {
  const top = state.fields[field].bestGrade;
  return Array.from({ length: top + 1 }, (_, grade) => ({ grade, tier: Collection.vialTier(state, Collection.vialKey(field, grade)) }));
}
export function vialSummary(state) {
  return FIELDS.map((_, field) => {
    const cells = vialCells(state, field);
    return { field, found: cells.filter(c => c.tier > 0).length, total: cells.length };
  });
}
export const vialTierName = (tier) => (tier > 0 ? t(`cl.codex.vial.${Collection.VIAL_TIERS[tier - 1]}`) : t('cl.codex.vial.none'));

// Recipe cells: { index, tier } with tier 0 not found, 1 Compound, 2 Gilded, 3 Royal
export function compoundCells(state) {
  const n = Collection.recipeCount(state);
  return Array.from({ length: n }, (_, index) => {
    const id = Collection.compoundTierId(state, index);
    return { index, id, tier: id === 'unknown' ? 0 : Collection.COMPOUND_TIERS.indexOf(id) + 1 };
  });
}
export function compoundSummary(state) {
  const cells = compoundCells(state);
  const by = { compound: 0, gilded: 0, royal: 0 };
  for (const c of cells) if (c.tier > 0) by[c.id]++;
  return { found: cells.filter(c => c.tier > 0).length, total: cells.length, by };
}

export function bubbleSummary(state) {
  const total = state.cauldrons.bubbles.length;
  return { total, families: Math.floor(total / P.bubbleFamily), perFrac: FRACTIONS.map((_, f) => Cauldrons.bubbleCount(state, f)) };
}

export function rankLabel(rank) {
  const info = Mastery.rankInfo(rank);
  return info.level >= 2 ? t('cl.rank.legend_n', { n: info.level }) : t(`cl.rank.${info.id}`);
}
export function masteryRows(state) {
  return FIELDS.map((_, field) => ({
    field,
    sum: state.mastery[field].ranks.reduce((a, b) => a + b, 0),
    actions: state.mastery[field].ranks.map(rank => ({ rank, label: rankLabel(rank), title: Mastery.rankInfo(rank).title }))
  }));
}

export function generatorSummary(state) {
  const next = Well.nextGenerator(state);
  return { n: state.well.generators, max: P.generators, fraction: state.well.generators / P.generators, nextLog: next ? next.goalLog : null };
}

export function sealTierSummary(state) {
  const max = P.seals * P.sealHours.length;
  const n = state.seals.tier.reduce((a, b) => a + b, 0);
  return { n, max, fraction: n / max };
}

// ---- staging: which sections show
// id -> { feature: the guide feature that opens it, found: (state) => has the player found one }
export const SECTION_RULES = Object.freeze({
  vials: { feature: 'refinery.vials', found: (s) => Object.values(s.collection.vials).some(v => v.tier > 0) },
  compounds: { feature: 'refinery.mixer', found: (s) => s.collection.recipes.some(r => r && r.found) },
  bubbles: { feature: 'refinery.cauldrons', found: (s) => s.cauldrons.bubbles.length > 0 },
  mastery: { feature: 'fields.mastery', found: (s) => s.mastery.some(m => m.ranks.some(r => r > 0)) },
  generators: { feature: 'well.generators', found: (s) => s.well.generators > P.slots },
  seals: { feature: 'prestige.seals', found: (s) => s.seals.tier.some(x => x > 0) }
});
export const SECTION_IDS = Object.freeze(Object.keys(SECTION_RULES));
// { open: [ids to show], locked: the one closed section that comes next, or null }
export function collectionSections(state, isOpen) {
  const shown = (id) => SECTION_RULES[id].found(state) || isOpen(SECTION_RULES[id].feature);
  return { open: SECTION_IDS.filter(shown), locked: SECTION_IDS.find(id => !shown(id)) || null };
}

// The Fraction points the found things add, from the Fractions themselves
const fracSum = (state, key) => state.refinery.frac.reduce((n, f) => n + (f[key] || 0), 0);
export const addedTotal = (state, key) => fracSum(state, key);

// ---- the found ones, as chips: [{ label, tier }] best first
export function vialChips(state) {
  const out = [];
  FIELDS.forEach((id, field) => {
    for (const c of vialCells(state, field)) {
      if (c.tier > 0) out.push({ label: t('cl.codex.vials.chip', { field: t(`cl.field.${id}`), n: c.grade + 1, tier: vialTierName(c.tier) }), tier: c.tier, grade: c.grade });
    }
  });
  return out.sort((a, b) => b.tier - a.tier || b.grade - a.grade);
}
export function compoundChips(state) {
  return compoundCells(state).filter(c => c.tier > 0)
    .map(c => ({ label: t('cl.codex.compounds.cell', { n: c.index + 1, tier: t(`cl.codex.compound.${c.id}`) }), tier: c.tier, grade: c.index }))
    .sort((a, b) => b.tier - a.tier || a.grade - b.grade);
}
export function masteryChips(state) {
  const out = [];
  masteryRows(state).forEach((row) => {
    row.actions.forEach((a, i) => {
      if (a.rank > 0) out.push({ label: t('cl.codex.mastery.chip', { field: t(`cl.field.${FIELDS[row.field]}`), skill: t(`cl.skill.${P.fields[row.field]}.${i + 1}`), rank: a.label }), tier: a.title ? 3 : 1, grade: a.rank });
    });
  });
  return out.sort((a, b) => b.grade - a.grade);
}
export function masteryCounts(state) {
  const total = FIELDS.length * P.actionsPerField;
  const found = state.mastery.reduce((n, m) => n + m.ranks.filter(r => r > 0).length, 0);
  return { found, total };
}
// How many chips a section draws before it says "and N more"
export const CHIP_CAP = 40;
export const capChips = (chips) => ({ shown: chips.slice(0, CHIP_CAP), hidden: Math.max(0, chips.length - CHIP_CAP) });

// ---- what is new since the last visit (the tab dot) and where the next find comes from
// How many the player has found in each section
export function foundCounts(state) {
  const sums = vialSummary(state);
  return {
    vials: sums.reduce((n, x) => n + x.found, 0),
    compounds: compoundSummary(state).found,
    bubbles: bubbleSummary(state).total,
    mastery: masteryCounts(state).found,
    generators: generatorSummary(state).n,
    seals: sealTierSummary(state).n
  };
}
// { id: how many more than `seen` }, only the sections that grew
export function newSince(counts, seen) {
  const out = {};
  if (!seen) return out;
  for (const id of SECTION_IDS) {
    const d = (counts[id] || 0) - (seen[id] || 0);
    if (d > 0) out[id] = d;
  }
  return out;
}
// The counts the player last looked at: kept for the session (and across reloads when the browser
// lets us). The first time ever, today's counts are the baseline, so nothing is "new" at load.
const SEEN_KEY = 'aetheria.coreloop.collection.seen';
let seenMemory = null;
export const seenStore = {
  get() {
    if (seenMemory) return seenMemory;
    try { const raw = globalThis.localStorage?.getItem(SEEN_KEY); if (raw) seenMemory = JSON.parse(raw); } catch { /* storage can be blocked */ }
    return seenMemory;
  },
  set(counts) {
    seenMemory = { ...counts };
    try { globalThis.localStorage?.setItem(SEEN_KEY, JSON.stringify(seenMemory)); } catch { /* storage can be blocked */ }
  },
  reset() { seenMemory = null; }
};
// The tab dot: how many sections have something new since the last visit
export function readyCount(state) {
  const counts = foundCounts(state);
  const seen = seenStore.get();
  if (!seen) { seenStore.set(counts); return 0; }
  return Object.keys(newSince(counts, seen)).length;
}

// Where each section's finds come from: the screen to open, and the line that says how
export const SECTION_SCREEN = Object.freeze({ vials: 'refinery', compounds: 'refinery', bubbles: 'refinery', mastery: 'fields', generators: 'well', seals: 'prestige' });
// The first open section that still has things to find: { id, screen }, or null
export function nextFind(state, isOpen) {
  const open = collectionSections(state, isOpen).open;
  const left = {
    vials: () => { const x = vialSummary(state); return x.reduce((n, y) => n + y.total - y.found, 0) > 0; },
    compounds: () => { const c = compoundSummary(state); return c.total === 0 || c.total > c.found; },
    bubbles: () => true,
    mastery: () => { const m = masteryCounts(state); return m.total > m.found; },
    generators: () => generatorSummary(state).n < P.generators,
    seals: () => { const x = sealTierSummary(state); return x.n < x.max; }
  };
  const id = open.find(k => left[k]());
  return id ? { id, screen: SECTION_SCREEN[id] } : null;
}

// ================================================================== DOM
function ensureStyles(doc) {
  if (doc.head.querySelector(`link[${STYLE_ATTR}]`)) return;
  const link = doc.createElement('link');
  link.rel = 'stylesheet'; link.href = 'css/coreloop-prestige.css'; link.setAttribute(STYLE_ATTR, '');
  doc.head.appendChild(link);
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const setText = (node, s) => { if (node && node.textContent !== s) node.textContent = s; };
function setBar(bar, fraction) {
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  bar.firstElementChild.style.width = `${pct}%`;
  bar.setAttribute('aria-valuenow', String(pct));
}
const plus = (x) => `+${x.toFixed(2)}`;

export function mount(panel, api) {
  const doc = panel.ownerDocument;
  ensureStyles(doc);
  const bar = (ref, tone) => `<div class="bar ${tone}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-ref="${ref}"><i></i></div>`;
  // One fold: title and "N of M found" (plus what they add) in the summary; inside, what the found
  // ones give, the found ones, the count of the rest, where more come from
  const card = (id, extra = '') => `<details class="card cp-fold" data-sec="${id}" data-ref="sec-${id}" hidden>
      <summary class="cp-sum"><span class="cp-sumtext"><h2 class="cp-h">${esc(t(`cl.codex.${id}.title`))}</h2><span class="cp-sumstatus" data-ref="${id}-sum"></span></span>
        <span class="tag new" data-ref="${id}-new" hidden></span></summary>
      <div class="cp-body">
        <p class="cp-line" data-ref="${id}-count"></p>
        <p class="cx-gives" data-ref="${id}-gives"></p>
        ${extra}
        <div class="cx-found" data-ref="${id}-found" role="list"></div>
        <p class="cx-rest" data-ref="${id}-rest"></p>
        <p class="cp-note" data-ref="${id}-from"></p>
      </div>
    </details>`;

  panel.innerHTML = `<div class="cp-screen">
    <div class="cp-stack">
      <section class="card cp-ready cl-reserve" data-ref="strip" aria-live="polite">
        <p class="cp-ready-title" data-ref="strip-title"></p>
        <p class="cp-ready-sub" data-ref="strip-sub"></p>
        <button type="button" class="btn btn-lg btn-primary cp-ready-btn" data-ref="strip-btn" hidden></button>
      </section>
      ${card('vials')}
      ${card('compounds')}
      ${card('bubbles')}
      ${card('mastery')}
      ${card('generators', bar('generators-bar', 'gold'))}
      ${card('seals', bar('seals-bar', 'dust'))}
      <p class="cl-locked" data-ref="locked" hidden></p>
    </div>
    <p class="cp-note cx-elsewhere">${esc(t('cl.codex.elsewhere'))} <a class="cl-back" href="?">${esc(t('cl.codex.back'))}</a></p>
    </div>`;

  const refs = {};
  for (const n of panel.querySelectorAll('[data-ref]')) refs[n.dataset.ref] = n;
  const folds = {};
  for (const id of SECTION_IDS) folds[id] = makeFold(refs[`sec-${id}`]);

  let lastApi = api;
  // what the player had seen when they came here: the strip and the "New" tags compare with this
  let base = seenStore.get() || foundCounts(api.state);
  let acked = false;                 // "Show me" was pressed on this visit
  let stripAction = null;
  const commit = () => seenStore.set(foundCounts(lastApi.state));
  // leaving the screen counts as having looked; coming back starts a new visit
  if (typeof MutationObserver === 'function') {
    new MutationObserver(() => {
      if (panel.hidden) commit();
      else { base = seenStore.get() || foundCounts(lastApi.state); acked = false; update(lastApi); }
    }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  }

  // The found chips are rebuilt only when the list changes
  const sigs = {};
  function paintChips(id, chips) {
    const { shown, hidden } = capChips(chips);
    const sig = shown.map(c => `${c.tier}|${c.label}`).join('\n') + `#${hidden}`;
    if (sigs[id] === sig) return;
    sigs[id] = sig;
    refs[`${id}-found`].innerHTML = shown.map(c => `<span class="chip cx-chip" role="listitem" data-tier="${c.tier}">${esc(c.label)}</span>`).join('')
      + (hidden ? `<span class="chip" role="listitem">${esc(t('cl.codex.more', { n: hidden }))}</span>` : '');
  }
  const rest = (id, n) => setText(refs[`${id}-rest`], n > 0 ? t('cl.codex.rest', { n }) : '');
  const gives = (id, found, key, state) => setText(refs[`${id}-gives`], found > 0 ? t('cl.codex.gives', { n: plus(addedTotal(state, key)) }) : t('cl.codex.none_yet'));
  // the summary: "N of M found" and, once something is found, what the found ones add
  const summary = (id, countText, found, key, state) => {
    setText(refs[`${id}-sum`], key && found > 0 ? `${countText} · ${t('cl.codex.sum.adds', { n: plus(addedTotal(state, key)) })}` : countText);
  };

  refs['strip-btn'].addEventListener('click', () => {
    if (stripAction === 'show') {
      const news = newSince(foundCounts(lastApi.state), base);
      const id = SECTION_IDS.find(k => news[k]);
      if (id) { folds[id].choose(true); refs[`sec-${id}`].scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }); }
      acked = true; commit(); update(lastApi);
    } else if (stripAction) lastApi.go(stripAction);
  });

  // where more of a section's things come from (the same line as inside the section)
  function fromText(s, id) {
    if (id === 'generators') { const g = generatorSummary(s); return g.nextLog === null ? t('cl.codex.generators.all') : t('cl.codex.generators.next', { n: g.nextLog }); }
    return t(`cl.codex.${id}.from`, { n: P.recipesPerChronicle, crew: t('cl.name.crew') });
  }

  function update(a) {
    lastApi = a;
    const s = a.state;
    const st = collectionSections(s, a.isOpen);
    for (const id of SECTION_IDS) refs[`sec-${id}`].hidden = !st.open.includes(id);
    setText(refs.locked, st.locked ? a.lockText(SECTION_RULES[st.locked].feature) : '');
    refs.locked.hidden = !st.locked;
    const counts = foundCounts(s);
    const news = newSince(counts, base);
    for (const id of SECTION_IDS) {
      const tag = refs[`${id}-new`];
      tag.hidden = !news[id];
      if (news[id]) setText(tag, t('cl.codex.new_tag', { n: news[id] }));
      folds[id].resolve(false);
    }

    if (st.open.includes('vials')) {
      const sums = vialSummary(s);
      const found = sums.reduce((n, x) => n + x.found, 0), total = sums.reduce((n, x) => n + x.total, 0);
      const count = t('cl.codex.vials.found', { found, total });
      setText(refs['vials-count'], count);
      summary('vials', count, found, 'vial', s);
      gives('vials', found, 'vial', s);
      paintChips('vials', vialChips(s));
      rest('vials', total - found);
      setText(refs['vials-from'], t('cl.codex.vials.from'));
    }

    if (st.open.includes('compounds')) {
      const comp = compoundSummary(s);
      const count = t('cl.codex.compounds.found', { found: comp.found, total: comp.total });
      setText(refs['compounds-count'], count + (comp.found ? ` · ${t('cl.codex.compounds.tiers', comp.by)}` : ''));
      summary('compounds', count, comp.found, 'compound', s);
      gives('compounds', comp.found, 'compound', s);
      paintChips('compounds', compoundChips(s));
      rest('compounds', comp.total - comp.found);
      setText(refs['compounds-from'], t('cl.codex.compounds.from', { n: P.recipesPerChronicle }));
    }

    if (st.open.includes('bubbles')) {
      const b = bubbleSummary(s);
      const count = b.total ? t('cl.codex.bubbles.total', { n: a.fmt(b.total), families: b.families }) : t('cl.codex.bubbles.none');
      setText(refs['bubbles-count'], count);
      summary('bubbles', count, b.total, 'bubble', s);
      gives('bubbles', b.total, 'bubble', s);
      paintChips('bubbles', b.perFrac.map((n, i) => ({ label: `${t(`cl.frac.${FRACTIONS[i]}`)} ${a.fmt(n)}`, tier: n > 0 ? 3 : 0 })).filter(c => c.tier > 0));
      setText(refs['bubbles-from'], t('cl.codex.bubbles.from'));
    }

    if (st.open.includes('mastery')) {
      const m = masteryCounts(s);
      const count = t('cl.codex.mastery.found', m);
      setText(refs['mastery-count'], count);
      summary('mastery', count, m.found, null, s);
      setText(refs['mastery-gives'], m.found > 0 ? t('cl.codex.mastery.gives') : t('cl.codex.none_yet'));
      paintChips('mastery', masteryChips(s));
      rest('mastery', m.total - m.found);
      setText(refs['mastery-from'], t('cl.codex.mastery.from'));
    }

    if (st.open.includes('generators')) {
      const g = generatorSummary(s);
      const count = t('cl.codex.generators.count', { n: g.n, max: g.max });
      setText(refs['generators-count'], count);
      summary('generators', count, 0, null, s);
      setText(refs['generators-gives'], g.n > P.slots ? t('cl.codex.generators.gives', { mult: P.genMult }) : t('cl.codex.none_yet'));
      setBar(refs['generators-bar'], g.fraction);
      setText(refs['generators-from'], g.nextLog === null ? t('cl.codex.generators.all') : t('cl.codex.generators.next', { n: g.nextLog }));
    }

    if (st.open.includes('seals')) {
      const sl = sealTierSummary(s);
      const count = t('cl.codex.seals.count', { n: sl.n, max: sl.max });
      setText(refs['seals-count'], count);
      summary('seals', count, sl.n, 'seal', s);
      gives('seals', sl.n, 'seal', s);
      setBar(refs['seals-bar'], sl.fraction);
      setText(refs['seals-from'], t('cl.codex.seals.from', { crew: t('cl.name.crew') }));
    }

    // The strip: what is new, else where the next find comes from. One button.
    const strip = refs['strip-btn'];
    const newIds = SECTION_IDS.filter(k => news[k]);
    if (newIds.length && !acked) {
      setText(refs['strip-title'], t('cl.codex.ready.new', { list: newIds.map(k => t('cl.codex.ready.new_item', { name: t(`cl.codex.${k}.title`), n: news[k] })).join(t('cl.codex.ready.join')) }));
      setText(refs['strip-sub'], '');
      stripAction = 'show';
      setText(strip, t('cl.codex.ready.btn_show'));
      strip.hidden = false;
    } else {
      const nf = nextFind(s, a.isOpen);
      setText(refs['strip-title'], nf ? t('cl.codex.ready.none') : st.open.length ? t('cl.codex.ready.all') : t('cl.codex.ready.empty'));
      setText(refs['strip-sub'], nf ? fromText(s, nf.id) : '');
      stripAction = nf ? nf.screen : null;
      if (nf) setText(strip, t('cl.codex.ready.btn_go', { screen: t(`cl.tab.${nf.screen}`) }));
      strip.hidden = !nf || !a.isOpen(`tab.${nf.screen}`);
    }
    refs['strip-sub'].hidden = !refs['strip-sub'].textContent;
  }

  update(api);
  return { update };
}
