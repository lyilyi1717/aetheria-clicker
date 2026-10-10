// Core-loop Fields screen (docs/core-loop-plan.md CL-14, reworked by CL-30), mounted by the shell
// (shell.js) behind ?loop=2. It shows a crew at work: which Field it is on, whether it is working
// or resting and why, the level it is pushing and the Materials it hauls. Rig and Mastery appear
// only when the guide has opened them. Every number is read through the systems' functions.
//
// What is true (Rigs.step, Presence.js): the crew works the chosen Field while the player is
// Hands-on, i.e. any tap in the last P.handsWindow seconds. Then the frontier moves and Materials
// are hauled. A Rig works without the player. A tap on the button does nothing but count as input.
//
// mount(panel, api) -> { update(api) }. The DOM is built once; update() only changes text and
// attributes. The logic is in the pure helpers below, tested in test_cl_ui_fields.js.
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
// Players count grades from 1 (index 0 is "Grade 1"), on every core-loop screen
export const gradeLabel = (g) => String(g + 1);

// The name of a Mastery rank: "Novice" ... "Ostoura", "Ostoura 2" ... past Legend
export function rankLabel(rank) {
  const info = Mastery.rankInfo(rank);
  if (info.level >= 2) return t('cl.rank.legend_n', { n: info.level });
  return t(`cl.rank.${info.id}`);
}

// The guide feature that opens each Field (the Tower is always open)
export const FIELD_FEATURES = Object.freeze([null, 'fields.mine', 'fields.oasis']);

// Indexes of the Fields the player may pick, in order. `isOpen` is api.isOpen.
export const openFields = (isOpen) => FIELDS.map((_, i) => i).filter(i => !FIELD_FEATURES[i] || isOpen(FIELD_FEATURES[i]));

// The next Field that is still closed (its chip is shown disabled), or null
export function nextClosedField(isOpen) {
  const i = FIELDS.findIndex((_, k) => FIELD_FEATURES[k] && !isOpen(FIELD_FEATURES[k]));
  return i < 0 ? null : { index: i, feature: FIELD_FEATURES[i] };
}

// Which of the Rig and Mastery sections show, and the one that is still closed (the next coming)
export function sectionsView(isOpen) {
  const mastery = isOpen('fields.mastery');
  const rig = isOpen('fields.rig');
  return { mastery, rig, locked: !mastery ? 'fields.mastery' : !rig ? 'fields.rig' : null };
}

// 'working' while Hands-on (any tap in the last P.handsWindow seconds), else 'resting'
export const crewStatus = (presence) => (presence === PRESENCE.HANDS ? 'working' : 'resting');

// Seconds of work left before the crew rests (0 when resting). A tap tops it back up to P.handsWindow.
export function secondsLeft(state, presence = Presence.presenceOf(state)) {
  if (presence !== PRESENCE.HANDS) return 0;
  const age = state.t - state.presence.lastInputAt;
  return Math.max(0, Math.min(P.handsWindow, P.handsWindow - age));
}

// The level the crew is on: Level N (1-based), how far through it, and seconds to finish it at
// today's hand speed (null when it is not moving: resting, or too slow to say)
export function levelView(state, i, presence = Presence.presenceOf(state)) {
  const frontier = state.fields[i].frontier;
  const whole = Math.floor(frontier);
  const fraction = Math.max(0, Math.min(1, frontier - whole));
  const speed = Fields.frontierSpeed(state, i);        // levels per second, working by hand
  const moving = presence === PRESENCE.HANDS && state.presence.handField === i;
  return {
    level: whole + 1,
    fraction,
    moving,
    secondsToNext: moving && speed > 1e-9 ? (1 - fraction) / speed : null,
    grade: Fields.gradeOf(frontier),
    toGrade: Fields.levelsToNextGrade(state, i)
  };
}

// Materials per second hauled from Field i right now: the crew's hands (while Hands-on on this
// Field) plus its Rig in the current presence (as Rigs.step does)
export function hauledPerSecond(state, i, presence = Presence.presenceOf(state)) {
  const hands = presence === PRESENCE.HANDS && state.presence.handField === i ? Rigs.handRate(state) * Presence.heat(state) : 0;
  const rig = Rigs.rigRate(state, i, presence);
  return { hands, rig, total: hands + rig };
}

// A per-second rate as a number and the unit that reads best: { unit: 's' | 'm' | 'h', n }
export function rateParts(perSecond) {
  const v = Math.max(0, Number(perSecond) || 0);
  if (v >= 0.1) return { unit: 's', n: v };
  if (v * 60 >= 0.1) return { unit: 'm', n: v * 60 };
  return { unit: 'h', n: v * HOUR };
}

// Total Materials on a Field's shelf
export const materialsOf = (state, i) => state.fields[i].inventory.reduce((a, b) => a + b, 0);

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
      handsPerHour: Rigs.rigRate(state, i, PRESENCE.HANDS) * HOUR,
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
const clock = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

function pulse(node) {
  node.classList.remove('clf-pulse');
  void node.offsetWidth;
  node.classList.add('clf-pulse');
}

function ensureCss(doc) {
  if (doc.querySelector('link[data-coreloop-fields-css]')) return;
  const link = doc.createElement('link');
  link.rel = 'stylesheet'; link.href = 'css/coreloop-fields.css'; link.dataset.coreloopFieldsCss = '';
  doc.head.appendChild(link);
}

const rateText = (perSecond) => {
  const r = rateParts(perSecond);
  return t(`cl.fields.rate_${r.unit}`, { n: fmtNum(r.n) });
};

export function mount(panel, api) {
  const doc = panel.ownerDocument;
  ensureCss(doc);
  panel.classList.add('clf');

  // 1. Field picker: one chip per open Field, then the next closed one, disabled
  const pick = h(doc, 'div', 'clf-pick');
  pick.setAttribute('role', 'group');
  pick.setAttribute('aria-label', t('cl.fields.switch_label'));
  const chips = FIELDS.map((id, i) => {
    const b = h(doc, 'button', 'clf-chip');
    b.type = 'button';
    const name = h(doc, 'span', 'clf-chip-name', t(`cl.field.${id}`));
    const sub = h(doc, 'span', 'clf-chip-sub num');
    b.append(name, sub);
    b.addEventListener('click', () => api.sendCrew(i));
    pick.appendChild(b);
    return { b, sub };
  });

  // 2. The crew at work
  const crew = h(doc, 'section', 'card clf-card clf-crew');
  const cHead = h(doc, 'header', 'card-head');
  const cTitle = h(doc, 'h2', 'clf-title');
  const cGrade = h(doc, 'span', 'chip gold num');
  cHead.append(cTitle, cGrade);

  const status = h(doc, 'div', 'clf-status');
  status.setAttribute('role', 'status');
  const dot = h(doc, 'span', 'clf-dot');
  dot.setAttribute('aria-hidden', 'true');
  const statusText = h(doc, 'strong', 'clf-status-text');
  status.append(dot, statusText);
  const why = h(doc, 'p', 'clf-sub');
  const winRow = h(doc, 'div', 'bar-row clf-win');
  const winBar = h(doc, 'div', 'bar life'); const winFill = h(doc, 'i'); winBar.appendChild(winFill);
  const winVal = h(doc, 'span', 'val num');
  winRow.append(winBar, winVal);

  const lvl = h(doc, 'div', 'clf-block');
  const lvlTop = h(doc, 'div', 'clf-top');
  const lvlBig = h(doc, 'span', 'clf-big num');
  const lvlSub = h(doc, 'span', 'clf-sub num');
  lvlTop.append(lvlBig, lvlSub);
  const lvlBar = h(doc, 'div', 'bar gold lg'); const lvlFill = h(doc, 'i'); lvlBar.appendChild(lvlFill);
  const lvlGrade = h(doc, 'p', 'clf-sub num');
  lvl.append(lvlTop, lvlBar, lvlGrade);

  const haul = h(doc, 'div', 'clf-block');
  const haulTop = h(doc, 'div', 'clf-top');
  const haulBig = h(doc, 'span', 'clf-big num');
  const haulLbl = h(doc, 'span', 'clf-sub', t('cl.fields.hauled'));
  haulTop.append(haulBig, haulLbl);
  const haulRate = h(doc, 'p', 'clf-sub num');
  haul.append(haulTop, haulRate);

  const work = h(doc, 'button', 'btn btn-primary btn-lg clf-work');
  work.type = 'button';
  work.dataset.guide = 'fields.work';
  work.addEventListener('click', () => {
    pulse(work); pulse(winRow);
    api.sendCrew(api.state.presence.handField);   // the tap is the input, and it tells the guide the crew was sent
  });
  for (const n of [work, winRow, status]) n.addEventListener('animationend', () => n.classList.remove('clf-pulse'));

  const heat = h(doc, 'div', 'clf-heat');
  const heatName = h(doc, 'span', 'clf-heat-name num');
  const heatBar = h(doc, 'div', 'bar danger'); const heatFill = h(doc, 'i'); heatBar.appendChild(heatFill);
  const heatGloss = h(doc, 'span', 'clf-heat-gloss');
  heat.append(heatName, heatBar, heatGloss);
  crew.append(cHead, status, why, winRow, lvl, haul, work, heat);

  // 3. Materials
  const matCard = h(doc, 'section', 'card clf-card');
  matCard.appendChild(h(doc, 'h2', 'clf-title', t('cl.fields.shelf_title')));
  matCard.appendChild(h(doc, 'p', 'clf-sub', t('cl.fields.shelf_for')));
  const matEmpty = h(doc, 'p', 'clf-none', t('cl.fields.shelf_empty'));
  const shelf = h(doc, 'ul', 'clf-shelf');
  const toRefinery = h(doc, 'button', 'btn clf-quiet', t('cl.fields.to_refinery'));
  toRefinery.type = 'button';
  toRefinery.addEventListener('click', () => api.go('refinery'));
  matCard.append(matEmpty, shelf, toRefinery);
  let shelfKey = '', shelfCells = [];

  // 4. Rig (once a New Field has built one)
  const rigCard = h(doc, 'section', 'card clf-card');
  const rHead = h(doc, 'header', 'card-head');
  const rTitle = h(doc, 'h2', 'clf-title');
  const rLevel = h(doc, 'span', 'chip num');
  rHead.append(rTitle, rLevel);
  const rGloss = h(doc, 'p', 'clf-sub');
  const rNone = h(doc, 'p', 'clf-none', t('cl.fields.rig_none'));
  const rList = h(doc, 'ul', 'clf-list');
  const rRows = ['grade', 'hands', 'watch', 'away', 'eff'].map(k => { const li = h(doc, 'li', 'num'); li.dataset.k = k; rList.appendChild(li); return li; });
  rigCard.append(rHead, rGloss, rNone, rList);

  // 4. Mastery (once opened)
  const mCard = h(doc, 'section', 'card clf-card');
  mCard.dataset.guide = 'fields.mastery';
  const mHead = h(doc, 'header', 'card-head');
  mHead.appendChild(h(doc, 'h2', 'clf-title', t('cl.fields.mastery_title')));
  const mSchool = h(doc, 'span', 'chip life num');
  mHead.appendChild(mSchool);
  const mBlurb = h(doc, 'p', 'clf-sub', t('cl.fields.mastery_blurb'));
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
  mCard.append(mHead, mBlurb, mList);

  const locked = h(doc, 'p', 'cl-locked');
  const note = h(doc, 'p', 'clf-note', t('cl.fields.note'));

  const grid = h(doc, 'div', 'clf-grid');
  const colA = h(doc, 'div', 'clf-col'); colA.append(crew);
  const colB = h(doc, 'div', 'clf-col'); colB.append(matCard, rigCard, mCard, locked);
  grid.append(colA, colB);
  panel.replaceChildren(pick, grid, note);

  let wasWorking = null;

  function update(a = api) {
    const state = a.state;
    const i = state.presence.handField;
    const id = FIELDS[i];
    const presence = a.presence();
    const d = describeField(state, i, presence);
    const working = crewStatus(presence) === 'working';
    const lv = levelView(state, i, presence);
    const hz = hauledPerSecond(state, i, presence);
    const secs = secondsLeft(state, presence);

    // 1. Picker
    const open = openFields(a.isOpen);
    const nextClosed = nextClosedField(a.isOpen);
    chips.forEach((c, k) => {
      const isOpenField = open.includes(k);
      const isNext = nextClosed && nextClosed.index === k;
      c.b.hidden = !isOpenField && !isNext;
      c.b.disabled = !isOpenField;
      c.b.setAttribute('aria-pressed', String(isOpenField && k === i));
      c.b.classList.toggle('is-selected', isOpenField && k === i);
      setText(c.sub, isOpenField
        ? (k === i ? t('cl.fields.chip_here') : t('cl.fields.chip_materials', { n: fmtNum(materialsOf(state, k), 1) }))
        : a.lockText(FIELD_FEATURES[k]));
    });

    // 2. The crew at work
    setText(cTitle, t(`cl.field.${id}`));
    setText(cGrade, t('cl.fields.grade', { n: gradeLabel(lv.grade) }));
    crew.classList.toggle('is-working', working);
    setText(statusText, working ? t('cl.fields.status_working') : t('cl.fields.status_resting'));
    setText(why, working ? t('cl.fields.why_working', { n: P.handsWindow }) : t('cl.fields.why_resting', { n: P.handsWindow }));
    setW(winFill, secs / P.handsWindow);
    setText(winVal, working ? t('cl.fields.window_left', { n: Math.ceil(secs) }) : t('cl.fields.window_rest'));

    setText(lvlBig, t('cl.fields.level', { n: fmtNum(lv.level) }));
    setW(lvlFill, lv.fraction);
    setText(lvlSub, lv.moving
      ? (lv.secondsToNext != null ? t('cl.fields.level_next', { time: clock(lv.secondsToNext) }) : '')
      : t('cl.fields.level_paused'));
    setText(lvlGrade, t('cl.fields.to_grade', { n: fmtNum(lv.toGrade, 1), g: gradeLabel(lv.grade + 1) }));

    setText(haulBig, fmtNum(materialsOf(state, i), 1));
    setText(haulRate, working
      ? t('cl.fields.haul_working', { rate: rateText(hz.total) })
      : hz.rig > 0 ? t('cl.fields.haul_rig', { rate: rateText(hz.rig) }) : t('cl.fields.haul_none'));

    setText(work, working ? t('cl.fields.keep') : t('cl.fields.work'));
    work.classList.toggle('is-working', working);

    setText(heatName, t('cl.shell.heat', { n: d.heat.toFixed(2) }));
    setW(heatFill, d.heatFraction);
    setText(heatGloss, t('cl.fields.heat_gloss', { name: t('cl.name.heat'), s: P.heatRamp }));

    // 3. Materials: rebuild the cells only when the Field or the number of grades changes
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
    matEmpty.hidden = any;
    shelf.hidden = !any;
    toRefinery.hidden = !a.isOpen('tab.refinery');

    // 4. Rig and Mastery, staged by the guide
    const sec = sectionsView(a.isOpen);
    rigCard.hidden = !sec.rig;
    mCard.hidden = !sec.mastery;
    locked.hidden = !sec.locked;
    if (sec.locked) setText(locked, a.lockText(sec.locked));

    if (sec.rig) {
      setText(rTitle, t(`cl.rig.${id}`));
      setText(rGloss, t(`cl.rig.${id}.gloss`));
      rNone.hidden = !!d.rig;
      rList.hidden = !d.rig;
      rLevel.hidden = !d.rig;
      if (d.rig) {
        setText(rLevel, t('cl.fields.rig_level', { n: d.rig.level }));
        const txt = {
          grade: t('cl.fields.rig_grade', { n: gradeLabel(d.rig.grade) }),
          hands: t('cl.fields.rig_hands', { rate: rateText(d.rig.handsPerHour / HOUR) }),
          watch: t('cl.fields.rig_watch', { rate: rateText(d.rig.watchPerHour / HOUR) }),
          away: t('cl.fields.rig_away', { rate: rateText(d.rig.awayPerHour / HOUR) }),
          eff: t('cl.fields.rig_eff', { n: d.rig.efficiencyPct })
        };
        rRows.forEach(li => setText(li, txt[li.dataset.k]));
      }
    }

    if (sec.mastery) {
      setText(mSchool, `${t(`cl.fields.school.${id}`)} · ${t('cl.fields.school_power', { n: fmtNum(d.school) })}`);
      d.actions.forEach((ac, k) => {
        const row = mRows[k];
        setText(row.name, t(`cl.fields.action.${id}.${k}`));
        setText(row.rank, rankLabel(ac.rank));
        setW(row.fill, ac.fraction);
        setText(row.hrs, t('cl.fields.hours', { h: fmtNum(ac.hours), to: fmtNum(ac.to), rank: rankLabel(ac.rank + 1) }));
      });
    }

    // A change of status gets a brief flash (not on the first draw)
    if (wasWorking !== null && wasWorking !== working) pulse(status);
    wasWorking = working;
  }

  update(api);
  return { update };
}
