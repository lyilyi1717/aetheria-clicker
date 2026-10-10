// Core-loop Codex screen (CL-16, behind ?loop=2): a collection overview. Read only: it shows what
// the player has found (Vials, Compounds, Bubbles, Mastery, generators, Seal tiers) and points
// back to the current game for the leaderboard, community, settings and about.
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

export function mount(panel, api) {
  const doc = panel.ownerDocument;
  ensureStyles(doc);
  const bar = (ref, tone) => `<div class="bar ${tone}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-ref="${ref}"><i></i></div>`;

  panel.innerHTML = `<div class="cp-screen">
    <p class="cp-note">${esc(t('cl.codex.intro'))}</p>
    <div class="cp-ladder">
      <section class="card cp-card">
        <h2 class="cp-h">${esc(t('cl.codex.vials.title'))}</h2>
        ${FIELDS.map((id, f) => `<div class="cx-field"><div class="cp-row"><span>${esc(t(`cl.field.${id}`))}</span><strong class="num" data-ref="vial-sum-${f}"></strong></div>
          <div class="cx-grid" data-ref="vial-grid-${f}" role="list"></div></div>`).join('')}
        <p class="cp-note">${esc(t('cl.codex.vials.legend'))}</p>
      </section>

      <section class="card cp-card">
        <h2 class="cp-h">${esc(t('cl.codex.compounds.title'))}</h2>
        <div class="cp-row"><span data-ref="comp-tiers"></span><strong class="num" data-ref="comp-sum"></strong></div>
        <div class="cx-grid" data-ref="comp-grid" role="list"></div>
      </section>

      <section class="card cp-card">
        <h2 class="cp-h">${esc(t('cl.codex.bubbles.title'))}</h2>
        <p class="cp-line" data-ref="bub-total"></p>
        <div class="cx-chips">
          ${FRACTIONS.map((fr, i) => `<span class="chip">${esc(t(`cl.frac.${fr}`))} <strong class="num" data-ref="bub-${i}"></strong></span>`).join('')}
        </div>
      </section>

      <section class="card cp-card">
        <h2 class="cp-h">${esc(t('cl.codex.gens.title'))}</h2>
        <div class="cp-row"><span data-ref="gen-text"></span></div>
        ${bar('gen-bar', 'gold')}
        <p class="cp-note" data-ref="gen-next"></p>
        <h2 class="cp-h cx-sub">${esc(t('cl.codex.seals.title'))}</h2>
        <div class="cp-row"><span data-ref="seal-text"></span></div>
        ${bar('seal-bar', 'dust')}
      </section>

      <section class="card cp-card cp-wide">
        <h2 class="cp-h">${esc(t('cl.codex.mastery.title'))}</h2>
        <div class="cx-mastery">
          ${FIELDS.map((id, f) => `<div class="cx-field"><div class="cp-row"><span>${esc(t(`cl.field.${id}`))}</span><strong class="num" data-ref="mast-sum-${f}"></strong></div>
            <div class="cx-chips">${Array.from({ length: P.actionsPerField }, (_, a) => `<span class="chip" data-ref="mast-${f}-${a}"></span>`).join('')}</div></div>`).join('')}
        </div>
      </section>
    </div>
    <p class="cp-note cx-elsewhere">${esc(t('cl.codex.elsewhere'))} <a class="cl-back" href="?">${esc(t('cl.codex.back'))}</a></p>
    </div>`;

  const refs = {};
  for (const n of panel.querySelectorAll('[data-ref]')) refs[n.dataset.ref] = n;

  // A grid keeps its cells until the number of cells changes
  const grids = {};
  function syncGrid(key, count, make) {
    if (grids[key] === count) return;
    grids[key] = count;
    refs[key].innerHTML = Array.from({ length: count }, (_, i) => make(i)).join('');
  }
  const paint = (grid, cells, label) => {
    cells.forEach((c, i) => {
      const el = grid.children[i];
      const tier = String(c.tier);
      if (el.dataset.tier !== tier) { el.dataset.tier = tier; el.title = label(c); el.setAttribute('aria-label', label(c)); }
    });
  };

  function update(a) {
    const s = a.state;
    vialSummary(s).forEach(({ field, found, total }) => {
      setText(refs[`vial-sum-${field}`], t('cl.codex.vials.found', { found, total }));
      const key = `vial-grid-${field}`;
      syncGrid(key, total, () => '<span class="cx-cell" role="listitem" data-tier="-1"></span>');
      paint(refs[key], vialCells(s, field), (c) => t('cl.codex.vials.cell', { n: c.grade + 1, tier: vialTierName(c.tier) }));
    });

    const comp = compoundSummary(s);
    setText(refs['comp-sum'], t('cl.codex.compounds.found', { found: comp.found, total: comp.total }));
    setText(refs['comp-tiers'], t('cl.codex.compounds.tiers', comp.by));
    syncGrid('comp-grid', comp.total, () => '<span class="cx-cell" role="listitem" data-tier="-1"></span>');
    paint(refs['comp-grid'], compoundCells(s), (c) => t('cl.codex.compounds.cell', { n: c.index + 1, tier: t(`cl.codex.compound.${c.id}`) }));

    const b = bubbleSummary(s);
    setText(refs['bub-total'], b.total ? t('cl.codex.bubbles.total', { n: a.fmt(b.total), families: b.families }) : t('cl.codex.bubbles.none'));
    b.perFrac.forEach((n, i) => setText(refs[`bub-${i}`], a.fmt(n)));

    masteryRows(s).forEach((row) => {
      setText(refs[`mast-sum-${row.field}`], t('cl.codex.mastery.sum', { n: row.sum }));
      row.actions.forEach((act, i) => {
        const chip = refs[`mast-${row.field}-${i}`];
        setText(chip, `${t('cl.codex.mastery.action', { n: i + 1 })}: ${act.label}`);
        chip.classList.toggle('gold', act.title);
      });
    });

    const g = generatorSummary(s);
    setText(refs['gen-text'], t('cl.codex.gens.count', { n: g.n, max: g.max }));
    setBar(refs['gen-bar'], g.fraction);
    setText(refs['gen-next'], g.nextLog === null ? t('cl.codex.gens.all') : t('cl.codex.gens.next', { n: g.nextLog }));

    const sl = sealTierSummary(s);
    setText(refs['seal-text'], t('cl.codex.seals.count', { n: sl.n, max: sl.max }));
    setBar(refs['seal-bar'], sl.fraction);
  }

  update(api);
  return { update };
}
