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
