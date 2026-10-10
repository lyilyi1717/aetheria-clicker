// Core-loop Fields screen (docs/core-loop-plan.md CL-14), mounted by the shell (shell.js) behind
// ?loop=2. Shows the Field the player works by hand (Tower / Mine / Oasis), its frontier, Rig,
// Materials shelf and Mastery. Every number is read through the systems' functions; the one thing
// a player does here (choosing the hand Field, tapping the frontier) goes through api.act.
//
// mount(panel, api) -> { update(api) }. The DOM is built once; update() only changes text and
// attributes. The logic is in the pure helpers below (describeField, rankLabel, ...), tested in
// test_cl_ui_fields.js.
import { t } from '../../i18n/index.js';
import { registerStrings } from '../../i18n/coreloop/index.js';
import EN from '../../i18n/coreloop/fields.en.js';
import AR from '../../i18n/coreloop/fields.ar.js';
import { BigNum } from '../../engine/BigNum.js';
import { P } from '../../systems/coreloop/params.js';
import { PRESENCE, FIELDS } from '../../systems/coreloop/shared.js';
import * as Fields from '../../systems/coreloop/Fields.js';
import * as Rigs from '../../systems/coreloop/Rigs.js';
import * as Mastery from '../../systems/coreloop/Mastery.js';
import * as Presence from '../../systems/coreloop/Presence.js';

registerStrings(EN, AR);

const HOUR = 3600;

// --- pure helpers ----------------------------------------------------------------------------
// A number for the screen: small values with up to `d` decimals, big ones as BigNum text.
export function fmtNum(x, d = 2) {
  if (x && typeof x.format === 'function') return x.format();
  const v = Number(x);
  if (!Number.isFinite(v)) return '0';
  const a = Math.abs(v);
  if (a >= 1000) return BigNum.formatNumber(v);
  if (a >= 100) return String(Math.round(v));
  const s = v.toFixed(a >= 10 ? Math.min(d, 1) : d);
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
}

// Material grades are shown by their number in the engine (grade 0 is the first)
export const gradeLabel = (g) => String(g);

// The name of a Mastery rank: "Novice" ... "Ostoura", "Ostoura 2" ... past Legend
export function rankLabel(rank) {
  const info = Mastery.rankInfo(rank);
  if (info.level >= 2) return t('cl.rank.legend_n', { n: info.level });
  return t(`cl.rank.${info.id}`);
}

// Everything the screen shows for one Field, as plain numbers (no text). Rates are per hour.
export function describeField(state, i, presence = Presence.presenceOf(state)) {
  const f = state.fields[i];
  const left = Fields.levelsToNextGrade(state, i);
  const handsOn = presence === PRESENCE.HANDS && state.presence.handField === i;
  const heat = Presence.heat(state);
  const rig = f.rig;
  return {
    index: i,
    id: FIELDS[i],
    selected: state.presence.handField === i,
    handsOn,
    level: Math.floor(f.frontier),
    grade: Fields.gradeOf(f.frontier),
    toNext: left,
    gradeFraction: Math.max(0, Math.min(1, 1 - left / P.gradeSpan)),
    speedPerHour: Fields.frontierSpeed(state, i) * HOUR,
    power: Fields.fieldPower(state, i, presence),
    heat,
    heatFraction: Math.max(0, Math.min(1, heat - 1)),
    rig: rig === 0 ? null : {
      level: rig,
      reachPct: Math.round(Rigs.rigReach(state, i) * 100),
      grade: Rigs.rigGrade(state, i),
      watchPerHour: Rigs.rigRate(state, i, PRESENCE.WATCH) * HOUR,
      awayPerHour: Rigs.rigRate(state, i, PRESENCE.AWAY) * HOUR,
      handPerHour: Rigs.handRate(state) * heat * HOUR,
      efficiencyPct: Math.round(Mastery.rigEfficiency(state, i) * 100)
    },
    shelf: f.inventory.map((units, grade) => ({ grade, units })).filter(x => x.units > 0),
    school: Mastery.schoolPower(state, i),
    actions: Array.from({ length: P.actionsPerField }, (_, a) => {
      const p = Mastery.actionProgress(state, i, a);
      return { action: a, rank: p.rank, hours: p.hours, to: p.to, fraction: p.fraction };
    })
  };
}

// --- DOM -------------------------------------------------------------------------------------
function h(doc, tag, cls, text) {
  const e = doc.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
const setText = (e, s) => { if (e.textContent !== s) e.textContent = s; };
const setW = (e, fraction) => { const w = `${(fraction * 100).toFixed(1)}%`; if (e.style.width !== w) e.style.width = w; };

function ensureCss(doc) {
  if (doc.querySelector('link[data-coreloop-fields-css]')) return;
  const link = doc.createElement('link');
  link.rel = 'stylesheet'; link.href = 'css/coreloop-fields.css'; link.dataset.coreloopFieldsCss = '';
  doc.head.appendChild(link);
}

export function mount(panel, api) {
  const doc = panel.ownerDocument;
  ensureCss(doc);
  panel.classList.add('clf');

  // Field switch
  const sw = h(doc, 'div', 'clf-switch');
  sw.setAttribute('role', 'group');
  sw.setAttribute('aria-label', t('cl.fields.switch_label'));
  const swBtns = FIELDS.map((id, i) => {
    const b = h(doc, 'button', 'btn clf-switch-btn', t(`cl.field.${id}`));
    b.type = 'button';
    b.addEventListener('click', () => api.act((s) => Presence.setHandField(s, i)));
    sw.appendChild(b);
    return b;
  });

  // Frontier card
  const front = h(doc, 'section', 'card clf-card clf-front');
  const fHead = h(doc, 'header', 'card-head');
  const fTitle = h(doc, 'h2', 'clf-title');
  const fGrade = h(doc, 'span', 'chip gold num');
  fHead.append(fTitle, fGrade);
  const fLevel = h(doc, 'p', 'clf-level num');
  const gradeBar = h(doc, 'div', 'bar gold lg'); const gradeFill = h(doc, 'i'); gradeBar.appendChild(gradeFill);
  const fNext = h(doc, 'p', 'clf-sub num');
  const fStats = h(doc, 'p', 'clf-sub num');
  const tap = h(doc, 'button', 'btn btn-primary btn-lg clf-tap');
  tap.type = 'button';
  const tapLabel = h(doc, 'span', 'clf-tap-label', t('cl.fields.work'));
  const tapHint = h(doc, 'span', 'clf-tap-hint num');
  tap.append(tapLabel, tapHint);
  tap.addEventListener('click', () => {
    api.act(() => true);
    tap.classList.remove('is-tap'); void tap.offsetWidth; tap.classList.add('is-tap');
  });
  tap.addEventListener('animationend', () => tap.classList.remove('is-tap'));
  const heatRow = h(doc, 'div', 'clf-heat');
  const heatName = h(doc, 'span', 'clf-heat-name num');
  const heatBar = h(doc, 'div', 'bar danger'); const heatFill = h(doc, 'i'); heatBar.appendChild(heatFill);
  const heatGloss = h(doc, 'span', 'clf-heat-gloss', t('cl.name.heat.gloss'));
  heatRow.append(heatName, heatBar, heatGloss);
  front.append(fHead, fLevel, gradeBar, fNext, fStats, tap, heatRow);

  // Rig card
  const rigCard = h(doc, 'section', 'card clf-card');
  const rHead = h(doc, 'header', 'card-head');
  const rTitle = h(doc, 'h2', 'clf-title');
  const rLevel = h(doc, 'span', 'chip num');
  rHead.append(rTitle, rLevel);
  const rGloss = h(doc, 'p', 'clf-sub');
  const rNone = h(doc, 'p', 'clf-none', t('cl.fields.rig_none'));
  const rList = h(doc, 'ul', 'clf-list');
  const rRows = ['reach', 'grade', 'eff', 'watch', 'away', 'hand'].map(k => { const li = h(doc, 'li', 'num'); li.dataset.k = k; rList.appendChild(li); return li; });
  rigCard.append(rHead, rGloss, rNone, rList);

  // Materials shelf
  const shelfCard = h(doc, 'section', 'card clf-card');
  shelfCard.appendChild(h(doc, 'h2', 'clf-title', t('cl.fields.shelf_title')));
  const shelfEmpty = h(doc, 'p', 'clf-none', t('cl.fields.shelf_empty'));
  const shelf = h(doc, 'ul', 'clf-shelf');
  shelfCard.append(shelfEmpty, shelf);
  let shelfKey = '', shelfCells = [];

  // Mastery
  const mCard = h(doc, 'section', 'card clf-card');
  const mHead = h(doc, 'header', 'card-head');
  mHead.appendChild(h(doc, 'h2', 'clf-title', t('cl.fields.mastery_title')));
  const mSchool = h(doc, 'span', 'chip life num');
  mHead.appendChild(mSchool);
  const mList = h(doc, 'ul', 'clf-actions');
  const mRows = Array.from({ length: P.actionsPerField }, () => {
    const li = h(doc, 'li', 'clf-action');
    const top = h(doc, 'div', 'clf-action-top');
    const name = h(doc, 'span', 'clf-action-name');
    const rank = h(doc, 'span', 'tag tier');
    top.append(name, rank);
    const bar = h(doc, 'div', 'bar dust'); const fill = h(doc, 'i'); bar.appendChild(fill);
    const hrs = h(doc, 'span', 'clf-sub num');
    li.append(top, bar, hrs);
    mList.appendChild(li);
    return { name, rank, fill, hrs };
  });
  mCard.append(mHead, mList);

  const note = h(doc, 'p', 'clf-note', t('cl.fields.note'));

  const grid = h(doc, 'div', 'clf-grid');
  const colA = h(doc, 'div', 'clf-col'); colA.append(front, shelfCard);
  const colB = h(doc, 'div', 'clf-col'); colB.append(rigCard, mCard);
  grid.append(colA, colB);
  panel.replaceChildren(sw, grid, note);

  function update(a = api) {
    const state = a.state;
    const i = state.presence.handField;
    const id = FIELDS[i];
    const d = describeField(state, i, a.presence());

    swBtns.forEach((b, k) => {
      b.setAttribute('aria-pressed', String(k === i));
      b.classList.toggle('is-selected', k === i);
    });

    // Frontier
    setText(fTitle, `${t(`cl.field.${id}`)} · ${t('cl.fields.frontier_title')}`);
    setText(fGrade, t('cl.fields.grade', { n: gradeLabel(d.grade) }));
    setText(fLevel, t('cl.fields.level', { n: fmtNum(d.level) }));
    setW(gradeFill, d.gradeFraction);
    setText(fNext, t('cl.fields.to_next', { n: fmtNum(d.toNext, 1) }));
    setText(fStats, `${t('cl.fields.speed', { n: fmtNum(d.speedPerHour) })} · ${t('cl.fields.power', { n: fmtNum(d.power) })}`);
    setText(tapHint, d.handsOn
      ? t('cl.fields.work_active', { n: fmtNum(d.speedPerHour) })
      : t('cl.fields.work_idle'));
    tap.classList.toggle('is-working', d.handsOn);
    setText(heatName, t('cl.shell.heat', { n: d.heat.toFixed(2) }));
    setW(heatFill, d.heatFraction);

    // Rig
    setText(rTitle, t(`cl.rig.${id}`));
    setText(rGloss, t(`cl.rig.${id}.gloss`));
    rNone.hidden = !!d.rig;
    rList.hidden = !d.rig;
    rLevel.hidden = !d.rig;
    if (d.rig) {
      setText(rLevel, t('cl.fields.rig_level', { n: d.rig.level }));
      const txt = {
        reach: t('cl.fields.rig_reach', { n: d.rig.reachPct }),
        grade: t('cl.fields.rig_grade', { n: gradeLabel(d.rig.grade) }),
        eff: t('cl.fields.rig_eff', { n: d.rig.efficiencyPct }),
        watch: t('cl.fields.rate_watch', { n: fmtNum(d.rig.watchPerHour) }),
        away: t('cl.fields.rate_away', { n: fmtNum(d.rig.awayPerHour) }),
        hand: t('cl.fields.rate_hand', { n: fmtNum(d.rig.handPerHour) })
      };
      rRows.forEach(li => setText(li, txt[li.dataset.k]));
    }

    // Materials: rebuild the cells only when the Field or the number of grades changes
    const inv = state.fields[i].inventory;
    const key = `${i}:${inv.length}`;
    if (key !== shelfKey) {
      shelfKey = key;
      shelf.replaceChildren();
      shelfCells = inv.map((_, g) => {
        const li = h(doc, 'li', 'chip num');
        const lbl = h(doc, 'span', '', t('cl.fields.shelf_item', { g: gradeLabel(g) }));
        const val = h(doc, 'strong');
        li.append(lbl, val);
        shelf.appendChild(li);
        return { li, val };
      });
    }
    let any = false;
    shelfCells.forEach((c, g) => {
      const u = inv[g] || 0;
      c.li.hidden = !(u > 0);
      if (u > 0) { any = true; setText(c.val, fmtNum(u, 1)); }
    });
    shelfEmpty.hidden = any;
    shelf.hidden = !any;

    // Mastery
    setText(mSchool, `${t(`cl.fields.school.${id}`)} · ${t('cl.fields.school_power', { n: fmtNum(d.school) })}`);
    d.actions.forEach((ac, k) => {
      const row = mRows[k];
      setText(row.name, t(`cl.fields.action.${id}.${k}`));
      setText(row.rank, rankLabel(ac.rank));
      setW(row.fill, ac.fraction);
      setText(row.hrs, t('cl.fields.hours', { h: fmtNum(ac.hours), to: fmtNum(ac.to) }));
    });
  }

  update(api);
  return { update };
}
