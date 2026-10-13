// Dig: the drawer's rules, no DOM. Which tabs there are, which panel lives in which tab, when a tab
// is locked, what its "Next:" line says and when it earns a dot. Pure over the state, so a test can run it.
// The page side (proto/ui/drawer.js) draws it. Words live in proto/ui/strings.js (dr_*).
import * as G from '../game.js';

const { t, fmt } = G;

// the panel -> tab map. A panel may say `tab: 'forge'` itself; this is the default for the ones that exist.
export const PANEL_TAB = {
  shop: 'shop', picks: 'shop',
  crew: 'camp', foreman: 'camp', wardrobe: 'camp', chatter: 'camp',
  relics: 'relics', fzbook: 'relics',
  wing2: 'museum',
  forge: 'forge',
  site: 'level', contracts: 'level',
};

const WALLET_UNIT = { coins: 'coins', stars: 'stars', metal: 'metal' };
const amount = (wallet, n) => t('dr_amt_' + (WALLET_UNIT[wallet] || 'coins') + (n === 1 ? '_1' : ''), { n: fmt(n) });

// what the player could still buy in these shops (open, not at the top level), cheapest first
function stock(s, shops) {
  return Object.keys(G.ITEMS)
    .filter(id => shops.includes(G.ITEMS[id].shop) && G.itemOpen(s, id) && (G.ITEMS[id].max === undefined || G.itemLevel(s, id) < G.ITEMS[id].max))
    .map(id => ({ id, cost: G.upgradeCost(s, id), wallet: G.SHOPS[G.ITEMS[id].shop].wallet }))
    .sort((a, b) => a.cost - b.cost);
}
const canAfford = (s, it) => s[it.wallet] >= it.cost;
const nameOf = id => t('up_' + id);

function buyNext(s, shops) {
  const items = stock(s, shops);
  const far = items.find(it => !canAfford(s, it));
  if (far) return t('dr_next_buy', { name: nameOf(far.id), what: amount(far.wallet, far.cost) });
  const near = items[0];
  return near ? t('dr_can_buy', { name: nameOf(near.id), what: amount(near.wallet, near.cost) }) : t('dr_none');
}
const readyIds = (s, shops) => stock(s, shops).filter(it => canAfford(s, it)).map(it => it.id);
// the one main button: the dearest thing you can afford now (the cheapest is rarely what you saved for)
function mainBuy(s, shops) {
  const ok = stock(s, shops).filter(it => canAfford(s, it));
  const it = ok[ok.length - 1];
  return it ? { id: it.id, label: t('dr_buy', { name: nameOf(it.id), what: amount(it.wallet, it.cost) }) } : null;
}

const COIN_SHOPS = ['coin', 'picks'];

// the tabs, in order. icon: id in icons.js. lock(s): text, or null when open. ready(s): the things
// that are ready now (a dot shows for one you have not seen). next(s): one plain line. main(s): { id, label } or null.
export const TABS = [
  { id: 'shop', icon: 'tab_shop', lock: () => null,
    ready: s => readyIds(s, COIN_SHOPS),
    next: s => buyNext(s, ['coin']),
    main: s => mainBuy(s, ['coin']) },
  { id: 'camp', icon: 'tab_camp',
    lock: s => (s.diggers.length > 0 || s.foremanHere ? null : t('dr_lock_camp')),
    ready: s => (s.foremanHere ? ['foreman'] : []),
    next: s => (s.foremanHere ? t('dr_next_foreman') : t('dr_next_crew', { n: s.diggers.length })),
    main: () => null },
  { id: 'relics', icon: 'tab_relics',
    lock: s => (Object.keys(s.relics).length > 0 || s.chests > 0 ? null : t('dr_lock_relics')),
    ready: s => (G.fusionReady(s).length ? ['fuse'] : []),
    next: s => (G.fusionReady(s).length ? t('dr_next_fuse') : Object.keys(s.relics).length ? t('dr_next_relics', { n: Object.keys(s.relics).length }) : t('dr_next_chest')),
    main: () => null },
  { id: 'museum', icon: 'tab_museum',
    lock: s => (s.wingDeep >= 12 || Object.keys(s.wingGot).length > 0 ? null : t('dr_lock_museum')),
    ready: s => (s.wingWish && s.wingWish.st === 1 ? ['wish'] : []),
    next: s => {
      let best = null;
      for (const k of Object.keys(G.WING)) {
        if (s.wingDone[k]) continue;
        const left = G.wingMissing(s, k).length;
        if (left > 0 && G.wingCount(s, k) > 0 && (!best || left < best.left)) best = { k, left };
      }
      if (s.wingWish && s.wingWish.st === 1) return t('dr_next_wish');
      return best ? t('dr_next_set', { n: best.left, name: t('wset_' + best.k) }) : t('dr_next_bones');
    },
    main: () => null },
  { id: 'forge', icon: 'tab_forge',
    lock: s => (s.forgeOn ? null : t('dr_lock_forge')),
    ready: s => readyIds(s, ['forge']),
    next: s => buyNext(s, ['forge']),
    main: s => mainBuy(s, ['forge']) },
  { id: 'level', icon: 'tab_level', lock: () => null,
    ready: s => { const r = G.siteRun(s); return r.done && G.canNewSite(s) ? ['next'] : []; },
    next: s => { const r = G.siteRun(s); return r.done ? t('dr_next_done') : t('dr_next_gate', { n: r.floor }); },
    main: () => null },
];

export const tabOf = p => p.tab || PANEL_TAB[p.id] || 'level';

// everything the page draws for one tab at this moment
export function tabInfo(tab, s) {
  const lock = tab.lock(s);
  return { id: tab.id, lock, ready: lock ? [] : tab.ready(s), next: lock || tab.next(s), main: lock ? null : tab.main(s) };
}

// The dot memory. `seen` is what was ready the last time the tab was open (or at load). A dot shows
// when something is ready that is not in `seen`; a thing that stops being ready is forgotten, so it can earn a dot again.
export function dotStep(seen, ready, open) {
  const now = new Set(ready);
  const next = open ? now : new Set([...seen].filter(k => now.has(k)));
  return { seen: next, dot: !open && ready.some(k => !seen.has(k)) };
}
