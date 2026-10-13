// Dig feature: Rafeeq chatter. LOOKS AND WORDS ONLY: a Rafeeq's trait colours how he moves and what he says; nothing
// here changes strength, coins or the random stream. The one saved thing is a switch: "Rafeeqs talk: on/off".
//
// The pure parts live here so a test can run them: the trait of a seat, the lines, and the RATE RULE
// (`chatterAllow` / `chatterSpoke` / `chatterReply` / `chatterPick` over a plain memory object made by `chatterMem`).
// The page (moods/ui.js draws the bubbles, chatter/ui.js does the pats and the moments) keeps that memory in the page.
//
// FOR OTHER FEATURES:  import { chatterSay } from '../chatter/rules.js';  chatterSay(s, ev, 2, 'ore');   // seat 2 says an ore line
// Names and traits come from the rafeeqs feature when it is merged (G.rafeeqName / G.rafeeqTrait / G.rafeeqPair),
// else "Rafeeq 3" and a trait taken from the seat number.
import { use, emit } from '../../core/registry.js';
import { t } from '../../core/strings.js';
import * as G from '../../game.js';     // read lazily (a circular import is fine): the rafeeqs feature may not be merged yet
import strings from './strings.js';
import { NICK_LINES } from './nicklines.js';

export const CHATTER_TRAITS = ['eager', 'sleepy', 'joker', 'careful', 'proud', 'hungry'];
export const CHATTER_MOMENTS = ['hired', 'ore', 'tnt', 'rock', 'land', 'finish', 'patted', 'deep', 'cheer', 'five', 'flex', 'stamp'];
// how much each trait talks (a chance on a mood bubble) and how often a mate's laugh / a nap shows
export const CHATTER_TALK = { eager: 0.8, sleepy: 0.3, joker: 0.8, careful: 0.55, proud: 0.55, hungry: 0.55 };

export const chatterParams = {
  gap: 4,             // seconds between two bubbles on screen
  own: 14,            // seconds before the same Rafeeq speaks again
  replyAfter: 0.8,    // a reply comes this long after the first line
  pairQuiet: 20,      // both of a talking pair are quiet this long afterwards
  perMinute: 12,      // never more than this many bubbles in a minute (replies not counted)
  patOwn: 3,          // a pat line from the same Rafeeq at most this often
  maxWords: 5,
};

export const chatter = use({
  id: 'chatter', params: chatterParams, strings,
  state: { chatterQuiet: { init: () => false, survives: ['site', 'land'] } },
});

const seatTrait = i => CHATTER_TRAITS[((i | 0) % 6 + 6) % 6];

export function chatterTrait(s, i) {
  const v = G && G.rafeeqTrait ? G.rafeeqTrait(s, i) : null;
  const id = v && typeof v === 'object' ? v.id : v;
  return CHATTER_TRAITS.includes(id) ? id : seatTrait(i);
}
export function chatterName(s, i) {
  const v = G && G.rafeeqName ? G.rafeeqName(s, i) : null;
  return v ? String(v) : t('crew_name', { n: i + 1 });
}
// friend and rival as seat numbers or null. Without the rafeeqs feature: neighbours (0 and 1, 2 and 3 ...) are friends.
export function chatterPair(s, i) {
  if (G && G.rafeeqPair) {
    const p = G.rafeeqPair(s, i) || {};
    const ok = k => (Number.isInteger(k) && k >= 0 && k < s.diggers.length && k !== i ? k : null);
    return { friend: ok(p.friend), rival: ok(p.rival) };
  }
  const f = i ^ 1;
  return { friend: f < s.diggers.length ? f : null, rival: null };
}

// ---------- lines ----------
export function chatterLines(trait, moment) {
  const n = Number(t(`chat_${trait}_${moment}_n`));
  if (!n) return [];
  return Array.from({ length: n }, (_, k) => t(`chat_${trait}_${moment}_${k}`));
}
export const chatterPairLines = (k, name) => ({ a: t(`chat_pair_${k}_a`, { name }), b: t(`chat_pair_${k}_b`, { name }) });
export const CHATTER_PAIRS = 4;

// ---------- the rate rule (pure, over a plain memory) ----------
export const chatterMem = () => ({ now: 0, nextAny: 0, nextOwn: {}, last: {}, lastAny: '', reply: null, sent: [], mute: false });

export function chatterAllow(mem, who, p = chatterParams) {
  if (mem.mute) return false;
  if (mem.now < mem.nextAny || mem.now < (mem.nextOwn[who] || 0)) return false;
  while (mem.sent.length && mem.sent[0] < mem.now - 60) mem.sent.shift();
  return mem.sent.length < p.perMinute;
}
// a line was shown
export function chatterSpoke(mem, who, text, p = chatterParams, o = {}) {
  mem.nextAny = mem.now + p.gap; mem.nextOwn[who] = mem.now + p.own; mem.last[who] = text; mem.lastAny = text;
  if (!o.reply) mem.sent.push(mem.now);
}
// first line of a pair: the answer is due; the answer is the one exception to the gap
export function chatterAsk(mem, from, to, text, p = chatterParams) { mem.reply = { from, to, text, at: mem.now + p.replyAfter }; }
export function chatterReplyDue(mem) { const r = mem.reply; return r && mem.now >= r.at ? r : null; }
export function chatterReplied(mem, p = chatterParams) {
  const r = mem.reply; if (!r) return;
  chatterSpoke(mem, r.to, r.text, p, { reply: true });
  mem.nextOwn[r.from] = mem.nextOwn[r.to] = mem.now + p.pairQuiet;
  mem.reply = null;
}
// choose a line that is not the one just said (by anybody, or by this Rafeeq before). r in [0,1). null = nothing fresh.
export function chatterPick(mem, who, lines, r) {
  const ok = lines.filter(l => l !== mem.lastAny && l !== mem.last[who]);
  return ok.length ? ok[Math.min(ok.length - 1, Math.floor(r * ok.length))] : null;
}

export const chatterWords = text => String(text).trim().split(/\s+/).length;

// ---------- for other features ----------
export function chatterSay(s, ev, who, moment) { emit(s, ev, 'chatter', { who, moment }); }
export function chatterCheer(s, ev) { emit(s, ev, 'cheer', {}); }
export function chatterSetQuiet(s, quiet) { s.chatterQuiet = !!quiet; return s.chatterQuiet; }

// ---------- his own line and speech ----------
// the line shown for a Rafeeq's trait: his nickname's own line, else the base trait's name
export function chatterLine(s, i) {
  if (G && G.rafeeqLine) { const v = G.rafeeqLine(s, i); if (v) return v; }
  return t('chat_trait_' + chatterTrait(s, i));
}
const nickId = (s, i) => { const n = G && G.rafeeqNick ? G.rafeeqNick(s, i) : null; return n && NICK_LINES[n.id] ? n.id : null; };
// what only his nickname would say (empty for a renamed seat or an old first name)
export function chatterNickLines(s, i) {
  const id = nickId(s, i); if (!id) return [];
  const n = Number(t(`nk_say_${id}_n`));
  return Array.from({ length: n }, (_, k) => t(`nk_say_${id}_${k}`));
}
export const CHATTER_NICK_MOMENTS = ['hired', 'ore', 'land', 'finish', 'patted', 'deep', 'cheer'];
// the lines a Rafeeq may say at a moment: his base trait's, plus his nickname's at the friendly moments
export function chatterMomentLines(s, i, moment) {
  const base = chatterLines(chatterTrait(s, i), moment);
  return CHATTER_NICK_MOMENTS.includes(moment) ? base.concat(chatterNickLines(s, i)) : base;
}

// ---------- almodeer, the manager (NOT a Rafeeq: no seat, no digger, no number; a drawn figure with a text box) ----------
export const chatterBossParams = {
  minHired: 3,        // he is on screen with this many Rafeeqs or more
  first: 5,           // seconds to his first order
  gapMin: 20, gapMax: 30,
  sleepAfter: 8,      // seconds with no digging (auto dig off) before he nods off
  sipEvery: 3.5, sipSpread: 3, sipAfterOrder: 1.6,
  answerAfter: 1.6,   // the addressed Rafeeq may answer this long after
  tea: 0.15, all: 0.3, nick: 0.6,
};
export const chatterBossShown = (s, p = chatterBossParams) => s.diggers.length >= p.minHired;
export const chatterBossMem = (p = chatterBossParams) => ({
  clock: 0, next: p.first, idle: 0, asleep: false, line: '', lineLeft: 0, lineTo: -1, last: '',
  answerIn: -1, answerTo: -1, welcome: false, backN: 0, sipT: 2, sipLeft: 0, jump: 0, spill: 0, wave: 0, orders: 0,
});
const bossList = (key) => { const n = Number(t(key + '_n')); return Array.from({ length: n }, (_, k) => t(`${key}_${k}`)); };
const fillName = (text, name) => text.replace('{name}', name);
// the choice of one order: who (-1 = everyone) and the text. r = three numbers in [0,1).
export function chatterBossOrder(s, mem, r, p = chatterBossParams) {
  const n = s.diggers.length;
  const all = r[0] < p.all;
  const who = all ? -1 : Math.min(n - 1, Math.floor(r[1] * n));
  let pool;
  if (who < 0) pool = bossList('boss_all');
  else {
    const name = chatterName(s, who), id = nickId(s, who), pickR = r[2];
    pool = [];
    if (id && pickR < p.nick) pool = [fillName(t('nk_boss_' + id, {}), name)];
    else if (pickR > 1 - p.tea) pool = bossList('boss_tea').map(x => fillName(x, name));
    if (!pool.length || (pool.length === 1 && pool[0] === mem.last)) pool = bossList('boss_' + chatterTrait(s, who)).map(x => fillName(x, name));
  }
  const ok = pool.filter(x => x !== mem.last);
  const use = ok.length ? ok : pool;
  return { who, text: use[Math.min(use.length - 1, Math.floor(r[2] * 7.31 % 1 * use.length))] };
}
// One step. c = { muted (a card is open / last third of a Rock fight), digging (the player digs or auto dig is on), rnd }.
// Time counts only while the game is being played; nothing here changes the dig. Returns 'order' | 'wake' | 'welcome' | ''.
export function chatterBossStep(s, mem, dt, c, p = chatterBossParams) {
  if (!chatterBossShown(s, p)) { Object.assign(mem, chatterBossMem(p), { backN: mem.backN, last: mem.last }); return ''; }
  const rnd = c.rnd, quiet = !!s.chatterQuiet;
  mem.lineLeft = Math.max(0, mem.lineLeft - dt); if (!mem.lineLeft) mem.line = '';
  mem.jump = Math.max(0, mem.jump - dt); mem.spill = Math.max(0, mem.spill - dt); mem.wave = Math.max(0, mem.wave - dt);
  mem.sipLeft = Math.max(0, mem.sipLeft - dt);
  if (!mem.asleep) { mem.sipT -= dt; if (mem.sipT <= 0) { mem.sipLeft = 1.5; mem.sipT = p.sipEvery + rnd() * p.sipSpread; } }
  let ev = '';
  if (c.digging) {
    mem.idle = 0;
    if (mem.asleep) {
      mem.asleep = false; mem.jump = 0.5; mem.spill = 1.4; mem.sipT = 3;
      if (!quiet && !c.muted) { mem.line = bossList('boss_wake')[Math.floor(rnd() * 3)]; mem.lineLeft = 3.2; mem.lineTo = -1; mem.last = mem.line; ev = 'wake'; }
      return ev;
    }
  } else if (!mem.asleep && (mem.idle += dt) >= p.sleepAfter) { mem.asleep = true; mem.line = ''; mem.lineLeft = 0; mem.answerIn = -1; return ''; }
  if (mem.asleep || c.muted) return '';
  if (mem.answerIn >= 0) { mem.answerIn -= dt; if (mem.answerIn < 0) mem.answerIn = -2; }       // -2 = the answer is due now (the page takes it)
  if (quiet) { mem.welcome = false; return ''; }
  if (mem.welcome) {
    const back = bossList('boss_back'); mem.backN++;
    mem.welcome = false; mem.line = mem.backN === 1 ? back[0] : back[Math.floor(rnd() * back.length)]; mem.lineLeft = 4; mem.lineTo = -1; mem.last = mem.line;
    mem.wave = 2; mem.sipLeft = 2; mem.next = mem.clock + p.gapMin;
    return 'welcome';
  }
  mem.clock += dt;
  if (mem.clock >= mem.next) {
    const o = chatterBossOrder(s, mem, [rnd(), rnd(), rnd()], p);
    mem.line = o.text; mem.lineLeft = 6; mem.lineTo = o.who; mem.last = o.text; mem.orders++;
    mem.next = mem.clock + p.gapMin + rnd() * (p.gapMax - p.gapMin);
    mem.sipT = p.sipAfterOrder;
    if (o.who >= 0) { mem.answerIn = p.answerAfter; mem.answerTo = o.who; }
    return 'order';
  }
  return '';
}
