// Dig feature (page side): anonymous play data. It listens to what the game already says (a site finished, a new site, a
// purchase, a relic taken, a pace sample, time away), builds rows, queues them in localStorage and sends them in small
// batches (when the page hides, or about once a minute). It never blocks the game and never throws into it.
// The one switch ("Turn off / Turn on") sits under the Tips list. It starts Off; ?share=1 or the switch turns it on. Off sends nothing and drops the queue.
// WHAT GOES: a random id made on this device, version, site/floor/road level, try number, seconds, depth, coins, Stars, pick
// strength, how many Rafeeqs, forge levels, what was bought or picked (and the cards offered), pace samples, session length.
// WHAT DOES NOT: name, email, address, IP (the server never stores one), the save itself.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { VERSION } from '../../../js/version.js';
import { createTelemetry, telemetryGate } from './queue.js';

const { t } = G;

const SUPABASE_URL = 'https://hutjfgbjjagqdjjeszqj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mxWGt9Ul4V2q4Wb0DEmV9Q_UhBH6T-f';   // public by design, like the leaderboard's
const FLUSH_EVERY = 60, FLUSH_AT = 10;

export const tel = (() => {
  try {
    return createTelemetry({
      store: localStorage, fetch: (...a) => fetch(...a).catch(() => null), url: SUPABASE_URL, key: SUPABASE_KEY, ver: VERSION,
      now: () => Date.now(), rand: Math.random,
      allowed: telemetryGate({ hostname: location.hostname, protocol: location.protocol, search: location.search, webdriver: !!navigator.webdriver }),
    });
  } catch { return null; }
})();

try { if (tel) tel.applyShare(location.search); } catch { /* the link flag is optional */ }

const guard = fn => (...a) => { try { return fn(...a); } catch (e) { return undefined; } };
let lastRow = null, siteWall = Date.now(), paceWall = Date.now(), lastClock = -1, flushT = 0;
let awayCoins = 0, awaySecs = 0, lastDeal = [], hideTimer = 0;
// the visit in progress (null while the page has been hidden long enough that the last one is over)
let vis = G.visitNew(Date.now(), tel ? tel.awayBefore() : null);

const roadLevel = s => Math.min(60, Math.max(0, (G.roadIndex(s) + 1) || 0));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const attNow = s => (s.run ? Math.round(s.run.clock * 10) / 10 : 0);

function sendTry(s, outcome, row) {
  const r = row || G.telemetryTryRow(s, outcome);
  r.outcome = outcome;
  r.tot_s = Math.round(clamp((Date.now() - siteWall) / 1000, 0, 8.6e5));
  tel.add('tries', r);
  maybeFlush();
}
function sendChoice(s, kind, item, lv, extra = {}) {
  const validKinds = ['buy', 'relic', 'card', 'kit'];
  const safeKind = validKinds.includes(kind) ? kind : 'buy';
  const safeLevel = Math.min(60, Math.max(0, roadLevel(s) || 0));
  tel.add('choices', { kind: safeKind, item: String(item).slice(0, 40), lv: Math.round(lv || 0), level: safeLevel, att_s: attNow(s),
    coins: s.coins, stars: s.stars, price: 0, offered: [], ...extra });
  maybeFlush();
}
function sendBuy(s, d) {
  if (!tel || !tel.active()) return;
  const u = G.ITEMS[d.id]; if (!u) return;
  const price = G.telemetryBuyPrice(s, d.id, d.level, G.upgradeCost), w = G.SHOPS[u.shop].wallet;
  sendChoice(s, 'buy', d.id, d.level, { shop: String(d.shop || u.shop).slice(0, 16), price,
    coins: s.coins + (w === 'coins' ? price : 0), stars: s.stars + (w === 'stars' ? price : 0) });
}
function maybeFlush() { if (tel.size() >= FLUSH_AT) tel.flush(); }

// the cards on screen right now, by relic id (read off the draft card; the chest feature does not hand the list over)
function offeredRelics() {
  const names = [...document.querySelectorAll('#modal .relic-card b')].map(b => b.textContent);
  const out = [];
  for (const n of names) { const id = Object.keys(G.RELICS).find(k => t('r_' + k) === n); if (id) out.push(id); }
  return out;
}

// One visit = one session row. A hide under five minutes (G.VISIT.gapS) does not end it; see visitStep in telemetry/rules.js.
function visit(ev) {
  if (!vis) { if (ev === 'show') vis = G.visitNew(Date.now()); return; }
  const r = G.visitStep(vis, ev, Date.now());
  vis = r.v;
  if (r.row) {
    tel.add('sessions', { ...r.row, away_before_s: vis.awayBefore, away_s: awaySecs ? Math.round(awaySecs) : null, away_coins: awayCoins || null });
  }
  if (r.ended) { awaySecs = 0; awayCoins = 0; vis = ev === 'show' ? G.visitNew(Date.now()) : null; }
}

function mountSwitch() {
  const box = document.getElementById('tips-list');
  if (!box || !tel) return;
  const row = document.createElement('div'); row.id = 'tel-note';
  const msg = document.createElement('span');
  const b = document.createElement('button'); b.type = 'button'; b.className = 'ghost';
  const paint = () => { msg.textContent = t(tel.consent() ? 'tel_note_on' : 'tel_note_off'); b.textContent = tel.consent() ? t('tel_switch_off') : t('tel_switch_on'); b.title = tel.consent() ? t('tel_on') : t('tel_off'); b.setAttribute('aria-pressed', tel.consent() ? 'true' : 'false'); };
  b.addEventListener('click', () => { tel.setConsent(!tel.consent()); paint(); });
  paint();
  row.append(msg, b);
  const keep = () => { if (row.parentNode !== box) box.appendChild(row); };
  new MutationObserver(keep).observe(box, { childList: true });
  keep();
}

if (tel) {
  document.addEventListener('visibilitychange', guard(() => {
    clearTimeout(hideTimer);
    if (document.hidden) {
      if (vis) vis = G.visitStep(vis, 'hide', Date.now()).v;
      tel.markLast(); tel.flush(true);
      // a hidden tab can still run a timer: when the gap has passed, the visit is over and its row goes out
      hideTimer = setTimeout(guard(() => { if (document.hidden) { visit('tick'); tel.flush(true); } }), G.VISIT.gapS * 1000 + 1000);
    } else { visit('show'); paceWall = Date.now(); }
  }));
  addEventListener('pagehide', guard(() => { visit('end'); tel.markLast(); tel.flush(true); }));
}

ui({
  id: 'telemetry',
  css: new URL('./telemetry.css', import.meta.url).href,
  mount: guard(() => { if (tel) mountSwitch(); }),
  start: guard(app => { if (tel && tel.active()) { siteWall = Date.now(); paceWall = Date.now(); lastClock = app.state.run ? app.state.run.clock : -1; } }),
  tick: guard((s, app) => {
    if (!tel || !tel.active()) return;
    // the last look at the site in play: a New Site resets the state before its event, so the try's row is taken from here
    if (s.run) {
      if (lastClock >= 0 && s.run.clock > lastClock && vis) vis = G.visitAtt(vis, s.run.clock - lastClock);
      lastClock = s.run.clock;
      if (s.run.key) lastRow = G.telemetryTryRow(s, s.run.done ? 'newsite' : 'left');
    }
    if (s.road && s.road.deal && s.road.deal.length) lastDeal = s.road.deal.map(c => c.key);
    flushT += 0.1;
    if (flushT >= FLUSH_EVERY) { flushT = 0; tel.flush(); }
  }),
  on: {
    siteFinished: guard((d, app) => { if (tel && tel.active()) sendTry(app.state, 'finished'); }),
    newSite: guard((d, app) => {
      if (!tel || !tel.active()) return;
      if (lastRow) sendTry(app.state, lastRow.outcome, lastRow);
      lastRow = null;
      const offered = lastDeal.includes(d.key) ? lastDeal : [];
      if (offered.length > 1) sendChoice(app.state, 'card', d.key, 0, { offered: offered.slice(0, 4), att_s: 0 });
      lastDeal = []; lastClock = -1; siteWall = Date.now(); paceWall = Date.now();
    }),
    // a "Buy all" sends its levels as 'buy' marked batch (skipped here) and then one 'buyBatch' per upgrade with the final level
    buy: guard((d, app) => { if (!d.batch) sendBuy(app.state, d); }),
    buyBatch: guard((d, app) => sendBuy(app.state, d)),
    relic: guard((d, app) => {
      if (!tel || !tel.active()) return;
      sendChoice(app.state, 'relic', d.id, d.level, { offered: offeredRelics().slice(0, 4) });
    }),
    telemetryPace: guard((d, app) => {
      if (!tel || !tel.active()) return;
      const wall = Math.max(1, (Date.now() - paceWall) / 1000); paceWall = Date.now();
      tel.add('pace', { level: roadLevel(app.state), site: String(app.state.run.site), n: d.n, att_s: d.att_s, depth: d.depth, gain: d.gain,
        coins_s: d.coins_s, blocks_s: Math.round(d.blocks_s * 100) / 100, hits_s: Math.round(d.hits_s * 100) / 100, idle: Math.round(clamp(1 - d.dt / wall, 0, 1) * 100) / 100 });
      maybeFlush();
    }),
    telemetryAway: guard(d => { awayCoins += d.coins || 0; awaySecs += d.secs || 0; }),
  },
});
