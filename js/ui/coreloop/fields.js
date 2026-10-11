// Core-loop Fields screen (docs/core-loop-plan.md CL-14, CL-30, CL-39), mounted by the shell
// (shell.js) behind ?loop=2. A small map of three places with the crew's marker on one. Looking at
// a place only shows it; "Send the crew here" (api.sendCrew) is what moves the crew. The Order that
// wants the place's Material is shown on it, one ladder (Level) with Grade as the milestone, and
// the Rig and Mastery stay quiet until they matter.
//
// What is true (Rigs.step, Presence.js): the crew works the chosen Field while the player is
// Hands-on (any tap in the last P.handsWindow seconds): the frontier moves and Materials are
// hauled. A Rig works without the player. Nothing here counts down: when the player has been still
// a while the crew is "on a break" and one button sends them back.
//
// mount(panel, api) -> { update(api) }. The DOM is built once; update() only changes text and
// attributes. The logic is in the pure helpers below, tested in test_cl_ui_fields.js.
import { t } from '../../i18n/index.js';
import { registerStrings } from '../../i18n/coreloop/index.js';
import EN from '../../i18n/coreloop/fields.en.js';
import AR from '../../i18n/coreloop/fields.ar.js';
import { BigNum } from '../../engine/BigNum.js';
import { P } from '../../systems/coreloop/params.js';
import { PRESENCE, FIELDS, FRACTIONS } from '../../systems/coreloop/shared.js';
import * as Fields from '../../systems/coreloop/Fields.js';
import * as Rigs from '../../systems/coreloop/Rigs.js';
import * as Mastery from '../../systems/coreloop/Mastery.js';
import * as Presence from '../../systems/coreloop/Presence.js';
import * as Refinery from '../../systems/coreloop/Refinery.js';
import * as Guide from '../../systems/coreloop/Guide.js';
import { icon, FIELD_ICONS } from './icons.js';

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

// A count of things you can hold: whole numbers (35, not 35.1), abbreviated from 1,000
export const whole = (x) => fmtNum(Math.floor((Number(x) || 0) + 1e-9), 0);

// Material grades are shown by their number in the engine (grade 0 is the first)
// Players count grades from 1 (index 0 is "Grade 1"), on every core-loop screen
export const gradeLabel = (g) => String(g + 1);

// "II", "III" ... for a quality word on a Material (the number itself past 39)
export function roman(n) {
  if (!(n >= 1 && n < 40)) return String(n);
  let s = '', r = n;
  for (const [v, c] of [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) while (r >= v) { s += c; r -= v; }
  return s;
}

// "Steel" for the first grade, "Steel II" for the next ... (grade is the engine's 0-based index)
export function materialName(field, grade = 0) {
  const name = t(`cl.material.${FIELDS[field]}`);
  return grade >= 1 ? t('cl.fields.material_grade', { material: name, grade: roman(grade + 1) }) : name;
}

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

// 'working' while Hands-on (any tap in the last P.handsWindow seconds), else 'break'
export const crewStatus = (presence) => (presence === PRESENCE.HANDS ? 'working' : 'break');

// The tab dot: 1 when the crew is on a break and could be sent back to work, else 0.
export function readyCount(state) {
  if (!Guide.isOpen(state, 'tab.fields')) return 0;
  return Presence.presenceOf(state) === PRESENCE.HANDS ? 0 : 1;
}

// The button on the viewed Field: 'send' (the crew is elsewhere, or has not been sent yet),
// 'back' (the crew is here on a break), or null (the crew is here and working)
export function workButton({ viewing, crewField, sent, working }) {
  if (viewing !== crewField || !sent) return 'send';
  return working ? null : 'back';
}

// Which button is the solid gold one. `goal` is api.goal(): the bar's goal and whether its screen is
// showing. The goal's own element is gold; with the goal on another screen the one best action of
// this screen is (the Refinery when the bar points there, else the crew button); the rest is outlined.
export function goldFor({ goal, work, refinery }) {
  if (goal && goal.here) return { work: work && goal.anchor === 'fields.work', refinery: false };
  if (refinery && (!work || (goal && goal.screen === 'refinery'))) return { work: false, refinery: true };
  return { work: !!work, refinery: false };
}

// The open Orders that want Material from Field i, with what the player has toward each
export function wantedOrders(state, i) {
  const out = [];
  state.refinery.orders.forEach((o, slot) => {
    if (o.empty || o.field !== i) return;
    const info = Refinery.orderInfo(state, slot);
    if (info && !info.empty) out.push(info);
  });
  return out;
}

// Has any skill of this Field got near its first rank (or been ranked)? Until then Mastery is one line.
export const masteryReach = (d) => d.actions.some(a => a.rank > 0 || a.fraction >= 0.5);

// The level the crew is on: Level N (1-based), how far through it, and how far from the next Grade
export function levelView(state, i, presence = Presence.presenceOf(state)) {
  const frontier = state.fields[i].frontier;
  const whole_ = Math.floor(frontier);
  const fraction = Math.max(0, Math.min(1, frontier - whole_));
  const speed = Fields.frontierSpeed(state, i);        // levels per second, working by hand
  const moving = presence === PRESENCE.HANDS && state.presence.handField === i;
  return {
    level: whole_ + 1,
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
  if (v >= 1) return { unit: 's', n: v };
  if (v * 60 >= 1) return { unit: 'm', n: v * 60 };
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

// A rate for the screen: whole numbers from 10, one decimal below
const rateText = (perSecond) => {
  const r = rateParts(perSecond);
  const n = r.n >= 10 ? String(Math.round(r.n)) : fmtNum(r.n, 1);
  return t(`cl.fields.rate_${r.unit}`, { n });
};

export function mount(panel, api) {
  const doc = panel.ownerDocument;
  ensureCss(doc);
  panel.classList.add('clf');

  // The Field being looked at. Looking never moves the crew: only the button does.
  let viewing = api.state.presence.handField;

  // 1. The map: one place per Field, the crew's marker on one, the next closed one disabled
  const pick = h(doc, 'div', 'clf-pick');
  pick.setAttribute('role', 'group');
  pick.setAttribute('aria-label', t('cl.fields.switch_label'));
  const chips = FIELDS.map((id, i) => {
    const b = h(doc, 'button', 'clf-chip');
    b.type = 'button';
    const ic = h(doc, 'span', 'clf-chip-icon');
    ic.setAttribute('aria-hidden', 'true');
    ic.innerHTML = icon(FIELD_ICONS[id] || 'dot');
    const name = h(doc, 'span', 'clf-chip-name', t(`cl.field.${id}`));
    const sub = h(doc, 'span', 'clf-chip-sub num');
    b.append(ic, name, sub);
    b.addEventListener('click', () => { viewing = i; update(api); });
    pick.appendChild(b);
    return { b, sub };
  });

  // 2. The viewed Field: where the crew is and why, the ladder, the haul, the Order that wants it
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

  const work = h(doc, 'button', 'btn btn-lg clf-work');
  work.type = 'button';
  work.dataset.guide = 'fields.work';
  work.addEventListener('click', () => {
    pulse(status);
    api.sendCrew(viewing);   // the choice: moves the crew, tells the guide, counts as input
  });
  for (const n of [status]) n.addEventListener('animationend', () => n.classList.remove('clf-pulse'));

  const wanted = h(doc, 'div', 'clf-wanted');
  const wantedTitle = h(doc, 'h3', 'clf-subtitle', t('cl.fields.wanted_title'));
  const wantedList = h(doc, 'ul', 'clf-list');
  wanted.append(wantedTitle, wantedList);
  let wantedRows = [];
  const wantedNone = h(doc, 'p', 'clf-none');
  const toRefinery = h(doc, 'button', 'btn clf-quiet', t('cl.fields.to_refinery'));
  toRefinery.type = 'button';
  toRefinery.addEventListener('click', () => api.go('refinery'));

  const lvl = h(doc, 'div', 'clf-block');
  const lvlTop = h(doc, 'div', 'clf-top');
  const lvlBig = h(doc, 'span', 'clf-big num');
  const lvlSub = h(doc, 'span', 'clf-sub num');
  lvlTop.append(lvlBig, lvlSub);
  const lvlBar = h(doc, 'div', 'bar gold lg'); const lvlFill = h(doc, 'i'); lvlBar.appendChild(lvlFill);
  lvl.append(lvlTop, lvlBar);

  const haul = h(doc, 'div', 'clf-block');
  const haulTop = h(doc, 'div', 'clf-top');
  const haulBig = h(doc, 'span', 'clf-big num');
  const haulLbl = h(doc, 'span', 'clf-sub');
  haulTop.append(haulBig, haulLbl);
  const haulRate = h(doc, 'p', 'clf-sub num');
  const shelf = h(doc, 'ul', 'clf-shelf');
  haul.append(haulTop, haulRate, shelf);
  let shelfKey = '', shelfCells = [];

  const heat = h(doc, 'div', 'clf-heat');
  const heatName = h(doc, 'span', 'clf-heat-name num');
  const heatBar = h(doc, 'div', 'bar gold'); const heatFill = h(doc, 'i'); heatBar.appendChild(heatFill);
  const heatGloss = h(doc, 'span', 'clf-heat-gloss', t('cl.fields.heat_gloss'));
  heat.append(heatName, heatBar, heatGloss);
  crew.append(cHead, status, why, work, wanted, wantedNone, toRefinery, lvl, haul, heat);

  // 3. Rig (once a New Field has built one): one rate, the rest behind "How it works"
  const rigCard = h(doc, 'section', 'card clf-card');
  const rHead = h(doc, 'header', 'card-head');
  const rTitle = h(doc, 'h2', 'clf-title');
  const rLevel = h(doc, 'span', 'chip num');
  rHead.append(rTitle, rLevel);
  const rGloss = h(doc, 'p', 'clf-sub');
  const rNone = h(doc, 'p', 'clf-none', t('cl.fields.rig_none'));
  const rHauls = h(doc, 'p', 'clf-rig-main num');
  const rMore = h(doc, 'details', 'clf-more');
  rMore.append(h(doc, 'summary', '', t('cl.fields.rig_how')));
  const rList = h(doc, 'ul', 'clf-list');
  const rRows = ['hands', 'watch', 'away', 'eff'].map(k => { const li = h(doc, 'li', 'num'); li.dataset.k = k; rList.appendChild(li); return li; });
  rMore.appendChild(rList);
  rigCard.append(rHead, rGloss, rNone, rHauls, rMore);

  // 4. Mastery (once opened): one line until the first rank is near
  const mCard = h(doc, 'details', 'card clf-card clf-mastery');
  mCard.dataset.guide = 'fields.mastery';
  const mSum = h(doc, 'summary', 'clf-mastery-sum');
  const mTitle = h(doc, 'span', 'clf-title', t('cl.fields.mastery_title'));
  const mLine = h(doc, 'span', 'clf-sub num');
  mSum.append(mTitle, mLine);
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
  mCard.append(mSum, mBlurb, mList);
  let mOpened = false;   // opened by itself once (when the first rank is near); the player's toggle wins after

  const locked = h(doc, 'p', 'cl-locked');

  const grid = h(doc, 'div', 'clf-grid');
  const colA = h(doc, 'div', 'clf-col'); colA.append(crew);
  const colB = h(doc, 'div', 'clf-col'); colB.append(rigCard, mCard, locked);
  grid.append(colA, colB);
  panel.replaceChildren(pick, grid);

  let wasWorking = null;

  function update(a = api) {
    const state = a.state;
    const crewField = state.presence.handField;
    const open = openFields(a.isOpen);
    if (!open.includes(viewing)) viewing = open.includes(crewField) ? crewField : 0;
    const i = viewing;
    const id = FIELDS[i];
    const presence = a.presence();
    const d = describeField(state, i, presence);
    const working = crewStatus(presence) === 'working';
    const here = i === crewField;
    const sent = !!state.guide.sent || state.refinery.frac.some(fr => fr.level > 0);
    const lv = levelView(state, i, presence);
    const hz = hauledPerSecond(state, i, presence);
    const mat = t(`cl.material.${id}`);
    const orders = wantedOrders(state, i);

    // 1. The map
    const nextClosed = nextClosedField(a.isOpen);
    chips.forEach((c, k) => {
      const isOpenField = open.includes(k);
      const isNext = nextClosed && nextClosed.index === k;
      c.b.hidden = !isOpenField && !isNext;
      c.b.disabled = !isOpenField;
      c.b.setAttribute('aria-pressed', String(isOpenField && k === i));
      c.b.classList.toggle('is-selected', isOpenField && k === i);
      c.b.classList.toggle('has-crew', isOpenField && k === crewField);
      setText(c.sub, isOpenField
        ? (k === crewField ? t('cl.fields.chip_here') : t('cl.fields.chip_have', { n: whole(materialsOf(state, k)), material: t(`cl.material.${FIELDS[k]}`) }))
        : a.lockText(FIELD_FEATURES[k]));
    });

    // 2. Where the crew is, and why
    setText(cTitle, t(`cl.field.${id}`));
    setText(cGrade, t('cl.fields.grade', { n: gradeLabel(lv.grade) }));
    crew.classList.toggle('is-working', here && working);
    const btn = workButton({ viewing: i, crewField, sent, working });
    if (here) {
      setText(statusText, working ? t('cl.fields.status_working') : t('cl.fields.status_break'));
      if (!sent) setText(why, t('cl.fields.why_choose', { material: mat }));
      else if (!working) {
        setText(why, d.rig && hz.rig > 0 ? t('cl.fields.why_break', { rig: t(`cl.rig.${id}`), rate: rateText(hz.rig) }) : '');
      } else {
        const o = orders[0];
        setText(why, o
          ? t('cl.fields.why_order', { material: materialName(i, o.grade), frac: t(`cl.frac.${FRACTIONS[o.frac]}`) })
          : t('cl.fields.why_free', { material: mat }));
      }
    } else {
      setText(statusText, t('cl.fields.status_elsewhere', { field: t(`cl.field.${FIELDS[crewField]}`) }));
      setText(why, t('cl.fields.why_elsewhere', { material: mat }));
    }
    why.hidden = !why.textContent;

    // The one verb
    const goal = a.goal ? a.goal() : { here: false };
    const readyOrder = orders.some(o => o.ready) && a.isOpen('tab.refinery');
    const gold = goldFor({ goal, work: !!btn, refinery: readyOrder });
    work.hidden = !btn;
    if (btn) setText(work, btn === 'back' ? t('cl.fields.back') : t('cl.fields.send'));
    work.classList.toggle('btn-primary', gold.work);
    work.classList.toggle('btn-ready', !!btn && !gold.work);

    // What the Orders want from here
    wantedRows.forEach(li => li.remove());
    wantedRows = orders.slice(0, P.orderSlots).map(o => {
      const li = h(doc, 'li', 'num', t(o.ready ? 'cl.fields.wanted_ready' : 'cl.fields.wanted', {
        qty: whole(o.qty), material: materialName(i, o.grade), frac: t(`cl.frac.${FRACTIONS[o.frac]}`), have: whole(o.have)
      }));
      if (o.ready) li.classList.add('is-ready');
      wantedList.appendChild(li);
      return li;
    });
    wanted.hidden = orders.length === 0;
    setText(wantedNone, t('cl.fields.wanted_none', { material: mat }));
    wantedNone.hidden = orders.length > 0 || !sent || here;
    toRefinery.hidden = !readyOrder;
    toRefinery.classList.toggle('btn-primary', gold.refinery);
    toRefinery.classList.toggle('btn-ready', !gold.refinery);

    // The ladder: one number (Level), Grade as the milestone
    setText(lvlBig, t('cl.fields.level', { n: fmtNum(lv.level) }));
    setW(lvlFill, d.gradeFraction);
    const toGrade = Math.max(1, Math.ceil(lv.toGrade - 1e-9));
    setText(lvlSub, toGrade === 1 ? t('cl.fields.to_grade_one', { g: gradeLabel(lv.grade + 1) }) : t('cl.fields.to_grade', { n: toGrade, g: gradeLabel(lv.grade + 1) }));

    // The haul
    setText(haulBig, whole(materialsOf(state, i)));
    setText(haulLbl, t('cl.fields.hauled', { material: mat }));
    setText(haulRate, here && working ? t('cl.fields.haul_working', { rate: rateText(hz.total) }) : '');
    haulRate.hidden = !haulRate.textContent;

    const inv = state.fields[i].inventory;
    const key = `${i}:${inv.length}`;
    if (key !== shelfKey) {
      shelfKey = key;
      shelf.replaceChildren();
      shelfCells = inv.map((_, g) => {
        const li = h(doc, 'li', 'chip num');
        const lbl = h(doc, 'span', '', materialName(i, g));
        const val = h(doc, 'strong');
        li.append(lbl, val);
        shelf.appendChild(li);
        return { li, val };
      });
    }
    const grades = inv.filter(u => u > 0).length;
    shelfCells.forEach((c, g) => {
      const u = inv[g] || 0;
      c.li.hidden = !(u > 0) || grades < 2;
      if (u > 0) setText(c.val, whole(u));
    });
    shelf.hidden = grades < 2;

    // Da'sa: quiet, a bonus that builds while you play
    const showHeat = a.isOpen('well.heat');
    heat.hidden = !showHeat;
    setText(heatName, t('cl.fields.heat', { name: t('cl.name.heat'), n: Math.round((d.heat - 1) * 100) }));
    setW(heatFill, d.heatFraction);

    // 3. Rig and Mastery, staged by the guide
    const sec = sectionsView(a.isOpen);
    rigCard.hidden = !sec.rig;
    mCard.hidden = !sec.mastery;
    locked.hidden = !sec.locked;
    if (sec.locked) setText(locked, `${sec.locked === 'fields.mastery' ? t('cl.fields.mastery_title') : t('cl.fields.rig_word')}: ${a.lockText(sec.locked)}`);

    if (sec.rig) {
      setText(rTitle, t(`cl.rig.${id}`));
      setText(rGloss, t(`cl.rig.${id}.gloss`));
      rNone.hidden = !!d.rig;
      rHauls.hidden = !d.rig;
      rMore.hidden = !d.rig;
      rLevel.hidden = !d.rig;
      if (d.rig) {
        setText(rLevel, t('cl.fields.rig_level', { n: d.rig.level }));
        setText(rHauls, t('cl.fields.rig_hauls', { material: materialName(i, d.rig.grade), rate: rateText(d.rig.watchPerHour / HOUR) }));
        const txt = {
          hands: t('cl.fields.rig_hands', { rate: rateText(d.rig.handsPerHour / HOUR) }),
          watch: t('cl.fields.rig_watch', { rate: rateText(d.rig.watchPerHour / HOUR) }),
          away: t('cl.fields.rig_away', { rate: rateText(d.rig.awayPerHour / HOUR) }),
          eff: t('cl.fields.rig_eff', { n: d.rig.efficiencyPct })
        };
        rRows.forEach(li => setText(li, txt[li.dataset.k]));
      }
    }

    if (sec.mastery) {
      setText(mLine, t('cl.fields.mastery_line', { n: fmtNum(d.school) }));
      if (!mOpened && masteryReach(d)) { mOpened = true; mCard.open = true; }
      const field = t(`cl.field.${id}`);
      d.actions.forEach((ac, k) => {
        const row = mRows[k];
        setText(row.name, t('cl.fields.skill', { field, n: k + 1 }));
        setText(row.rank, rankLabel(ac.rank));
        setW(row.fill, ac.fraction);
        const mins = ac.to < 1;
        const f = (x) => (mins ? String(Math.round(x * 60)) : fmtNum(x, 1));
        setText(row.hrs, t(mins ? 'cl.fields.progress_min' : 'cl.fields.progress_h', { h: f(ac.hours), to: f(ac.to), rank: rankLabel(ac.rank + 1) }));
      });
    }

    // A change of status gets a brief flash (not on the first draw)
    const w = here && working;
    if (wasWorking !== null && wasWorking !== w) pulse(status);
    wasWorking = w;
  }

  update(api);
  return { update };
}
