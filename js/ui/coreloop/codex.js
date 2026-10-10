// Core-loop Collection screen (CL-16, CL-32, behind ?loop=2; the module id stays `codex`): what the
// player has found (Vials, Compounds, Bubbles, Mastery, generators, Seal tiers) and points back to the
// current game for the leaderboard, community, settings and about. Read only.
// A section shows once the player has found one of its things or its feature is open; each says
// "N of M found", what the found ones give in total and where more come from. Unfound entries are
// not drawn, only counted. The one closed section that comes next shows as a single locked line.
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
      if (a.rank > 0) out.push({ label: t('cl.codex.mastery.chip', { field: t(`cl.field.${FIELDS[row.field]}`), n: i + 1, rank: a.label }), tier: a.title ? 3 : 1, grade: a.rank });
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
  // One card: title, "N of M found", what they give, the found ones, the count of the rest, where more come from
  const card = (id, extra = '') => `<section class="card cp-card" data-sec="${id}" data-ref="sec-${id}" hidden>
      <h2 class="cp-h">${esc(t(`cl.codex.${id}.title`))}</h2>
      <p class="cp-line" data-ref="${id}-count"></p>
      <p class="cx-gives" data-ref="${id}-gives"></p>
      ${extra}
      <div class="cx-found" data-ref="${id}-found" role="list"></div>
      <p class="cx-rest" data-ref="${id}-rest"></p>
      <p class="cp-note" data-ref="${id}-from"></p>
    </section>`;

  panel.innerHTML = `<div class="cp-screen">
    <div class="cp-stack">
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

  function update(a) {
    const s = a.state;
    const st = collectionSections(s, a.isOpen);
    for (const id of SECTION_IDS) refs[`sec-${id}`].hidden = !st.open.includes(id);
    setText(refs.locked, st.locked ? a.lockText(SECTION_RULES[st.locked].feature) : '');
    refs.locked.hidden = !st.locked;

    if (st.open.includes('vials')) {
      const sums = vialSummary(s);
      const found = sums.reduce((n, x) => n + x.found, 0), total = sums.reduce((n, x) => n + x.total, 0);
      setText(refs['vials-count'], t('cl.codex.vials.found', { found, total }));
      gives('vials', found, 'vial', s);
      paintChips('vials', vialChips(s));
      rest('vials', total - found);
      setText(refs['vials-from'], t('cl.codex.vials.from'));
    }

    if (st.open.includes('compounds')) {
      const comp = compoundSummary(s);
      setText(refs['compounds-count'], t('cl.codex.compounds.found', { found: comp.found, total: comp.total }) + (comp.found ? ` · ${t('cl.codex.compounds.tiers', comp.by)}` : ''));
      gives('compounds', comp.found, 'compound', s);
      paintChips('compounds', compoundChips(s));
      rest('compounds', comp.total - comp.found);
      setText(refs['compounds-from'], t('cl.codex.compounds.from', { n: P.recipesPerChronicle }));
    }

    if (st.open.includes('bubbles')) {
      const b = bubbleSummary(s);
      setText(refs['bubbles-count'], b.total ? t('cl.codex.bubbles.total', { n: a.fmt(b.total), families: b.families }) : t('cl.codex.bubbles.none'));
      gives('bubbles', b.total, 'bubble', s);
      paintChips('bubbles', b.perFrac.map((n, i) => ({ label: `${t(`cl.frac.${FRACTIONS[i]}`)} ${a.fmt(n)}`, tier: n > 0 ? 3 : 0 })).filter(c => c.tier > 0));
      setText(refs['bubbles-from'], t('cl.codex.bubbles.from'));
    }

    if (st.open.includes('mastery')) {
      const m = masteryCounts(s);
      setText(refs['mastery-count'], t('cl.codex.mastery.found', m));
      setText(refs['mastery-gives'], m.found > 0 ? t('cl.codex.mastery.gives') : t('cl.codex.none_yet'));
      paintChips('mastery', masteryChips(s));
      rest('mastery', m.total - m.found);
      setText(refs['mastery-from'], t('cl.codex.mastery.from'));
    }

    if (st.open.includes('generators')) {
      const g = generatorSummary(s);
      setText(refs['generators-count'], t('cl.codex.generators.count', { n: g.n, max: g.max }));
      setText(refs['generators-gives'], g.n > P.slots ? t('cl.codex.generators.gives', { mult: P.genMult }) : t('cl.codex.none_yet'));
      setBar(refs['generators-bar'], g.fraction);
      setText(refs['generators-from'], g.nextLog === null ? t('cl.codex.generators.all') : t('cl.codex.generators.next', { n: g.nextLog }));
    }

    if (st.open.includes('seals')) {
      const sl = sealTierSummary(s);
      setText(refs['seals-count'], t('cl.codex.seals.count', { n: sl.n, max: sl.max }));
      gives('seals', sl.n, 'seal', s);
      setBar(refs['seals-bar'], sl.fraction);
      setText(refs['seals-from'], t('cl.codex.seals.from', { crew: t('cl.name.crew') }));
    }
  }

  update(api);
  return { update };
}
